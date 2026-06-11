// site/src/scripts/path/__fixtures__/mini-graph.ts
import type { Concept, UnitConcepts, Goal } from "../types";

// 3 tracks, 9 concepts, cross-track edges (replication requires tcp-handshake + mvcc).
export const CONCEPTS: Concept[] = [
  { id: "ip-addressing",   label: { en: "IP addressing", ru: "IP-адресация" },     track: "networking", band: "foundations", requires: [] },
  { id: "ports-sockets",   label: { en: "Ports & sockets", ru: "Порты и сокеты" }, track: "networking", band: "foundations", requires: [] },
  { id: "tcp-handshake",   label: { en: "TCP handshake", ru: "TCP-рукопожатие" },  track: "networking", band: "middle",      requires: ["ip-addressing", "ports-sockets"] },
  { id: "tls",             label: { en: "TLS", ru: "TLS" },                         track: "networking", band: "middle",      requires: ["tcp-handshake"] },
  { id: "relational-model",label: { en: "Relational model", ru: "Реляционная модель" }, track: "databases", band: "surface", requires: [] },
  { id: "indexing",        label: { en: "Indexing", ru: "Индексы" },               track: "databases",  band: "middle",      requires: ["relational-model"] },
  { id: "mvcc",            label: { en: "MVCC", ru: "MVCC" },                       track: "databases",  band: "advanced",    requires: ["indexing"] },
  { id: "replication",     label: { en: "Replication", ru: "Репликация" },         track: "distributed",band: "middle",      requires: ["mvcc", "tcp-handshake"] },
  { id: "consensus",       label: { en: "Consensus", ru: "Консенсус" },            track: "distributed",band: "advanced",    requires: ["replication"] },
  { id: "leaf-x",          label: { en: "Leaf X", ru: "Лист X" },                  track: "networking", band: "middle",      requires: ["tcp-handshake"] },
];

export const UNITS: UnitConcepts[] = [
  { unit: "networking/01-ip",        track: "networking",  teaches: ["ip-addressing", "ports-sockets"], requires: [],                          estMin: 30 },
  { unit: "networking/02-tcp",       track: "networking",  teaches: ["tcp-handshake"],                  requires: ["ip-addressing", "ports-sockets"], estMin: 40 },
  { unit: "networking/03-tls",       track: "networking",  teaches: ["tls"],                            requires: ["tcp-handshake"],           estMin: 50 },
  { unit: "databases/01-rel",        track: "databases",   teaches: ["relational-model"],               requires: [],                          estMin: 30 },
  { unit: "databases/02-index",      track: "databases",   teaches: ["indexing"],                       requires: ["relational-model"],        estMin: 45 },
  { unit: "databases/03-mvcc",       track: "databases",   teaches: ["mvcc"],                           requires: ["indexing"],                estMin: 60 },
  { unit: "distributed/01-repl",     track: "distributed", teaches: ["replication"],                    requires: ["mvcc", "tcp-handshake"],   estMin: 55 },
  { unit: "distributed/02-consensus",track: "distributed", teaches: ["consensus"],                      requires: ["replication"],             estMin: 70 },
  { unit: "networking/03-leaf",      track: "networking",  teaches: ["leaf-x"],                         requires: ["tcp-handshake"],           estMin: 30 },
];

export const GOALS: Goal[] = [
  { id: "senior-fullstack", label: { en: "Senior fullstack", ru: "Senior fullstack" }, target: { rule: "band>=middle" },
    trackWeights: { networking: 1.0, databases: 1.0, distributed: 1.0 } },
  { id: "backend-job", label: { en: "Backend job", ru: "Бэкенд-работа" }, target: { concepts: ["indexing", "mvcc", "tcp-handshake"] },
    trackWeights: { databases: 1.0, networking: 0.8, distributed: 0.6 } },
  { id: "frontend-dev", label: { en: "Frontend dev", ru: "Frontend-разработчик" }, target: { rule: "track-band>=middle" },
    // core (weight 1 → targeted): networking; support (weight < 1 → order-only): databases
    trackWeights: { networking: 1.0, databases: 0.7 } },
];

// Deterministic track ordering passed into the planner (mirrors tracks.json `order`).
export const TRACK_ORDER = new Map<string, number>([
  ["networking", 1], ["databases", 2], ["distributed", 3],
]);
