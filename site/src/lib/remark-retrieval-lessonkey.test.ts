import { describe, it, expect } from "vitest";
import remarkRetrievalLessonKey from "./remark-retrieval-lessonkey.mjs";

function run(node: any, frontmatter: any) {
  const tree = { type: "root", children: [node] };
  const file = { data: { astro: { frontmatter } } };
  remarkRetrievalLessonKey()(tree, file);
  return node;
}

const drawer = () => ({
  type: "mdxJsxFlowElement",
  name: "RetrievalDrawer",
  attributes: [{ type: "mdxJsxAttribute", name: "id", value: "07-stability-retrieval" }],
  children: [],
});

const fm = { track: "databases", unit: "03-execution-plans", slug: "07-plan-stability" };
const attr = (node: any, name: string) =>
  node.attributes.find((a: any) => a.type === "mdxJsxAttribute" && a.name === name);

describe("remark-retrieval-lessonkey", () => {
  it("injects lessonKey=<track>/<unit>/<slug> from frontmatter", () => {
    const node = run(drawer(), fm);
    expect(attr(node, "lessonKey")?.value).toBe("databases/03-execution-plans/07-plan-stability");
  });

  it("leaves the existing id attribute intact", () => {
    const node = run(drawer(), fm);
    expect(attr(node, "id")?.value).toBe("07-stability-retrieval");
  });

  it("skips when frontmatter is missing a segment", () => {
    const node = run(drawer(), { track: "databases", slug: "07-plan-stability" }); // no unit
    expect(attr(node, "lessonKey")).toBeUndefined();
  });

  it("is idempotent when lessonKey is already present", () => {
    const node = drawer();
    node.attributes.push({ type: "mdxJsxAttribute", name: "lessonKey", value: "preset/k/e" });
    run(node, fm);
    const all = node.attributes.filter((a: any) => a.name === "lessonKey");
    expect(all).toHaveLength(1);
    expect(all[0].value).toBe("preset/k/e");
  });

  it("ignores non-RetrievalDrawer JSX nodes", () => {
    const node = { type: "mdxJsxFlowElement", name: "FadedExample", attributes: [], children: [] };
    run(node, fm);
    expect(attr(node, "lessonKey")).toBeUndefined();
  });
});
