import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render } from "preact";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("~/components/pedagogy/AiTutorModes", () => ({
  default: ({ lessonKey, concepts }: { lessonKey: string; concepts: string[] }) => (
    <div data-tutor={`${lessonKey}:${concepts.join(",")}`} />
  ),
}));
vi.mock("./LessonQuestion", () => ({
  default: ({ lessonKey }: { lessonKey: string }) => <div data-question={lessonKey} />,
}));

import LessonSupport from "./LessonSupport";

describe("LessonSupport hydration boundary", () => {
  let host: HTMLDivElement;

  beforeEach(() => {
    host = document.createElement("div");
    document.body.appendChild(host);
  });

  afterEach(() => {
    render(null, host);
    host.remove();
  });

  test("keeps the tutor and reader question in one shared lesson island", () => {
    render(<LessonSupport lang="en" lessonKey="track/unit/lesson" concepts={["scope"]} />, host);

    expect(host.querySelector("[data-tutor]")?.getAttribute("data-tutor")).toBe("track/unit/lesson:scope");
    expect(host.querySelector("[data-question]")?.getAttribute("data-question")).toBe("track/unit/lesson");

    const layout = readFileSync(resolve("src/layouts/Lesson.astro"), "utf8");
    expect(layout.match(/<LessonSupport\s+client:/g)).toHaveLength(1);
    expect(layout).not.toMatch(/<(?:AiTutorModes|LessonQuestion)\s+client:/);
  });
});
