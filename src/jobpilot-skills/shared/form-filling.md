# Form Filling

Job applications often span multiple pages. For each page:

## Identify and Fill

1. **Enumerate fields** — run `${JOBPILOT_SKILLS_ROOT}/shared/extractors/form-fields.js` via `browser_evaluate`. Returns each input / textarea / select / checkbox / radio / visible input with `label`, `name`, `type`, `required`, `options` (selects), and a stable `ref` usable by `browser_click` / `browser_type` / `browser_select_option`. **No `browser_snapshot` needed.**
2. **Map fields** to profile/resume data using `label`, `placeholder`, `name`.
3. **Fill** addressing each by `ref`:
   - Text inputs → `browser_type` (or `browser_fill_form` for batch)
   - Selects → `browser_select_option`
   - Checkboxes / radios → `browser_click`
   - File uploads (resume) → `browser_file_upload` with the selected resume path (see Resume Selection in setup.md)
   - Date fields → use the appropriate date format
4. **Custom widgets** (date pickers, autocomplete combos, rich-text editors) that `form-fields.js` couldn't enumerate: narrowed `browser_snapshot` of just that widget's container to obtain a ref.

## Special Fields

All paths refer to `GET /api/profile` (already loaded by setup.md).

- **Address** → `data.profile.{street,aptUnit,city,state,zipCode,country}`
- **Phone** → `data.profile.phone`
- **LinkedIn / GitHub / Website** → `data.profile.{linkedin,github,website}`
- **Salary expectations** → `data.autopilot.salaryExpectation` if set. For radios/dropdowns, pick the closest match. If empty, ask the user (autopilot: once on first encounter, remember).
- **Start date** → "Immediately" or "2 weeks notice" unless `data.autopilot.defaultStartDate` overrides.
- **Cover letter** → generate via `<cover-letter-command>` (already humanized). Then:
  - Text area → paste the text directly.
  - File-upload only → `Write` to `${JOBPILOT_WORKSPACE_ROOT}/cover-letter.txt` and `browser_file_upload`. Reuse the same path each time (overwritten).
- **"How did you hear about us?"** → "Job board" or "Company website".
- **Years of experience** → calculate from earliest work experience date.
- **Custom questions** → best judgment from the resume. Genuinely uncertain → ask (autopilot: make a reasonable attempt and log in notes).
- **Relocation** → `data.profile.willingToRelocate`. For preferred/target locations, use `data.profile.preferredLocations`. Empty `[]` or contains `"Anywhere"` → user is open, answer accordingly without asking.
- **Work auth / visa** → `data.profile.{usAuthorized, requiresSponsorship, visaStatus, optExtension}`. Map to form questions; for dropdowns, pick the closest option.
- **EEO / Diversity** → `data.profile.{eeoGender, eeoRace, eeoEthnicity, eeoHispanicOrLatino, eeoVeteranStatus, eeoDisabilityStatus}`. Null → "Prefer not to disclose".

## Multi-Page Navigation

1. After filling each page, find "Next" / "Continue" / "Save & Continue" and click.
2. Repeat the fill process on each new page.
3. **Re-run `form-fields.js`** on each page to verify values landed before clicking Next.
