---
paths:
  - "apps/terminal/**"
  - "tests/**"
---

# Terminal host (`apps/terminal`, `tests/`)

.NET 10 minimal API (`JobPilot.Terminal`) hosting one provider PTY on the user's machine.
Endpoints: `/ws`, `/sessions/start`, `/sessions/inject`, `/sessions/current`, `/healthz`.
`/sessions/start` takes the per-user `apiToken` (the web fetches the reusable terminal token via
`POST /api/auth/tokens/terminal`) and injects it into the PTY as `JOBPILOT_API_TOKEN`; the host
env var is only a local-dev fallback.

- A C# change only takes effect after `bun run build:terminal` + a host restart - invoke the
  `restart-terminal` skill.
- Always run the test suite for any terminal change: `dotnet test tests/JobPilot.Terminal.Tests`.
  It asserts exact default values (e.g. the origin allowlist), so config/constant changes break it.
- `build:terminal` (AOT) fails at the native-link step unless `vswhere.exe` is on PATH - prepend
  `${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer` first.
- Internals doc: `apps/terminal/README.md` (runtime flows, shared-state locks, invariants).
