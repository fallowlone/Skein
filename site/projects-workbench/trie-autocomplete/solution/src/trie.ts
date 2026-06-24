// Node design: Map<string, TrieNode> for open-alphabet children.
// Memory per interior node ≈ 96–128 bytes on V8 (Map overhead + 3 fields).
// Weight is stored on the terminal node (isEnd === true), not on edges,
// because a single edge is shared by all words that pass through it.
//
// No subtree-max cache here (see senior stretch). Every autocomplete call
// runs a full DFS over the subtree. For k << N the O(N log k) heap variant
// avoids materialising all candidates — see the comment in autocomplete().

interface TrieNode {
  children: Map<string, TrieNode>;
  isEnd: boolean;
  weight: number;
}

function makeNode(): TrieNode {
  return { children: new Map(), isEnd: false, weight: 0 };
}

export class Trie {
  private root: TrieNode = makeNode();

  // O(k) — k = word.length. Overwrites weight on duplicate insert.
  insert(word: string, weight = 1): void {
    let node = this.root;
    for (const ch of word) {
      let child = node.children.get(ch);
      if (!child) { child = makeNode(); node.children.set(ch, child); }
      node = child;
    }
    node.isEnd = true;
    node.weight = weight; // overwrite, never accumulate
  }

  // O(k). Returns true only when the terminal node has isEnd === true.
  has(word: string): boolean {
    const node = this.walk(word);
    return node !== null && node.isEnd;
  }

  // O(k). Returns true when the prefix node exists, regardless of isEnd.
  startsWith(prefix: string): boolean {
    return this.walk(prefix) !== null;
  }

  // O(prefix + subtree * log k) with sort; O(N log k) with a heap.
  // Naive sort-all is implemented here; the heap variant is the senior stretch.
  //
  // O(N log k) heap alternative: maintain a min-heap of size k during DFS,
  // comparing by (weight ASC, word DESC) so the heap root is the weakest
  // candidate. Push each terminal; pop when size > k. Avoids the full sort.
  autocomplete(prefix: string, k: number): string[] {
    const node = this.walk(prefix);
    if (node === null) return [];
    const candidates: Array<[string, number]> = [];
    this.collect(node, prefix, candidates);
    candidates.sort(([wordA, wA], [wordB, wB]) =>
      wB !== wA ? wB - wA : wordA < wordB ? -1 : wordA > wordB ? 1 : 0
    );
    return candidates.slice(0, k).map(([w]) => w);
  }

  // Walk the trie for `s`; return the final node or null if path breaks.
  private walk(s: string): TrieNode | null {
    let node: TrieNode = this.root;
    for (const ch of s) {
      const child = node.children.get(ch);
      if (!child) return null;
      node = child;
    }
    return node;
  }

  // DFS: accumulate (word, weight) pairs reachable from `node`.
  // Building the word string on the way down avoids O(depth) reconstruction.
  private collect(
    node: TrieNode,
    prefix: string,
    out: Array<[string, number]>
  ): void {
    if (node.isEnd) out.push([prefix, node.weight]);
    for (const [ch, child] of node.children) {
      this.collect(child, prefix + ch, out);
    }
  }
}
