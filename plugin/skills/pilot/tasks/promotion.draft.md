# `promotion.draft`

Payload `{platform, target?}`. Write a self-promotion post from the profile and primary resume
(`../../_shared/setup.md`):

- `"hn-whoishiring"`: the "Ask HN: Who wants to be hired?" format, `Location:` / `Remote:` /
  `Willing to relocate:` / `Technologies:` / `Résumé:` / `Email:` lines plus a 2-3 sentence pitch.
- `"reddit:<sub>"`: read the subreddit's posting rules (sidebar/wiki) first and follow its title
  format (r/forhire wants a `[For Hire]` prefix).
- `"linkedin-post"`: first person, 100-150 words, at most 3 hashtags.

Say what you do, one or two concrete things you built (from the resume), and what you're looking
for. No "I'm thrilled to announce", "exciting new chapter", or "open to opportunities where I can
make an impact". Don't reuse the opening or pitch of the drafts in `GET
/api/pilot/promotions?page=1&limit=5`. Run the `humanizer` skill in embedded mode on the body.

Save `{"platform":"<platform>","target":<target or null>,"title":<title or null>,"body":"<body>"}`
to `$JOBPILOT_TEMP/promo.json`. Never post: the user reviews drafts in the dashboard.

```bash
jobpilot-api POST /api/pilot/promotions --data @"$JOBPILOT_TEMP/promo.json"
```

Summary: "Drafted hn-whoishiring post - awaiting your review."
