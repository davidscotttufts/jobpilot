import { NextResponse } from "next/server";
import {
  ACTIVE_PROFILE_COOKIE,
  getActiveProfileIdOrNull,
  setActiveProfileId,
} from "@/lib/active-profile";
import { parseIdParam, type ApiRouteContext } from "@/lib/api/request";
import { err, ErrorCodes } from "@/lib/api/response";
import { db } from "@/lib/db";
import { deleteAllResumeArtifacts } from "@/lib/storage";

type Params = ApiRouteContext<{ id: string }>;

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function DELETE(_req: Request, ctx: Params) {
  const { id, error } = await parseIdParam(ctx);
  if (error) {
    return error;
  }

  const profile = await db.profile.findUnique({
    where: { id },
    select: { id: true, isActive: true },
  });
  if (!profile) {
    return err(ErrorCodes.NOT_FOUND, "Profile not found", 404);
  }

  const total = await db.profile.count();
  if (total <= 1) {
    return err(ErrorCodes.CONFLICT, "Cannot delete the only remaining profile", 409);
  }

  const resumes = await db.resume.findMany({
    where: { profileId: id },
    select: {
      id: true,
      sourceFilename: true,
      variants: { select: { id: true } },
    },
  });

  const cookieActiveId = await getActiveProfileIdOrNull();
  const wasActive = profile.isActive || cookieActiveId === id;

  await db.profile.delete({ where: { id } });

  await Promise.all(
    resumes.map((r) =>
      deleteAllResumeArtifacts({
        resumeId: r.id,
        sourceFilename: r.sourceFilename,
        variantIds: r.variants.map((v) => v.id),
      }),
    ),
  );

  let activeProfileId: number;

  if (wasActive) {
    const next = await db.profile.findFirst({
      orderBy: { id: "asc" },
      select: { id: true },
    });

    if (!next) {
      return err(ErrorCodes.INTERNAL, "No surviving profile after delete", 500);
    }
    await setActiveProfileId(next.id);
    activeProfileId = next.id;
  } else {
    activeProfileId = cookieActiveId ?? id;
  }

  const res = NextResponse.json({
    ok: true,
    data: { deleted: id, activeProfileId },
  });

  if (wasActive) {
    res.cookies.set(ACTIVE_PROFILE_COOKIE, String(activeProfileId), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: ONE_YEAR_SECONDS,
    });
  }
  return res;
}
