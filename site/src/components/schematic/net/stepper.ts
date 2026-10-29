/**
 * Progressive-enhancement stepper shared by the networking figures.
 *
 * Markup contract (inside one `[data-sf-root]`):
 *   [data-sf-panel][data-sf-group="<mode>"]   one panel per step; grouped by mode
 *   [data-sf-mode="<mode>"]                   optional mode buttons (aria-pressed)
 *   [data-sf-prev] [data-sf-next] [data-sf-count]
 * Without JS every panel of the `data-sf-default` group renders stacked (CSS in net-fig.css).
 */
export function initStepper(root: HTMLElement, countTemplate: (n: number, total: number) => string): void {
  if (root.dataset.js) return;
  const panels = Array.from(root.querySelectorAll<HTMLElement>("[data-sf-panel]"));
  const modes = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-sf-mode]"));
  const prev = root.querySelector<HTMLButtonElement>("[data-sf-prev]");
  const next = root.querySelector<HTMLButtonElement>("[data-sf-next]");
  const count = root.querySelector<HTMLElement>("[data-sf-count]");
  if (!panels.length || !prev || !next || !count) return;

  let mode = panels.find((p) => p.hasAttribute("data-sf-default"))?.dataset.sfGroup ?? "";
  let step = 0;
  const inMode = () => panels.filter((p) => (p.dataset.sfGroup ?? "") === mode);

  function render() {
    const group = inMode();
    step = Math.max(0, Math.min(group.length - 1, step));
    panels.forEach((p) => (p.hidden = true));
    group[step].hidden = false;
    modes.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.sfMode === mode)));
    prev!.disabled = step === 0;
    next!.disabled = step === group.length - 1;
    count!.textContent = countTemplate(step + 1, group.length);
  }

  modes.forEach((b) =>
    b.addEventListener("click", () => {
      mode = b.dataset.sfMode ?? "";
      step = 0;
      render();
    }),
  );
  prev.addEventListener("click", () => { step -= 1; render(); });
  next.addEventListener("click", () => { step += 1; render(); });
  root.addEventListener("keydown", (e: KeyboardEvent) => {
    if ((e.target as HTMLElement).closest("button") && e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const moves: Record<string, () => void> = {
      ArrowLeft: () => (step -= 1),
      ArrowRight: () => (step += 1),
      Home: () => (step = 0),
      End: () => (step = inMode().length - 1),
    };
    if (!moves[e.key]) return;
    e.preventDefault();
    moves[e.key]();
    render();
  });

  root.dataset.js = "true";
  render();
}

/** Mode switcher without steps: one `[data-sf-panel]` per `[data-sf-mode]` button. */
export function initModes(root: HTMLElement): void {
  if (root.dataset.js) return;
  const panels = Array.from(root.querySelectorAll<HTMLElement>("[data-sf-panel]"));
  const modes = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-sf-mode]"));
  if (!panels.length || !modes.length) return;
  const show = (mode: string) => {
    panels.forEach((p) => (p.hidden = p.dataset.sfGroup !== mode));
    modes.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.sfMode === mode)));
  };
  modes.forEach((b) => b.addEventListener("click", () => show(b.dataset.sfMode ?? "")));
  root.dataset.js = "true";
  show(panels.find((p) => p.hasAttribute("data-sf-default"))?.dataset.sfGroup ?? modes[0].dataset.sfMode ?? "");
}

/** Run `fn` on every matching root now and after each client-side navigation. */
export function onEachRoot(selector: string, fn: (root: HTMLElement) => void): void {
  const run = () => document.querySelectorAll<HTMLElement>(selector).forEach(fn);
  if (document.readyState !== "loading") run();
  else document.addEventListener("DOMContentLoaded", run);
  document.addEventListener("astro:page-load", run);
}
