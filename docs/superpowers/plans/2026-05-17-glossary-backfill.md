# Glossary Definition Backfill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Author researched, bilingual (EN+RU) definitions for the 439 glossary terms in `site/src/i18n/glossary.json` that currently lack them, completing the glossary the redesigned page renders.

**Architecture:** A small order-preserving merge tool applies per-batch JSON patches to `glossary.json`, so subagents never hand-edit the 571-entry file. The 439 terms are split into 30 domain-grouped batches of ~15. Each batch is one task: a subagent researches every term (WebSearch + Context7), authors `defEn` + `defRu`, writes a patch, merges it, validates, commits. Batches run sequentially (subagent-driven dispatches one at a time) so there is never a concurrent write to `glossary.json`.

**Tech Stack:** Node ESM scripts (`.mjs`), Vitest, the existing `glossary.json` data file. No new runtime code — the glossary page (plan 1) already reads `defEn`/`defRu`.

**Spec:** `docs/superpowers/specs/2026-05-17-glossary-redesign-design.md` (section 7, plan 2).

**Scale note:** 439 terms × full research is a deliberately large, multi-session effort (user chose full research over model-knowledge authoring). Execution is resumable — completed batches are committed; the checkbox state tracks progress.

> **PROGRESS — COMPLETE (2026-05-18):** All tasks done. Task 1 (tooling) + Batches B01–B30 (Tasks 2–31) authored, merged, spec-reviewed, accuracy-reviewed. **glossary now 571/571 defined.** Task 32 final verification done: build clean (1627 pages), lint clean. HANDOFF updated. The accuracy-review gate caught and fixed real factual errors in many batches (B02 latency figures, B04 RRSIG keys, B05 isolation anomalies, B06 SSI structure, B07 PgBouncer SET, B08 Big-O wording, B09 prose leak, B10 pivot depth, B11 ALPN h3, B13 implicit grant, B15 CSSOM layout, B16 V8 Ignition/hydration, B17 Skia, B18 TurboFan IR, B22 negative-cache TTL, B23 IP TTL, B25 instrumentation overhead, B27 NUMA/TLB/Smi). `seeAlso` field intentionally left unpopulated (optional future polish).

---

## File Structure

| File | Responsibility |
|---|---|
| `site/scripts/merge-definitions.mjs` | **Create.** Exports `applyPatch(glossary, patch)` (pure, order-preserving) + CLI that merges a patch file into `glossary.json`. |
| `site/scripts/merge-definitions.test.mjs` | **Create.** Vitest unit tests for `applyPatch`. |
| `site/scripts/check-definitions.mjs` | **Create.** CLI: given comma-separated keys (or `--all`), verifies each has non-empty `defEn` + `defRu`; exits non-zero on any gap. |
| `site/src/i18n/glossary.json` | **Modify (30 batches).** 439 entries gain `defEn` + `defRu`. |

Per-batch patch files are written to `/tmp/glossary-patch-BNN.json` and are NOT committed.

Notes for the engineer:
- A `glossary.json` entry looks like `"ack": { "en": "ACK", "ru": "ACK" }`. After backfill: `{ "en": "ACK", "ru": "ACK", "defEn": "…", "defRu": "…" }`. Some entries also carry an optional `seeAlso` array — preserve it untouched.
- The file is 2-space indented, UTF-8, key order meaningful (entries are roughly alphabetical). Order MUST be preserved — that is why merging goes through `applyPatch`, never a hand edit.
- 132 entries already have `defEn`/`defRu` — those are the style reference. Examples: `abstract_data_type`, `accumulator`, `advisory_lock`. Read several before authoring.
- Run commands from `/Users/artemmac/dev/awesome-everything/site` unless stated. Git branch: continue on the current branch (`algorithms-units-06-12`) — do not create a new branch unless the user asks.

---

## Task 1: Backfill tooling — merge + check scripts

**Files:**
- Create: `site/scripts/merge-definitions.mjs`
- Create: `site/scripts/merge-definitions.test.mjs`
- Create: `site/scripts/check-definitions.mjs`

- [ ] **Step 1: Write the failing test**

