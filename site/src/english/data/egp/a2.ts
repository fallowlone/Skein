// AUTHORED per-band EGP inventory (original phrasing). A2 canonical syllabus —
// the grammar a serious A2 course must teach, as an honest external yardstick of
// what English requires at A2 (not a mirror of any one course's contents).
import { makeEgpId, type EgpEntry } from "./types";

export const entries: EgpEntry[] = [
  // ── verbs ──────────────────────────────────────────────────────────────
  {
    id: makeEgpId("A2", "verbs", "common-irregular-past"),
    cefr: "A2",
    category: "verbs",
    can_do: {
      en: "Can use the past simple of common irregular verbs (went, saw, took, had).",
      ru: "Умеет использовать прошедшее простое распространённых неправильных глаголов (went, saw, took, had).",
    },
  },
  {
    id: makeEgpId("A2", "verbs", "infinitive-of-purpose"),
    cefr: "A2",
    category: "verbs",
    can_do: {
      en: "Can use 'to' + verb to say why someone does something ('I came to help').",
      ru: "Умеет использовать 'to' + глагол, чтобы объяснить цель действия ('I came to help').",
    },
  },
  {
    id: makeEgpId("A2", "verbs", "verb-plus-gerund-or-infinitive"),
    cefr: "A2",
    category: "verbs",
    can_do: {
      en: "Can follow common verbs with -ing or 'to' (like swimming, want to go).",
      ru: "Умеет ставить после распространённых глаголов -ing или 'to' (like swimming, want to go).",
    },
  },
  {
    id: makeEgpId("A2", "verbs", "phrasal-verbs-everyday"),
    cefr: "A2",
    category: "verbs",
    can_do: {
      en: "Can use frequent two-word verbs (get up, turn on, look for).",
      ru: "Умеет использовать частотные фразовые глаголы (get up, turn on, look for).",
    },
  },
  {
    id: makeEgpId("A2", "verbs", "have-got-possession"),
    cefr: "A2",
    category: "verbs",
    can_do: {
      en: "Can use 'have got' to talk about possession and relationships.",
      ru: "Умеет использовать 'have got' для разговора об обладании и отношениях.",
    },
  },
  {
    id: makeEgpId("A2", "verbs", "there-was-there-were"),
    cefr: "A2",
    category: "verbs",
    can_do: {
      en: "Can use 'there was' and 'there were' to describe past situations.",
      ru: "Умеет использовать 'there was' и 'there were' для описания прошлых ситуаций.",
    },
  },

  // ── tenses-aspect ──────────────────────────────────────────────────────
  {
    id: makeEgpId("A2", "tenses-aspect", "past-simple-regular-negatives-questions"),
    cefr: "A2",
    category: "tenses-aspect",
    can_do: {
      en: "Can form past simple statements, negatives and questions with 'did' and '-ed' verbs.",
      ru: "Умеет строить утверждения, отрицания и вопросы в прошедшем простом с 'did' и глаголами на '-ed'.",
    },
  },
  {
    id: makeEgpId("A2", "tenses-aspect", "past-continuous-interrupted"),
    cefr: "A2",
    category: "tenses-aspect",
    can_do: {
      en: "Can use the past continuous for an action in progress, often interrupted by another.",
      ru: "Умеет использовать прошедшее продолженное для действия в процессе, часто прерванного другим.",
    },
  },
  {
    id: makeEgpId("A2", "tenses-aspect", "present-continuous-now-and-arrangements"),
    cefr: "A2",
    category: "tenses-aspect",
    can_do: {
      en: "Can use the present continuous for actions now and fixed future arrangements.",
      ru: "Умеет использовать настоящее продолженное для действий сейчас и для запланированных будущих договорённостей.",
    },
  },
  {
    id: makeEgpId("A2", "tenses-aspect", "present-perfect-experience"),
    cefr: "A2",
    category: "tenses-aspect",
    can_do: {
      en: "Can use the present perfect with 'ever'/'never' to talk about life experience.",
      ru: "Умеет использовать настоящее совершенное с 'ever'/'never' для разговора о жизненном опыте.",
    },
  },
  {
    id: makeEgpId("A2", "tenses-aspect", "going-to-future-plans"),
    cefr: "A2",
    category: "tenses-aspect",
    can_do: {
      en: "Can use 'be going to' for plans and intentions and visible predictions.",
      ru: "Умеет использовать 'be going to' для планов, намерений и очевидных прогнозов.",
    },
  },
  {
    id: makeEgpId("A2", "tenses-aspect", "will-future-decisions-predictions"),
    cefr: "A2",
    category: "tenses-aspect",
    can_do: {
      en: "Can use 'will' for spontaneous decisions, offers and simple predictions.",
      ru: "Умеет использовать 'will' для спонтанных решений, предложений и простых прогнозов.",
    },
  },
  {
    id: makeEgpId("A2", "tenses-aspect", "present-simple-frequency"),
    cefr: "A2",
    category: "tenses-aspect",
    can_do: {
      en: "Can describe routines using the present simple with frequency adverbs.",
      ru: "Умеет описывать привычные действия в настоящем простом с наречиями частотности.",
    },
  },
  {
    id: makeEgpId("A2", "tenses-aspect", "used-to-past-habits"),
    cefr: "A2",
    category: "tenses-aspect",
    can_do: {
      en: "Can use 'used to' for past habits and states that are no longer true.",
      ru: "Умеет использовать 'used to' для прошлых привычек и состояний, которых больше нет.",
    },
  },

  // ── modality ───────────────────────────────────────────────────────────
  {
    id: makeEgpId("A2", "modality", "should-advice"),
    cefr: "A2",
    category: "modality",
    can_do: {
      en: "Can give and ask for advice with 'should' and 'shouldn't'.",
      ru: "Умеет давать и просить совет с помощью 'should' и 'shouldn't'.",
    },
  },
  {
    id: makeEgpId("A2", "modality", "have-to-obligation"),
    cefr: "A2",
    category: "modality",
    can_do: {
      en: "Can express obligation and lack of obligation with 'have to' / 'don't have to'.",
      ru: "Умеет выражать обязанность и её отсутствие через 'have to' / 'don't have to'.",
    },
  },
  {
    id: makeEgpId("A2", "modality", "must-mustnt-rules"),
    cefr: "A2",
    category: "modality",
    can_do: {
      en: "Can state rules and prohibitions with 'must' and 'mustn't'.",
      ru: "Умеет формулировать правила и запреты с помощью 'must' и 'mustn't'.",
    },
  },
  {
    id: makeEgpId("A2", "modality", "could-past-ability-and-requests"),
    cefr: "A2",
    category: "modality",
    can_do: {
      en: "Can use 'could' for past ability and polite requests.",
      ru: "Умеет использовать 'could' для способности в прошлом и вежливых просьб.",
    },
  },
  {
    id: makeEgpId("A2", "modality", "would-like-offers-wants"),
    cefr: "A2",
    category: "modality",
    can_do: {
      en: "Can use 'would like' to make polite offers and say what you want.",
      ru: "Умеет использовать 'would like' для вежливых предложений и выражения желаний.",
    },
  },
  {
    id: makeEgpId("A2", "modality", "may-might-possibility"),
    cefr: "A2",
    category: "modality",
    can_do: {
      en: "Can express simple possibility with 'may' and 'might'.",
      ru: "Умеет выражать простую возможность с помощью 'may' и 'might'.",
    },
  },

  // ── conditionals ───────────────────────────────────────────────────────
  {
    id: makeEgpId("A2", "conditionals", "zero-conditional-facts"),
    cefr: "A2",
    category: "conditionals",
    can_do: {
      en: "Can state general truths with the zero conditional ('If you heat ice, it melts').",
      ru: "Умеет излагать общие истины с помощью нулевого условного ('If you heat ice, it melts').",
    },
  },
  {
    id: makeEgpId("A2", "conditionals", "first-conditional-likely-results"),
    cefr: "A2",
    category: "conditionals",
    can_do: {
      en: "Can talk about likely future results with the first conditional ('If it rains, we'll stay').",
      ru: "Умеет говорить о вероятных будущих результатах с первым условным ('If it rains, we'll stay').",
    },
  },

  // ── nouns-determiners ──────────────────────────────────────────────────
  {
    id: makeEgpId("A2", "nouns-determiners", "countable-uncountable-quantifiers"),
    cefr: "A2",
    category: "nouns-determiners",
    can_do: {
      en: "Can use 'some', 'any', 'much', 'many' and 'a lot of' with countable and uncountable nouns.",
      ru: "Умеет использовать 'some', 'any', 'much', 'many' и 'a lot of' с исчисляемыми и неисчисляемыми существительными.",
    },
  },
  {
    id: makeEgpId("A2", "nouns-determiners", "definite-article-known-things"),
    cefr: "A2",
    category: "nouns-determiners",
    can_do: {
      en: "Can use 'the' for specific or already-mentioned things and 'a/an' for first mention.",
      ru: "Умеет использовать 'the' для конкретных или уже упомянутых вещей и 'a/an' при первом упоминании.",
    },
  },
  {
    id: makeEgpId("A2", "nouns-determiners", "possessive-s-and-of"),
    cefr: "A2",
    category: "nouns-determiners",
    can_do: {
      en: "Can show possession with apostrophe-s and 'of' ('Anna's bag', 'the end of the film').",
      ru: "Умеет выражать принадлежность через 's и 'of' ('Anna's bag', 'the end of the film').",
    },
  },
  {
    id: makeEgpId("A2", "nouns-determiners", "too-and-enough-with-nouns"),
    cefr: "A2",
    category: "nouns-determiners",
    can_do: {
      en: "Can use 'too much/many' and 'enough' to talk about quantity.",
      ru: "Умеет использовать 'too much/many' и 'enough' для разговора о количестве.",
    },
  },
  {
    id: makeEgpId("A2", "nouns-determiners", "every-all-determiners"),
    cefr: "A2",
    category: "nouns-determiners",
    can_do: {
      en: "Can use 'every', 'all' and 'both' to talk about whole groups.",
      ru: "Умеет использовать 'every', 'all' и 'both' для разговора о целых группах.",
    },
  },

  // ── pronouns ───────────────────────────────────────────────────────────
  {
    id: makeEgpId("A2", "pronouns", "object-pronouns"),
    cefr: "A2",
    category: "pronouns",
    can_do: {
      en: "Can use object pronouns (me, him, her, us, them) correctly after verbs and prepositions.",
      ru: "Умеет правильно использовать объектные местоимения (me, him, her, us, them) после глаголов и предлогов.",
    },
  },
  {
    id: makeEgpId("A2", "pronouns", "possessive-pronouns"),
    cefr: "A2",
    category: "pronouns",
    can_do: {
      en: "Can use possessive pronouns (mine, yours, hers, theirs) without repeating the noun.",
      ru: "Умеет использовать притяжательные местоимения (mine, yours, hers, theirs) без повтора существительного.",
    },
  },
  {
    id: makeEgpId("A2", "pronouns", "indefinite-pronouns-some-any-body"),
    cefr: "A2",
    category: "pronouns",
    can_do: {
      en: "Can use 'someone', 'anything', 'nobody' and similar indefinite pronouns.",
      ru: "Умеет использовать 'someone', 'anything', 'nobody' и подобные неопределённые местоимения.",
    },
  },
  {
    id: makeEgpId("A2", "pronouns", "reflexive-pronouns"),
    cefr: "A2",
    category: "pronouns",
    can_do: {
      en: "Can use reflexive pronouns (myself, yourself, themselves) for actions on oneself.",
      ru: "Умеет использовать возвратные местоимения (myself, yourself, themselves) для действий над собой.",
    },
  },

  // ── adjectives-adverbs ─────────────────────────────────────────────────
  {
    id: makeEgpId("A2", "adjectives-adverbs", "comparative-adjectives"),
    cefr: "A2",
    category: "adjectives-adverbs",
    can_do: {
      en: "Can compare two things with comparative adjectives and 'than' (bigger than, more expensive than).",
      ru: "Умеет сравнивать два предмета с помощью сравнительных прилагательных и 'than' (bigger than, more expensive than).",
    },
  },
  {
    id: makeEgpId("A2", "adjectives-adverbs", "superlative-adjectives"),
    cefr: "A2",
    category: "adjectives-adverbs",
    can_do: {
      en: "Can pick out the extreme of a group with superlative adjectives (the biggest, the most popular).",
      ru: "Умеет выделять крайний элемент группы с помощью превосходной степени (the biggest, the most popular).",
    },
  },
  {
    id: makeEgpId("A2", "adjectives-adverbs", "as-as-comparisons"),
    cefr: "A2",
    category: "adjectives-adverbs",
    can_do: {
      en: "Can express equality and inequality with 'as ... as' and 'not as ... as'.",
      ru: "Умеет выражать равенство и неравенство через 'as ... as' и 'not as ... as'.",
    },
  },
  {
    id: makeEgpId("A2", "adjectives-adverbs", "adverbs-of-manner"),
    cefr: "A2",
    category: "adjectives-adverbs",
    can_do: {
      en: "Can describe how an action happens with adverbs of manner (quickly, carefully, well).",
      ru: "Умеет описывать, как происходит действие, с помощью наречий образа действия (quickly, carefully, well).",
    },
  },
  {
    id: makeEgpId("A2", "adjectives-adverbs", "intensifiers-quite-really"),
    cefr: "A2",
    category: "adjectives-adverbs",
    can_do: {
      en: "Can grade adjectives with intensifiers like 'very', 'really' and 'quite'.",
      ru: "Умеет усиливать прилагательные с помощью 'very', 'really' и 'quite'.",
    },
  },
  {
    id: makeEgpId("A2", "adjectives-adverbs", "adjective-order-basic"),
    cefr: "A2",
    category: "adjectives-adverbs",
    can_do: {
      en: "Can put two common adjectives in a natural order before a noun ('a nice big house').",
      ru: "Умеет ставить два распространённых прилагательных в естественном порядке перед существительным ('a nice big house').",
    },
  },

  // ── prepositions ───────────────────────────────────────────────────────
  {
    id: makeEgpId("A2", "prepositions", "time-prepositions"),
    cefr: "A2",
    category: "prepositions",
    can_do: {
      en: "Can use 'in', 'on' and 'at' for times and dates correctly.",
      ru: "Умеет правильно использовать 'in', 'on' и 'at' для времени и дат.",
    },
  },
  {
    id: makeEgpId("A2", "prepositions", "place-and-movement-prepositions"),
    cefr: "A2",
    category: "prepositions",
    can_do: {
      en: "Can describe position and movement with prepositions (between, behind, into, through).",
      ru: "Умеет описывать положение и движение с помощью предлогов (between, behind, into, through).",
    },
  },
  {
    id: makeEgpId("A2", "prepositions", "prepositions-after-adjectives-verbs"),
    cefr: "A2",
    category: "prepositions",
    can_do: {
      en: "Can use common dependent prepositions ('good at', 'interested in', 'wait for').",
      ru: "Умеет использовать распространённые зависимые предлоги ('good at', 'interested in', 'wait for').",
    },
  },

  // ── clauses ────────────────────────────────────────────────────────────
  {
    id: makeEgpId("A2", "clauses", "time-clauses-when-after-before"),
    cefr: "A2",
    category: "clauses",
    can_do: {
      en: "Can link events with time clauses using 'when', 'before', 'after' and 'while'.",
      ru: "Умеет связывать события придаточными времени с 'when', 'before', 'after' и 'while'.",
    },
  },
  {
    id: makeEgpId("A2", "clauses", "reason-clauses-because"),
    cefr: "A2",
    category: "clauses",
    can_do: {
      en: "Can give reasons with 'because' and 'so'.",
      ru: "Умеет приводить причины с помощью 'because' и 'so'.",
    },
  },
  {
    id: makeEgpId("A2", "clauses", "defining-relative-clauses-who-which-that"),
    cefr: "A2",
    category: "clauses",
    can_do: {
      en: "Can add simple defining relative clauses with 'who', 'which' and 'that'.",
      ru: "Умеет добавлять простые определительные придаточные с 'who', 'which' и 'that'.",
    },
  },
  {
    id: makeEgpId("A2", "clauses", "that-clauses-after-think-know"),
    cefr: "A2",
    category: "clauses",
    can_do: {
      en: "Can report thoughts and opinions with 'that' clauses after 'think', 'know', 'hope'.",
      ru: "Умеет передавать мысли и мнения придаточными с 'that' после 'think', 'know', 'hope'.",
    },
  },

  // ── questions-negation ─────────────────────────────────────────────────
  {
    id: makeEgpId("A2", "questions-negation", "wh-questions-past-and-present"),
    cefr: "A2",
    category: "questions-negation",
    can_do: {
      en: "Can form wh- questions in the present and past (What did you do? Where does she live?).",
      ru: "Умеет строить wh-вопросы в настоящем и прошедшем (What did you do? Where does she live?).",
    },
  },
  {
    id: makeEgpId("A2", "questions-negation", "question-tags-basic"),
    cefr: "A2",
    category: "questions-negation",
    can_do: {
      en: "Can check information with basic question tags ('It's cold, isn't it?').",
      ru: "Умеет уточнять информацию с помощью простых разделительных вопросов ('It's cold, isn't it?').",
    },
  },
  {
    id: makeEgpId("A2", "questions-negation", "how-questions-quantity-degree"),
    cefr: "A2",
    category: "questions-negation",
    can_do: {
      en: "Can ask about quantity and degree with 'How much', 'How many', 'How often'.",
      ru: "Умеет спрашивать о количестве и степени с 'How much', 'How many', 'How often'.",
    },
  },
  {
    id: makeEgpId("A2", "questions-negation", "negation-didnt-doesnt"),
    cefr: "A2",
    category: "questions-negation",
    can_do: {
      en: "Can form negatives across tenses with 'don't', 'doesn't' and 'didn't'.",
      ru: "Умеет образовывать отрицания во временах с 'don't', 'doesn't' и 'didn't'.",
    },
  },

  // ── discourse-cohesion ─────────────────────────────────────────────────
  {
    id: makeEgpId("A2", "discourse-cohesion", "sequencing-then-after-finally"),
    cefr: "A2",
    category: "discourse-cohesion",
    can_do: {
      en: "Can order a short story with sequencers ('first', 'then', 'after that', 'finally').",
      ru: "Умеет выстраивать короткий рассказ с помощью слов-последовательностей ('first', 'then', 'after that', 'finally').",
    },
  },
  {
    id: makeEgpId("A2", "discourse-cohesion", "contrast-but-however"),
    cefr: "A2",
    category: "discourse-cohesion",
    can_do: {
      en: "Can connect contrasting ideas with 'but', 'and' and a simple 'however'.",
      ru: "Умеет соединять противоположные идеи с помощью 'but', 'and' и простого 'however'.",
    },
  },
  {
    id: makeEgpId("A2", "discourse-cohesion", "too-also-either"),
    cefr: "A2",
    category: "discourse-cohesion",
    can_do: {
      en: "Can add similar information with 'too', 'also' and 'either'.",
      ru: "Умеет добавлять схожую информацию с помощью 'too', 'also' и 'either'.",
    },
  },

  // ── word-order ─────────────────────────────────────────────────────────
  {
    id: makeEgpId("A2", "word-order", "adverb-frequency-position"),
    cefr: "A2",
    category: "word-order",
    can_do: {
      en: "Can place frequency adverbs correctly (before the main verb, after 'be').",
      ru: "Умеет правильно располагать наречия частотности (перед основным глаголом, после 'be').",
    },
  },
  {
    id: makeEgpId("A2", "word-order", "manner-place-time-order"),
    cefr: "A2",
    category: "word-order",
    can_do: {
      en: "Can order adverbials in a sentence as manner, place, then time.",
      ru: "Умеет располагать обстоятельства в предложении в порядке: образ действия, место, время.",
    },
  },
];
