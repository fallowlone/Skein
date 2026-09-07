import { render } from "preact";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ExpeditionPass from "./ExpeditionPass";

let host: HTMLDivElement;

beforeEach(() => {
  host = document.createElement("div");
  document.body.appendChild(host);
});

afterEach(() => {
  render(null, host);
  host.remove();
  delete document.body.dataset.expeditionPass;
});

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const counts = { "two-pointers": 3, "sliding-window": 3, "binary-search": 5, graphs: 4 };

function mount(overrides: Partial<Parameters<typeof ExpeditionPass>[0]> = {}) {
  const onOpenPattern = vi.fn();
  const onDismiss = vi.fn();
  render(
    <ExpeditionPass
      lang="en"
      telegramStarsUrl={null}
      routeCounts={counts}
      onOpenPattern={onOpenPattern}
      onDismiss={onDismiss}
      {...overrides}
    />,
    host,
  );
  return { onOpenPattern, onDismiss };
}

function button(text: string): HTMLButtonElement {
  const found = Array.from(host.querySelectorAll("button")).find((node) => node.textContent?.includes(text));
  if (!found) throw new Error(`Button not found: ${text}`);
  return found;
}

describe("ExpeditionPass", () => {
  it("opens the layout and close dismisses it", async () => {
    const { onDismiss } = mount();
    await flush();
    expect(document.body.dataset.expeditionPass).toBe("open");

    (host.querySelector('[aria-label="Close Expedition Pass"]') as HTMLButtonElement).click();
    await flush();

    expect(host.querySelector(".expedition-pass")).toBeNull();
    expect(document.body.dataset.expeditionPass).toBeUndefined();
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("Continue without pass dismisses the offer", async () => {
    const { onDismiss } = mount();
    await flush();
    button("Continue without pass").click();
    await flush();
    expect(host.querySelector(".expedition-pass")).toBeNull();
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("route and Week 1 controls open real problem-bank patterns", async () => {
    const { onOpenPattern } = mount();
    await flush();

    button("Algorithms:Two Pointers").click();
    await flush();
    expect(onOpenPattern).toHaveBeenCalledWith("two-pointers");
    expect(host.querySelector(".expedition-pass")).toBeNull();

    render(null, host);
    const second = mount();
    await flush();
    button("Week 1: Two Pointers").click();
    await flush();
    expect(second.onOpenPattern).toHaveBeenCalledWith("two-pointers");
  });

  it("shows the real live-bank count for Week 1", async () => {
    mount();
    await flush();
    expect(host.textContent).toContain("3 problems in the live bank");
  });

  it("does not expose a fake checkout when Telegram Stars is not configured", async () => {
    mount();
    await flush();
    const support = button("Telegram Stars unavailable");
    expect(support.disabled).toBe(true);
    expect(host.querySelector('a[href*="stripe"],a[href*="paypal"],a[href*="patreon"],a[href*="ko-fi"]')).toBeNull();
  });

  it("uses the configured Telegram Stars destination as the only financial link", async () => {
    mount({ telegramStarsUrl: "https://t.me/$invoice_slug" });
    await flush();
    const link = host.querySelector("a.ep-cta-primary") as HTMLAnchorElement;
    expect(link.textContent).toContain("Support with Telegram Stars");
    expect(link.href).toBe("https://t.me/$invoice_slug");
  });
});
