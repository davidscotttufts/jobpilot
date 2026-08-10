# Form Filling

Job applications often span multiple pages. For each page:

## Identify and Fill

1. **Enumerate fields** - take a `browser_snapshot` narrowed to the form container. Each input / textarea / select / checkbox / radio carries a `label` and a stable `ref`.
2. **Map fields** to profile/resume data using the label, placeholder, and name. Decide every value for the page *before* filling any of it.
3. **Fill the whole page in one `browser_fill_form` call.** It takes all the fields at once and covers
   textbox, checkbox, radio, combobox, and slider - every type on a normal application page. One
   call per page, not one per field: each separate call is another round trip, and a 20-field form
   filled one input at a time is 20 of them.
   - Only these fall outside it: **file uploads** (resume) → fetch the tailored variant into the scratch dir (see `./setup.md` "Scratch files"): `mkdir -p "$JOBPILOT_WORKSPACE_ROOT/.temp" && curl -fsS -H "authorization: Bearer $JOBPILOT_API_TOKEN" "$JOBPILOT_API/api/resumes/variants/<id>/pdf" -o "$JOBPILOT_WORKSPACE_ROOT/.temp/resume.pdf"`, then `browser_file_upload` that path.
   - Reach for single-field `browser_type` / `browser_select_option` / `browser_click` only for a field the batch call rejected, or a widget that needs a click to reveal its options.
   - Date fields → use the appropriate date format
4. **Custom widgets** (date pickers, autocomplete combos, rich-text editors) the form snapshot couldn't enumerate cleanly: `browser_find` the widget's label or placeholder to get its ref. It returns matching nodes with a little context instead of the whole tree, so prefer it over a second `browser_snapshot` whenever you are locating something specific rather than reading a page.

## Special Fields

All paths refer to `GET /api/user` (already loaded by setup.md).

- **Name** → `user.{firstName, lastName}`.
- **Email** → `user.contactEmail`. **Always use this profile contact email - never your own account/assistant email, the credential login email, or any address seen elsewhere in the conversation.** When in doubt, re-read `user.contactEmail` and use it verbatim.
- **Address** → `user.{street,aptUnit,city,state,zipCode,country}`
- **Phone** → `user.phone`
- **LinkedIn / GitHub / Website** → `user.{linkedin,github,website}`
- **Salary expectations** → a caller-supplied `salaryExpectation` wins when non-null. Else `user.salaryPreferences[]`, each `{appliesTo, minAmount, maxAmount, currency, period}`: pick the entry whose `appliesTo` best matches this job's title/seniority/type (a lone generic entry matches everything). Range fields → min-max; single field → `maxAmount` (else `minAmount`). Convert period if the form asks in the other unit (yearly ≈ hourly × 2080). Radios/dropdowns → closest bracket. Empty list or no plausible match → ask the user (workers: return `needs_user category:"salary"`); remember the answer for the campaign.
- **Start date** → "Immediately" or "2 weeks notice" unless `autoApply.defaultStartDate` overrides.
- **Cover letter** (a textarea or a file-upload field labelled "cover letter") → generate via the `cover-letter` skill (already humanized; it also saves the letter to history - pass `source` = the invoking skill, `apply` or `auto-apply`). Then:
  - Text area → paste the text directly.
  - File upload → render the text to PDF and upload it: `curl -fsS -H "authorization: Bearer $JOBPILOT_API_TOKEN" -X POST "$JOBPILOT_API/api/cover-letters/pdf" -H 'content-type: application/json' -d "$(jq -n --arg t "<letter text>" '{text:$t}')" -o "$JOBPILOT_WORKSPACE_ROOT/.temp/cover-letter.pdf"`, then `browser_file_upload` that path (overwritten each time).
- **"How did you hear about us?"** → "Job board" or "Company website".
- **Years of experience** → calculate from earliest work experience date.
- **Custom questions** → best judgment from the resume. Genuinely uncertain → ask (loop skills: make a reasonable attempt and log in notes).
- **Relocation** → `user.willingToRelocate`. For preferred/target locations, use `user.preferredLocations`. Empty `[]` or contains `"Anywhere"` → user is open, answer accordingly without asking.
- **Work auth / visa** → `user.{usAuthorized, requiresSponsorship, visaStatus, optExtension}`. Map to form questions; for dropdowns, pick the closest option. Sponsorship questions ("Will you now or in the future require sponsorship?") → answer truthfully from `requiresSponsorship` - never misstate to pass a screen. If the form reveals a no-sponsorship policy the JD didn't state, still answer truthfully, finish the application, and note it in the result summary.
- **EEO / Diversity** → `user.{eeoGender, eeoRace, eeoEthnicity, eeoHispanicOrLatino, eeoVeteranStatus, eeoDisabilityStatus}`. Null → "Prefer not to disclose".
- **References** → `user.references[]`, each `{name, relationship, company, email, phone}`. Fill reference rows in order. If the form requires references and the array is empty, fill what you can and note the gap - never invent one.

## Multi-Page Navigation

1. After filling each page, find "Next" / "Continue" / "Save & Continue" and click.
2. Repeat the fill process on each new page.
3. **Do not re-snapshot to confirm a clean fill.** `browser_fill_form` reports what it set, and a
   form that rejected something says so - the next page fails to load, or validation text appears.
   Snapshot again only when you have such a signal, or when a value had to go in field-by-field.
   The page after Next is itself the confirmation that the last one was accepted.
