// Vitest setup: in-memory localStorage polyfill for the jsdom environment.
//
// jsdom under the current Node version does not expose a Storage object, and
// Node's own native (experimental) `localStorage` global is `undefined` unless
// the process is started with `--localstorage-file`. Browser modules under test
// (e.g. src/scripts/user-state.ts) read and write `localStorage` at import time,
// so a working Storage must exist before any test module loads.

class MemoryStorage {
  private map = new Map<string, string>();

  get length(): number {
    return this.map.size;
  }
  clear(): void {
    this.map.clear();
  }
  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null;
  }
}

Object.defineProperty(globalThis, "localStorage", {
  value: new MemoryStorage() as unknown as Storage,
  configurable: true,
  writable: true,
});
