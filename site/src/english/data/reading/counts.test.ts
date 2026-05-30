import { describe, it, expect } from "vitest";
import { unitsByBandStream } from "./index";

describe("reading corpus coverage", () => {
  it("A2 general has ~10 texts", () => {
    expect(unitsByBandStream("A2", "general").length).toBeGreaterThanOrEqual(10);
  });
  it("A2 engineering has ~10 texts", () => {
    expect(unitsByBandStream("A2", "engineering").length).toBeGreaterThanOrEqual(10);
  });
  it("B1 general has ~10 texts", () => {
    expect(unitsByBandStream("B1", "general").length).toBeGreaterThanOrEqual(10);
  });
  it("B1 engineering has ~10 texts", () => {
    expect(unitsByBandStream("B1", "engineering").length).toBeGreaterThanOrEqual(10);
  });
});
