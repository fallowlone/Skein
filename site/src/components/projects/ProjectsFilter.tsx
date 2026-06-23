import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import type { ProjectData } from "~/content.config";

const tt = (lang: Locale, en: string, ru: string) => (lang === "en" ? en : ru);

export function filterProjects(
  projects: ProjectData[],
  track: string,
  difficulty: string,
  category: string,
): ProjectData[] {
  return projects.filter(
    (p) =>
      (track === "all" || p.tracks.includes(track)) &&
      (difficulty === "all" || p.difficulty === difficulty) &&
      (category === "all" || p.category === category),
  );
}

type Props = { lang: Locale; projects: ProjectData[] };

export default function ProjectsFilter({ lang, projects }: Props) {
  const [track, setTrack] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [category, setCategory] = useState("all");

  const tracks = Array.from(new Set(projects.flatMap((p) => p.tracks))).sort();
  const shown = filterProjects(projects, track, difficulty, category);

  return (
    <div>
      <div class="proj-filters">
        <select class="proj-select" value={category} onChange={(e) => setCategory((e.target as HTMLSelectElement).value)}>
          <option value="all">{tt(lang, "All categories", "Все категории")}</option>
          {[["frontend","Frontend"],["backend","Backend"],["fullstack","Fullstack"],["infra","Infra"],["data","Data"],["systems","Systems"],["security","Security"],["algorithms","Algorithms"]].map(([v,l]) => <option value={v} key={v}>{l}</option>)}
        </select>
        <select class="proj-select" value={track} onChange={(e) => setTrack((e.target as HTMLSelectElement).value)}>
          <option value="all">{tt(lang, "All tracks", "Все треки")}</option>
          {tracks.map((tr) => <option value={tr} key={tr}>{tr}</option>)}
        </select>
        <select class="proj-select" value={difficulty} onChange={(e) => setDifficulty((e.target as HTMLSelectElement).value)}>
          <option value="all">{tt(lang, "All levels", "Все уровни")}</option>
          {["starter", "intermediate", "advanced"].map((d) => <option value={d} key={d}>{d}</option>)}
        </select>
      </div>
      <ul class="proj-grid">
        {shown.map((p) => (
          <li key={p.slug} class="proj-card">
            <div class="pc-head">
              <h3 class="pc-title">{tt(lang, p.title.en, p.title.ru)}</h3>
              <span class="pc-meta">{p.difficulty} · {p.estDays}d</span>
            </div>
            <p class="pc-pitch">{tt(lang, p.pitch.en, p.pitch.ru)}</p>
            <div class="pc-tracks">
              {p.tracks.map((tr: string) => <span key={tr} class="pc-track">{tr}</span>)}
            </div>
            <a href={`/${lang}/projects/${p.slug}`} class="pc-link">{tt(lang, "Open project →", "Открыть проект →")}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
