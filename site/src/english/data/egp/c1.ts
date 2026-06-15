// AUTHORED per-band EGP inventory (original phrasing). C1 competency yardstick:
// what English REQUIRES at C1, spanning grammar categories — not any one course.
import { makeEgpId, type EgpEntry } from "./types";

export const entries: EgpEntry[] = [
  // ── verbs ────────────────────────────────────────────────────────────────
  {
    id: makeEgpId("C1", "verbs", "ergative-verbs"),
    cefr: "C1",
    category: "verbs",
    can_do: { en: "Can use ergative verbs that take the same form in active and intransitive senses (e.g. 'the door opened', 'sales doubled').", ru: "Умеет использовать эргативные глаголы в одинаковой форме для активного и непереходного значений (например, 'дверь открылась', 'продажи удвоились')." },
  },
  {
    id: makeEgpId("C1", "verbs", "delexical-verb-noun-collocations"),
    cefr: "C1",
    category: "verbs",
    can_do: { en: "Can form precise delexical verb-plus-noun combinations such as 'draw a conclusion', 'lodge a complaint', or 'reach a verdict'.", ru: "Умеет образовывать точные делексикальные сочетания «глагол + существительное», например 'draw a conclusion', 'lodge a complaint', 'reach a verdict'." },
  },
  {
    id: makeEgpId("C1", "verbs", "complex-verb-patterns-gerund-vs-infinitive"),
    cefr: "C1",
    category: "verbs",
    can_do: { en: "Can choose the gerund or infinitive after verbs where the choice changes meaning (e.g. 'stop to do' vs 'stop doing', 'regret to say' vs 'regret saying').", ru: "Умеет выбирать герундий или инфинитив после глаголов, где выбор меняет смысл (например, 'stop to do' и 'stop doing', 'regret to say' и 'regret saying')." },
  },
  // ── tenses-aspect ──────────────────────────────────────────────────────────
  {
    id: makeEgpId("C1", "tenses-aspect", "future-perfect-and-continuous"),
    cefr: "C1",
    category: "tenses-aspect",
    can_do: { en: "Can use the future perfect and future continuous to project completion or ongoing activity at a point ahead (e.g. 'by June we will have shipped', 'this time next week I'll be flying').", ru: "Умеет использовать future perfect и future continuous, чтобы обозначить завершённость или продолжающееся действие к моменту в будущем (например, 'by June we will have shipped', 'this time next week I'll be flying')." },
  },
  {
    id: makeEgpId("C1", "tenses-aspect", "past-perfect-continuous-duration"),
    cefr: "C1",
    category: "tenses-aspect",
    can_do: { en: "Can use the past perfect continuous to stress the duration of an activity leading up to a past point.", ru: "Умеет использовать past perfect continuous, чтобы подчеркнуть длительность действия, предшествовавшего моменту в прошлом." },
  },
  {
    id: makeEgpId("C1", "tenses-aspect", "future-in-the-past"),
    cefr: "C1",
    category: "tenses-aspect",
    can_do: { en: "Can express the future seen from a past viewpoint with forms like 'was going to', 'would', and 'was about to'.", ru: "Умеет выражать будущее с точки зрения прошлого формами 'was going to', 'would', 'was about to'." },
  },
  {
    id: makeEgpId("C1", "tenses-aspect", "narrative-tense-shifting"),
    cefr: "C1",
    category: "tenses-aspect",
    can_do: { en: "Can shift fluidly between simple, continuous, and perfect aspects to layer background, sequence, and result in extended narrative.", ru: "Умеет свободно переключаться между простым, продолженным и перфектным аспектами, выстраивая фон, последовательность и результат в развёрнутом повествовании." },
  },
  {
    id: makeEgpId("C1", "tenses-aspect", "present-tenses-for-vivid-or-future-events"),
    cefr: "C1",
    category: "tenses-aspect",
    can_do: { en: "Can use present tenses for rhetorical effect — the historic present in storytelling and the present for scheduled or headline-style future events.", ru: "Умеет использовать настоящие времена для риторического эффекта — historic present в рассказе и настоящее время для расписанных или «заголовочных» будущих событий." },
  },
  // ── modality ───────────────────────────────────────────────────────────────
  {
    id: makeEgpId("C1", "modality", "modal-perfects-speculation-past"),
    cefr: "C1",
    category: "modality",
    can_do: { en: "Can speculate about and evaluate past events with modal perfects such as 'might have', 'must have', 'can't have', and 'should have'.", ru: "Умеет рассуждать о прошлых событиях и оценивать их с помощью модальных перфектов 'might have', 'must have', 'can't have', 'should have'." },
  },
  {
    id: makeEgpId("C1", "modality", "graded-epistemic-certainty"),
    cefr: "C1",
    category: "modality",
    can_do: { en: "Can grade certainty finely across modals and adverbs ('it may well', 'it could conceivably', 'that can hardly be the case').", ru: "Умеет тонко градуировать уверенность с помощью модальных глаголов и наречий ('it may well', 'it could conceivably', 'that can hardly be the case')." },
  },
  {
    id: makeEgpId("C1", "modality", "hedging-and-tentativeness"),
    cefr: "C1",
    category: "modality",
    can_do: { en: "Can soften claims and recommendations through hedging ('would tend to', 'might suggest', 'it would appear that') to sound diplomatic in formal contexts.", ru: "Умеет смягчать утверждения и рекомендации с помощью хеджирования ('would tend to', 'might suggest', 'it would appear that'), звуча дипломатично в формальном контексте." },
  },
  {
    id: makeEgpId("C1", "modality", "semi-modals-and-marginal-modals"),
    cefr: "C1",
    category: "modality",
    can_do: { en: "Can deploy semi-modal and marginal forms such as 'be bound to', 'be liable to', 'need not have', 'dare', and 'ought to' with the right nuance.", ru: "Умеет употреблять полумодальные и маргинальные формы 'be bound to', 'be liable to', 'need not have', 'dare', 'ought to' с нужным оттенком." },
  },
  {
    id: makeEgpId("C1", "modality", "would-for-past-habit-and-criticism"),
    cefr: "C1",
    category: "modality",
    can_do: { en: "Can use 'would' for characteristic past habits and for mild criticism or annoyance ('she would say that').", ru: "Умеет использовать 'would' для характерных привычек в прошлом и для лёгкой критики или раздражения ('she would say that')." },
  },
  // ── conditionals ─────────────────────────────────────────────────────────────
  {
    id: makeEgpId("C1", "conditionals", "mixed-conditionals"),
    cefr: "C1",
    category: "conditionals",
    can_do: { en: "Can build mixed conditionals that cross time frames (e.g. a past condition with a present result, or vice versa).", ru: "Умеет строить смешанные условные предложения, пересекающие временные планы (например, прошлое условие — настоящий результат и наоборот)." },
  },
  {
    id: makeEgpId("C1", "conditionals", "inverted-conditionals-no-if"),
    cefr: "C1",
    category: "conditionals",
    can_do: { en: "Can form conditionals by inversion without 'if' — 'were I to', 'had they known', 'should you need'.", ru: "Умеет образовывать условные предложения через инверсию без 'if' — 'were I to', 'had they known', 'should you need'." },
  },
  {
    id: makeEgpId("C1", "conditionals", "alternative-conditional-conjunctions"),
    cefr: "C1",
    category: "conditionals",
    can_do: { en: "Can express conditions with a range of connectors such as 'provided that', 'as long as', 'supposing', 'on condition that', and 'unless'.", ru: "Умеет выражать условие разными союзами: 'provided that', 'as long as', 'supposing', 'on condition that', 'unless'." },
  },
  {
    id: makeEgpId("C1", "conditionals", "implied-and-elliptical-conditions"),
    cefr: "C1",
    category: "conditionals",
    can_do: { en: "Can leave a condition implied or elliptical ('if necessary', 'if anything', 'but for your help') rather than stating a full clause.", ru: "Умеет оставлять условие подразумеваемым или эллиптичным ('if necessary', 'if anything', 'but for your help'), не разворачивая полное придаточное." },
  },
  // ── passive ──────────────────────────────────────────────────────────────────
  {
    id: makeEgpId("C1", "passive", "reporting-passive-impersonal"),
    cefr: "C1",
    category: "passive",
    can_do: { en: "Can use impersonal reporting passives to attribute claims cautiously ('it is widely believed that', 'he is thought to have left').", ru: "Умеет использовать безличный пассив для осторожной передачи мнений ('it is widely believed that', 'he is thought to have left')." },
  },
  {
    id: makeEgpId("C1", "passive", "passive-with-get-and-have-causative"),
    cefr: "C1",
    category: "passive",
    can_do: { en: "Can use the 'get'-passive and the causative 'have/get something done' to mark involvement, agency, or service.", ru: "Умеет использовать пассив с 'get' и каузатив 'have/get something done', чтобы обозначить вовлечённость, инициативу или услугу." },
  },
  {
    id: makeEgpId("C1", "passive", "passive-infinitives-and-gerunds"),
    cefr: "C1",
    category: "passive",
    can_do: { en: "Can use passive infinitives and gerunds within larger structures (e.g. 'expects to be told', 'resented being overlooked').", ru: "Умеет использовать пассивные инфинитивы и герундии в составе более сложных конструкций (например, 'expects to be told', 'resented being overlooked')." },
  },
  {
    id: makeEgpId("C1", "passive", "passive-for-focus-and-cohesion"),
    cefr: "C1",
    category: "passive",
    can_do: { en: "Can switch to the passive deliberately to keep the topic in subject position and maintain information flow across sentences.", ru: "Умеет осознанно переходить к пассиву, чтобы удерживать тему в позиции подлежащего и сохранять движение информации между предложениями." },
  },
  // ── nouns-determiners ────────────────────────────────────────────────────────
  {
    id: makeEgpId("C1", "nouns-determiners", "abstract-nominalisation"),
    cefr: "C1",
    category: "nouns-determiners",
    can_do: { en: "Can nominalise — recast verbs and adjectives as abstract nouns ('the implementation of', 'a reluctance to') — to write densely and formally.", ru: "Умеет номинализировать — превращать глаголы и прилагательные в абстрактные существительные ('the implementation of', 'a reluctance to') — для плотного и формального письма." },
  },
  {
    id: makeEgpId("C1", "nouns-determiners", "article-use-with-abstract-and-generic-nouns"),
    cefr: "C1",
    category: "nouns-determiners",
    can_do: { en: "Can control subtle article choices with abstract, generic, and institutional nouns (e.g. 'go to hospital' vs 'to the hospital', 'history' vs 'the history of').", ru: "Умеет контролировать тонкий выбор артикля с абстрактными, родовыми и институциональными существительными (например, 'go to hospital' и 'to the hospital', 'history' и 'the history of')." },
  },
  {
    id: makeEgpId("C1", "nouns-determiners", "complex-quantifiers-and-partitives"),
    cefr: "C1",
    category: "nouns-determiners",
    can_do: { en: "Can use precise quantifiers and partitive phrases ('a great deal of', 'the bulk of', 'a fraction of', 'scant evidence').", ru: "Умеет использовать точные кванторы и партитивные обороты ('a great deal of', 'the bulk of', 'a fraction of', 'scant evidence')." },
  },
  {
    id: makeEgpId("C1", "nouns-determiners", "complex-noun-phrase-premodification"),
    cefr: "C1",
    category: "nouns-determiners",
    can_do: { en: "Can build dense noun phrases with stacked premodifiers and noun-noun chains ('a long-term sustainable funding model').", ru: "Умеет строить плотные именные группы со стопкой определений и цепочками «существительное + существительное» ('a long-term sustainable funding model')." },
  },
  // ── pronouns ───────────────────────────────────────────────────────────────
  {
    id: makeEgpId("C1", "pronouns", "antecedent-clarity-in-complex-text"),
    cefr: "C1",
    category: "pronouns",
    can_do: { en: "Can manage pronoun reference across long, embedded sentences so that every 'it', 'this', or 'they' has an unambiguous antecedent.", ru: "Умеет управлять отсылкой местоимений в длинных, вложенных предложениях так, чтобы каждое 'it', 'this' или 'they' имело однозначный антецедент." },
  },
  {
    id: makeEgpId("C1", "pronouns", "summative-this-and-such"),
    cefr: "C1",
    category: "pronouns",
    can_do: { en: "Can use 'this', 'that', and 'such' to summarise a whole preceding idea and carry it forward as a discourse referent.", ru: "Умеет использовать 'this', 'that' и 'such', чтобы обобщить целую предыдущую мысль и нести её дальше как референт в тексте." },
  },
  {
    id: makeEgpId("C1", "pronouns", "indefinite-and-reciprocal-fine-distinctions"),
    cefr: "C1",
    category: "pronouns",
    can_do: { en: "Can distinguish fine shades among indefinite and reciprocal pronouns ('one', 'each other' vs 'one another', 'none' vs 'neither').", ru: "Умеет различать тонкие оттенки неопределённых и взаимных местоимений ('one', 'each other' и 'one another', 'none' и 'neither')." },
  },
  // ── adjectives-adverbs ───────────────────────────────────────────────────────
  {
    id: makeEgpId("C1", "adjectives-adverbs", "gradable-vs-non-gradable-intensifiers"),
    cefr: "C1",
    category: "adjectives-adverbs",
    can_do: { en: "Can match intensifiers to gradable and non-gradable adjectives correctly ('absolutely essential', 'utterly impossible', 'fairly useful').", ru: "Умеет правильно сочетать усилители с градуируемыми и неградуируемыми прилагательными ('absolutely essential', 'utterly impossible', 'fairly useful')." },
  },
  {
    id: makeEgpId("C1", "adjectives-adverbs", "adverb-position-for-scope-and-emphasis"),
    cefr: "C1",
    category: "adjectives-adverbs",
    can_do: { en: "Can place adverbs deliberately to control scope, focus, and emphasis, including comment and viewpoint adverbs ('admittedly', 'understandably', 'arguably').", ru: "Умеет осознанно располагать наречия для управления охватом, фокусом и акцентом, включая комментирующие и оценочные наречия ('admittedly', 'understandably', 'arguably')." },
  },
  {
    id: makeEgpId("C1", "adjectives-adverbs", "complex-comparative-structures"),
    cefr: "C1",
    category: "adjectives-adverbs",
    can_do: { en: "Can build elaborate comparisons such as 'the more … the more', 'no less … than', 'every bit as … as', and 'nowhere near as'.", ru: "Умеет строить сложные сравнения 'the more … the more', 'no less … than', 'every bit as … as', 'nowhere near as'." },
  },
  {
    id: makeEgpId("C1", "adjectives-adverbs", "participle-adjectives-and-compound-adjectives"),
    cefr: "C1",
    category: "adjectives-adverbs",
    can_do: { en: "Can form and use participle adjectives and hyphenated compound adjectives ('a thought-provoking talk', 'a well-intentioned but flawed plan').", ru: "Умеет образовывать и использовать причастные прилагательные и дефисные сложные прилагательные ('a thought-provoking talk', 'a well-intentioned but flawed plan')." },
  },
  // ── prepositions ─────────────────────────────────────────────────────────────
  {
    id: makeEgpId("C1", "prepositions", "dependent-prepositions-precision"),
    cefr: "C1",
    category: "prepositions",
    can_do: { en: "Can select the exact dependent preposition after verbs, nouns, and adjectives where small changes shift meaning ('agree with/to/on', 'concern for/about/with').", ru: "Умеет выбирать точный зависимый предлог после глаголов, существительных и прилагательных, где мелкое изменение меняет смысл ('agree with/to/on', 'concern for/about/with')." },
  },
  {
    id: makeEgpId("C1", "prepositions", "complex-and-multiword-prepositions"),
    cefr: "C1",
    category: "prepositions",
    can_do: { en: "Can use multiword prepositional phrases of formal register ('in the light of', 'with a view to', 'by virtue of', 'in the wake of').", ru: "Умеет использовать многословные предложные обороты формального регистра ('in the light of', 'with a view to', 'by virtue of', 'in the wake of')." },
  },
  {
    id: makeEgpId("C1", "prepositions", "preposition-plus-gerund-clauses"),
    cefr: "C1",
    category: "prepositions",
    can_do: { en: "Can attach gerund clauses to prepositions to compress meaning ('on arriving', 'despite having warned them', 'far from solving the problem').", ru: "Умеет присоединять герундийные обороты к предлогам для сжатия смысла ('on arriving', 'despite having warned them', 'far from solving the problem')." },
  },
  // ── clauses ────────────────────────────────────────────────────────────────
  {
    id: makeEgpId("C1", "clauses", "non-defining-relative-clauses-with-quantifiers"),
    cefr: "C1",
    category: "clauses",
    can_do: { en: "Can use non-defining relative clauses with quantifying and prepositional relatives ('many of whom', 'the cost of which', 'at which point').", ru: "Умеет использовать неопределительные относительные придаточные с кванторными и предложными относительными словами ('many of whom', 'the cost of which', 'at which point')." },
  },
  {
    id: makeEgpId("C1", "clauses", "participle-clauses-for-economy"),
    cefr: "C1",
    category: "clauses",
    can_do: { en: "Can replace finite clauses with present, past, and perfect participle clauses to write economically ('having reviewed the data, the team …').", ru: "Умеет заменять личные придаточные причастными оборотами настоящего, прошедшего и перфектного причастия для экономной речи ('having reviewed the data, the team …')." },
  },
  {
    id: makeEgpId("C1", "clauses", "cleft-sentences-for-emphasis"),
    cefr: "C1",
    category: "clauses",
    can_do: { en: "Can use it-clefts and wh-clefts to foreground a particular element ('It was the delay that caused it', 'What surprised us was the cost').", ru: "Умеет использовать it-клефты и wh-клефты, чтобы выдвинуть на первый план определённый элемент ('It was the delay that caused it', 'What surprised us was the cost')." },
  },
  {
    id: makeEgpId("C1", "clauses", "concessive-and-purpose-subordination"),
    cefr: "C1",
    category: "clauses",
    can_do: { en: "Can subordinate concession and purpose with a wide connector range ('much as', 'even though', 'so as to', 'lest', 'for fear that').", ru: "Умеет подчинять уступку и цель широким набором союзов ('much as', 'even though', 'so as to', 'lest', 'for fear that')." },
  },
  {
    id: makeEgpId("C1", "clauses", "nominal-that-and-wh-clauses-as-arguments"),
    cefr: "C1",
    category: "clauses",
    can_do: { en: "Can use nominal 'that'- and wh-clauses as subjects, complements, and objects ('That it failed surprised no one', 'Whether to proceed is unclear').", ru: "Умеет использовать именные придаточные с 'that' и wh-словами как подлежащие, дополнения и предикативы ('That it failed surprised no one', 'Whether to proceed is unclear')." },
  },
  // ── questions-negation ───────────────────────────────────────────────────────
  {
    id: makeEgpId("C1", "questions-negation", "negation-scope-and-transferred-negation"),
    cefr: "C1",
    category: "questions-negation",
    can_do: { en: "Can control the scope of negation and use transferred negation ('I don't think it'll work' rather than 'I think it won't work').", ru: "Умеет контролировать охват отрицания и использовать перенесённое отрицание ('I don't think it'll work' вместо 'I think it won't work')." },
  },
  {
    id: makeEgpId("C1", "questions-negation", "rhetorical-and-tag-nuance"),
    cefr: "C1",
    category: "questions-negation",
    can_do: { en: "Can use rhetorical questions and nuanced tag questions to manage stance, irony, and shared assumptions.", ru: "Умеет использовать риторические вопросы и тонкие разделительные вопросы для передачи позиции, иронии и общих предпосылок." },
  },
  {
    id: makeEgpId("C1", "questions-negation", "negative-and-restrictive-adverbs"),
    cefr: "C1",
    category: "questions-negation",
    can_do: { en: "Can use negative and restrictive adverbials such as 'hardly', 'scarcely', 'no sooner', and 'little' to qualify statements precisely.", ru: "Умеет использовать отрицательные и ограничительные наречия 'hardly', 'scarcely', 'no sooner', 'little' для точного уточнения высказываний." },
  },
  // ── discourse-cohesion ───────────────────────────────────────────────────────
  {
    id: makeEgpId("C1", "discourse-cohesion", "linking-adverbials-for-logical-relations"),
    cefr: "C1",
    category: "discourse-cohesion",
    can_do: { en: "Can signal logical relations across sentences with a broad set of linking adverbials ('consequently', 'conversely', 'notwithstanding', 'by the same token').", ru: "Умеет обозначать логические связи между предложениями широким набором связующих наречий ('consequently', 'conversely', 'notwithstanding', 'by the same token')." },
  },
  {
    id: makeEgpId("C1", "discourse-cohesion", "ellipsis-and-substitution"),
    cefr: "C1",
    category: "discourse-cohesion",
    can_do: { en: "Can avoid repetition through ellipsis and substitution with 'so', 'do so', 'one', and 'the former/the latter'.", ru: "Умеет избегать повторов с помощью эллипсиса и субституции 'so', 'do so', 'one', 'the former/the latter'." },
  },
  {
    id: makeEgpId("C1", "discourse-cohesion", "discourse-markers-for-stance-and-management"),
    cefr: "C1",
    category: "discourse-cohesion",
    can_do: { en: "Can use discourse markers to organise, qualify, and signal stance ('that said', 'as it happens', 'to be fair', 'in any case').", ru: "Умеет использовать дискурсивные маркеры для организации, оговорок и передачи позиции ('that said', 'as it happens', 'to be fair', 'in any case')." },
  },
  {
    id: makeEgpId("C1", "discourse-cohesion", "register-shifting-formal-informal"),
    cefr: "C1",
    category: "discourse-cohesion",
    can_do: { en: "Can shift register deliberately between formal and informal styles to suit audience and purpose within a single text.", ru: "Умеет осознанно менять регистр между формальным и неформальным стилем, подстраиваясь под аудиторию и цель в пределах одного текста." },
  },
  // ── word-order ─────────────────────────────────────────────────────────────
  {
    id: makeEgpId("C1", "word-order", "inversion-after-negative-adverbials"),
    cefr: "C1",
    category: "word-order",
    can_do: { en: "Can invert subject and auxiliary after fronted negative or restrictive adverbials ('Never had we seen …', 'Not only did they …', 'Only then did it become clear').", ru: "Умеет инвертировать подлежащее и вспомогательный глагол после вынесенных отрицательных или ограничительных наречий ('Never had we seen …', 'Not only did they …', 'Only then did it become clear')." },
  },
  {
    id: makeEgpId("C1", "word-order", "fronting-for-emphasis-and-cohesion"),
    cefr: "C1",
    category: "word-order",
    can_do: { en: "Can front objects, complements, and adverbials for emphasis and cohesion ('This I cannot accept', 'Such was the demand that …').", ru: "Умеет выносить вперёд дополнения, предикативы и обстоятельства ради акцента и связности ('This I cannot accept', 'Such was the demand that …')." },
  },
  {
    id: makeEgpId("C1", "word-order", "end-weight-and-extraposition"),
    cefr: "C1",
    category: "word-order",
    can_do: { en: "Can apply the end-weight principle and use extraposition with anticipatory 'it' to keep heavy elements at the end ('It is essential that everyone attend').", ru: "Умеет применять принцип конечного веса и использовать экстрапозицию с вводным 'it', чтобы оставлять тяжёлые элементы в конце ('It is essential that everyone attend')." },
  },
  {
    id: makeEgpId("C1", "word-order", "inversion-in-comparative-and-conditional-clauses"),
    cefr: "C1",
    category: "word-order",
    can_do: { en: "Can use inversion in formal comparative and conditional clauses ('so complex was the issue that …', 'were it not for …').", ru: "Умеет использовать инверсию в формальных сравнительных и условных придаточных ('so complex was the issue that …', 'were it not for …')." },
  },
];
