import type { Locale } from "~/i18n";
import { rankById } from "~/scripts/progression/ranks";

export default function RankBadge({ rankId, lang, size = "md" }: { rankId: string; lang: Locale; size?: "sm" | "md" | "lg" }) {
  const r = rankById(rankId);
  const px = size === "lg" ? 40 : size === "sm" ? 18 : 26;
  return (
    <span class="inline-flex items-center gap-2">
      <span style={`font-size:${px}px;line-height:1;`} aria-hidden="true">{r.icon}</span>
      <span class="font-semibold" style={`color:${r.color};`}>{r.label[lang]}</span>
    </span>
  );
}
