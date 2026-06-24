/** A Huffman tree node. Leaf nodes have `symbol` set; internal nodes do not. */
export type HuffTree =
  | { kind: "leaf"; symbol: string; freq: number }
  | { kind: "internal"; freq: number; left: HuffTree; right: HuffTree };

// ─── min-heap ────────────────────────────────────────────────────────────────

/** Returns the lexicographically smallest symbol reachable from the subtree. */
function minSymbol(t: HuffTree): string {
  if (t.kind === "leaf") return t.symbol;
  // Both children always exist for internal nodes.
  const l = minSymbol(t.left);
  const r = minSymbol(t.right);
  return l < r ? l : r;
}

/**
 * Deterministic comparator.
 * Primary key: freq ascending.
 * Tie-break: lexicographically smallest reachable symbol ascending.
 * This guarantees a reproducible tree regardless of insertion order.
 */
function cmp(a: HuffTree, b: HuffTree): number {
  if (a.freq !== b.freq) return a.freq - b.freq;
  const sa = minSymbol(a);
  const sb = minSymbol(b);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

class MinHeap {
  private data: HuffTree[] = [];

  push(node: HuffTree): void {
    this.data.push(node);
    this.bubbleUp(this.data.length - 1);
  }

  pop(): HuffTree {
    const top = this.data[0];
    const last = this.data.pop()!;
    if (this.data.length > 0) {
      this.data[0] = last;
      this.sinkDown(0);
    }
    return top;
  }

  get size(): number { return this.data.length; }

  private bubbleUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (cmp(this.data[i], this.data[parent]) < 0) {
        [this.data[i], this.data[parent]] = [this.data[parent], this.data[i]];
        i = parent;
      } else break;
    }
  }

  private sinkDown(i: number): void {
    const n = this.data.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && cmp(this.data[l], this.data[smallest]) < 0) smallest = l;
      if (r < n && cmp(this.data[r], this.data[smallest]) < 0) smallest = r;
      if (smallest === i) break;
      [this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]];
      i = smallest;
    }
  }
}

// ─── public API ──────────────────────────────────────────────────────────────

/**
 * Build a Huffman tree from a frequency map.
 * Tie-breaking: lower minSymbol wins (deterministic, documented).
 * Single-distinct-symbol: returns the leaf directly.
 */
export function build(freqs: Record<string, number>): HuffTree {
  const heap = new MinHeap();
  for (const [symbol, freq] of Object.entries(freqs)) {
    heap.push({ kind: "leaf", symbol, freq });
  }

  // Edge case: only one distinct symbol — no merge needed.
  if (heap.size === 1) return heap.pop();

  while (heap.size > 1) {
    const left = heap.pop();
    const right = heap.pop();
    heap.push({
      kind: "internal",
      freq: left.freq + right.freq,
      left,
      right,
    });
  }

  return heap.pop();
}

/**
 * Derive the prefix-free code table by DFS.
 * Left child → append "0"; right child → append "1".
 * Single-symbol root (leaf): assign "0".
 */
export function codes(tree: HuffTree): Record<string, string> {
  const table: Record<string, string> = {};

  function dfs(node: HuffTree, prefix: string): void {
    if (node.kind === "leaf") {
      // Single-symbol edge case: root is a leaf, assign "0".
      table[node.symbol] = prefix === "" ? "0" : prefix;
      return;
    }
    dfs(node.left, prefix + "0");
    dfs(node.right, prefix + "1");
  }

  dfs(tree, "");
  return table;
}

/**
 * Encode a string to a bit-string using a pre-built code table.
 */
export function encode(s: string, codeTable: Record<string, string>): string {
  let bits = "";
  for (const ch of s) bits += codeTable[ch];
  return bits;
}

/**
 * Decode a bit-string back to the original string by walking the Huffman tree.
 * Single-symbol tree (root is a leaf): emit the symbol for every bit.
 */
export function decode(bits: string, tree: HuffTree): string {
  // Single-symbol edge case: root is a leaf.
  if (tree.kind === "leaf") {
    // Each code bit represents one instance of the symbol.
    return tree.symbol.repeat(bits.length);
  }

  let result = "";
  let node: HuffTree = tree;
  for (const bit of bits) {
    if (node.kind === "internal") {
      node = bit === "0" ? node.left : node.right;
    }
    if (node.kind === "leaf") {
      result += node.symbol;
      node = tree; // reset to root
    }
  }
  return result;
}
