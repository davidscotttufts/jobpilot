import type { Prisma } from "@/generated/prisma/client";
import { getActiveProfileId } from "@/lib/active-profile";
import { parseQueryParams } from "@/lib/api/request";
import { err, ErrorCodes, ok } from "@/lib/api/response";
import { db } from "@/lib/db";
import { normalizeCompanyName, normalizeJobTitle } from "@/lib/matching";
import { logApplicationSchema } from "@/lib/schemas/application";
import { pipelineChannel } from "@/lib/sse/channels/pipeline";
import { publish } from "@/lib/sse/server";

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

export async function POST(req: Request) {
  const profileId = await getActiveProfileId();
  const body = await req.json();
  const parsed = logApplicationSchema.safeParse(body);

  if (!parsed.success) {
    return err(ErrorCodes.UNPROCESSABLE, "Invalid application payload", 422, parsed.error.issues);
  }

  const data = parsed.data;
  try {
    const application = await db.application.create({
      data: {
        profileId,
        url: data.url,
        title: data.title,
        company: data.company,
        location: data.location ?? null,
        board: data.board ?? null,
        source: data.source,
        runId: data.runId ?? null,
        matchScore: data.matchScore ?? null,
        matchReason: data.matchReason ?? null,
        failReason: data.failReason ?? null,
        normalizedTitle: normalizeJobTitle(data.title),
        normalizedCompany: normalizeCompanyName(data.company),
        stageEvents: {
          create: { fromStage: null, toStage: "applied" },
        },
      },
    });
    publish(pipelineChannel, { profileId }, {
      type: "application.created",
      runId: data.runId ?? null,
    });
    return ok(application, { status: 201 });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") {
      return err(ErrorCodes.CONFLICT, "An application with this URL already exists", 409);
    }
    throw e;
  }
}
