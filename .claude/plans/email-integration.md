# Email Integration — Post-Application Tracking + Verification Code Automation

## Context

JobPilot's apply / autopilot skills stop and ask the user whenever a job board
sends a verification code, CAPTCHA, or 2FA challenge — see
[shared/auth.md](src/jobpilot-skills/shared/auth.md). After submission JobPilot
also goes blind: there's no way to know if a recruiter replied, scheduled an
interview, or sent a rejection. Both gaps share a root cause: JobPilot can't
read the user's email.

This plan adds a generic **email integration** layer (Gmail first, IMAP /
Outlook later) that does two jobs:

1. **Post-application tracking** — pulls new mail, a `triage-inbox` skill
   classifies into interviewing / rejected / offer / irrelevant and links each
   thread to an `Application`. User reviews and approves in a new
   `/inbox` page; approval writes a `StageEvent`.
2. **Verification-code automation** — during account creation or login on a
   job board, when the site sends a one-time code, a new
   `fetch-verification-code` skill pulls the most recent code (or magic link)
   from the connected mailbox instead of asking the user. Falls back to the
   existing "ask the user" flow if no email account is connected.

All LLM work (classification, code extraction) flows through the active
provider PTY — server code only does OAuth, polling, storage, fuzzy match,
SSE. Schema and routes are provider-neutral so Outlook / IMAP slot in later.

## 1. Schema — `src/web/prisma/schema/email.prisma`

```prisma
model EmailAccount {
  id              Int      @id @default(1)         // singleton for now
  provider        String                            // "gmail" | "outlook" | "imap"
  email           String
  accessToken     String?                           // OAuth flow
  refreshToken    String?
  tokenExpiresAt  DateTime?
  imapHost        String?                           // imap fallback
  imapPort        Int?
  imapPassword    String?                           // app-password for imap
  scope           String?
  historyId       String?                           // gmail delta cursor
  lastSyncAt      DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  messages        EmailMessage[]
}

model EmailMessage {
  id              Int      @id @default(autoincrement())
  accountId       Int
  account         EmailAccount @relation(fields: [accountId], references: [id], onDelete: Cascade)
  providerId      String   @unique                  // gmail message id / imap uid
  threadId        String?
  subject         String
  fromAddress     String
  fromName        String?
  fromDomain      String
  snippet         String
  rawBody         String                            // decoded plain-text body
  receivedAt      DateTime
  fetchedAt       DateTime @default(now())

  // post-application triage
  triagedAt       DateTime?
  classification  String?   // "interviewing"|"rejected"|"offer"|"irrelevant"|"verification"
  confidence      Float?
  reasoning       String?
  matchedAppId    Int?
  matchedApp      Application? @relation(fields: [matchedAppId], references: [id], onDelete: SetNull)
  matchScore      Float?
  reviewStatus    String   @default("pending")      // pending|approved|denied|auto
  appliedStage    String?                           // stage written upon approval

  // verification-code extraction (filled when classification="verification")
  verificationCode String?
  verificationLink String?
  verificationDomain String?                        // job board domain this code was for

  @@index([reviewStatus, receivedAt])
  @@index([matchedAppId])
  @@index([fromDomain, receivedAt])
  @@index([verificationDomain, receivedAt])
}
```

`application.prisma` — add back-relation `emailMessages EmailMessage[]`.

Run `bunx prisma migrate dev --name email-integration`.

## 2. API routes — `src/web/src/app/api/email/`

OAuth and provider config:
- `oauth/start/route.ts` GET `?provider=gmail` → returns Google consent URL (`gmail.readonly`); state cookie. Redirect URI `/api/email/oauth/callback`.
- `oauth/callback/route.ts` GET → exchanges code, upserts singleton `EmailAccount` with `provider="gmail"`, redirects to `/inbox`.
- `account/route.ts` GET (status + email + provider + lastSyncAt) / DELETE (disconnect, clear tokens) / PUT (configure imap fallback).

