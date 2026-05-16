/**
 * Extract a structured digest from a single job listing page.
 * Targets LinkedIn / Indeed / Greenhouse / Lever / Workday layouts, with a
 * heading-based section-parsing fallback. Returns a compact payload (~500-2k
 * tokens) so the LLM can score a job without ingesting the full description.
 *
 * @returns {{
 *   title: string,
 *   company: string,
 *   location: string,
 *   salary: string|null,
 *   employmentType: string|null,
 *   remote: boolean|null,
 *   requirements: string[],
 *   responsibilities: string[],
 *   techStack: string[],
 *   yearsExperience: number|null,
 *   descriptionExcerpt: string,
 *   error?: string
 * }}
 *   - `requirements`/`responsibilities`: bullets from the matching section, capped.
 *   - `techStack`: tokens matching a built-in tech vocabulary.
 *   - `yearsExperience`: minimum years parsed from phrasing like "5+ years".
 *   - `descriptionExcerpt`: first 400 chars of body text for nuance/fallback.
 *   - On parse failure: `{ error }` plus best-effort partial fields.
 */
function extractJobDetails() {
  try {
    const txt = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();
    const root =
      document.querySelector('main, [role="main"], .jobs-description, #content, .posting, .job-view-layout') ||
      document.body;
    const title = txt(
      document.querySelector(
        'h1, h2.jobsearch-JobInfoHeader-title, .posting-headline h2, [data-testid="jobsearch-JobInfoHeader-title"]',
      ),
    );
    const company = txt(
      document.querySelector(
        '[data-testid="inlineHeader-companyName"], .topcard__org-name-link, .posting-headline .company, [data-testid="company-name"], .company-name',
      ),
    );
    const location = txt(
      document.querySelector(
        '[data-testid="inlineHeader-companyLocation"], .topcard__flavor--bullet, .location, [data-testid="text-location"]',
      ),
    );
    const bodyText = root.innerText || '';
    const lower = bodyText.toLowerCase();

    const sectionBullets = (...headings) => {
      const lines = bodyText.split('\n').map((l) => l.trim()).filter(Boolean);
      const startIdx = lines.findIndex((l) =>
        headings.some((h) => new RegExp(`^${h}\\b`, 'i').test(l)),
      );
      if (startIdx === -1) return [];
      const out = [];
      for (let i = startIdx + 1; i < lines.length && out.length < 15; i++) {
        const line = lines[i];
        if (/^(requirements?|qualifications?|responsibilities|what you|about|benefits|nice to have)\b/i.test(line)) break;
        if (line.length < 5 || line.length > 300) continue;
        out.push(line.replace(/^[•\-\*•●\s]+/, ''));
      }
      return out;
    };

    const requirements = sectionBullets('requirements', 'qualifications', 'must have', 'what you.ll need').slice(0, 15);
    const responsibilities = sectionBullets('responsibilities', 'what you.ll do', 'the role', 'your impact').slice(0, 10);

    const techVocab = [
      'javascript','typescript','react','vue','angular','svelte','nextjs','next.js','remix','astro','redux','node','nodejs','node.js','deno','bun','express','fastify','nestjs','python','django','flask','fastapi','ruby','rails','php','laravel','java','spring','kotlin','scala','go','golang','rust','c#','dotnet','.net','aspnet','sql','postgres','postgresql','mysql','mariadb','sqlite','mongodb','redis','elasticsearch','kafka','rabbitmq','graphql','rest','grpc','docker','kubernetes','k8s','terraform','ansible','aws','gcp','azure','linux','bash','git','github','gitlab','cicd','jenkins','playwright','cypress','jest','vitest','mocha','tailwind','sass','webpack','vite','rollup','prisma','sequelize','typeorm','swift','objective-c','android','flutter','react native','html','css','figma','jira','agile','scrum','llm','openai','anthropic','claude','rag','langchain','pytorch','tensorflow','pandas','numpy','spark','hadoop','airflow','dbt','snowflake','bigquery','redshift','databricks',
    ];
    const techStack = [];
    for (const t of techVocab) {
      const re = new RegExp(`\\b${t.replace(/[.+]/g, '\\$&')}\\b`, 'i');
      if (re.test(lower)) techStack.push(t);
    }

    const yearsMatch = lower.match(/(\d+)\s*\+?\s*(?:to\s*\d+\s*)?(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)/);
    const yearsExperience = yearsMatch ? Number(yearsMatch[1]) : null;
    const salaryMatch = bodyText.match(/(\$[\d,]+(?:\s*[-–—to]+\s*\$?[\d,]+)?\s*(?:\/\s*(?:yr|year|hour|hr))?|[€£][\d,]+\s*[-–—to]+\s*[€£]?[\d,]+)/);
    const salary = salaryMatch ? salaryMatch[0].trim() : null;
    const employmentTypeMatch = lower.match(/\b(full[-\s]?time|part[-\s]?time|contract|temporary|internship|freelance)\b/);
    const employmentType = employmentTypeMatch ? employmentTypeMatch[0] : null;
    const remote = /\b(remote|work from home|wfh|fully remote)\b/i.test(bodyText)
      ? true
      : /\b(on[-\s]?site|in[-\s]?office|hybrid)\b/i.test(bodyText)
        ? false
        : null;

    const descriptionExcerpt = bodyText.replace(/\s+/g, ' ').trim().slice(0, 400);

    return {
      title,
      company,
      location,
      salary,
      employmentType,
      remote,
      requirements,
      responsibilities,
      techStack,
      yearsExperience,
      descriptionExcerpt,
    };
  } catch (e) {
    return {
      title: '', company: '', location: '', salary: null, employmentType: null, remote: null,
      requirements: [], responsibilities: [], techStack: [], yearsExperience: null, descriptionExcerpt: '',
      error: e.message,
    };
  }
}
