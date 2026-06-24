// ---------------------------------------------------------------------------
// Skip List — solution
// ---------------------------------------------------------------------------
// Key design decisions:
//   • Sentinel nodes (head key = -Infinity, tail key = +Infinity) bracket every
//     level so traversal always terminates cleanly without null guards.
//   • coinFlip is injected — never Math.random() — so the structure is fully
//     deterministic and unit-testable.
//   • The update[] vector (last node seen at each level during a search) enables
//     O(height) insert and delete without a second pass.
//   • currentLevel tracks the highest non-empty level; decremented on delete
//     when the top lane becomes empty.
// ---------------------------------------------------------------------------

interface SkipNode {
  key: number;
  forward: SkipNode[];
}

function makeNode(key: number, level: number): SkipNode {
  return { key, forward: new Array(level).fill(null as unknown as SkipNode) };
}

export class SkipList {
  private readonly coinFlip: () => boolean;
  private readonly maxLevel: number;
  private readonly head: SkipNode;
  private readonly tail: SkipNode;
  // Exposed as a public field so tests can inspect the high-water mark.
  currentLevel: number;

  constructor(coinFlip: () => boolean, maxLevel = 16) {
    this.coinFlip = coinFlip;
    this.maxLevel = maxLevel;
    this.tail = makeNode(Infinity, maxLevel);
    this.head = makeNode(-Infinity, maxLevel);
    // Every level of head initially points to tail — the empty list.
    for (let i = 0; i < maxLevel; i++) this.head.forward[i] = this.tail;
    this.currentLevel = 1;
  }

  // Generate the level for a new node: keep calling coinFlip while it returns
  // true (promote) and while we are under the maxLevel cap.
  private randomLevel(): number {
    let level = 1;
    while (level < this.maxLevel && this.coinFlip()) level++;
    return level;
  }

  // Walk from currentLevel down to 0, collecting the last node visited at
  // each level. This is the update[] vector shared by insert and delete.
  private buildUpdate(k: number): SkipNode[] {
    const update: SkipNode[] = new Array(this.maxLevel).fill(this.head);
    let current = this.head;
    for (let i = this.currentLevel - 1; i >= 0; i--) {
      while (current.forward[i].key < k) current = current.forward[i];
      update[i] = current;
    }
    return update;
  }

  insert(k: number): void {
    const update = this.buildUpdate(k);
    // Check if key already exists (ignore duplicates).
    if (update[0].forward[0].key === k) return;

    const level = this.randomLevel();
    // Extend the update vector with head for any new levels above currentLevel.
    if (level > this.currentLevel) {
      for (let i = this.currentLevel; i < level; i++) update[i] = this.head;
      this.currentLevel = level;
    }

    const node = makeNode(k, level);
    for (let i = 0; i < level; i++) {
      node.forward[i] = update[i].forward[i];
      update[i].forward[i] = node;
    }
  }

  has(k: number): boolean {
    let current = this.head;
    for (let i = this.currentLevel - 1; i >= 0; i--) {
      while (current.forward[i].key < k) current = current.forward[i];
    }
    return current.forward[0].key === k;
  }

  delete(k: number): boolean {
    const update = this.buildUpdate(k);
    const target = update[0].forward[0];
    if (target.key !== k) return false;

    // Unlink from every level the target occupies.
    for (let i = 0; i < this.currentLevel; i++) {
      if (update[i].forward[i] !== target) break;
      update[i].forward[i] = target.forward[i];
    }

    // Shrink currentLevel if top levels are now empty.
    while (this.currentLevel > 1 && this.head.forward[this.currentLevel - 1] === this.tail) {
      this.currentLevel--;
    }
    return true;
  }

  toArray(): number[] {
    const result: number[] = [];
    let node = this.head.forward[0];
    while (node !== this.tail) {
      result.push(node.key);
      node = node.forward[0];
    }
    return result;
  }
}
