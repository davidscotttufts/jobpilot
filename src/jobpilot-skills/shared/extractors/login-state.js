/**
 * Determine whether the current page indicates the user is logged in.
 * Checks for canonical signed-in markers (Sign Out / Logout links, avatar
 * with user menu, common header user-info elements) and signed-out markers
 * (visible Sign In / Login button at top-level).
 *
 * @returns {{ isLoggedIn: boolean, username: string|null } | { error: string }}
 *   - `isLoggedIn`: true when a signed-in marker is found.
 *   - `username`: the user's name/handle if surfaced (avatar alt, header text), else null.
 *   - On parse failure: `{ error }` with the exception message.
 */
function extractLoginState() {
  try {
    const txt = (el) => (el?.textContent || '').trim();
    const visible = (el) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };

    const signOut = Array.from(document.querySelectorAll('a, button')).find((el) =>
      /\b(sign out|log out|logout|signout)\b/i.test(txt(el)),
    );
    if (signOut && visible(signOut)) {
      const avatar = document.querySelector('img[alt*="profile" i], img[alt*="avatar" i], [data-control-name*="identity" i] img');
      const nameEl = document.querySelector(
        '[data-testid="user-name"], .global-nav__me-photo + *, .user-name, .account-name, [aria-label*="account" i]',
      );
      return {
        isLoggedIn: true,
        username: avatar?.getAttribute('alt') || txt(nameEl) || null,
      };
    }

    const signIn = Array.from(document.querySelectorAll('a, button')).find((el) =>
      /\b(sign in|log in|login)\b/i.test(txt(el)) && visible(el),
    );
    if (signIn) {
      return { isLoggedIn: false, username: null };
    }

    return { isLoggedIn: false, username: null };
  } catch (e) {
    return { error: e.message };
  }
}
