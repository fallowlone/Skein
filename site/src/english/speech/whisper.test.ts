import { describe, it, expect } from "vitest";
import { progressReducer, type DownloadState } from "./whisper";

describe("progressReducer", () => {
  const init: DownloadState = { status: "idle", pct: 0 };

  it("moves to downloading and tracks max pct across files", () => {
    let s = progressReducer(init, { status: "progress", file: "a", progress: 20 });
    expect(s.status).toBe("downloading");
    s = progressReducer(s, { status: "progress", file: "a", progress: 55 });
    expect(s.pct).toBe(55);
  });

  it("done event marks ready at 100", () => {
    const s = progressReducer({ status: "downloading", pct: 90 }, { status: "done", file: "a" });
    expect(s).toEqual({ status: "ready", pct: 100 });
  });
});
