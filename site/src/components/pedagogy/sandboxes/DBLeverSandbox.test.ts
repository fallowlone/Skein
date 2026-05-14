import { describe, expect, test } from "vitest";
import { rankLevers, type SandboxInput } from "./DBLeverSandbox";

describe("DBLeverSandbox rankLevers", () => {
  test("1B rows + multi-tenant + hot-shard → 07 sharding first", () => {
    const input: SandboxInput = {
      rows: 1_000_000_000,
      workload: "mixed",
      tenancy: "multi",
      symptom: "hot-shard",
    };
    const ranked = rankLevers(input);
    expect(ranked[0].piece).toBe("07-sharding");
  });

  test("100M rows + read-heavy + slow → 02 indexes first, 03 plan second", () => {
    const ranked = rankLevers({
      rows: 100_000_000,
      workload: "read-heavy",
      tenancy: "single",
      symptom: "slow-query",
    });
    expect(ranked[0].piece).toBe("02-indexes");
    expect(ranked[1].piece).toBe("03-execution-plans");
  });

  test("1M rows + single-tenant + hot-shard → 07 sharding first (fallback)", () => {
    const ranked = rankLevers({
      rows: 1_000_000,
      workload: "mixed",
      tenancy: "single",
      symptom: "hot-shard",
    });
    expect(ranked[0].piece).toBe("07-sharding");
  });

  test("1M rows + connection-storm → 05 pooling first", () => {
    const ranked = rankLevers({
      rows: 1_000_000,
      workload: "mixed",
      tenancy: "single",
      symptom: "connection-storm",
    });
    expect(ranked[0].piece).toBe("05-pooling");
  });

  test("any scale + bloat → 04 MVCC first", () => {
    const ranked = rankLevers({
      rows: 10_000,
      workload: "write-heavy",
      tenancy: "single",
      symptom: "bloat",
    });
    expect(ranked[0].piece).toBe("04-mvcc-isolation");
  });

  test("any scale + lock-wait on ALTER → 06 migrations first", () => {
    const ranked = rankLevers({
      rows: 5_000_000,
      workload: "mixed",
      tenancy: "single",
      symptom: "lock-wait",
    });
    expect(ranked[0].piece).toBe("06-migrations");
  });

  test("10K rows + slow-query → 01 relational model first (small-scale schema lock-in)", () => {
    const ranked = rankLevers({
      rows: 10_000,
      workload: "mixed",
      tenancy: "single",
      symptom: "slow-query",
    });
    expect(ranked[0].piece).toBe("01-relational-model");
  });

  test("returns exactly 3 ranked levers", () => {
    const ranked = rankLevers({
      rows: 1_000_000,
      workload: "mixed",
      tenancy: "single",
      symptom: "slow-query",
    });
    expect(ranked).toHaveLength(3);
  });
});
