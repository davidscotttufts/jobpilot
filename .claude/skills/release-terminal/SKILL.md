---
name: release-terminal
description: Bump version, commit, and tag a new JobPilot Terminal (PTY host) release
user-invocable: true
---

# Release Terminal Skill

Cut a new JobPilot Terminal release by bumping the version, committing, and
creating a git tag that triggers the `Release Terminal` workflow.

## Usage

The user provides a version (e.g. `1.2.0`) or a bump type (`major`, `minor`,
`patch`). With no argument, default to a `patch` bump.

## Context

- **Version source of truth:** `apps/terminal/JobPilot.Terminal.csproj` — the `<Version>` element
- **Tag format:** `terminal/vX.Y.Z` (matches `.github/workflows/release-terminal.yml` trigger `terminal/v*`)
- **Release body:** the workflow sets `generate_release_notes: true`, so GitHub
  auto-generates notes from merged PRs/commits — no CHANGELOG section required.
- **Build:** the workflow runs Native AOT publish for `linux-x64`, `osx-arm64`,
  `win-x64` and archives each `apps/terminal/publish/` tree (the native binary
  plus the bundled `plugin/`) to the GitHub Release.

## Steps

1. **Determine the new version:**
   - Read the current `<Version>` from `apps/terminal/JobPilot.Terminal.csproj`.
   - Use the user's explicit version, else compute from the bump type, else bump patch.
   - Verify the new version is strictly greater than the current.

2. **Pre-flight checks** (stop and report on any failure — do not paper over):
   - Working tree is clean (`git status`).
   - Current branch is `main` (or ask if on another branch).
   - No existing tag `terminal/vX.Y.Z` (`git tag -l`).

3. **Bump version:** replace `<Version>CURRENT</Version>` with `<Version>NEW</Version>`
   in `apps/terminal/JobPilot.Terminal.csproj`.

4. **Commit:** stage the csproj, commit `chore(terminal): release vX.Y.Z`.

5. **Tag:** `git tag -a terminal/vX.Y.Z -m "JobPilot Terminal vX.Y.Z"`.

6. **Report:** show the new version and tag, and remind the user to run
   `git push && git push origin terminal/vX.Y.Z` to trigger the `Release Terminal`
   workflow (AOT binaries for all three RIDs + auto-generated notes).

## Do NOT

- Do not push — the user pushes when ready.
- Do not use `--no-verify` / `--no-gpg-sign` if hooks fail — report instead.
- Do not amend a previous commit to roll the version — always a new commit.
