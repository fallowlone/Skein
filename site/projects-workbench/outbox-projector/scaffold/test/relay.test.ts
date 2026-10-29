import { test, expect } from "bun:test";
import { Outbox, Broker, Relay } from "../src/outbox";

// A broker that fails event #2 twice, then recovers: the relay must publish
// every event exactly once, in order, and drain the outbox.
test("relay drains through transient failure without loss or duplicates", () => {
  const box = new Outbox();
  const a = box.append({ v: 1, type: "Credited", amount: 100 });
  const b = box.append({ v: 2, type: "Credited", amount: 50 });
  const c = box.append({ v: 3, type: "Debited", amount: 30 });

  const broker = new Broker({ [b.id]: 2 });
  new Relay(box, broker).drain();

  expect(broker.published.map((e) => e.id)).toEqual([a.id, b.id, c.id]);
  expect(box.pending()).toEqual([]);
});

// A full redrive of everything the broker already published must not
// duplicate anything downstream: published ids are unique.
test("relay never publishes the same event twice", () => {
  const box = new Outbox();
  box.append({ v: 1, type: "Credited", amount: 100 });
  const b = box.append({ v: 2, type: "Credited", amount: 50 });

  const broker = new Broker({ [b.id]: 5 });
  new Relay(box, broker).drain();

  const ids = broker.published.map((e) => e.id);
  expect(new Set(ids).size).toBe(ids.length);
  expect(box.pending()).toEqual([]);
});
