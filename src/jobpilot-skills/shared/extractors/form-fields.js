/**
 * Enumerate all form inputs/selects/textareas on the current page. Returns
 * each field's label, name, type, requiredness, and accessibility ref so
 * subsequent `browser_click` / `browser_type` calls can act on them without
 * a full page snapshot.
 *
 * @returns {Array<{
 *   ref: string,
 *   name: string,
 *   label: string,
 *   type: string,
 *   required: boolean,
 *   placeholder: string,
 *   options?: string[],
 *   value: string
 * }> | { error: string }}
 *   - `ref`: stable id selector usable as `#<id>` (or `[data-ref="..."]` when
 *     the field had no id; one is injected and the attribute returned).
 *   - `options`: for select elements, the visible option labels.
 *   - On parse failure: `{ error }` with the exception message.
 */
function extractFormFields() {
  try {
    const labelFor = (el) => {
      if (el.id) {
        const lab = document.querySelector(`label[for="${el.id}"]`);
        if (lab) return (lab.textContent || '').trim();
      }
      const wrapping = el.closest('label');
      if (wrapping) return (wrapping.textContent || '').replace((el.value || ''), '').trim();
      const labelledBy = el.getAttribute('aria-labelledby');
      if (labelledBy) {
        const lab = document.getElementById(labelledBy);
        if (lab) return (lab.textContent || '').trim();
      }
      return el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.name || '';
    };

    const fields = document.querySelectorAll('input:not([type="hidden"]), select, textarea');
    const out = [];
    let counter = 0;
    for (const el of fields) {
      let ref;
      if (el.id) {
        ref = `#${el.id}`;
      } else {
        const dataRef = el.getAttribute('data-ref') || `jp-${counter++}`;
        el.setAttribute('data-ref', dataRef);
        ref = `[data-ref="${dataRef}"]`;
      }
      const tag = el.tagName.toLowerCase();
      const type = tag === 'select' ? 'select' : tag === 'textarea' ? 'textarea' : (el.type || 'text');
      const entry = {
        ref,
        name: el.name || '',
        label: labelFor(el),
        type,
        required: el.required || el.getAttribute('aria-required') === 'true',
        placeholder: el.getAttribute('placeholder') || '',
        value: el.value || '',
      };
      if (tag === 'select') {
        entry.options = Array.from(el.options).map((o) => (o.textContent || '').trim()).filter(Boolean);
      }
      out.push(entry);
    }
    return out;
  } catch (e) {
    return { error: e.message };
  }
}
