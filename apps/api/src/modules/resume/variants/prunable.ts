// The reserved-label exemption, in its own leaf module so the retention cron can share it without
// importing the service (which pulls in prisma and env; the cron's tests have neither).
import { PROTECTED_VARIANT_LABELS } from "@jobpilot/contracts/resume";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Excludes reserved labels from a sweep. The matching rule is shared, not just the label list: a
 * sweep that spelled it out itself would drift from `isProtectedVariantLabel` and delete a pending
 * suggestion.
 */
export const notProtectedVariant: Prisma.ResumeVariantWhereInput = {
  NOT: PROTECTED_VARIANT_LABELS.map((label) => ({ label: { startsWith: label } })),
};
