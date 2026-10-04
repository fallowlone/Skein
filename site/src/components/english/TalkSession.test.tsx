import { render } from "preact";
import { act } from "preact/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ hasKey: vi.fn() }));

vi.mock("~/english/byok/index", () => ({ hasKey: mocks.hasKey }));
vi.mock("~/english/byok/converse", () => ({ converse: vi.fn(), endReview: vi.fn(), MAX_TURNS: 8 }));
vi.mock("~/english/speech/tts", () => ({ speak: vi.fn() }));
vi.mock("~/english/data/scenarios", () => ({
  scenarios: [{ id: "s1", level: "B1", role: "Interviewer", titleRu: "Собеседование", goal: "Talk about a project", opening: "Hi" }],
}));

import TalkSession from "./TalkSession";
import type { SpeechRecognizer } from "~/english/speech/recognizer";

let host: HTMLDivElement;
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
const recognizer = {} as SpeechRecognizer;

// First act runs the mount effect (hasKey call); second lets the promise settle and re-render.
async function mount() {
  act(() => render(<TalkSession lang="en" recognizer={recognizer} />, host));
  await act(flush);
}

beforeEach(() => {
  host = document.createElement("div");
  document.body.appendChild(host);
});

afterEach(() => {
  render(null, host);
  host.remove();
  vi.clearAllMocks();
});

describe("TalkSession key gate", () => {
  it("shows the add-key note when the keystore has no key", async () => {
    mocks.hasKey.mockResolvedValue(false);
    await mount();
    expect(host.textContent).toContain("Add an API key");
    expect(host.textContent).not.toContain("Pick a scenario");
  });

  it("shows scenarios when a key is stored", async () => {
    mocks.hasKey.mockResolvedValue(true);
    await mount();
    expect(host.textContent).toContain("Pick a scenario");
  });
});
