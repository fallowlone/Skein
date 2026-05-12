import type { Bilingual } from "../types";

export type PretestChoice = { label: Bilingual; weight: 0 | 1 | 2 | 3 };
export type PretestQuestion = {
  id: string;
  prompt: Bilingual;
  choices: PretestChoice[];
};

export const pretestQuestions: PretestQuestion[] = [
  {
    id: "tcp",
    prompt: {
      en: "Why does TCP use a three-way handshake (SYN, SYN-ACK, ACK) instead of two messages?",
      ru: "Зачем TCP использует трёхэтапное рукопожатие (SYN, SYN-ACK, ACK), а не два сообщения?",
    },
    choices: [
      { label: { en: "I don't know what TCP is", ru: "Не знаю, что такое TCP" }, weight: 0 },
      { label: { en: "To make sure the message arrived", ru: "Чтобы убедиться, что сообщение дошло" }, weight: 1 },
      { label: { en: "Both sides must confirm initial sequence numbers and round-trip the offer", ru: "Обе стороны должны подтвердить начальные sequence numbers и пройти RTT" }, weight: 2 },
      { label: { en: "Three-way avoids half-open connections and lets each side advertise window + options atomically", ru: "Три этапа исключают half-open и позволяют обеим сторонам атомарно объявить окно и опции" }, weight: 3 },
    ],
  },
  {
    id: "db-index",
    prompt: {
      en: "When is a Postgres BRIN index a better fit than B-tree?",
      ru: "Когда BRIN-индекс в Postgres лучше, чем B-tree?",
    },
    choices: [
      { label: { en: "Never — B-tree is always best", ru: "Никогда — B-tree всегда лучше" }, weight: 0 },
      { label: { en: "For small tables", ru: "Для маленьких таблиц" }, weight: 1 },
      { label: { en: "When the column is correlated with physical row order (e.g. append-only timestamp)", ru: "Когда колонка коррелирует с физическим порядком строк (например, append-only timestamp)" }, weight: 2 },
      { label: { en: "On very large append-only tables where index size and write amplification dominate; BRIN trades selectivity for tiny on-disk footprint via per-range min/max summaries", ru: "На очень больших append-only таблицах, где размер индекса и write amplification критичны; BRIN жертвует селективностью ради крошечного размера через min/max по диапазонам" }, weight: 3 },
    ],
  },
  {
    id: "react",
    prompt: {
      en: "Why might passing an inline object to a memoized child cause re-renders even with React.memo?",
      ru: "Почему передача inline-объекта в memoized-ребёнка вызывает re-render даже с React.memo?",
    },
    choices: [
      { label: { en: "I haven't used React much", ru: "Мало работал с React" }, weight: 0 },
      { label: { en: "React.memo doesn't work on objects", ru: "React.memo не работает с объектами" }, weight: 1 },
      { label: { en: "The object identity changes every render", ru: "Identity объекта меняется на каждый render" }, weight: 2 },
      { label: { en: "Default React.memo uses Object.is for shallow prop comparison; an inline literal allocates a fresh reference per render, defeating memo unless you stabilize via useMemo or move the object out of render", ru: "React.memo по умолчанию использует Object.is для shallow-сравнения props; inline-литерал создаёт новую ссылку при каждом render, ломая memo, если не стабилизировать через useMemo или вынести объект из render" }, weight: 3 },
    ],
  },
];
