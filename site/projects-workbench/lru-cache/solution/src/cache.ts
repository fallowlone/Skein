interface Node<K, V> {
  key: K;
  value: V;
  prev: Node<K, V> | null;
  next: Node<K, V> | null;
}

function makeNode<K, V>(key: K, value: V): Node<K, V> {
  return { key, value, prev: null, next: null };
}

export class LRUCache<K, V> {
  private cap: number;
  private map: Map<K, Node<K, V>>;
  // Sentinel nodes — head.next = MRU, tail.prev = LRU
  private head: Node<K, V>;
  private tail: Node<K, V>;

  constructor(capacity: number) {
    this.cap = capacity;
    this.map = new Map();
    // Use null! casts only for sentinel construction; never exposed externally.
    this.head = { key: null as unknown as K, value: null as unknown as V, prev: null, next: null };
    this.tail = { key: null as unknown as K, value: null as unknown as V, prev: null, next: null };
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  /** Insert node immediately after head (MRU position). */
  private insertAtHead(node: Node<K, V>): void {
    node.next = this.head.next;
    node.prev = this.head;
    this.head.next!.prev = node;
    this.head.next = node;
  }

  /** Remove node from wherever it sits in the list. */
  private removeNode(node: Node<K, V>): void {
    node.prev!.next = node.next;
    node.next!.prev = node.prev;
  }

  /** Remove and return the LRU node (tail.prev). */
  private evictLRU(): Node<K, V> {
    const lru = this.tail.prev!;
    this.removeNode(lru);
    return lru;
  }

  get(key: K): V | undefined {
    const node = this.map.get(key);
    if (!node) return undefined;
    // Promote to MRU head.
    this.removeNode(node);
    this.insertAtHead(node);
    return node.value;
  }

  put(key: K, value: V): void {
    const existing = this.map.get(key);
    if (existing) {
      existing.value = value;
      this.removeNode(existing);
      this.insertAtHead(existing);
      return;
    }
    if (this.cap <= 0) return; // degenerate capacity=0: every put is a no-op
    if (this.map.size >= this.cap) {
      const lru = this.evictLRU();
      this.map.delete(lru.key);
    }
    const node = makeNode(key, value);
    this.map.set(key, node);
    this.insertAtHead(node);
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  get size(): number {
    return this.map.size;
  }
}
