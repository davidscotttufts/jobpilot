import { getActiveProfileId } from "@/lib/active-profile";
import { err, ErrorCodes, ok } from "@/lib/api/response";
import { db } from "@/lib/db";
import { credentialSchema } from "@/lib/schemas/credential";

export async function GET() {
  const profileId = await getActiveProfileId();
  const credentials = await db.credential.findMany({
    where: { profileId },
    orderBy: { scope: "asc" },
  });
  return ok(credentials);
}

export async function POST(req: Request) {
  const profileId = await getActiveProfileId();
  const body = await req.json();
  const parsed = credentialSchema.safeParse(body);

  if (!parsed.success) {
    return err(ErrorCodes.UNPROCESSABLE, "Invalid credential", 422, parsed.error.issues);
  }

  try {
    const cred = await db.credential.create({ data: { ...parsed.data, profileId } });
    return ok(cred, { status: 201 });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") {
      return err(ErrorCodes.CONFLICT, "Credential for this scope already exists", 409);
    }
    throw e;
  }
}
