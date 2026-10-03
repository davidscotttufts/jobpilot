# `job.retryFailed`

Payload `{campaignId, failedCount}`. Page through `GET /api/campaigns/$CID/jobs --query status=failed`. For each job whose `failReason` is transient (timeout, 5xx, session lost; never an eligibility skip), `POST /api/campaigns/$CID/jobs/<key>/retry` with `{"retryNotes":"<its retryNotes>"}`. Don't apply; `job.apply` runs pick them up.

Detail `{"type":"retryFailed"}`. Summary: "Queued 3 of 5 failed jobs for retry - 2 were eligibility failures."
