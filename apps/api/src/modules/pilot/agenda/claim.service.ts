import { type ReleasePilotClaimInput } from "@jobpilot/contracts/pilot";
import { pilotChannel } from "@jobpilot/contracts/sse";
import { singleton } from "tsyringe";
import { z } from "zod/v4";
import { conflict, findOwned } from "@/common/errors";
import { toInputJson } from "@/common/json";
import { PushService } from "@/common/push";
import { publish } from "@/common/sse";
import { type PilotQuestion, PrismaClient } from "@/generated/prisma/client";
import { CampaignJobService } from "@/modules/campaign/jobs/job.service";
import { recoverApplyingJobs } from "@/modules/campaign/jobs/recover-applying";
import { toPilotClaim, toPilotQuestion } from "../pilot.mapper";
import { assertApplyBudget } from "./apply-budget";
import { acquireBrowser } from "./browser-lease";
import { MAX_CLAIM_LIFETIME_MS } from "./constants";
import { verifyGrant } from "./grant";
import { parseJobPayload } from "./job-mutations";
import { parseAgendaSnapshot } from "./service";

const CLAIM_TTL_MS = 15 * 60 * 1000;

/**
 * Holds a heartbeat-extended expiry to a fixed ceiling from when the claim was granted, so a
 * stuck-but-beating driver still expires no matter which kind of work it is running.
 */
function lifetimeCap(claim: { grantedAt: Date } | null, proposedExpiry: number): number {
  if (!claim) {
    return proposedExpiry;
  }
  return Math.min(proposedExpiry, claim.grantedAt.getTime() + MAX_CLAIM_LIFETIME_MS);
}

/** Atomically claims versioned agenda items and manages claim heartbeats and release. */
@singleton()
export class ClaimService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly campaignJobs: CampaignJobService,
    private readonly push: PushService,
  ) {}

  async claim(userId: string, agendaVersion: string, itemId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const locked = await tx.pilotState.updateMany({
        where: {
          userId,
          running: true,
          agendaVersion,
          agendaExpiresAt: { gt: now },
        },
        data: { agendaVersion },
      });
      if (locked.count === 0) {
        const current = await tx.pilotState.findUnique({
          where: { userId },
          select: { running: true },
        });
        if (!current?.running) throw conflict("Pilot is stopped.");
        throw conflict("Agenda snapshot is stale; refresh it before claiming.");
      }
      const state = await tx.pilotState.findUniqueOrThrow({ where: { userId } });
      if (!state.agendaSnapshot) {
        throw conflict("Agenda snapshot is stale; refresh it before claiming.");
      }
      const item = parseAgendaSnapshot(state.agendaSnapshot).items.find(
        (candidate) => candidate.id === itemId,
      );
      if (!item) throw conflict("Agenda item is no longer available.");

      // Safe as a read-then-write: the pilotState update above locks this user's row for the
      // rest of the transaction, so concurrent claim() calls for one user serialize here.
      const open = await tx.pilotClaim.findFirst({
        where: {
          userId,
          kind: item.kind,
          subjectType: item.subjectType,
          subjectId: item.subjectId,
          releasedAt: null,
        },
        select: { id: true },
      });
      if (open) throw conflict("This item is already claimed.");

      await verifyGrant(tx, userId, item.kind, item.subjectId);
      let claimedJob = null;
      if (item.kind === "job.apply") {
        await assertApplyBudget(tx, userId, now);
        claimedJob = await this.campaignJobs.claimJobForApplyInTransaction(
          tx,
          userId,
          item.payload.campaignId,
          item.payload.jobKey,
        );
      }
      const claim = await tx.pilotClaim.create({
        data: {
          userId,
          kind: item.kind,
          subjectType: item.subjectType,
          subjectId: item.subjectId,
          payload: toInputJson(item.payload),
          expiresAt: new Date(now.getTime() + CLAIM_TTL_MS),
        },
      });
      return { claim, item, claimedJob };
    });
    if (result.claimedJob && result.item.kind === "job.apply") {
      this.campaignJobs.publishClaimedJob(
        userId,
        result.item.payload.campaignId,
        result.claimedJob,
      );
    }
    return toPilotClaim(result.claim);
  }

  /**
   * Leases a browser to this claim for as long as it runs. See `browser-lease.ts` - a profile opens
   * in one browser, and unarbitrated contention was the single largest cause of apply failures.
   */
  async acquireBrowser(userId: string, id: string, server: string) {
    return this.prisma.$transaction((tx) => acquireBrowser(tx, userId, id, server, new Date()));
  }

  async heartbeat(userId: string, id: string) {
    const open = await this.prisma.pilotClaim.findFirst({
      where: { id, userId, releasedAt: null },
      select: { grantedAt: true },
    });

    const now = Date.now();
    const updated = await this.prisma.pilotClaim.updateMany({
      where: { id, userId, releasedAt: null },
      data: {
        heartbeatAt: new Date(now),
        expiresAt: new Date(lifetimeCap(open, now + CLAIM_TTL_MS)),
      },
    });
    if (updated.count === 0) {
      const existing = await this.prisma.pilotClaim.findFirst({ where: { id, userId } });
      if (!existing) await findOwned(() => Promise.resolve(null), { id, userId }, "Claim");
      throw conflict("Claim is already released.");
    }
    return toPilotClaim(await this.prisma.pilotClaim.findUniqueOrThrow({ where: { id } }));
  }

  async release(userId: string, id: string, body: ReleasePilotClaimInput) {
    const existing = await findOwned(
      (where) => this.prisma.pilotClaim.findFirst({ where }),
      { id, userId },
      "Claim",
    );
    if (existing.releasedAt) {
      if (existing.outcome === body.outcome) return toPilotClaim(existing);
      throw conflict(`Claim already released with outcome ${existing.outcome}.`);
    }
    const payload = z.record(z.string(), z.json()).parse(existing.payload);
    const parked: PilotQuestion[] = [];
    const updated = await this.prisma.$transaction(async (tx) => {
      if (body.outcome === "abandoned" && existing.kind === "job.apply") {
        const jobRef = parseJobPayload(payload);
        const recovered = await recoverApplyingJobs(tx, userId, {
          campaignId: jobRef.campaignId,
          key: jobRef.jobKey,
          status: "applying",
          campaign: { userId },
        });
        parked.push(...recovered.questions);
      }
      const changed = await tx.pilotClaim.updateMany({
        where: { id, userId, releasedAt: null },
        data: {
          releasedAt: new Date(),
          outcome: body.outcome,
          payload: toInputJson(body.note ? { ...payload, releaseNote: body.note } : payload),
        },
      });
      if (changed.count === 0) throw conflict("Claim was released concurrently.");
      return tx.pilotClaim.findUniqueOrThrow({ where: { id } });
    });
    // Published only after the commit: a question the user acts on before its job is parked would
    // hit the very guard it is meant to release.
    for (const question of parked) {
      publish(
        pilotChannel,
        { userId },
        { type: "question.created", question: toPilotQuestion(question) },
      );
      void this.push.sendToUser(userId, {
        title: "JobPilot needs you",
        body: question.prompt,
        url: question.deepLink ?? "/pilot",
        tag: `question-${question.id}`,
      });
    }
    return toPilotClaim(updated);
  }
}
