import { type Locale } from "~/i18n";

// Placeholder island — the subagent (Task 5) replaces this with the sectioned shell
// composing Identity / Overview / Your data / BYOK / Preferences.
export default function CabinetPanel({ lang }: { lang: Locale }) {
  return <p class="meta">{lang === "ru" ? "Кабинет…" : "Cabinet…"}</p>;
}
