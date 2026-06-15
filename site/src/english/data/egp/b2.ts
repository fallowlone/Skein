// AUTHORED per-band EGP inventory for B2 (original phrasing, not verbatim
// Cambridge EGP). Canonical B2 grammar syllabus: what English requires at B2,
// independent of any single course's contents. Spans the higher-band
// categories (modality, conditionals, passive, clauses, discourse-cohesion,
// word-order) plus the subtler B2 work in tenses, verbs, and the rest.
import { makeEgpId, type EgpEntry } from "./types";

export const entries: EgpEntry[] = [
  // ── tenses-aspect ──────────────────────────────────────────────────
  {
    id: makeEgpId("B2", "tenses-aspect", "future-perfect"),
    cefr: "B2",
    category: "tenses-aspect",
    can_do: { en: "Can use the future perfect to say something will be finished before a future point.", ru: "Умеет использовать future perfect, чтобы сказать, что действие завершится к определённому моменту в будущем." },
  },
  {
    id: makeEgpId("B2", "tenses-aspect", "future-continuous"),
    cefr: "B2",
    category: "tenses-aspect",
    can_do: { en: "Can use the future continuous to describe an action in progress at a future time.", ru: "Умеет использовать future continuous для описания действия, которое будет происходить в определённый момент в будущем." },
  },
  {
    id: makeEgpId("B2", "tenses-aspect", "past-perfect-continuous"),
    cefr: "B2",
    category: "tenses-aspect",
    can_do: { en: "Can use the past perfect continuous to stress the duration of an activity before a past point.", ru: "Умеет использовать past perfect continuous, чтобы подчеркнуть длительность действия до момента в прошлом." },
  },
  {
    id: makeEgpId("B2", "tenses-aspect", "present-perfect-vs-past-contrast"),
    cefr: "B2",
    category: "tenses-aspect",
    can_do: { en: "Can choose reliably between present perfect and past simple to mark relevance to now versus a finished time.", ru: "Умеет уверенно выбирать между present perfect и past simple, различая связь с настоящим и завершённое прошлое." },
  },
  {
    id: makeEgpId("B2", "tenses-aspect", "used-to-vs-would-past-habits"),
    cefr: "B2",
    category: "tenses-aspect",
    can_do: { en: "Can contrast 'used to' and 'would' for repeated past habits, knowing 'would' resists past states.", ru: "Умеет различать 'used to' и 'would' для прошлых привычек, понимая, что 'would' не сочетается с состояниями." },
  },
  {
    id: makeEgpId("B2", "tenses-aspect", "future-in-the-past"),
    cefr: "B2",
    category: "tenses-aspect",
    can_do: { en: "Can express the future seen from a past viewpoint with 'was going to' and 'would'.", ru: "Умеет выражать будущее с точки зрения прошлого через 'was going to' и 'would'." },
  },

  // ── modality ───────────────────────────────────────────────────────
  {
    id: makeEgpId("B2", "modality", "past-deduction-must-have"),
    cefr: "B2",
    category: "modality",
    can_do: { en: "Can use 'must have', 'can't have' and 'might have' to deduce about the past.", ru: "Умеет использовать 'must have', 'can't have' и 'might have' для предположений о прошлом." },
  },
  {
    id: makeEgpId("B2", "modality", "should-have-criticism-regret"),
    cefr: "B2",
    category: "modality",
    can_do: { en: "Can use 'should have' and 'ought to have' to express regret or criticise a past choice.", ru: "Умеет использовать 'should have' и 'ought to have' для выражения сожаления или критики прошлого выбора." },
  },
  {
    id: makeEgpId("B2", "modality", "needn-t-have-vs-didn-t-need-to"),
    cefr: "B2",
    category: "modality",
    can_do: { en: "Can distinguish 'needn't have done' (done unnecessarily) from 'didn't need to do' (not required).", ru: "Умеет различать 'needn't have done' (сделал зря) и 'didn't need to do' (не было необходимости)." },
  },
  {
    id: makeEgpId("B2", "modality", "modals-of-probability-present"),
    cefr: "B2",
    category: "modality",
    can_do: { en: "Can grade present certainty with 'must', 'may', 'might', 'could' and 'can't'.", ru: "Умеет передавать степень уверенности в настоящем с помощью 'must', 'may', 'might', 'could' и 'can't'." },
  },
  {
    id: makeEgpId("B2", "modality", "semi-modals-be-able-to-bound-to"),
    cefr: "B2",
    category: "modality",
    can_do: { en: "Can use semi-modals such as 'be able to', 'be supposed to' and 'be bound to'.", ru: "Умеет использовать полумодальные обороты 'be able to', 'be supposed to' и 'be bound to'." },
  },
  {
    id: makeEgpId("B2", "modality", "would-rather-had-better"),
    cefr: "B2",
    category: "modality",
    can_do: { en: "Can express preference and advice with 'would rather' and 'had better'.", ru: "Умеет выражать предпочтение и совет через 'would rather' и 'had better'." },
  },

  // ── conditionals ───────────────────────────────────────────────────
  {
    id: makeEgpId("B2", "conditionals", "third-conditional-unreal-past"),
    cefr: "B2",
    category: "conditionals",
    can_do: { en: "Can form the third conditional to talk about unreal situations in the past.", ru: "Умеет строить третий тип условного предложения для нереальных ситуаций в прошлом." },
  },
  {
    id: makeEgpId("B2", "conditionals", "mixed-conditionals"),
    cefr: "B2",
    category: "conditionals",
    can_do: { en: "Can use mixed conditionals to link a past condition to a present result, or the reverse.", ru: "Умеет использовать смешанные условные предложения, связывая прошлое условие с настоящим результатом и наоборот." },
  },
  {
    id: makeEgpId("B2", "conditionals", "wish-if-only-regret"),
    cefr: "B2",
    category: "conditionals",
    can_do: { en: "Can use 'wish' and 'if only' with past forms to express regret about the present and past.", ru: "Умеет использовать 'wish' и 'if only' с прошедшими формами для выражения сожаления о настоящем и прошлом." },
  },
  {
    id: makeEgpId("B2", "conditionals", "alternatives-to-if"),
    cefr: "B2",
    category: "conditionals",
    can_do: { en: "Can replace 'if' with 'unless', 'provided that', 'as long as' and 'in case'.", ru: "Умеет заменять 'if' на 'unless', 'provided that', 'as long as' и 'in case'." },
  },

  // ── passive ────────────────────────────────────────────────────────
  {
    id: makeEgpId("B2", "passive", "passive-across-tenses"),
    cefr: "B2",
    category: "passive",
    can_do: { en: "Can form the passive across a full range of tenses, including perfect and continuous.", ru: "Умеет образовывать пассивный залог во всех временах, включая перфектные и продолженные." },
  },
  {
    id: makeEgpId("B2", "passive", "reporting-passive-it-is-said"),
    cefr: "B2",
    category: "passive",
    can_do: { en: "Can use impersonal reporting passives such as 'It is said that ...' and 'He is thought to ...'.", ru: "Умеет использовать безличный пассив сообщения, например 'It is said that ...' и 'He is thought to ...'." },
  },
  {
    id: makeEgpId("B2", "passive", "causative-have-get-something-done"),
    cefr: "B2",
    category: "passive",
    can_do: { en: "Can use the causative 'have/get something done' to say someone else does a task for you.", ru: "Умеет использовать каузатив 'have/get something done', чтобы сказать, что задачу выполняет кто-то другой." },
  },
  {
    id: makeEgpId("B2", "passive", "passive-with-modals"),
    cefr: "B2",
    category: "passive",
    can_do: { en: "Can combine modals with the passive, as in 'must be done' or 'should have been sent'.", ru: "Умеет сочетать модальные глаголы с пассивом, например 'must be done' или 'should have been sent'." },
  },
  {
    id: makeEgpId("B2", "passive", "passive-by-agent-choice"),
    cefr: "B2",
    category: "passive",
    can_do: { en: "Can decide when to name the agent with 'by' and when to omit it for focus.", ru: "Умеет решать, когда указывать исполнителя через 'by', а когда опускать его ради акцента." },
  },

  // ── clauses ────────────────────────────────────────────────────────
  {
    id: makeEgpId("B2", "clauses", "non-defining-relative-clauses"),
    cefr: "B2",
    category: "clauses",
    can_do: { en: "Can add extra information with non-defining relative clauses set off by commas.", ru: "Умеет добавлять дополнительную информацию через неограничительные определительные придаточные, выделенные запятыми." },
  },
  {
    id: makeEgpId("B2", "clauses", "relative-clauses-with-prepositions"),
    cefr: "B2",
    category: "clauses",
    can_do: { en: "Can use relative clauses with a preposition, fronted as in 'the firm for which I work'.", ru: "Умеет использовать определительные придаточные с предлогом, вынесенным вперёд: 'the firm for which I work'." },
  },
  {
    id: makeEgpId("B2", "clauses", "participle-clauses-reduced"),
    cefr: "B2",
    category: "clauses",
    can_do: { en: "Can shorten clauses with present and past participles, as in 'the man standing there'.", ru: "Умеет сокращать придаточные причастными оборотами: 'the man standing there'." },
  },
  {
    id: makeEgpId("B2", "clauses", "concession-clauses-although-though"),
    cefr: "B2",
    category: "clauses",
    can_do: { en: "Can concede a point with 'although', 'even though', 'while' and 'whereas'.", ru: "Умеет уступать в аргументе с помощью 'although', 'even though', 'while' и 'whereas'." },
  },
  {
    id: makeEgpId("B2", "clauses", "purpose-result-clauses"),
    cefr: "B2",
    category: "clauses",
    can_do: { en: "Can express purpose and result with 'so that', 'in order to', 'so ... that' and 'such ... that'.", ru: "Умеет выражать цель и результат через 'so that', 'in order to', 'so ... that' и 'such ... that'." },
  },
  {
    id: makeEgpId("B2", "clauses", "reported-speech-backshift"),
    cefr: "B2",
    category: "clauses",
    can_do: { en: "Can report statements with correct tense backshift and shifts of time and place words.", ru: "Умеет передавать высказывания в косвенной речи с правильным сдвигом времён и слов времени и места." },
  },
  {
    id: makeEgpId("B2", "clauses", "reporting-verbs-with-patterns"),
    cefr: "B2",
    category: "clauses",
    can_do: { en: "Can report with verbs that take varied patterns, such as 'suggest doing' and 'warn someone to'.", ru: "Умеет использовать глаголы сообщения с разными конструкциями, например 'suggest doing' и 'warn someone to'." },
  },

  // ── verbs ──────────────────────────────────────────────────────────
  {
    id: makeEgpId("B2", "verbs", "gerund-vs-infinitive-meaning-change"),
    cefr: "B2",
    category: "verbs",
    can_do: { en: "Can use verbs where gerund and infinitive change meaning, such as 'stop', 'remember' and 'try'.", ru: "Умеет использовать глаголы, у которых герундий и инфинитив меняют смысл: 'stop', 'remember', 'try'." },
  },
  {
    id: makeEgpId("B2", "verbs", "verb-object-infinitive-patterns"),
    cefr: "B2",
    category: "verbs",
    can_do: { en: "Can use verb + object + infinitive patterns, as in 'persuade her to stay'.", ru: "Умеет использовать конструкцию глагол + дополнение + инфинитив: 'persuade her to stay'." },
  },
  {
    id: makeEgpId("B2", "verbs", "phrasal-verbs-separable-transitive"),
    cefr: "B2",
    category: "verbs",
    can_do: { en: "Can place objects correctly with separable transitive phrasal verbs.", ru: "Умеет правильно располагать дополнение при разделяемых переходных фразовых глаголах." },
  },
  {
    id: makeEgpId("B2", "verbs", "state-verbs-in-continuous"),
    cefr: "B2",
    category: "verbs",
    can_do: { en: "Can use normally stative verbs in the continuous for a temporary or deliberate sense.", ru: "Умеет употреблять обычно статичные глаголы в продолженном времени для временного или намеренного значения." },
  },

  // ── discourse-cohesion ─────────────────────────────────────────────
  {
    id: makeEgpId("B2", "discourse-cohesion", "linkers-contrast-however-nevertheless"),
    cefr: "B2",
    category: "discourse-cohesion",
    can_do: { en: "Can link ideas across sentences with contrast adverbials like 'however' and 'nevertheless'.", ru: "Умеет связывать идеи между предложениями противительными наречиями 'however' и 'nevertheless'." },
  },
  {
    id: makeEgpId("B2", "discourse-cohesion", "linkers-cause-result-therefore"),
    cefr: "B2",
    category: "discourse-cohesion",
    can_do: { en: "Can signal cause and result with 'therefore', 'consequently' and 'as a result'.", ru: "Умеет обозначать причину и следствие через 'therefore', 'consequently' и 'as a result'." },
  },
  {
    id: makeEgpId("B2", "discourse-cohesion", "reference-substitution-it-this-such"),
    cefr: "B2",
    category: "discourse-cohesion",
    can_do: { en: "Can keep text cohesive using reference and substitution with 'it', 'this', 'one' and 'such'.", ru: "Умеет поддерживать связность текста, используя отсылку и замену через 'it', 'this', 'one' и 'such'." },
  },
  {
    id: makeEgpId("B2", "discourse-cohesion", "discourse-markers-spoken"),
    cefr: "B2",
    category: "discourse-cohesion",
    can_do: { en: "Can manage spoken discourse with markers like 'anyway', 'mind you' and 'as I was saying'.", ru: "Умеет управлять устной речью маркерами 'anyway', 'mind you' и 'as I was saying'." },
  },
  {
    id: makeEgpId("B2", "discourse-cohesion", "ellipsis-avoid-repetition"),
    cefr: "B2",
    category: "discourse-cohesion",
    can_do: { en: "Can use ellipsis to leave out repeated words, as in 'I can swim but she can't'.", ru: "Умеет использовать эллипсис, опуская повторяющиеся слова: 'I can swim but she can't'." },
  },

  // ── word-order ─────────────────────────────────────────────────────
  {
    id: makeEgpId("B2", "word-order", "cleft-sentences-it-was"),
    cefr: "B2",
    category: "word-order",
    can_do: { en: "Can emphasise an element with 'it'-cleft sentences, as in 'It was Anna who called'.", ru: "Умеет выделять элемент с помощью расщеплённых предложений с 'it': 'It was Anna who called'." },
  },
  {
    id: makeEgpId("B2", "word-order", "what-cleft-sentences"),
    cefr: "B2",
    category: "word-order",
    can_do: { en: "Can focus information with 'what'-clefts, as in 'What I need is more time'.", ru: "Умеет фокусировать информацию через расщепление с 'what': 'What I need is more time'." },
  },
  {
    id: makeEgpId("B2", "word-order", "inversion-after-negative-adverbials"),
    cefr: "B2",
    category: "word-order",
    can_do: { en: "Can invert subject and auxiliary after fronted negative adverbials like 'never' and 'rarely'.", ru: "Умеет менять местами подлежащее и вспомогательный глагол после вынесенных отрицательных наречий 'never', 'rarely'." },
  },
  {
    id: makeEgpId("B2", "word-order", "fronting-for-emphasis"),
    cefr: "B2",
    category: "word-order",
    can_do: { en: "Can front an object or complement for emphasis, as in 'That book I have read'.", ru: "Умеет выносить дополнение или именную часть вперёд для акцента: 'That book I have read'." },
  },

  // ── adjectives-adverbs ─────────────────────────────────────────────
  {
    id: makeEgpId("B2", "adjectives-adverbs", "adjective-order-multiple"),
    cefr: "B2",
    category: "adjectives-adverbs",
    can_do: { en: "Can order several adjectives before a noun in the natural English sequence.", ru: "Умеет располагать несколько прилагательных перед существительным в естественном для английского порядке." },
  },
  {
    id: makeEgpId("B2", "adjectives-adverbs", "modifying-comparatives"),
    cefr: "B2",
    category: "adjectives-adverbs",
    can_do: { en: "Can grade comparisons with 'far', 'much', 'a bit' and 'slightly', as in 'far more difficult'.", ru: "Умеет градуировать сравнения через 'far', 'much', 'a bit' и 'slightly': 'far more difficult'." },
  },
  {
    id: makeEgpId("B2", "adjectives-adverbs", "intensifiers-gradable-non-gradable"),
    cefr: "B2",
    category: "adjectives-adverbs",
    can_do: { en: "Can match intensifiers to gradable and non-gradable adjectives, as in 'absolutely exhausted'.", ru: "Умеет подбирать усилители к градуируемым и неградуируемым прилагательным: 'absolutely exhausted'." },
  },
  {
    id: makeEgpId("B2", "adjectives-adverbs", "adjectives-with-prepositions"),
    cefr: "B2",
    category: "adjectives-adverbs",
    can_do: { en: "Can use the dependent preposition that an adjective takes, as in 'aware of' or 'keen on'.", ru: "Умеет использовать предлог, требуемый прилагательным: 'aware of', 'keen on'." },
  },

  // ── nouns-determiners ──────────────────────────────────────────────
  {
    id: makeEgpId("B2", "nouns-determiners", "articles-abstract-generic"),
    cefr: "B2",
    category: "nouns-determiners",
    can_do: { en: "Can use articles correctly with abstract and generic reference, including the zero article.", ru: "Умеет правильно употреблять артикли с абстрактными и обобщёнными существительными, включая нулевой артикль." },
  },
  {
    id: makeEgpId("B2", "nouns-determiners", "quantifiers-most-few-several"),
    cefr: "B2",
    category: "nouns-determiners",
    can_do: { en: "Can choose precise quantifiers such as 'most', 'several', 'a few' and 'plenty of'.", ru: "Умеет выбирать точные кванторы: 'most', 'several', 'a few', 'plenty of'." },
  },
  {
    id: makeEgpId("B2", "nouns-determiners", "uncountable-nouns-partitives"),
    cefr: "B2",
    category: "nouns-determiners",
    can_do: { en: "Can quantify uncountable nouns with partitives, as in 'a piece of advice'.", ru: "Умеет исчислять неисчисляемые существительные через партитивы: 'a piece of advice'." },
  },

  // ── prepositions ───────────────────────────────────────────────────
  {
    id: makeEgpId("B2", "prepositions", "dependent-prepositions-after-verbs"),
    cefr: "B2",
    category: "prepositions",
    can_do: { en: "Can use the dependent preposition required after a verb, as in 'depend on' or 'consist of'.", ru: "Умеет использовать предлог, требуемый глаголом: 'depend on', 'consist of'." },
  },
  {
    id: makeEgpId("B2", "prepositions", "prepositional-phrases-cohesion"),
    cefr: "B2",
    category: "prepositions",
    can_do: { en: "Can use fixed prepositional phrases like 'in spite of', 'on behalf of' and 'as a result of'.", ru: "Умеет использовать устойчивые предложные обороты 'in spite of', 'on behalf of' и 'as a result of'." },
  },

  // ── pronouns ───────────────────────────────────────────────────────
  {
    id: makeEgpId("B2", "pronouns", "relative-pronoun-whose-which-clause"),
    cefr: "B2",
    category: "pronouns",
    can_do: { en: "Can use 'whose' and a clause-referring 'which' to connect ideas precisely.", ru: "Умеет использовать 'whose' и относящееся ко всему предложению 'which' для точной связи идей." },
  },
  {
    id: makeEgpId("B2", "pronouns", "reflexive-emphatic-pronouns"),
    cefr: "B2",
    category: "pronouns",
    can_do: { en: "Can use reflexive pronouns emphatically, as in 'I did it myself'.", ru: "Умеет использовать возвратные местоимения для усиления: 'I did it myself'." },
  },

  // ── questions-negation ─────────────────────────────────────────────
  {
    id: makeEgpId("B2", "questions-negation", "question-tags-nuance"),
    cefr: "B2",
    category: "questions-negation",
    can_do: { en: "Can use question tags with the right form and intonation to check or seek agreement.", ru: "Умеет использовать разделительные вопросы с правильной формой и интонацией для уточнения или согласия." },
  },
  {
    id: makeEgpId("B2", "questions-negation", "indirect-questions-embedded"),
    cefr: "B2",
    category: "questions-negation",
    can_do: { en: "Can soften enquiries with indirect questions like 'Could you tell me where ...'.", ru: "Умеет смягчать вопросы косвенными конструкциями 'Could you tell me where ...'." },
  },
  {
    id: makeEgpId("B2", "questions-negation", "negative-affixes-prefixes"),
    cefr: "B2",
    category: "questions-negation",
    can_do: { en: "Can negate meaning with prefixes such as 'un-', 'dis-', 'mis-' and 'in-'.", ru: "Умеет передавать отрицание приставками 'un-', 'dis-', 'mis-' и 'in-'." },
  },
];
