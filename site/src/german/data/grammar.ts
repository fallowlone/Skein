// site/src/german/data/grammar.ts
// Grammar-in-context micro-lessons (A1/A2/B1) with bilingual EN/RU scaffolding +
// cloze practice. Mirrors the English layer's GrammarPoint authoring pattern, but
// teaches the German case system, articles, word order, and separable verbs.
//
// The cloze checker compares answer + alts case-insensitively and trimmed, so we
// list every valid surface form in `alts` and state the canonical capitalization
// in the hint / explain (German nouns and sentence-initial words are capitalised).
import type { GrammarPoint } from "~/german/types";

export const germanGrammar: GrammarPoint[] = [
  {
    id: "grammar:gender-nominative-articles",
    band: "A1",
    domain: "general",
    title: {
      en: "der / die / das — grammatical gender and the nominative articles",
      ru: "der / die / das — грамматический род и артикли именительного падежа",
    },
    structure: {
      en: "der (masculine) · die (feminine) · das (neuter) · die (plural)  — definite, nominative",
      ru: "der (мужской) · die (женский) · das (средний) · die (множ.)  — определённый артикль, именительный падеж",
    },
    explain: {
      en: "Every German noun has a fixed grammatical gender, marked by its article rather than its meaning. In the nominative case (the subject of the sentence) the definite articles are der (m), die (f), das (n) and die (plural). The indefinite articles are ein (m/n) and eine (f). Learn each noun together with its article — der, die or das is part of the word.",
      ru: "У каждого немецкого существительного есть фиксированный грамматический род, который показывает артикль, а не значение слова. В именительном падеже (подлежащее) определённые артикли: der (м), die (ж), das (ср) и die (множ.). Неопределённые артикли — ein (м/ср) и eine (ж). Учите существительное сразу с артиклем — der, die или das является частью слова.",
    },
    examples: [
      {
        de: "Der Server ist online.",
        ru: "Сервер в сети.",
        note: { en: "der Server — masculine", ru: "der Server — мужской род" },
      },
      {
        de: "Die Datenbank speichert die Daten.",
        ru: "База данных хранит данные.",
        note: { en: "die Datenbank — feminine", ru: "die Datenbank — женский род" },
      },
      {
        de: "Das Programm läuft im Hintergrund.",
        ru: "Программа работает в фоне.",
        note: { en: "das Programm — neuter", ru: "das Programm — средний род" },
      },
    ],
    cloze: [
      {
        id: "grammar:gender-nominative-articles:1",
        before: "",
        after: "Datei ist groß.",
        answer: "Die",
        alts: ["die"],
        hint: { en: "die Datei is feminine — capitalised at the start of the sentence", ru: "die Datei — женского рода; в начале предложения пишется с большой буквы" },
        explain: {
          en: "'Datei' (file) is feminine, so the nominative definite article is 'die'. Sentence-initial → capital D.",
          ru: "'Datei' (файл) — женского рода, поэтому артикль именительного падежа — 'die'. В начале предложения — с заглавной D.",
        },
      },
      {
        id: "grammar:gender-nominative-articles:2",
        before: "",
        after: "Fehler ist kritisch.",
        answer: "Der",
        alts: ["der"],
        hint: { en: "der Fehler is masculine — capitalised at the start of the sentence", ru: "der Fehler — мужского рода; в начале предложения пишется с большой буквы" },
        explain: {
          en: "'Fehler' (error) is masculine → nominative article 'der'. Sentence-initial → capital D.",
          ru: "'Fehler' (ошибка) — мужского рода → артикль именительного падежа 'der'. В начале предложения — с заглавной D.",
        },
      },
    ],
    register: {
      en: "Gender is not optional or guessable from meaning — always memorise the article with the noun.",
      ru: "Род нельзя угадать по смыслу — всегда запоминайте артикль вместе со словом.",
    },
  },
  {
    id: "grammar:akkusativ-direct-object",
    band: "A2",
    domain: "general",
    title: {
      en: "Akkusativ — the direct object",
      ru: "Аккузатив (винительный падеж) — прямое дополнение",
    },
    structure: {
      en: "der → den · die → die · das → das · die (pl) → die  |  ein → einen (m), eine, ein",
      ru: "der → den · die → die · das → das · die (множ.) → die  |  ein → einen (м), eine, ein",
    },
    explain: {
      en: "The accusative marks the direct object — the thing the verb acts on. Only the masculine article changes form: der → den, ein → einen. Feminine, neuter and plural articles look identical to the nominative. Verbs like sehen, schreiben, haben, lesen, brauchen take an accusative object.",
      ru: "Винительный падеж (Akkusativ) обозначает прямое дополнение — то, на что направлено действие глагола. Меняется только артикль мужского рода: der → den, ein → einen. Женский, средний род и множественное число выглядят так же, как в именительном падеже. Глаголы sehen, schreiben, haben, lesen, brauchen требуют винительного падежа.",
    },
    examples: [
      {
        de: "Ich sehe den Server im Dashboard.",
        ru: "Я вижу сервер в дашборде.",
        note: { en: "der Server → den Server (masculine accusative)", ru: "der Server → den Server (винительный, мужской род)" },
      },
      {
        de: "Wir brauchen einen neuen Index.",
        ru: "Нам нужен новый индекс.",
        note: { en: "ein → einen (masculine accusative)", ru: "ein → einen (винительный, мужской род)" },
      },
      {
        de: "Sie liest die Dokumentation.",
        ru: "Она читает документацию.",
        note: { en: "feminine 'die' is unchanged in the accusative", ru: "женский род 'die' в винительном не меняется" },
      },
    ],
    cloze: [
      {
        id: "grammar:akkusativ-direct-object:1",
        before: "Ich sehe",
        after: "Fehler im Log.",
        answer: "den",
        hint: { en: "masculine direct object: der Fehler → den Fehler", ru: "прямое дополнение мужского рода: der Fehler → den Fehler" },
        explain: {
          en: "'Fehler' is masculine and is the object of 'sehen', so der → den.",
          ru: "'Fehler' — мужского рода и является дополнением глагола 'sehen', поэтому der → den.",
        },
      },
      {
        id: "grammar:akkusativ-direct-object:2",
        before: "Wir schreiben",
        after: "Test für die neue Funktion.",
        answer: "einen",
        hint: { en: "indefinite masculine accusative: ein → einen", ru: "неопределённый артикль мужского рода в винительном: ein → einen" },
        explain: {
          en: "'Test' is masculine (der Test); as an indefinite direct object ein → einen.",
          ru: "'Test' — мужского рода (der Test); как неопределённое прямое дополнение ein → einen.",
        },
      },
    ],
  },
  {
    id: "grammar:dativ-indirect-object",
    band: "B1",
    domain: "general",
    title: {
      en: "Dativ — the indirect object",
      ru: "Датив (дательный падеж) — косвенное дополнение",
    },
    structure: {
      en: "der → dem · die → der · das → dem · die (pl) → den + noun ends in -n",
      ru: "der → dem · die → der · das → dem · die (множ.) → den + существительное получает -n",
    },
    explain: {
      en: "The dative marks the indirect object — usually the recipient (to/for whom). Articles change: der/das → dem, die → der, and the plural die → den with an -n added to the noun (den Kollegen, den Servern). Verbs like geben, helfen, danken, antworten and many prepositions (mit, aus, nach, bei, zu, von) govern the dative.",
      ru: "Дательный падеж (Dativ) обозначает косвенное дополнение — обычно адресата (кому/для кого). Артикли меняются: der/das → dem, die → der, а множественное число die → den с добавлением -n к существительному (den Kollegen, den Servern). Глаголы geben, helfen, danken, antworten и многие предлоги (mit, aus, nach, bei, zu, von) управляют дательным падежом.",
    },
    examples: [
      {
        de: "Ich gebe dem Kollegen das Buch.",
        ru: "Я даю коллеге книгу.",
        note: { en: "der Kollege → dem Kollegen (masc. dative, weak -n)", ru: "der Kollege → dem Kollegen (дательный, мужской род, -n)" },
      },
      {
        de: "Sie hilft der Entwicklerin beim Deployment.",
        ru: "Она помогает разработчице с деплоем.",
        note: { en: "die Entwicklerin → der Entwicklerin (feminine dative)", ru: "die Entwicklerin → der Entwicklerin (дательный, женский род)" },
      },
      {
        de: "Wir antworten den Nutzern schnell.",
        ru: "Мы быстро отвечаем пользователям.",
        note: { en: "plural dative: die Nutzer → den Nutzern (+n)", ru: "дательный множественного: die Nutzer → den Nutzern (+n)" },
      },
    ],
    cloze: [
      {
        id: "grammar:dativ-indirect-object:1",
        before: "Ich gebe",
        after: "Kollegen das Buch.",
        answer: "dem",
        hint: { en: "masculine recipient (indirect object): der → dem", ru: "адресат мужского рода (косвенное дополнение): der → dem" },
        explain: {
          en: "'Kollege' is the recipient of 'geben', so it stands in the dative: der → dem.",
          ru: "'Kollege' — адресат глагола 'geben', поэтому стоит в дательном падеже: der → dem.",
        },
      },
      {
        id: "grammar:dativ-indirect-object:2",
        before: "Sie hilft",
        after: "Entwicklerin bei dem Problem.",
        answer: "der",
        hint: { en: "'helfen' takes the dative; feminine die → der", ru: "'helfen' требует дательного; женский род die → der" },
        explain: {
          en: "'Helfen' always governs the dative. 'Entwicklerin' is feminine, so die → der.",
          ru: "'Helfen' всегда управляет дательным падежом. 'Entwicklerin' — женского рода, поэтому die → der.",
        },
      },
    ],
    register: {
      en: "Distinguish accusative (direct object — what) from dative (indirect object — to/for whom). Many give-type verbs take both: subject + dative + accusative.",
      ru: "Различайте винительный (прямое дополнение — что) и дательный (косвенное — кому/для кого). Глаголы передачи берут оба: подлежащее + датив + аккузатив.",
    },
  },
  {
    id: "grammar:wortstellung-v2",
    band: "A2",
    domain: "general",
    title: {
      en: "Wortstellung: V2 — finite verb in second position",
      ru: "Порядок слов: V2 — спрягаемый глагол на втором месте",
    },
    structure: {
      en: "[position 1: any one element] + [position 2: finite verb] + [subject if not in pos. 1] + rest",
      ru: "[позиция 1: любой один элемент] + [позиция 2: спрягаемый глагол] + [подлежащее, если не в поз. 1] + остальное",
    },
    explain: {
      en: "In a German main clause the finite (conjugated) verb is always the second element. Position 1 can be the subject, a time expression, an object or an adverbial — but whatever you put there, the verb stays in slot two and the subject moves right after it. This is the V2 rule. When you front something like 'Morgen' (tomorrow), the verb still comes second, so the subject follows the verb: Morgen schreibe ich …",
      ru: "В немецком главном предложении спрягаемый глагол всегда стоит на втором месте. На первой позиции может быть подлежащее, обстоятельство времени, дополнение или другое обстоятельство — но что бы вы туда ни поставили, глагол остаётся на второй позиции, а подлежащее идёт сразу после него. Это правило V2. Если вынести вперёд, например, 'Morgen' (завтра), глагол всё равно стоит вторым, поэтому подлежащее следует за глаголом: Morgen schreibe ich …",
    },
    examples: [
      {
        de: "Ich schreibe heute den Code.",
        ru: "Я сегодня пишу код.",
        note: { en: "subject first, verb second", ru: "подлежащее первым, глагол вторым" },
      },
      {
        de: "Heute schreibe ich den Code.",
        ru: "Сегодня я пишу код.",
        note: { en: "time first → verb still second, subject follows it", ru: "обстоятельство первым → глагол всё равно вторым, подлежащее после него" },
      },
    ],
    cloze: [
      {
        id: "grammar:wortstellung-v2:1",
        before: "Morgen",
        after: "ich den Code.",
        answer: "schreibe",
        hint: { en: "after the fronted 'Morgen', the finite verb takes position 2 (before the subject)", ru: "после вынесенного вперёд 'Morgen' спрягаемый глагол стоит на 2-й позиции (перед подлежащим)" },
        explain: {
          en: "'Morgen' occupies position 1, so the conjugated verb 'schreibe' must be the second element, with the subject 'ich' after it.",
          ru: "'Morgen' занимает первую позицию, поэтому спрягаемый глагол 'schreibe' должен быть вторым элементом, а подлежащее 'ich' — после него.",
        },
      },
      {
        id: "grammar:wortstellung-v2:2",
        before: "Im Produktionssystem",
        after: "der Bug nur selten auf.",
        answer: "tritt",
        hint: { en: "fronted place phrase → finite verb 'tritt' in position 2", ru: "вынесенное обстоятельство места → спрягаемый глагол 'tritt' на 2-й позиции" },
        explain: {
          en: "The adverbial 'Im Produktionssystem' fills slot 1, so the finite verb 'tritt' (from auftreten, here the main verb) comes second.",
          ru: "Обстоятельство 'Im Produktionssystem' занимает первую позицию, поэтому спрягаемый глагол 'tritt' (от auftreten) идёт вторым.",
        },
      },
    ],
    register: {
      en: "V2 applies only to main clauses. Yes/no questions and imperatives put the verb first (V1); subordinate clauses send it to the end.",
      ru: "Правило V2 действует только в главных предложениях. Общие вопросы и повелительное наклонение ставят глагол первым (V1); придаточные отправляют его в конец.",
    },
  },
  {
    id: "grammar:nebensatz-verb-final",
    band: "B1",
    domain: "general",
    title: {
      en: "Nebensatz: verb-final — subordinate clause word order",
      ru: "Придаточное предложение: глагол в конце",
    },
    structure: {
      en: "…, [conjunction: dass / weil / wenn / ob / obwohl] + subject + … + [finite verb at the end].",
      ru: "…, [союз: dass / weil / wenn / ob / obwohl] + подлежащее + … + [спрягаемый глагол в конце].",
    },
    explain: {
      en: "A subordinate clause introduced by a conjunction such as dass, weil, wenn, ob or obwohl pushes the finite verb to the very end of the clause. Everything else comes first, the conjugated verb closes the clause, and the main and subordinate clauses are separated by a comma. This verb-final pattern is one of the biggest differences from English and Russian word order.",
      ru: "Придаточное предложение, вводимое союзом dass, weil, wenn, ob или obwohl, отправляет спрягаемый глагол в самый конец предложения. Всё остальное идёт сначала, спрягаемый глагол закрывает придаточное, а главное и придаточное разделяются запятой. Эта рамка с глаголом в конце — одно из главных отличий от английского и русского порядка слов.",
    },
    examples: [
      {
        de: "Ich glaube, dass wir den Bug morgen beheben.",
        ru: "Я думаю, что мы починим баг завтра.",
        note: { en: "'dass' → finite verb 'beheben' goes to the end", ru: "'dass' → спрягаемый глагол 'beheben' уходит в конец" },
      },
      {
        de: "Der Test schlägt fehl, weil die Konfiguration falsch ist.",
        ru: "Тест падает, потому что конфигурация неправильная.",
        note: { en: "'weil' → 'ist' moves to the clause end", ru: "'weil' → 'ist' уходит в конец придаточного" },
      },
    ],
    cloze: [
      {
        id: "grammar:nebensatz-verb-final:1",
        before: "Ich glaube, dass wir den Bug morgen",
        after: ".",
        answer: "beheben",
        hint: { en: "after 'dass' the finite verb goes to the very end of the clause", ru: "после 'dass' спрягаемый глагол уходит в самый конец придаточного" },
        explain: {
          en: "The conjunction 'dass' makes this a subordinate clause, so the finite verb 'beheben' stands at the end.",
          ru: "Союз 'dass' делает это придаточным предложением, поэтому спрягаемый глагол 'beheben' стоит в конце.",
        },
      },
      {
        id: "grammar:nebensatz-verb-final:2",
        before: "Wir deployen nicht, weil die Tests noch nicht fertig",
        after: ".",
        answer: "sind",
        hint: { en: "'weil' clause → the verb 'sind' closes the clause", ru: "придаточное с 'weil' → глагол 'sind' закрывает предложение" },
        explain: {
          en: "'Weil' introduces a subordinate clause, so the finite verb 'sind' moves to the final position.",
          ru: "'Weil' вводит придаточное, поэтому спрягаемый глагол 'sind' уходит в конечную позицию.",
        },
      },
    ],
    register: {
      en: "Contrast with V2 main clauses: in 'Ich beheben den Bug' the verb is second, but inside 'dass ich den Bug behebe' it is last.",
      ru: "Сравните с главным V2: в 'Ich behebe den Bug' глагол второй, но в 'dass ich den Bug behebe' — последний.",
    },
  },
  {
    id: "grammar:trennbare-verben",
    band: "A2",
    domain: "general",
    title: {
      en: "Trennbare Verben — separable verbs",
      ru: "Trennbare Verben — глаголы с отделяемой приставкой",
    },
    structure: {
      en: "Main clause: [conjugated stem in position 2] … [separable prefix at the clause end]. Infinitive/subordinate clause: prefix + stem stay joined.",
      ru: "Главное предложение: [спрягаемая основа на 2-й позиции] … [отделяемая приставка в конце]. В инфинитиве/придаточном: приставка + основа остаются вместе.",
    },
    explain: {
      en: "Many German verbs have a stressed separable prefix (an-, auf-, bereit-, ein-, mit-, zurück-). In a main clause the conjugated stem stays in position 2 and the prefix jumps to the very end of the clause — sometimes several words later. The dictionary form rejoins them: bereitstellen, einrichten, anrufen. So 'bereitstellen' (to provide/deploy) splits into 'stellen … bereit'. In a subordinate clause or an infinitive the verb stays whole.",
      ru: "У многих немецких глаголов есть ударная отделяемая приставка (an-, auf-, bereit-, ein-, mit-, zurück-). В главном предложении спрягаемая основа стоит на 2-й позиции, а приставка перепрыгивает в самый конец предложения — иногда через несколько слов. В словарной форме они снова вместе: bereitstellen, einrichten, anrufen. Так 'bereitstellen' (предоставить/развернуть) распадается на 'stellen … bereit'. В придаточном или инфинитиве глагол остаётся целым.",
    },
    examples: [
      {
        de: "Wir stellen den Service morgen bereit.",
        ru: "Мы развернём (предоставим) сервис завтра.",
        note: { en: "bereitstellen → stem 'stellen' in pos. 2, prefix 'bereit' at the end", ru: "bereitstellen → основа 'stellen' на 2-й позиции, приставка 'bereit' в конце" },
      },
      {
        de: "Bitte richte die Pipeline neu ein.",
        ru: "Пожалуйста, настрой пайплайн заново.",
        note: { en: "einrichten → 'richte … ein' (prefix 'ein' at the end)", ru: "einrichten → 'richte … ein' (приставка 'ein' в конце)" },
      },
      {
        de: "Ich weiß, dass wir den Service morgen bereitstellen.",
        ru: "Я знаю, что мы развернём сервис завтра.",
        note: { en: "subordinate clause → verb stays joined: 'bereitstellen'", ru: "придаточное → глагол остаётся целым: 'bereitstellen'" },
      },
    ],
    cloze: [
      {
        id: "grammar:trennbare-verben:1",
        before: "Wir",
        after: "den Service morgen bereit.",
        answer: "stellen",
        hint: { en: "separable verb bereitstellen: conjugated stem 'stellen' in position 2 (prefix 'bereit' is already at the end)", ru: "отделяемый глагол bereitstellen: спрягаемая основа 'stellen' на 2-й позиции (приставка 'bereit' уже в конце)" },
        explain: {
          en: "In a main clause 'bereitstellen' splits: the stem 'stellen' takes the V2 slot and the prefix 'bereit' sits at the clause end.",
          ru: "В главном предложении 'bereitstellen' распадается: основа 'stellen' занимает позицию V2, а приставка 'bereit' стоит в конце предложения.",
        },
      },
      {
        id: "grammar:trennbare-verben:2",
        before: "Wir stellen den Service morgen",
        after: ".",
        answer: "bereit",
        hint: { en: "the separable prefix 'bereit' lands at the very end of the main clause", ru: "отделяемая приставка 'bereit' оказывается в самом конце главного предложения" },
        explain: {
          en: "The other half of the split verb: the prefix 'bereit' closes the clause, completing 'stellen … bereit' = bereitstellen.",
          ru: "Вторая половина разделённого глагола: приставка 'bereit' закрывает предложение, образуя 'stellen … bereit' = bereitstellen.",
        },
      },
      {
        id: "grammar:trennbare-verben:3",
        before: "Der Admin",
        after: "den neuen Nutzer ein.",
        answer: "richtet",
        hint: { en: "einrichten splits: stem 'richtet' in position 2, prefix 'ein' already at the end", ru: "einrichten распадается: основа 'richtet' на 2-й позиции, приставка 'ein' уже в конце" },
        explain: {
          en: "'Einrichten' (to set up) splits in a main clause: 'richtet' takes the V2 slot, 'ein' goes to the end.",
          ru: "'Einrichten' (настраивать) распадается в главном предложении: 'richtet' занимает позицию V2, 'ein' уходит в конец.",
        },
      },
    ],
    register: {
      en: "The stress is on the prefix (BEREITstellen) — that audible stress is the cue that the verb is separable. Inseparable prefixes (be-, ver-, ent-, ge-) never split and are unstressed.",
      ru: "Ударение падает на приставку (BEREITstellen) — это ударение и есть признак отделяемого глагола. Неотделяемые приставки (be-, ver-, ent-, ge-) никогда не отделяются и безударны.",
    },
  },
];
