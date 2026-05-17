import { z } from "zod/v4";
import { getActiveProfileId } from "@/lib/active-profile";
import { err, ErrorCodes, ok } from "@/lib/api/response";
import { db } from "@/lib/db";

const bodySchema = z.object({
  resumeId: z.number().int().positive().nullable(),
});

export async function POST(req: Request) {
  const profileId = await getActiveProfileId();
  const body = await req.json();
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return err(ErrorCodes.UNPROCESSABLE, "Invalid body", 422, parsed.error.issues);
  }

  if (parsed.data.resumeId !== null) {
    const resume = await db.resume.findFirst({
      where: { id: parsed.data.resumeId, profileId },
      select: { id: true },
    });

    if (!resume) {
      return err(ErrorCodes.NOT_FOUND, "Resume not found", 404);
    }
  }

  await db.profile.update({
    where: { id: profileId },
    data: { primaryResumeId: parsed.data.resumeId },
  });

  return ok({ primaryResumeId: parsed.data.resumeId });
}
