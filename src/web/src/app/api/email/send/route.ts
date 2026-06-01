import { getActiveProfileId } from "@/lib/active-profile";
import { err, ErrorCodes, ok } from "@/lib/api/response";
import { accountCanSend, getProvider } from "@/lib/email";
import { loadFreshAccount } from "@/lib/email/account";
import { sendEmailSchema } from "@/lib/schemas/outreach";

/**
 * Send an outbound email from the profile's connected mailbox. Used by the
 * outreach skill (and the outreach board's "approve & send" action). Refreshes
 * an expired token first and 400s with an actionable message when the account
 * lacks send scope (needs reconnecting).
 */
export async function POST(req: Request) {
  const body = await req.json();
  const parsed = sendEmailSchema.safeParse(body);
  if (!parsed.success) {
    return err(ErrorCodes.UNPROCESSABLE, "Invalid send payload", 422, parsed.error.issues);
  }

  const profileId = await getActiveProfileId();
  const account = await loadFreshAccount(profileId);
  if (!account) {
    return err(ErrorCodes.NOT_FOUND, "No email account connected", 404);
  }
  if (!accountCanSend(account)) {
    return err(
      ErrorCodes.UNPROCESSABLE,
      "Connected mailbox lacks send access. Reconnect it from email settings to enable sending.",
      422,
    );
  }

  try {
    const sent = await getProvider(account.provider).sendMessage(account, {
      to: parsed.data.to,
      subject: parsed.data.subject,
      body: parsed.data.body,
      threadId: parsed.data.threadId,
      attachments: parsed.data.attachments,
    });
    return ok(sent, { status: 201 });
  } catch (e) {
    return err(
      ErrorCodes.UNPROCESSABLE,
      e instanceof Error ? e.message : "Failed to send message",
      502,
    );
  }
}
