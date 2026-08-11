import type { PilotQuestion, PrismaClient } from "@/generated/prisma/client";
import { recoverApplyingJobs } from "@/modules/campaign/jobs/recover-applying";
import { GATHER_CAP, MAX_OPEN_APPLY_CLAIMS, STALE_APPLYING_MS } from "./constants";
import { parseJobPayload } from "./job-mutations";

function splitJobSubject(subjectId: string) {
  const separator = subjectId.indexOf(":");
  if (separator <= 0 || separator === subjectId.length - 1) {
    throw new Error(`Invalid job question subject: ${subjectId}`);
  }
  return {
    campaignId: subjectId.slice(0, separator),
    jobKey: subjectId.slice(separator + 1),
  };
}

export interface ExpiryOutcome {
  /** Jobs dropped because the question blocking them was never answered. */
  jobsDroppedByExpiredQuestion: number;
  /** Questions crash recovery raised, for the caller to publish once this transaction commits. */
  recoveryQuestions: PilotQuestion[];
}

/** Releases expired claims and questions, returning their subjects to a workable state. */
export async function runExpiry(
  prisma: PrismaClient,
  userId: string,
  now: Date,
): Promise<ExpiryOutcome> {
  return prisma.$transaction(async (tx) => {
    const recoveryQuestions: PilotQuestion[] = [];
    const claims = await tx.pilotClaim.findMany({
      where: { userId, releasedAt: null, expiresAt: { lt: now } },
      take: GATHER_CAP,
      select: { id: true, kind: true, subjectId: true, payload: true },
    });

    if (claims.length) {
      await tx.pilotClaim.updateMany({
        where: { id: { in: claims.map((claim) => claim.id) }, releasedAt: null },
        data: { releasedAt: now, outcome: "expired" },
      });

      const jobRefs = claims
        .filter((claim) => claim.kind === "job.apply")
        .map((claim) => parseJobPayload(claim.payload));

      if (jobRefs.length) {
        const recovered = await recoverApplyingJobs(tx, userId, {
          status: "applying",
          campaign: { userId },
          OR: jobRefs.map((ref) => ({ campaignId: ref.campaignId, key: ref.jobKey })),
        });
        recoveryQuestions.push(...recovered.questions);
      }
    }

    // Stranded `applying` jobs: the terminal loop takes no claim, so a crashed session leaves the
    // job stuck (blocking finalize) with no recovery path. Revert stale ones not covered by an
    // open pilot claim; the pilot's own in-flight applies are protected by that claim check.
    const openApplyClaims = await tx.pilotClaim.findMany({
      where: { userId, kind: "job.apply", releasedAt: null, expiresAt: { gte: now } },
      take: MAX_OPEN_APPLY_CLAIMS,
      select: { payload: true },
    });
    const openApplyRefs = openApplyClaims.map((claim) => parseJobPayload(claim.payload));

    const stale = await recoverApplyingJobs(tx, userId, {
      status: "applying",
      campaign: { userId },
      updatedAt: { lt: new Date(now.getTime() - STALE_APPLYING_MS) },
      NOT: openApplyRefs.map((ref) => ({ campaignId: ref.campaignId, key: ref.jobKey })),
    });
    recoveryQuestions.push(...stale.questions);

    const questions = await tx.pilotQuestion.findMany({
      where: { userId, status: "open", expiresAt: { not: null, lt: now } },
      take: GATHER_CAP,
      select: { id: true, subjectType: true, subjectId: true },
    });
    if (!questions.length) return { jobsDroppedByExpiredQuestion: 0, recoveryQuestions };

    await tx.pilotQuestion.updateMany({
      where: { id: { in: questions.map((question) => question.id) }, status: "open" },
      data: { status: "expired" },
    });

    const jobRefs = questions
      .filter((question) => question.subjectType === "job" && question.subjectId)
      .map((question) => splitJobSubject(question.subjectId as string));

    if (!jobRefs.length) return { jobsDroppedByExpiredQuestion: 0, recoveryQuestions };

    const dropped = await tx.job.updateMany({
      where: {
        status: "needs_user",
        campaign: { userId },
        OR: jobRefs.map((ref) => ({ campaignId: ref.campaignId, key: ref.jobKey })),
      },
      data: { status: "skipped", skipReason: "Question expired without an answer." },
    });
    return { jobsDroppedByExpiredQuestion: dropped.count, recoveryQuestions };
  });
}
