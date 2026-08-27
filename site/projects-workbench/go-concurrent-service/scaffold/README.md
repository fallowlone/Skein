# Concurrent Go service — starter

Implement `pool.go` until the acceptance suite passes:

    go test ./...

Standard library only. The suite is about the four behaviours that decide whether a
Go service survives its own traffic:

- **Shed, don't buffer.** A full queue returns `ErrQueueFull` immediately so the
  handler can answer 503 with a `Retry-After`. An unbounded channel converts a
  latency problem into a memory problem and replies too late to be useful.
- **Bounded concurrency.** Live workers never exceed the configured count.
- **Draining shutdown.** SIGTERM finishes accepted work; a second `Shutdown` is a
  no-op, and a submit afterwards fails instead of panicking on a closed channel.
- **Retries inside the caller's budget.** Each attempt's deadline comes from the
  request context, and a cancelled context stops the loop at once — retrying work
  nobody awaits is pure load on a dependency that is already failing.

Green suite = the concurrency core is right. Then build the service on the project
page: the HTTP intake, `log/slog` with a trace id, pprof and metrics endpoints, a
distroless image, and the goroutine-leak post-mortem.

---

Product milestones — see the project page for the full 5–8-step product brief (mechanism → tradeoff → failure mode → numbers):

1. **Frame the service: load, SLOs, concurrency budget** (`frame`)
2. **Build the HTTP intake and a bounded worker pool** (`intake-and-pool`)
3. **Apply backpressure: shed load instead of buffering forever** (`backpressure`)
4. **Make downstream calls survive: timeouts, retries, cancellation** (`resilience`)
5. **Instrument it: structured logs, pprof, metrics** (`observe`)
6. **Drain on shutdown: finish in-flight work, lose nothing** (`graceful-shutdown`)
7. **Containerize small and deploy with health + lifecycle** (`containerize-and-deploy`)
8. **Survive a goroutine leak, then write the post-mortem** (`incident-and-postmortem`)

When the suite is green, read the project's `rubric` and `reference` on the site and push to the senior bar — the README checks the core, the project page checks the product.

