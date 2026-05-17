import { describe, it, expect } from "vitest";
import { deriveRelations, scanKeys, type ScanEntry } from "./glossary-index";

const glossary = {
  tcp: { en: "TCP", ru: "TCP" },
  syn: { en: "SYN", ru: "SYN" },
  heap: { en: "heap", ru: "куча" },
};

// altitude: lower = closer to zero knowledge
const entries: ScanEntry[] = [
  { collection: "lessons", group: "algorithms", slug: "01-heaps", altitude: 100,
    body: 'A <Term k="heap" lang="en">heap</Term> orders by priority.' },
  { collection: "book", group: "networking", slug: "03-tcp-handshake", altitude: 9000,
    body: 'The <Term k="tcp" lang="en">TCP</Term> <Term k="syn" lang="en">SYN</Term> packet. <Term k="tcp" lang="en">TCP</Term> again.' },
  { collection: "book", group: "networking", slug: "01-osi", altitude: 8000,
    body: 'Early mention of <Term k="tcp" lang="en">TCP</Term>.' },
];

describe("deriveRelations — usedIn / introducedIn", () => {
  const rel = deriveRelations(entries, glossary);

  it("collects every entry that references a key, deduped per entry", () => {
    expect(rel.usedIn.tcp.map((r) => r.slug).sort()).toEqual(["01-osi", "03-tcp-handshake"]);
    expect(rel.usedIn.syn.map((r) => r.slug)).toEqual(["03-tcp-handshake"]);
  });

  it("usedIn is sorted by altitude ascending", () => {
    expect(rel.usedIn.tcp.map((r) => r.altitude)).toEqual([8000, 9000]);
  });

  it("introducedIn is the lowest-altitude entry", () => {
    expect(rel.introducedIn.tcp?.slug).toBe("01-osi");
    expect(rel.introducedIn.heap?.slug).toBe("01-heaps");
  });

  it("introducedIn is null and usedIn is [] for an unreferenced key", () => {
    const r2 = deriveRelations([], glossary);
    expect(r2.introducedIn.tcp).toBeNull();
    expect(r2.usedIn.tcp).toEqual([]);
  });
});

describe("scanKeys", () => {
  it("extracts the k attribute from Term tags", () => {
    expect([...scanKeys('<Term k="tcp" lang="en">TCP</Term>')]).toEqual(["tcp"]);
  });

  it("matches k regardless of attribute order", () => {
    expect([...scanKeys('<Term lang="en" k="syn">SYN</Term>')]).toEqual(["syn"]);
  });

  it("dedupes repeated keys and returns multiple distinct keys", () => {
    const keys = scanKeys('<Term k="tcp">a</Term> <Term k="tcp">b</Term> <Term k="syn">c</Term>');
    expect([...keys].sort()).toEqual(["syn", "tcp"]);
  });

  it("returns an empty set for a body with no Term tags", () => {
    expect(scanKeys("").size).toBe(0);
    expect(scanKeys("plain text, no terms").size).toBe(0);
  });
});

describe("deriveRelations — seeAlso", () => {
  it("copies seeAlso arrays from the glossary", () => {
    const g = {
      tcp: { en: "TCP", ru: "TCP", seeAlso: ["syn"] },
      syn: { en: "SYN", ru: "SYN" },
    };
    const rel = deriveRelations([], g);
    expect(rel.seeAlso.tcp).toEqual(["syn"]);
    expect(rel.seeAlso.syn).toEqual([]);
  });

  it("throws on a seeAlso reference to a missing key", () => {
    const g = { tcp: { en: "TCP", ru: "TCP", seeAlso: ["ghost"] } };
    expect(() => deriveRelations([], g)).toThrow(/seeAlso.*ghost/i);
  });

  it("treats an explicit empty seeAlso array as no relations", () => {
    const g = { tcp: { en: "TCP", ru: "TCP", seeAlso: [] as string[] } };
    expect(deriveRelations([], g).seeAlso.tcp).toEqual([]);
  });

  it("throws on a seeAlso reference to itself", () => {
    const g = { tcp: { en: "TCP", ru: "TCP", seeAlso: ["tcp"] } };
    expect(() => deriveRelations([], g)).toThrow(/references itself/i);
  });
});
