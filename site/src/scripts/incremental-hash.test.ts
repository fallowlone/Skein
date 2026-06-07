import { describe, it, expect } from "vitest";
import { splitFrontmatter, frontmatterField, hashParts, pageHash, pageKeyOf } from "./incremental-hash";

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

describe("hashParts", () => {
  it("is deterministic for the same parts", () => {
    expect(hashParts(["a", "b"])).toBe(hashParts(["a", "b"]));
  });
  it("is order-sensitive", () => {
    expect(hashParts(["a", "b"])).not.toBe(hashParts(["b", "a"]));
  });
  it("is unambiguous across part boundaries (NUL-separated)", () => {
    expect(hashParts(["a", "b"])).not.toBe(hashParts(["ab"]));
  });
});

describe("pageHash", () => {
  it("changes when the body changes", () => {
    expect(pageHash("body1", "practice")).not.toBe(pageHash("body2", "practice"));
  });
  it("changes when the practice changes", () => {
    expect(pageHash("body", "p1")).not.toBe(pageHash("body", "p2"));
  });
  it("is stable when neither changes", () => {
    expect(pageHash("body", "p")).toBe(pageHash("body", "p"));
  });
});

describe("pageKeyOf", () => {
  it("builds <lang>/<track>/<unit>/<slug>", () => {
    expect(pageKeyOf({ lang: "en", track: "networking", unit: "03-tcp", slug: "01-intro" }))
      .toBe("en/networking/03-tcp/01-intro");
  });
});
