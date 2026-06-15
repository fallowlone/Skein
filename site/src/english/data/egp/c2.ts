// AUTHORED per-band EGP inventory (original phrasing). C2 band.
// Honest external yardstick: the canonical grammar a learner must control at C2,
// not the contents of any single course. can_do phrasing is ORIGINAL.
import { makeEgpId, type EgpEntry } from "./types";

export const entries: EgpEntry[] = [
  // ── verbs ──────────────────────────────────────────────────────────────
  {
    id: makeEgpId("C2", "verbs", "lexical-causatives-fine-shades"),
    cefr: "C2",
    category: "verbs",
    can_do: { en: "Can choose between causative verbs ('have', 'get', 'make', 'cause', 'lead to') to convey precise shades of agency and responsibility.", ru: "Умеет выбирать между каузативными глаголами ('have', 'get', 'make', 'cause', 'lead to'), передавая точные оттенки воли и ответственности." },
  },
  {
    id: makeEgpId("C2", "verbs", "delexical-verb-collocations"),
    cefr: "C2",
    category: "verbs",
    can_do: { en: "Can use delexical verb structures ('take a decision', 'have a go', 'give rise to') idiomatically for a more formal or nuanced register.", ru: "Умеет использовать делексикализованные глагольные обороты ('take a decision', 'have a go', 'give rise to') идиоматично для более формального или тонкого регистра." },
  },
  {
    id: makeEgpId("C2", "verbs", "verb-complementation-meaning-shifts"),
    cefr: "C2",
    category: "verbs",
    can_do: { en: "Can exploit meaning differences between gerund and infinitive complements ('stop to do' vs 'stop doing', 'remember to' vs 'remember -ing') with full control.", ru: "Умеет осознанно использовать смысловые различия между герундием и инфинитивом ('stop to do' и 'stop doing', 'remember to' и 'remember -ing')." },
  },
  {
    id: makeEgpId("C2", "verbs", "phrasal-verb-register-control"),
    cefr: "C2",
    category: "verbs",
    can_do: { en: "Can deploy multi-word and phrasal verbs (and their Latinate synonyms) selectively to control register across informal and formal contexts.", ru: "Умеет избирательно использовать фразовые глаголы и их латинизированные синонимы, управляя регистром в неформальных и формальных контекстах." },
  },
  {
    id: makeEgpId("C2", "verbs", "marked-light-verb-structures"),
    cefr: "C2",
    category: "verbs",
    can_do: { en: "Can use 'go and', 'come and', 'try and' and similar pseudo-coordinated verb chains naturally in spoken and informal writing.", ru: "Умеет естественно использовать псевдосочинённые цепочки 'go and', 'come and', 'try and' в речи и неформальном письме." },
  },

  // ── tenses-aspect ──────────────────────────────────────────────────────
  {
    id: makeEgpId("C2", "tenses-aspect", "aspect-for-stance-and-distance"),
    cefr: "C2",
    category: "tenses-aspect",
    can_do: { en: "Can switch between simple and continuous aspect to signal attitude, temporariness, or politeness ('I was hoping you might…') with subtlety.", ru: "Умеет переключаться между простым и продолженным видом, передавая отношение, временность или вежливость ('I was hoping you might…')." },
  },
  {
    id: makeEgpId("C2", "tenses-aspect", "narrative-tense-shifts-effect"),
    cefr: "C2",
    category: "tenses-aspect",
    can_do: { en: "Can shift between past and historic present, and use the past perfect, to layer time and create narrative effect in extended discourse.", ru: "Умеет переключаться между прошедшим и историческим настоящим и использовать past perfect, выстраивая временные пласты и нарративный эффект." },
  },
  {
    id: makeEgpId("C2", "tenses-aspect", "future-in-the-past-projection"),
    cefr: "C2",
    category: "tenses-aspect",
    can_do: { en: "Can use 'was going to', 'would', and 'was to' to project a future viewed from a past vantage point, including unrealised plans.", ru: "Умеет использовать 'was going to', 'would' и 'was to' для проекции будущего из прошлого, включая несбывшиеся планы." },
  },
  {
    id: makeEgpId("C2", "tenses-aspect", "perfect-aspect-for-evaluation"),
    cefr: "C2",
    category: "tenses-aspect",
    can_do: { en: "Can use present perfect and present perfect continuous to frame current relevance, evaluation, and cumulative experience in argumentative writing.", ru: "Умеет использовать present perfect и present perfect continuous для актуальности, оценки и накопленного опыта в аргументативном тексте." },
  },
  {
    id: makeEgpId("C2", "tenses-aspect", "stative-verbs-marked-continuous"),
    cefr: "C2",
    category: "tenses-aspect",
    can_do: { en: "Can use normally stative verbs in the continuous ('I'm loving it', 'You're being difficult') for deliberate emphasis or characterisation.", ru: "Умеет ставить обычно статичные глаголы в продолженное время ('I'm loving it', 'You're being difficult') для намеренного акцента или характеристики." },
  },

  // ── modality ───────────────────────────────────────────────────────────
  {
    id: makeEgpId("C2", "modality", "epistemic-modality-fine-gradation"),
    cefr: "C2",
    category: "modality",
    can_do: { en: "Can calibrate degrees of certainty precisely across 'must', 'will', 'should', 'may well', 'might conceivably' and lexical hedges.", ru: "Умеет точно градуировать степень уверенности через 'must', 'will', 'should', 'may well', 'might conceivably' и лексические смягчители." },
  },
  {
    id: makeEgpId("C2", "modality", "perfect-modals-retrospective-judgement"),
    cefr: "C2",
    category: "modality",
    can_do: { en: "Can use perfect modals ('needn't have', 'might have', 'ought to have', 'couldn't have') to make nuanced retrospective judgements and counterfactual inferences.", ru: "Умеет использовать перфектные модальные ('needn't have', 'might have', 'ought to have', 'couldn't have') для тонких ретроспективных оценок и контрфактических выводов." },
  },
  {
    id: makeEgpId("C2", "modality", "semi-modals-and-marginal-modals"),
    cefr: "C2",
    category: "modality",
    can_do: { en: "Can use marginal and semi-modal expressions ('had better', 'would rather', 'be bound to', 'dare not') idiomatically and in formal registers.", ru: "Умеет идиоматично и в формальном регистре использовать полумодальные обороты ('had better', 'would rather', 'be bound to', 'dare not')." },
  },
  {
    id: makeEgpId("C2", "modality", "modal-hedging-academic-register"),
    cefr: "C2",
    category: "modality",
    can_do: { en: "Can hedge claims with layered modal and adverbial devices ('it would appear that', 'one might argue') to manage commitment in academic writing.", ru: "Умеет смягчать утверждения наслоением модальных и наречных средств ('it would appear that', 'one might argue') для управления степенью обязательства в академическом письме." },
  },
  {
    id: makeEgpId("C2", "modality", "modal-attitude-and-irony"),
    cefr: "C2",
    category: "modality",
    can_do: { en: "Can exploit modals ('would', 'will', 'must') to convey characteristic behaviour, exasperation, or irony beyond their literal force.", ru: "Умеет использовать модальные ('would', 'will', 'must') для передачи характерного поведения, раздражения или иронии сверх буквального значения." },
  },

  // ── conditionals ───────────────────────────────────────────────────────
  {
    id: makeEgpId("C2", "conditionals", "mixed-time-conditionals"),
    cefr: "C2",
    category: "conditionals",
    can_do: { en: "Can construct mixed conditionals that combine different time frames in protasis and apodosis ('If I had left then, I'd be there now').", ru: "Умеет строить смешанные условные предложения, сочетающие разные временные планы в условии и следствии ('If I had left then, I'd be there now')." },
  },
  {
    id: makeEgpId("C2", "conditionals", "inverted-conditionals-formal"),
    cefr: "C2",
    category: "conditionals",
    can_do: { en: "Can use inversion to replace 'if' in formal conditionals ('Had I known', 'Were it not for', 'Should you require').", ru: "Умеет использовать инверсию вместо 'if' в формальных условных ('Had I known', 'Were it not for', 'Should you require')." },
  },
  {
    id: makeEgpId("C2", "conditionals", "alternative-conditional-conjunctions"),
    cefr: "C2",
    category: "conditionals",
    can_do: { en: "Can use a range of conditional links ('provided that', 'as long as', 'suppose', 'on condition that', 'but for') with precise meaning.", ru: "Умеет использовать разнообразные условные связки ('provided that', 'as long as', 'suppose', 'on condition that', 'but for') с точным значением." },
  },
  {
    id: makeEgpId("C2", "conditionals", "implied-and-elliptical-conditionals"),
    cefr: "C2",
    category: "conditionals",
    can_do: { en: "Can express conditionality implicitly through ellipsis, 'otherwise', 'if so/not', or non-finite clauses without an explicit 'if'-clause.", ru: "Умеет выражать условность неявно через эллипсис, 'otherwise', 'if so/not' или нефинитные обороты без явного 'if'." },
  },

  // ── passive ────────────────────────────────────────────────────────────
  {
    id: makeEgpId("C2", "passive", "reporting-passive-distancing"),
    cefr: "C2",
    category: "passive",
    can_do: { en: "Can use impersonal reporting passives ('It is widely held that…', 'He is thought to have…') to attribute claims and distance the writer.", ru: "Умеет использовать безличный пассив сообщения ('It is widely held that…', 'He is thought to have…') для приписывания утверждений и дистанцирования автора." },
  },
  {
    id: makeEgpId("C2", "passive", "passive-with-causative-and-modal"),
    cefr: "C2",
    category: "passive",
    can_do: { en: "Can combine passive voice with causatives and modals ('should have been dealt with', 'need to be addressed') in complex, formal constructions.", ru: "Умеет сочетать пассив с каузативами и модальными ('should have been dealt with', 'need to be addressed') в сложных формальных конструкциях." },
  },
  {
    id: makeEgpId("C2", "passive", "agentless-passive-for-focus"),
    cefr: "C2",
    category: "passive",
    can_do: { en: "Can choose the agentless passive deliberately to shift focus, manage information flow, and suppress responsibility where appropriate.", ru: "Умеет намеренно выбирать безагентный пассив, чтобы сместить фокус, управлять потоком информации и скрыть ответственность где уместно." },
  },
  {
    id: makeEgpId("C2", "passive", "get-passive-and-stative-passive"),
    cefr: "C2",
    category: "passive",
    can_do: { en: "Can distinguish dynamic 'get'-passives, 'be'-passives, and stative resultant states to signal change, affectedness, or condition.", ru: "Умеет различать динамический пассив с 'get', пассив с 'be' и результативно-статичные состояния для обозначения изменения, затронутости или состояния." },
  },

  // ── nouns-determiners ──────────────────────────────────────────────────
  {
    id: makeEgpId("C2", "nouns-determiners", "abstract-nominalisation-density"),
    cefr: "C2",
    category: "nouns-determiners",
    can_do: { en: "Can compress clauses into abstract nominalisations ('the implementation', 'a marked deterioration') to achieve dense, formal academic prose.", ru: "Умеет сворачивать придаточные в абстрактные номинализации ('the implementation', 'a marked deterioration') для плотного формального академического стиля." },
  },
  {
    id: makeEgpId("C2", "nouns-determiners", "article-use-with-abstractions"),
    cefr: "C2",
    category: "nouns-determiners",
    can_do: { en: "Can control article use with abstract, generic, and institutional nouns, including marked zero-article patterns ('in hospital', 'by train', 'man is mortal').", ru: "Умеет управлять артиклями при абстрактных, обобщённых и институциональных существительных, включая нулевой артикль ('in hospital', 'by train', 'man is mortal')." },
  },
  {
    id: makeEgpId("C2", "nouns-determiners", "complex-quantifier-scope"),
    cefr: "C2",
    category: "nouns-determiners",
    can_do: { en: "Can use subtle quantifiers and partitives ('a fraction of', 'all but', 'precious few', 'no small number') with accurate scope and connotation.", ru: "Умеет использовать тонкие квантификаторы и партитивы ('a fraction of', 'all but', 'precious few', 'no small number') с точным охватом и коннотацией." },
  },
  {
    id: makeEgpId("C2", "nouns-determiners", "premodified-noun-phrase-stacking"),
    cefr: "C2",
    category: "nouns-determiners",
    can_do: { en: "Can build heavily premodified noun phrases (compound and participial modifiers) typical of journalistic and technical writing.", ru: "Умеет строить сильно препозиционно-модифицированные именные группы (составные и причастные определения), характерные для публицистики и технического письма." },
  },

  // ── pronouns ───────────────────────────────────────────────────────────
  {
    id: makeEgpId("C2", "pronouns", "anaphora-across-discourse"),
    cefr: "C2",
    category: "pronouns",
    can_do: { en: "Can maintain clear reference chains across long stretches of text, managing potential ambiguity in pronoun and 'this/that' reference.", ru: "Умеет поддерживать ясные цепочки референции на длинных отрезках текста, снимая возможную двусмысленность местоимений и 'this/that'." },
  },
  {
    id: makeEgpId("C2", "pronouns", "emphatic-and-fronted-pronouns"),
    cefr: "C2",
    category: "pronouns",
    can_do: { en: "Can use emphatic reflexives and fronted pronoun structures ('myself, I would…', 'him, I trust') for contrast and emphasis.", ru: "Умеет использовать эмфатические возвратные и вынесенные местоимения ('myself, I would…', 'him, I trust') для контраста и акцента." },
  },
  {
    id: makeEgpId("C2", "pronouns", "indefinite-one-and-generic-reference"),
    cefr: "C2",
    category: "pronouns",
    can_do: { en: "Can use generic 'one', singular 'they', and impersonal structures appropriately to manage register and inclusivity.", ru: "Умеет уместно использовать обобщённое 'one', единственное 'they' и безличные конструкции, управляя регистром и инклюзивностью." },
  },

  // ── adjectives-adverbs ─────────────────────────────────────────────────
  {
    id: makeEgpId("C2", "adjectives-adverbs", "gradable-vs-ungradable-intensification"),
    cefr: "C2",
    category: "adjectives-adverbs",
    can_do: { en: "Can pair intensifiers correctly with gradable and non-gradable adjectives ('utterly impossible', 'absolutely vital', 'fairly difficult') and avoid collocational clashes.", ru: "Умеет правильно сочетать усилители с градуируемыми и неградуируемыми прилагательными ('utterly impossible', 'absolutely vital', 'fairly difficult'), избегая коллокационных ошибок." },
  },
  {
    id: makeEgpId("C2", "adjectives-adverbs", "adverb-position-for-scope-and-focus"),
    cefr: "C2",
    category: "adjectives-adverbs",
    can_do: { en: "Can position adverbs deliberately to control scope and focus ('only', 'even', 'particularly') and to mark comment vs manner.", ru: "Умеет намеренно располагать наречия для управления охватом и фокусом ('only', 'even', 'particularly') и для разграничения оценки и образа действия." },
  },
  {
    id: makeEgpId("C2", "adjectives-adverbs", "comment-and-viewpoint-adverbials"),
    cefr: "C2",
    category: "adjectives-adverbs",
    can_do: { en: "Can use stance and viewpoint adverbials ('admittedly', 'arguably', 'ostensibly', 'conceivably') to signal attitude precisely.", ru: "Умеет использовать оценочные и точечно-ограничивающие наречия ('admittedly', 'arguably', 'ostensibly', 'conceivably') для точной передачи отношения." },
  },
  {
    id: makeEgpId("C2", "adjectives-adverbs", "marked-comparative-structures"),
    cefr: "C2",
    category: "adjectives-adverbs",
    can_do: { en: "Can use complex and idiomatic comparison ('the more… the less', 'all the more', 'no less than', 'as good as') for rhetorical effect.", ru: "Умеет использовать сложные и идиоматичные сравнения ('the more… the less', 'all the more', 'no less than', 'as good as') для риторического эффекта." },
  },

  // ── prepositions ───────────────────────────────────────────────────────
  {
    id: makeEgpId("C2", "prepositions", "dependent-prepositions-precision"),
    cefr: "C2",
    category: "prepositions",
    can_do: { en: "Can choose dependent prepositions accurately in low-frequency and abstract collocations ('averse to', 'incumbent on', 'predicated on').", ru: "Умеет точно выбирать зависимые предлоги в редких и абстрактных коллокациях ('averse to', 'incumbent on', 'predicated on')." },
  },
  {
    id: makeEgpId("C2", "prepositions", "complex-and-formal-prepositions"),
    cefr: "C2",
    category: "prepositions",
    can_do: { en: "Can use complex prepositional phrases ('with a view to', 'in the wake of', 'notwithstanding', 'by virtue of') in formal writing.", ru: "Умеет использовать сложные предложные обороты ('with a view to', 'in the wake of', 'notwithstanding', 'by virtue of') в формальном письме." },
  },
  {
    id: makeEgpId("C2", "prepositions", "preposition-stranding-vs-pied-piping"),
    cefr: "C2",
    category: "prepositions",
    can_do: { en: "Can choose between preposition stranding and pied-piping ('the issue we spoke about' vs 'the issue about which we spoke') to match register.", ru: "Умеет выбирать между выносом предлога в конец и его перемещением с относительным словом ('the issue we spoke about' и 'the issue about which we spoke') в соответствии с регистром." },
  },

  // ── clauses ────────────────────────────────────────────────────────────
  {
    id: makeEgpId("C2", "clauses", "nested-subordination-control"),
    cefr: "C2",
    category: "clauses",
    can_do: { en: "Can build and parse multiply embedded subordinate clauses while keeping the main argument structure clear to the reader.", ru: "Умеет строить и разбирать многократно вложенные придаточные, сохраняя ясной основную структуру высказывания." },
  },
  {
    id: makeEgpId("C2", "clauses", "nonfinite-clauses-for-compression"),
    cefr: "C2",
    category: "clauses",
    can_do: { en: "Can use participle, gerund, and infinitive clauses to compress information and vary sentence rhythm in extended writing.", ru: "Умеет использовать причастные, герундийные и инфинитивные обороты для сжатия информации и варьирования ритма в развёрнутом тексте." },
  },
  {
    id: makeEgpId("C2", "clauses", "reduced-and-verbless-clauses"),
    cefr: "C2",
    category: "clauses",
    can_do: { en: "Can use reduced relative clauses and verbless clauses ('the report, once finalised, …', 'whatever the cause, …') for economy and formality.", ru: "Умеет использовать сокращённые относительные и безглагольные обороты ('the report, once finalised, …', 'whatever the cause, …') ради экономии и формальности." },
  },
  {
    id: makeEgpId("C2", "clauses", "fronted-and-nominal-relatives"),
    cefr: "C2",
    category: "clauses",
    can_do: { en: "Can use nominal relative and concessive clauses ('what matters is', 'whoever wrote this', 'much as I admire it') to structure argument.", ru: "Умеет использовать номинальные относительные и уступительные придаточные ('what matters is', 'whoever wrote this', 'much as I admire it') для построения аргумента." },
  },
  {
    id: makeEgpId("C2", "clauses", "subjunctive-and-mandative-clauses"),
    cefr: "C2",
    category: "clauses",
    can_do: { en: "Can use the mandative subjunctive and 'should' clauses after verbs of demand and suggestion ('insist that he be', 'recommend that it cease') in formal style.", ru: "Умеет использовать сослагательное наклонение и обороты со 'should' после глаголов требования и предложения ('insist that he be', 'recommend that it cease') в формальном стиле." },
  },

  // ── questions-negation ─────────────────────────────────────────────────
  {
    id: makeEgpId("C2", "questions-negation", "scope-of-negation-control"),
    cefr: "C2",
    category: "questions-negation",
    can_do: { en: "Can control the scope of negation, including transferred negation ('I don't think…') and the contrast between local and clausal negation.", ru: "Умеет управлять охватом отрицания, включая перенос отрицания ('I don't think…') и различие локального и клаузального отрицания." },
  },
  {
    id: makeEgpId("C2", "questions-negation", "negative-and-broad-scope-adverbials"),
    cefr: "C2",
    category: "questions-negation",
    can_do: { en: "Can use restrictive and additive negators ('hardly', 'scarcely', 'by no means', 'not least') with the right syntax and emphasis.", ru: "Умеет использовать ограничительные и присоединительные отрицатели ('hardly', 'scarcely', 'by no means', 'not least') с верным синтаксисом и акцентом." },
  },
  {
    id: makeEgpId("C2", "questions-negation", "rhetorical-and-echo-questions"),
    cefr: "C2",
    category: "questions-negation",
    can_do: { en: "Can use rhetorical, echo, and tag questions for persuasion, irony, and interactional effect rather than genuine information-seeking.", ru: "Умеет использовать риторические, эхо- и разделительные вопросы для убеждения, иронии и интерактивного эффекта, а не для получения информации." },
  },

  // ── discourse-cohesion ─────────────────────────────────────────────────
  {
    id: makeEgpId("C2", "discourse-cohesion", "wide-range-cohesive-devices"),
    cefr: "C2",
    category: "discourse-cohesion",
    can_do: { en: "Can deploy a wide and precise range of connectives and linking adverbials to signal logical relations smoothly across a whole text.", ru: "Умеет применять широкий и точный набор связок и соединительных наречий, плавно обозначая логические связи на протяжении всего текста." },
  },
  {
    id: makeEgpId("C2", "discourse-cohesion", "substitution-and-ellipsis-cohesion"),
    cefr: "C2",
    category: "discourse-cohesion",
    can_do: { en: "Can avoid repetition through substitution ('do so', 'the former', 'such') and ellipsis to keep text economical and cohesive.", ru: "Умеет избегать повторов через субституцию ('do so', 'the former', 'such') и эллипсис, делая текст экономным и связным." },
  },
  {
    id: makeEgpId("C2", "discourse-cohesion", "discourse-markers-spoken-control"),
    cefr: "C2",
    category: "discourse-cohesion",
    can_do: { en: "Can use spoken discourse markers ('mind you', 'as it were', 'that said', 'come to think of it') to manage turns, hedge, and qualify.", ru: "Умеет использовать разговорные дискурсивные маркеры ('mind you', 'as it were', 'that said', 'come to think of it') для управления репликами, смягчения и уточнения." },
  },
  {
    id: makeEgpId("C2", "discourse-cohesion", "information-packaging-given-new"),
    cefr: "C2",
    category: "discourse-cohesion",
    can_do: { en: "Can manage the given–new flow of information across sentences, using theme–rheme ordering to build a coherent argument.", ru: "Умеет управлять движением данного и нового от предложения к предложению, используя тема-рематический порядок для построения связного аргумента." },
  },

  // ── word-order ─────────────────────────────────────────────────────────
  {
    id: makeEgpId("C2", "word-order", "inversion-after-negative-adverbials"),
    cefr: "C2",
    category: "word-order",
    can_do: { en: "Can apply subject–operator inversion after fronted negative and restrictive adverbials ('Not only…', 'Seldom…', 'Under no circumstances…').", ru: "Умеет применять инверсию подлежащего и оператора после вынесенных отрицательных и ограничительных наречий ('Not only…', 'Seldom…', 'Under no circumstances…')." },
  },
  {
    id: makeEgpId("C2", "word-order", "cleft-and-pseudo-cleft-focus"),
    cefr: "C2",
    category: "word-order",
    can_do: { en: "Can use it-clefts and pseudo-clefts ('It was X that…', 'What I need is…') to foreground information and contrast.", ru: "Умеет использовать it-расщепление и псевдорасщепление ('It was X that…', 'What I need is…') для выдвижения информации и контраста." },
  },
  {
    id: makeEgpId("C2", "word-order", "fronting-and-thematisation"),
    cefr: "C2",
    category: "word-order",
    can_do: { en: "Can front objects, complements, and adjuncts ('This I cannot accept', 'So bizarre was the claim…') for thematic emphasis and cohesion.", ru: "Умеет выносить вперёд дополнения, предикативы и обстоятельства ('This I cannot accept', 'So bizarre was the claim…') для тематического акцента и связности." },
  },
  {
    id: makeEgpId("C2", "word-order", "end-weight-and-extraposition"),
    cefr: "C2",
    category: "word-order",
    can_do: { en: "Can use extraposition and the end-weight principle ('It is clear that…', heavy NP shift) to keep long elements at the end for readability.", ru: "Умеет использовать экстрапозицию и принцип конечного веса ('It is clear that…', сдвиг тяжёлой именной группы), оставляя длинные элементы в конце ради читаемости." },
  },
  {
    id: makeEgpId("C2", "word-order", "inversion-after-fronted-adjuncts"),
    cefr: "C2",
    category: "word-order",
    can_do: { en: "Can use full and subject–verb inversion after fronted place and direction adjuncts ('Down came the rain', 'In the corner stood a clock').", ru: "Умеет использовать полную инверсию подлежащего и глагола после вынесенных обстоятельств места и направления ('Down came the rain', 'In the corner stood a clock')." },
  },
];
