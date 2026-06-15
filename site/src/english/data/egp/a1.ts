// AUTHORED A1 EGP inventory — the canonical grammar a serious A1 course must
// teach (honest external yardstick of what English REQUIRES at A1, not what any
// one course happens to contain). Original "can-do" phrasing (not verbatim
// Cambridge EGP) to stay copyright-safe. See egp/types.ts for the model.
import { makeEgpId, type EgpEntry } from "./types";

export const entries: EgpEntry[] = [
  // ── verbs ──────────────────────────────────────────────────────────────
  {
    id: makeEgpId("A1", "verbs", "be-present"),
    cefr: "A1",
    category: "verbs",
    can_do: {
      en: "Can use the present forms of 'be' (am/is/are) to give basic information about people and things.",
      ru: "Умеет использовать формы глагола 'be' (am/is/are) в настоящем времени для базовой информации о людях и предметах.",
    },
  },
  {
    id: makeEgpId("A1", "verbs", "be-past-was-were"),
    cefr: "A1",
    category: "verbs",
    can_do: {
      en: "Can use 'was' and 'were' to talk about past states.",
      ru: "Умеет использовать 'was' и 'were' для рассказа о состояниях в прошлом.",
    },
  },
  {
    id: makeEgpId("A1", "verbs", "have-got-possession"),
    cefr: "A1",
    category: "verbs",
    can_do: {
      en: "Can use 'have got' / 'has got' to express possession and personal features.",
      ru: "Умеет использовать 'have got' / 'has got' для выражения обладания и личных характеристик.",
    },
  },
  {
    id: makeEgpId("A1", "verbs", "there-is-there-are"),
    cefr: "A1",
    category: "verbs",
    can_do: {
      en: "Can use 'there is' and 'there are' to say that something exists or is present.",
      ru: "Умеет использовать 'there is' и 'there are', чтобы сказать, что что-то существует или присутствует.",
    },
  },
  {
    id: makeEgpId("A1", "verbs", "imperatives-basic"),
    cefr: "A1",
    category: "verbs",
    can_do: {
      en: "Can give simple instructions and directions with the imperative.",
      ru: "Умеет давать простые инструкции и указания с помощью повелительного наклонения.",
    },
  },
  {
    id: makeEgpId("A1", "verbs", "like-want-plus-noun"),
    cefr: "A1",
    category: "verbs",
    can_do: {
      en: "Can use common verbs like 'like', 'want' and 'need' followed by a noun.",
      ru: "Умеет использовать частые глаголы вроде 'like', 'want', 'need' с последующим существительным.",
    },
  },
  {
    id: makeEgpId("A1", "verbs", "like-plus-ing"),
    cefr: "A1",
    category: "verbs",
    can_do: {
      en: "Can use 'like' / 'love' / 'hate' followed by an '-ing' form to talk about preferences.",
      ru: "Умеет использовать 'like' / 'love' / 'hate' с формой на '-ing' для рассказа о предпочтениях.",
    },
  },
  {
    id: makeEgpId("A1", "verbs", "would-like-requests"),
    cefr: "A1",
    category: "verbs",
    can_do: {
      en: "Can use 'would like' to make polite requests and offers.",
      ru: "Умеет использовать 'would like' для вежливых просьб и предложений.",
    },
  },

  // ── tenses-aspect ──────────────────────────────────────────────────────
  {
    id: makeEgpId("A1", "tenses-aspect", "present-simple-habits"),
    cefr: "A1",
    category: "tenses-aspect",
    can_do: {
      en: "Can use the present simple to talk about habits, routines and general facts.",
      ru: "Умеет использовать Present Simple для рассказа о привычках, режиме дня и общих фактах.",
    },
  },
  {
    id: makeEgpId("A1", "tenses-aspect", "present-simple-third-person-s"),
    cefr: "A1",
    category: "tenses-aspect",
    can_do: {
      en: "Can add '-s' / '-es' to verbs in the third person singular of the present simple.",
      ru: "Умеет добавлять '-s' / '-es' к глаголу в третьем лице единственного числа в Present Simple.",
    },
  },
  {
    id: makeEgpId("A1", "tenses-aspect", "present-continuous-now"),
    cefr: "A1",
    category: "tenses-aspect",
    can_do: {
      en: "Can use the present continuous to describe what is happening now.",
      ru: "Умеет использовать Present Continuous для описания того, что происходит сейчас.",
    },
  },
  {
    id: makeEgpId("A1", "tenses-aspect", "past-simple-regular"),
    cefr: "A1",
    category: "tenses-aspect",
    can_do: {
      en: "Can use the past simple of regular verbs to talk about finished actions.",
      ru: "Умеет использовать Past Simple правильных глаголов для рассказа о завершённых действиях.",
    },
  },
  {
    id: makeEgpId("A1", "tenses-aspect", "past-simple-common-irregular"),
    cefr: "A1",
    category: "tenses-aspect",
    can_do: {
      en: "Can use the past simple of very common irregular verbs (went, had, saw, made).",
      ru: "Умеет использовать Past Simple самых частых неправильных глаголов (went, had, saw, made).",
    },
  },
  {
    id: makeEgpId("A1", "tenses-aspect", "going-to-future-plans"),
    cefr: "A1",
    category: "tenses-aspect",
    can_do: {
      en: "Can use 'be going to' to talk about plans and intentions.",
      ru: "Умеет использовать 'be going to' для рассказа о планах и намерениях.",
    },
  },

  // ── modality ───────────────────────────────────────────────────────────
  {
    id: makeEgpId("A1", "modality", "can-ability"),
    cefr: "A1",
    category: "modality",
    can_do: {
      en: "Can use 'can' and 'can't' to talk about ability.",
      ru: "Умеет использовать 'can' и 'can't' для выражения способности.",
    },
  },
  {
    id: makeEgpId("A1", "modality", "can-permission-requests"),
    cefr: "A1",
    category: "modality",
    can_do: {
      en: "Can use 'can' to ask for permission and make simple requests.",
      ru: "Умеет использовать 'can' для запроса разрешения и простых просьб.",
    },
  },

  // ── nouns-determiners ──────────────────────────────────────────────────
  {
    id: makeEgpId("A1", "nouns-determiners", "regular-plural-nouns"),
    cefr: "A1",
    category: "nouns-determiners",
    can_do: {
      en: "Can form regular plural nouns with '-s' / '-es'.",
      ru: "Умеет образовывать правильные формы множественного числа существительных с '-s' / '-es'.",
    },
  },
  {
    id: makeEgpId("A1", "nouns-determiners", "common-irregular-plurals"),
    cefr: "A1",
    category: "nouns-determiners",
    can_do: {
      en: "Can use a few common irregular plurals (children, men, women, people).",
      ru: "Умеет использовать несколько частых неправильных форм множественного числа (children, men, women, people).",
    },
  },
  {
    id: makeEgpId("A1", "nouns-determiners", "indefinite-article-a-an"),
    cefr: "A1",
    category: "nouns-determiners",
    can_do: {
      en: "Can use 'a' and 'an' with singular countable nouns.",
      ru: "Умеет использовать 'a' и 'an' с исчисляемыми существительными в единственном числе.",
    },
  },
  {
    id: makeEgpId("A1", "nouns-determiners", "definite-article-the"),
    cefr: "A1",
    category: "nouns-determiners",
    can_do: {
      en: "Can use 'the' to refer to something already known or specific.",
      ru: "Умеет использовать 'the' для упоминания уже известного или конкретного предмета.",
    },
  },
  {
    id: makeEgpId("A1", "nouns-determiners", "demonstratives-this-that"),
    cefr: "A1",
    category: "nouns-determiners",
    can_do: {
      en: "Can use 'this', 'that', 'these' and 'those' to point out people and things.",
      ru: "Умеет использовать 'this', 'that', 'these', 'those', чтобы указать на людей и предметы.",
    },
  },
  {
    id: makeEgpId("A1", "nouns-determiners", "quantifiers-some-any"),
    cefr: "A1",
    category: "nouns-determiners",
    can_do: {
      en: "Can use 'some' and 'any' with plural and uncountable nouns.",
      ru: "Умеет использовать 'some' и 'any' с существительными во множественном числе и неисчисляемыми.",
    },
  },
  {
    id: makeEgpId("A1", "nouns-determiners", "much-many-a-lot-of"),
    cefr: "A1",
    category: "nouns-determiners",
    can_do: {
      en: "Can use 'much', 'many' and 'a lot of' to talk about quantity.",
      ru: "Умеет использовать 'much', 'many' и 'a lot of' для обозначения количества.",
    },
  },
  {
    id: makeEgpId("A1", "nouns-determiners", "cardinal-numbers"),
    cefr: "A1",
    category: "nouns-determiners",
    can_do: {
      en: "Can use cardinal numbers to count and give quantities.",
      ru: "Умеет использовать количественные числительные для счёта и указания количества.",
    },
  },

  // ── pronouns ───────────────────────────────────────────────────────────
  {
    id: makeEgpId("A1", "pronouns", "subject-pronouns"),
    cefr: "A1",
    category: "pronouns",
    can_do: {
      en: "Can use subject pronouns (I, you, he, she, it, we, they) as the subject of a sentence.",
      ru: "Умеет использовать личные местоимения в роли подлежащего (I, you, he, she, it, we, they).",
    },
  },
  {
    id: makeEgpId("A1", "pronouns", "object-pronouns"),
    cefr: "A1",
    category: "pronouns",
    can_do: {
      en: "Can use object pronouns (me, him, her, us, them) after verbs and prepositions.",
      ru: "Умеет использовать объектные местоимения (me, him, her, us, them) после глаголов и предлогов.",
    },
  },
  {
    id: makeEgpId("A1", "pronouns", "possessive-adjectives"),
    cefr: "A1",
    category: "pronouns",
    can_do: {
      en: "Can use possessive adjectives (my, your, his, her, our, their) before nouns.",
      ru: "Умеет использовать притяжательные прилагательные (my, your, his, her, our, their) перед существительными.",
    },
  },
  {
    id: makeEgpId("A1", "pronouns", "possessive-s"),
    cefr: "A1",
    category: "pronouns",
    can_do: {
      en: "Can show possession with apostrophe '-s' on names and people.",
      ru: "Умеет выражать принадлежность с помощью апострофа '-s' на именах и людях.",
    },
  },
  {
    id: makeEgpId("A1", "pronouns", "it-as-empty-subject"),
    cefr: "A1",
    category: "pronouns",
    can_do: {
      en: "Can use 'it' as an empty subject for time, weather and distance.",
      ru: "Умеет использовать 'it' как формальное подлежащее для времени, погоды и расстояния.",
    },
  },

  // ── adjectives-adverbs ─────────────────────────────────────────────────
  {
    id: makeEgpId("A1", "adjectives-adverbs", "adjective-before-noun"),
    cefr: "A1",
    category: "adjectives-adverbs",
    can_do: {
      en: "Can place common adjectives before the noun they describe.",
      ru: "Умеет ставить частые прилагательные перед описываемым существительным.",
    },
  },
  {
    id: makeEgpId("A1", "adjectives-adverbs", "adjective-after-be"),
    cefr: "A1",
    category: "adjectives-adverbs",
    can_do: {
      en: "Can use adjectives after 'be' to describe a subject.",
      ru: "Умеет использовать прилагательные после 'be' для описания подлежащего.",
    },
  },
  {
    id: makeEgpId("A1", "adjectives-adverbs", "very-and-really-intensifiers"),
    cefr: "A1",
    category: "adjectives-adverbs",
    can_do: {
      en: "Can use 'very' and 'really' to make adjectives stronger.",
      ru: "Умеет использовать 'very' и 'really' для усиления прилагательных.",
    },
  },
  {
    id: makeEgpId("A1", "adjectives-adverbs", "frequency-adverbs"),
    cefr: "A1",
    category: "adjectives-adverbs",
    can_do: {
      en: "Can use common adverbs of frequency (always, usually, sometimes, never) with the present simple.",
      ru: "Умеет использовать частые наречия частотности (always, usually, sometimes, never) с Present Simple.",
    },
  },

  // ── prepositions ───────────────────────────────────────────────────────
  {
    id: makeEgpId("A1", "prepositions", "place-in-on-at"),
    cefr: "A1",
    category: "prepositions",
    can_do: {
      en: "Can use 'in', 'on' and 'at' to say where someone or something is.",
      ru: "Умеет использовать 'in', 'on', 'at', чтобы сказать, где находится человек или предмет.",
    },
  },
  {
    id: makeEgpId("A1", "prepositions", "time-in-on-at"),
    cefr: "A1",
    category: "prepositions",
    can_do: {
      en: "Can use 'in', 'on' and 'at' to talk about times, days and dates.",
      ru: "Умеет использовать 'in', 'on', 'at' для указания времени, дней и дат.",
    },
  },
  {
    id: makeEgpId("A1", "prepositions", "movement-to-from"),
    cefr: "A1",
    category: "prepositions",
    can_do: {
      en: "Can use 'to' and 'from' to talk about movement between places.",
      ru: "Умеет использовать 'to' и 'from' для обозначения движения между местами.",
    },
  },

  // ── questions-negation ─────────────────────────────────────────────────
  {
    id: makeEgpId("A1", "questions-negation", "yes-no-questions-be"),
    cefr: "A1",
    category: "questions-negation",
    can_do: {
      en: "Can form yes/no questions with 'be' by inverting subject and verb.",
      ru: "Умеет образовывать вопросы да/нет с глаголом 'be' инверсией подлежащего и глагола.",
    },
  },
  {
    id: makeEgpId("A1", "questions-negation", "yes-no-questions-do-does"),
    cefr: "A1",
    category: "questions-negation",
    can_do: {
      en: "Can form present simple yes/no questions with 'do' and 'does'.",
      ru: "Умеет образовывать вопросы да/нет в Present Simple с помощью 'do' и 'does'.",
    },
  },
  {
    id: makeEgpId("A1", "questions-negation", "wh-questions-basic"),
    cefr: "A1",
    category: "questions-negation",
    can_do: {
      en: "Can ask basic wh-questions (what, where, who, when, how).",
      ru: "Умеет задавать базовые вопросы со словами what, where, who, when, how.",
    },
  },
  {
    id: makeEgpId("A1", "questions-negation", "how-many-how-much"),
    cefr: "A1",
    category: "questions-negation",
    can_do: {
      en: "Can ask about quantity with 'how many' and 'how much'.",
      ru: "Умеет спрашивать о количестве с помощью 'how many' и 'how much'.",
    },
  },
  {
    id: makeEgpId("A1", "questions-negation", "negation-be"),
    cefr: "A1",
    category: "questions-negation",
    can_do: {
      en: "Can make negative sentences with 'be' using 'not' / contractions.",
      ru: "Умеет строить отрицательные предложения с 'be' с помощью 'not' и сокращений.",
    },
  },
  {
    id: makeEgpId("A1", "questions-negation", "negation-dont-doesnt"),
    cefr: "A1",
    category: "questions-negation",
    can_do: {
      en: "Can make present simple negatives with 'don't' and 'doesn't'.",
      ru: "Умеет строить отрицания в Present Simple с помощью 'don't' и 'doesn't'.",
    },
  },
  {
    id: makeEgpId("A1", "questions-negation", "past-simple-questions-negation-did"),
    cefr: "A1",
    category: "questions-negation",
    can_do: {
      en: "Can form past simple questions and negatives with 'did' and 'didn't'.",
      ru: "Умеет образовывать вопросы и отрицания в Past Simple с помощью 'did' и 'didn't'.",
    },
  },

  // ── clauses ────────────────────────────────────────────────────────────
  {
    id: makeEgpId("A1", "clauses", "coordination-and-but-or"),
    cefr: "A1",
    category: "clauses",
    can_do: {
      en: "Can join words and simple clauses with 'and', 'but' and 'or'.",
      ru: "Умеет соединять слова и простые предложения союзами 'and', 'but', 'or'.",
    },
  },
  {
    id: makeEgpId("A1", "clauses", "reason-because"),
    cefr: "A1",
    category: "clauses",
    can_do: {
      en: "Can give a simple reason with 'because'.",
      ru: "Умеет указывать простую причину с помощью 'because'.",
    },
  },

  // ── discourse-cohesion ─────────────────────────────────────────────────
  {
    id: makeEgpId("A1", "discourse-cohesion", "sequence-then-after-that"),
    cefr: "A1",
    category: "discourse-cohesion",
    can_do: {
      en: "Can order events with simple sequence words like 'then' and 'after that'.",
      ru: "Умеет упорядочивать события простыми словами-связками вроде 'then' и 'after that'.",
    },
  },

  // ── word-order ─────────────────────────────────────────────────────────
  {
    id: makeEgpId("A1", "word-order", "subject-verb-object"),
    cefr: "A1",
    category: "word-order",
    can_do: {
      en: "Can build basic statements in subject–verb–object order.",
      ru: "Умеет строить простые утверждения в порядке подлежащее–глагол–дополнение.",
    },
  },
  {
    id: makeEgpId("A1", "word-order", "adverb-of-frequency-position"),
    cefr: "A1",
    category: "word-order",
    can_do: {
      en: "Can place adverbs of frequency before the main verb and after 'be'.",
      ru: "Умеет ставить наречия частотности перед основным глаголом и после 'be'.",
    },
  },
];
