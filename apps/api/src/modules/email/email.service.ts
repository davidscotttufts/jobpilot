import type { ApplicationStatus } from "@jobpilot/contracts/application";
import {
  type ApproveInput,
  CLASSIFICATION_TO_STATUS,
  type Classification,
  type ScanMessageInput,
} from "@jobpilot/contracts/email";
import { type PaginationQuery, pageSlice, paginate } from "@jobpilot/contracts/pagination";
import { inboxChannel } from "@jobpilot/contracts/sse";
import { singleton } from "tsyringe";
import { ErrorCodes, findOwned, HttpError, notFound } from "@/common/errors";
import { publish } from "@/common/sse";
import { type Prisma, PrismaClient } from "@/generated/prisma/client";
import { statusChangeOps } from "@/modules/application/status-change";
import { serializeMessage } from "./email.mapper";

interface MessageQuery {
  reviewStatus?: string;
  classification?: string;
  since?: string;
  domainHint?: string;
  verificationDomain?: string;
}

@singleton()
export class EmailService {
  constructor(private readonly prisma: PrismaClient) {}

  async listMessages(userId: string, query: PaginationQuery & MessageQuery) {
    const { reviewStatus, classification, since, domainHint, verificationDomain } = query;

    const where: Prisma.EmailMessageWhereInput = { account: { userId } };

    if (reviewStatus) {
      where.reviewStatus = reviewStatus;
    }
    if (classification === "null") {
      where.classification = null;
    } else if (classification) {
      where.classification = classification;
    }
    if (since) {
      const date = new Date(since);
      if (!Number.isNaN(date.getTime())) where.receivedAt = { gte: date };
    }
    if (verificationDomain) {
      where.verificationDomain = verificationDomain;
    }
    if (domainHint) {
      where.OR = [
        { fromDomain: { contains: domainHint } },
        { subject: { contains: domainHint } },
        { rawBody: { contains: domainHint } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.emailMessage.findMany({
        where,
        orderBy: { receivedAt: "desc" },
        ...pageSlice(query),
        include: {
          matchedApp: { select: { id: true, title: true, company: true, status: true } },
        },
      }),
      this.prisma.emailMessage.count({ where }),
    ]);

    return paginate(
      rows.map((row) => serializeMessage(row)),
      query,
      total,
    );
  }

  async getMessage(userId: string, id: string) {
    const row = await findOwned(
      (where) =>
        this.prisma.emailMessage.findFirst({
          where,
          include: {
            matchedApp: { select: { id: true, title: true, company: true, status: true } },
          },
        }),
      { id, account: { userId } },
      "Message",
    );

    return serializeMessage(row);
  }

  async scanMessage(userId: string, id: string, body: ScanMessageInput) {
    await findOwned(
      (where) => this.prisma.emailMessage.findFirst({ where, select: { id: true } }),
      { id, account: { userId } },
      "Message",
    );

    const row = await this.prisma.emailMessage.update({
      where: { id },
      data: {
        classification: body.classification,
        confidence: body.confidence,
        reasoning: body.reasoning,
        matchedAppId: body.matchedAppId,
        matchScore: body.matchScore,
        appliedStatus: body.appliedStatus,
        reviewStatus: body.reviewStatus,
        verificationCode: body.verificationCode,
        verificationLink: body.verificationLink,
        verificationDomain: body.verificationDomain,
        scannedAt: body.classification ? new Date() : undefined,
      },
      include: {
        matchedApp: { select: { id: true, title: true, company: true, status: true } },
      },
    });

    const message = serializeMessage(row);

    publish(inboxChannel, { userId }, { type: "message.scanned", id });

    return message;
  }

  async denyMessage(userId: string, id: string) {
    await findOwned(
      (where) => this.prisma.emailMessage.findFirst({ where, select: { id: true } }),
      { id, account: { userId } },
      "Message",
    );

    await this.prisma.emailMessage.update({
      where: { id },
      data: { reviewStatus: "denied" },
    });

    publish(inboxChannel, { userId }, { type: "message.reviewed", id, status: "denied" });

    return { id, status: "denied" as const };
  }

  async approveMessage(userId: string, id: string, body: ApproveInput) {
    const message = await findOwned(
      (where) => this.prisma.emailMessage.findFirst({ where }),
      { id, account: { userId } },
      "Message",
    );

    if (!message.matchedAppId) {
      throw new HttpError(ErrorCodes.UNPROCESSABLE, "Message has no matched application", 422);
    }

    const inferred: ApplicationStatus | undefined =
      body.toStatus ??
      (message.appliedStatus as ApplicationStatus | null) ??
      CLASSIFICATION_TO_STATUS[message.classification as Classification];

    if (!inferred) {
      throw new HttpError(ErrorCodes.UNPROCESSABLE, "No target status available", 422);
    }

    const app = await this.prisma.application.findFirst({
      where: { id: message.matchedAppId, userId },
    });
    if (!app) {
      throw notFound("Application not found");
    }

    await this.prisma.$transaction([
      ...statusChangeOps(this.prisma, {
        applicationId: app.id,
        fromStatus: app.status,
        toStatus: inferred,
        source: "email",
        note: body.note ?? `From email: ${message.subject}`,
      }),
      this.prisma.emailMessage.update({
        where: { id },
        data: { reviewStatus: "approved", appliedStatus: inferred },
      }),
    ]);

    publish(inboxChannel, { userId }, { type: "message.reviewed", id, status: "approved" });

    return { id, applicationId: app.id, status: inferred };
  }
}
