// Reconstructed from the real incident: hiring.cafe started answering as hiringcafe.com with
// identical paths, exact-URL dedupe saw two different URLs, and GitLab and Alpaca were applied to
// twice. Board health could not see it - those applies succeeded.
import { DRIFT_MIN_HISTORY, detectBoardDrift, hostOf } from "./board-drift";
import { describe, expect, it } from "bun:test";

const DAY = 24 * 60 * 60 * 1000;
const START = new Date("2026-08-08T00:00:00Z").getTime();

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
    // Newest 8 on the new domain, the rest of the history on the old one.
    const drift = detectBoardDrift(
      rows([...repeat("hiringcafe.com", 8), ...repeat("hiring.cafe", 30)]),
    );

    expect(drift).toHaveLength(1);
    expect(drift[0]).toMatchObject({
      board: "hiring.cafe",
      establishedHost: "hiring.cafe",
      newHost: "hiringcafe.com",
      newHostJobs: 8,
    });
  });

  it("stays quiet for a board that has always used one host", () => {
    expect(detectBoardDrift(rows(repeat("hiring.cafe", 40)))).toEqual([]);
  });

  it("stays quiet for a board that has legitimately used two hosts all along", () => {
    // Interleaved throughout, so neither host is confined to recent rows.
    const interleaved = Array.from({ length: 40 }, (_, i) =>
      i % 2 === 0 ? "boards.greenhouse.io" : "job-boards.greenhouse.io",
    );

    expect(detectBoardDrift(rows(interleaved, "greenhouse"))).toEqual([]);
  });

  it("waits for enough history before calling a second host drift", () => {
    const thin = rows([
      ...repeat("hiringcafe.com", 2),
      ...repeat("hiring.cafe", DRIFT_MIN_HISTORY - 5),
    ]);

    expect(detectBoardDrift(thin)).toEqual([]);
  });

  it("ignores rows with no board or an unparseable url", () => {
    const mixed = [
      ...rows(repeat("hiring.cafe", 30)),
      { board: null, url: "https://hiringcafe.com/job/x", createdAt: new Date(START) },
      { board: "hiring.cafe", url: "not a url", createdAt: new Date(START) },
    ];

    expect(detectBoardDrift(mixed)).toEqual([]);
  });

  it("reports each board separately", () => {
    const both = [
      ...rows([...repeat("hiringcafe.com", 6), ...repeat("hiring.cafe", 30)]),
      ...rows([...repeat("uk.indeed.com", 6), ...repeat("indeed.com", 30)], "indeed.com"),
    ];

    const drift = detectBoardDrift(both);

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
