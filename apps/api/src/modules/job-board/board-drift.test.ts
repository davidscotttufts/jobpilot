// Reconstructed from the real incident: hiring.cafe started answering as hiringcafe.com with
// identical paths, exact-URL dedupe saw two different URLs, and GitLab and Alpaca were applied to
// twice. Board health could not see it - those applies succeeded.
import {
  DRIFT_MIN_HISTORY,
  DRIFT_MIN_NEW_HOST_JOBS,
  detectBoardDrift,
  hostOf,
} from "./board-drift";
import { describe, expect, it } from "bun:test";

const DAY = 24 * 60 * 60 * 1000;
const START = new Date("2026-08-08T00:00:00Z").getTime();
const NOW = new Date(START);

/** Newest first, as the gather reads them. */
function rows(
  hosts: string[],
  board = "hiring.cafe",
): Array<{ board: string; url: string; createdAt: Date }> {
  return hosts.map((host, i) => ({
    board,
    url: `https://${host}/job/director-of-engineering-${i}`,
    createdAt: new Date(START - i * DAY),
  }));
}

function repeat(host: string, n: number): string[] {
  return Array.from({ length: n }, () => host);
}

describe("detectBoardDrift", () => {
  it("catches the host change that produced the duplicate applications", () => {
    // Newest 8 on the new domain, the rest of the history on the old one. Hosts that are *not*
    // hiring.cafe/hiringcafe.com, because that pair is already in the alias map and folds to one.
    const drift = detectBoardDrift(
      rows([...repeat("newcafe.example", 8), ...repeat("oldcafe.example", 30)]),
      NOW,
    );

    expect(drift).toHaveLength(1);
    expect(drift[0]).toMatchObject({
      board: "hiring.cafe",
      establishedHost: "oldcafe.example",
      newHost: "newcafe.example",
      newHostJobs: 8,
    });
  });

  it("stays quiet for a board that has always used one host", () => {
    expect(detectBoardDrift(rows(repeat("oldcafe.example", 40)), NOW)).toEqual([]);
  });

  it("stays quiet for a board that has legitimately used two hosts all along", () => {
    // Interleaved throughout, so neither host is confined to recent rows.
    const interleaved = Array.from({ length: 40 }, (_, i) =>
      i % 2 === 0 ? "boards.greenhouse.io" : "job-boards.greenhouse.io",
    );

    expect(detectBoardDrift(rows(interleaved, "greenhouse"), NOW)).toEqual([]);
  });

  it("waits for enough history before calling a second host drift", () => {
    const thin = rows([
      ...repeat("newcafe.example", 2),
      ...repeat("oldcafe.example", DRIFT_MIN_HISTORY - 5),
    ]);

    expect(detectBoardDrift(thin, NOW)).toEqual([]);
  });

  it("ignores rows with no board or an unparseable url", () => {
    const mixed = [
      ...rows(repeat("oldcafe.example", 30)),
      { board: null, url: "https://newcafe.example/job/x", createdAt: new Date(START) },
      { board: "hiring.cafe", url: "not a url", createdAt: new Date(START) },
    ];

    expect(detectBoardDrift(mixed, NOW)).toEqual([]);
  });

  it("reports each board separately", () => {
    const both = [
      ...rows([...repeat("newcafe.example", 6), ...repeat("oldcafe.example", 30)]),
      ...rows([...repeat("uk.indeed.com", 6), ...repeat("indeed.com", 30)], "indeed.com"),
    ];

    const drift = detectBoardDrift(both, NOW);

    expect(drift.map((d) => d.board).sort()).toEqual(["hiring.cafe", "indeed.com"]);
  });
});

describe("hostOf", () => {
  it("lowercases the host and drops the path", () => {
    expect(hostOf("https://HiringCafe.com/job/abc")).toBe("hiringcafe.com");
  });

  it("returns null rather than throwing on junk", () => {
    expect(hostOf("not a url")).toBeNull();
  });
});

// The edges the first version got wrong. Each of these previously reported drift.
describe("detectBoardDrift - what must not fire", () => {
  it("ignores a host that was abandoned months ago", () => {
    // lastSeen was tracked but never read, so a dead domain read exactly like a live migration.
    const dead = [
      ...rows(repeat("oldcafe.example", 30)),
      ...Array.from({ length: 5 }, (_, i) => ({
        board: "hiring.cafe",
        url: `https://gone.example/job/${i}`,
        createdAt: new Date(START - (120 + i) * DAY),
      })),
    ];

    expect(detectBoardDrift(dead, NOW)).toEqual([]);
  });

  it("ignores a stray URL that never became the board's second home", () => {
    const stray = [
      ...rows(repeat("oldcafe.example", 30)),
      { board: "hiring.cafe", url: "https://cdn.example/job/1", createdAt: new Date(START - DAY) },
    ];

    expect(detectBoardDrift(stray, NOW)).toEqual([]);
  });

  it("ignores a second host that arrived within a day of the first", () => {
    // A board whose whole in-window history is one scrape must not turn a sibling host into drift.
    const sameDay = Array.from({ length: 30 }, (_, i) => ({
      board: "hiring.cafe",
      url: `https://${i < 5 ? "b.example" : "a.example"}/job/${i}`,
      createdAt: new Date(START - i * 1000),
    }));

    expect(detectBoardDrift(sameDay, NOW)).toEqual([]);
  });

  it("does not re-report a pair the alias map already folds", () => {
    // hiring.cafe -> hiringcafe.com is already canonical, so dedupe treats them as one posting
    // and there is nothing to ask about.
    const aliased = [...rows(repeat("hiring.cafe", 10)), ...rows(repeat("hiringcafe.com", 25))];

    expect(detectBoardDrift(aliased, NOW)).toEqual([]);
  });

  it("requires the new host to clear the minimum job count", () => {
    const justUnder = [
      ...rows(repeat("oldcafe.example", 30)),
      ...Array.from({ length: DRIFT_MIN_NEW_HOST_JOBS - 1 }, (_, i) => ({
        board: "hiring.cafe",
        url: `https://newcafe.example/job/late-${i}`,
        createdAt: new Date(START - i * DAY),
      })),
    ];

    expect(detectBoardDrift(justUnder, NOW)).toEqual([]);
  });
});
