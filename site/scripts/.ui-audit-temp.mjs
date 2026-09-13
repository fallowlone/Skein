import { chromium } from "playwright";

const base = "http://127.0.0.1:4321";
const suffixes = [
  "/", "/about", "/account", "/achievements", "/algorithm-workspace", "/assess", "/calibrate",
  "/english/", "/english/grammar", "/english/grammar/coverage", "/english/reading", "/english/review",
  "/english/speaking", "/english/writing", "/glossary/", "/glossary/term", "/interview-qa", "/interview",
  "/learn/", "/learn/algorithms/", "/learn/algorithms/lab", "/profile", "/projects", "/projects/presigned-upload",
  "/readiness", "/review", "/roadmap", "/settings", "/terms",
];
const routes = ["/admin", ...["en", "ru"].flatMap((lang) => suffixes.map((suffix) => `/${lang}${suffix}`))];
const widths = [1440, 1024, 768, 430, 375];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.route("**/api/entitlements", (route) => route.fulfill({
  status: 200,
  contentType: "application/json",
  body: JSON.stringify({
    authenticated: false,
    entitlements: { coach: false },
    billing: { configured: false, sponsorUrl: null, provider: null, verification: "not_checked" },
    managedAi: { available: false, limit: 0, used: 0, remaining: 0, period: "2026-09", resetsAt: "2026-10-01T00:00:00.000Z" },
  }),
}));

const report = [];
for (const route of routes) {
  const logs = [];
  const onConsole = (message) => {
    if (message.type() === "error") logs.push(`console:${message.text()}`);
  };
  const onError = (error) => logs.push(`pageerror:${error.message}`);
  page.on("console", onConsole);
  page.on("pageerror", onError);

  let http = 0;
  let navError = null;
  try {
    await page.setViewportSize({ width: 1440, height: 900 });
    const response = await page.goto(base + route, { waitUntil: "domcontentloaded", timeout: 20_000 });
    http = response?.status() ?? 0;
    await page.waitForTimeout(route.includes("algorithm-workspace") ? 1200 : 450);
  } catch (error) {
    navError = String(error);
  }

  const widthResults = [];
  for (const width of widths) {
    await page.setViewportSize({ width, height: width <= 430 ? 844 : 900 });
    await page.waitForTimeout(30);
    const data = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      bodyOverflow: document.body.scrollWidth - window.innerWidth,
    }));
    widthResults.push({ width, ...data });
  }

  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  await page.setViewportSize({ width: 375, height: 844 });
  await page.waitForTimeout(20);
  const dark375 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(20);
  const dark1440 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

  const dom = await page.evaluate(() => {
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    const name = (element) => (
      element.getAttribute("aria-label") || element.getAttribute("title") || element.textContent || ""
    ).replace(/\s+/g, " ").trim();

    const unlabeled = [];
    for (const element of document.querySelectorAll('button,input:not([type="hidden"]),select,textarea')) {
      if (!visible(element)) continue;
      const id = element.id;
      const labelled = element.getAttribute("aria-label") || element.getAttribute("aria-labelledby") || element.getAttribute("title")
        || (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) || element.closest("label");
      if (element.tagName === "BUTTON" && name(element)) continue;
      if (!labelled) unlabeled.push(`${element.tagName.toLowerCase()}${element.getAttribute("type") ? `[${element.getAttribute("type")}]` : ""}:${String(element.className).slice(0, 60)}`);
    }

    const smallButtons = [...document.querySelectorAll("button")]
      .filter(visible)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return { name: name(element).slice(0, 80), width: Math.round(rect.width), height: Math.round(rect.height), className: String(element.className).slice(0, 80) };
      })
      .filter((item) => Math.min(item.width, item.height) < 28)
      .slice(0, 12);

    const roleButtons = [...document.querySelectorAll('[role="button"]')]
      .filter((element) => visible(element) && !["BUTTON", "A", "INPUT"].includes(element.tagName))
      .map((element) => `${element.tagName}:${name(element).slice(0, 80)}`)
      .slice(0, 10);
    const images = [...document.querySelectorAll("img")]
      .filter(visible)
      .filter((element) => !element.hasAttribute("alt"))
      .map((element) => element.getAttribute("src") || "img")
      .slice(0, 10);
    const ids = [...document.querySelectorAll("[id]")].map((element) => element.id);
    const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))].slice(0, 10);
    const islands = [...document.querySelectorAll("astro-island")]
      .filter((island) => ["only", "load", "idle"].includes(island.getAttribute("client") || "") && !island.hasAttribute("client-render-time"))
      .map((island) => island.getAttribute("component-url"));

    return {
      unlabeled: unlabeled.slice(0, 10),
      smallButtons,
      roleButtons,
      images,
      duplicates,
      islands,
      mainCount: document.querySelectorAll("main").length,
      h1Count: document.querySelectorAll("h1").length,
      hasSkip: Boolean(document.querySelector('a[href="#main"]')),
    };
  });

  page.off("console", onConsole);
  page.off("pageerror", onError);
  report.push({ route, http, navError, widths: widthResults, dark375, dark1440, logs: [...new Set(logs)].slice(0, 12), ...dom });
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light")).catch(() => {});
}

await browser.close();
await Bun.write("/tmp/skein-ui-sweep.json", JSON.stringify(report, null, 2));

const flagged = report.filter((item) => item.navError || item.http >= 400 || item.widths.some((width) => width.overflow > 1)
  || item.dark375 > 1 || item.dark1440 > 1 || item.logs.length || item.unlabeled.length || item.roleButtons.length
  || item.images.length || item.duplicates.length || item.islands.length || item.mainCount !== 1);

console.log(`routes=${report.length} flagged=${flagged.length}`);
for (const item of flagged) {
  console.log(JSON.stringify({
    route: item.route,
    http: item.http,
    overflow: item.widths.filter((width) => width.overflow > 1),
    dark375: item.dark375,
    dark1440: item.dark1440,
    logs: item.logs,
    unlabeled: item.unlabeled,
    smallButtons: item.smallButtons,
    roleButtons: item.roleButtons,
    images: item.images,
    duplicates: item.duplicates,
    islands: item.islands,
    mainCount: item.mainCount,
    h1Count: item.h1Count,
  }, null, 2));
}
