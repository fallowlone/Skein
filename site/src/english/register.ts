// Active learning register for the English hub. "engineering" weights the technical/NAWL corpus
// subset; "everyday" the general NGSL subset. Persisted so it survives reloads. A plain signal —
// components read `register.value` in render to subscribe.
import { signal, effect } from "@preact/signals";

export type Register = "engineering" | "everyday";

const KEY = "skein.english.register.v1";

function load(): Register {
  if (typeof localStorage === "undefined") return "engineering";
  return localStorage.getItem(KEY) === "everyday" ? "everyday" : "engineering";
}

export const register = signal<Register>(load());

if (typeof window !== "undefined") {
  effect(() => {
    try { localStorage.setItem(KEY, register.value); } catch { /* ignore quota/denied */ }
  });
}

export function setRegister(r: Register): void { register.value = r; }
