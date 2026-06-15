import { describe, it, expect } from "vitest";
import { verbForm, nounPlural, adjForm } from "./morphology";

describe("verbForm", () => {
  it("regular + irregular present 3sg", () => {
    expect(verbForm("work", "s3")).toBe("works");
    expect(verbForm("go", "s3")).toBe("goes");
    expect(verbForm("study", "s3")).toBe("studies");
    expect(verbForm("have", "s3")).toBe("has");
  });
  it("past + past participle", () => {
    expect(verbForm("work", "past")).toBe("worked");
    expect(verbForm("go", "past")).toBe("went");
    expect(verbForm("write", "pastParticiple")).toBe("written");
  });
  it("gerund", () => {
    expect(verbForm("run", "gerund")).toBe("running");
    expect(verbForm("make", "gerund")).toBe("making");
  });
});

describe("nounPlural", () => {
  it("regular + irregular", () => {
    expect(nounPlural("cat")).toBe("cats");
    expect(nounPlural("box")).toBe("boxes");
    expect(nounPlural("city")).toBe("cities");
    expect(nounPlural("child")).toBe("children");
  });
});

describe("adjForm", () => {
  it("comparative + superlative", () => {
    expect(adjForm("big", "comparative")).toBe("bigger");
    expect(adjForm("happy", "comparative")).toBe("happier");
    expect(adjForm("expensive", "comparative")).toBe("more expensive");
    expect(adjForm("big", "superlative")).toBe("biggest");
    expect(adjForm("expensive", "superlative")).toBe("most expensive");
  });
});
