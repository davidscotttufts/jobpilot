/**
 * Best-effort fallback extractor for any job-board search results page.
 * Walks anchor tags whose URL or text suggests a job posting, and tries to
 * read nearby company/location text. Use when no board-specific extractor
 * applies or when a board-specific extractor returns `error`.
 *
 * @returns {Array<{
 *   title: string,
 *   company: string,
 *   location: string,
 *   url: string,
 *   postedAt: string|null
 * }> | { error: string }}
 *   On parse failure: `{ error }` with the exception message.
 */
function extractGenericResults() {
  try {
    const seen = new Set();
    const out = [];
    const anchors = document.querySelectorAll('a[href]');
    for (const a of anchors) {
      const href = a.href || '';
      if (!/(job|career|position|opening|posting|listing|requisition)/i.test(href)) continue;
      const url = href.split('?')[0];
      if (seen.has(url)) continue;
      const text = (a.textContent || '').trim();
      if (!text || text.length < 4 || text.length > 200) continue;
      const card = a.closest('li, article, div[class*="card"], div[class*="job"], div[class*="result"]') || a.parentElement;
      const companyEl = card?.querySelector('[class*="company" i], [data-testid*="company" i]');
      const locationEl = card?.querySelector('[class*="location" i], [data-testid*="location" i]');
      const timeEl = card?.querySelector('time, [class*="posted" i], [class*="date" i]');
      seen.add(url);
      out.push({
        title: text,
        company: (companyEl?.textContent || '').trim(),
        location: (locationEl?.textContent || '').trim(),
        url,
        postedAt: timeEl ? (timeEl.getAttribute?.('datetime') || timeEl.textContent || '').trim() : null,
      });
      if (out.length >= 25) break;
    }
    return out;
  } catch (e) {
    return { error: e.message };
  }
}
