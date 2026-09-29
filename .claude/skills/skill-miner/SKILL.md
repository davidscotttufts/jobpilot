---
name: skill-miner
description: Mine this project's Claude Code transcripts for how skills are actually used - frequency, recency, and the skill chains run by hand - then propose evidence-backed new skills and composite workflow skills, write SKILL_MINING_REPORT.md, and on approval scaffold them. Use for "find skill opportunities", "analyze my skill usage", "what should be a skill", or turning a habitual command sequence into one command.
---

# Skill Miner

Turn real transcript history into proposals: **new skills** to create and **skill chains to
package as one command**. Every proposal cites how many times it actually happened.

## Usage

```
/skill-miner              # this project, write report, propose (no files changed)
/skill-miner --all        # every project under ~/.claude/projects
/skill-miner --scaffold   # also create the approved skills, after asking
/skill-miner <filter>     # projects whose slug matches <filter>
```

Mining is read-only. Nothing under `.claude/` changes without `--scaffold` and an explicit pick.

## Step 1 - Mine (read-only)

This project's transcripts live in `~/.claude/projects/-Users-david-dev-jobpilot/` - one
`<session>.jsonl` per session plus `<session>/subagents/agent-*.jsonl` for every subagent
(pilot `job-worker`s included). Write output to the session scratchpad, not the repo:

```bash
OUT=<scratchpad>/skill-mining-out
SLUG=$(pwd | sed 's#[^A-Za-z0-9]#-#g')    # -Users-david-dev-jobpilot
.claude/skills/skill-miner/mine.sh "$OUT" ~/.claude/projects "$SLUG"   # this project (+ worktrees)
.claude/skills/skill-miner/mine.sh "$OUT" ~/.claude/projects           # --all
```

A filter starting with `-` matches that slug exactly (plus `<slug>--*` worktrees); anything
else is a substring. Outputs in `$OUT/`:

| file | holds |
|---|---|
| `invocations.tsv` | every invocation in order: `project · session · mtime · seq · source · skill` |
| `frequency.txt` / `frequency-by-project.txt` | usage counts |
| `transitions.txt` / `trigrams.txt` | `A -> B` and `A -> B -> C` chains with counts |
| `sessions.txt` | each session's ordered sequence, newest first |
| `SUMMARY.txt` | headline: top skills and chains |

