import type { Classification, ReviewStatus } from "@jobpilot/contracts/email";
import type { Prisma } from "@/generated/prisma/client";
import type { EmailLink } from "./email.utils";

/** An inbox message row with its union fields narrowed off plain `string`. */
export type EmailMessageRow = Omit<
  Prisma.EmailMessageGetPayload<{
    include: {
      matchedApp: { select: { id: true; title: true; company: true; status: true } };
    };
  }>,
  "receivedAt" | "fetchedAt" | "scannedAt" | "harvestedAt" | "links"
> & {
  links: EmailLink[];
  reviewStatus: ReviewStatus;
  classification: Classification | null;
  receivedAt: Date;
  fetchedAt: Date;
  scannedAt: Date | null;
  harvestedAt: Date | null;
};

/** Serialize a raw message row: enums narrowed; Date fields kept as Date objects. */
export function serializeMessage(row: {
  receivedAt: Date;
  fetchedAt: Date;
  scannedAt: Date | null;
  reviewStatus: string;
  classification: string | null;
}): EmailMessageRow {
  return {
    ...row,
    receivedAt: row.receivedAt,
    fetchedAt: row.fetchedAt,
    scannedAt: row.scannedAt,
    reviewStatus: row.reviewStatus as ReviewStatus,
    classification: row.classification as Classification | null,
  } as EmailMessageRow;
}
