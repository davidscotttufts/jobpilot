/**
 * Locate the visible "Apply" button on a job listing page. Returns a stable
 * ref the caller can hand to `browser_click` so we never need a full
 * `browser_snapshot` to enumerate buttons.
 *
 * Matches: "Apply", "Apply Now", "Easy Apply", "Quick Apply", "1-Click Apply".
 *
 * @returns {{ ref: string, text: string } | null}
 *   - `ref`: `#<id>` when the element has an id, else `[data-ref="..."]` after
 *     a stable attribute is injected.
 *   - `text`: the visible button text, trimmed.
 *   - `null`: no matching visible candidate found.
 */
function findApplyButton() {
  const re = /^\s*(easy |quick |1[\s\-]?click )?apply( now)?\s*$/i;
  const candidates = document.querySelectorAll('a, button, [role="button"], input[type="submit"]');
  for (const el of candidates) {
    const txt = ((el.textContent || el.value || '') + '').trim();
    if (!re.test(txt)) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    let ref;
    if (el.id) {
      ref = `#${el.id}`;
    } else {
      const existing = el.getAttribute('data-ref');
      const dr = existing || `jp-apply-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
      if (!existing) el.setAttribute('data-ref', dr);
      ref = `[data-ref="${dr}"]`;
    }
    return { ref, text: txt };
  }
  return null;
}
