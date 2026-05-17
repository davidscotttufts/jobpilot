import { NextResponse } from "next/server";
import { z } from "zod/v4";
import {
  ACTIVE_PROFILE_COOKIE,
  getActiveProfileIdOrNull,
  setActiveProfileId,
} from "@/lib/active-profile";
import { err, ErrorCodes, ok } from "@/lib/api/response";
import { db } from "@/lib/db";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function GET() {
  const profileId = await getActiveProfileIdOrNull();
  return ok({ profileId });
}

const bodySchema = z.object({ profileId: z.number().int().positive() });

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return err(ErrorCodes.UNPROCESSABLE, "Invalid body", 422, parsed.error.issues);
  }

  const { profileId } = parsed.data;
  const exists = await db.profile.findUnique({ where: { id: profileId }, select: { id: true } });
  if (!exists) {
    return err(ErrorCodes.NOT_FOUND, "Profile not found", 404);
  }

  await setActiveProfileId(profileId);

  const res = NextResponse.json({ ok: true, data: { profileId } });
  res.cookies.set(ACTIVE_PROFILE_COOKIE, String(profileId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: ONE_YEAR_SECONDS,
  });
  return res;
}
