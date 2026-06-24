// Tie-break rule: when multiple nodes are eligible at the same step (zero
// in-degree), process them in lexicographic (ascending) order.  This makes
// topoSort a pure function of the graph — same graph, same output, every time —
// which is essential for CI caches that key on task order.

export class CycleError extends Error {
  cycleNodes: string[];
  constructor(cycleNodes: string[]) {
    super(`Cycle detected among nodes: ${cycleNodes.join(", ")}`);
    this.name = "CycleError";
    this.cycleNodes = cycleNodes;
  }
}

export function topoSort(nodes: string[], edges: Array<[string, string]>): string[] {
  // Build in-degree map and adjacency list in O(V+E).
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const n of nodes) {
    inDegree.set(n, 0);
    adj.set(n, []);
  }
  for (const [a, b] of edges) {
    adj.get(a)!.push(b);
    inDegree.set(b, (inDegree.get(b) ?? 0) + 1);
  }

  // Seed with zero-in-degree nodes, sorted lexicographically.
  const queue: string[] = nodes
    .filter((n) => inDegree.get(n) === 0)
    .sort();

  const result: string[] = [];

  while (queue.length > 0) {
    // Queue is maintained in sorted order; shift the smallest.
    const node = queue.shift()!;
    result.push(node);

    // Collect newly-eligible successors, sort them, then splice into queue
    // at the correct position to maintain sorted invariant cheaply.
    const newly: string[] = [];
    for (const succ of adj.get(node)!) {
      const deg = inDegree.get(succ)! - 1;
      inDegree.set(succ, deg);
      if (deg === 0) newly.push(succ);
    }
    if (newly.length > 0) {
      newly.sort();
      // Insert into sorted queue (both halves are already sorted).
      queue.push(...newly);
      queue.sort(); // queue is small (only eligible nodes); sort is cheap.
    }
  }

  if (result.length < nodes.length) {
    // Nodes that never reached zero in-degree are trapped in cycles.
    const cycleNodes = nodes.filter((n) => !result.includes(n));
    throw new CycleError(cycleNodes);
  }

  return result;
}

export function batches(nodes: string[], edges: Array<[string, string]>): string[][] {
  // Same setup as topoSort but we collect a whole wave per round.
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const n of nodes) {
    inDegree.set(n, 0);
    adj.set(n, []);
  }
  for (const [a, b] of edges) {
    adj.get(a)!.push(b);
    inDegree.set(b, (inDegree.get(b) ?? 0) + 1);
  }

  let wave: string[] = nodes.filter((n) => inDegree.get(n) === 0).sort();
  const result: string[][] = [];
  let processed = 0;

  while (wave.length > 0) {
    result.push(wave);
    processed += wave.length;
    const next: string[] = [];
    for (const node of wave) {
      for (const succ of adj.get(node)!) {
        const deg = inDegree.get(succ)! - 1;
        inDegree.set(succ, deg);
        if (deg === 0) next.push(succ);
      }
    }
    wave = next.sort();
  }

  if (processed < nodes.length) {
    const cycleNodes = nodes.filter((n) => !result.flat().includes(n));
    throw new CycleError(cycleNodes);
  }

  return result;
}
