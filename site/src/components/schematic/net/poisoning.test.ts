import { describe, expect, it } from "vitest";
import { oddsNote, poisoningOdds } from "./poisoning";

const none = { port: false, case0x20: false, sad: false, dnssec: false };

describe("poisoningOdds", () => {
  it("needs only hundreds of races with a bare 16-bit TXID", () => {
    const r = poisoningOdds(none);
    expect(r.bits).toBe(16);
    expect(Math.ceil(r.racesFor50)).toBe(454);
  });
  it("port randomisation adds 16 bits and SAD DNS takes them back", () => {
    expect(poisoningOdds({ ...none, port: true }).bits).toBe(32);
    expect(poisoningOdds({ ...none, port: true, sad: true }).bits).toBe(16);
    expect(poisoningOdds({ ...none, port: true, case0x20: true }).bits).toBe(45);
  });
  it("DNSSEC makes forgery fail regardless of entropy", () => {
    const r = poisoningOdds({ ...none, dnssec: true });
    expect(r.chancePerRace).toBe(0);
    expect(r.racesFor50).toBe(Infinity);
  });
});

describe("oddsNote", () => {
  it("picks the explanation that matches the defences", () => {
    expect(oddsNote(none)).toBe("weak");
    expect(oddsNote({ ...none, port: true })).toBe("strong");
    expect(oddsNote({ ...none, port: true, sad: true })).toBe("sad");
    expect(oddsNote({ ...none, port: true, dnssec: true })).toBe("dnssec");
  });
});
