// functions/lib/ratelimit.test.ts
import { describe, it, expect } from "vitest";
import { rateLimit } from "./ratelimit";
import { FakeKV } from "../test/fakes";

describe("ratelimit", () => {
  it("allows up to the limit then denies", async () => {
    const kv = new FakeKV() as any;
    const opts = { kv, ip: "1.2.3.4", bucket: "w", limit: 3, windowSec: 60 };
    expect((await rateLimit(opts)).ok).toBe(true);
    expect((await rateLimit(opts)).ok).toBe(true);
    expect((await rateLimit(opts)).ok).toBe(true);
    expect((await rateLimit(opts)).ok).toBe(false);
  });

  it("separates buckets and ips", async () => {
    const kv = new FakeKV() as any;
    expect((await rateLimit({ kv, ip: "a", bucket: "x", limit: 1, windowSec: 60 })).ok).toBe(true);
    expect((await rateLimit({ kv, ip: "a", bucket: "x", limit: 1, windowSec: 60 })).ok).toBe(false);
    expect((await rateLimit({ kv, ip: "b", bucket: "x", limit: 1, windowSec: 60 })).ok).toBe(true);
    expect((await rateLimit({ kv, ip: "a", bucket: "y", limit: 1, windowSec: 60 })).ok).toBe(true);
  });
});
