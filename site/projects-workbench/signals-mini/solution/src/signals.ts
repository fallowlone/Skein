// Synchronous push-pull reactive graph.
// Dependency tracking: a module-level observer stack captures reads.
// Computed: lazy + dirty-flag cached, marks subscribers dirty on source change.
// Effects: re-run when any direct or transitive source is dirtied, scheduled
//   into a flush queue rather than run inline so diamond graphs evaluate once.
// Batch: defers the flush until the outermost batch exits.

export interface Signal<T> {
  get(): T;
  set(v: T): void;
}

export interface Computed<T> {
  get(): T;
}

export type EffectFn = () => void;

// ---------------------------------------------------------------------------
// Internal node types
// ---------------------------------------------------------------------------

const enum NodeKind { Signal, Computed, Effect }

interface BaseNode {
  kind: NodeKind;
  // Nodes that read this node (downstream subscribers).
  subscribers: Set<ComputedNode<unknown> | EffectNode>;
}

interface SignalNode<T> extends BaseNode {
  kind: NodeKind.Signal;
  value: T;
}

interface ComputedNode<T> extends BaseNode {
  kind: NodeKind.Computed;
  fn: () => T;
  value: T | undefined;
  dirty: boolean;
  // Nodes this computed reads (upstream sources).
  sources: Set<SignalNode<unknown> | ComputedNode<unknown>>;
}

interface EffectNode extends BaseNode {
  kind: NodeKind.Effect;
  fn: EffectFn;
  sources: Set<SignalNode<unknown> | ComputedNode<unknown>>;
  scheduled: boolean;
}

// ---------------------------------------------------------------------------
// Global scheduler state
// ---------------------------------------------------------------------------

/** Stack of currently-executing observers (effects or computeds being evaluated). */
const observerStack: Array<ComputedNode<unknown> | EffectNode> = [];

/** Pending effect queue; flushed at the end of the outermost batch. */
const pendingEffects: Set<EffectNode> = new Set();

/** Nesting depth of active batch() calls. 0 = no active batch. */
let batchDepth = 0;

// ---------------------------------------------------------------------------
// Tracking helpers
// ---------------------------------------------------------------------------

function trackRead(source: SignalNode<unknown> | ComputedNode<unknown>): void {
  const observer = observerStack[observerStack.length - 1];
  if (!observer) return;
  source.subscribers.add(observer as ComputedNode<unknown> | EffectNode);
  (observer as EffectNode).sources.add(source);
}

function scheduleEffect(e: EffectNode): void {
  if (e.scheduled) return;
  e.scheduled = true;
  pendingEffects.add(e);
  // Do NOT flush here — caller (set/batch) flushes after all propagation is done.
}

function markDirty(node: ComputedNode<unknown> | EffectNode): void {
  if (node.kind === NodeKind.Computed) {
    if (node.dirty) return; // already propagated
    node.dirty = true;
    for (const sub of node.subscribers) markDirty(sub);
  } else {
    scheduleEffect(node);
  }
}

function flush(): void {
  // Drain the queue; effects may schedule further effects (run until stable).
  while (pendingEffects.size > 0) {
    const batch = [...pendingEffects];
    pendingEffects.clear();
    for (const e of batch) {
      runEffect(e);
    }
  }
}

// ---------------------------------------------------------------------------
// Running an effect (clears old sources, re-subscribes via read tracking)
// ---------------------------------------------------------------------------

function runEffect(e: EffectNode): void {
  e.scheduled = false;
  // Clear previous subscriptions (enables dynamic dependency cleanup).
  for (const src of e.sources) {
    src.subscribers.delete(e as unknown as ComputedNode<unknown> | EffectNode);
  }
  e.sources.clear();

  observerStack.push(e as unknown as ComputedNode<unknown>);
  try {
    e.fn();
  } finally {
    observerStack.pop();
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function signal<T>(initialValue: T): Signal<T> {
  const node: SignalNode<T> = {
    kind: NodeKind.Signal,
    value: initialValue,
    subscribers: new Set(),
  };
  return {
    get(): T {
      trackRead(node as SignalNode<unknown>);
      return node.value;
    },
    set(v: T): void {
      if (Object.is(node.value, v)) return;
      node.value = v;
      // Snapshot subscribers before iterating (set may mutate during flush).
      const subs = [...node.subscribers];
      for (const sub of subs) markDirty(sub);
      if (batchDepth === 0) flush();
    },
  };
}

export function computed<T>(fn: () => T): Computed<T> {
  const node: ComputedNode<T> = {
    kind: NodeKind.Computed,
    fn,
    value: undefined,
    dirty: true, // lazy: evaluate on first read
    subscribers: new Set(),
    sources: new Set(),
  };

  return {
    get(): T {
      trackRead(node as unknown as SignalNode<unknown>);
      if (node.dirty) {
        // Clear stale sources before re-evaluating.
        for (const src of node.sources) {
          src.subscribers.delete(node as unknown as ComputedNode<unknown>);
        }
        node.sources.clear();

        observerStack.push(node as unknown as ComputedNode<unknown>);
        try {
          node.value = node.fn();
        } finally {
          observerStack.pop();
        }
        node.dirty = false;
      }
      return node.value as T;
    },
  };
}

export function effect(fn: EffectFn): void {
  const e: EffectNode = {
    kind: NodeKind.Effect,
    fn,
    subscribers: new Set(), // effects have no downstream subscribers
    sources: new Set(),
    scheduled: false,
  };
  // Run immediately (registration run).
  runEffect(e);
}

export function batch(fn: () => void): void {
  batchDepth++;
  try {
    fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) flush();
  }
}