Sync + messages:
- `sync/route.ts` POST → provider-dispatched (gmail via `googleapis`, imap stub for later). Refresh tokens if expired. Upsert new messages with `triagedAt=null`. Returns `{ fetched, new }`. Publishes SSE on a new `inbox` topic.
- `messages/route.ts` GET (filters: `reviewStatus`, `classification`, `since`, `domainHint`).
- `messages/[id]/route.ts` PATCH — triage / verification skills write back `{ classification, confidence, reasoning, matchedAppId, matchScore, appliedStage, verificationCode, verificationLink, verificationDomain }`.
- `messages/[id]/approve/route.ts` POST → creates a `StageEvent`, sets `Application.stage = appliedStage`, sets `reviewStatus="approved"`.
- `messages/[id]/deny/route.ts` POST → `reviewStatus="denied"`.
- `messages/bulk/route.ts` POST `{ ids[], action: "approve"|"deny" }`.

Verification-code helper:
- `verification-codes/route.ts` GET `?domain=<board-domain>&since=<isoMinutesAgo>` → returns the latest **already-classified** verification message for that domain (so skills can poll without re-extracting). Returns `{ code?, link?, receivedAt }` or 404.

Add zod schemas at `src/web/src/lib/schemas/email.ts`. Reuse existing `ok`/`err` helpers from `src/web/src/lib/api/`.

## 3. Skills — `src/jobpilot-skills/skills/`

**`triage-inbox.md`** (no args)
1. `${JOBPILOT_SKILLS_ROOT}/shared/setup.md`.
2. `GET /api/email/messages?reviewStatus=pending&classification=null`.
3. For each: classify into `interviewing | rejected | offer | irrelevant | verification`. For non-verification matches, propose `matchedAppId` by calling `GET /api/applied?search=<company-or-subject>` — reuse fuzzy match from [src/web/src/lib/matching.ts](src/web/src/lib/matching.ts).
4. `PATCH /api/email/messages/{id}` with classification + reasoning + match. Leaves `reviewStatus="pending"` so user reviews in UI. ≥0.95 confidence + matched app may set `reviewStatus="auto"`.
5. Print summary table.

**`fetch-verification-code.md`** (`<board-domain>`)
1. Setup. `GET /api/email/account` — if 404 (no account connected), fall back to the existing "ask the user" prompt from `shared/auth.md`.
2. Trigger a fresh `POST /api/email/sync` so we catch the just-sent code.
3. `GET /api/email/messages?classification=verification&domainHint=<board-domain>&since=<now-5min>`.
4. If none yet, wait 5s and retry up to 6 times.
5. Extract `verificationCode` and/or `verificationLink` from the message body (LLM does this locally). `PATCH /api/email/messages/{id}` with the extracted values + `verificationDomain=<board-domain>`.
6. Return the code/link to the caller via stdout for the calling skill to consume.

**Edits to `shared/auth.md`** — the existing "site sent a verification code" branch becomes:
```
If <fetch-verification-code-command> is available, run:
  <fetch-verification-code-command> "<board-domain>"
and fill the returned code. If it returns nothing within 30s, fall back to
asking the user.
```
This preserves the manual fallback when the user hasn't connected mail.

**Provider wrappers** — add SKILL.md under both plugin trees:
- `src/jobpilot-claude-plugin/skills/{triage-inbox,fetch-verification-code}/SKILL.md`
- `src/jobpilot-codex-plugin/skills/jobpilot-{triage-inbox,fetch-verification-code}/SKILL.md`

Each mirrors [src/jobpilot-claude-plugin/skills/cover-letter/SKILL.md](src/jobpilot-claude-plugin/skills/cover-letter/SKILL.md). Add the new `<triage-inbox-command>` and `<fetch-verification-code-command>` placeholders to **every** wrapper that uses commands, so apply/autopilot can invoke them.

## 4. Web UI

