// src/components/english/SpeakExercise.tsx
import type { Locale } from "~/i18n";
import type { SpeechRecognizer } from "~/english/speech/recognizer";
export default function SpeakExercise(_: { lang: Locale; recognizer: SpeechRecognizer }) { return <div data-speak />; }
