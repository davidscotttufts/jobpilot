#!/usr/bin/env bun
/// <reference types="bun" />

/**
 * Generate per-provider skill bundles from the canonical pack.
 *
 * Source of truth: src/jobpilot-skills/skills/<name>/SKILL.md (+ optional
 * supporting files). The canonical body uses <skill-name>-command placeholders
 * for cross-skill references and ${JOBPILOT_SKILLS_ROOT} for the shared/
 * directory; this script rewrites both per provider and emits gitignored
 * trees under each plugin's skills/ folder.
 *
 * Run via `bun scripts/sync-skills.ts` or the `predev`/`prestart` hooks.
 */
import { existsSync } from "node:fs";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dir, "..");
const CANONICAL_DIR = join(REPO_ROOT, "src/jobpilot-skills/skills");
const EXTRACTORS_DIR = join(REPO_ROOT, "src/jobpilot-skills/shared/extractors");

interface Runtime {
  out: string;
  sources: string[];
  /** A method name whose presence on `window.__jp` proves this runtime is already installed. */
  sentinel: string;
  /** The literal object body merged into `window.__jp` via `Object.assign`. */
  bindings: string;
}

/**
 * Per-skill `window.__jp` runtimes. The model `Read`s one of these files
 * once per browser session and passes the contents to `browser_evaluate`;
 * subsequent extractor calls become `() => window.__jp.<method>()`.
 *
 * Multiple runtimes can coexist on the same tab — each one merges its
 * methods into `window.__jp` and uses `sentinel` to detect prior install
 * of its own methods (not the other runtime's).
 */
const RUNTIMES: Runtime[] = [
  {
    out: "apply-runtime.js",
    sources: [
      "job-details.js",
      "form-fields.js",
      "submit-confirmation.js",
      "find-apply-button.js",
    ],
    sentinel: "applyButton",
    bindings: `{
    jobDetails: extractJobDetails,
    formFields: extractFormFields,
    submitConfirm: extractSubmitConfirmation,
    applyButton: findApplyButton,
    loggedIn: function () {
      var fields = extractFormFields();
      if (!Array.isArray(fields)) return null;
      return !fields.some(function (f) {
        return f.type === 'password' && f.ref;
      });
    },
  }`,
  },
  {
    out: "search-runtime.js",
    sources: ["generic-results.js"],
    sentinel: "results",
    bindings: `{
    results: extractGenericResults,
  }`,
  },
];

type Frontmatter = Map<string, string>;

interface Provider {
  label: string;
  outDir: string;
  skillsRoot: string;
  token: (skill: string) => string;
  /** When set, only these frontmatter keys are kept in the output. */
  frontmatterKeys?: Set<string>;
}

const PROVIDERS: Provider[] = [
  {
    label: "claude",
    outDir: join(REPO_ROOT, "src/jobpilot-claude-plugin/skills"),
    skillsRoot: "${CLAUDE_PLUGIN_ROOT}/../jobpilot-skills",
    token: (skill) => `/jobpilot:${skill}`,
  },
  {
    label: "codex",
    outDir: join(REPO_ROOT, "src/jobpilot-codex-plugin/skills"),
    skillsRoot: "${JOBPILOT_SKILLS_ROOT}",
    token: (skill) => `$${skill}`,
    // Codex's SKILL.md spec recognizes only these; Claude-only fields
    // (allowed-tools, disable-model-invocation, etc.) are stripped.
    frontmatterKeys: new Set(["name", "description", "argument-hint", "version"]),
  },
];

/**
 * Split a SKILL.md into its YAML frontmatter and markdown body. The parser
 * preserves multi-line scalars and block sequences verbatim so the renderer
 * can round-trip them without depending on a YAML library.
 */
function parseFrontmatter(source: string): { fm: Frontmatter; body: string } {
  // Strip UTF-8 BOM if present, which can cause YAML parsing to fail
  if (source.charCodeAt(0) === 0xfeff) {
    source = source.slice(1);
  }
  if (!source.startsWith("---")) {
    throw new Error("SKILL.md missing frontmatter");
  }

  const end = source.indexOf("\n---", 3);
  if (end === -1) {
    throw new Error("SKILL.md frontmatter not terminated");
  }

  const yaml = source.slice(3, end).replace(/^[\r\n]+/, "");
  const body = source.slice(end + 4).replace(/^[\r\n]+/, "");
  const fm: Frontmatter = new Map();

  let key: string | null = null;
  let buf: string[] = [];
  const flush = () => {
    if (key !== null) {
      fm.set(key, buf.join("\n"));
    }
  };

  for (const line of yaml.split(/\r?\n/)) {
    const skillMatch = !/^\s/.test(line) ? line.match(/^([A-Za-z][\w-]*):\s?(.*)$/) : null;
    if (skillMatch) {
      flush();
      key = skillMatch[1];
      buf = skillMatch[2] ? [skillMatch[2]] : [];
    } else {
      buf.push(line);
    }
  }
  flush();

  return { fm, body };
}

