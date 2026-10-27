/** The authenticated principal derived by `authGuard` from a session or terminal token. */
export interface AuthUser {
  id: string;
  role: string;
  email: string;
  /** The `AuthToken` row that authenticated this request. */
  tokenId: string;
}
