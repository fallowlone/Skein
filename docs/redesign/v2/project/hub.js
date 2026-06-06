/* ============================================================================
   OPEN ATLAS — ENGLISH HUB behaviours
   · Renders + animates the coverage gauge (signature instrument)
   · Swaps the corpus / coverage / bands when the register toggle flips
   · Small affordances: BYO example fill, segmented toggles
   Theme + language are handled by app.js (shared site shell).
   ============================================================================ */
(function () {
  "use strict";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── Register data — same engine, two registers ───────────────────────── */
  const REGISTERS = {
    engineering: {
      name: "Backend Engineering",
      fam: "4,820 word families",
      coverage: 82,
      bands: [
        ["Top 1,000", 99, "987 / 1,000"],
        ["1k – 2k", 96, "962 / 1,000"],
        ["2k – 3k", 88, "879 / 1,000"],
        ["3k – 5k", 71, "1,419 / 2,000"],
        ["Academic · AWL", 64, "364 / 570"],
        ["Technical · domain", 47, "+612 terms"],
      ],
    },
    everyday: {
      name: "Everyday English",
      fam: "5,140 word families",
      coverage: 88,
      bands: [
        ["Top 1,000", 100, "1,000 / 1,000"],
        ["1k – 2k", 98, "984 / 1,000"],
        ["2k – 3k", 93, "927 / 1,000"],
        ["3k – 5k", 79, "1,583 / 2,000"],
        ["Academic · AWL", 58, "330 / 570"],
        ["Idiom · colloquial", 61, "+540 phrases"],
      ],
    },
  };

  /* ── Gauge ─────────────────────────────────────────────────────────────── */
  const track = document.getElementById("gaugeTrack");
  const valuePath = document.getElementById("gaugeValue");
  const pointer = document.getElementById("gaugePointer");
  const covNum = document.getElementById("covNum");
  const CX = 160, CY = 160, R = 130;
  let arcLen = 0;
  if (valuePath) arcLen = valuePath.getTotalLength();

  function pointAt(v) {
    const ang = (180 - 1.8 * v) * Math.PI / 180;
    return { x: CX + R * Math.cos(ang), y: CY - R * Math.sin(ang) };
  }

  function setGauge(v) {
    if (!valuePath) return;
    valuePath.style.strokeDasharray = arcLen;
    valuePath.style.strokeDashoffset = arcLen * (1 - v / 100);
    const p = pointAt(v);
    pointer.setAttribute("cx", p.x.toFixed(1));
    pointer.setAttribute("cy", p.y.toFixed(1));
  }

  function countTo(el, target, animate) {
    if (!el) return;
    if (!animate || reduce) { el.textContent = target; return; }
    const start = parseInt(el.textContent, 10) || 0;
    const t0 = performance.now(), dur = 600;
    (function tick(now) {
      const k = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(start + (target - start) * e);
      if (k < 1) requestAnimationFrame(tick);
    })(performance.now());
  }

  /* ── Bands ─────────────────────────────────────────────────────────────── */
  const bandList = document.getElementById("bandList");
  function tier(p) { return p >= 90 ? "is-high" : p >= 75 ? "is-mid" : "is-low"; }
  function fillColor(p) {
    return p >= 90 ? "var(--ok)"
      : p >= 75 ? "var(--accent)"
      : "color-mix(in srgb, var(--warn) 80%, var(--ink))";
  }
  function el(tag, cls, css) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (css) n.style.cssText = css;
    return n;
  }
  function renderBands(bands) {
    if (!bandList) return;
    bandList.innerHTML = "";
    bands.forEach(([label, pct, count]) => {
      const row = el("div", "band-row");
      row.title = count;
      const bl = el("span", "bl"); bl.textContent = label;
      const track = el("div", "band-track " + tier(pct));
      // fill is painted as a hard-stop gradient on the track itself — no child width to resolve
      track.style.backgroundImage =
        "linear-gradient(to right, " + fillColor(pct) + " " + pct + "%, transparent " + pct + "%)";
      const grid = el("div", "band-grid");
      grid.appendChild(el("i", null, "left:75%"));
      grid.appendChild(el("i", null, "left:90%"));
      track.appendChild(grid);
      const bp = el("span", "band-pct"); bp.textContent = pct + "%";
      row.appendChild(bl); row.appendChild(track); row.appendChild(bp);
      bandList.appendChild(row);
    });
  }

  /* ── Apply a register ──────────────────────────────────────────────────── */
  function applyRegister(key, animate) {
    const r = REGISTERS[key] || REGISTERS.engineering;
    const nameEl = document.getElementById("corpusName");
    const famEl = document.getElementById("corpusFam");
    if (nameEl) nameEl.textContent = r.name;
    if (famEl) famEl.textContent = r.fam;
    countTo(covNum, r.coverage, animate);
    setGauge(r.coverage);
    renderBands(r.bands);
  }

  /* register segmented control */
  const seg = document.getElementById("register-seg");
  if (seg) {
    seg.addEventListener("click", (e) => {
      const b = e.target.closest("[data-register]");
      if (!b) return;
      seg.querySelectorAll("button").forEach((x) =>
        x.setAttribute("aria-pressed", String(x === b)));
      applyRegister(b.dataset.register, true);
    });
  }

  /* ── Generic segmented toggles (Text/URL, source) — visual only ────────── */
  document.querySelectorAll(".src-seg").forEach((grp) => {
    grp.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      grp.querySelectorAll("button").forEach((x) =>
        x.setAttribute("aria-pressed", String(x === b)));
    });
  });

  /* ── BYO example chips fill the input ──────────────────────────────────── */
  const byoInput = document.getElementById("byoInput");
  document.querySelectorAll(".byo-hint .ex").forEach((chip) => {
    chip.addEventListener("click", () => {
      if (byoInput) { byoInput.value = chip.dataset.fill || chip.textContent; byoInput.focus(); }
    });
  });

  /* ── Init ──────────────────────────────────────────────────────────────── */
  applyRegister("engineering", false);
})();
