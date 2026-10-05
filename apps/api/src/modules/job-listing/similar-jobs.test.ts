import { inRankedOrder } from "./similar-jobs";
import { describe, expect, it } from "bun:test";

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
