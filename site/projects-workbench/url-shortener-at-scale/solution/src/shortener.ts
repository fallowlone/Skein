const CHARSET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const BASE = 62;

export function encodeBase62(n: number): string {
  if (n === 0) return CHARSET[0];
  let result = "";
  let remaining = n;
  while (remaining > 0) {
    result = CHARSET[remaining % BASE] + result;
    remaining = Math.floor(remaining / BASE);
  }
  return result;
}

export function decodeBase62(s: string): number {
  let result = 0;
  for (const ch of s) {
    const idx = CHARSET.indexOf(ch);
    result = result * BASE + idx;
  }
  return result;
}

export type Redirect = 301 | 302;

interface Entry {
  url: string;
  createdAt: number;
}

export class Shortener {
  private ttlMs: number;
  private redirect: Redirect;
  private counter: number;
  private store: Map<string, Entry>;

  constructor(opts?: { ttlMs?: number; redirect?: Redirect }) {
    this.ttlMs = opts?.ttlMs ?? Infinity;
    this.redirect = opts?.redirect ?? 301;
    this.counter = 0;
    this.store = new Map();
  }

  create(url: string, now: number): { code: string; redirect: Redirect } {
    const code = encodeBase62(this.counter++);
    this.store.set(code, { url, createdAt: now });
    return { code, redirect: this.redirect };
  }

  resolve(code: string, now: number): { url: string; redirect: Redirect } | null {
    const entry = this.store.get(code);
    if (!entry) return null;
    if (now - entry.createdAt > this.ttlMs) return null;
    return { url: entry.url, redirect: this.redirect };
  }
}
