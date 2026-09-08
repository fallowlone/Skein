import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";

const tt = (lang: Locale, en: string, ru: string) => (lang === "en" ? en : ru);

/** The only fields this island renders or filters on.
 *
 *  Deliberately NOT `ProjectData`: passing the whole entry serialised every
 *  milestone, rubric and reference text of all 51 projects — in both locales —
 *  into the island's `props` attribute, which alone weighed 1.57 MB of HTML on
 *  /projects/. The page builds this projection instead (~5% of the bytes). */
export type ProjectCard = {
  slug: string;
  title: string;
  pitch: string;
  tracks: string[];
  difficulty: string;
  category: string;
  estDays: number;
  workbench?: boolean;
};

export function filterProjects<T extends Pick<ProjectCard, "tracks" | "difficulty" | "category" | "workbench">>(
  projects: T[],
  track: string,
  difficulty: string,
  category: string = "all",
  runnable: string = "all",
): T[] {
  return projects.filter(
    (p) =>
      (track === "all" || p.tracks.includes(track)) &&
      (difficulty === "all" || p.difficulty === difficulty) &&
      (category === "all" || p.category === category) &&
      (runnable === "all" || p.workbench === true),
  );
}

type Props = { lang: Locale; projects: ProjectCard[] };

export default function ProjectsFilter({ lang, projects }: Props) {
  const [track, setTrack] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [category, setCategory] = useState("all");
  const [runnable, setRunnable] = useState("all");
  const [buildList, setBuildList] = useState<string[]>([]);

  const tracks = Array.from(new Set(projects.flatMap((p) => p.tracks))).sort();
  const runnableTotal = projects.filter((p) => p.workbench === true).length;
  const shown = filterProjects(projects, track, difficulty, category, runnable);
  const selected = buildList.map((slug) => projects.find((p) => p.slug === slug)).filter((p): p is ProjectCard => Boolean(p));

  const toggleProject = (slug: string) => {
    setBuildList((current) => current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug]);
  };

  const openAll = () => {
    for (const project of selected) window.open(`/${lang}/projects/${project.slug}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div class={buildList.length ? "projects-with-cart" : undefined}>
      {/* Each select needs a programmatic name: the "All …" option reads as a
          value, not as what the control does. */}
      <div class="proj-filters">
        <select class="proj-select" aria-label={tt(lang, "Category", "Категория")} value={category} onChange={(e) => setCategory((e.target as HTMLSelectElement).value)}>
          <option value="all">{tt(lang, "All categories", "Все категории")}</option>
          {[["frontend","Frontend"],["backend","Backend"],["fullstack","Fullstack"],["infra","Infra"],["data","Data"],["systems","Systems"],["security","Security"],["algorithms","Algorithms"]].map(([v,l]) => <option value={v} key={v}>{l}</option>)}
        </select>
        <select class="proj-select" aria-label={tt(lang, "Track", "Трек")} value={track} onChange={(e) => setTrack((e.target as HTMLSelectElement).value)}>
          <option value="all">{tt(lang, "All tracks", "Все треки")}</option>
          {tracks.map((tr) => <option value={tr} key={tr}>{tr}</option>)}
        </select>
        <select class="proj-select" aria-label={tt(lang, "Level", "Уровень")} value={difficulty} onChange={(e) => setDifficulty((e.target as HTMLSelectElement).value)}>
          <option value="all">{tt(lang, "All levels", "Все уровни")}</option>
          {["starter", "intermediate", "advanced"].map((d) => <option value={d} key={d}>{d}</option>)}
        </select>
        <select class="proj-select" aria-label={tt(lang, "Kind", "Вид")} value={runnable} onChange={(e) => setRunnable((e.target as HTMLSelectElement).value)}>
          <option value="all">{tt(lang, "All projects", "Все проекты")}</option>
          <option value="runnable">{tt(lang, "Runnable only", "Только запускаемые")}</option>
        </select>
      </div>
      <p class="proj-count">
        {tt(lang, `${shown.length} shown · ${runnableTotal} runnable starters`, `Показано: ${shown.length} · запускаемых стартеров: ${runnableTotal}`)}
      </p>
      <ul class="proj-grid">
        {shown.map((p) => (
          <li key={p.slug} class="proj-card">
            <div class="pc-head">
              <h2 class="pc-title">{p.title}</h2>
              <span class="pc-meta">{p.difficulty} · {p.estDays}d</span>
            </div>
            <p class="pc-pitch">{p.pitch}</p>
            <div class="pc-tracks">
              {p.workbench && <span class="pc-runnable" title={tt(lang, "Downloadable starter + tests you run", "Скачиваемый стартер + тесты для запуска")}>{tt(lang, "● Runnable", "● Запускаемый")}</span>}
              {p.tracks.map((tr: string) => <span key={tr} class="pc-track">{tr}</span>)}
            </div>
            <div class="pc-actions">
              <a href={`/${lang}/projects/${p.slug}`} class="pc-link">{tt(lang, "Open project →", "Открыть проект →")}</a>
              <button
                type="button"
                class="pc-add"
                aria-pressed={buildList.includes(p.slug)}
                onClick={() => toggleProject(p.slug)}
              >
                {buildList.includes(p.slug) ? tt(lang, "✓ Added", "✓ Добавлено") : tt(lang, "+ Add", "+ Добавить")}
              </button>
            </div>
          </li>
        ))}
      </ul>

      {buildList.length > 0 && (
        <aside class="project-cart" aria-label={tt(lang, "Build list", "Список проектов")}>
          <strong class="project-cart-title">{tt(lang, `Build list (${buildList.length})`, `Список (${buildList.length})`)}</strong>
          <div class="project-cart-items">
            {selected.map((p) => (
              <span class="project-cart-chip" key={p.slug}>
                <span>{p.title}</span>
                <button type="button" aria-label={tt(lang, `Remove ${p.title}`, `Убрать ${p.title}`)} onClick={() => toggleProject(p.slug)}>×</button>
              </span>
            ))}
          </div>
          <div class="project-cart-actions">
            <a class="project-cart-export" href={`/${lang}/settings#coach-plan`}>
              <span class="project-cart-export-icon" aria-hidden="true">↗</span>
              <span>
                <strong>{tt(lang, "Unlock Coach", "Открыть Coach")}</strong>
                <small>{tt(lang, "Managed AI reviews · See offer", "Managed AI-разборы · Подробнее")}</small>
              </span>
            </a>
            <button type="button" class="project-cart-open" onClick={openAll}>
              <span aria-hidden="true">↗</span>
              <span><strong>{tt(lang, "Open all", "Открыть все")}</strong><small>{buildList.length} {tt(lang, "tabs", "вкладки")}</small></span>
            </button>
            <button type="button" class="project-cart-collapse" aria-label={tt(lang, "Collapse build list", "Свернуть список")}>⌃</button>
          </div>
        </aside>
      )}
    </div>
  );
}
