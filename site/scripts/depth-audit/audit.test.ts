// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { runAudit } from "./audit";

const read = async (n: string) => JSON.parse(await readFile(fileURLToPath(new URL(`./__fixtures__/${n}`, import.meta.url)), "utf8"));

describe("runAudit", () => {
  it("produces a bar that separates the fixture units and flags the thin one", async () => {
    const grades = await read("grades.json");
    const cal = await read("calibration-set.json");
    const { json } = runAudit({ grades, labels: cal.labels });
    expect(json.summary.total).toBe(2);
    const thin = json.units.find((u) => u.unitKey === "t/thin")!;
    const deep = json.units.find((u) => u.unitKey === "t/deep")!;
    expect(thin.passes).toBe(false);
    expect(deep.passes).toBe(true);
  });
});
