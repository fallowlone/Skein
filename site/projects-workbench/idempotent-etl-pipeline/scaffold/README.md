# Idempotent ETL pipeline — starter

Implement `src/etl.ts` until the acceptance suite passes:

    bun test

The suite is the honest version of "my pipeline works": it runs your load twice
and asserts the table is unchanged. It also pins the three subtler rules that make
re-runs safe in production —

- **In-batch duplicates collapse to the newest**, and the result does not depend
  on iteration order.
- **Older rows never overwrite newer ones**, so replaying an old batch cannot
  revert yesterday's corrections.
- **The watermark is inclusive and monotonic**: rows sharing the last timestamp
  tick are re-read (free, because the load is idempotent) rather than lost, and a
  late small batch cannot rewind progress.
- **A failed quality gate loads nothing and keeps the watermark**, so the next run
  retries the same window instead of skipping past bad data.

Green suite = the core is correct. Then take it to a real warehouse on the project
page: staging tables, a MERGE/upsert statement, durable watermark state, and the
backfill runbook.

---

Product milestones — see the project page for the full 5–5-step product brief (mechanism → tradeoff → failure mode → numbers):

1. **Ingest a source as a batch** (`batch-ingest`)
2. **Make the load idempotent** (`idempotent-load`)
3. **Go incremental with a watermark** (`incremental-watermark`)
4. **Gate the load with quality checks** (`data-quality-gates`)
5. **Backfill and late-arriving data** (`backfill-and-late-data`)

When the suite is green, read the project's `rubric` and `reference` on the site and push to the senior bar — the README checks the core, the project page checks the product.

