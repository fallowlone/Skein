// src/components/english/TalkSession.tsx
import type { Locale } from "~/i18n";
import type { SpeechRecognizer } from "~/english/speech/recognizer";
export default function TalkSession(_: { lang: Locale; recognizer: SpeechRecognizer }) { return <div data-talk />; }
