import type { RecognitionResult } from "~/english/types";

export interface SpeechRecognizer {
  id: "webspeech" | "whisper";
  available(): boolean;
  start(): Promise<void>;
  stop(): Promise<RecognitionResult>;
}

export function webSpeechAvailable(): boolean {
  const g = globalThis as any;
  return typeof g !== "undefined" && !!(g.SpeechRecognition || g.webkitSpeechRecognition);
}

/** Web Speech engine. Audio goes to the browser's cloud STT (not private). */
export class WebSpeechRecognizer implements SpeechRecognizer {
  id = "webspeech" as const;
  private rec: any = null;
  private finalText = "";

  available(): boolean { return webSpeechAvailable(); }

  start(): Promise<void> {
    const g = globalThis as any;
    const SR = g.SpeechRecognition || g.webkitSpeechRecognition;
    this.rec = new SR();
    this.rec.lang = "en-US";
    this.rec.interimResults = false;
    this.rec.continuous = true;
    this.finalText = "";
    this.rec.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) this.finalText += e.results[i][0].transcript + " ";
      }
    };
    return new Promise((resolve, reject) => {
      this.rec.onstart = () => resolve();
      this.rec.onerror = (e: any) => reject(new Error(e.error || "speech error"));
      this.rec.start();
    });
  }

  stop(): Promise<RecognitionResult> {
    return new Promise((resolve) => {
      if (!this.rec) return resolve({ transcript: "", words: [], confidence: 0 });
      this.rec.onend = () => {
        const transcript = this.finalText.trim();
        resolve({
          transcript,
          words: transcript.split(/\s+/).filter(Boolean).map((text) => ({ text })),
          confidence: transcript ? 1 : 0,
        });
      };
      this.rec.stop();
    });
  }
}

export type PickArgs = {
  whisper: SpeechRecognizer;
  web: SpeechRecognizer;
  prefer: "auto" | "webspeech" | "whisper";
};

export function pickRecognizer({ whisper, web, prefer }: PickArgs): SpeechRecognizer | null {
  if (prefer === "whisper") return whisper.available() ? whisper : null;
  if (prefer === "webspeech") return web.available() ? web : null;
  if (whisper.available()) return whisper;
  if (web.available()) return web;
  return null;
}
