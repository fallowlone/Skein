import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render } from "preact";
import { afterEach, describe, expect, it } from "vitest";
import { Sheet, SheetTrigger } from "./sheet";

let host: HTMLDivElement;

function mount(node: preact.JSX.Element) {
  host = document.createElement("div");
  document.body.appendChild(host);
  render(node, host);
  return host;
}

afterEach(() => {
  if (!host) return;
  render(null, host);
  host.remove();
  host = undefined as unknown as HTMLDivElement;
});

// M2: the focus trap is owned by radix Dialog, not by this wrapper — jsdom
// has no layout so it cannot exercise Tab cycling (that stays in
// e2e/a11y.spec.ts for dev machines). This pins the architecture instead:
// the Sheet must stay wired to the radix primitives, and the trigger must
// render, so a refactor cannot silently drop the trap.
describe("Sheet radix wiring", () => {
  it("stays built on radix Dialog primitives with a portal", () => {
    const src = readFileSync(resolve("src/components/ui/sheet.tsx"), "utf8");
    expect(src).toContain('import { Dialog as DialogPrimitive } from "radix-ui"');
    for (const part of ["Portal", "Overlay", "Content", "Title"]) {
      expect(src).toContain(`DialogPrimitive.${part}`);
    }
  });

  it("renders its trigger when closed", () => {
    const h = mount(
      <Sheet>
        <SheetTrigger asChild>
          <button type="button">open config</button>
        </SheetTrigger>
      </Sheet>,
    );
    expect(h.querySelector("button")?.textContent).toBe("open config");
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
});