**`/inbox` page** — `src/web/src/app/inbox/page.tsx` (RSC) + `src/web/src/components/features/inbox/`:
- `inbox-content.tsx` — top client (mirror `applications-content.tsx` pattern).
- `inbox-toolbar.tsx` — Sync button → `POST /api/email/sync`; Triage button → `injectSkill("triage-inbox")`; filter chips.
- `inbox-table.tsx` — columns: from/subject, classification chip, confidence bar, matched app, actions. Reuse the MUI DataGrid pattern from applications.
- `message-review-dialog.tsx` — body preview, re-match autocomplete over `/api/applied`, Approve / Deny.
- `bulk-actions-bar.tsx`.
- Subscribes to `inbox` SSE topic for live sync progress.

**Profile additions** — `src/web/src/components/features/profile/`:
- `email-tab.tsx` — disconnected state: provider select (Gmail enabled, others "coming soon") + "Connect Gmail" → `window.location.href = "/api/email/oauth/start?provider=gmail"`. Connected: provider + address + lastSync + Disconnect. IMAP form gated behind "Advanced".
- Add to `profile-content.tsx` tab list.

## 5. Order + verification

1. Schema migration.
2. Provider abstraction: `src/web/src/lib/email/provider.ts` (interface) + `src/web/src/lib/email/gmail.ts` (initial impl using `googleapis`).
3. OAuth + account routes; `email-tab.tsx`; document Google Cloud client setup in `README.md`; add `GOOGLE_CLIENT_ID/SECRET` to `.env.example`.
4. Sync + messages routes + `inbox` SSE topic.
5. `triage-inbox.md` skill + wrappers.
6. `/inbox` page + components.
7. `fetch-verification-code.md` skill + wrappers.
8. Edit `shared/auth.md` to invoke the verification skill before falling back to manual prompt.

**Verify:**
- Connect Gmail in `/profile` → OAuth round-trip lands back at `/inbox`.
- `curl -X POST localhost:8000/api/email/sync` returns `{ fetched, new }`.
- `/inbox` shows untriaged rows. "Triage pending" → terminal runs `/jobpilot:triage-inbox` → rows get classifications + matched applications.
- Click row → adjust match → Approve → corresponding `/applications/{id}` shows new `StageEvent` with matching `toStage`.
- Trigger a job-board signup (or simulate by sending a code email to the connected inbox). Run `/jobpilot:fetch-verification-code "linkedin.com"` directly in the terminal and confirm the code is returned. Then run `/jobpilot:apply <url>` on a board requiring verification and watch it auto-fill without prompting.

## Critical files

To modify:
- [src/web/prisma/schema/application.prisma](src/web/prisma/schema/application.prisma) — back-relation.
- [src/jobpilot-skills/shared/auth.md](src/jobpilot-skills/shared/auth.md) — verification branch invokes the new skill before manual fallback.
- All wrapper SKILL.md files under [src/jobpilot-claude-plugin/skills/](src/jobpilot-claude-plugin/skills/) and [src/jobpilot-codex-plugin/skills/](src/jobpilot-codex-plugin/skills/) — add new command aliases.
- [src/web/src/components/features/profile/profile-content.tsx](src/web/src/components/features/profile/profile-content.tsx) — add Email tab.

To reuse:
- [src/web/src/lib/sse/sse-broker.ts](src/web/src/lib/sse/sse-broker.ts) and [run-events.ts](src/web/src/lib/sse/run-events.ts) — add `inbox` topic.
- [src/web/src/lib/terminal.ts](src/web/src/lib/terminal.ts) and [src/web/src/providers/terminal-provider.tsx](src/web/src/providers/terminal-provider.tsx) — `injectSkill`.
- [src/web/src/lib/matching.ts](src/web/src/lib/matching.ts) — fuzzy match for triage.

To create:
- `src/web/prisma/schema/email.prisma`.
- `src/web/src/app/api/email/**/route.ts` (10 routes total).
- `src/web/src/lib/email/{provider,gmail}.ts`, `src/web/src/lib/schemas/email.ts`.
- `src/web/src/app/inbox/page.tsx` + `src/web/src/components/features/inbox/*`.
- `src/web/src/components/features/profile/email-tab.tsx`.
- `src/jobpilot-skills/skills/{triage-inbox,fetch-verification-code}.md` + 4 wrapper SKILL.md files.
