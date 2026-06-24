export type Req = { method: "GET" | "POST" | "PUT" | "DELETE"; path: string; body?: any };
export type Res = { status: number; body?: any };

interface Item { id: string; name: string; [key: string]: unknown }

class ItemStore {
  private items = new Map<string, Item>();
  private counter = 0;

  nextId(): string {
    return String(++this.counter);
  }

  all(): Item[] {
    return Array.from(this.items.values());
  }

  get(id: string): Item | undefined {
    return this.items.get(id);
  }

  set(id: string, item: Item): void {
    this.items.set(id, item);
  }

  delete(id: string): boolean {
    return this.items.delete(id);
  }
}

export type Store = ItemStore;

export function createStore(): Store {
  return new ItemStore();
}

// Parse /items or /items/:id. Returns { collection, id? }.
function parsePath(path: string): { collection: string; id?: string } {
  const parts = path.replace(/^\//, "").split("/");
  return { collection: parts[0] ?? "", id: parts[1] };
}

export function handle(req: Req, store: Store): Res {
  const { collection, id } = parsePath(req.path);

  if (collection !== "items") return { status: 404 };

  if (req.method === "GET" && !id) {
    return { status: 200, body: store.all() };
  }

  if (req.method === "POST" && !id) {
    const name = req.body?.name;
    if (typeof name !== "string" || name.trim() === "") {
      return { status: 400, body: { error: "name is required" } };
    }
    const newId = store.nextId();
    const item: Item = { ...req.body, id: newId, name: name.trim() };
    store.set(newId, item);
    return { status: 201, body: item };
  }

  if (!id) return { status: 404 };

  if (req.method === "GET") {
    const item = store.get(id);
    return item ? { status: 200, body: item } : { status: 404 };
  }

  if (req.method === "PUT") {
    const existing = store.get(id);
    if (!existing) return { status: 404 };
    const updated: Item = { ...existing, ...req.body, id };
    store.set(id, updated);
    return { status: 200, body: updated };
  }

  if (req.method === "DELETE") {
    const removed = store.delete(id);
    return removed ? { status: 200 } : { status: 404 };
  }

  return { status: 404 };
}
