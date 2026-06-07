/* Open Atlas — design-language page behaviours: theme, language, contour, copy */
(function () {
  const root = document.documentElement;

  /* ── Theme ────────────────────────────────────────────────────────────── */
  const savedTheme = localStorage.getItem("oa-theme") || "light";
  root.setAttribute("data-theme", savedTheme);
  function setTheme(t) {
    root.setAttribute("data-theme", t);
    localStorage.setItem("oa-theme", t);
    syncThemeButtons();
  }
  function syncThemeButtons() {
    const t = root.getAttribute("data-theme");
    document.querySelectorAll("[data-theme-set]").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.themeSet === t))
    );
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-theme-set]");
    if (b) setTheme(b.dataset.themeSet);
    const tog = e.target.closest("[data-theme-toggle]");
    if (tog) setTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark");
  });

  /* ── Language ─────────────────────────────────────────────────────────── */
  const savedLang = localStorage.getItem("oa-lang") || "en";
  function applyLang(lang) {
    document.querySelectorAll("[data-en]").forEach((el) => {
      const val = el.getAttribute("data-" + lang);
      if (val != null) el.textContent = val;
    });
    document.querySelectorAll("[data-en-ph]").forEach((el) => {
      const val = el.getAttribute("data-" + lang + "-ph");
      if (val != null) el.setAttribute("placeholder", val);
    });
    root.setAttribute("data-lang", lang);
    localStorage.setItem("oa-lang", lang);
    document.querySelectorAll("[data-lang-set]").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.langSet === lang))
    );
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-lang-set]");
    if (b) applyLang(b.dataset.langSet);
  });

  /* ── Copy buttons ─────────────────────────────────────────────────────── */
  document.addEventListener("click", (e) => {
    const c = e.target.closest(".code-copy");
    if (!c) return;
    const pre = c.closest(".code").querySelector("pre");
    navigator.clipboard?.writeText(pre.innerText).catch(() => {});
    const lbl = c.querySelector("span");
    const prev = lbl.textContent;
    lbl.textContent = "copied";
    setTimeout(() => (lbl.textContent = prev), 1200);
  });

  /* ── Init ─────────────────────────────────────────────────────────────── */
  syncThemeButtons();
  applyLang(savedLang);
})();
