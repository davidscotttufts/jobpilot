/** A catalog row, as the name lookup needs it. */
export interface CatalogBoard {
  domain: string;
  name: string;
}

/** Maps a stored `sources.board` value to the name the public pages show. */
export type BoardNameLookup = (board: string) => string;

/** Agents record a board as `https://www.naukri.com/`, `naukri.com` or `linkedin`: reduce to the host. */
function boardHost(board: string): string {
  const host = board
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .replace(/^www\./, "");
  return host.split("/")[0];
}

/** The host, then each parent domain (`in.indeed.com` -> `indeed.com`), then a bare name + `.com`. */
function hostCandidates(host: string): string[] {
  const labels = host.split(".");
  if (labels.length === 1) {
    return [host, `${host}.com`];
  }
  const candidates: string[] = [];
  for (let start = 0; start <= labels.length - 2; start++) {
    candidates.push(labels.slice(start).join("."));
  }
  return candidates;
}

/**
 * Names come from listed catalog rows only: those are curated, while an unlisted row's name is
 * whatever one user typed. A board with no listed row shows its bare host.
 */
export function boardNameLookup(catalog: CatalogBoard[]): BoardNameLookup {
  const names = new Map<string, string>();
  for (const row of catalog) {
    names.set(boardHost(row.domain), row.name.trim());
  }

  return (board) => {
    const host = boardHost(board);
    for (const candidate of hostCandidates(host)) {
      const name = names.get(candidate);
      if (name) {
        return name;
      }
    }
    return host;
  };
}

interface BoardSource {
  board: string | null;
}

/**
 * One entry per board, in source order (the callers pass most recent first). Counted by name, not
 * by source row: one posting reposted six times on LinkedIn is one board, not six.
 */
export function distinctBoardNames(sources: BoardSource[], name: BoardNameLookup): string[] {
  const seen = new Map<string, string>();
  for (const source of sources) {
    if (!source.board?.trim()) {
      continue;
    }
    const label = name(source.board);
    const key = label.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, label);
    }
  }
  return [...seen.values()];
}
