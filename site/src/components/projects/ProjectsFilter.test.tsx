import { render } from "preact";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import ProjectsFilter, { filterProjects, type ProjectCard } from "./ProjectsFilter";

// The island takes a locale-resolved projection, not the raw content entry —
// see ProjectCard in ProjectsFilter.tsx for why.
const p = (slug: string, tracks: string[], difficulty: string): ProjectCard => ({
  slug, tracks, difficulty, estDays: 3,
  title: slug, pitch: "p", category: "backend",
});

const all = [p("a", ["databases"], "starter"), p("b", ["backend"], "advanced"), p("c", ["databases", "backend"], "intermediate")];

describe("filterProjects", () => {
  test("returns all when no filter", () => { expect(filterProjects(all, "all", "all").length).toBe(3); });
  test("filters by track", () => { expect(filterProjects(all, "databases", "all").map((x) => x.slug)).toEqual(["a", "c"]); });
  test("filters by difficulty", () => { expect(filterProjects(all, "all", "advanced").map((x) => x.slug)).toEqual(["b"]); });
  test("filters by both", () => { expect(filterProjects(all, "backend", "intermediate").map((x) => x.slug)).toEqual(["c"]); });
});

describe("ProjectsFilter render", () => {
  let host: HTMLDivElement;

  beforeEach(() => {
    host = document.createElement("div");
    document.body.appendChild(host);
  });

  afterEach(() => {
    render(null, host);
    host.remove();
  });

  test("renders every project title", () => {
    render(<ProjectsFilter lang="en" projects={all} />, host);
    expect(host.textContent).toContain("a");
    expect(host.textContent).toContain("b");
  });

  test("keeps project selection and sends the legacy upgrade CTA to Coach", async () => {
    render(<ProjectsFilter lang="en" projects={all} />, host);
    const add = Array.from(host.querySelectorAll("button")).find((button) => button.textContent?.includes("+ Add"));
    expect(add).toBeTruthy();
    (add as HTMLButtonElement).click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(host.textContent).toContain("Build list (1)");
    const cta = host.querySelector(".project-cart-export") as HTMLAnchorElement;
    expect(cta.href).toBe("http://localhost:3000/en/settings#coach-plan");
    expect(cta.textContent).toContain("Unlock Coach");
    expect(cta.textContent).not.toContain("rubric");
    expect(cta.textContent).not.toContain("PDF");
  });
});
