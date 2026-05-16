/**
 * Extract jobs from an Indeed search results page.
 * Targets `mosaic-provider-jobcards` layout used on `/jobs?q=...` URLs.
 *
 * @returns {Array<{
 *   title: string,
 *   company: string,
 *   location: string,
 *   url: string,
 *   postedAt: string|null
 * }> | { error: string }}
 *   - `url`: absolute URL to the job detail (`/viewjob?jk=...`), tracking stripped.
 *   - `postedAt`: posted-time label as rendered, or null.
 *   - On parse failure: `{ error }` with the exception message.
 */
function extractIndeedResults() {
  try {
    const cards = document.querySelectorAll('div.job_seen_beacon, li.eu4oa1w0, div[data-testid="slider_item"]');
    const out = [];
    for (const card of cards) {
      const linkEl = card.querySelector('a.jcs-JobTitle, h2.jobTitle a, a[data-jk]');
      const titleEl = card.querySelector('h2.jobTitle span, h2 a span, .jobTitle');
      const companyEl = card.querySelector('[data-testid="company-name"], span.companyName, .companyName');
      const locationEl = card.querySelector('[data-testid="text-location"], div.companyLocation, .companyLocation');
      const timeEl = card.querySelector('[data-testid="myJobsStateDate"], .date, span.date');
      if (!linkEl || !titleEl) continue;
      const jk = linkEl.getAttribute('data-jk') || (linkEl.href || '').match(/[?&]jk=([^&]+)/)?.[1];
      const url = jk ? `${location.origin}/viewjob?jk=${jk}` : (linkEl.href || '').split('&')[0];
      out.push({
        title: (titleEl.textContent || '').trim(),
        company: (companyEl?.textContent || '').trim(),
        location: (locationEl?.textContent || '').trim(),
        url,
        postedAt: timeEl ? (timeEl.textContent || '').trim() : null,
      });
      if (out.length >= 25) break;
    }
    return out;
  } catch (e) {
    return { error: e.message };
  }
}
