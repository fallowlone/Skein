import { describe, it, expect } from "vitest";
import { starterMustFail } from "./verify-scenario.mjs";

describe("starterMustFail", () => {
  it("returns ok=false when the starter ALREADY passes its own check (no real bug)", async () => {
    const task = { id: "no-bug", starter: "function f(){ return 2; }", verify: "console.log(f() === 2 ? 'PASS' : 'FAIL');", check: { kind: "stdout-contains", value: "PASS" } };
    const r = await starterMustFail(task);
    expect(r.ok).toBe(false);
  });
  it("returns ok=true when the starter fails its check (a real bug exists)", async () => {
    const task = { id: "real-bug", starter: "function f(){ return 1; }", verify: "console.log(f() === 2 ? 'PASS' : 'FAIL');", check: { kind: "stdout-contains", value: "PASS" } };
    const r = await starterMustFail(task);
    expect(r.ok).toBe(true);
  });
});
