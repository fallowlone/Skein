import { useState } from "preact/hooks";
import Sandbox from "../Sandbox";

type L4 = "tcp" | "udp" | "quic";
type Auth = "none" | "jwt" | "mtls";
type Edge = "none" | "cdn" | "mesh";

const L4_RTT = { tcp: 1, udp: 0, quic: 0 } as const;
const TLS_RTT = { tcp: 1, udp: 0, quic: 0 } as const;
const AUTH_OVERHEAD = { none: 0, jwt: 5, mtls: 25 } as const;
const EDGE_MULT = { none: 1, cdn: 0.4, mesh: 0.8 } as const;

type Props = { lang: "en" | "ru" };

export default function RequestBudgetSandbox({ lang }: Props) {
  const [rtt, setRtt] = useState(40);
  const [l4, setL4] = useState<L4>("tcp");
  const [auth, setAuth] = useState<Auth>("jwt");
  const [edge, setEdge] = useState<Edge>("cdn");

  const effRtt = rtt * EDGE_MULT[edge];
  const handshake = (L4_RTT[l4] + TLS_RTT[l4]) * effRtt;
  const authMs = AUTH_OVERHEAD[auth];
  const ttfb = handshake + effRtt + authMs + 20;
  const lcp = ttfb + 200;
  const verdict: "good" | "ok" | "poor" = lcp <= 2500 ? "good" : lcp <= 4000 ? "ok" : "poor";

  const verdictClass =
    verdict === "good"
      ? "bg-green-100 text-bbg-success"
      : verdict === "ok"
        ? "bg-amber-100 text-amber-700"
        : "bg-rose-100 text-bbg-warn";

  return (
    <Sandbox
      id="request-budget"
      title={lang === "en" ? "Build a request budget" : "Постройте бюджет запроса"}
    >
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-4">
          <label class="block">
            <span class="text-xs font-bold uppercase tracking-wider text-bbg-muted">RTT (ms)</span>
            <input
              type="range"
              min={5}
              max={300}
              value={rtt}
              onInput={(e) => setRtt(+(e.target as HTMLInputElement).value)}
              class="w-full"
            />
            <span class="font-mono">{rtt} ms</span>
          </label>
          <label class="block">
            <span class="text-xs font-bold uppercase tracking-wider text-bbg-muted">L4</span>
            <select
              class="block border rounded px-2 py-1"
              value={l4}
              onChange={(e) => setL4((e.target as HTMLSelectElement).value as L4)}
            >
              <option value="tcp">TCP + TLS 1.3</option>
              <option value="udp">UDP (no TLS)</option>
              <option value="quic">QUIC (0-RTT)</option>
            </select>
          </label>
          <label class="block">
            <span class="text-xs font-bold uppercase tracking-wider text-bbg-muted">Auth</span>
            <select
              class="block border rounded px-2 py-1"
              value={auth}
              onChange={(e) => setAuth((e.target as HTMLSelectElement).value as Auth)}
            >
              <option value="none">none</option>
              <option value="jwt">JWT</option>
              <option value="mtls">mTLS</option>
            </select>
          </label>
          <label class="block">
            <span class="text-xs font-bold uppercase tracking-wider text-bbg-muted">Edge</span>
            <select
              class="block border rounded px-2 py-1"
              value={edge}
              onChange={(e) => setEdge((e.target as HTMLSelectElement).value as Edge)}
            >
              <option value="none">origin only</option>
              <option value="cdn">CDN</option>
              <option value="mesh">full mesh</option>
            </select>
          </label>
        </div>
        <div class="font-mono text-sm space-y-2">
          <div>
            handshake: <strong>{handshake.toFixed(0)} ms</strong>
          </div>
          <div>
            auth: <strong>{authMs} ms</strong>
          </div>
          <div>
            TTFB: <strong>{ttfb.toFixed(0)} ms</strong>
          </div>
          <div>
            LCP (est): <strong>{lcp.toFixed(0)} ms</strong>
          </div>
          <div class={`mt-3 inline-block px-3 py-1 rounded-full font-bold ${verdictClass}`}>
            {verdict.toUpperCase()}
          </div>
        </div>
      </div>
    </Sandbox>
  );
}
