import { inRankedOrder, titleWords } from "./similar-jobs";
import { describe, expect, it } from "bun:test";

describe("titleWords", () => {
  it("lowercases, splits on punctuation, and drops filler and duplicates", () => {
    expect(titleWords("AI Engineer, Entry Level")).toEqual(["ai", "engineer", "entry", "level"]);
    expect(titleWords("Senior React Native Engineer (Contract, Remote)")).toEqual([
      "senior",
      "react",
      "native",
      "engineer",
    ]);
    expect(titleWords("Engineer / engineer")).toEqual(["engineer"]);
  });

  it("keeps the symbols that are part of a skill name", () => {
    expect(titleWords("C++ and C# Developer")).toEqual(["c++", "c#", "developer"]);
  });
});

describe("inRankedOrder", () => {
  it("returns rows in the ranked id order, whatever order they arrived in", () => {
    const rows = [{ id: "c" }, { id: "a" }, { id: "b" }];

    expect(inRankedOrder(rows, ["a", "b", "c"]).map((row) => row.id)).toEqual(["a", "b", "c"]);
  });

  it("drops a ranked id whose row is gone", () => {
    const rows = [{ id: "b" }];

    expect(inRankedOrder(rows, ["a", "b"]).map((row) => row.id)).toEqual(["b"]);
  });
});