The script handles detection: a user slash command is a line with exactly one
`<command-name>` (lines listing many are compaction summaries); agent calls come from `Skill`
tool-use blocks. A subagent transcript is its own session (`<parent>/<agent>`), so a worker's
calls never fuse with its parent's. Chains split on session-control commands (`clear`,
`compact`, `model`, `plugin`, ...). `x:x` names collapse (`frontend-design`); real namespaces
stay, so `jobpilot:apply` (the plugin's runtime skill) is distinct from repo dev skills.

Read `SUMMARY.txt`, then `transitions.txt`, `trigrams.txt`, and skim `sessions.txt`.

## Step 2 - Score the chains

A chain is worth packaging when it is **frequent** (support) and **predictable** (confidence =
how reliably A is followed by B):

```bash
awk '{c=$1; $1=""; sub(/^ /,""); split($0,p," -> "); src[p[1]]+=c; pair[$0]=c}
     END{for(k in pair){split(k,p," -> "); printf "%4d  %4.0f%%  %s\n", pair[k], 100*pair[k]/src[p[1]], k}}' \
     "$OUT/transitions.txt" | sort -rn | head -30
```

Stitch overlapping high-support trigrams into the longest stable pipeline, and note branch
points. Derive it fresh each run. What the data showed as of 2026-09:

- **Runtime chains (already packaged - not candidates).** Nearly all volume is `jobpilot:*`
  plugin skills inside pilot/auto-apply `job-worker` subagents:
  `jobpilot:apply -> jobpilot:tailor-resume -> jobpilot:cover-letter -> jobpilot:humanizer`,
  with `jobpilot:get-code` and `jobpilot:solve-captcha` branching off for auth walls. That
  sequence is wired by the plugin itself (`plugin/skills/_shared/setup.md`,
  `_shared/form-filling.md`, `_shared/auth.md`; `cover-letter` calls `humanizer`). Treat it as
  a health signal instead: a spike in `solve-captcha`/`get-code` per `apply` means boards are
  walling the worker.
- **Dev chains are thin.** Repo skills (`db-migrate -> add-api-route`, `run`,
  `restart-terminal`, `grade-ux`, `verify`) appear a handful of times. With support that low,
  say so and weight Step 3B (manual work) over chain packaging.

## Step 3 - Find the opportunities

**A. Chains to package as one composite skill.** Candidates run >=3 times at >=~50%
confidence, and are dev-workflow chains (not the plugin's runtime chain above). Name each
verb-first, list the ordered sub-skills, and mark where it halts for approval (e.g. after
`code-review` finds blockers; before a commit). Prefer a few broad pipelines over many tiny ones.

**B. Repeated manual work that deserves a skill.** Look for:
- A skill repeatedly called with long near-identical `args` - the prose is a missing preset.
- Recurring multi-step work done **without** a skill. Grep user prompts in the raw JSONL for
  repeated task language ("rescan", "clear the stale agenda item", "back up the db",
  "rewind the Gmail cursor"). The memory index
  (`~/.claude/projects/-Users-david-dev-jobpilot/memory/MEMORY.md`) is a strong lead: an entry
  describing a manual recovery procedure that recurs is a skill candidate.
- A frequent skill always wrapped in the same manual prep or cleanup - fold it in.

Cross-check every proposal against installed skills (`.claude/skills/`, `plugin/skills/`, and
the session's available-skills list). If a near-match exists, propose extending it. Runtime
behavior belongs in `plugin/skills/` (edit directly, see `.claude/rules/plugin.md`); dev
workflow belongs in `.claude/skills/`.

## Step 4 - Write the report

Write `SKILL_MINING_REPORT.md` in the scratchpad (or where the user asks):

1. **Usage profile** - top skills (count + recency), dev vs runtime split, sessions mined.
2. **Detected chains** - scored bigram/trigram table and the derived pipeline(s).
3. **Proposed workflow skills** (A) - name, ordered sub-skills, gates, evidence
   (`N runs, M% confidence`), one-line value.
4. **Proposed new skills** (B) - what it automates, evidence, why no existing skill covers it.
5. **Recommended next** - the 1-3 to build first (support x effort saved).

If the data is thin, say so and lower confidence.

## Step 5 - Scaffold (`--scaffold` only, after the user picks)

Present A and B and let the user choose. For each approved chain, create
`.claude/skills/<name>/SKILL.md` matching the frontmatter of the existing skills:

```markdown
---
name: <name>
description: Runs <skillA> -> <skillB> -> ... to <outcome> - the packaged form of a sequence run by hand. Use for "<trigger phrases>".
---

# <Title>

Mined from <N> runs of this sequence (skill-miner, <date>).

## Pipeline
1. **<skillA>** - <purpose>; what to pass it.
2. **<skillB>** - <purpose>. **Gate:** if it reports blockers, stop and report.
3. **verify** - run the gate before anything is committed.

Invoke each sub-skill with the Skill tool, carrying the prior step's findings forward. Halt at
every gate for approval. If the user names a starting step, skip earlier ones. Do not
duplicate the sub-skills' logic - call them.
```

For fan-out rather than a gated sequence (e.g. "review across N dimensions, then verify each"),
propose a Workflow script instead and load `workflow-authoring` before writing it.

List the created files. Do not commit unless asked.

## Notes

- Re-running is cheap; outputs overwrite.
- Everything stays local: the script reads only transcripts and writes only `$OUT`.
