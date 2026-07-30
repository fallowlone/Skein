"""Cancellation-correct async pipeline primitives.

The project's real lesson is not "use asyncio" — it is that an async service which
does not handle cancellation honestly degrades in ways CPU graphs cannot explain.
Every helper here exists because of one specific production failure:

* ``stage_with_timeout``  — an unbounded await lets one slow upstream pin a request
  slot forever; under load those slots are the whole capacity.
* ``fan_out``             — concurrency without a bound turns a traffic spike into a
  thundering herd against a dependency that is already struggling.
* ``shielded``            — cancelling mid-write leaves a half-applied side effect;
  some critical sections must survive the cancellation that reaches them.
* ``drain``               — a cancelled task that is never awaited is a leak: the
  loop keeps its frame alive and the leak shows up as p99 that never recovers.
"""

from __future__ import annotations

import asyncio
from typing import Any, Awaitable, Callable, Iterable, Sequence


class StageTimeout(Exception):
    """Raised when a single pipeline stage exceeds its own budget."""

    def __init__(self, stage: str, timeout: float) -> None:
        super().__init__(f"stage {stage!r} exceeded {timeout}s")
        self.stage = stage
        self.timeout = timeout


async def stage_with_timeout(stage: str, coro: Awaitable[Any], timeout: float) -> Any:
    """Bound one stage. On expiry the inner task is cancelled AND awaited.

    Awaiting the cancellation is the part people skip: ``task.cancel()`` only
    *requests* it, and returning before the task actually finishes leaves work
    running against state the caller has already torn down.
    """
    task = asyncio.ensure_future(coro)
    try:
        return await asyncio.wait_for(task, timeout=timeout)
    except asyncio.TimeoutError as exc:
        if not task.done():
            task.cancel()
            try:
                await task
            except (asyncio.CancelledError, Exception):
                pass
        raise StageTimeout(stage, timeout) from exc


async def fan_out(
    factories: Sequence[Callable[[], Awaitable[Any]]],
    limit: int,
) -> list[Any]:
    """Run coroutine factories with at most ``limit`` in flight.

    Factories rather than coroutines: a coroutine created up front is already
    allocated and can only be awaited once, so a bounded runner needs the ability to
    *start* work later.

    Results keep input order — a caller that has to re-sort by hand will eventually
    forget to.
    """
    if limit <= 0:
        raise ValueError("limit must be positive")

    results: list[Any] = [None] * len(factories)
    semaphore = asyncio.Semaphore(limit)

    async def run(index: int, factory: Callable[[], Awaitable[Any]]) -> None:
        async with semaphore:
            results[index] = await factory()

    await asyncio.gather(*(run(i, f) for i, f in enumerate(factories)))
    return results


async def shielded(coro: Awaitable[Any]) -> Any:
    """Let a critical section finish even if the caller is cancelled.

    Use it around the small window where abandoning halfway is worse than waiting:
    committing a transaction, releasing a lease. Everything else should stay
    cancellable — shielding broadly is how a service stops responding to SIGTERM.
    """
    return await asyncio.shield(coro)


async def drain(tasks: Iterable[asyncio.Task[Any]], timeout: float = 1.0) -> int:
    """Cancel and await every task; return how many were still running.

    A cancelled-but-unawaited task is a leak. This is the shutdown path that keeps a
    long-running process from accumulating dead frames.
    """
    pending = [t for t in tasks if not t.done()]
    for t in pending:
        t.cancel()
    if pending:
        await asyncio.wait(pending, timeout=timeout)
    return len(pending)


class Bulkhead:
    """Bounded admission with load shedding.

    Full means reject now, not queue forever: an unbounded queue converts a latency
    problem into a memory problem and answers every caller too late to be useful.
    """

    def __init__(self, capacity: int) -> None:
        if capacity <= 0:
            raise ValueError("capacity must be positive")
        self.capacity = capacity
        self.in_flight = 0
        self.shed = 0

    async def run(self, factory: Callable[[], Awaitable[Any]]) -> Any:
        if self.in_flight >= self.capacity:
            self.shed += 1
            raise RuntimeError("shed: at capacity")
        self.in_flight += 1
        try:
            return await factory()
        finally:
            self.in_flight -= 1
