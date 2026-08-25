// Static bilingual UI chrome for the Algorithm Workspace. Problem-specific prose
// (statement, hints, diagnoses) lives with the problem data instead — see
// problem-3sum.ts and the real drill bank — so this file only owns fixed labels.
import type { Locale } from "~/i18n";

export const L = {
  en: {
    brand: "Drill", kicker: "algorithms · neetcode-150",
    resetSession: "Reset session",
    nav: { workspace: "Workspace", debrief: "Debrief", metrics: "Metrics", bank: "Problem bank" },

    workspace: {
      workedExample: "worked example", input: "input", output: "output", why: "why",
      askedAt: "asked at",
      followUp: "follow-up · unlocks on submit",
      step1: "step 01 · how do you want to sit this one",
      step2: "step 02 · commit before you code",
      commitTitle: "What time complexity will your solution have?",
      commitBody:
        "Predict now, before the editor unlocks. Your answer is sealed and scored against what you actually write. Getting this wrong is not penalised — not knowing that you were wrong is the thing this catches.",
      seal: "Seal prediction & open editor",
      sealHintPick: "Pick a complexity to continue.",
      sealHintLocked: "You can not change this once the editor opens.",
      sealedPrediction: "sealed prediction", scoredAgainst: "scored against your submission",
      elapsed: "elapsed", remaining: "remaining", untimed: "untimed",
      targetSuffix: "/ 20:00 target", noClock: "no clock this session", interviewSim: "interview sim",
      masteryAtStake: "mastery at stake",
      solutionFile: "solution.js", scratchFile: "scratch.js", langBadge: "javascript · node 20",
      completionsHint: "completions · tab accepts the first",
      completionsPrompt: "completions · type two characters",
      runTests: "Run tests", submit: "Submit", saveAttempt: "Save attempt",
      runHintIdle: "Nothing has run yet.",
      testsHeading: "Tests",
      hiddenCasesNote: (n: number) => `${n} hidden case${n === 1 ? "" : "s"} run on submit`,
      expected: "expected", actual: "actual",
      genericDiagnosis: (expected: string, actual: string) => `Expected ${expected}, got ${actual}.`,
    },

    rail: {
      hints: "Hints", attempts: "Attempts", solutions: "Solutions",
      ladderNote: "hint ladder", ladderNoteInterview: "interview sim · double cost",
      spentOf: (n: number) => `${n} / 4 spent`,
      mastery: "mastery",
      reveal: (n: number) => `Reveal rung ${n}`,
      lockedReveal: (n: number) => `Locked — spend rung ${n} first`,
      footnote: "unaided solve banks the full 100. every rung is a real cost.",
      noAttempts:
        "Nothing saved yet. Save attempt keeps the current buffer, the clock, the mastery left and the test result — so you can come back after a rewrite and compare, or resume this problem on another machine.",
      restore: "Restore",
      notRun: "not run",
      testsPassedOf: (passed: number, total: number) => `${passed} of ${total} passed`,
      storageOk: "saved in this browser · survives reload",
      storageBad: "browser storage unavailable · session only",
      solutionsLockedTitle: "locked until you submit",
      solutionsLockedBody:
        "Reference approaches open after your own submission lands — reading them first is answer-matching, which is the one thing this product is against.",
      solutionsOpenNote: "reference approaches for this problem",
    },

    rungRoles: [
      "orient", "narrow", "name the technique", "walk the solution",
    ] as string[],

    modes: {
      timed: { label: "Against the clock", note: "counts up to the bank's 20:00 target · pace recorded" },
      untimed: { label: "No timer", note: "no clock, no pace record · mastery still counts" },
      interview: { label: "Interview sim", note: "20:00 counts down · hints cost double" },
    },

    complexities: [
      { big: "O(n²)", note: "Nested scan over the input" },
      { big: "O(n log n)", note: "A sort, or a heap per element" },
      { big: "O(n)", note: "One pass, constant work per item" },
      { big: "O(1)", note: "No dependence on input size" },
    ],

    schemes: {
      ink: { label: "ink", title: "Ink — follows the page theme" },
      paper: { label: "paper", title: "Paper — always light" },
      slate: { label: "slate", title: "Slate — always dark" },
    },

    debrief: {
      submittedKicker: (title: string, passed: number, total: number) =>
        `${title} · submitted · ${passed} of ${total} cases passed`,
      headlineClean: (elapsed: string) => `A clean solve in ${elapsed}, no hints spent.`,
      headlineHinted: (elapsed: string, mastery: number) =>
        `Working in ${elapsed}. Mastery landed at ${mastery} after the rungs you spent.`,
      headlineFailing: (elapsed: string, passed: number, total: number) =>
        `${passed} of ${total} cases pass at ${elapsed}. The rest is still broken.`,
      tabs: { analysis: "Analysis", diff: "Your code vs reference", next: "What to do next" },
      youPredicted: "you predicted", sealedAt: (t: string) => `Sealed at ${t}, before the editor opened.`,
      referenceBound: "reference bound for this problem",
      referenceBoundBody:
        "This is the known-correct bound for this problem, not a static analysis of your code — comparing it to your prediction is the point of sealing one before you open the editor.",
      firstBreakHeading: "What tripped up your first failing run",
      firstBreakClean: "Nothing to unpack — every case you ran passed the first time.",
      traceHeading: "Solve trace", traceTarget: "target",
      diffHeading: "Your submission vs the reference idiom",
      diffBothBound: (bigO: string) => `both ${bigO} time`,
      diffBody:
        "Your solution's own logic, next to a reference idiom for the same bound. A shorter reference isn't automatically better — read it for the technique, not to rewrite yours to match line-for-line.",
      diffYoursLabel: (lines: number) => `yours · ${lines} lines`,
      diffRefLabel: (lines: number) => `reference · ${lines} lines`,
      nextHeading: "Next in your queue",
      nextIntroHinted: (n: number) =>
        `You used ${n} hint${n === 1 ? "" : "s"} this run on the duplicate guard. The problems below share that failure shape.`,
      nextIntroClean: "An unaided solve — these keep the same pattern moving.",
      nextIntroFailing: "Not solved yet — these keep the same pattern moving while you come back to fix it.",
      revisit: (title: string, days: number) => `${title} returns to your revisit queue in ${days} days if marked solved.`,
      queueWhySamePattern: (pattern: string) => `Same pattern (${pattern}) · not yet solved`,
    },

    metrics: {
      sampleNote: "sample session data, not measured",
      headline: "You solve hash-map problems unaided. You still miss base cases.",
      views: { patterns: "Patterns", habits: "Habits", pace: "Pace" },
      pattern: "pattern", easy: "easy", medium: "medium", hard: "hard", solved: "solved",
      masteryScaleNote: "0 → 100 · decays ~4 pts/week without recall",
      due: "due — recall window passed",
      hintDependence: "Hint dependence", falling: "falling",
      hintDependenceBody: "Average rungs spent per problem, by week. Falling is the only trend that matters here.",
      whyFailed: "Why submissions failed", failuresCount: (n: number) => `${n} failures`,
      whyFailedBody: "Classified from the first failing case of each submission.",
      whyFailedFoot: "Missing base case is a third of everything and has not moved in eleven weeks — the one number on this page that is not improving.",
      timeVsTarget: "Time to solve vs target", timeVsTargetNote: "last 22 problems · dashed line is the bank's target minutes",
      medianSolve: "median solve", underTarget: "under target", vsFirstWeeks: "vs first four weeks", unaidedRow: "unaided in a row",
    },

    bank: {
      kicker: "problem bank · algorithms track · neetcode-150 subset",
      title: "Problems",
      filters: { pattern: "pattern", difficulty: "difficulty", company: "company", status: "status" },
      cols: { lc: "lc", problem: "problem", pattern: "pattern", difficulty: "difficulty", status: "status", target: "target" },
      count: (shown: number, total: number) => `${shown} of ${total} problems`,
      footnote: "titles, patterns, targets and companies read from the live drill bank",
      status: { unattempted: "unattempted", attempted: "attempted", solved: "solved", due: "due" },
      all: "all",
    },
  },

  ru: {
    brand: "Drill", kicker: "алгоритмы · neetcode-150",
    resetSession: "Сбросить сессию",
    nav: { workspace: "Рабочая область", debrief: "Разбор", metrics: "Метрики", bank: "Банк задач" },

    workspace: {
      workedExample: "разобранный пример", input: "вход", output: "выход", why: "почему",
      askedAt: "спрашивали в",
      followUp: "дополнительный вопрос · открывается после отправки",
      step1: "шаг 01 · как хочешь решать эту задачу",
      step2: "шаг 02 · зафиксируй прогноз перед кодом",
      commitTitle: "Какая временная сложность будет у твоего решения?",
      commitBody:
        "Предскажи заранее, до того как откроется редактор. Ответ фиксируется и сверяется с тем, что ты реально напишешь. Ошибиться не штрафуется — штрафуется не заметить, что ошибся.",
      seal: "Зафиксировать прогноз и открыть редактор",
      sealHintPick: "Выбери сложность, чтобы продолжить.",
      sealHintLocked: "После открытия редактора прогноз изменить нельзя.",
      sealedPrediction: "зафиксированный прогноз", scoredAgainst: "сверяется с твоей отправкой",
      elapsed: "прошло", remaining: "осталось", untimed: "без таймера",
      targetSuffix: "/ цель 20:00", noClock: "в этой сессии без таймера", interviewSim: "симуляция интервью",
      masteryAtStake: "мастерство на кону",
      solutionFile: "solution.js", scratchFile: "scratch.js", langBadge: "javascript · node 20",
      completionsHint: "автодополнение · tab принимает первый вариант",
      completionsPrompt: "автодополнение · введи два символа",
      runTests: "Запустить тесты", submit: "Отправить", saveAttempt: "Сохранить попытку",
      runHintIdle: "Пока ничего не запускалось.",
      testsHeading: "Тесты",
      hiddenCasesNote: (n: number) => `${n} скрытых кейсов запустятся при отправке`,
      expected: "ожидалось", actual: "получено",
      genericDiagnosis: (expected: string, actual: string) => `Ожидалось ${expected}, получено ${actual}.`,
    },

    rail: {
      hints: "Подсказки", attempts: "Попытки", solutions: "Решения",
      ladderNote: "лестница подсказок", ladderNoteInterview: "симуляция интервью · двойная цена",
      spentOf: (n: number) => `${n} / 4 потрачено`,
      mastery: "мастерство",
      reveal: (n: number) => `Открыть ступень ${n}`,
      lockedReveal: (n: number) => `Заблокировано — сначала потрать ступень ${n}`,
      footnote: "решение без подсказок даёт полные 100. каждая ступень — реальная цена.",
      noAttempts:
        "Пока ничего не сохранено. «Сохранить попытку» запоминает текущий код, время, оставшееся мастерство и результат тестов — можно вернуться после переписывания и сравнить, или продолжить на другой машине.",
      restore: "Восстановить",
      notRun: "не запускалось",
      testsPassedOf: (passed: number, total: number) => `пройдено ${passed} из ${total}`,
      storageOk: "сохранено в этом браузере · переживёт перезагрузку",
      storageBad: "хранилище браузера недоступно · только эта сессия",
      solutionsLockedTitle: "заблокировано до отправки",
      solutionsLockedBody:
        "Разборы чужих подходов открываются только после твоей собственной отправки — читать их раньше значит подгонять под ответ, а это как раз то, против чего сделан этот продукт.",
      solutionsOpenNote: "разборы подходов к этой задаче",
    },

    rungRoles: [
      "сориентироваться", "сузить", "назвать приём", "разобрать решение целиком",
    ] as string[],

    modes: {
      timed: { label: "На время", note: "счётчик идёт до цели банка в 20:00 · темп фиксируется" },
      untimed: { label: "Без таймера", note: "без часов и темпа · мастерство всё равно считается" },
      interview: { label: "Симуляция интервью", note: "обратный отсчёт от 20:00 · подсказки в двойную цену" },
    },

    complexities: [
      { big: "O(n²)", note: "Вложенный проход по входу" },
      { big: "O(n log n)", note: "Сортировка или куча на каждый элемент" },
      { big: "O(n)", note: "Один проход, константная работа на элемент" },
      { big: "O(1)", note: "Не зависит от размера входа" },
    ],

    schemes: {
      ink: { label: "ink", title: "Ink — следует теме страницы" },
      paper: { label: "paper", title: "Paper — всегда светлая" },
      slate: { label: "slate", title: "Slate — всегда тёмная" },
    },

    debrief: {
      submittedKicker: (title: string, passed: number, total: number) =>
        `${title} · отправлено · пройдено ${passed} из ${total} кейсов`,
      headlineClean: (elapsed: string) => `Чистое решение за ${elapsed}, без единой подсказки.`,
      headlineHinted: (elapsed: string, mastery: number) =>
        `Решено за ${elapsed}. Мастерство остановилось на ${mastery} после потраченных ступеней.`,
      headlineFailing: (elapsed: string, passed: number, total: number) =>
        `Пройдено ${passed} из ${total} кейсов за ${elapsed}. Остальное пока не работает.`,
      tabs: { analysis: "Разбор", diff: "Твой код vs эталон", next: "Что дальше" },
      youPredicted: "ты предсказал", sealedAt: (t: string) => `Зафиксировано в ${t}, до открытия редактора.`,
      referenceBound: "эталонная сложность этой задачи",
      referenceBoundBody:
        "Это известно верная граница для этой задачи, а не анализ твоего кода — сравнение с прогнозом и есть смысл фиксировать его до того, как открылся редактор.",
      firstBreakHeading: "Что сломало первый неудачный запуск",
      firstBreakClean: "Разбирать нечего — все запущенные кейсы прошли с первого раза.",
      traceHeading: "След решения", traceTarget: "цель",
      diffHeading: "Твоя отправка против эталонного приёма",
      diffBothBound: (bigO: string) => `обе — ${bigO} по времени`,
      diffBody:
        "Логика твоего решения рядом с эталонным приёмом на ту же сложность. Более короткий эталон не значит «лучше» — читай его ради приёма, а не чтобы переписать своё построчно.",
      diffYoursLabel: (lines: number) => `твой код · ${lines} строк`,
      diffRefLabel: (lines: number) => `эталон · ${lines} строк`,
      nextHeading: "Следующее в очереди",
      nextIntroHinted: (n: number) =>
        `В этом запуске ты потратил ${n} подсказ${n === 1 ? "ку" : "ки"} на защиту от дубликатов. Задачи ниже подобраны на тот же паттерн отказа.`,
      nextIntroClean: "Решено без подсказок — эти задачи держат тот же приём в игре.",
      nextIntroFailing: "Пока не решено — эти задачи держат тот же приём в игре, пока ты не вернёшься и не исправишь.",
      revisit: (title: string, days: number) => `«${title}» вернётся в очередь повторения через ${days} дней, если отметить решённой.`,
      queueWhySamePattern: (pattern: string) => `Тот же паттерн (${pattern}) · ещё не решено`,
    },

    metrics: {
      sampleNote: "демонстрационные данные, не измерено",
      headline: "Задачи на хеш-таблицы ты решаешь без подсказок. Базовые случаи всё ещё пропускаешь.",
      views: { patterns: "Паттерны", habits: "Привычки", pace: "Темп" },
      pattern: "паттерн", easy: "лёгкая", medium: "средняя", hard: "сложная", solved: "решено",
      masteryScaleNote: "0 → 100 · падает на ~4 балла в неделю без повторения",
      due: "пора повторить — окно вышло",
      hintDependence: "Зависимость от подсказок", falling: "падает",
      hintDependenceBody: "Среднее число потраченных ступеней на задачу по неделям. Здесь важно только падение.",
      whyFailed: "Почему отправки проваливались", failuresCount: (n: number) => `${n} провалов`,
      whyFailedBody: "Классифицировано по первому провалившемуся кейсу каждой отправки.",
      whyFailedFoot: "Пропущенный базовый случай — треть всех провалов, и цифра не двигалась одиннадцать недель. Единственное число на странице, которое не улучшается.",
      timeVsTarget: "Время решения против цели", timeVsTargetNote: "последние 22 задачи · пунктир — целевое время банка",
      medianSolve: "медианное решение", underTarget: "уложились в цель", vsFirstWeeks: "к первым четырём неделям", unaidedRow: "подряд без подсказок",
    },

    bank: {
      kicker: "банк задач · трек algorithms · подмножество neetcode-150",
      title: "Задачи",
      filters: { pattern: "паттерн", difficulty: "сложность", company: "компания", status: "статус" },
      cols: { lc: "lc", problem: "задача", pattern: "паттерн", difficulty: "сложность", status: "статус", target: "цель" },
      count: (shown: number, total: number) => `${shown} из ${total} задач`,
      footnote: "названия, паттерны, цели и компании — из живого банка дрилла",
      status: { unattempted: "не начато", attempted: "в работе", solved: "решено", due: "повторить" },
      all: "все",
    },
  },
};

export type Labels = (typeof L)["en"];

export function labelsFor(lang: Locale): Labels {
  return L[lang];
}
