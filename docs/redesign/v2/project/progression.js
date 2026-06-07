/* ============================================================================
   OPEN ATLAS — PROGRESSION behaviours
   · 25-rank ladder window  · per-domain radar (signature)  · streak spark
   Theme + language handled by app.js.
   ============================================================================ */
(function () {
  "use strict";
  const el = (t, c, css) => { const n = document.createElement(t); if (c) n.className = c; if (css) n.style.cssText = css; return n; };

  const CURRENT = 13, MAXR = 25, PER = 70, BASE = 1000;
  const ROMAN = ["I", "II", "III", "IV", "V"];
  function rankName(r) {
    if (r <= 5) return "Apprentice " + ROMAN[r - 1];
    if (r <= 10) return "Practitioner " + ROMAN[r - 6];
    if (r <= 15) return "Engineer " + ROMAN[r - 11];
    if (r <= 20) return "Senior " + ROMAN[r - 16];
    return "Architect " + ROMAN[r - 21];
  }
  function band(r) { return r <= 8 ? "foundations" : r <= 15 ? "intermediate" : r <= 21 ? "advanced" : "senior"; }
  const rating = (r) => (BASE + (r - 1) * PER).toLocaleString();

  /* rank seal arc — fraction of the ladder climbed */
  const arc = document.getElementById("rankArc");
  if (arc) { const r = 40, C = 2 * Math.PI * r; arc.style.strokeDasharray = C; arc.style.strokeDashoffset = C * (1 - CURRENT / MAXR); }

  /* ladder window */
  const ladder = document.getElementById("ladder");
  if (ladder) {
    for (let r = CURRENT + 3; r >= CURRENT - 3; r--) {
      if (r < 1 || r > MAXR) continue;
      const row = el("div", "lad-row" + (r === CURRENT ? " current" : r > CURRENT ? " future" : ""));
      const n = el("div", "lr-rank"); n.textContent = r;
      const t = el("div", "lr-tier"); t.textContent = rankName(r);
      const b = el("div", "lr-band"); b.textContent = band(r);
      const rt = el("div", "lr-rating"); rt.textContent = r === CURRENT ? "" : rating(r);
      if (r === CURRENT) { const h = el("span", "here"); h.textContent = "you · " + rating(r); rt.appendChild(h); }
      row.appendChild(n); row.appendChild(t); row.appendChild(b); row.appendChild(rt);
      ladder.appendChild(row);
    }
  }

  /* per-domain radar */
  const DOMAINS = [
    ["Networking", "--d-network", 1920],
    ["Databases", "--d-data", 1760],
    ["Distributed", "--d-systems", 1480],
    ["Backend", "--d-backend", 2010],
    ["Frontend", "--d-frontend", 1840],
    ["AI · LLMs", "--d-ai", 1390],
    ["Security", "--d-crypto", 1680],
  ];
  const RMAX = 2500;
  const svg = document.getElementById("radarSvg");
  const NS = "http://www.w3.org/2000/svg";
  function mk(tag, attrs) { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); return n; }
  if (svg) {
    const cx = 150, cy = 150, R = 104, N = DOMAINS.length;
    const ang = (i) => (-Math.PI / 2) + (i * 2 * Math.PI / N);
    const pt = (i, rad) => [cx + rad * Math.cos(ang(i)), cy + rad * Math.sin(ang(i))];
    // rings
    [0.25, 0.5, 0.75, 1].forEach((f) => {
      let d = "";
      for (let i = 0; i < N; i++) { const [x, y] = pt(i, R * f); d += (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1) + " "; }
      d += "Z"; svg.appendChild(mk("path", { class: "grid-ring", d }));
    });
    // axes + labels
    DOMAINS.forEach((dm, i) => {
      const [x, y] = pt(i, R);
      svg.appendChild(mk("line", { class: "axis", x1: cx, y1: cy, x2: x, y2: y }));
      const [lx, ly] = pt(i, R + 20);
      const t = mk("text", { class: "albl", x: lx.toFixed(1), y: ly.toFixed(1), "text-anchor": Math.abs(lx - cx) < 8 ? "middle" : lx > cx ? "start" : "end", "dominant-baseline": "middle" });
      t.textContent = dm[0]; svg.appendChild(t);
    });
    // data polygon
    let d = "";
    DOMAINS.forEach((dm, i) => { const [x, y] = pt(i, R * (dm[2] / RMAX)); d += (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1) + " "; });
    d += "Z";
    svg.appendChild(mk("path", { class: "poly", d }));
    DOMAINS.forEach((dm, i) => { const [x, y] = pt(i, R * (dm[2] / RMAX)); svg.appendChild(mk("circle", { class: "vert", cx: x.toFixed(1), cy: y.toFixed(1), r: 2.6 })); });
  }

  /* domain bars beside radar */
  const bars = document.getElementById("domBars");
  if (bars) {
    DOMAINS.slice().sort((a, b) => b[2] - a[2]).forEach((dm) => {
      const row = el("div", "dom-bar"); row.style.setProperty("--d", "var(" + dm[1] + ")");
      const nm = el("div", "db-name"); nm.textContent = dm[0];
      const tr = el("div", "db-track"); const i = el("i", null, "width:" + Math.round((dm[2] / RMAX) * 100) + "%"); tr.appendChild(i);
      const v = el("div", "db-val"); v.textContent = dm[2].toLocaleString();
      row.appendChild(nm); row.appendChild(tr); row.appendChild(v);
      bars.appendChild(row);
    });
  }

  /* streak spark (last 30 days; gaps = lighter) */
  const spark = document.getElementById("spark");
  if (spark) {
    const pat = [1,1,1,1,0,1,1, 1,1,1,1,1,1,1, 1,0,1,1,1,1,1, 1,1,1,1,1,1,1, 1,1];
    pat.forEach((on, i) => { const b = el("i", on ? "on" : ""); b.style.height = (8 + ((i * 37) % 17)) + "px"; spark.appendChild(b); });
  }

  /* quiet rank-up dismiss */
  const rx = document.getElementById("rankupX");
  if (rx) rx.addEventListener("click", () => document.getElementById("rankup").remove());
})();
