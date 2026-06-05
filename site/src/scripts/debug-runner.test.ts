import { describe, it, expect } from "vitest";
import { runDebug } from "./debug-runner";
import type { ExecCheck } from "./practice-grade";

const check: ExecCheck = { kind: "stdout-contains", value: "__PASS__" };
// The hidden assertion: closures must capture 0,1,2. Carries a marker comment we
// assert never leaks into the run result.
const verify = `/*VERIFY_HIDDEN_MARKER*/
const r = arr.map((f) => f());
if (JSON.stringify(r) !== "[0,1,2]") throw new Error("closures did not capture per-iteration values");
console.log("__PASS__");`;

const broken = `const arr = []; for (var i = 0; i < 3; i++) { arr.push(() => i); }`;
const fixed = `const arr = []; for (let i = 0; i < 3; i++) { arr.push(() => i); }`;

describe("runDebug", () => {
  it("a broken sample does not pass", async () => {
    const r = await runDebug({ learnerCode: broken, verify, check });
    expect(r.status).not.toBe("pass"); // var-capture → verify throws
  });

  it("the fixed sample passes", async () => {
    const r = await runDebug({ learnerCode: fixed, verify, check });
    expect(r.status).toBe("pass");
  });

  it("a syntax error reports status error with a non-empty message", async () => {
    const r = await runDebug({ learnerCode: "const x =", verify, check });
    expect(r.status).toBe("error");
    if (r.status === "error") expect(r.message.length).toBeGreaterThan(0);
  });

  it("never leaks the verify source into the result", async () => {
    const r = await runDebug({ learnerCode: broken, verify, check });
    expect(JSON.stringify(r)).not.toContain("VERIFY_HIDDEN_MARKER");
  });

  it("applies setup before learner code", async () => {
    const r = await runDebug({
      setup: "const base = 10;",
      learnerCode: "const arr = [base, base + 1, base + 2].map((n) => () => n - 10);",
      verify,
      check,
    });
    expect(r.status).toBe("pass");
  });
});
