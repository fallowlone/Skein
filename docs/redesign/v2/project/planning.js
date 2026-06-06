/* ============================================================================
   OPEN ATLAS — PLANNING screen behaviours
   · Concept-mastery map (known / shaky / unknown, clustered by domain)
   · Weekday-hours grid + honest dated schedule & feasibility verdict
   Theme + language handled by app.js.
   ============================================================================ */
(function () {
  "use strict";

  /* ── Concept-mastery map ───────────────────────────────────────────────── */
  const CLUSTERS = [
    ["Networking · security", "--d-network", 38, 12, 8],
    ["Databases", "--d-data", 34, 10, 9],
    ["Distributed systems", "--d-systems", 22, 14, 16],
    ["Backend · observability", "--d-backend", 40, 9, 7],
    ["Frontend · deploy", "--d-frontend", 45, 8, 5],
    ["AI · LLMs", "--d-ai", 20, 12, 13],
    ["How computers work", "--d-hardware", 42, 9, 6],
    ["Cryptography", "--d-crypto", 30, 10, 9],
  ];
  const cmap = document.getElementById("cmap");
  function el(tag, cls, css) { const n = document.createElement(tag); if (cls) n.className = cls; if (css) n.style.cssText = css; return n; }
  if (cmap) {
    CLUSTERS.forEach(([name, hue, k, s, u]) => {
      const total = k + s + u;
      const row = el("div", "cmap-cluster");
      row.style.setProperty("--d", "var(" + hue + ")");
      const label = el("div", "cmap-label");
      const nm = el("div", "cl-name"); nm.innerHTML = '<span class="sq"></span>' + name;
      const ct = el("div", "cl-count"); ct.textContent = k + " / " + total + " known · " + s + " shaky";
      const bar = el("div", "cl-bar"); const bi = el("i", null, "width:" + Math.round((k / total) * 100) + "%"); bar.appendChild(bi);
      label.appendChild(nm); label.appendChild(ct); label.appendChild(bar);
      const nodes = el("div", "cmap-nodes");
      const add = (cls, n, title) => { for (let i = 0; i < n; i++) { const d = el("div", "cnode " + cls); d.title = title; nodes.appendChild(d); } };
      add("known", k, "known"); add("shaky", s, "shaky"); add("", u, "unknown");
      row.appendChild(label); row.appendChild(nodes);
      cmap.appendChild(row);
    });
  }

  /* ── Deadline engine ───────────────────────────────────────────────────── */
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]; // grid order
  // hours indexed to grid order (Mon..Sun)
  let hours = [2, 2, 2, 1.5, 1.5, 3, 0];
  const TIER = { junior: 0.85, middle: 1.15, senior: 1.4 };
  let tier = "middle";
  const BASE_REQUIRED = 70; // hours for the active-goal plan

  // blackout date ranges (inclusive) for the current year
  const Y = new Date().getFullYear();
  const blackouts = [
    [new Date(Y, 5, 19), new Date(Y, 5, 22)],
    [new Date(Y, 6, 4), new Date(Y, 6, 4)],
  ];
  function isBlackout(d) { return blackouts.some(([a, b]) => d >= a && d <= b); }
  // grid index from JS getDay (0=Sun..6=Sat) -> Mon..Sun array
  function gi(jsDay) { return (jsDay + 6) % 7; }

  const weekgrid = document.getElementById("weekgrid");
  const weekTotal = document.getElementById("weekTotal");
  function renderWeek() {
    if (!weekgrid) return;
    weekgrid.innerHTML = "";
    DAYS.forEach((name, i) => {
      const col = el("div", "daycol");
      const dn = el("div", "dname"); dn.textContent = name;
      const step = el("div", "hstep" + (hours[i] === 0 ? " off" : ""));
      step.tabIndex = 0; step.setAttribute("role", "spinbutton"); step.setAttribute("aria-label", name + " hours");
      const hv = el("div", "hv"); hv.textContent = hours[i] === 0 ? "·" : hours[i];
      const hu = el("div", "hu"); hu.textContent = "h";
      step.appendChild(hv); step.appendChild(hu);
      const bump = (delta) => { hours[i] = Math.max(0, Math.min(8, Math.round((hours[i] + delta) * 2) / 2)); renderWeek(); recompute(); };
      step.addEventListener("click", () => bump(hours[i] >= 6 ? -hours[i] : 0.5));
      step.addEventListener("contextmenu", (e) => { e.preventDefault(); bump(-0.5); });
      step.addEventListener("wheel", (e) => { e.preventDefault(); bump(e.deltaY < 0 ? 0.5 : -0.5); }, { passive: false });
      step.addEventListener("keydown", (e) => { if (e.key === "ArrowUp") { e.preventDefault(); bump(0.5); } if (e.key === "ArrowDown") { e.preventDefault(); bump(-0.5); } });
      col.appendChild(dn); col.appendChild(step);
      weekgrid.appendChild(col);
    });
    const wk = hours.reduce((a, b) => a + b, 0);
    if (weekTotal) weekTotal.textContent = wk + " h available per week · " + hours.filter((h) => h === 0).length + " day(s) off";
  }

  const dlDate = document.getElementById("dlDate");
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const PLAN = [
    ["Consensus & Raft", "--d-data", 95],
    ["TLS 1.3 from the wire up", "--d-network", 70],
    ["Backpressure & queues", "--d-backend", 55],
    ["Interview drill set", "--accent", 40],
    ["B-tree internals", "--d-data", 80],
    ["Designing a rate limiter", "--d-systems", 60],
    ["Vector clocks & ordering", "--d-systems", 50],
  ];

  function recompute() {
    const target = dlDate && dlDate.value ? new Date(dlDate.value + "T00:00:00") : new Date(Y, 6, 15);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let avail = 0, daysLeft = 0;
    const cur = new Date(today);
    while (cur <= target) {
      daysLeft++;
      if (!isBlackout(cur)) avail += hours[gi(cur.getDay())];
      cur.setDate(cur.getDate() + 1);
    }
    avail = Math.round(avail);
    const required = Math.round(BASE_REQUIRED * TIER[tier]);
    const onTrack = avail >= required;
    const behind = Math.max(0, required - avail);

    const verdict = document.getElementById("verdict");
    verdict.className = "dl-verdict " + (onTrack ? "ontrack" : "over");
    document.getElementById("vState").textContent = onTrack ? "On track" : "Over budget";
    document.getElementById("vDays").textContent = Math.max(0, daysLeft - 1);
    document.getElementById("bHave").textContent = avail + "h";
    document.getElementById("bNeedLbl").textContent = "need " + required + "h";
    document.getElementById("bFill").style.width = Math.min(100, Math.round((avail / required) * 100)) + "%";
    const honest = document.getElementById("vHonest");
    if (onTrack) {
      honest.innerHTML = "Comfortably feasible — about <b>" + (avail - required) + " h</b> of slack. You'll reach the full active-goal plan by the date, including the <b>Distributed Systems</b> track.";
    } else {
      honest.innerHTML = "Behind by <b>" + behind + " h</b>. Realistically you'll reach <b>solid backend + interview drills</b> by the date — the <b>Distributed Systems</b> track slips. Raise weekday hours or move the date to close the gap.";
    }

    // dated schedule — fill upcoming non-blackout days
    const list = document.getElementById("schedList");
    list.innerHTML = "";
    let q = 0, qLeft = PLAN[0][2];
    const d = new Date(today);
    let shown = 0;
    while (shown < 6 && d <= target) {
      const idx = gi(d.getDay());
      const dayH = hours[idx];
      const bo = isBlackout(d);
      const row = el("div", "sched-day");
      const dateEl = el("div", "sd-date" + (shown === 0 ? " today" : "")); dateEl.textContent = (shown === 0 ? "today" : MONTHS[d.getMonth()] + " " + d.getDate());
      const plan = el("div", "sd-plan");
      const min = el("div", "sd-min");
      if (bo) { row.className = "sched-day rest"; plan.textContent = "Blackout — no study"; min.textContent = "0m"; }
      else if (dayH === 0) { row.className = "sched-day rest"; plan.textContent = "Day off"; min.textContent = "—"; }
      else {
        let budget = dayH * 60; const parts = [];
        while (budget > 20 && q < PLAN.length) {
          const take = Math.min(qLeft, budget);
          parts.push('<span class="dom" style="color:var(' + PLAN[q][1] + ')">' + PLAN[q][0] + "</span>");
          budget -= take; qLeft -= take;
          if (qLeft <= 0) { q++; qLeft = q < PLAN.length ? PLAN[q][2] : 0; }
        }
        plan.innerHTML = parts.join(" · ") || "Review &amp; spaced cards";
        min.textContent = dayH * 60 + "m";
      }
      row.appendChild(dateEl); row.appendChild(plan); row.appendChild(min);
      list.appendChild(row);
      shown++;
      d.setDate(d.getDate() + 1);
    }
  }

  if (dlDate) dlDate.addEventListener("change", recompute);

  // depth tier (the one inside the deadline panel drives `required`)
  const depthTier = document.getElementById("depthTier");
  if (depthTier) {
    depthTier.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      depthTier.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      tier = b.textContent.trim();
      recompute();
    });
  }

  // blackout remove
  const blk = document.getElementById("blackouts");
  if (blk) blk.addEventListener("click", (e) => { if (e.target.matches("[data-x]")) e.target.closest(".blackout").remove(); });

  /* ── Goal priorities (P1/P2/P3 reflow on toggle) ───────────────────────── */
  const goals = document.getElementById("goals");
  if (goals) {
    goals.addEventListener("click", (e) => {
      const g = e.target.closest(".goal"); if (!g) return;
      g.setAttribute("aria-pressed", String(g.getAttribute("aria-pressed") !== "true"));
      let p = 0;
      goals.querySelectorAll('.goal[aria-pressed="true"]').forEach((x) => {
        const pr = x.querySelector(".g-prio"); if (pr) pr.textContent = "P" + (++p);
      });
    });
  }

  /* ── Advanced knob labels ──────────────────────────────────────────────── */
  const bd = document.getElementById("bd"), bdVal = document.getElementById("bdVal");
  if (bd) bd.addEventListener("input", () => { bdVal.textContent = bd.value < 35 ? "Breadth-leaning" : bd.value > 65 ? "Depth-leaning" : "Balanced"; });
  const pace = document.getElementById("pace"), paceVal = document.getElementById("paceVal");
  if (pace) pace.addEventListener("input", () => { paceVal.textContent = pace.value < 35 ? "Relaxed" : pace.value > 65 ? "Intense" : "Steady"; });

  /* ── Init ──────────────────────────────────────────────────────────────── */
  renderWeek();
  recompute();
})();
