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

// Radix primitives (Select/Slider/Popover) observe trigger/content size via
// ResizeObserver, which jsdom does not implement. A no-op stub is enough for
// unit tests: layout never changes under test, observers just never fire.
if (typeof globalThis.ResizeObserver === "undefined") {
  class NoopResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  Object.defineProperty(globalThis, "ResizeObserver", {
    value: NoopResizeObserver,
    configurable: true,
    writable: true,
  });
}
