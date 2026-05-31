export function ttsAvailable(): boolean {
  return typeof globalThis !== "undefined" && "speechSynthesis" in globalThis;
}

function pickEnglishVoice(): SpeechSynthesisVoice | null {
  if (!ttsAvailable()) return null;
  const voices = speechSynthesis.getVoices();
  return voices.find((v) => v.lang.startsWith("en") && v.default)
    ?? voices.find((v) => v.lang.startsWith("en"))
    ?? null;
}

export function speak(text: string, opts: { rate?: number } = {}): void {
  if (!ttsAvailable()) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voice = pickEnglishVoice();
  u.lang = voice?.lang ?? "en-US";
  if (voice) u.voice = voice;
  u.rate = opts.rate ?? 1;
  speechSynthesis.speak(u);
}

export function stopSpeaking(): void {
  if (ttsAvailable()) speechSynthesis.cancel();
}
