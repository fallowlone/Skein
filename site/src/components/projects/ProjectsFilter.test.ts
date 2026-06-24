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
  test("filters by track", () => {
    const mixed = [p("a", "frontend"), { ...p("b", "backend"), tracks: ["backend"] }];
    expect(filterProjects(mixed, "backend", "all", "all").map((x) => x.slug)).toEqual(["b"]);
  });
  test("combines track and category", () => {
    const mixed = [p("a", "frontend"), { ...p("b", "backend"), tracks: ["backend"] }];
    expect(filterProjects(mixed, "frontend", "all", "backend")).toHaveLength(0);
  });
  test("runnable 'all' is a no-op (back-compat, keeps non-workbench projects)", () => {
    expect(filterProjects(all, "all", "all", "all", "all")).toHaveLength(3);
    expect(filterProjects(all, "all", "all", "all")).toHaveLength(3);
  });
  test("runnable 'runnable' keeps only workbench:true projects", () => {
    const mixed = [{ ...p("a", "frontend"), workbench: true }, p("b", "backend"), { ...p("c", "infra"), workbench: true }];
    expect(filterProjects(mixed, "all", "all", "all", "runnable").map((x) => x.slug)).toEqual(["a", "c"]);
  });
  test("runnable combines with category", () => {
    const mixed = [{ ...p("a", "frontend"), workbench: true }, { ...p("b", "backend"), workbench: true }];
    expect(filterProjects(mixed, "all", "all", "backend", "runnable").map((x) => x.slug)).toEqual(["b"]);
  });
});
