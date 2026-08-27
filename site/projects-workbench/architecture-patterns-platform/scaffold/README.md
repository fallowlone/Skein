# B2B platform architecture — starter

This workbench grades **your architecture record**: the bounded contexts, what talks to
what, the patterns you chose, and the ADRs behind them.

1. Write it in `artifact/architecture.json`.
2. Run the checks:

       bun test

`src/architecture.ts` is the grader; you do not edit it. What ships in `artifact/` is
the architecture that gets drawn on a whiteboard and never reviewed: two services
sharing one database, no owners, "microservices" as a pattern with no problem, and an
ADR whose consequences section is empty.

The checks are the failures that turn microservices into a distributed monolith:

- **A shared datastore between contexts.** Two writers of one schema is one service
  with a network in the middle and nobody owning the migrations.
- **A synchronous cycle.** A ↔ B synchronous means neither can deploy or fail
  independently — the entire reason for splitting them is gone.
- **A synchronous call with no stated failure behaviour.** "What happens when it is
  down" is part of the design, not an operational detail discovered later.
- **A context with no owner**, because a boundary without ownership erodes at the first
  deadline.
- **A pattern with no problem and no cost.** CQRS, event sourcing, a mesh — each buys
  one property by giving up another. Name both.
- **An ADR with no consequences**, which is the section that makes it worth writing,
  and a superseded ADR must say which decision replaced it.

Green suite = the architecture survives a review. Building it is the rest of the
project.

---

Product milestones — see the project page for the full 5–5-step product brief (mechanism → tradeoff → failure mode → numbers):

1. **Map the bounded contexts and establish ubiquitous language** (`bounded-contexts-and-ubiquitous-language`)
2. **Choose a structural style for each bounded context** (`structural-style-per-context`)
3. **Decide the read/write and event strategy** (`read-write-and-event-strategy`)
4. **Choose a decomposition and avoid the distributed monolith** (`decomposition-avoid-distributed-monolith`)
5. **Justify with ADRs and a fitness function** (`adrs-and-fitness-functions`)

When the suite is green, read the project's `rubric` and `reference` on the site and push to the senior bar — the README checks the core, the project page checks the product.

