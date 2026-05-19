import { z } from "zod/v4";
import { getActiveProfileId } from "@/lib/active-profile";
import { parseIdParam, type ApiRouteContext } from "@/lib/api/request";
import { err, ErrorCodes, ok } from "@/lib/api/response";
import { db } from "@/lib/db";
import { backfillResumeIds } from "@/lib/resume/backfill-ids";
import { tailorBase } from "@/lib/resume/tailor";
import type { ResumeData } from "@/lib/schemas/resume";

type Params = ApiRouteContext<{ id: string }>;

const tailorRequestSchema = z.object({
  label: z.string().min(1),
  jobUrl: z.url().optional().nullable(),
  applicationId: z.number().int().positive().optional().nullable(),
  summary: z.string().optional(),
  emphasizedTech: z.array(z.string()).optional(),
  jobKeywords: z.array(z.string()).optional(),
  diffNotes: z.string().optional().nullable(),
  maxBulletsPerEntry: z.number().int().min(1).max(20).optional(),
});

/**
 * Create a tailored resume variant from model-authored hints. The model
 * never writes structured ResumeData — just a tailored `summary` and a
 * small `emphasizedTech`/`jobKeywords` array. The server applies a
 * deterministic ranking against the base content.
 */
export async function POST(req: Request, ctx: Params) {
  const { id: resumeId, error } = await parseIdParam(ctx);
  if (error) {
    return error;
  }

  const profileId = await getActiveProfileId();
  const base = await db.resume.findFirst({
    where: { id: resumeId, profileId },
  });
  if (!base) {
    return err(ErrorCodes.NOT_FOUND, "Resume not found", 404);
  }
  if (!base.content) {
    return err(
      ErrorCodes.UNPROCESSABLE,
      "Base resume has no structured content. Run extract-resume first.",
      422,
    );
  }

  const body = await req.json();
  const parsed = tailorRequestSchema.safeParse(body);
  if (!parsed.success) {
    return err(ErrorCodes.UNPROCESSABLE, "Invalid tailor payload", 422, parsed.error.issues);
  }

  if (parsed.data.applicationId) {
    const app = await db.application.findUnique({
      where: { id: parsed.data.applicationId },
      select: { id: true },
    });
    if (!app) {
      return err(ErrorCodes.NOT_FOUND, "Application not found", 404);
    }
  }

  const { content: baseContent } = backfillResumeIds(JSON.parse(base.content) as ResumeData);
  const tailored = tailorBase(baseContent, {
    summary: parsed.data.summary,
    emphasizedTech: parsed.data.emphasizedTech,
    jobKeywords: parsed.data.jobKeywords,
    maxBulletsPerEntry: parsed.data.maxBulletsPerEntry,
  });

  const variant = await db.resumeVariant.create({
    data: {
      resumeId,
      label: parsed.data.label,
      jobUrl: parsed.data.jobUrl ?? null,
      applicationId: parsed.data.applicationId ?? null,
      content: JSON.stringify(tailored),
      diffNotes: parsed.data.diffNotes ?? null,
    },
  });

  return ok(
    {
      id: variant.id,
      pdfUrl: `/api/resumes/variants/${variant.id}/pdf`,
    },
    { status: 201 },
  );
}
