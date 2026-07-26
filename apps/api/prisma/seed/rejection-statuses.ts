import { db } from "@/common/database";
import {
  AUTO_REJECTION_FROM_STATUSES,
  AUTO_REJECTION_MIN_CONFIDENCE,
} from "@/modules/email/auto-rejection";
import { verdictOps } from "@/modules/email/verdict";

/**
 * Backfill statuses for rejection emails classified before rejections were applied at scan time -
 * all of them sat in the review queue, so the funnel read 100% "applied". Skips `denied` (an
 * explicit human no) and anything past `interviewing`. Idempotent.
 */
export async function seedRejectionStatuses(): Promise<void> {
  const messages = await db.emailMessage.findMany({
    where: {
      classification: "rejected",
      matchedAppId: { not: null },
      confidence: { gte: AUTO_REJECTION_MIN_CONFIDENCE },
      // Unlike the live gate this accepts `pending` too: these were scanned before rejections were
      // applied at all, so `pending` reflects the old contract, not a human decision. `denied` does.
      reviewStatus: { not: "denied" },
      matchedApp: { status: { in: [...AUTO_REJECTION_FROM_STATUSES] } },
    },
    select: {
      id: true,
      subject: true,
      matchedApp: { select: { id: true, status: true, company: true } },
    },
  });

  for (const message of messages) {
    const app = message.matchedApp;
    if (!app) {
      continue;
    }
    await db.$transaction(
      verdictOps(db, {
        messageId: message.id,
        applicationId: app.id,
        fromStatus: app.status,
        toStatus: "rejected",
        subject: message.subject,
      }),
    );
    console.log(`   → ${app.company}: ${app.status} → rejected`);
  }

  console.log(`✅ Rejection statuses: applied ${messages.length}.`);
}
