import { describe, it, expect, vi, beforeEach } from "vitest";
import { speak, ttsAvailable } from "./tts";

describe("tts", () => {
  beforeEach(() => {
    (globalThis as any).speechSynthesis = {
      speak: vi.fn(),
      cancel: vi.fn(),
      getVoices: () => [{ lang: "en-US", name: "Test", default: true }],
    };
    (globalThis as any).SpeechSynthesisUtterance = class {
      text = ""; lang = ""; rate = 1; voice: any = null;
      constructor(t: string) { this.text = t; }
    };
  });

  it("ttsAvailable true when speechSynthesis exists", () => {
    expect(ttsAvailable()).toBe(true);
  });

  it("speak cancels prior and queues an English utterance at the given rate", () => {
    speak("hello", { rate: 0.85 });
    expect((globalThis as any).speechSynthesis.cancel).toHaveBeenCalled();
    const u = (globalThis as any).speechSynthesis.speak.mock.calls[0][0];
    expect(u.text).toBe("hello");
    expect(u.rate).toBe(0.85);
    expect(u.lang).toBe("en-US");
  });
});
