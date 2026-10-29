import { test, expect } from "bun:test";
import { Outbox, Broker, Relay, Projector, type OutEvent } from "../src/outbox";

// v2 delivered twice (at-least-once redelivery): the projector must converge
// on 100 + 50 - 30 = 120, not 170.
test("projector skips redelivered versions", () => {
  const p = new Projector();
  const log: OutEvent[] = [
    { id: 1, v: 1, type: "Credited", amount: 100 },
    { id: 2, v: 2, type: "Credited", amount: 50 },
    { id: 3, v: 2, type: "Credited", amount: 50 },
    { id: 4, v: 3, type: "Debited", amount: 30 },
  ];

  p.apply(log);

  expect(p.balance).toBe(120);
  expect(p.lastSeen).toBe(3);
});

// End to end: relay drains into the broker, the projector folds what was
// published, and a full replay of the published set changes nothing.
test("relay into projector converges and replay is a no-op", () => {
  const box = new Outbox();
  box.append({ v: 1, type: "Credited", amount: 100 });
  const b = box.append({ v: 2, type: "Credited", amount: 50 });
  box.append({ v: 3, type: "Debited", amount: 30 });

  const broker = new Broker({ [b.id]: 1 });
  new Relay(box, broker).drain();

  const p = new Projector();
  p.apply(broker.published);
  expect(p.balance).toBe(120);

  p.apply(broker.published); // full replay
  expect(p.balance).toBe(120);
  expect(p.lastSeen).toBe(3);
});
