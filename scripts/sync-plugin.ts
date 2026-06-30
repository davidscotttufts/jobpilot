#!/usr/bin/env bun
// Mirror plugin/ into the claude-plugins marketplace repo (plugins/jobpilot).
// Usage: bun run sync:plugin [marketplace-repo-dir]  (default ../claude-plugins, or set JOBPILOT_MARKETPLACE_DIR)
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(repoRoot, "plugin");
const marketplaceDir = resolve(
  repoRoot,
  process.argv[2] ?? process.env.JOBPILOT_MARKETPLACE_DIR ?? "../claude-plugins",
);
const dest = resolve(marketplaceDir, "plugins/jobpilot");

if (!existsSync(source)) {
  console.error(`Plugin source not found: ${source}`);
  process.exit(1);
}
if (!existsSync(marketplaceDir)) {
  console.error(
    `Marketplace repo not found: ${marketplaceDir}\n` +
      `Pass its path: bun run sync:plugin <marketplace-repo-dir>`,
  );
  process.exit(1);
}

// Clear dest first so deletions propagate.
rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(source, dest, { recursive: true });

console.log(`Synced plugin/ -> ${dest}`);
console.log(`Review and commit the changes in ${marketplaceDir}.`);
