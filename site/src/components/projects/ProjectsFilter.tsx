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
      <div class="flex flex-wrap gap-3 mb-6">
        <select class="text-sm border border-rule rounded-[var(--r-sm)] px-2 py-1 bg-card" value={category} onChange={(e) => setCategory((e.target as HTMLSelectElement).value)}>
          <option value="all">{tt(lang, "All categories", "Все категории")}</option>
          {[["frontend","Frontend"],["backend","Backend"],["fullstack","Fullstack"],["infra","Infra"]].map(([v,l]) => <option value={v} key={v}>{l}</option>)}
        </select>
        <select class="text-sm border border-rule rounded-[var(--r-sm)] px-2 py-1 bg-card" value={track} onChange={(e) => setTrack((e.target as HTMLSelectElement).value)}>
          <option value="all">{tt(lang, "All tracks", "Все треки")}</option>
          {tracks.map((tr) => <option value={tr} key={tr}>{tr}</option>)}
        </select>
        <select class="text-sm border border-rule rounded-[var(--r-sm)] px-2 py-1 bg-card" value={difficulty} onChange={(e) => setDifficulty((e.target as HTMLSelectElement).value)}>
          <option value="all">{tt(lang, "All levels", "Все уровни")}</option>
          {["starter", "intermediate", "advanced"].map((d) => <option value={d} key={d}>{d}</option>)}
        </select>
      </div>
      <ul class="grid gap-4 md:grid-cols-2">
        {shown.map((p) => (
          <li key={p.slug} class="rounded-[var(--r-lg)] border-[0.5px] border-hairline-2 bg-card p-5">
            <div class="flex items-center justify-between gap-2 mb-1">
              <h3 class="font-bold text-ink">{tt(lang, p.title.en, p.title.ru)}</h3>
              <span class="text-[10px] font-mono uppercase tracking-wide text-muted">{p.difficulty} · {p.estDays}d</span>
            </div>
            <p class="text-sm text-muted mb-2">{tt(lang, p.pitch.en, p.pitch.ru)}</p>
            <div class="flex flex-wrap gap-1 mb-2">
              {p.tracks.map((tr) => <span key={tr} class="text-[10px] font-mono px-2 py-0.5 rounded-full border border-rule text-muted">{tr}</span>)}
            </div>
            <a href={`/${lang}/projects/${p.slug}`} class="text-sm text-ok font-semibold">{tt(lang, "Open project →", "Открыть проект →")}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
