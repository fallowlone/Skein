// src/components/english/ShadowExercise.tsx
import type { Locale } from "~/i18n";
import type { SpeechRecognizer } from "~/english/speech/recognizer";
export default function ShadowExercise(_: { lang: Locale; recognizer: SpeechRecognizer }) { return <div data-shadow />; }
