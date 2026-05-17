import { describe, it, expect } from "vitest";
import { deriveRelations, type ScanEntry } from "./glossary-index";

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
