import { describe, expect, test } from "vitest";
import { bdp, mathisThroughput, latencyBudget } from "./networking-formulas";

describe("networking formulas", () => {
  test("BDP = bandwidth × RTT (bits→bytes)", () => {
    // 100 Mbps × 100 ms = 100e6 b/s × 0.1 s = 10e6 bits = 1.25e6 bytes
    expect(Math.round(bdp(100, 100))).toBe(1_250_000);
  });

  test("Mathis throughput formula: MSS * (C / (RTT * sqrt(p)))", () => {
    // MSS=1460 bytes, RTT=100ms, loss=1% → bytes/sec ballpark
    const v = mathisThroughput(1460, 100, 0.01);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(10_000_000);
  });

  test("latencyBudget sums and bounds", () => {
    const out = latencyBudget({ dns: 20, tcp: 25, tls: 25, ttfb: 50, render: 200 });
    expect(out.total).toBe(320);
    expect(out.lcpGood).toBe(true);
  });
});
