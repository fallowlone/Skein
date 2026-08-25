import type { Screen } from "./types";
import type { Labels } from "./labels";
import { ghostButtonStyle, navStyle } from "./style-helpers";

type Props = { labels: Labels; screen: Screen; onNavigate: (s: Screen) => void; onReset: () => void };

const SCREENS: Screen[] = ["workspace", "debrief", "metrics", "bank"];

export default function Header({ labels, screen, onNavigate, onReset }: Props) {
  return (
    <header style="position:sticky;top:0;z-index:20;background:var(--paper);border-bottom:0.5px solid var(--rule-strong);display:flex;align-items:center;gap:24px;padding:0 32px;height:56px;min-width:1180px;box-sizing:border-box;white-space:nowrap">
      <span style="display:flex;align-items:baseline;gap:10px">
        <span style="font-family:var(--font-display);font-size:18px;font-weight:560;letter-spacing:-0.02em">{labels.brand}</span>
        <span style="font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted)">{labels.kicker}</span>
      </span>
      <nav style="display:flex;gap:2px;margin-left:16px;flex:none">
        {SCREENS.map((s) => (
          <button key={s} type="button" onClick={() => onNavigate(s)} style={navStyle(screen === s)}>
            {labels.nav[s]}
          </button>
        ))}
      </nav>
      <span style="flex:1" />
      <button type="button" onClick={onReset} style={ghostButtonStyle()}>{labels.resetSession}</button>
    </header>
  );
}
