// scripts/depth-audit/classify.test.ts
import { describe, it, expect } from "vitest";
import { classifyLesson, isFoundation, trackOf, FOUNDATIONS } from "./classify";

describe("classifyLesson", () => {
  it("marks project / drill / quiz-* / start-here overviews as auxiliary", () => {
    expect(classifyLesson("databases/02-indexes/project")).toBe("auxiliary");
    expect(classifyLesson("algorithms/03-sorting-search/drill")).toBe("auxiliary");
    expect(classifyLesson("networking/03-tcp-handshake/quiz-choice")).toBe("auxiliary");
    expect(classifyLesson("networking/03-tcp-handshake/quiz-code")).toBe("auxiliary");
    expect(classifyLesson("security/00-start-here/01-overview")).toBe("auxiliary");
  });
  it("marks normal lessons as teaching", () => {
    expect(classifyLesson("networking/03-tcp-handshake/06-bbr-and-production-ops")).toBe("teaching");
    expect(classifyLesson("databases/02-indexes/01-index-anatomy")).toBe("teaching");
  });
});

describe("foundations", () => {
  it("trackOf extracts the track", () => {
    expect(trackOf("base-cs/12-time-and-concurrency")).toBe("base-cs");
  });
  it("isFoundation is true only for math/base-cs/algorithms", () => {
    expect(isFoundation("math/01-numbers")).toBe(true);
    expect(isFoundation("base-cs/12-x")).toBe(true);
    expect(isFoundation("algorithms/03-x")).toBe(true);
    expect(isFoundation("networking/03-x")).toBe(false);
    expect(FOUNDATIONS.has("math")).toBe(true);
  });
});
