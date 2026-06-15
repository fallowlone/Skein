// AUTHORED per-band EGP inventory for CEFR B1 (original phrasing — not verbatim
// Cambridge EGP). An honest external yardstick of what English REQUIRES at B1:
// the canonical threshold syllabus a serious B1 course teaches, spanning verbs,
// tenses-aspect, modality, conditionals, passive, clauses, and discourse.
import { makeEgpId, type EgpEntry } from "./types";

export const entries: EgpEntry[] = [
  // --- tenses-aspect ---------------------------------------------------------
  {
    id: makeEgpId("B1", "tenses-aspect", "present-perfect-experience"),
    cefr: "B1",
    category: "tenses-aspect",
    can_do: {
      en: "Can use the present perfect to talk about life experiences with 'ever' and 'never'.",
      ru: "Умеет использовать present perfect для рассказа о жизненном опыте со словами 'ever' и 'never'.",
    },
  },
  {
    id: makeEgpId("B1", "tenses-aspect", "present-perfect-vs-past-simple"),
    cefr: "B1",
    category: "tenses-aspect",
    can_do: {
      en: "Can choose between the present perfect and the past simple to mark whether a time is finished.",
      ru: "Умеет выбирать между present perfect и past simple, отмечая, завершён ли период времени.",
    },
  },
  {
    id: makeEgpId("B1", "tenses-aspect", "present-perfect-for-since"),
    cefr: "B1",
    category: "tenses-aspect",
    can_do: {
      en: "Can describe situations that started in the past and continue now using 'for' and 'since'.",
      ru: "Умеет описывать ситуации, начавшиеся в прошлом и длящиеся сейчас, со словами 'for' и 'since'.",
    },
  },
  {
    id: makeEgpId("B1", "tenses-aspect", "past-continuous-interrupted"),
    cefr: "B1",
    category: "tenses-aspect",
    can_do: {
      en: "Can set a background action with the past continuous interrupted by a past simple event.",
      ru: "Умеет задавать фоновое действие в past continuous, прерываемое событием в past simple.",
    },
  },
  {
    id: makeEgpId("B1", "tenses-aspect", "used-to-past-habits"),
    cefr: "B1",
    category: "tenses-aspect",
    can_do: {
      en: "Can talk about repeated past habits and former states with 'used to'.",
      ru: "Умеет говорить о повторяющихся прошлых привычках и прежних состояниях с 'used to'.",
    },
  },
  {
    id: makeEgpId("B1", "tenses-aspect", "past-perfect-earlier-event"),
    cefr: "B1",
    category: "tenses-aspect",
    can_do: {
      en: "Can use the past perfect to show that one past event happened before another.",
      ru: "Умеет использовать past perfect, чтобы показать, что одно прошлое событие случилось раньше другого.",
    },
  },
  {
    id: makeEgpId("B1", "tenses-aspect", "present-perfect-continuous-duration"),
    cefr: "B1",
    category: "tenses-aspect",
    can_do: {
      en: "Can stress the ongoing duration of a recent activity with the present perfect continuous.",
      ru: "Умеет подчёркивать длительность недавнего действия с помощью present perfect continuous.",
    },
  },
  {
    id: makeEgpId("B1", "tenses-aspect", "present-continuous-future-arrangements"),
    cefr: "B1",
    category: "tenses-aspect",
    can_do: {
      en: "Can use the present continuous for fixed future arrangements that are already planned.",
      ru: "Умеет использовать present continuous для запланированных будущих договорённостей.",
    },
  },

  // --- verbs -----------------------------------------------------------------
  {
    id: makeEgpId("B1", "verbs", "going-to-plans-predictions"),
    cefr: "B1",
    category: "verbs",
    can_do: {
      en: "Can express intentions and evidence-based predictions with 'be going to'.",
      ru: "Умеет выражать намерения и предсказания на основе фактов с помощью 'be going to'.",
    },
  },
  {
    id: makeEgpId("B1", "verbs", "will-spontaneous-decisions"),
    cefr: "B1",
    category: "verbs",
    can_do: {
      en: "Can use 'will' for offers, promises, and decisions made at the moment of speaking.",
      ru: "Умеет использовать 'will' для предложений, обещаний и решений, принятых в момент речи.",
    },
  },
  {
    id: makeEgpId("B1", "verbs", "gerund-vs-infinitive-after-verbs"),
    cefr: "B1",
    category: "verbs",
    can_do: {
      en: "Can choose a gerund or a to-infinitive correctly after common verbs such as 'enjoy', 'want', and 'decide'.",
      ru: "Умеет правильно выбирать герундий или инфинитив после распространённых глаголов вроде 'enjoy', 'want', 'decide'.",
    },
  },
  {
    id: makeEgpId("B1", "verbs", "infinitive-of-purpose"),
    cefr: "B1",
    category: "verbs",
    can_do: {
      en: "Can express the purpose of an action with a to-infinitive ('to do X').",
      ru: "Умеет выражать цель действия с помощью инфинитива ('to do X').",
    },
  },
  {
    id: makeEgpId("B1", "verbs", "verb-plus-object-plus-infinitive"),
    cefr: "B1",
    category: "verbs",
    can_do: {
      en: "Can use patterns like 'want / ask / tell someone to do something'.",
      ru: "Умеет использовать конструкции вида 'want / ask / tell someone to do something'.",
    },
  },
  {
    id: makeEgpId("B1", "verbs", "phrasal-verbs-common"),
    cefr: "B1",
    category: "verbs",
    can_do: {
      en: "Can understand and use a range of common phrasal verbs in everyday situations.",
      ru: "Умеет понимать и использовать ряд распространённых фразовых глаголов в повседневных ситуациях.",
    },
  },
  {
    id: makeEgpId("B1", "verbs", "stative-vs-dynamic-verbs"),
    cefr: "B1",
    category: "verbs",
    can_do: {
      en: "Can avoid the continuous with stative verbs of thinking, liking, and possession.",
      ru: "Умеет избегать продолженного времени со стативными глаголами мысли, отношения и обладания.",
    },
  },

  // --- modality --------------------------------------------------------------
  {
    id: makeEgpId("B1", "modality", "should-ought-to-advice"),
    cefr: "B1",
    category: "modality",
    can_do: {
      en: "Can give and ask for advice using 'should' and 'ought to'.",
      ru: "Умеет давать и спрашивать совета с помощью 'should' и 'ought to'.",
    },
  },
  {
    id: makeEgpId("B1", "modality", "have-to-must-obligation"),
    cefr: "B1",
    category: "modality",
    can_do: {
      en: "Can distinguish obligation with 'must' and 'have to' from absence of obligation with \"don't have to\".",
      ru: "Умеет различать обязанность с 'must' и 'have to' и отсутствие обязанности с \"don't have to\".",
    },
  },
  {
    id: makeEgpId("B1", "modality", "mustnt-prohibition"),
    cefr: "B1",
    category: "modality",
    can_do: {
      en: "Can express prohibition with \"mustn't\" and contrast it with permission.",
      ru: "Умеет выражать запрет с \"mustn't\" и противопоставлять его разрешению.",
    },
  },
  {
    id: makeEgpId("B1", "modality", "might-may-could-possibility"),
    cefr: "B1",
    category: "modality",
    can_do: {
      en: "Can express present and future possibility with 'might', 'may', and 'could'.",
      ru: "Умеет выражать возможность в настоящем и будущем с помощью 'might', 'may' и 'could'.",
    },
  },
  {
    id: makeEgpId("B1", "modality", "must-cant-present-deduction"),
    cefr: "B1",
    category: "modality",
    can_do: {
      en: "Can draw logical conclusions about the present with 'must' and \"can't\".",
      ru: "Умеет делать логические выводы о настоящем с помощью 'must' и \"can't\".",
    },
  },
  {
    id: makeEgpId("B1", "modality", "could-able-to-past-ability"),
    cefr: "B1",
    category: "modality",
    can_do: {
      en: "Can talk about past ability with 'could' and 'was/were able to'.",
      ru: "Умеет говорить о способности в прошлом с помощью 'could' и 'was/were able to'.",
    },
  },

  // --- conditionals ----------------------------------------------------------
  {
    id: makeEgpId("B1", "conditionals", "zero-conditional-general-truths"),
    cefr: "B1",
    category: "conditionals",
    can_do: {
      en: "Can state general truths and rules with the zero conditional (if + present, present).",
      ru: "Умеет формулировать общие истины и правила нулевым условным (if + present, present).",
    },
  },
  {
    id: makeEgpId("B1", "conditionals", "first-conditional-real-future"),
    cefr: "B1",
    category: "conditionals",
    can_do: {
      en: "Can describe likely future results of a condition with the first conditional.",
      ru: "Умеет описывать вероятные будущие результаты условия с помощью первого условного.",
    },
  },
  {
    id: makeEgpId("B1", "conditionals", "second-conditional-hypothetical"),
    cefr: "B1",
    category: "conditionals",
    can_do: {
      en: "Can talk about imaginary or unlikely present situations with the second conditional.",
      ru: "Умеет говорить о воображаемых или маловероятных ситуациях настоящего с помощью второго условного.",
    },
  },
  {
    id: makeEgpId("B1", "conditionals", "if-clauses-with-when-unless"),
    cefr: "B1",
    category: "conditionals",
    can_do: {
      en: "Can use 'when', 'as soon as', and 'unless' in real conditional and time clauses.",
      ru: "Умеет использовать 'when', 'as soon as' и 'unless' в реальных условных и временных придаточных.",
    },
  },
  {
    id: makeEgpId("B1", "conditionals", "i-wish-present-regret"),
    cefr: "B1",
    category: "conditionals",
    can_do: {
      en: "Can express present wishes and regrets with 'I wish' plus the past simple.",
      ru: "Умеет выражать желания и сожаления о настоящем с помощью 'I wish' и past simple.",
    },
  },

  // --- passive ---------------------------------------------------------------
  {
    id: makeEgpId("B1", "passive", "present-simple-passive"),
    cefr: "B1",
    category: "passive",
    can_do: {
      en: "Can describe processes and facts with the present simple passive.",
      ru: "Умеет описывать процессы и факты с помощью пассива present simple.",
    },
  },
  {
    id: makeEgpId("B1", "passive", "past-simple-passive"),
    cefr: "B1",
    category: "passive",
    can_do: {
      en: "Can report past events with the past simple passive when the agent is unknown or unimportant.",
      ru: "Умеет сообщать о прошлых событиях пассивом past simple, когда деятель неизвестен или неважен.",
    },
  },
  {
    id: makeEgpId("B1", "passive", "passive-with-by-agent"),
    cefr: "B1",
    category: "passive",
    can_do: {
      en: "Can name the agent of a passive sentence with a 'by' phrase when it matters.",
      ru: "Умеет называть деятеля в пассивном предложении через оборот с 'by', когда это важно.",
    },
  },

  // --- clauses ---------------------------------------------------------------
  {
    id: makeEgpId("B1", "clauses", "defining-relative-clauses"),
    cefr: "B1",
    category: "clauses",
    can_do: {
      en: "Can add essential information with defining relative clauses using 'who', 'which', and 'that'.",
      ru: "Умеет добавлять необходимую информацию определительными придаточными с 'who', 'which', 'that'.",
    },
  },
  {
    id: makeEgpId("B1", "clauses", "relative-clauses-where-whose"),
    cefr: "B1",
    category: "clauses",
    can_do: {
      en: "Can use 'where' and 'whose' to build relative clauses about places and possession.",
      ru: "Умеет использовать 'where' и 'whose' для построения придаточных о месте и принадлежности.",
    },
  },
  {
    id: makeEgpId("B1", "clauses", "reported-statements-backshift"),
    cefr: "B1",
    category: "clauses",
    can_do: {
      en: "Can report what someone said, shifting tenses back one step where needed.",
      ru: "Умеет передавать чужие слова, сдвигая времена на шаг назад там, где это нужно.",
    },
  },
  {
    id: makeEgpId("B1", "clauses", "reported-questions"),
    cefr: "B1",
    category: "clauses",
    can_do: {
      en: "Can report questions with statement word order and 'if' or 'whether'.",
      ru: "Умеет передавать вопросы прямым порядком слов с 'if' или 'whether'.",
    },
  },
  {
    id: makeEgpId("B1", "clauses", "so-that-such-that-result"),
    cefr: "B1",
    category: "clauses",
    can_do: {
      en: "Can express result and degree with 'so ... that' and 'such ... that'.",
      ru: "Умеет выражать результат и степень с помощью 'so ... that' и 'such ... that'.",
    },
  },
  {
    id: makeEgpId("B1", "clauses", "reason-clauses-because-since-as"),
    cefr: "B1",
    category: "clauses",
    can_do: {
      en: "Can give reasons with 'because', 'since', and 'as'.",
      ru: "Умеет приводить причины с помощью 'because', 'since' и 'as'.",
    },
  },

  // --- adjectives-adverbs ----------------------------------------------------
  {
    id: makeEgpId("B1", "adjectives-adverbs", "comparatives-and-superlatives"),
    cefr: "B1",
    category: "adjectives-adverbs",
    can_do: {
      en: "Can compare things flexibly with comparative and superlative adjectives, including irregular forms.",
      ru: "Умеет гибко сравнивать предметы сравнительными и превосходными прилагательными, включая неправильные формы.",
    },
  },
  {
    id: makeEgpId("B1", "adjectives-adverbs", "as-as-comparisons"),
    cefr: "B1",
    category: "adjectives-adverbs",
    can_do: {
      en: "Can express equality and inequality with 'as ... as' and 'not as ... as'.",
      ru: "Умеет выражать равенство и неравенство с помощью 'as ... as' и 'not as ... as'.",
    },
  },
  {
    id: makeEgpId("B1", "adjectives-adverbs", "too-and-enough"),
    cefr: "B1",
    category: "adjectives-adverbs",
    can_do: {
      en: "Can express excess and sufficiency with 'too' and 'enough'.",
      ru: "Умеет выражать избыток и достаточность с помощью 'too' и 'enough'.",
    },
  },
  {
    id: makeEgpId("B1", "adjectives-adverbs", "adverbs-of-degree"),
    cefr: "B1",
    category: "adjectives-adverbs",
    can_do: {
      en: "Can modify adjectives with adverbs of degree such as 'quite', 'really', and 'extremely'.",
      ru: "Умеет усиливать прилагательные наречиями степени вроде 'quite', 'really' и 'extremely'.",
    },
  },
  {
    id: makeEgpId("B1", "adjectives-adverbs", "ed-vs-ing-adjectives"),
    cefr: "B1",
    category: "adjectives-adverbs",
    can_do: {
      en: "Can distinguish '-ed' and '-ing' adjectives such as 'bored' versus 'boring'.",
      ru: "Умеет различать прилагательные на '-ed' и '-ing', например 'bored' и 'boring'.",
    },
  },

  // --- nouns-determiners -----------------------------------------------------
  {
    id: makeEgpId("B1", "nouns-determiners", "quantifiers-much-many-a-few"),
    cefr: "B1",
    category: "nouns-determiners",
    can_do: {
      en: "Can use quantifiers like 'much', 'many', 'a few', and 'a little' with count and uncount nouns.",
      ru: "Умеет использовать квантификаторы 'much', 'many', 'a few', 'a little' с исчисляемыми и неисчисляемыми существительными.",
    },
  },
  {
    id: makeEgpId("B1", "nouns-determiners", "articles-general-vs-specific"),
    cefr: "B1",
    category: "nouns-determiners",
    can_do: {
      en: "Can choose 'a', 'the', or no article to mark general versus specific reference.",
      ru: "Умеет выбирать 'a', 'the' или нулевой артикль для общего и конкретного значения.",
    },
  },
  {
    id: makeEgpId("B1", "nouns-determiners", "too-much-too-many-not-enough"),
    cefr: "B1",
    category: "nouns-determiners",
    can_do: {
      en: "Can comment on quantity with 'too much', 'too many', and 'not enough'.",
      ru: "Умеет оценивать количество с помощью 'too much', 'too many' и 'not enough'.",
    },
  },

  // --- prepositions ----------------------------------------------------------
  {
    id: makeEgpId("B1", "prepositions", "dependent-prepositions"),
    cefr: "B1",
    category: "prepositions",
    can_do: {
      en: "Can use prepositions that depend on particular verbs and adjectives, such as 'good at' and 'depend on'.",
      ru: "Умеет использовать предлоги, зависящие от конкретных глаголов и прилагательных, например 'good at' и 'depend on'.",
    },
  },
  {
    id: makeEgpId("B1", "prepositions", "preposition-plus-gerund"),
    cefr: "B1",
    category: "prepositions",
    can_do: {
      en: "Can use a gerund after a preposition, as in 'interested in learning'.",
      ru: "Умеет использовать герундий после предлога, например 'interested in learning'.",
    },
  },

  // --- discourse-cohesion ----------------------------------------------------
  {
    id: makeEgpId("B1", "discourse-cohesion", "linkers-of-contrast"),
    cefr: "B1",
    category: "discourse-cohesion",
    can_do: {
      en: "Can connect contrasting ideas with 'although', 'however', and 'even though'.",
      ru: "Умеет связывать противопоставленные идеи с помощью 'although', 'however' и 'even though'.",
    },
  },
  {
    id: makeEgpId("B1", "discourse-cohesion", "sequencing-and-addition-linkers"),
    cefr: "B1",
    category: "discourse-cohesion",
    can_do: {
      en: "Can organise a text with sequencing and adding linkers like 'first', 'then', 'in addition', and 'finally'.",
      ru: "Умеет организовывать текст связками порядка и добавления вроде 'first', 'then', 'in addition', 'finally'.",
    },
  },
  {
    id: makeEgpId("B1", "discourse-cohesion", "purpose-linkers-so-that"),
    cefr: "B1",
    category: "discourse-cohesion",
    can_do: {
      en: "Can express purpose across clauses with 'so that' and 'in order to'.",
      ru: "Умеет выражать цель между частями предложения с помощью 'so that' и 'in order to'.",
    },
  },

  // --- questions-negation ----------------------------------------------------
  {
    id: makeEgpId("B1", "questions-negation", "question-tags"),
    cefr: "B1",
    category: "questions-negation",
    can_do: {
      en: "Can add question tags to check information and invite agreement.",
      ru: "Умеет добавлять разделительные вопросы, чтобы проверить информацию и пригласить к согласию.",
    },
  },
  {
    id: makeEgpId("B1", "questions-negation", "indirect-questions"),
    cefr: "B1",
    category: "questions-negation",
    can_do: {
      en: "Can ask politely with indirect questions such as 'Could you tell me where ...?'.",
      ru: "Умеет вежливо спрашивать косвенными вопросами вроде 'Could you tell me where ...?'.",
    },
  },
  {
    id: makeEgpId("B1", "questions-negation", "subject-vs-object-questions"),
    cefr: "B1",
    category: "questions-negation",
    can_do: {
      en: "Can form subject questions without an auxiliary and contrast them with object questions.",
      ru: "Умеет строить вопросы к подлежащему без вспомогательного глагола и отличать их от вопросов к дополнению.",
    },
  },

  // --- pronouns --------------------------------------------------------------
  {
    id: makeEgpId("B1", "pronouns", "reflexive-pronouns"),
    cefr: "B1",
    category: "pronouns",
    can_do: {
      en: "Can use reflexive pronouns such as 'myself' and 'themselves' for emphasis and reflexive actions.",
      ru: "Умеет использовать возвратные местоимения вроде 'myself' и 'themselves' для усиления и возвратных действий.",
    },
  },
  {
    id: makeEgpId("B1", "pronouns", "indefinite-pronouns-some-any-no"),
    cefr: "B1",
    category: "pronouns",
    can_do: {
      en: "Can use indefinite pronouns like 'someone', 'anything', and 'nowhere' accurately.",
      ru: "Умеет точно использовать неопределённые местоимения вроде 'someone', 'anything' и 'nowhere'.",
    },
  },

  // --- word-order ------------------------------------------------------------
  {
    id: makeEgpId("B1", "word-order", "adverb-position-frequency-manner"),
    cefr: "B1",
    category: "word-order",
    can_do: {
      en: "Can place adverbs of frequency, manner, and time in their usual positions in a sentence.",
      ru: "Умеет ставить наречия частотности, образа действия и времени на их обычные места в предложении.",
    },
  },
  {
    id: makeEgpId("B1", "word-order", "order-of-adjectives"),
    cefr: "B1",
    category: "word-order",
    can_do: {
      en: "Can order two or more adjectives before a noun in a natural sequence.",
      ru: "Умеет располагать два и более прилагательных перед существительным в естественном порядке.",
    },
  },
];
