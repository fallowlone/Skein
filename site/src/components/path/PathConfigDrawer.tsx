// src/components/path/PathConfigDrawer.tsx  (stub — full impl in Task 5)
import type { Locale } from "~/i18n";
export default function PathConfigDrawer({ onClose }: { lang: Locale; onClose: () => void }) {
  return <div class="fixed inset-0 bg-black/30" onClick={onClose} />;
}
