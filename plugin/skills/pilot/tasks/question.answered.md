# `question.answered`

Payload `{questionId, questionKind, subjectType, subjectId, prompt, answer, writeForMe}`.

**`writeForMe: true`** means `answer` is the user's instructions, not the answer. Write the answer
first, then route it below as if the user had typed it:

- Draft from the instructions, the question's `prompt`, and what the subject gives you (the job's
  `brief` and the posting, the email thread, the campaign). Load the profile and resume per
  `../../_shared/setup.md` when the answer states facts about the user.
- Stay inside the instructions and the user's own records: never invent an employer, a date, a
  number, a credential, or a preference they didn't give. A fact the instructions need but nothing
  supplies → don't guess; ask again with `POST /api/pilot/questions` (same `subjectType` /
  `subjectId`, a narrower prompt) and park as before.
- Prose longer than a sentence (a cover note, an essay answer, an email) goes through the
  `humanizer` skill in embedded mode. A choice question's answer must be one of its options, or the
  short free text the instructions ask for.
- Never save it with `PUT /api/pilot/answers`: saved answers hold only what the user wrote.
- Quote what you wrote in the run summary, so the user can see what was sent for them.

Route by `subjectType`:

- **`job`** (`subjectId` = `<campaignId>:<jobKey>`) → first check for a crash-recovery answer: `It
  was submitted - mark applied` or `It was not submitted - try again`. The job is held because
  nothing can tell a sent application from an unsent one, so never re-apply blindly:
  - `It was submitted - mark applied` → open no browser. `POST /api/campaigns/$CID/jobs/$KEY/result`
    `{"outcome":"applied","appliedAt":"<now>"}`, and say in the summary the user reported it.
  - `It was not submitted - try again` → `PATCH /api/campaigns/$CID/jobs/$KEY`
    `{"status":"approved","confirmNotSubmitted":true}` (the only thing that clears the hold; any
    other move into an apply 409s), then the same PATCH with `{"status":"applying"}` (the
    applier's submit mark 409s on an `approved` job), then apply as `./job.apply.md` does.
  - Free text → read it as one of the two; if it is neither, change nothing and say so.

  Any other answer → apply as `./job.apply.md` does, adding `answers:<answer>` to the `job-applier`
  input so it never asks again.
- **`email`** (an `interview.reply` approval) → `"Send"`: send the draft from `prompt` with `POST
  /api/email/send {to,subject,body,threadId}`, replying to the `from` and `threadId` of `GET
  /api/email/messages/<subjectId>`. Free text: treat it as availability or corrections, revise the
  draft, then send. `"Skip"`: send nothing.
- **`networking`** (`subjectId` = a draft message id) → find the draft by `id` in `GET
  /api/networking/messages --query status=draft` `.items` (it carries `campaignId`). `"Send"`: send
  and record as `./networking.send.md` does. `"Skip"`: record `/result` `{"outcome":"skipped"}`.
- **`campaign`** (a `campaign.reviewPaused` answer, `subjectId` = campaign id) → `"Resume"`: `POST
  /api/campaigns/$SID/status {"status":"in_progress","actor":"pilot"}`. `"Complete campaign"`: the
  same with `"completed"`. `"Keep paused"`: nothing. Free text: read it as one of the three.
- **`board`** (a board started serving a second host, `subjectId` = `<board>-><newHost>`) → nothing
  to drive. Put the answer in the summary; if the user said the hosts are the same site, also say
  `HOST_ALIASES` in `apps/api/src/modules/application/job-url.ts` needs the entry - until it has one,
  the same posting under both hosts can be applied to twice.

Summary: what you did with the answer ("Sent the Acme interview reply - Tuesday 10am.").
