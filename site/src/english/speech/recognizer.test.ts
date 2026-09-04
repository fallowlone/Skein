import { describe, it, expect } from "vitest";
import { pickRecognizer, webSpeechAvailable } from "./recognizer";

describe("webSpeechAvailable", () => {
  it("false when neither SpeechRecognition global exists", () => {
    const g = globalThis as any;
    delete g.SpeechRecognition; delete g.webkitSpeechRecognition;
    expect(webSpeechAvailable()).toBe(false);
  });
  it("true when webkitSpeechRecognition exists", () => {
    (globalThis as any).webkitSpeechRecognition = class {};
    expect(webSpeechAvailable()).toBe(true);
    delete (globalThis as any).webkitSpeechRecognition;
  });
});

describe("pickRecognizer", () => {
  it("prefers whisper when its recognizer is available", () => {
    const whisper = { id: "whisper", available: () => true } as any;
    const web = { id: "webspeech", available: () => true } as any;
    expect(pickRecognizer({ whisper, web, prefer: "auto" })?.id).toBe("whisper");
  });
  it("falls back to web speech when whisper not downloaded", () => {
    const whisper = { id: "whisper", available: () => false } as any;
    const web = { id: "webspeech", available: () => true } as any;
    expect(pickRecognizer({ whisper, web, prefer: "auto" })?.id).toBe("webspeech");
  });
  it("returns null when nothing is available", () => {
    const whisper = { id: "whisper", available: () => false } as any;
    const web = { id: "webspeech", available: () => false } as any;
    expect(pickRecognizer({ whisper, web, prefer: "auto" })).toBeNull();
  });
  it("honors an explicit preference", () => {
    const whisper = { id: "whisper", available: () => true } as any;
    const web = { id: "webspeech", available: () => true } as any;
    expect(pickRecognizer({ whisper, web, prefer: "webspeech" })?.id).toBe("webspeech");
  });
});
