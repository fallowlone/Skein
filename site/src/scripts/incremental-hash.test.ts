import { describe, it, expect } from "vitest";
import {
  splitFrontmatter, frontmatterField, hashParts, pageHash, pageKeyOf,
  decideBuild, partitionFrontmatter, PAGE_LOCAL_FRONTMATTER_FIELDS,
  MAX_INCREMENTAL_PAGES,
  type Manifest,
} from "./incremental-hash";

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

  it("does not truncate a body that contains a standalone --- line", () => {
    const raw = "---\ntitle: T\nslug: 01-x\n---\nbefore\n---\nafter";
    const { frontmatter, body } = splitFrontmatter(raw);
    expect(frontmatter).toBe("title: T\nslug: 01-x");
    expect(body).toBe("before\n---\nafter");
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

const prev: Manifest = {
  globalHash: "G1",
  pages: { "en/n/01/a": "h1", "ru/n/01/a": "h2" },
};

describe("decideBuild", () => {
  it("is FULL when there is no previous manifest", () => {
    expect(decideBuild(null, { globalHash: "G1", pages: {} }).mode).toBe("full");
  });
  it("is FULL when the global hash changed", () => {
    const d = decideBuild(prev, { globalHash: "G2", pages: prev.pages });
    expect(d.mode).toBe("full");
    expect(d.changedPages).toEqual([]);
  });
  it("is FULL when forceFull is set, even if nothing else changed", () => {
    expect(decideBuild(prev, { globalHash: "G1", pages: prev.pages }, true).mode).toBe("full");
  });
  it("is INCREMENTAL listing only the pages whose hash changed", () => {
    const d = decideBuild(prev, { globalHash: "G1", pages: { "en/n/01/a": "h1-NEW", "ru/n/01/a": "h2" } });
    expect(d.mode).toBe("incremental");
    expect(d.changedPages).toEqual(["en/n/01/a"]);
  });
  it("is INCREMENTAL with an empty change set when global is unchanged and no body/practice moved", () => {
    const d = decideBuild(prev, { globalHash: "G1", pages: prev.pages });
    expect(d.mode).toBe("incremental");
    expect(d.changedPages).toEqual([]);
  });
  it("is FULL when a page key was added (present in current, absent in prev)", () => {
    const d = decideBuild(prev, { globalHash: "G1", pages: { ...prev.pages, "en/n/01/c": "h3" } });
    expect(d.mode).toBe("full");
  });
  it("is FULL when a page key was removed (present in prev, absent in current)", () => {
    const d = decideBuild(prev, { globalHash: "G1", pages: { "en/n/01/a": "h1" } });
    expect(d.mode).toBe("full");
  });
  it("promotes to FULL when more than MAX_INCREMENTAL_PAGES pages changed (env-arg overflow guard)", () => {
    const n = MAX_INCREMENTAL_PAGES + 1;
    const prevPages: Record<string, string> = {};
    const currPages: Record<string, string> = {};
    for (let i = 0; i < n; i++) {
      prevPages[`en/t/u/${i}`] = "h";
      currPages[`en/t/u/${i}`] = "h-NEW"; // every page's hash moved
    }
    const d = decideBuild({ globalHash: "G1", pages: prevPages }, { globalHash: "G1", pages: currPages });
    expect(d.mode).toBe("full");
    expect(d.changedPages).toEqual([]);
  });
  it("stays INCREMENTAL at exactly MAX_INCREMENTAL_PAGES changed pages", () => {
    const n = MAX_INCREMENTAL_PAGES;
    const prevPages: Record<string, string> = {};
    const currPages: Record<string, string> = {};
    for (let i = 0; i < n; i++) {
      prevPages[`en/t/u/${i}`] = "h";
      currPages[`en/t/u/${i}`] = "h-NEW";
    }
    const d = decideBuild({ globalHash: "G1", pages: prevPages }, { globalHash: "G1", pages: currPages });
    expect(d.mode).toBe("incremental");
    expect(d.changedPages.length).toBe(n);
  });
});

describe("partitionFrontmatter", () => {
  const fm = [
    "lang: en",
    "track: networking",
    "title: TCP Handshake",
    "description: A page-only blurb",
    "estMin: 12",
    "prereqs:",
    "  - networking/02-ip/01-addressing",
  ].join("\n");

  it("routes allowlisted scalar fields to `local`", () => {
    const { local } = partitionFrontmatter(fm, ["description", "estMin"]);
    expect(local).toContain("description: A page-only blurb");
    expect(local).toContain("estMin: 12");
    expect(local).not.toContain("title:");
  });

  it("routes everything else (incl. nested blocks) to `rest`", () => {
    const { rest } = partitionFrontmatter(fm, ["description", "estMin"]);
    expect(rest).toContain("title: TCP Handshake");
    expect(rest).toContain("prereqs:");
    expect(rest).toContain("  - networking/02-ip/01-addressing");
    expect(rest).not.toContain("description:");
  });

  it("keeps an indented continuation with its parent field", () => {
    const { rest, local } = partitionFrontmatter(fm, ["estMin"]);
    expect(rest).toContain("  - networking/02-ip/01-addressing");
    expect(local).toBe("estMin: 12");
  });

  it("is a complete, disjoint partition (no field lost or duplicated)", () => {
    const { local, rest } = partitionFrontmatter(fm, ["description", "estMin"]);
    const lines = (local + "\n" + rest).split("\n").filter(Boolean).sort();
    expect(lines).toEqual(fm.split("\n").filter(Boolean).sort());
  });

  it("exposes a non-empty page-local allowlist", () => {
    expect(PAGE_LOCAL_FRONTMATTER_FIELDS.length).toBeGreaterThan(0);
  });
});

describe("pageHash (with local frontmatter)", () => {
  it("changes when the local frontmatter projection changes", () => {
    expect(pageHash("b", "p", "estMin: 10")).not.toBe(pageHash("b", "p", "estMin: 11"));
  });
  it("2-arg call equals the legacy 2-part hash (manifest backward-compat)", () => {
    expect(pageHash("b", "p")).toBe(hashParts(["b", "p"]));
  });
  it("3-arg with non-empty local frontmatter differs from the 2-arg value", () => {
    expect(pageHash("b", "p", "level: senior")).not.toBe(pageHash("b", "p"));
  });
});
