export interface Cell {
  x: number;
  y: number;
}

export interface Grid {
  width: number;
  height: number;
  weight: (x: number, y: number) => number | null; // null = wall
}

export interface SearchResult {
  path: [number, number][] | null;
  cost: number;
  expanded: number;
}

// ── MinHeap ────────────────────────────────────────────────────────────────

export class MinHeap<T> {
  private _data: { priority: number; value: T }[] = [];

  push(value: T, priority: number): void {
    this._data.push({ priority, value });
    this._bubbleUp(this._data.length - 1);
  }

  pop(): { priority: number; value: T } | undefined {
    if (this._data.length === 0) return undefined;
    const top = this._data[0];
    const last = this._data.pop()!;
    if (this._data.length > 0) {
      this._data[0] = last;
      this._siftDown(0);
    }
    return top;
  }

  get size(): number {
    return this._data.length;
  }

  private _bubbleUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this._data[parent].priority <= this._data[i].priority) break;
      [this._data[parent], this._data[i]] = [this._data[i], this._data[parent]];
      i = parent;
    }
  }

  private _siftDown(i: number): void {
    const n = this._data.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      if (l < n && this._data[l].priority < this._data[smallest].priority) smallest = l;
      if (r < n && this._data[r].priority < this._data[smallest].priority) smallest = r;
      if (smallest === i) break;
      [this._data[smallest], this._data[i]] = [this._data[i], this._data[smallest]];
      i = smallest;
    }
  }
}

// ── parseGrid ─────────────────────────────────────────────────────────────

export function parseGrid(s: string): Grid {
  const rows = s.trimEnd().split("\n");
  const height = rows.length;
  const width = rows.reduce((m, r) => Math.max(m, r.length), 0);

  const cells: (number | null)[][] = rows.map((row) =>
    Array.from({ length: width }, (_, x) => {
      const ch = row[x] ?? ".";
      if (ch === "#") return null;
      const d = parseInt(ch, 10);
      if (!isNaN(d) && d >= 2 && d <= 9) return d;
      return 1; // '.', 'S', 'G', or any other non-wall char = weight 1
    })
  );

  return {
    width,
    height,
    weight: (x, y) => {
      if (x < 0 || x >= width || y < 0 || y >= height) return null;
      return cells[y][x];
    },
  };
}

// ── shared helpers ────────────────────────────────────────────────────────

const DIRS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function key(x: number, y: number): number {
  return y * 10000 + x;
}

function reconstructPath(
  prev: Map<number, [number, number] | null>,
  goal: [number, number]
): [number, number][] {
  const path: [number, number][] = [];
  let cur: [number, number] | null = goal;
  while (cur !== null) {
    path.push(cur);
    const p = prev.get(key(cur[0], cur[1]));
    cur = p === undefined ? null : p;
  }
  path.reverse();
  return path;
}

// ── BFS ───────────────────────────────────────────────────────────────────

export function bfs(grid: Grid, start: [number, number], goal: [number, number]): SearchResult {
  const startKey = key(start[0], start[1]);
  const goalKey = key(goal[0], goal[1]);

  if (grid.weight(start[0], start[1]) === null) return { path: null, cost: 0, expanded: 0 };
  if (grid.weight(goal[0], goal[1]) === null) return { path: null, cost: 0, expanded: 0 };

  const prev = new Map<number, [number, number] | null>();
  prev.set(startKey, null);
  const queue: [number, number][] = [start];
  let expanded = 0;

  while (queue.length > 0) {
    const [cx, cy] = queue.shift()!;
    expanded++;
    const ck = key(cx, cy);

    if (ck === goalKey) {
      const path = reconstructPath(prev, goal);
      return { path, cost: path.length - 1, expanded };
    }

    for (const [dx, dy] of DIRS) {
      const nx = cx + dx;
      const ny = cy + dy;
      const nk = key(nx, ny);
      if (grid.weight(nx, ny) === null) continue;
      if (prev.has(nk)) continue;
      prev.set(nk, [cx, cy]);
      queue.push([nx, ny]);
    }
  }

  return { path: null, cost: 0, expanded };
}

// ── Dijkstra ──────────────────────────────────────────────────────────────

export function dijkstra(grid: Grid, start: [number, number], goal: [number, number]): SearchResult {
  if (grid.weight(start[0], start[1]) === null) return { path: null, cost: 0, expanded: 0 };
  if (grid.weight(goal[0], goal[1]) === null) return { path: null, cost: 0, expanded: 0 };

  const goalKey = key(goal[0], goal[1]);
  const dist = new Map<number, number>();
  const prev = new Map<number, [number, number] | null>();
  const heap = new MinHeap<[number, number]>();

  const startKey = key(start[0], start[1]);
  dist.set(startKey, 0);
  prev.set(startKey, null);
  heap.push(start, 0);
  let expanded = 0;

  while (heap.size > 0) {
    const { priority: d, value: [cx, cy] } = heap.pop()!;
    const ck = key(cx, cy);

    if (d > (dist.get(ck) ?? Infinity)) continue;
    expanded++;

    if (ck === goalKey) {
      const path = reconstructPath(prev, goal);
      return { path, cost: d, expanded };
    }

    for (const [dx, dy] of DIRS) {
      const nx = cx + dx;
      const ny = cy + dy;
      const w = grid.weight(nx, ny);
      if (w === null) continue;
      const nk = key(nx, ny);
      const nd = d + w;
      if (nd < (dist.get(nk) ?? Infinity)) {
        dist.set(nk, nd);
        prev.set(nk, [cx, cy]);
        heap.push([nx, ny], nd);
      }
    }
  }

  return { path: null, cost: 0, expanded };
}

// ── A* ────────────────────────────────────────────────────────────────────

function manhattan(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x2 - x1) + Math.abs(y2 - y1);
}

export function astar(grid: Grid, start: [number, number], goal: [number, number]): SearchResult {
  if (grid.weight(start[0], start[1]) === null) return { path: null, cost: 0, expanded: 0 };
  if (grid.weight(goal[0], goal[1]) === null) return { path: null, cost: 0, expanded: 0 };

  const [gx, gy] = goal;
  const goalKey = key(gx, gy);
  const dist = new Map<number, number>();
  const prev = new Map<number, [number, number] | null>();
  const heap = new MinHeap<[number, number]>();

  const startKey = key(start[0], start[1]);
  dist.set(startKey, 0);
  prev.set(startKey, null);
  heap.push(start, manhattan(start[0], start[1], gx, gy));
  let expanded = 0;

  while (heap.size > 0) {
    const { value: [cx, cy], priority: pf } = heap.pop()!;
    const ck = key(cx, cy);
    const g = dist.get(ck)!;

    // Skip stale heap entries: this entry was pushed with an f-value that has
    // since been beaten. The optimal f for this cell is dist[ck] + h(ck).
    if (pf > g + manhattan(cx, cy, gx, gy)) continue;

    expanded++;

    if (ck === goalKey) {
      const path = reconstructPath(prev, goal);
      return { path, cost: g, expanded };
    }

    for (const [dx, dy] of DIRS) {
      const nx = cx + dx;
      const ny = cy + dy;
      const w = grid.weight(nx, ny);
      if (w === null) continue;
      const nk = key(nx, ny);
      const ng = g + w;
      if (ng < (dist.get(nk) ?? Infinity)) {
        dist.set(nk, ng);
        prev.set(nk, [cx, cy]);
        heap.push([nx, ny], ng + manhattan(nx, ny, gx, gy));
      }
    }
  }

  return { path: null, cost: 0, expanded };
}
