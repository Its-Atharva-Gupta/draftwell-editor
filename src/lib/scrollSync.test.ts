import { describe, expect, it } from "vitest";
import { getSyncedScrollTop } from "./scrollSync";

describe("getSyncedScrollTop", () => {
  it("maps scroll progress between panes with different content heights", () => {
    expect(getSyncedScrollTop(
      { scrollTop: 450, scrollHeight: 1200, clientHeight: 300 },
      { scrollTop: 0, scrollHeight: 2100, clientHeight: 300 }
    )).toBe(900);
  });

  it("clamps stale scroll positions to the target range", () => {
    expect(getSyncedScrollTop(
      { scrollTop: 1000, scrollHeight: 500, clientHeight: 100 },
      { scrollTop: 0, scrollHeight: 900, clientHeight: 100 }
    )).toBe(800);
  });

  it("returns the top when either pane cannot scroll", () => {
    expect(getSyncedScrollTop(
      { scrollTop: 0, scrollHeight: 300, clientHeight: 300 },
      { scrollTop: 100, scrollHeight: 900, clientHeight: 300 }
    )).toBe(0);
  });
});
