import { describe, it, expect } from "vitest";
import { incrementalConfig, selectLessons, selectOther } from "./build-incremental";

const FULL = { INCREMENTAL_PLAN: undefined } as unknown as NodeJS.ProcessEnv;
const INCR = { INCREMENTAL_PLAN: JSON.stringify({ mode: "incremental", changedPages: ["en/n/01/a"] }) } as NodeJS.ProcessEnv;

describe("incrementalConfig", () => {
  it("defaults to full when the env var is absent", () => {
    expect(incrementalConfig(FULL).mode).toBe("full");
  });
  it("defaults to full when the env var is malformed", () => {
    expect(incrementalConfig({ INCREMENTAL_PLAN: "{not json" } as NodeJS.ProcessEnv).mode).toBe("full");
  });
  it("reads incremental mode + the changed set", () => {
    const cfg = incrementalConfig(INCR);
    expect(cfg.mode).toBe("incremental");
    expect(cfg.changed.has("en/n/01/a")).toBe(true);
  });
});

describe("selectLessons", () => {
  const paths = [{ k: "en/n/01/a" }, { k: "en/n/01/b" }];
  const keyOf = (p: { k: string }) => p.k;
  it("keeps everything in full mode", () => {
    expect(selectLessons(paths, keyOf, incrementalConfig(FULL))).toHaveLength(2);
  });
  it("keeps only changed pages in incremental mode", () => {
    const got = selectLessons(paths, keyOf, incrementalConfig(INCR));
    expect(got).toEqual([{ k: "en/n/01/a" }]);
  });
});

describe("selectOther", () => {
  const paths = [1, 2, 3];
  it("keeps everything in full mode", () => {
    expect(selectOther(paths, incrementalConfig(FULL))).toEqual([1, 2, 3]);
  });
  it("drops everything in incremental mode", () => {
    expect(selectOther(paths, incrementalConfig(INCR))).toEqual([]);
  });
});
