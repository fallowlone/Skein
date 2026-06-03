import { describe, expect, test } from "vitest";
import { filterProjects } from "./ProjectsFilter";

const p = (slug: string, category: string, difficulty = "intermediate") =>
  ({ slug, category, difficulty, tracks: ["frontend"] }) as any;
const all = [p("a", "frontend"), p("b", "backend"), p("c", "infra")];

describe("filterProjects", () => {
  test("returns all when every axis is 'all'", () => {
    expect(filterProjects(all, "all", "all", "all")).toHaveLength(3);
  });
  test("filters by category", () => {
    expect(filterProjects(all, "all", "all", "frontend").map((x) => x.slug)).toEqual(["a"]);
  });
  test("combines category and difficulty", () => {
    expect(filterProjects(all, "all", "intermediate", "backend").map((x) => x.slug)).toEqual(["b"]);
  });
});
