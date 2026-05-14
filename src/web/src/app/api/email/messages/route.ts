import type { Prisma } from "@/generated/prisma/client";
import { ok } from "@/lib/api";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const reviewStatus = url.searchParams.get("reviewStatus");
  const classification = url.searchParams.get("classification");
  const since = url.searchParams.get("since");
  const domainHint = url.searchParams.get("domainHint");
  const verificationDomain = url.searchParams.get("verificationDomain");

  const where: Prisma.EmailMessageWhereInput = {};

  if (reviewStatus) where.reviewStatus = reviewStatus;
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

  const messages = await db.emailMessage.findMany({
    where,
    orderBy: { receivedAt: "desc" },
    take: 200,
    include: {
      matchedApp: { select: { id: true, title: true, company: true, stage: true } },
    },
  });

  return ok(messages);
}
