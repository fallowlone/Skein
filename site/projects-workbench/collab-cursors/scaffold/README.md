# Collaborative cursors — starter

Implement `src/presence.ts` until the acceptance suite passes:

    bun test

Two tabs on localhost will not show you these failures; the suite will:

- **Presence is current state, not a log.** A reconnecting client gets one snapshot.
- **A stale frame cannot teleport a cursor.** LWW on the timestamp, ties keep what is
  stored — two tabs, a proxy buffer and a reconnect are enough to deliver an old
  frame late.
- **Silent peers expire.** A suspended mobile tab never fires `close`, so without a
  TTL its ghost cursor stays on everyone's screen.
- **Pointer events coalesce.** 120 Hz input, one send per interval, and the *final*
  position still gets delivered — dropping it leaves the cursor short of the pointer.
- **Reconnects jitter.** Otherwise one deploy brings every client back at the same
  instant and takes the server down again.

Green suite = the model is right. Then build the app on the project page: the
WebSocket transport, room fan-out (and why naive fan-out is O(N²)), client-side
interpolation for smooth motion, CRDT-backed shared selections, and the
broadcast-storm incident.

---

Product milestones — see the project page for the full 5–6-step product brief (mechanism → tradeoff → failure mode → numbers):

1. **WebSocket transport and the presence model** (`transport-and-presence`)
2. **Broadcast fan-out and room sharding** (`fanout-and-rooms`)
3. **Cursor interpolation, throttling, and coalescing on the client** (`interpolation-and-throttle`)
4. **Conflict-free shared selections (LWW now, CRDT for stretch)** (`conflict-free-selections`)
5. **Reconnect, resync, and backpressure** (`reconnect-and-backpressure`)
6. **Scale across servers, observe it, and survive a broadcast storm** (`scale-observe-incident`)

When the suite is green, read the project's `rubric` and `reference` on the site and push to the senior bar — the README checks the core, the project page checks the product.

