import { writeFile } from "node:fs/promises";
import { z } from "zod/v4";
import { getActiveProfileId } from "@/lib/active-profile";
import { parseIdParam, type ApiRouteContext } from "@/lib/api/request";
import { err, ErrorCodes, ok } from "@/lib/api/response";
import { db } from "@/lib/db";
import { backfillResumeIds } from "@/lib/resume/backfill-ids";
import { resumeDataSchema, type ResumeData } from "@/lib/schemas/resume";
import { resumeChannel } from "@/lib/sse/channels/resume";
import { publish } from "@/lib/sse/server";
import { deleteAllResumeArtifacts, ensureResumeBackupsDir, resumeBackupPath } from "@/lib/storage";
import type { ResumeDto } from "@/types/api";

type Params = ApiRouteContext<{ id: string }>;

export async function GET(_req: Request, ctx: Params) {
  const { id, error } = await parseIdParam(ctx);
  if (error) {
    return error;
  }

  const profileId = await getActiveProfileId();
  const profile = await db.profile.findUnique({
    where: { id: profileId },
    select: { primaryResumeId: true },
  });
  const resume = await db.resume.findFirst({
    where: { id, profileId },
  });
  if (!resume) return err(ErrorCodes.NOT_FOUND, "Resume not found", 404);

  let content: ResumeData | null = null;

  if (resume.content) {
    const parsed = JSON.parse(resume.content) as ResumeData;
    const { content: backfilled, mutated } = backfillResumeIds(parsed);
    content = backfilled;
    if (mutated) {
      await db.resume.update({
        where: { id: resume.id },
        data: { content: JSON.stringify(backfilled) },
      });
    }
  }

  const dto: ResumeDto = {
    id: resume.id,
    profileId: resume.profileId,
    label: resume.label,
    content,
    version: resume.version,
    sourceFilename: resume.sourceFilename,
    sourceMimeType: resume.sourceMimeType,
    sourceSizeBytes: resume.sourceSizeBytes,
    isPrimary: profile?.primaryResumeId === resume.id,
    createdAt: resume.createdAt.toISOString(),
    updatedAt: resume.updatedAt.toISOString(),
  };
  return ok(dto);
}

const putSchema = z.object({
  label: z.string().min(1).optional(),
  content: resumeDataSchema.optional(),
});

export async function PUT(req: Request, ctx: Params) {
  const { id, error } = await parseIdParam(ctx);
  if (error) {
    return error;
  }

  const body = await req.json();
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return err(ErrorCodes.UNPROCESSABLE, "Invalid body", 422, parsed.error.issues);
  }
  if (parsed.data.label === undefined && parsed.data.content === undefined) {
    return err(ErrorCodes.INVALID_REQUEST, "label or content required", 400);
  }

  const profileId = await getActiveProfileId();
  const existing = await db.resume.findFirst({
    where: { id, profileId },
  });
  if (!existing) return err(ErrorCodes.NOT_FOUND, "Resume not found", 404);

  const updated = await db.resume.update({
    where: { id },
    data: {
      label: parsed.data.label ?? existing.label,
      content: parsed.data.content ? JSON.stringify(parsed.data.content) : existing.content,
      version: parsed.data.content ? existing.version + 1 : existing.version,
    },
  });

  if (parsed.data.content) {
    await ensureResumeBackupsDir();
    await writeFile(
      resumeBackupPath(updated.id, updated.updatedAt.getTime()),
      JSON.stringify(parsed.data.content, null, 2),
      "utf8",
    );
    publish(
      resumeChannel,
      { resumeId: updated.id },
      {
        type: "content.updated",
        resumeId: updated.id,
        version: updated.version,
      },
    );
  }

  return ok({ id: updated.id, version: updated.version });
}

export async function DELETE(_req: Request, ctx: Params) {
  const { id, error } = await parseIdParam(ctx);
  if (error) {
    return error;
  }

  const profileId = await getActiveProfileId();
  const existing = await db.resume.findFirst({
    where: { id, profileId },
    select: {
      id: true,
      sourceFilename: true,
      variants: { select: { id: true } },
    },
  });
  if (!existing) {
    return err(ErrorCodes.NOT_FOUND, "Resume not found", 404);
  }

  await db.profile.updateMany({
    where: { id: profileId, primaryResumeId: id },
    data: { primaryResumeId: null },
  });

  await db.resume.delete({ where: { id } });
  await deleteAllResumeArtifacts({
    resumeId: existing.id,
    sourceFilename: existing.sourceFilename,
    variantIds: existing.variants.map((v) => v.id),
  });

  return ok({ deleted: id });
}
