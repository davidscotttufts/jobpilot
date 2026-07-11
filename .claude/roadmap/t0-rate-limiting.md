# Rate limiting

Tier 0 — Fixes · Status: **todo**

## What

No rate limiting exists anywhere in the API. Throttle the abuse-prone routes first:
`/auth/login`, `/auth/register`, `/auth/password/forgot`, `/captcha/solve` (the CAPTCHA proxy
spends the server's paid solver credits).

## Done when

Burst requests get 429s; limits are documented in the module; the rest of the API can adopt the
same middleware later.

## Notes

- (add dated notes here)
