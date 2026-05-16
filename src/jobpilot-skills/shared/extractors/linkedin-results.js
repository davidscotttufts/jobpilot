/**
 * Extract jobs from a LinkedIn search results page.
 * Targets the standard `/jobs/search/` and `/jobs/collections/*` layouts.
 *
 * @returns {Array<{
 *   title: string,
 *   company: string,
 *   location: string,
 *   url: string,
 *   postedAt: string|null
 * }> | { error: string }}
 *   - `title`: job title, trimmed.
 *   - `company`: hiring company name.
 *   - `location`: free-form location string as shown on the card.
 *   - `url`: absolute URL to the job detail page (with tracking params stripped).
 *   - `postedAt`: posted-time label ("2 days ago"), or null if absent.
 *   - On parse failure: `{ error }` with the exception message.
 */
function extractLinkedinResults() {
  try {
    const cards = document.querySelectorAll(
      'li[data-occludable-job-id], div.job-card-container, li.jobs-search-results__list-item, div.base-card',
    );
    const out = [];
    for (const card of cards) {
      const linkEl = card.querySelector('a.job-card-list__title, a.base-card__full-link, a.job-card-container__link');
      const titleEl = card.querySelector('.job-card-list__title, h3, .base-search-card__title');
      const companyEl = card.querySelector('.job-card-container__primary-description, .base-search-card__subtitle, h4');
      const locationEl = card.querySelector('.job-card-container__metadata-item, .job-search-card__location');
      const timeEl = card.querySelector('time');
      if (!linkEl || !titleEl) continue;
      const rawUrl = linkEl.href || '';
      const url = rawUrl.split('?')[0];
      out.push({
        title: (titleEl.textContent || '').trim(),
        company: (companyEl?.textContent || '').trim(),
        location: (locationEl?.textContent || '').trim(),
        url,
        postedAt: timeEl ? (timeEl.getAttribute('datetime') || timeEl.textContent || '').trim() : null,
      });
      if (out.length >= 25) break;
    }
    return out;
  } catch (e) {
    return { error: e.message };
  }
}
