/** Canonical form for login emails - the users.email unique index matches case-sensitively,
 *  so every lookup and write must agree on one casing. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
