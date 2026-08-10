/**
 * Counts Playwright MCP tool calls per application from saved sessions, so apply-loop tuning is
 * measured rather than guessed. Enable capture with `--save-session` in `plugin/.mcp.json`, then:
 *
 *   bun apps/api/scripts/analyze-apply-session.ts [sessionsDir]
 *
 * Sessions hold typed form values (address, phone, salary). They live under the gitignored
 * `.playwright-mcp/` and must stay there - this script prints counts only, never field values.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const DEFAULT_DIR = join(process.cwd(), "plugin", ".playwright-mcp", "sessions");
const root = process.argv[2] ?? DEFAULT_DIR;

interface Tally {
  file: string;
  calls: number;
  byTool: Map<string, number>;
}

function sessionFiles(dir: string): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  return entries.flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      return sessionFiles(full);
    }
    return entry.endsWith(".json") || entry.endsWith(".jsonl") ? [full] : [];
  });
}

/** Tool names appear as `"name": "browser_*"` in both the JSON and JSONL session shapes. */
function tally(file: string): Tally {
  const byTool = new Map<string, number>();
  let calls = 0;
  for (const match of readFileSync(file, "utf8").matchAll(/"(browser_[a-z_]+)"/g)) {
    const tool = match[1];
    if (!tool) continue;
    byTool.set(tool, (byTool.get(tool) ?? 0) + 1);
    calls += 1;
  }
  return { file, calls, byTool };
}

const files = sessionFiles(root);
if (files.length === 0) {
  console.log(`No sessions under ${root}.`);
  console.log("Add --save-session to plugin/.mcp.json, then run a campaign.");
  process.exit(0);
}

const tallies = files.map(tally).filter((t) => t.calls > 0);
const total = new Map<string, number>();
for (const t of tallies) {
  for (const [tool, n] of t.byTool) {
    total.set(tool, (total.get(tool) ?? 0) + n);
  }
}

const calls = tallies.map((t) => t.calls).sort((a, b) => a - b);
const median = calls.length ? calls[Math.floor(calls.length / 2)] : 0;

console.log(`sessions: ${tallies.length}`);
console.log(`tool calls per session - median ${median}, max ${calls.at(-1) ?? 0}\n`);
console.log("by tool (all sessions):");
for (const [tool, n] of [...total].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(6)}  ${tool}`);
}

// The Phase 1 claim to verify: per-field fills should collapse into browser_fill_form.
const perField =
  (total.get("browser_type") ?? 0) +
  (total.get("browser_select_option") ?? 0) +
  (total.get("browser_click") ?? 0);
const batched = total.get("browser_fill_form") ?? 0;
console.log(`\nper-field fill calls: ${perField}   batched fill calls: ${batched}`);
