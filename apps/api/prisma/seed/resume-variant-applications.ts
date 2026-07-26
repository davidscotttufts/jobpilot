import { db } from "@/common/database";

/**
 * Backfill `ResumeVariant.applicationId` for variants created before the link existed - tailoring
 * runs before the Application row, so they recorded only `jobUrl`. The live path now links in
 * `writeJobResult`. Idempotent: only touches null links.
 */
export async function seedResumeVariantApplications(): Promise<void> {
  const variants = await db.resumeVariant.findMany({
    where: { applicationId: null, jobUrl: { not: null } },
    select: { id: true, jobUrl: true, resume: { select: { userId: true } } },
  });

  // One read for every candidate: DATABASE_URL points at an SSH tunnel, where a lookup per variant
  // is almost entirely round-trip latency. `userId_url` is unique, so the pair identifies one row.
  const applications = await db.application.findMany({
    where: { url: { in: variants.map((variant) => variant.jobUrl ?? "") } },
    select: { id: true, userId: true, url: true },
  });
  const key = (userId: string, url: string | null): string => `${userId}\n${url}`;
  const byUserUrl = new Map(applications.map((app) => [key(app.userId, app.url), app.id]));

  const idsByApplication = new Map<string, string[]>();
  for (const variant of variants) {
    // Absent = tailored for a job that was never applied to (skipped, failed, or still queued).
    const applicationId = byUserUrl.get(key(variant.resume.userId, variant.jobUrl));
    if (applicationId) {
      idsByApplication.set(applicationId, [
        ...(idsByApplication.get(applicationId) ?? []),
        variant.id,
      ]);
    }
  }

  // Variants tailored for the same job share one update.
  const updates = await Promise.all(
    [...idsByApplication].map(([applicationId, ids]) =>
      db.resumeVariant.updateMany({ where: { id: { in: ids } }, data: { applicationId } }),
    ),
  );
  const linked = updates.reduce((count, update) => count + update.count, 0);

  console.log(
    `✅ Resume variants: scanned ${variants.length} unlinked, linked ${linked}, ` +
      `no matching application ${variants.length - linked}.`,
  );
}
