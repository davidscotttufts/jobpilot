// One-time removal of the retired storage/resume-backups dir on the VPS.
// Config from apps/api/.env (env overrides). Run: bun run scripts/cleanup-resume-backups.ts
import { readFileSync } from "node:fs";
import path from "node:path";

const fileVars: Record<string, string> = {};
try {
  for (const line of readFileSync(path.join(import.meta.dir, "..", ".env"), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)=(.*)$/);
    if (m) {
      fileVars[m[1]] = m[2].replace(/\r$/, "").replace(/^(["'])(.*)\1$/, "$2");
    }
  }
} catch {
  // No .env - rely on process env only.
}

const cfg = (key: string, def = "") => process.env[key] || fileVars[key] || def;

const sshHost = cfg("SSH_TUNNEL_HOST");
const sshUser = cfg("SSH_TUNNEL_USER", "root");
const sshPort = cfg("SSH_TUNNEL_PORT", "22");
const sshKey = cfg("SSH_TUNNEL_KEY");
const appDir = cfg("VPS_APP_DIR", "~/deploy/jobpilot");

if (!sshHost || !sshUser) {
  console.error(
    "Missing SSH_TUNNEL_HOST / SSH_TUNNEL_USER in apps/api/.env (see apps/api/.env.example).",
  );
  process.exit(1);
}

// Runs inside the api container, where STORAGE_ROOT is set and the storage volume is mounted.
const containerScript = `
dir="\${STORAGE_ROOT:-./storage}/resume-backups"
if [ ! -d "$dir" ]; then echo "No $dir - nothing to clean."; exit 0; fi
echo "Removing $(find "$dir" -type f | wc -l) file(s), $(du -sh "$dir" | cut -f1), from $dir"
rm -rf "$dir"
echo "Done."
`;

const home = process.env.HOME || process.env.USERPROFILE;
const sshArgs = ["-p", sshPort];
if (sshKey) {
  sshArgs.push("-i", home ? sshKey.replace(/^~/, home) : sshKey);
}
sshArgs.push(
  `${sshUser}@${sshHost}`,
  `cd ${appDir} && docker compose exec -T api sh -c '${containerScript}'`,
);

console.log(
  `Cleaning resume-backups in the api container via ${sshUser}@${sshHost}:${sshPort} (${appDir})\n`,
);

const proc = Bun.spawnSync(["ssh", ...sshArgs], { stdio: ["inherit", "inherit", "inherit"] });
process.exit(proc.exitCode ?? 1);
