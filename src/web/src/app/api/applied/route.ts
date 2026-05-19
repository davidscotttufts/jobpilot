import type { Prisma } from "@/generated/prisma/client";
import { getActiveProfileId } from "@/lib/active-profile";
import { parseQueryParams } from "@/lib/api/request";
import { ok } from "@/lib/api/response";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const profileId = await getActiveProfileId();
  const { stage, board, source, search } = parseQueryParams(req, [
    "stage",
    "board",
    "source",
    "search",
  ] as const);

  const where: Prisma.ApplicationWhereInput = { profileId };

  if (stage) {
    where.stage = stage;
  }
  if (board) {
    where.board = board;
  }
  if (source) {
    where.source = source;
  }
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { company: { contains: search } },
      { url: { contains: search } },
    ];
  }

  const applications = await db.application.findMany({
    where,
    orderBy: { appliedAt: "desc" },
    take: 500,
  });
  return ok(applications);
}