Create `site/scripts/merge-definitions.test.mjs`:

```js
import { describe, it, expect } from "vitest";
import { applyPatch } from "./merge-definitions.mjs";

const base = () => ({
  ack: { en: "ACK", ru: "ACK" },
  syn: { en: "SYN", ru: "SYN", seeAlso: ["ack"] },
  tcp: { en: "TCP", ru: "TCP", defEn: "old", defRu: "старое" },
});

describe("applyPatch", () => {
  it("adds defEn/defRu to an entry that lacked them", () => {
    const out = applyPatch(base(), { ack: { defEn: "an ack", defRu: "подтверждение" } });
    expect(out.ack).toEqual({ en: "ACK", ru: "ACK", defEn: "an ack", defRu: "подтверждение" });
  });

  it("preserves an existing seeAlso array", () => {
    const out = applyPatch(base(), { syn: { defEn: "a syn", defRu: "син" } });
    expect(out.syn.seeAlso).toEqual(["ack"]);
    expect(out.syn.defEn).toBe("a syn");
  });

  it("preserves overall key order and other entries", () => {
    const out = applyPatch(base(), { syn: { defEn: "x", defRu: "ы" } });
    expect(Object.keys(out)).toEqual(["ack", "syn", "tcp"]);
  });

  it("overwrites an existing definition", () => {
    const out = applyPatch(base(), { tcp: { defEn: "new", defRu: "новое" } });
    expect(out.tcp.defEn).toBe("new");
  });

  it("throws when a patch key is absent from the glossary", () => {
    expect(() => applyPatch(base(), { ghost: { defEn: "g", defRu: "г" } })).toThrow(/ghost/);
  });

  it("throws on an empty or missing defEn/defRu", () => {
    expect(() => applyPatch(base(), { ack: { defEn: "", defRu: "x" } })).toThrow(/defEn/i);
    expect(() => applyPatch(base(), { ack: { defEn: "x" } })).toThrow(/defRu/i);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd site && bun run test -- merge-definitions`
Expected: FAIL — `applyPatch` not exported (module does not exist).

- [ ] **Step 3: Write `merge-definitions.mjs`**

Create `site/scripts/merge-definitions.mjs`:

```js
// Order-preserving merge of a {key:{defEn,defRu}} patch into glossary.json.
// Usage: node scripts/merge-definitions.mjs <patch.json>
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** Apply a patch to a glossary object. Pure — returns a new object,
 *  preserves key order and any existing fields (e.g. seeAlso). */
export function applyPatch(glossary, patch) {
  const out = {};
  for (const [key, entry] of Object.entries(glossary)) {
    out[key] = { ...entry };
  }
  for (const [key, def] of Object.entries(patch)) {
    if (!(key in out)) {
      throw new Error(`patch key "${key}" is not in the glossary`);
    }
    if (typeof def.defEn !== "string" || def.defEn.trim() === "") {
      throw new Error(`patch key "${key}": defEn must be a non-empty string`);
    }
    if (typeof def.defRu !== "string" || def.defRu.trim() === "") {
      throw new Error(`patch key "${key}": defRu must be a non-empty string`);
    }
    out[key] = { ...out[key], defEn: def.defEn, defRu: def.defRu };
  }
  return out;
}

// CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const patchPath = process.argv[2];
  if (!patchPath) {
    console.error("usage: node scripts/merge-definitions.mjs <patch.json>");
    process.exit(1);
  }
  const glossaryPath = new URL("../src/i18n/glossary.json", import.meta.url);
  const glossary = JSON.parse(readFileSync(glossaryPath, "utf8"));
  const patch = JSON.parse(readFileSync(patchPath, "utf8"));
  const merged = applyPatch(glossary, patch);
  writeFileSync(glossaryPath, JSON.stringify(merged, null, 2) + "\n", "utf8");
  console.log(`merged ${Object.keys(patch).length} definitions into glossary.json`);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd site && bun run test -- merge-definitions`
Expected: PASS — 6 tests.

- [ ] **Step 5: Write `check-definitions.mjs`**

Create `site/scripts/check-definitions.mjs`:

```js
// Verify glossary terms have non-empty defEn + defRu.
// Usage: node scripts/check-definitions.mjs key1,key2,...
//        node scripts/check-definitions.mjs --all
import { readFileSync } from "node:fs";

const glossaryPath = new URL("../src/i18n/glossary.json", import.meta.url);
const glossary = JSON.parse(readFileSync(glossaryPath, "utf8"));
const arg = process.argv[2];
if (!arg) {
  console.error("usage: node scripts/check-definitions.mjs <key,key,...|--all>");
  process.exit(1);
}

const keys = arg === "--all" ? Object.keys(glossary) : arg.split(",").map((k) => k.trim()).filter(Boolean);
const missing = [];
for (const k of keys) {
  const e = glossary[k];
  if (!e) { missing.push(`${k} (absent)`); continue; }
  const okEn = typeof e.defEn === "string" && e.defEn.trim() !== "";
  const okRu = typeof e.defRu === "string" && e.defRu.trim() !== "";
  if (!okEn || !okRu) missing.push(`${k} (${!okEn ? "no defEn" : ""}${!okEn && !okRu ? ", " : ""}${!okRu ? "no defRu" : ""})`);
}
if (arg === "--all") {
  const done = keys.length - missing.length;
  console.log(`glossary: ${done}/${keys.length} terms have EN+RU definitions`);
}
if (missing.length) {
  console.error(`MISSING (${missing.length}):\n  ` + missing.join("\n  "));
  process.exit(1);
}
console.log(`OK — ${keys.length} term(s) have EN+RU definitions`);
```

- [ ] **Step 6: Smoke-test `check-definitions.mjs`**

Run: `cd site && node scripts/check-definitions.mjs --all`
Expected: prints `glossary: 132/571 terms have EN+RU definitions`, then exits non-zero listing the 439 missing. This confirms the script reads the file and counts correctly. (Non-zero exit is expected here — the backfill has not started.)

- [ ] **Step 7: Commit**

```bash
git add site/scripts/merge-definitions.mjs site/scripts/merge-definitions.test.mjs site/scripts/check-definitions.mjs
git commit -m "feat(glossary): backfill tooling — merge + check definition scripts"
```

---

## Per-Batch Task Procedure

**Tasks 2–31 are 30 batches. Every batch task follows this exact procedure.** Each batch task below states only its batch number and its ~15 term keys; apply this procedure to them.

For batch `BNN` with key list `K`:

1. **Read context.** Open `site/src/i18n/glossary.json`. For each key in `K`, read its existing `en` and `ru` label — that is the term, and it disambiguates generic keys (e.g. `term` is the Raft leadership term; `frame` is a stack frame or a network frame — the `en` label says which). Read 3–4 already-defined entries (`abstract_data_type`, `accumulator`, `advisory_lock`, `aries_wal`) to absorb the house style.

2. **Research each term.** For every key in `K`: run at least one WebSearch for the term (use the `en` label + a domain word, e.g. `"ARP networking protocol"`). For terms that name a library, framework, RFC, or spec (e.g. `tanstack_query`, `debezium`, `quic`), also resolve and query Context7. Confirm the mechanism, the one tradeoff or number that matters, and the failure mode.

3. **Author `defEn`.** 1–3 sentences. Plain enough for a learner, accurate enough for a senior engineer — say what the term *is*, then the single thing that matters about it (mechanism, tradeoff, or why it exists). Match the existing entries' tone: declarative, concrete, no marketing words, no "simply"/"just". No trailing fluff. Roughly 12–45 words.

