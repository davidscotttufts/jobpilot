import { conflict } from "@/common/errors";
import {
  type DuplicateReader,
  duplicateSkipReason,
  findAppliedDuplicate,
} from "@/modules/application/duplicate";
import { findInFlightDuplicate, type InFlightReader } from "./in-flight";

/** The job fields the duplicate rule reads. */
interface GuardedJob {
  campaignId: string;
  key: string;
  url: string;
  title: string;
  company: string;
}

/**
 * Refuses to move a job into `applying` when this profile already applied to it.
 *
 * The apply skills are told to call `/applied/check` first, but that is advice a model can skip,
 * and a duplicate reaching the browser means a second real application lands in an employer's
 * inbox - the `@@unique([userId, url])` row guard only dedupes the record, after the fact. Both
 * routes into `applying` (the pilot claim and the campaign PATCH) run this, so the block does not
 * depend on which flow is driving. It also refuses a posting another worker is mid-apply on, which
 * `Application` rows cannot show until a result is written - see `./in-flight.ts`.
 */
export async function assertNotAlreadyApplied(
  db: DuplicateReader & InFlightReader,
  userId: string,
  job: GuardedJob,
): Promise<void> {
  const inFlight = await findInFlightDuplicate(db, userId, job);
  if (inFlight) {
    throw conflict(
      `Already applying: another worker holds "${inFlight.title}" at ${inFlight.company} (${inFlight.campaignId}/${inFlight.key}). Record this job as skipped with reason "Already applied (in-flight)" instead of applying alongside it.`,
    );
  }

  const duplicate = await findAppliedDuplicate(db, userId, {
    url: job.url,
    title: job.title,
    company: job.company,
  });
  if (!duplicate) {
    return;
  }

  // Carries the reason verbatim so the caller can write the skip without restating the rule.
  throw conflict(
    `${duplicateSkipReason(duplicate)}: this profile applied to "${duplicate.application.title}" at ${duplicate.application.company} on ${duplicate.application.appliedAt.toISOString().slice(0, 10)}. Record the job as skipped with this reason instead of applying again.`,
  );
}
