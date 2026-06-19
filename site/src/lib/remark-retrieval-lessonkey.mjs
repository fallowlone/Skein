// Build-time injection of the canonical SRS join key into RetrievalDrawer.
// Lesson MDX instantiates <RetrievalDrawer> via an explicit import, so Astro's
// <Content components> map cannot supply a per-instance prop and the island
// cannot read page context at runtime. This plugin reads the lesson frontmatter
// and stamps lessonKey="<track>/<unit>/<slug>" onto every drawer node, so
// cardsFromRetrieval seeds a key that unitReviewHealth can bucket. See
// docs/superpowers/specs/2026-06-19-phase3b-retrieval-join-design.md.
import { visit } from "unist-util-visit";

export default function remarkRetrievalLessonKey() {
  return (tree, file) => {
    const fm = file?.data?.astro?.frontmatter;
    if (!fm) return;
    const { track, unit, slug } = fm;
    if (!track || !unit || !slug) return; // non-lesson / incomplete → bare-id fallback
    const lessonKey = `${track}/${unit}/${slug}`;
    visit(tree, "mdxJsxFlowElement", (node) => {
      if (node.name !== "RetrievalDrawer") return;
      node.attributes ??= [];
      const present = node.attributes.some(
        (a) => a && a.type === "mdxJsxAttribute" && a.name === "lessonKey",
      );
      if (present) return;
      node.attributes.push({ type: "mdxJsxAttribute", name: "lessonKey", value: lessonKey });
    });
  };
}
