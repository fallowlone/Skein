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
      en: "Contrast with V2 main clauses: in 'Ich behebe den Bug' the verb is second, but inside 'dass ich den Bug behebe' it is last.",
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
  {
    id: "grammar:perfekt-haben-sein",
    band: "A2",
    domain: "general",
    title: {
      en: "Perfekt — haben vs. sein + Partizip II",
      ru: "Перфект — haben или sein + Partizip II (причастие II)",
    },
    structure: {
      en: "[haben / sein conjugated in position 2] … [Partizip II at the clause end]  |  sein for motion/change of state, haben for the rest",
      ru: "[haben / sein, спрягается на 2-й позиции] … [Partizip II в конце предложения]  |  sein — для движения/смены состояния, haben — для остального",
    },
    explain: {
      en: "The Perfekt is the everyday past tense in spoken German. It needs an auxiliary in position 2 (haben or sein) and the Partizip II at the very end. Most verbs take haben. You use sein when the verb expresses motion from A to B (gehen → ist gegangen, kommen → ist gekommen, fahren → ist gefahren) or a change of state (werden → ist geworden, passieren → ist passiert), plus the fixed exceptions bleiben (ist geblieben) and sein itself (ist gewesen). The Partizip II of weak verbs is ge-…-t (machen → gemacht), of strong verbs often ge-…-en with a vowel change (gehen → gegangen, beheben → behoben). Verbs ending in -ieren and modern loanwords drop the ge- (deployen → deployt; the German equivalent bereitstellen → bereitgestellt keeps ge- inside).",
      ru: "Перфект — это основное прошедшее время в разговорном немецком. Нужен вспомогательный глагол на 2-й позиции (haben или sein) и Partizip II в самом конце. Большинство глаголов используют haben. Sein употребляется, когда глагол выражает движение из точки A в B (gehen → ist gegangen, kommen → ist gekommen, fahren → ist gefahren) или смену состояния (werden → ist geworden, passieren → ist passiert), плюс устойчивые исключения bleiben (ist geblieben) и сам sein (ist gewesen). Partizip II слабых глаголов — ge-…-t (machen → gemacht), сильных — часто ge-…-en со сменой гласной (gehen → gegangen, beheben → behoben). Глаголы на -ieren и современные заимствования теряют ge- (deployen → deployt; немецкий эквивалент bereitstellen → bereitgestellt сохраняет ge- внутри).",
    },
    examples: [
      {
        de: "Ich habe den Bug behoben.",
        ru: "Я починил баг.",
        note: { en: "beheben → haben + behoben (transitive, no motion → haben)", ru: "beheben → haben + behoben (переходный, без движения → haben)" },
      },
      {
        de: "Wir haben den Service gestern deployt.",
        ru: "Мы вчера задеплоили сервис.",
        note: { en: "deployen → haben + deployt (loanword, no ge-)", ru: "deployen → haben + deployt (заимствование, без ge-)" },
      },
      {
        de: "Der Server ist um drei Uhr ausgefallen.",
        ru: "Сервер упал в три часа.",
        note: { en: "ausfallen = change of state → sein + ausgefallen", ru: "ausfallen = смена состояния → sein + ausgefallen" },
      },
      {
        de: "Sie ist zur Konferenz gefahren.",
        ru: "Она поехала на конференцию.",
        note: { en: "fahren = motion A→B → sein + gefahren", ru: "fahren = движение из A в B → sein + gefahren" },
      },
    ],
    cloze: [
      {
        id: "grammar:perfekt-haben-sein:1",
        before: "Ich",
        after: "den Bug behoben.",
        answer: "habe",
        hint: { en: "beheben takes haben (no motion); 1st person singular = habe", ru: "beheben требует haben (без движения); 1-е лицо ед. ч. = habe" },
        explain: {
          en: "'Beheben' is a transitive verb with no motion or change of state, so it forms the Perfekt with haben → 'ich habe … behoben'.",
          ru: "'Beheben' — переходный глагол без движения и смены состояния, поэтому образует перфект с haben → 'ich habe … behoben'.",
        },
      },
      {
        id: "grammar:perfekt-haben-sein:2",
        before: "Der Prozess",
        after: "abgestürzt.",
        answer: "ist",
        hint: { en: "abstürzen = change of state → sein; 3rd person singular = ist", ru: "abstürzen = смена состояния → sein; 3-е лицо ед. ч. = ist" },
        explain: {
          en: "'Abstürzen' (to crash) is a change of state, so the auxiliary is sein → 'der Prozess ist abgestürzt'.",
          ru: "'Abstürzen' (рухнуть) — смена состояния, поэтому вспомогательный глагол sein → 'der Prozess ist abgestürzt'.",
        },
      },
      {
        id: "grammar:perfekt-haben-sein:3",
        before: "Wir haben den Service gestern",
        after: ".",
        answer: "deployt",
        alts: ["bereitgestellt"],
        hint: { en: "Partizip II of deployen = deployt (loanword, no ge-); native bereitstellen → bereitgestellt", ru: "Partizip II от deployen = deployt (заимствование, без ge-); родное bereitstellen → bereitgestellt" },
        explain: {
          en: "Loanwords ending in a stressed syllable like 'deployen' take no ge- prefix: Partizip II = 'deployt'. The German verb 'bereitstellen' would give 'bereitgestellt'.",
          ru: "Заимствования вроде 'deployen' не получают приставку ge-: Partizip II = 'deployt'. Немецкий глагол 'bereitstellen' дал бы 'bereitgestellt'.",
        },
      },
    ],
    register: {
      en: "In spoken German the Perfekt covers almost all past situations; the Präteritum is mostly written/narrative (except war, hatte, the modals).",
      ru: "В разговорном немецком перфект покрывает почти все прошедшие ситуации; претеритум — в основном письменный/повествовательный (кроме war, hatte и модальных).",
    },
  },
  {
    id: "grammar:modalverben",
    band: "A2",
    domain: "general",
    title: {
      en: "Modalverben — modal verbs and the clause-final infinitive",
      ru: "Модальные глаголы (Modalverben) и инфинитив в конце предложения",
    },
    structure: {
      en: "[modal conjugated in position 2] … [main verb as a bare infinitive at the clause end]",
      ru: "[модальный глагол, спрягается на 2-й позиции] … [основной глагол в форме инфинитива в конце предложения]",
    },
    explain: {
      en: "The six modal verbs are können (can/be able to), müssen (must/have to), dürfen (be allowed to), sollen (should/be supposed to), wollen (want to) and mögen — with its polite subjunctive form möchten (would like). The modal is the finite verb: it takes the V2 slot and is conjugated; the main verb drops to the very end of the clause as a bare infinitive (no zu). Note the irregular singular stems: ich kann, ich muss, ich darf, ich will, ich mag / ich möchte (sollen is regular: ich soll). So 'I have to fix the bug' = 'Ich muss den Bug beheben'.",
      ru: "Шесть модальных глаголов: können (мочь/уметь), müssen (быть должным), dürfen (иметь разрешение), sollen (следует/должен по чьему-то указанию), wollen (хотеть) и mögen — с вежливой формой сослагательного möchten (хотел бы). Модальный глагол является спрягаемым: он занимает позицию V2 и спрягается; основной глагол уходит в самый конец предложения в форме инфинитива (без zu). Обратите внимание на неправильные основы ед. ч.: ich kann, ich muss, ich darf, ich will, ich mag / ich möchte (sollen правильный: ich soll). Так 'I have to fix the bug' = 'Ich muss den Bug beheben'.",
    },
    examples: [
      {
        de: "Ich muss den Bug heute beheben.",
        ru: "Я должен сегодня починить баг.",
        note: { en: "müssen in pos. 2 (ich muss), infinitive 'beheben' at the end", ru: "müssen на 2-й позиции (ich muss), инфинитив 'beheben' в конце" },
      },
      {
        de: "Wir können den Service nicht deployen.",
        ru: "Мы не можем задеплоить сервис.",
        note: { en: "können (wir können), bare infinitive 'deployen' at the clause end", ru: "können (wir können), инфинитив 'deployen' в конце предложения" },
      },
      {
        de: "Du darfst die Produktionsdatenbank nicht löschen.",
        ru: "Тебе нельзя удалять боевую базу данных.",
        note: { en: "dürfen (du darfst) for permission; 'löschen' at the end", ru: "dürfen (du darfst) для разрешения; 'löschen' в конце" },
      },
    ],
    cloze: [
      {
        id: "grammar:modalverben:1",
        before: "Ich",
        after: "den Bug heute beheben.",
        answer: "muss",
        hint: { en: "obligation, 1st person singular of müssen = muss (irregular, no umlaut)", ru: "обязанность, 1-е лицо ед. ч. от müssen = muss (неправильная форма, без умлаута)" },
        explain: {
          en: "müssen expresses obligation; its 1st-person singular drops the umlaut → 'ich muss'. The main verb 'beheben' stays at the end as an infinitive.",
          ru: "müssen выражает обязанность; в 1-м лице ед. ч. теряет умлаут → 'ich muss'. Основной глагол 'beheben' остаётся в конце как инфинитив.",
        },
      },
      {
        id: "grammar:modalverben:2",
        before: "Wir können den Service noch nicht",
        after: ".",
        answer: "deployen",
        hint: { en: "after the modal können, the main verb is a bare infinitive at the clause end", ru: "после модального können основной глагол стоит в конце как чистый инфинитив" },
        explain: {
          en: "The modal 'können' is already conjugated in position 2, so the main verb appears as the bare infinitive 'deployen' at the very end.",
          ru: "Модальный 'können' уже спрягается на 2-й позиции, поэтому основной глагол стоит в форме чистого инфинитива 'deployen' в самом конце.",
        },
      },
      {
        id: "grammar:modalverben:3",
        before: "Ich",
        after: "den Code lieber morgen reviewen.",
        answer: "möchte",
        alts: ["will"],
        hint: { en: "polite 'would like' = möchte (möchten); plain 'want' = will (wollen). 1st person singular.", ru: "вежливое 'хотел бы' = möchte (möchten); простое 'хочу' = will (wollen). 1-е лицо ед. ч." },
        explain: {
          en: "'möchte' is the polite subjunctive of mögen (would like); 'will' is the plain present of wollen (want). Both are 1st-person singular and leave the infinitive 'reviewen' at the end.",
          ru: "'möchte' — вежливая форма сослагательного от mögen (хотел бы); 'will' — простое настоящее от wollen (хочу). Обе формы 1-го лица ед. ч. и оставляют инфинитив 'reviewen' в конце.",
        },
      },
    ],
    register: {
      en: "möchten is the polite, situational 'would like'; ich will is blunter and can sound demanding. Use möchten with requests and orders.",
      ru: "möchten — вежливое, ситуативное 'хотел бы'; ich will звучит резче и может казаться требовательным. С просьбами и заказами используйте möchten.",
    },
  },
  {
    id: "grammar:adjektivendungen",
    band: "B1",
    domain: "general",
    title: {
      en: "Adjektivendungen — adjective endings (weak & mixed declension)",
      ru: "Окончания прилагательных (слабое и смешанное склонение)",
    },
    structure: {
      en: "After der/die/das (weak): -e or -en.  After ein/eine (mixed): -er (nom m), -es (nom/akk n), -e (nom/akk f), -en elsewhere.",
      ru: "После der/die/das (слабое): -e или -en.  После ein/eine (смешанное): -er (им. м. р.), -es (им./вин. ср. р.), -e (им./вин. ж. р.), -en в остальных случаях.",
    },
    explain: {
      en: "An attributive adjective (one standing before a noun) takes an ending that depends on the article, gender and case. Two patterns dominate. WEAK (after a definite article der/die/das, which already shows the case): the adjective is -e in the nominative singular and in the feminine/neuter accusative, and -en everywhere else — der neue Server, die neue Funktion, das neue Feature (nom), but den neuen Server (akk m), dem neuen Server (dat m), with den neuen Servern (dat pl). MIXED (after the indefinite ein/eine/kein/mein, which does not always mark gender): the adjective must carry the missing signal — ein neuer Server (nom m, -er), ein neues Feature (nom/akk n, -es), eine neue Funktion (nom/akk f, -e), but einen neuen Server (akk m), einem neuen Server (dat m) → -en. Rule of thumb: in the masculine accusative and in every dative/plural the ending is -en.",
      ru: "Атрибутивное прилагательное (стоящее перед существительным) получает окончание в зависимости от артикля, рода и падежа. Господствуют две схемы. СЛАБОЕ (после определённого артикля der/die/das, который уже показывает падеж): прилагательное имеет -e в им. п. ед. ч. и в вин. п. жен./ср. рода, и -en во всех остальных случаях — der neue Server, die neue Funktion, das neue Feature (им. п.), но den neuen Server (вин. п. м. р.), dem neuen Server (дат. п. м. р.), den neuen Servern (дат. п. мн. ч.). СМЕШАННОЕ (после неопределённого ein/eine/kein/mein, который не всегда показывает род): прилагательное должно нести недостающий сигнал — ein neuer Server (им. п. м. р., -er), ein neues Feature (им./вин. п. ср. р., -es), eine neue Funktion (им./вин. п. ж. р., -e), но einen neuen Server (вин. п. м. р.), einem neuen Server (дат. п. м. р.) → -en. Правило: в вин. п. муж. рода и во всех дат. п./мн. ч. окончание -en.",
    },
    examples: [
      {
        de: "Der neue Server läuft stabil.",
        ru: "Новый сервер работает стабильно.",
        note: { en: "weak, nom m: der + neue (-e)", ru: "слабое, им. п. м. р.: der + neue (-e)" },
      },
      {
        de: "Wir konfigurieren den neuen Server.",
        ru: "Мы настраиваем новый сервер.",
        note: { en: "weak, akk m: den + neuen (-en)", ru: "слабое, вин. п. м. р.: den + neuen (-en)" },
      },
      {
        de: "Das ist ein neuer Server.",
        ru: "Это новый сервер.",
        note: { en: "mixed, nom m: ein + neuer (-er carries the masculine signal)", ru: "смешанное, им. п. м. р.: ein + neuer (-er несёт сигнал муж. рода)" },
      },
      {
        de: "Wir liefern ein neues Feature aus.",
        ru: "Мы выкатываем новую фичу (новый функционал).",
        note: { en: "mixed, akk n: ein + neues (-es)", ru: "смешанное, вин. п. ср. р.: ein + neues (-es)" },
      },
      {
        de: "Sie arbeitet mit einem neuen Server.",
        ru: "Она работает с новым сервером.",
        note: { en: "dat m after mit: einem + neuen (-en)", ru: "дат. п. м. р. после mit: einem + neuen (-en)" },
      },
    ],
    cloze: [
      {
        id: "grammar:adjektivendungen:1",
        before: "Der",
        after: "Server läuft stabil.",
        answer: "neue",
        hint: { en: "weak nominative masculine after 'der' → -e", ru: "слабое склонение, им. п. м. р. после 'der' → -e" },
        explain: {
          en: "After the definite article 'der' in the nominative masculine, the adjective takes the weak ending -e → 'der neue Server'.",
          ru: "После определённого артикля 'der' в им. п. м. р. прилагательное получает слабое окончание -e → 'der neue Server'.",
        },
      },
      {
        id: "grammar:adjektivendungen:2",
        before: "Wir konfigurieren den",
        after: "Server.",
        answer: "neuen",
        hint: { en: "weak accusative masculine after 'den' → -en", ru: "слабое склонение, вин. п. м. р. после 'den' → -en" },
        explain: {
          en: "In the masculine accusative ('den') the weak ending is always -en → 'den neuen Server'.",
          ru: "В вин. п. м. р. ('den') слабое окончание всегда -en → 'den neuen Server'.",
        },
      },
      {
        id: "grammar:adjektivendungen:3",
        before: "Das ist ein",
        after: "Server.",
        answer: "neuer",
        hint: { en: "mixed nominative masculine after 'ein' → -er (ein shows no gender, so the adjective must)", ru: "смешанное склонение, им. п. м. р. после 'ein' → -er (ein не показывает род, поэтому это делает прилагательное)" },
        explain: {
          en: "'ein' gives no gender ending, so the adjective carries it: nominative masculine → -er → 'ein neuer Server'.",
          ru: "'ein' не даёт окончания рода, поэтому его несёт прилагательное: им. п. м. р. → -er → 'ein neuer Server'.",
        },
      },
      {
        id: "grammar:adjektivendungen:4",
        before: "Wir liefern ein",
        after: "Feature aus.",
        answer: "neues",
        hint: { en: "mixed neuter accusative after 'ein' → -es (das Feature)", ru: "смешанное склонение, вин. п. ср. р. после 'ein' → -es (das Feature)" },
        explain: {
          en: "'Feature' is neuter (das Feature); in the accusative after 'ein' the adjective takes -es → 'ein neues Feature'.",
          ru: "'Feature' — средний род (das Feature); в вин. п. после 'ein' прилагательное получает -es → 'ein neues Feature'.",
        },
      },
      {
        id: "grammar:adjektivendungen:5",
        before: "Sie arbeitet mit einem",
        after: "Server.",
        answer: "neuen",
        hint: { en: "dative masculine after 'mit einem' → -en", ru: "дат. п. м. р. после 'mit einem' → -en" },
        explain: {
          en: "'mit' governs the dative; in the dative masculine ('einem') the adjective ending is -en → 'mit einem neuen Server'.",
          ru: "'mit' требует дательного падежа; в дат. п. м. р. ('einem') окончание прилагательного -en → 'mit einem neuen Server'.",
        },
      },
    ],
    register: {
      en: "Shortcut: when the article already shows case and gender, the adjective is -e or -en; when the article is bare ('ein'), the adjective must show the gender (-er / -es / -e).",
      ru: "Подсказка: если артикль уже показывает падеж и род, прилагательное — -e или -en; если артикль безродовой ('ein'), род показывает прилагательное (-er / -es / -e).",
    },
  },
  {
    id: "grammar:genitiv",
    band: "B1",
    domain: "general",
    title: {
      en: "Genitiv — possession and the 'of' case",
      ru: "Генитив (родительный падеж) — принадлежность и «of»",
    },
    structure: {
      en: "der/das → des + noun gets -s/-es · die → der · die (pl) → der.  Prepositions wegen, trotz, während, aufgrund take the genitive.",
      ru: "der/das → des + существительное получает -s/-es · die → der · die (множ.) → der.  Предлоги wegen, trotz, während, aufgrund требуют генитива.",
    },
    explain: {
      en: "The genitive expresses possession or the English 'of': der Status des Servers = the status of the server. The articles become: masculine/neuter der/das → des, feminine die → der, plural die → der. In the masculine and neuter singular the noun itself adds -s or -es: one-syllable nouns and those ending in -s/-ß/-z usually take -es (des Systems, des Tests, des Prozesses), longer nouns take -s (des Servers, des Features). Feminine and plural nouns get no extra ending (der Datenbank, der Server). The genitive also follows the prepositions wegen (because of), trotz (despite), während (during) and aufgrund (due to): wegen des Fehlers, während des Deployments.",
      ru: "Генитив выражает принадлежность или английское 'of': der Status des Servers = статус сервера. Артикли становятся: муж./ср. род der/das → des, жен. род die → der, множ. число die → der. В муж. и ср. роде ед. ч. само существительное добавляет -s или -es: односложные слова и слова на -s/-ß/-z обычно берут -es (des Systems, des Tests, des Prozesses), более длинные — -s (des Servers, des Features). Жен. род и множ. число не получают дополнительного окончания (der Datenbank, der Server). Генитив также следует за предлогами wegen (из-за), trotz (несмотря на), während (во время) и aufgrund (вследствие): wegen des Fehlers, während des Deployments.",
    },
    examples: [
      {
        de: "Der Status des Servers ist kritisch.",
        ru: "Статус сервера критический.",
        note: { en: "der Server → des Servers (masc. genitive, +s)", ru: "der Server → des Servers (генитив, муж. род, +s)" },
      },
      {
        de: "Die Logs des Systems sind voll.",
        ru: "Логи системы переполнены.",
        note: { en: "das System → des Systems (neuter genitive, +s)", ru: "das System → des Systems (генитив, ср. род, +s)" },
      },
      {
        de: "Wegen des Fehlers ist das Deployment gestoppt.",
        ru: "Из-за ошибки деплой остановлен.",
        note: { en: "wegen + genitive: der Fehler → des Fehlers", ru: "wegen + генитив: der Fehler → des Fehlers" },
      },
      {
        de: "Die Größe der Datenbank wächst täglich.",
        ru: "Размер базы данных растёт ежедневно.",
        note: { en: "die Datenbank → der Datenbank (feminine genitive, no -s)", ru: "die Datenbank → der Datenbank (генитив, жен. род, без -s)" },
      },
    ],
    cloze: [
      {
        id: "grammar:genitiv:1",
        before: "Der Status",
        after: "Servers ist kritisch.",
        answer: "des",
        hint: { en: "masculine genitive article: der → des (and the noun is already 'Servers')", ru: "артикль генитива муж. рода: der → des (существительное уже 'Servers')" },
        explain: {
          en: "Possession 'the status of the server' → masculine genitive: der → des, with the noun ending in -s → 'des Servers'.",
          ru: "Принадлежность 'статус сервера' → генитив муж. рода: der → des, существительное на -s → 'des Servers'.",
        },
      },
      {
        id: "grammar:genitiv:2",
        before: "Die Logs des",
        after: "sind voll.",
        answer: "Systems",
        hint: { en: "neuter genitive of das System adds -s → Systems (capitalised noun)", ru: "генитив ср. рода от das System добавляет -s → Systems (существительное с заглавной)" },
        explain: {
          en: "'System' is neuter; in the genitive the noun takes -s → 'des Systems'. Nouns are capitalised.",
          ru: "'System' — средний род; в генитиве существительное берёт -s → 'des Systems'. Существительные пишутся с заглавной.",
        },
      },
      {
        id: "grammar:genitiv:3",
        before: "Wegen",
        after: "Fehlers wurde das Deployment gestoppt.",
        answer: "des",
        hint: { en: "wegen governs the genitive; masculine der Fehler → des Fehlers", ru: "wegen управляет генитивом; муж. род der Fehler → des Fehlers" },
        explain: {
          en: "The preposition 'wegen' takes the genitive. 'Fehler' is masculine, so der → des → 'wegen des Fehlers'.",
          ru: "Предлог 'wegen' требует генитива. 'Fehler' — муж. рода, поэтому der → des → 'wegen des Fehlers'.",
        },
      },
    ],
    register: {
      en: "In casual speech German often replaces the genitive with 'von + dative' (die Größe von der Datenbank), but written/technical German keeps the genitive (die Größe der Datenbank).",
      ru: "В разговорной речи немецкий часто заменяет генитив на 'von + датив' (die Größe von der Datenbank), но в письменном/техническом языке генитив сохраняется (die Größe der Datenbank).",
    },
  },
  {
    id: "grammar:praeteritum",
    band: "B1",
    domain: "general",
    title: {
      en: "Präteritum — simple past for written reports and narration",
      ru: "Претеритум (Präteritum) — простое прошедшее для отчётов и повествования",
    },
    structure: {
      en: "weak: stem + -te (machte, sagte) · strong: vowel change, no -te (ging, kam, gab) · key irregulars: war, hatte, wurde, konnte, musste",
      ru: "слабые: основа + -te (machte, sagte) · сильные: смена гласной, без -te (ging, kam, gab) · ключевые неправильные: war, hatte, wurde, konnte, musste",
    },
    explain: {
      en: "The Präteritum is the simple past. In conversation Germans prefer the Perfekt, but the Präteritum dominates written narration — reports, postmortems, documentation, stories. Weak verbs add -te to the stem (machen → machte, sagen → sagte). Strong verbs change the stem vowel and add no -te (gehen → ging, kommen → kam, geben → gab). The high-frequency irregulars are worth memorising whole: sein → war, haben → hatte, werden → wurde, können → konnte, müssen → musste. Note that the 1st and 3rd person singular share the same form (ich war / er war; ich machte / er machte).",
      ru: "Претеритум — это простое прошедшее. В разговоре немцы предпочитают перфект, но претеритум господствует в письменном повествовании — отчёты, постмортемы, документация, рассказы. Слабые глаголы добавляют -te к основе (machen → machte, sagen → sagte). Сильные глаголы меняют гласную в основе и не добавляют -te (gehen → ging, kommen → kam, geben → gab). Высокочастотные неправильные стоит запомнить целиком: sein → war, haben → hatte, werden → wurde, können → konnte, müssen → musste. Заметьте, что 1-е и 3-е лицо ед. ч. совпадают (ich war / er war; ich machte / er machte).",
    },
    examples: [
      {
        de: "Der Server war gestern offline.",
        ru: "Вчера сервер был офлайн.",
        note: { en: "sein → war (Präteritum, 3rd person singular)", ru: "sein → war (претеритум, 3-е лицо ед. ч.)" },
      },
      {
        de: "Wir hatten ein Problem mit der Pipeline.",
        ru: "У нас была проблема с пайплайном.",
        note: { en: "haben → hatten (1st person plural Präteritum)", ru: "haben → hatten (претеритум, 1-е лицо множ. ч.)" },
      },
      {
        de: "Das Deployment ging schief, und der Build schlug fehl.",
        ru: "Деплой пошёл не так, и сборка упала.",
        note: { en: "gehen → ging, fehlschlagen → schlug … fehl (strong Präteritum)", ru: "gehen → ging, fehlschlagen → schlug … fehl (сильный претеритум)" },
      },
    ],
    cloze: [
      {
        id: "grammar:praeteritum:1",
        before: "Der Server",
        after: "gestern offline.",
        answer: "war",
        hint: { en: "Präteritum of sein, 3rd person singular = war", ru: "претеритум от sein, 3-е лицо ед. ч. = war" },
        explain: {
          en: "'sein' is irregular in the Präteritum; the 3rd-person singular is 'war' → 'der Server war offline'.",
          ru: "'sein' неправильный в претеритуме; 3-е лицо ед. ч. — 'war' → 'der Server war offline'.",
        },
      },
      {
        id: "grammar:praeteritum:2",
        before: "Wir",
        after: "ein Problem mit der Pipeline.",
        answer: "hatten",
        hint: { en: "Präteritum of haben, 1st person plural = hatten", ru: "претеритум от haben, 1-е лицо множ. ч. = hatten" },
        explain: {
          en: "'haben' → 'hatte-' in the Präteritum; the 1st-person plural is 'hatten' → 'wir hatten'.",
          ru: "'haben' → 'hatte-' в претеритуме; 1-е лицо множ. ч. — 'hatten' → 'wir hatten'.",
        },
      },
      {
        id: "grammar:praeteritum:3",
        before: "Das Team",
        after: "den Bug nicht reproduzieren.",
        answer: "konnte",
        hint: { en: "Präteritum of können, 3rd person singular = konnte (no umlaut)", ru: "претеритум от können, 3-е лицо ед. ч. = konnte (без умлаута)" },
        explain: {
          en: "The modal 'können' loses its umlaut in the Präteritum → 'konnte'. 'Das Team' is singular → 'das Team konnte … reproduzieren'.",
          ru: "Модальный 'können' теряет умлаут в претеритуме → 'konnte'. 'Das Team' — единственное число → 'das Team konnte … reproduzieren'.",
        },
      },
    ],
    register: {
      en: "Spoken German uses the Perfekt for most past events; the Präteritum sounds natural mainly with war/hatte/the modals and in written reports.",
      ru: "В разговоре немцы используют перфект для большинства прошедших событий; претеритум звучит естественно в основном с war/hatte/модальными и в письменных отчётах.",
    },
  },
  {
    id: "grammar:passiv",
    band: "B1",
    domain: "general",
    title: {
      en: "Passiv — the process passive (werden + Partizip II)",
      ru: "Пассив (Vorgangspassiv) — страдательный залог действия (werden + Partizip II)",
    },
    structure: {
      en: "present: [werden conjugated in pos. 2] … [Partizip II at the end]  ·  past: [wurde-form] … [Partizip II]",
      ru: "настоящее: [werden, спрягается на 2-й позиции] … [Partizip II в конце]  ·  прошедшее: [форма wurde] … [Partizip II]",
    },
    explain: {
      en: "The process passive (Vorgangspassiv) focuses on the action rather than the doer. It is built with the auxiliary werden (conjugated, in position 2) plus the Partizip II at the clause end. In the present tense: 'Der Bug wird behoben' (the bug is being fixed). In the past (Präteritum passive): werden → wurde-, e.g. 'Die Daten wurden gelöscht' (the data was/were deleted). The agent, if mentioned at all, follows von + dative: 'Der Bug wird von einem Entwickler behoben'. Do not confuse this werden-passive with the perfect tense (which uses haben/sein).",
      ru: "Страдательный залог действия (Vorgangspassiv) делает акцент на действии, а не на исполнителе. Он строится с помощью вспомогательного глагола werden (спрягается, на 2-й позиции) плюс Partizip II в конце предложения. В настоящем времени: 'Der Bug wird behoben' (баг чинят / исправляется). В прошедшем (претеритум пассива): werden → wurde-, напр. 'Die Daten wurden gelöscht' (данные были удалены). Исполнитель, если он вообще упоминается, идёт после von + датив: 'Der Bug wird von einem Entwickler behoben'. Не путайте этот пассив с werden с перфектом (который использует haben/sein).",
    },
    examples: [
      {
        de: "Der Bug wird gerade behoben.",
        ru: "Баг сейчас чинят (исправляется).",
        note: { en: "present passive: wird + behoben (Partizip II of beheben)", ru: "пассив наст. вр.: wird + behoben (Partizip II от beheben)" },
      },
      {
        de: "Die Daten wurden gestern gelöscht.",
        ru: "Данные были удалены вчера.",
        note: { en: "past passive: wurden (plural) + gelöscht", ru: "пассив прош. вр.: wurden (множ.) + gelöscht" },
      },
      {
        de: "Der Service wird von der Pipeline automatisch deployt.",
        ru: "Сервис автоматически деплоится пайплайном.",
        note: { en: "agent with von + dative: von der Pipeline; Partizip II 'deployt'", ru: "исполнитель через von + датив: von der Pipeline; Partizip II 'deployt'" },
      },
    ],
    cloze: [
      {
        id: "grammar:passiv:1",
        before: "Der Bug",
        after: "gerade behoben.",
        answer: "wird",
        hint: { en: "present passive auxiliary, 3rd person singular of werden = wird", ru: "вспомогательный глагол пассива наст. вр., 3-е лицо ед. ч. от werden = wird" },
        explain: {
          en: "The process passive uses werden; 3rd-person singular present is 'wird' → 'der Bug wird … behoben'.",
          ru: "Страдательный залог действия использует werden; 3-е лицо ед. ч. наст. вр. — 'wird' → 'der Bug wird … behoben'.",
        },
      },
      {
        id: "grammar:passiv:2",
        before: "Die Daten",
        after: "gestern gelöscht.",
        answer: "wurden",
        hint: { en: "past passive, plural subject → Präteritum of werden = wurden", ru: "пассив прош. вр., подлежащее во множ. ч. → претеритум от werden = wurden" },
        explain: {
          en: "'Die Daten' is plural, so the past-passive auxiliary is the plural Präteritum 'wurden' → 'die Daten wurden … gelöscht'.",
          ru: "'Die Daten' во множ. ч., поэтому вспомогательный глагол пассива в прош. вр. — множ. претеритум 'wurden' → 'die Daten wurden … gelöscht'.",
        },
      },
      {
        id: "grammar:passiv:3",
        before: "Der Service wird automatisch",
        after: ".",
        answer: "deployt",
        alts: ["bereitgestellt"],
        hint: { en: "Partizip II at the clause end; deployen → deployt (or native bereitstellen → bereitgestellt)", ru: "Partizip II в конце предложения; deployen → deployt (или родное bereitstellen → bereitgestellt)" },
        explain: {
          en: "The passive needs the Partizip II at the end. 'deployen' → 'deployt'; the German verb 'bereitstellen' → 'bereitgestellt'.",
          ru: "Пассиву нужен Partizip II в конце. 'deployen' → 'deployt'; немецкий глагол 'bereitstellen' → 'bereitgestellt'.",
        },
      },
    ],
    register: {
      en: "The werden-passive describes an action in progress. A state result uses the sein-passive (Zustandspassiv): 'Der Bug ist behoben' = the bug is (now) fixed.",
      ru: "Пассив с werden описывает действие в процессе. Результат-состояние выражает пассив с sein (Zustandspassiv): 'Der Bug ist behoben' = баг (теперь) исправлен.",
    },
  },
  {
    id: "grammar:komparativ-superlativ",
    band: "A2",
    domain: "general",
    title: {
      en: "Komparativ & Superlativ — comparative and superlative",
      ru: "Сравнительная и превосходная степень (Komparativ & Superlativ)",
    },
    structure: {
      en: "comparative: adjective + -er (schneller) · superlative: am + adjective + -sten (am schnellsten) / der/die/das + -ste · many one-syllable adjectives add an umlaut",
      ru: "сравнительная: прилагательное + -er (schneller) · превосходная: am + прилагательное + -sten (am schnellsten) / der/die/das + -ste · многие односложные прилагательные получают умлаут",
    },
    explain: {
      en: "The comparative adds -er to the adjective (schnell → schneller, klein → kleiner). The superlative is 'am …-sten' when used predicatively/adverbially (am schnellsten) or 'der/die/das …-ste' before a noun (der schnellste Server). Many short adjectives take an umlaut on the comparative and superlative: groß → größer → am größten, hoch → höher → am höchsten (hoch also drops the c), lang → länger → am längsten, kurz → kürzer → am kürzesten. A few are fully irregular: gut → besser → am besten; viel → mehr → am meisten; gern → lieber → am liebsten. Adjectives ending in -d, -t, -s, -ß, -z insert an -e in the superlative (-esten): am kürzesten, am ältesten.",
      ru: "Сравнительная степень добавляет -er к прилагательному (schnell → schneller, klein → kleiner). Превосходная — 'am …-sten' в предикативном/наречном употреблении (am schnellsten) или 'der/die/das …-ste' перед существительным (der schnellste Server). Многие короткие прилагательные получают умлаут в сравнительной и превосходной степени: groß → größer → am größten, hoch → höher → am höchsten (hoch также теряет c), lang → länger → am längsten, kurz → kürzer → am kürzesten. Несколько полностью неправильных: gut → besser → am besten; viel → mehr → am meisten; gern → lieber → am liebsten. Прилагательные на -d, -t, -s, -ß, -z вставляют -e в превосходной степени (-esten): am kürzesten, am ältesten.",
    },
    examples: [
      {
        de: "Der neue Server ist schneller als der alte.",
        ru: "Новый сервер быстрее старого.",
        note: { en: "comparative: schnell → schneller; 'als' = than", ru: "сравнительная: schnell → schneller; 'als' = чем" },
      },
      {
        de: "Dieser Cache ist am schnellsten.",
        ru: "Этот кэш самый быстрый.",
        note: { en: "predicative superlative: am schnellsten", ru: "превосходная (предикативная): am schnellsten" },
      },
      {
        de: "Diese Lösung ist besser als die alte.",
        ru: "Это решение лучше старого.",
        note: { en: "irregular: gut → besser", ru: "неправильная форма: gut → besser" },
      },
      {
        de: "Die Latenz ist jetzt höher als gestern.",
        ru: "Задержка сейчас выше, чем вчера.",
        note: { en: "umlaut + dropped c: hoch → höher", ru: "умлаут и потеря c: hoch → höher" },
      },
    ],
    cloze: [
      {
        id: "grammar:komparativ-superlativ:1",
        before: "Der neue Server ist",
        after: "als der alte.",
        answer: "schneller",
        hint: { en: "comparative of schnell = schneller (+er, no umlaut)", ru: "сравнительная от schnell = schneller (+er, без умлаута)" },
        explain: {
          en: "'schnell' forms a regular comparative with -er and no umlaut → 'schneller', used with 'als' (than).",
          ru: "'schnell' образует правильную сравнительную степень с -er без умлаута → 'schneller', употребляется с 'als' (чем).",
        },
      },
      {
        id: "grammar:komparativ-superlativ:2",
        before: "Diese Lösung ist",
        after: "als die alte.",
        answer: "besser",
        hint: { en: "irregular comparative of gut = besser", ru: "неправильная сравнительная от gut = besser" },
        explain: {
          en: "'gut' is irregular: its comparative is 'besser' (not 'guter') → 'besser als die alte'.",
          ru: "'gut' неправильный: сравнительная степень — 'besser' (не 'guter') → 'besser als die alte'.",
        },
      },
      {
        id: "grammar:komparativ-superlativ:3",
        before: "Von allen Caches ist dieser am",
        after: ".",
        answer: "schnellsten",
        hint: { en: "predicative superlative pattern 'am …-sten' → schnellsten (lowercase after am)", ru: "предикативная превосходная по схеме 'am …-sten' → schnellsten (со строчной после am)" },
        explain: {
          en: "The predicative superlative is 'am' + adjective + '-sten' → 'am schnellsten'. The word after 'am' is lowercase here.",
          ru: "Предикативная превосходная — 'am' + прилагательное + '-sten' → 'am schnellsten'. Слово после 'am' здесь со строчной.",
        },
      },
      {
        id: "grammar:komparativ-superlativ:4",
        before: "Die Last ist heute viel",
        after: "als gestern.",
        answer: "höher",
        hint: { en: "comparative of hoch: umlaut + drop the c → höher", ru: "сравнительная от hoch: умлаут и потеря c → höher" },
        explain: {
          en: "'hoch' is irregular in the comparative: the c drops and an umlaut appears → 'höher'.",
          ru: "'hoch' неправильный в сравнительной степени: c исчезает и появляется умлаут → 'höher'.",
        },
      },
    ],
    register: {
      en: "Comparisons use 'als' for 'than' (schneller als) and 'so … wie' for 'as … as' (so schnell wie). Don't mix them: never 'schneller wie'.",
      ru: "Для 'чем' в сравнении используется 'als' (schneller als), для 'так … как' — 'so … wie' (so schnell wie). Не смешивайте их: 'schneller wie' — ошибка.",
    },
  },
  {
    id: "grammar:wechselpraepositionen",
    band: "B1",
    domain: "general",
    title: {
      en: "Wechselpräpositionen — two-way prepositions (Akkusativ vs. Dativ)",
      ru: "Предлоги двойного управления (Wechselpräpositionen) — аккузатив или датив",
    },
    structure: {
      en: "in, an, auf, über, unter, vor, hinter, neben, zwischen  →  Akkusativ for motion (wohin?), Dativ for location (wo?)",
      ru: "in, an, auf, über, unter, vor, hinter, neben, zwischen  →  аккузатив при движении (wohin? — куда?), датив при местонахождении (wo? — где?)",
    },
    explain: {
      en: "Nine prepositions can govern either the accusative or the dative. The case depends on meaning, not on the verb alone. Ask the question: wohin? (where to?) signals motion/direction toward a goal → Akkusativ; wo? (where?) signals a fixed location/position → Dativ. So with motion: 'Ich speichere die Datei in den Ordner' (into the folder, akk: der Ordner → den). With location: 'Die Datei liegt in dem/im Ordner' (in the folder, dat: der Ordner → dem; in + dem usually contracts to im). The same split applies to neuter (in das/ins → akk vs. in dem/im → dat) and feminine (in die → akk vs. in der → dat) and plural (in die → akk vs. in den → dat).",
      ru: "Девять предлогов могут управлять либо аккузативом, либо дативом. Падеж зависит от смысла, а не только от глагола. Задайте вопрос: wohin? (куда?) означает движение/направление к цели → аккузатив; wo? (где?) означает фиксированное местонахождение → датив. Так при движении: 'Ich speichere die Datei in den Ordner' (в папку, аккузатив: der Ordner → den). При местонахождении: 'Die Datei liegt in dem/im Ordner' (в папке, датив: der Ordner → dem; in + dem обычно стягивается в im). Та же логика для ср. рода (in das/ins → аккузатив vs. in dem/im → датив), жен. рода (in die → аккузатив vs. in der → датив) и множ. ч. (in die → аккузатив vs. in den → датив).",
    },
    examples: [
      {
        de: "Ich speichere die Datei in den Ordner.",
        ru: "Я сохраняю файл в папку.",
        note: { en: "motion (wohin?) → Akkusativ: der Ordner → den Ordner", ru: "движение (wohin? — куда?) → аккузатив: der Ordner → den Ordner" },
      },
      {
        de: "Die Datei liegt im Ordner.",
        ru: "Файл лежит в папке.",
        note: { en: "location (wo?) → Dativ: in dem Ordner → im Ordner", ru: "местонахождение (wo? — где?) → датив: in dem Ordner → im Ordner" },
      },
      {
        de: "Wir schieben den Commit auf den Branch.",
        ru: "Мы заливаем коммит в ветку.",
        note: { en: "motion onto → Akkusativ: der Branch → den Branch", ru: "движение «на/в» → аккузатив: der Branch → den Branch" },
      },
      {
        de: "Der Server steht im Rechenzentrum.",
        ru: "Сервер стоит в дата-центре.",
        note: { en: "location → Dativ: in dem Rechenzentrum → im Rechenzentrum", ru: "местонахождение → датив: in dem Rechenzentrum → im Rechenzentrum" },
      },
    ],
    cloze: [
      {
        id: "grammar:wechselpraepositionen:1",
        before: "Ich speichere die Datei in",
        after: "Ordner.",
        answer: "den",
        hint: { en: "motion (wohin?) → accusative; der Ordner → den Ordner", ru: "движение (wohin? — куда?) → аккузатив; der Ordner → den Ordner" },
        explain: {
          en: "'speichern … in' here means moving the file into the folder (wohin?), so 'in' takes the accusative: der → den.",
          ru: "'speichern … in' здесь означает перемещение файла в папку (wohin? — куда?), поэтому 'in' требует аккузатива: der → den.",
        },
      },
      {
        id: "grammar:wechselpraepositionen:2",
        before: "Die Datei liegt in",
        after: "Ordner.",
        answer: "dem",
        alts: ["im"],
        hint: { en: "location (wo?) → dative; der Ordner → dem Ordner (often contracted to im)", ru: "местонахождение (wo? — где?) → датив; der Ordner → dem Ordner (часто стягивается в im)" },
        explain: {
          en: "'liegen … in' describes where the file is (wo?), so 'in' takes the dative: der → dem; 'in dem' usually contracts to 'im'.",
          ru: "'liegen … in' описывает, где находится файл (wo? — где?), поэтому 'in' требует датива: der → dem; 'in dem' обычно стягивается в 'im'.",
        },
      },
      {
        id: "grammar:wechselpraepositionen:3",
        before: "Wir deployen den Service auf",
        after: "Produktionsserver.",
        answer: "den",
        hint: { en: "deploying onto = motion (wohin?) → accusative; der Server → den Server", ru: "деплой «на» = движение (wohin? — куда?) → аккузатив; der Server → den Server" },
        explain: {
          en: "Deploying the service onto the production server is directional (wohin?), so 'auf' takes the accusative: der → den.",
          ru: "Деплой сервиса на боевой сервер — направление (wohin? — куда?), поэтому 'auf' требует аккузатива: der → den.",
        },
      },
      {
        id: "grammar:wechselpraepositionen:4",
        before: "Der Service läuft auf",
        after: "Produktionsserver.",
        answer: "dem",
        hint: { en: "running on = location (wo?) → dative; der Server → dem Server", ru: "работает «на» = местонахождение (wo? — где?) → датив; der Server → dem Server" },
        explain: {
          en: "'laufen auf' describes where the service runs (wo?), so 'auf' takes the dative: der → dem.",
          ru: "'laufen auf' описывает, где работает сервис (wo? — где?), поэтому 'auf' требует датива: der → dem.",
        },
      },
    ],
    register: {
      en: "Common contractions: in dem → im, in das → ins, an dem → am, an das → ans, auf das → aufs. The accusative/dative split is about meaning (direction vs. place), not the individual verb.",
      ru: "Частые стяжения: in dem → im, in das → ins, an dem → am, an das → ans, auf das → aufs. Выбор аккузатив/датив зависит от смысла (направление vs. место), а не от конкретного глагола.",
    },
  },
];
