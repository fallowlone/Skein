import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { compileLessonRenderTree, evaluateStaticExpression } from "./lesson-render-tree";

const lesson = `---
lang: en
track: apis
unit: 02-status-codes-real
slug: quiz-short
title: Test
---
import Hook from "~/components/lesson/Hook.astro";
import RetrievalDrawer from "~/components/pedagogy/RetrievalDrawer.tsx";

<Hook>Remember **the rule**.</Hook>

<RetrievalDrawer
  client:visible
  id="recall"
  questions={[{ q: "Why?", a: "Because." }]}
/>
`;

describe("lesson render tree", () => {
  it("turns MDX into data-only nodes while preserving component refs and hydration props", async () => {
    const artifact = await compileLessonRenderTree(lesson, "/tmp/lesson.mdx");
    expect(artifact.format).toBe("lesson-render-tree-v1");
    expect(artifact.components).toMatchObject({
      Hook: { source: "~/components/lesson/Hook.astro", export: "default" },
      RetrievalDrawer: { source: "~/components/pedagogy/RetrievalDrawer.tsx", export: "default" },
    });
    const drawer = artifact.root.find((node) => node.type === "element" && node.name === "RetrievalDrawer") as any;
    expect(drawer.props).toMatchObject({
      "client:visible": true,
      id: "recall",
      lessonKey: "apis/02-status-codes-real/quiz-short",
      questions: [{ q: "Why?", a: "Because." }],
    });
    expect(JSON.stringify(artifact)).not.toContain("function");
  });

  it("evaluates nested JSON-like prop expressions without eval", () => {
    const expression = {
      type: "ObjectExpression",
      properties: [{
        type: "Property", kind: "init", method: false, computed: false,
        key: { type: "Identifier", name: "items" },
        value: { type: "ArrayExpression", elements: [{ type: "Literal", value: 1 }, { type: "Literal", value: "two" }] },
      }],
    };
    expect(evaluateStaticExpression(expression)).toEqual({ items: [1, "two"] });
  });

  it("embeds relative svg?raw imports as data and keeps them out of the component registry", async () => {
    const dir = await mkdtemp(join(tmpdir(), "lesson-render-tree-"));
    const svg = '<svg viewBox="0 0 10 10"><path d="M0 0h10v10z"/></svg>';
    await writeFile(join(dir, "diagram.svg"), svg);
    const raw = `---
lang: en
track: apis
unit: 02-status-codes-real
slug: infographic
title: Infographic
---
import Infographic from "~/components/diagram/Infographic.astro";
import diagram from "./diagram.svg?raw";

<Infographic svg={diagram} label="Static SVG" />
`;

    const first = await compileLessonRenderTree(raw, join(dir, "index.mdx"));
    const second = await compileLessonRenderTree(raw, join(dir, "index.mdx"));
    const infographic = first.root.find(
      (node) => node.type === "element" && node.name === "Infographic",
    ) as any;

    expect(infographic.props.svg).toBe(svg);
    expect(first.components).toEqual({
      Infographic: { source: "~/components/diagram/Infographic.astro", export: "default" },
    });
    expect(second.artifactHash).toBe(first.artifactHash);
  });

  it("serializes JSX nested inside component props as render-tree data", async () => {
    const raw = `---
lang: en
track: browser
unit: 01-event-loop
slug: faded
title: Faded
---
import FadedExample from "~/components/pedagogy/FadedExample.tsx";

<FadedExample
  id="faded"
  pieceSlug="faded"
  lang="en"
  title="Example"
  steps={{
    solved: (<pre><code>{\`const x = 1;\`}</code></pre>),
    semi: { prompt: <p>Fill it in.</p>, blanks: [] },
    blank: { prompt: <p>Try again.</p>, reveal: <code>x</code> },
  }}
/>
`;

    const artifact = await compileLessonRenderTree(raw, "/tmp/faded.mdx");
    const faded = artifact.root.find(
      (node) => node.type === "element" && node.name === "FadedExample",
    ) as any;

    expect(faded.props.steps.solved).toMatchObject({ type: "element", name: "pre" });
    expect(faded.props.steps.semi.prompt).toMatchObject({ type: "element", name: "p" });
    expect(faded.props.steps.blank.reveal).toMatchObject({ type: "element", name: "code" });
  });

  it("evaluates the bounded array.map pattern used by authored diagrams", async () => {
    const raw = `---
lang: en
track: performance
unit: 01-layout
slug: mapped-svg
title: Mapped SVG
---
<svg>
  {[{ x: 10, label: "a" }, { x: 20, label: "b" }].map((item, i) => {
    const x = item.x + i;
    return <text x={x}>{item.label}</text>;
  })}
</svg>
`;

    const artifact = await compileLessonRenderTree(raw, "/tmp/mapped-svg.mdx");
    const svg = artifact.root.find((node) => node.type === "element" && node.name === "svg") as any;
    const texts = svg.children.filter((node: any) => node.type === "element" && node.name === "text");

    expect(texts.map((node: any) => node.props.x)).toEqual([10, 21]);
    expect(texts.map((node: any) => node.children[0].value)).toEqual(["a", "b"]);
  });
});
