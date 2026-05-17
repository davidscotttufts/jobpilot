import { createReadStream } from "node:fs";
import { stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { getActiveProfileId } from "@/lib/active-profile";
import { parseIdParam, type ApiRouteContext } from "@/lib/api/request";
import { err, ErrorCodes, ok } from "@/lib/api/response";
import { MAX_RESUME_BYTES } from "@/lib/constants";
import { db } from "@/lib/db";
import {
  deleteResumeFile,
  ensureResumesDir,
  generateResumeFilename,
  resumePath,
} from "@/lib/storage";

type Params = ApiRouteContext<{ id: string }>;

export async function GET(_req: Request, ctx: Params) {
  const { id, error } = await parseIdParam(ctx);
  if (error) {
    return error;
  }

  const profileId = await getActiveProfileId();
  const resume = await db.resume.findFirst({
    where: { id, profileId },
  });

  if (!resume) {
    return err(ErrorCodes.NOT_FOUND, "Resume not found", 404);
  }
  if (!resume.sourceFilename) {
    return err(ErrorCodes.NOT_FOUND, "No source PDF uploaded", 404);
  }

  const filePath = resumePath(resume.sourceFilename);
  try {
    const stats = await stat(filePath);
    const stream = createReadStream(filePath);
    return new Response(stream as unknown as ReadableStream, {
      headers: {
        "content-type": resume.sourceMimeType ?? "application/pdf",
        "content-length": String(stats.size),
        "content-disposition": `inline; filename="${resume.sourceFilename}"`,
      },
    });
  } catch {
    return err(ErrorCodes.NOT_FOUND, "Source file missing on disk", 404);
  }
}

export async function POST(req: Request, ctx: Params) {
  const { id, error } = await parseIdParam(ctx);
  if (error) {
    return error;
  }

  const profileId = await getActiveProfileId();
  const resume = await db.resume.findFirst({
    where: { id, profileId },
  });
  if (!resume) {
    return err(ErrorCodes.NOT_FOUND, "Resume not found", 404);
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return err(ErrorCodes.INVALID_REQUEST, "file field is required", 400);
  }
  if (file.size > MAX_RESUME_BYTES) {
    return err(ErrorCodes.INVALID_REQUEST, "Resume must be 5 MB or less", 400);
  }

  const dir = await ensureResumesDir();
  const filename = generateResumeFilename(file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  if (resume.sourceFilename) {
    await deleteResumeFile(resume.sourceFilename);
  }

  await db.resume.update({
    where: { id },
    data: {
      sourceFilename: filename,
      sourceMimeType: file.type || "application/pdf",
      sourceSizeBytes: file.size,
    },
  });

  return ok({ id, sourceFilename: filename });
}

export async function DELETE(_req: Request, ctx: Params) {
  const { id, error } = await parseIdParam(ctx);
  if (error) {
    return error;
  }

  const profileId = await getActiveProfileId();
  const resume = await db.resume.findFirst({
    where: { id, profileId },
  });
  if (!resume) {
    return err(ErrorCodes.NOT_FOUND, "Resume not found", 404);
  }

  if (resume.sourceFilename) {
    await deleteResumeFile(resume.sourceFilename);
  }

  await db.resume.update({
    where: { id },
    data: { sourceFilename: null, sourceMimeType: null, sourceSizeBytes: null },
  });

  return ok({ id });
}
