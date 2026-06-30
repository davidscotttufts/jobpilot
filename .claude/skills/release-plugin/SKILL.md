---
name: release-plugin
description: Bump the plugin version, commit, and tag a new JobPilot plugin release
user-invocable: true
---

# Release Plugin Skill

Cut a new JobPilot plugin release by bumping the version in both provider
manifests, committing, and creating a git tag that triggers the
`Release Plugin` workflow (publishes the plugin tarball and syncs the
`claude-plugins` marketplace).

## Usage

The user provides a version (e.g. `2.1.0`) or a bump type (`major`, `minor`,
`patch`). With no argument, default to a `patch` bump.

## Context

- **Version source of truth:** the `"version"` field in **both**
  `plugin/.claude-plugin/plugin.json` and `plugin/.codex-plugin/plugin.json` —
  they must stay in lockstep (Claude keys on this field for updates).
- **Tag format:** `plugin/vX.Y.Z` (matches `.github/workflows/plugin-release.yml`
  trigger `plugin/v*`; distinct from `terminal/v*`).
- **What the workflow does:** publishes `jobpilot-plugin.tar.gz` to the release
  (the terminal host downloads it at runtime) and pushes the vendored `plugin/`
  tree into the `claude-plugins` marketplace.

## Steps

1. **Determine the new version:**
   - Read the current `"version"` from both manifests; abort if they differ.
   - Use the user's explicit version, else compute from the bump type, else bump patch.
   - Verify the new version is strictly greater than the current.

2. **Pre-flight checks** (stop and report on any failure — do not paper over):
   - Both manifests currently hold the same version.
   - Working tree is clean (`git status`).
   - Current branch is `main` (or ask if on another branch).
   - No existing tag `plugin/vX.Y.Z` (`git tag -l`).

3. **Bump version:** replace `"version": "CURRENT"` with `"version": "NEW"` in
   **both** `plugin/.claude-plugin/plugin.json` and
   `plugin/.codex-plugin/plugin.json`.

4. **Commit:** stage both manifests, commit `chore(plugin): release vX.Y.Z`.

5. **Tag:** `git tag -a plugin/vX.Y.Z -m "JobPilot plugin vX.Y.Z"`.

6. **Report:** show the new version and tag, and remind the user to run
   `git push && git push origin plugin/vX.Y.Z` to trigger the `Release Plugin`
   workflow.

## Do NOT

- Do not push — the user pushes when ready.
- Do not let the two manifests drift — bump both to the same version.
- Do not use `--no-verify` / `--no-gpg-sign` if hooks fail — report instead.
- Do not amend a previous commit to roll the version — always a new commit.
