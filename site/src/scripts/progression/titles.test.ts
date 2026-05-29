import { describe, it, expect } from "vitest";
import { TITLES, titlesFromState } from "./titles";

describe("titles", () => {
  it("defines titles with bilingual labels", () => {
    expect(TITLES.length).toBeGreaterThanOrEqual(4);
    for (const tt of TITLES) { expect(tt.label.en && tt.label.ru).toBeTruthy(); }
  });
  it("earns a title from ≥3 visited lessons under a pillar, none from empty", () => {
    expect(titlesFromState({ history: {} } as any)).toEqual([]);
    const s = { history: { "databases/04-databases/07-postgres-mvcc": {}, "databases/04-databases/03-indexes": {}, "databases/04-databases/01-acid": {} } } as any;
    expect(titlesFromState(s)).toContain("index-surgeon");
  });
});
