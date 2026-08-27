# Write-Ahead Log — starter

Implement `Disk`, `WAL`, and the CRC32 helper in `src/wal.ts` so the suite passes.

    bun test

Rules: the "disk" is an in-memory byte buffer (no real I/O). Every record is
framed as `[u32 length][u32 crc32(body)][body bytes]`. `WAL.replay()` walks
frames from the start, verifying each CRC, and stops at the first incomplete
or corrupt frame. `WAL.checkpoint()` marks a replay floor; records before it
are invisible to replay. When it is green, read the rubric and extend to a
real on-disk store with fsync and crash-injection tests.

---

Product milestones — see the project page for the full 5–6-step product brief (mechanism → tradeoff → failure mode → numbers):

1. **Append-only log: record framing and format** (`log-format-and-framing`)
2. **fsync durability and group commit** (`fsync-and-group-commit`)
3. **Crash recovery: replay and the torn tail** (`crash-recovery-replay`)
4. **Checkpointing and log truncation** (`checkpoint-and-truncation`)
5. **A KV store on top: memtable and flush** (`kv-store-memtable-flush`)
6. **Corruption detection (CRC), observability, and the torn-write incident** (`crc-observe-and-incident`)

When the suite is green, read the project's `rubric` and `reference` on the site and push to the senior bar — the README checks the core, the project page checks the product.

