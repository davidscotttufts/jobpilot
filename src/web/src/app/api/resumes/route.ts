import { writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod/v4";
import { err, ErrorCodes, ok } from "@/lib/api/response";
import { MAX_RESUME_BYTES, PROFILE_ID } from "@/lib/constants";
import { db } from "@/lib/db";
import { resumeDataSchema } from "@/lib/schemas/resume";
import { ensureResumesDir, generateResumeFilename } from "@/lib/storage";
import type { ResumeListItem } from "@/types/api";

export async function GET() {
  const profile = await db.profile.findUnique({
    where: { id: PROFILE_ID },
    select: { primaryResumeId: true },
  });
  const primaryId = profile?.primaryResumeId ?? null;

  const resumes = await db.resume.findMany({
    where: { profileId: PROFILE_ID },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { variants: true } } },
  });

  const items: ResumeListItem[] = resumes
    .map((r) => ({
      id: r.id,
      label: r.label,
      sourceFilename: r.sourceFilename,
      hasData: r.data !== null,
      variantCount: r._count.variants,
      isPrimary: r.id === primaryId,
      updatedAt: r.updatedAt.toISOString(),
    }))
    .sort((a, b) => (a.isPrimary === b.isPrimary ? 0 : a.isPrimary ? -1 : 1));

  return ok(items);
}

const jsonCreateSchema = z.object({
  label: z.string().min(1),
  data: resumeDataSchema.optional(),
});

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    const labelRaw = form.get("label");

    if (!(file instanceof File)) {
      return err(ErrorCodes.INVALID_REQUEST, "file field is required", 400);
    }
    if (file.size > MAX_RESUME_BYTES) {
      return err(ErrorCodes.INVALID_REQUEST, "Resume must be 5 MB or less", 400);
    }
    const label =
      typeof labelRaw === "string" && labelRaw.trim()
        ? labelRaw.trim()
        : path.basename(file.name, path.extname(file.name)) || "Resume";

    const dir = await ensureResumesDir();
    const filename = generateResumeFilename(file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, filename), buffer);

    await db.profile.upsert({
      where: { id: PROFILE_ID },
      create: { id: PROFILE_ID, firstName: "", lastName: "", email: "" },
      update: {},
    });

    const resume = await db.resume.create({
      data: {
        profileId: PROFILE_ID,
        label,
        sourceFilename: filename,
        sourceMimeType: file.type || "application/pdf",
        sourceSizeBytes: file.size,
      },
    });

    const isFirst = (await db.resume.count({ where: { profileId: PROFILE_ID } })) === 1;
    if (isFirst) {
      await db.profile.update({
        where: { id: PROFILE_ID },
        data: { primaryResumeId: resume.id },
      });
    }

    return ok({ id: resume.id }, { status: 201 });
  }

  const profileExists = await db.profile.findUnique({ where: { id: PROFILE_ID } });
  if (!profileExists) {
    return err(ErrorCodes.UNPROCESSABLE, "Profile not initialized; complete onboarding first", 422);
  }

  const body = await req.json();
  const parsed = jsonCreateSchema.safeParse(body);
  if (!parsed.success) {
    return err(ErrorCodes.UNPROCESSABLE, "Invalid body", 422, parsed.error.issues);
  }

  const resume = await db.resume.create({
    data: {
      profileId: PROFILE_ID,
      label: parsed.data.label,
      data: parsed.data.data ? JSON.stringify(parsed.data.data) : null,
    },
  });

  return ok({ id: resume.id }, { status: 201 });
}
