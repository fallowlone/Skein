/* ============================================================================
   OPEN ATLAS — PERSONAL CABINET behaviours
   Identity toggle · data export/import/reset · BYOK key mgmt · motion pref
   Theme + language handled by app.js (data-theme-set / data-lang-set).
   ============================================================================ */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);

  /* ── Identity: sign in / out (demonstrates both states) ─────────────────── */
  const loggedIn = $("loggedIn"), loggedOut = $("loggedOut"), topSync = $("topSync");
  function setSignedIn(on) {
    loggedIn.hidden = !on;
    loggedOut.hidden = on;
    if (topSync) {
      topSync.className = "sync " + (on ? "synced" : "offline");
      topSync.innerHTML = '<span class="sdot"></span>' + (on ? "synced · just now" : "local only · not synced");
    }
  }
  const so = $("signOut"); if (so) so.addEventListener("click", () => setSignedIn(false));
  const si = $("signIn"); if (si) si.addEventListener("click", () => setSignedIn(true));

  /* ── Data: export / import / reset ──────────────────────────────────────── */
  const dataMsg = $("dataMsg");
  const SAMPLE = {
    app: "open-atlas", version: 1, exportedAt: null,
    rating: 1840, rank: 13, englishCEFR: "B1", streak: 23, bestStreak: 61,
    goal: "Senior fullstack", dueToday: 38, marks: 47,
  };
  const exp = $("exportBtn");
  if (exp) exp.addEventListener("click", () => {
    const data = Object.assign({}, SAMPLE, { exportedAt: new Date().toISOString() });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "open-atlas-progress.json"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    if (dataMsg) dataMsg.textContent = "last export — just now · 1.2 MB stored locally";
  });
  const imp = $("importFile");
  if (imp) imp.addEventListener("change", () => {
    const f = imp.files && imp.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { if (dataMsg) dataMsg.textContent = "imported “" + f.name + "” · merged into local storage"; };
    r.readAsText(f);
  });
  // reset — two-step confirm inline
  const resetControl = $("resetControl");
  if (resetControl) resetControl.addEventListener("click", (e) => {
    if (e.target.id === "resetBtn") {
      resetControl.innerHTML = '<span class="confirm-row"><span class="cw">Erase everything?</span><button class="btn btn-danger btn-sm" id="resetYes">Yes, reset</button><button class="btn btn-quiet btn-sm" id="resetNo">Cancel</button></span>';
    } else if (e.target.id === "resetNo") {
      resetControl.innerHTML = '<button class="btn btn-danger btn-sm" id="resetBtn">Reset…</button>';
    } else if (e.target.id === "resetYes") {
      resetControl.innerHTML = '<span class="cw" style="font-family:var(--font-mono);font-size:11px">progress reset · reload to start fresh</span>';
      if (dataMsg) dataMsg.textContent = "local data cleared · 0 KB stored";
    }
  });

  /* ── BYOK ───────────────────────────────────────────────────────────────── */
  const keyField = $("keyField"), keyStatus = $("keyStatus");
  const replaceKey = $("replaceKey"), removeKey = $("removeKey");
  if (replaceKey) replaceKey.addEventListener("click", () => {
    keyField.readOnly = false; keyField.value = ""; keyField.placeholder = "Paste your provider API key…"; keyField.focus();
    keyStatus.innerHTML = '<span class="kd" style="background:var(--warn)"></span>Enter a new key';
    keyStatus.style.color = "var(--warn)";
  });
  if (keyField) keyField.addEventListener("change", () => {
    if (keyField.value.trim()) {
      keyField.readOnly = true;
      keyField.value = "sk-••••••••••••••••••••••••" + keyField.value.slice(-4);
      keyStatus.innerHTML = '<span class="kd"></span>Key connected · powers Speaking &amp; Writing';
      keyStatus.style.color = "var(--ok)";
    }
  });
  if (removeKey) removeKey.addEventListener("click", () => {
    keyField.value = ""; keyField.placeholder = "No key — Speaking & Writing are paused";
    keyStatus.innerHTML = '<span class="kd" style="background:var(--faint)"></span>No key on file';
    keyStatus.style.color = "var(--muted)";
  });
  const providers = $("providers");
  if (providers) providers.addEventListener("click", (e) => {
    const p = e.target.closest(".provider"); if (!p) return;
    providers.querySelectorAll(".provider").forEach((x) => x.setAttribute("aria-pressed", String(x === p)));
  });

  /* ── Motion preference ──────────────────────────────────────────────────── */
  const motionSeg = $("motionSeg");
  if (motionSeg) motionSeg.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    motionSeg.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    const mode = b.textContent.trim().toLowerCase();
    const reduce = mode === "off" || (mode === "auto" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    document.documentElement.style.setProperty("scroll-behavior", reduce ? "auto" : "");
    localStorage.setItem("oa-motion", mode);
  });

  /* generic single-select segs without explicit handlers (reading depth/width) */
  document.querySelectorAll('.set-control .seg[aria-label="Reading depth"], .set-control .seg[aria-label="Reading width"]').forEach((grp) => {
    grp.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      grp.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    });
  });
})();