/** Serialize a parsed frontmatter back to a `---`-delimited YAML block. */
function renderFrontmatter(fm: Frontmatter): string {
  const lines: string[] = ["---"];
  for (const [key, val] of fm) {
    if (val === "" || /^\s/.test(val)) {
      // No first-line value; block sequence or mapping starts on the next line.
      lines.push(`${key}:`);
      if (val) {
        lines.push(...val.split("\n"));
      }
    } else {
      // Either a plain scalar or a block-scalar header (`|`, `>`).
      const [first, ...rest] = val.split("\n");
      lines.push(`${key}: ${first}`);
      lines.push(...rest);
    }
  }

  lines.push("---");
  return lines.join("\n");
}

/**
 * Return a new frontmatter containing only the keys in `keep`. When `keep`
 * is omitted, the original frontmatter is returned unchanged.
 */
function filterFrontmatter(fm: Frontmatter, keep?: Set<string>): Frontmatter {
  if (!keep) {
    return fm;
  }
  const next: Frontmatter = new Map();
  for (const [k, v] of fm) {
    if (keep.has(k)) {
      next.set(k, v);
    }
  }
  return next;
}

/**
 * Rewrite canonical placeholders for a specific provider: `<X-command>` is
 * replaced with `provider.token("X")` when X is a known skill, and
 * `${JOBPILOT_SKILLS_ROOT}` is replaced with the provider's resolved path.
 */
function substituteBody(body: string, skills: string[], provider: Provider): string {
  return body
    .replace(/<([a-z][a-z0-9-]*)-command>/g, (match, skill) =>
      skills.includes(skill) ? provider.token(skill) : match,
    )
    .replaceAll("${JOBPILOT_SKILLS_ROOT}", provider.skillsRoot);
}

/**
 * Build per-skill `window.__jp` runtime bundles in the canonical extractors
 * directory. Each runtime is a single arrow-function expression so the model
 * can pass its raw contents to `browser_evaluate`. The bundle inlines every
 * source extractor's function declaration and ends by installing `window.__jp`.
 */
async function bundleRuntimes(): Promise<void> {
  await Promise.all(
    RUNTIMES.map(async (runtime) => {
      const bodies = await Promise.all(
        runtime.sources.map((src) => readFile(join(EXTRACTORS_DIR, src), "utf8")),
      );
      const inlined = runtime.sources
        .flatMap((src, i) => [
          `  // <BUNDLED: ${src}>`,
          bodies[i].replace(/^\s+|\s+$/g, "").split("\n").map((l) => `  ${l}`).join("\n"),
        ])
        .join("\n\n");
      const out = `// AUTO-GENERATED by scripts/sync-skills.ts; do not edit by hand.
// Pass the contents of this file to \`browser_evaluate\` once per browser session.
// Subsequent calls use \`() => window.__jp.<method>()\`.
() => {
  if (window.__jp && typeof window.__jp.${runtime.sentinel} === 'function') {
    return { warmed: true, already: true };
  }
${inlined}

  window.__jp = Object.assign(window.__jp || {}, ${runtime.bindings});
  return { warmed: true, already: false };
}
`;
      await writeFile(join(EXTRACTORS_DIR, runtime.out), out);
    }),
  );
}

/** List canonical skill names (directories under CANONICAL_DIR that contain a SKILL.md). */
async function discoverSkills(): Promise<string[]> {
  const entries = await readdir(CANONICAL_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && existsSync(join(CANONICAL_DIR, e.name, "SKILL.md")))
    .map((e) => e.name)
    .sort();
}

/** Copy every file in the canonical skill directory except SKILL.md to the output directory. */
async function copySupportingFiles(srcDir: string, dstDir: string): Promise<void> {
  const entries = await readdir(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "SKILL.md") {
      continue;
    }
    await cp(join(srcDir, entry.name), join(dstDir, entry.name), { recursive: true });
  }
}

/** Remove `dir` and recreate it empty. */
async function resetDir(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
}

/**
 * Emit one skill across every configured provider, writing the adjusted
 * SKILL.md and copying any supporting files alongside it.
 */
async function syncSkill(skill: string, skills: string[]): Promise<void> {
  const srcDir = join(CANONICAL_DIR, skill);
  const source = await readFile(join(srcDir, "SKILL.md"), "utf8");
  const { fm, body } = parseFrontmatter(source);

  for (const provider of PROVIDERS) {
    const outFm = filterFrontmatter(fm, provider.frontmatterKeys);
    const outBody = substituteBody(body, skills, provider);
    const outDir = join(provider.outDir, skill);

    await mkdir(outDir, { recursive: true });
    await writeFile(join(outDir, "SKILL.md"), `${renderFrontmatter(outFm)}\n\n${outBody}`);
    await copySupportingFiles(srcDir, outDir);
  }
}

/** Entry point: discover canonical skills, reset provider trees, and sync each skill in parallel. */
async function main(): Promise<void> {
  const skills = await discoverSkills();
  if (skills.length === 0) {
    console.error(`No canonical skills found at ${CANONICAL_DIR}`);
    process.exit(1);
  }

  await bundleRuntimes();
  await Promise.all(PROVIDERS.map((p) => resetDir(p.outDir)));
  await Promise.all(skills.map((s) => syncSkill(s, skills)));

  const dests = PROVIDERS.map((p) => p.label).join(" + ");
  console.log(`Synced ${skills.length} skills to ${dests}: ${skills.join(", ")}`);
  console.log(`Bundled runtimes: ${RUNTIMES.map((r) => r.out).join(", ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
