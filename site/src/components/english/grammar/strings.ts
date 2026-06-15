// Bilingual UI strings for the grammar surfaces. Kept module-local (like the
// inline `L` maps the other English modules use) rather than in ui.json, since
// they are specific to this section. RU is verbatim from the design handoff.
import type { Locale } from "~/i18n";
import type { Bi } from "~/english/types";

const GUI: Record<string, Bi> = {
  crumb_grammar: { en: "Grammar", ru: "Грамматика" },
  nav_english: { en: "English for Engineers", ru: "Английский для инженеров" },
  back_hub: { en: "← Hub", ru: "← Хаб" },
  see_coverage: { en: "Coverage", ru: "Покрытие" },

  // atlas
  atlas_title_a: { en: "The grammar of", ru: "Грамматика" },
  atlas_title_b: { en: "a working language.", ru: "рабочего языка." },
  atlas_lede: {
    en: "122 topics, surveyed by family and level — from first contact to the edges of C2. Open a region, study the plate, then practise without end.",
    ru: "122 темы, размеченные по семействам и уровням — от первого касания до границ C2. Откройте регион, изучите схему и практикуйтесь без конца.",
  },
  stat_topics: { en: "topics", ru: "тем" },
  stat_families: { en: "families", ru: "семейств" },
  stat_mastered: { en: "mastered", ru: "освоено" },
  search_ph: { en: "Search topics…", ru: "Поиск тем…" },
  filter_band: { en: "Band", ru: "Уровень" },
  filter_family: { en: "Family", ru: "Семейство" },
  all: { en: "All", ru: "Все" },
  topics_n: { en: "topics", ru: "тем" },
  empty_title: { en: "No topics in this view", ru: "Нет тем в этом срезе" },
  empty_body: {
    en: "No topic matches this band-and-family combination. Clear a filter to widen the map.",
    ru: "Ни одна тема не подходит под это сочетание. Снимите фильтр, чтобы расширить карту.",
  },
  clear_filters: { en: "Clear filters", ru: "Сбросить фильтры" },
  placement_required: { en: "placement required", ru: "нужен тест" },

  // topic page
  explain_primary: { en: "Teaching · RU", ru: "Объяснение · RU" },
  explain_secondary: { en: "In English", ru: "По-английски" },
  structure_label: { en: "The rule", ru: "Правило" },
  examples_label: { en: "Examples", ru: "Примеры" },
  pitfall_label: { en: "Common pitfall", ru: "Частая ошибка" },
  pitfall_why: { en: "Why", ru: "Почему" },
  confusables_label: { en: "Confusables & related", ru: "Похожие и смежные" },
  contrast_with: { en: "Often confused with", ru: "Часто путают с" },
  plate_fig: { en: "Plate", ru: "Схема" },
  plate_text: { en: "figure · 800×450 · animated", ru: "схема · 800×450 · анимация" },
  reduced_motion: { en: "reduced motion · poster", ru: "без анимации · кадр" },
  practice_this: { en: "Practise this topic", ru: "Практиковать тему" },
  items_ready: { en: "items · endless", ru: "заданий · без конца" },
  mastery_label: { en: "Your mastery", ru: "Ваше освоение" },
  due_in: { en: "review due", ru: "повтор" },
  due_today: { en: "due today", ru: "сегодня" },
  due_soon: { en: "in {n}d", ru: "через {n}д" },
  level_locked: { en: "Pass a B2 placement to open C1–C2.", ru: "Сдайте тест на B2, чтобы открыть C1–C2." },
  take_placement: { en: "Take placement", ru: "Пройти тест" },

  // mastery states
  ms_new: { en: "New", ru: "Новая" },
  ms_learning: { en: "Learning", ru: "Изучается" },
  ms_review: { en: "In review", ru: "На повторе" },
  ms_mature: { en: "Mature", ru: "Освоена" },

  // practice runner
  prac_check: { en: "Check", ru: "Проверить" },
  prac_next: { en: "Next", ru: "Далее" },
  prac_skip: { en: "Skip", ru: "Пропустить" },
  prac_correct: { en: "Correct", ru: "Верно" },
  prac_incorrect: { en: "Not quite", ru: "Почти" },
  prac_answer: { en: "Answer", ru: "Ответ" },
  prac_cross: { en: "Mix related topics", ru: "Смешать смежные" },
  prac_stronger: { en: "this topic is getting stronger", ru: "тема укрепляется" },
  prac_generating: { en: "Generating a fresh item", ru: "Генерируем новое задание" },
  prac_gen_sub: { en: "one of 100+ for this topic", ru: "одно из 100+ для этой темы" },
  prac_cloze: { en: "Fill in the blank", ru: "Заполните пропуск" },
  prac_mc: { en: "Multiple choice", ru: "Выбор ответа" },
  prac_type_here: { en: "Type your answer…", ru: "Введите ответ…" },
  prac_exit: { en: "← Back to topic", ru: "← К теме" },
  prac_done_title: { en: "Session complete", ru: "Сессия завершена" },
  prac_done_line: {
    en: "Practice moved this topic forward — its next review is scheduled.",
    ru: "Практика продвинула тему вперёд — следующий повтор запланирован.",
  },
  prac_again: { en: "Practise again", ru: "Ещё раз" },
  prac_back_topic: { en: "Back to topic", ru: "К теме" },
  sd_right: { en: "right", ru: "верно" },
  sd_streak: { en: "best streak", ru: "лучшая серия" },
  sd_strength: { en: "strength", ru: "сила" },
  byok_title: { en: "Generate more with your own AI", ru: "Больше заданий через ваш ИИ" },
  byok_sub: { en: "key connected · your model writes extra items", ru: "ключ подключён · ваша модель пишет задания" },
  byok_exp: { en: "experimental", ru: "эксперимент" },
  prac_unavailable: {
    en: "Generative practice for this topic is coming soon.",
    ru: "Генеративная практика для этой темы скоро появится.",
  },

  // coverage
  cov_title: { en: "Coverage", ru: "Покрытие" },
  cov_lede: {
    en: "How much of the English Grammar Profile this corpus covers, band by band. An instrument, not a score.",
    ru: "Насколько корпус покрывает English Grammar Profile, уровень за уровнем. Инструмент, а не оценка.",
  },
  cov_covered: { en: "covered", ru: "покрыто" },
  cov_partial: { en: "not yet", ru: "пока нет" },
  cov_waived: { en: "waived", ru: "вне охвата" },
  cov_covered_def: { en: "tagged by a topic in the corpus", ru: "размечено темой в корпусе" },
  cov_partial_def: { en: "in scope, not yet tagged", ru: "в охвате, ещё не размечено" },
  cov_waived_def: { en: "out of scope by design", ru: "намеренно вне охвата" },
  cov_egp: { en: "EGP competencies", ru: "компетенции EGP" },
  cov_drill: { en: "Topics covering this band", ru: "Темы этого уровня" },
  cov_overall: { en: "EGP covered", ru: "EGP покрыто" },
  cov_cite: { en: "mapped to the English Grammar Profile", ru: "по English Grammar Profile" },
};

export function gt(key: string, lang: Locale): string {
  const e = GUI[key];
  return e ? e[lang] || e.en : key;
}

const MS_KEY: Record<string, string> = {
  new: "ms_new",
  learning: "ms_learning",
  review: "ms_review",
  mature: "ms_mature",
};
export function masteryStateLabel(state: string, lang: Locale): string {
  return gt(MS_KEY[state] ?? "ms_new", lang);
}
