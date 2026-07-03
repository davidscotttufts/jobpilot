export type InstallProvider = "claude" | "codex";

/** Marketplace-add + plugin-install commands per provider (see docs/getting-started). */
export const PLUGIN_COMMANDS: Record<InstallProvider, readonly string[]> = {
  claude: [
    "/plugin marketplace add https://github.com/suxrobgm/claude-plugins",
    "/plugin install jobpilot@sukhrob-claude-plugins",
  ],
  codex: [
    "codex plugin marketplace add suxrobGM/codex-plugins",
    "codex plugin add jobpilot@sukhrob-codex-plugins",
  ],
};

/** The setup skill invocation per provider. */
export const SETUP_COMMANDS: Record<InstallProvider, string> = {
  claude: "/jobpilot:setup",
  codex: "$setup",
};
