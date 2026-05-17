import { createReadStream } from "node:fs";
import { stat, writeFile } from "node:fs/promises";
import { getActiveProfileId } from "@/lib/active-profile";
import { parseIdParam, type ApiRouteContext } from "@/lib/api/request";
import { err, ErrorCodes } from "@/lib/api/response";
import { db } from "@/lib/db";
import { renderResumePdf } from "@/lib/pdf/render";
import type { ResumeData } from "@/lib/schemas/resume";
import { ensureGeneratedDir, generatedVariantPath, slugifyForDownload } from "@/lib/storage";

type Params = ApiRouteContext<{ id: string }>;

export async function GET(_req: Request, ctx: Params) {
  const { id, error } = await parseIdParam(ctx);
  if (error) {
    return error;
  }

  const profileId = await getActiveProfileId();
  const variant = await db.resumeVariant.findFirst({
    where: { id, resume: { profileId } },
  });
  if (!variant) {
    return err(ErrorCodes.NOT_FOUND, "Variant not found", 404);
  }

  await ensureGeneratedDir();
  const cachePath = generatedVariantPath(variant.id, variant.updatedAt.getTime());
  try {
    await stat(cachePath);
  } catch {
    const buffer = await renderResumePdf(JSON.parse(variant.content) as ResumeData);
    await writeFile(cachePath, buffer);
  }

  const stats = await stat(cachePath);
  const stream = createReadStream(cachePath);
  return new Response(stream as unknown as ReadableStream, {
    headers: {
      "content-type": "application/pdf",
      "content-length": String(stats.size),
      "content-disposition": `inline; filename="${slugifyForDownload(variant.label)}.pdf"`,
    },
  });
}
