import { err, ErrorCodes, ok } from "@/lib/api";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const domain = url.searchParams.get("domain");
  const sinceMinutes = Number(url.searchParams.get("sinceMinutes") ?? "5");

  if (!domain) {
    return err(ErrorCodes.INVALID_REQUEST, "domain is required", 400);
  }

  const cutoff = new Date(Date.now() - Math.max(1, sinceMinutes) * 60_000);

  const message = await db.emailMessage.findFirst({
    where: {
      classification: "verification",
      verificationDomain: domain,
      receivedAt: { gte: cutoff },
    },
    orderBy: { receivedAt: "desc" },
  });

  if (!message) {
    return err(ErrorCodes.NOT_FOUND, "No verification code found", 404);
  }

  return ok({
    code: message.verificationCode,
    link: message.verificationLink,
    receivedAt: message.receivedAt,
  });
}
