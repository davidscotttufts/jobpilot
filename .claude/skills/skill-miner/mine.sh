#!/usr/bin/env bash
# skill-miner: mine Claude Code transcripts for skill-usage and skill-chaining patterns.
#
# Usage:
#   mine.sh [OUT_DIR] [SCAN_ROOT] [PROJECT_FILTER]
#     OUT_DIR         where to write results   (default: ./skill-mining-out)
#     SCAN_ROOT       transcripts root         (default: ~/.claude/projects)
#     PROJECT_FILTER  project dir to scan      (default: empty = all projects)
#                     A slug starting with "-" (e.g. -Users-david-dev-jobpilot) matches that
#                     project and its worktrees (<slug>--*) exactly - a plain substring would let
#                     -Users-david-dev-openwop also pull in -openwop-app. Anything else is a substring.
#
# Pure bash + perl + awk, read-only on the transcripts.
#
# Layout: <root>/<project-slug>/<session>.jsonl, plus subagent transcripts at
# <root>/<project-slug>/<session>/subagents/agent-*.jsonl. The project is always the first
# directory under the root; a subagent file is its own chain (session "<parent>/<agent>") so a
# worker's skill calls never fuse with the parent's.
#
# Per line (append order == chronological):
#   * user slash command   -> <command-name>/foo</command-name>  (EXACTLY ONE per line;
#                             lines enumerating many are compaction summaries -> skipped)
#   * agent Skill tool_use -> "name":"Skill","input":{"skill":"foo"
set -euo pipefail

OUT="${1:-./skill-mining-out}"
ROOT="${2:-$HOME/.claude/projects}"
ROOT="${ROOT%/}"
FILTER="${3:-}"
mkdir -p "$OUT"

# Collapse "x:x" (frontend-design:frontend-design) but keep real namespaces: jobpilot:apply is the
# plugin's runtime skill, distinct from any repo dev skill of the same name.
canon() {
  sed -E 's/^([^:]+):\1$/\1/'
}

# Session-control commands split chains; they still count in frequency.
RESET_RE='^(clear|compact|loop|model|plugin|reload-plugins|resume)$'

matches_filter() {
  local proj="$1"
  [ -z "$FILTER" ] && return 0
  case "$FILTER" in
    -*) [ "$proj" = "$FILTER" ] || case "$proj" in "$FILTER"--*) return 0;; *) return 1;; esac ;;
    *) case "$proj" in *"$FILTER"*) return 0;; *) return 1;; esac ;;
  esac
}

# 1) ordered invocations: project \t session \t mtime \t seq \t source \t skill
: > "$OUT/invocations.tsv"
find "$ROOT" -name '*.jsonl' -print0 | while IFS= read -r -d '' f; do
  rel="${f#"$ROOT"/}"
  proj="${rel%%/*}"
  matches_filter "$proj" || continue
  rest="${rel#*/}"
  case "$rest" in
    */subagents/*) sess="${rest%%/*}/$(basename "$f" .jsonl)" ;;
    *) sess=$(basename "$f" .jsonl) ;;
  esac
  mt=$(stat -f %m "$f" 2>/dev/null || stat -c %Y "$f" 2>/dev/null || echo 0)
  perl -ne '
    my @c = /<command-name>\/?([^<\s]+)[^<]*<\/command-name>/g;
    if (@c == 1) { my $s=$c[0]; $s=~s/^\///; print "user\t$s\n"; }
    while (/"name":"Skill","input":\{"skill":"([^"]+)"/g) { print "agent\t$1\n"; }
  ' "$f" \
  | while IFS=$'\t' read -r src sk; do
      printf '%s\t%s\n' "$src" "$(printf '%s' "$sk" | canon)"
    done \
  | awk -v p="$proj" -v s="$sess" -v m="$mt" '{i++; print p"\t"s"\t"m"\t"i"\t"$0}' \
  >> "$OUT/invocations.tsv"
done

# 2) global frequency
cut -f6 "$OUT/invocations.tsv" | sort | uniq -c | sort -rn > "$OUT/frequency.txt"

# 3) frequency by project
awk -F'\t' '{c[$1"\t"$6]++} END{for(k in c)print c[k]"\t"k}' "$OUT/invocations.tsv" \
  | sort -t$'\t' -k2,2 -k1,1rn > "$OUT/frequency-by-project.txt"

# 4) bigram chains (consecutive within a session, split on reset commands, no self-loops)
awk -F'\t' -v re="$RESET_RE" '
  { sess=$2; sk=$6;
    if (sk ~ re) { prev[sess]=""; next }
    if (prev[sess]!="" && prev[sess]!=sk) print prev[sess]" -> "sk;
    prev[sess]=sk }
' "$OUT/invocations.tsv" | sort | uniq -c | sort -rn > "$OUT/transitions.txt"

# 5) trigram chains
awk -F'\t' -v re="$RESET_RE" '
  { sess=$2; sk=$6;
    if (sk ~ re) { p1[sess]=""; p2[sess]=""; next }
    if (p1[sess]!="" && p2[sess]!="" && p2[sess]!=sk && p1[sess]!=p2[sess])
      print p1[sess]" -> "p2[sess]" -> "sk;
    p1[sess]=p2[sess]; p2[sess]=sk }
' "$OUT/invocations.tsv" | sort | uniq -c | sort -rn > "$OUT/trigrams.txt"

# 6) per-session collapsed sequences, most recent first
awk -F'\t' '
  { if (!($2 in seen)){seen[$2]=1; mt[$2]=$3; proj[$2]=$1; ord[++n]=$2}
    if (seq[$2]=="") seq[$2]=$6; else seq[$2]=seq[$2]" > "$6 }
  END{ for(i=1;i<=n;i++){s=ord[i]; print mt[s]"\t"proj[s]"\t"s"\t"seq[s]} }
' "$OUT/invocations.tsv" | sort -t$'\t' -k1,1rn | cut -f2- > "$OUT/sessions.txt"

# 7) headline summary
{
  echo "# skill-miner raw results"
  echo
  echo "scan-root  : $ROOT"
  echo "filter     : ${FILTER:-<all projects>}"
  echo "sessions   : $(cut -f2 "$OUT/invocations.tsv" | sort -u | wc -l | tr -d ' ') (with >=1 invocation; subagents counted separately)"
  echo "invocations: $(wc -l < "$OUT/invocations.tsv" | tr -d ' ')"
  echo
  echo "## top skills"
  head -20 "$OUT/frequency.txt"
  echo
  echo "## top chains (bigram)"
  head -20 "$OUT/transitions.txt"
  echo
  echo "## top chains (trigram)"
  head -15 "$OUT/trigrams.txt"
} > "$OUT/SUMMARY.txt"

echo "wrote: $OUT/{invocations.tsv,frequency.txt,frequency-by-project.txt,transitions.txt,trigrams.txt,sessions.txt,SUMMARY.txt}"
cat "$OUT/SUMMARY.txt"
