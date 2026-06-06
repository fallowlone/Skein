// src/components/path/GoalPicker.tsx  (stub — full impl in Task 4)
import type { Locale } from "~/i18n";
export default function GoalPicker({ onClose }: { lang: Locale; onClose: () => void }) {
  return <div class="fixed inset-0 bg-black/30" onClick={onClose} />;
}
