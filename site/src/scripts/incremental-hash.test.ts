import { describe, it, expect } from "vitest";
import { splitFrontmatter, frontmatterField } from "./incremental-hash";

describe("splitFrontmatter", () => {
  it("separates the YAML frontmatter block from the body", () => {
    const raw = `---\ntitle: Hello\nslug: 01-intro\n---\n# Body\n\nText.`;
    const { frontmatter, body } = splitFrontmatter(raw);
    expect(frontmatter).toBe("title: Hello\nslug: 01-intro");
    expect(body).toBe("# Body\n\nText.");
  });

  it("returns empty frontmatter and the whole input as body when there is no fence", () => {
    const { frontmatter, body } = splitFrontmatter("no frontmatter here");
    expect(frontmatter).toBe("");
    expect(body).toBe("no frontmatter here");
  });
});

describe("frontmatterField", () => {
  const fm = `slug: 03-tcp-handshake\nlang: en\ntrack: networking\nunit: 03-tcp\ntitle: "Quoted Value"`;
  it("reads a bare scalar", () => {
    expect(frontmatterField(fm, "track")).toBe("networking");
  });
  it("strips surrounding quotes", () => {
    expect(frontmatterField(fm, "title")).toBe("Quoted Value");
  });
  it("returns null for an absent field", () => {
    expect(frontmatterField(fm, "estMin")).toBeNull();
  });
});
