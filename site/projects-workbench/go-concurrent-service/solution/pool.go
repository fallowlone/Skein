// Package ingest holds the concurrency core of the service: bounded admission,
// load shedding, context-aware retries, and a shutdown that finishes in-flight work.
//
// Each piece exists because of one specific production failure:
//
//   - Pool with a fixed worker count and a buffered queue: an unbounded channel
//     swallows a spike until memory dies, and answers every caller too late to matter.
//   - TrySubmit returning false instead of blocking: shedding is a decision you make
//     on purpose; blocking is one you discover at 3am.
//   - CallWithRetry deriving each attempt's deadline from the caller's context: retries
//     that ignore the request budget turn one slow dependency into a pinned pool.
//   - Shutdown draining: SIGTERM must finish accepted work, not drop it.
package ingest

import (
	"context"
	"errors"
	"sync"
	"time"
)

// ErrQueueFull is returned when admission sheds instead of queueing.
var ErrQueueFull = errors.New("queue full: shedding")

// Job is a unit of accepted work.
type Job func(ctx context.Context)

// Pool is a fixed set of workers fed by a bounded queue.
type Pool struct {
	queue   chan Job
	wg      sync.WaitGroup
	closing chan struct{}

	mu       sync.Mutex
	shed     int
	accepted int
	done     int
	closed   bool
}

// NewPool starts `workers` goroutines behind a queue of `capacity` slots.
func NewPool(workers, capacity int) *Pool {
	if workers <= 0 {
		panic("workers must be positive")
	}
	if capacity < 0 {
		panic("capacity must not be negative")
	}
	p := &Pool{
		queue:   make(chan Job, capacity),
		closing: make(chan struct{}),
	}
	for i := 0; i < workers; i++ {
		p.wg.Add(1)
		go p.worker()
	}
	return p
}

func (p *Pool) worker() {
	defer p.wg.Done()
	for job := range p.queue {
		job(context.Background())
		p.mu.Lock()
		p.done++
		p.mu.Unlock()
	}
}

// TrySubmit enqueues without blocking. It returns ErrQueueFull when the queue is
// full — the caller turns that into a 503 with a Retry-After rather than a request
// that hangs until the client gives up.
func (p *Pool) TrySubmit(job Job) error {
	p.mu.Lock()
	if p.closed {
		p.mu.Unlock()
		return errors.New("pool is shutting down")
	}
	p.mu.Unlock()

	select {
	case p.queue <- job:
		p.mu.Lock()
		p.accepted++
		p.mu.Unlock()
		return nil
	default:
		p.mu.Lock()
		p.shed++
		p.mu.Unlock()
		return ErrQueueFull
	}
}

// Stats reports admission counters.
func (p *Pool) Stats() (accepted, shed, done int) {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.accepted, p.shed, p.done
}

// Shutdown stops accepting work, then waits for accepted work to finish.
// Returns false if the drain did not complete before ctx expired.
func (p *Pool) Shutdown(ctx context.Context) bool {
	p.mu.Lock()
	if p.closed {
		p.mu.Unlock()
		return true
	}
	p.closed = true
	p.mu.Unlock()

	close(p.queue)

	finished := make(chan struct{})
	go func() {
		p.wg.Wait()
		close(finished)
	}()

	select {
	case <-finished:
		return true
	case <-ctx.Done():
		return false
	}
}

// CallWithRetry retries `call` with exponential backoff, never outliving ctx.
//
// Two rules keep retries from making an outage worse:
//   - every attempt's deadline comes from the CALLER's remaining budget, so three
//     retries cannot triple a request's latency;
//   - a cancelled context stops immediately — retrying work nobody is waiting for is
//     pure load against a dependency that is already failing.
func CallWithRetry(
	ctx context.Context,
	attempts int,
	backoff time.Duration,
	call func(ctx context.Context) error,
) error {
	if attempts <= 0 {
		return errors.New("attempts must be positive")
	}
	var lastErr error
	for i := 0; i < attempts; i++ {
		if err := ctx.Err(); err != nil {
			if lastErr != nil {
				return lastErr
			}
			return err
		}
		lastErr = call(ctx)
		if lastErr == nil {
			return nil
		}
		if i == attempts-1 {
			break
		}
		wait := backoff * (1 << i)
		timer := time.NewTimer(wait)
		select {
		case <-timer.C:
		case <-ctx.Done():
			timer.Stop()
			return lastErr
		}
	}
	return lastErr
}
