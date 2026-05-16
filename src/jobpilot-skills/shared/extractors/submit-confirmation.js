/**
 * Detect whether an application submission succeeded or failed on the
 * current page. Looks for canonical confirmation copy ("Application
 * submitted", "Thank you for applying") and inline error markers (alert
 * roles, validation classes).
 *
 * @returns {{
 *   submitted: boolean,
 *   message: string,
 *   error: string|null
 * } | { error: string }}
 *   - `submitted`: true if a success indicator is found.
 *   - `message`: the visible confirmation/error text (trimmed, capped 300 chars).
 *   - `error`: visible error text when submission appears to have failed.
 *   - On exception: `{ error }` with the exception message.
 */
function extractSubmitConfirmation() {
  try {
    const txt = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 300);
    const bodyText = document.body.innerText || '';

    const successPatterns = [
      /application (has been )?submitted/i,
      /thanks? (you )?for (applying|your application)/i,
      /successfully (applied|submitted)/i,
      /we.?(ve| have) received your application/i,
      /your application is (in|complete)/i,
    ];

    for (const re of successPatterns) {
      const match = bodyText.match(re);
      if (match) {
        const context = bodyText.slice(Math.max(0, match.index - 40), match.index + match[0].length + 80);
        return { submitted: true, message: context.replace(/\s+/g, ' ').trim().slice(0, 300), error: null };
      }
    }

    const errorEl = document.querySelector(
      '[role="alert"], .error-message, .form-error, .alert-danger, [class*="error" i]:not(:empty)',
    );
    if (errorEl) {
      const visible = errorEl.getBoundingClientRect();
      if (visible.width > 0 && visible.height > 0) {
        return { submitted: false, message: '', error: txt(errorEl) };
      }
    }

    return { submitted: false, message: '', error: null };
  } catch (e) {
    return { error: e.message };
  }
}
