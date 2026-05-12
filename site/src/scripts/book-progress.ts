export function initProgressBar() {
  const bar = document.querySelector<HTMLElement>("[data-progress-bar]");
  if (!bar) return;
  function update() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max <= 0 ? 100 : (window.scrollY / max) * 100;
    bar!.style.width = `${Math.min(100, Math.max(0, pct))}%`;
  }
  update();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
}

export function activateTocOnScroll() {
  const links = document.querySelectorAll<HTMLAnchorElement>("[data-toc-link]");
  if (links.length === 0) return;
  const targets = Array.from(links)
    .map((a) => document.querySelector(a.getAttribute("href") ?? ""))
    .filter((el): el is HTMLElement => Boolean(el));
  const linkByEl = new Map<HTMLElement, HTMLAnchorElement>();
  targets.forEach((el, i) => linkByEl.set(el, links[i]!));

  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          links.forEach((a) => a.classList.remove("toc-active"));
          linkByEl.get(e.target as HTMLElement)?.classList.add("toc-active");
        }
      });
    },
    { rootMargin: "-30% 0px -60% 0px" }
  );
  targets.forEach((el) => obs.observe(el));
}