4. **Author `defRu`.** A faithful translation of `defEn` — same meaning, same length class. Follow the RU conventions already in `glossary.json`: keep established English technical forms where the existing RU definitions do (e.g. `cache`, `commit`, `replica` are often left in Latin script per the file's existing choices — match neighbours). No CJK characters (a build linter rule `cjk-leak` rejects them). Use correct Russian orthography including ё where appropriate.

5. **Write the patch file.** Create `/tmp/glossary-patch-BNN.json` — a JSON object `{ "<key>": { "defEn": "...", "defRu": "..." }, ... }` with one entry per key in `K`. Every key in `K` must be present.

6. **Merge.** Run `cd site && node scripts/merge-definitions.mjs /tmp/glossary-patch-BNN.json`. Expected output: `merged 15 definitions into glossary.json` (count = size of `K`). If it throws, fix the patch file and re-run.

7. **Validate.** Run `cd site && node scripts/check-definitions.mjs <comma-joined K>`. Expected: `OK — N term(s) have EN+RU definitions`. Also confirm `git diff --stat site/src/i18n/glossary.json` shows only that file changed.

8. **Commit.**
   ```bash
   git add site/src/i18n/glossary.json
   git commit -m "content(glossary): definitions batch BNN — <domain>"
   ```

**Quality bar for review:** the spec-compliance reviewer verifies all ~15 keys in `K` now have non-empty `defEn`+`defRu` and no other keys changed. The code-quality reviewer reads the definitions themselves and flags any that are inaccurate, misleading, circular ("an X is an X"), off-topic for the curriculum's meaning of the term, or whose RU drifts from the EN. Inaccurate definitions are correctness bugs — fix and re-review.

---

## Tasks 2–31: Definition Batches

Each task: apply the **Per-Batch Task Procedure** above to the listed keys.

### Task 2 — Batch B01 (networking)
Keys: `0rtt, 1rtt, ack, anycast, arp, backhaul, bandwidth_delay_product, bgp, cable, cdn, congestion_control, congestion_window, connection_migration, datagram, dns_query`

### Task 3 — Batch B02 (networking)
Keys: `dnssec, doh, doq, dscp, ecmp, fec, firewall, forced_sync_layout, forwarding_table, frame_http, geodns, handshake, header_compression, hpack, https_record`

### Task 4 — Batch B03 (networking)
Keys: `icmp, ipc, isn, keep_alive, modulation, mss, mtu, nameserver, packet, pmtud, qam, qpack, quic, quicksort, retransmission`

### Task 5 — Batch B04 (networking)
Keys: `retransmit, router, routing_table, rrsig, rtt, server_push, soa, stateless_reset, svcb, syn, syn_cookies, tcp_segment, tfo, tld, wire`

### Task 6 — Batch B05 (databases)
Keys: `autovacuum, backend_xmin, bloat, commit_index, cursor_pagination, deadlock, dual_write, expand-contract_migration, for_update, hot_shard, hot_update, index, isolation_level, kafka_transactions, lost_update`

### Task 7 — Batch B06 (databases)
Keys: `pg_repack, phantom_read, predicate_lock, query_cost, read_committed, read_index, repeatable_read, replicated_state_machine, row_estimate_disaster, serializable, serialization_failure, snapshot_isolation, ssi, stream_isolation, tanstack_query`

### Task 8 — Batch B07 (databases / algorithms)
Keys: `transaction-mode_pool, transactional_outbox, tuple, vacuum, vacuum_full, visibility_timeout, wall_clock, write_ahead_log, write_skew, xmax, xmin, xmin_horizon, adaptive_sort, array, asymptotic`

### Task 9 — Batch B08 (algorithms)
Keys: `basic_operation, big_o, binary_search, bubble_sort, complexity_scoring, constant_time, dead_letter_queue, depth_limit, divide_and_conquer, dlq, dominant_term, dynamic_array, exponential_backoff, exponential_output, exponential_time`

### Task 10 — Batch B09 (algorithms)
Keys: `factorial_output, factorial_time, fast_slow, fib, flame_graph, graphql, graphql_introspection, graphql_resolver, growth_rate, hash_function, hash_map, hash_set, hash_table, in_place, in_place_sort`

### Task 11 — Batch B10 (algorithms)
Keys: `insertion_sort, linear_time, list_depth, logarithmic_time, loop_invariant, merge, merge_sort, monotonic_predicate, opposite_ends, par, partition, permutation, pivot, power_set, preprocessing`

### Task 12 — Batch B11 (algorithms / security)
Keys: `quadratic_time, render_tree, selection_sort, sliding_window, sorted, sorting, stable_sort, stack_frame, stack_overflow, subset, two_pointers, worst_case, access_token, alpn, audience`

### Task 13 — Batch B12 (security)
Keys: `authorization_code, authorize_endpoint, bearer_token, certificate, cipher_suite, client_credentials, client_secret, code_challenge, code_verifier, consent, crlite, device_code, dpop, ecdhe, ech`

### Task 14 — Batch B13 (security)
Keys: `fapi_2, fencing_token, forward_secrecy, grease, hkdf, hpkp, hsm, hsts, id_token, implicit_grant, introspection, issuer, ja3, ja4, jwks`

### Task 15 — Batch B14 (security)
Keys: `jwt, ktls, ml_kem, mtls_bound, must_staple, nonce, oauth, ocsp, oidc, pfs, pkce, psk, redirect_uri, refresh_rotation, refresh_token`

### Task 16 — Batch B15 (security / browser)
Keys: `replay_attack, resource_indicators, sender_constrained, session_ticket, sni, spiffe, spire, stek, sub_claim, tls, token_endpoint, x25519_mlkem768, compositor_thread, cssom, decorrelated_jitter`

### Task 17 — Batch B16 (browser)
Keys: `deoptimization, dom, fcp, feedback_vector, fetch_waterfall, fiber, frame, full_jitter, hidden_class, hydration, hydration_mismatch, ignition, inline_cache, isolate, jit_warmup`

### Task 18 — Batch B17 (browser)
Keys: `jitter, layer, layout, layout_thrash, lcp, maglev, megamorphic, monomorphic, orinoco, paint, polymorphic, raster, reflow, repaint, rsc`

### Task 19 — Batch B18 (browser / distributed)
Keys: `rsc_payload, scavenger, server_function, sparkplug, ssg, ssr, style_recalc, suspense, ttfb, ttl_jitter, turbofan, use_client, will_change, append_entries, at_least_once`

### Task 20 — Batch B19 (distributed)
Keys: `at_most_once, byzantine_fault, cft, consensus, consumer_group, debezium, delivery_semantics, effectively_once, election_safety, election_timeout, exactly_once, exactly_once_processing, follower, heartbeat, idempotency`

### Task 21 — Batch B20 (distributed)
Keys: `idempotency_key, idempotent_producer, inbox_pattern, install_snapshot, isr, joint_consensus, kafka_idempotent_producer, kip_98, leader_append_only, leader_completeness, leader_lease, learner, log_matching, metastable_failure, multi_paxos`

### Task 22 — Batch B21 (distributed)
Keys: `multi_raft, paxos, poison_pill, pre_vote, quorum, raft, rebalancing, redrive, request_vote, split_brain, state_machine, state_machine_safety, term, timeout_now, two_generals`

### Task 23 — Batch B22 (caching)
Keys: `cache_control, cache_hit, cache_key, cache_line, cache_locality, cache_miss, cache_stampede, edge_worker, esi, l1_cache, l2_cache, l3_cache, memcache_lease, mesi, negative_caching`

### Task 24 — Batch B23 (caching / apis)
Keys: `origin_shield, request_coalescing, request_collapsing, setnx, single_flight, stale_if_error, swr, swr_library, thundering_herd, ttl, xfetch, apollo_federation, apq, batch_load_fn, circuit_breaker`

### Task 25 — Batch B24 (apis)
Keys: `dataloader, entities_field, max_receive_count, n_plus_one, operation_batching, persisted_queries, recursive_resolver, resolve_reference, resolver, resolver_lookahead, retry_after, retry_budget, retry_storm, subgraph, supergraph`

### Task 26 — Batch B25 (apis / observability)
Keys: `trusted_documents, baseline_profile, coding_gain, continuous_profiling, cum_time, ebpf, hotspot, instrumentation_profiler, macrobenchmark, microbenchmark, observer_effect, off_cpu_profile, operations_per_second, perf_counter, perf_event_open`

### Task 27 — Batch B26 (observability / systems)
Keys: `pgo, pprof, profile, pyroscope, rum, sampling_profiler, self_time, signal_to_noise_ratio, step_count, time_budget, amdahl_law, branch_misprediction, branch_prediction, contiguous_memory, false_sharing`

### Task 28 — Batch B27 (systems / misc)
Keys: `numa, prefetch, prefetcher, simd, smi, tlb, algorithm, alias_bomb, authoritative, candidate, co-location, collision, composite, concatenation, connection_storm`

### Task 29 — Batch B28 (misc)
Keys: `constraint, correctness, dot, duplicate_detection, edge_case, encapsulation, feasibility_check, fifo, fingerprint, header, immutable, input_bound, input_output, jar, latency`

### Task 30 — Batch B29 (misc)
Keys: `multiplexing, nd, optimistic_update, pipelining, pop, premature_optimisation, radio, sequence_number, shared_tenant_proxy, snapshot, specification, state, statefulness, stream, string`

### Task 31 — Batch B30 (misc)
Keys: `subarray, throughput, vary_header, window`

---

## Task 32: Final verification

**Files:**
- Modify: `docs/open-atlas/HANDOFF.md`

- [ ] **Step 1: Verify every term is defined**

Run: `cd site && node scripts/check-definitions.mjs --all`
Expected: `glossary: 571/571 terms have EN+RU definitions` and `OK — 571 term(s) have EN+RU definitions`, exit 0.

- [ ] **Step 2: Full build + lint**

Run: `cd site && bun run build`
Expected: build completes (~1627 pages); `dist/lint-report.json` is `{"errors":[],"warnings":[]}`. The `i18n-parity` and `cjk-leak` lint rules cover glossary EN/RU — a clean report confirms parity and no CJK leak in the new RU definitions.

- [ ] **Step 3: Spot-check rendered hubs**

Start the `atlas-preview` server (serves `site/dist` on port 4400). Open three hubs that were definition-pending before this plan, one from different batches — e.g. `/en/glossary/ack/`, `/en/glossary/raft/`, `/en/glossary/numa/`. Verify each now shows a real definition (no "Definition pending" notice). Open the RU equivalents (`/ru/glossary/ack/` etc.) and verify the RU definition renders.

- [ ] **Step 4: Update the handoff**

In `docs/open-atlas/HANDOFF.md`: move the glossary backfill out of the Work queue into "Built so far" (the glossary is now complete — all 571 terms defined). Renumber the remaining queue items. Note the `seeAlso` field is still unpopulated (optional, future polish — not a blocker).

- [ ] **Step 5: Commit**

```bash
git add docs/open-atlas/HANDOFF.md
git commit -m "docs(open-atlas): glossary backfill complete, update handoff"
```

---

## Self-Review

**Spec coverage** (spec section 7, plan 2):
- "Author `defEn` + `defRu` for the 439 terms" — Tasks 2–31 cover all 439 keys across 30 batches (verified: the batch key lists sum to 439). ✓
- "1–3 sentences, senior-fullstack depth bar, EN/RU parity, consistent with conventions" — encoded in the Per-Batch Task Procedure steps 3–4 and the review quality bar. ✓
- "Batched and dispatched to parallel subagents, grouped by domain" — 30 domain-grouped batches. NOTE: executed sequentially, not in parallel, because all batches write the single `glossary.json`; subagent-driven dispatches one task at a time, which removes the write-conflict risk. This is a deliberate, documented refinement of the spec's wording. ✓
- "`seeAlso` for key terms" — the spec lists this under plan 2. It is intentionally deferred: `seeAlso` is optional, the page already handles its absence, and authoring it well needs the full glossary to exist first. Task 32 step 4 records it as remaining future polish. If the user wants it in scope, add a follow-up task per domain. ✓ (documented gap)

**Placeholder scan:** No TBD/TODO. The per-batch procedure is defined once in full; each batch task gives its exact, complete key list. Tooling steps have complete code and exact commands with expected output. ✓

**Type consistency:** `applyPatch(glossary, patch)` defined in Task 1, used by `merge-definitions.mjs` CLI and referenced by every batch task's procedure step 6. The patch shape `{ key: { defEn, defRu } }` is consistent across Task 1 (tests + code), the procedure (step 5), and `check-definitions.mjs`. Batch counts: 30 batches, key lists sum to 439, matching `check-definitions.mjs --all` start count (132 done, 439 missing, 571 total). ✓
