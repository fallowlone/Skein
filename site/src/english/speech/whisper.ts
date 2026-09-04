import type { RecognitionResult } from "~/english/types";
import type { SpeechRecognizer } from "./recognizer";

const MODEL_ID = "whisper-tiny.en";
const CACHE_FLAG = "skein.whisper.ready";

export type DownloadState = { status: "idle" | "downloading" | "ready" | "error"; pct: number };
type ProgressEvent = { status: "progress" | "done" | "initiate" | "ready"; file: string; progress?: number };

/** Pure reducer so download UX is unit-testable without the WASM runtime. */
export function progressReducer(s: DownloadState, e: ProgressEvent): DownloadState {
  if (e.status === "progress") return { status: "downloading", pct: Math.max(s.pct, Math.round(e.progress ?? 0)) };
  // A "done" event fires once PER weight shard (config, tokenizer, encoder,
  // decoder…), not once for the whole model. Treating the first shard's "done"
  // as ready flips the badge to "ready" while the pipeline is still loading and
  // the cache flag is unset — so `available()` stays false and the UI blocks
  // with "needs speech recognition". Stay in "downloading"; true readiness is
  // emitted explicitly by loadTranscriber after pipeline() resolves.
  if (e.status === "done") return s.status === "ready" ? s : { status: "downloading", pct: s.pct };
  return s;
}

export function whisperReady(): boolean {
  try { return localStorage.getItem(CACHE_FLAG) === "1"; } catch { return false; }
}

let transcriberPromise: Promise<any> | null = null;

/**
 * Lazily import transformers.js and build the ASR pipeline. Weights are served
 * same-origin from /models/<repo>/... (R2 proxy), so connect-src stays 'self'.
 */
async function loadTranscriber(onState: (s: DownloadState) => void): Promise<any> {
  if (transcriberPromise) return transcriberPromise;
  const p = (async () => {
    const { pipeline, env } = await import("@xenova/transformers");
    env.allowLocalModels = false;
    env.remoteHost = `${location.origin}/models/`;
    env.remotePathTemplate = "{model}/";
    let st: DownloadState = { status: "downloading", pct: 0 };
    const t = await pipeline("automatic-speech-recognition", MODEL_ID, {
      quantized: true,
      progress_callback: (e: ProgressEvent) => { st = progressReducer(st, e); onState(st); },
    });
    try { localStorage.setItem(CACHE_FLAG, "1"); } catch { /* ignore */ }
    onState({ status: "ready", pct: 100 });
    return t;
  })();
  transcriberPromise = p;
  try {
    return await p;
  } catch (err) {
    // A failed load (e.g. weights 404) must not poison the singleton — null it
    // so the user can retry the download instead of being stuck on a rejected
    // promise forever.
    transcriberPromise = null;
    onState({ status: "error", pct: 0 });
    throw err;
  }
}

/** Decode a recorded blob to 16 kHz mono Float32 for Whisper. */
async function blobToMono16k(blob: Blob): Promise<Float32Array> {
  const buf = await blob.arrayBuffer();
  const Ctx = (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
  const ac = new Ctx({ sampleRate: 16000 });
  const decoded = await ac.decodeAudioData(buf);
  const data = decoded.getChannelData(0);
  await ac.close();
  return data;
}

/** On-device Whisper recognizer. Audio never leaves the device. */
export class WhisperRecognizer implements SpeechRecognizer {
  id = "whisper" as const;
  private chunks: Blob[] = [];
  private recorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  constructor(private onState: (s: DownloadState) => void = () => {}) {}

  available(): boolean { return whisperReady(); }

  /** Explicit user-triggered download; resolves when weights are cached. */
  async download(): Promise<void> { await loadTranscriber(this.onState); }

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.recorder = new MediaRecorder(this.stream);
    this.chunks = [];
    this.recorder.ondataavailable = (e) => { if (e.data.size) this.chunks.push(e.data); };
    this.recorder.start();
  }

  private empty(): RecognitionResult { return { transcript: "", words: [], confidence: 0 }; }

  async stop(): Promise<RecognitionResult> {
    // stop() without a prior start() (or after the recorder was lost) → nothing
    // to decode. Return an empty result rather than feeding an empty Blob to
    // decodeAudioData (which throws a DOMException).
    if (!this.recorder) return this.empty();
    const blob: Blob = await new Promise((resolve) => {
      this.recorder!.onstop = () => resolve(new Blob(this.chunks, { type: "audio/webm" }));
      this.recorder!.stop();
    });
    this.stream?.getTracks().forEach((t) => t.stop());
    if (blob.size === 0) return this.empty();
    const audio = await blobToMono16k(blob);
    const transcriber = await loadTranscriber(this.onState);
    const out = await transcriber(audio);
    const transcript = (out?.text ?? "").trim();
    return {
      transcript,
      words: transcript.split(/\s+/).filter(Boolean).map((text: string) => ({ text })),
      confidence: transcript ? 1 : 0,
    };
  }
}
