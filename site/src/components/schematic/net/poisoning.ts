/** Off-path cache-poisoning race model behind DnsPoisoningOddsFig. */

export interface Defences { port: boolean; case0x20: boolean; sad: boolean; dnssec: boolean }
export interface Odds { bits: number; chancePerRace: number; racesFor50: number }

export const TXID_BITS = 16;
export const PORT_BITS = 16;
export const CASE_BITS = 13; // letters in www.example.com
export const FORGED_PER_RACE = 100;

export type OddsNote = "weak" | "strong" | "sad" | "dnssec";
/** Which explanation fits the current defences. */
export function oddsNote(d: Defences): OddsNote {
  if (d.dnssec) return "dnssec";
  if (d.port && d.sad) return "sad";
  return d.port || d.case0x20 ? "strong" : "weak";
}

/** SAD DNS infers the source port through an ICMP side channel, so it cancels port entropy. */
export function poisoningOdds(d: Defences): Odds {
  const bits = TXID_BITS + (d.port && !d.sad ? PORT_BITS : 0) + (d.case0x20 ? CASE_BITS : 0);
  if (d.dnssec) return { bits, chancePerRace: 0, racesFor50: Infinity };
  const chancePerRace = Math.min(1, FORGED_PER_RACE / 2 ** bits);
  const racesFor50 = chancePerRace >= 1 ? 1 : Math.log(0.5) / Math.log1p(-chancePerRace);
  return { bits, chancePerRace, racesFor50 };
}

const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const sci = (n: number): string => { const [m, e] = n.toExponential(1).split("e+"); return `${m} × 10${[...e].map((d) => SUP[Number(d)]).join("")}`; };
export const fmtRaces = (n: number): string => (n < 1e6 ? Math.ceil(n).toLocaleString("en-US") : sci(n));
export const fmtChance = (p: number): string => (p >= 0.01 ? `${(p * 100).toFixed(1)}%` : p >= 1e-6 ? `${(p * 100).toPrecision(2)}%` : `1 / ${fmtRaces(1 / p)}`);
