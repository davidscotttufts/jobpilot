# `promotion.post`

Payload `{promotionId, platform, target, title, body}`: a post the user approved. Post it verbatim; never rewrite it.

1. Log in per `../../_shared/auth.md` (a CAPTCHA goes to the `solve-captcha` skill).
2. Go to `target`. For `hn-whoishiring` with a stale or empty `target`, find this month's "Ask HN: Who wants to be hired?" thread.
3. Submit `title`/`body` and capture the new post's permalink.

```bash
jobpilot-api POST /api/pilot/promotions/$PROMO_ID/result \
  --data '{"outcome":"posted","postedUrl":"<permalink>"}'
```

No credentials, a failed login, a locked thread or rules that forbid the post → `{"outcome":"skipped"|"failed","note":"<why>"}`.

Summary: "Posted to hn-whoishiring - <url>."
