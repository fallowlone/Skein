// site/src/german/data/output/tasks.ts
// German production-writing tasks. Bilingual prompts (en/ru) tell the learner what
// German text to produce; the rubric is German, grader-facing; modelAnswer.de is a
// model German answer with its RU translation, powering no-key self-assessment.
import type { OutputTask } from "~/german/types";

export const germanOutputTasks: OutputTask[] = [
  {
    id: "out-de-standup-a1",
    band: "A1",
    type: "standup",
    prompt: {
      en: "Write your daily standup in German. Yesterday you fixed a bug in the login form. Today you will write tests. You have no blockers. Use three short lines: Gestern / Heute / Blocker.",
      ru: "Напишите своё ежедневное стендап-сообщение на немецком. Вчера вы исправили баг в форме входа. Сегодня вы будете писать тесты. Блокеров нет. Используйте три короткие строки: Gestern / Heute / Blocker.",
    },
    rubric: [
      "Deckt alle drei Punkte ab: Gestern, Heute und Blocker.",
      "Perfekt (haben/sein + Partizip II) für gestern, Präsens oder werden für heute.",
      "Kurze, korrekte A1-Sätze mit richtiger Wortstellung (Verb an zweiter Stelle).",
    ],
    modelAnswer: {
      de: "Gestern: Ich habe einen Bug im Login-Formular behoben.\nHeute: Ich schreibe Tests.\nBlocker: Keine.",
      ru: "Вчера: я исправил баг в форме входа.\nСегодня: я пишу тесты.\nБлокеры: нет.",
    },
    hint: {
      en: "Keep it to three lines, one sentence each. 'Ich habe … behoben' for the past, 'Ich schreibe …' for today. End the blocker line with 'Keine.'",
      ru: "Только три строки, по одному предложению. 'Ich habe … behoben' для прошедшего, 'Ich schreibe …' для сегодня. Строку с блокером завершите словом 'Keine.'",
    },
  },
  {
    id: "out-de-commit-message-a1",
    band: "A1",
    type: "commit-message",
    prompt: {
      en: "You added a dark-mode toggle button to the navigation bar. Write a short German git commit message. Use the imperative mood ('Füge … hinzu') and keep the subject line short.",
      ru: "Вы добавили кнопку переключения тёмного режима в панель навигации. Напишите короткое сообщение git-коммита на немецком. Используйте повелительное наклонение ('Füge … hinzu') и держите строку темы короткой.",
    },
    rubric: [
      "Imperativ in der Betreffzeile (z. B. 'Füge … hinzu' oder Präfix 'feat:').",
      "Betreffzeile ist kurz (unter 72 Zeichen) und beschreibt die Änderung genau.",
      "Einfaches, korrektes A1-Deutsch ohne überflüssige Wörter.",
    ],
    modelAnswer: {
      de: "feat: Füge Dark-Mode-Schalter zur Navigationsleiste hinzu",
      ru: "feat: добавить переключатель тёмного режима в панель навигации",
    },
    hint: {
      en: "Trennbare verb 'hinzufügen' splits: 'Füge … hinzu'. Start with 'feat:' or 'fix:', then describe the change in one line. No period at the end.",
      ru: "Отделяемый глагол 'hinzufügen' распадается: 'Füge … hinzu'. Начните с 'feat:' или 'fix:', затем опишите изменение в одной строке. Без точки в конце.",
    },
  },
  {
    id: "out-de-bug-report-a2",
    band: "A2",
    type: "bug-report",
    prompt: {
      en: "You found a bug: clicking the 'Speichern' (Save) button on the profile page does nothing. Write a short German bug report with three sections: steps to reproduce (Schritte), expected result (Erwartet), and actual result (Tatsächlich).",
      ru: "Вы нашли баг: нажатие кнопки «Speichern» (Сохранить) на странице профиля ничего не делает. Напишите короткий баг-репорт на немецком с тремя разделами: шаги для воспроизведения (Schritte), ожидаемый результат (Erwartet) и фактический результат (Tatsächlich).",
    },
    rubric: [
      "Enthält nummerierte Schritte zur Reproduktion.",
      "Hat klar getrennte Abschnitte 'Erwartet' und 'Tatsächlich'.",
      "Einfache, korrekte A2-Sätze; Fachbegriffe (Button, Profilseite) richtig verwendet.",
    ],
    modelAnswer: {
      de: "**Schritte zur Reproduktion:**\n1. Melde dich in der App an.\n2. Öffne die Profilseite.\n3. Ändere den Anzeigenamen.\n4. Klicke auf den Button \"Speichern\".\n\n**Erwartet:** Der neue Name wird gespeichert und eine Erfolgsmeldung erscheint.\n\n**Tatsächlich:** Es passiert nichts. Der Name ändert sich nicht. Es gibt keine Fehlermeldung.",
      ru: "**Шаги для воспроизведения:**\n1. Войдите в приложение.\n2. Откройте страницу профиля.\n3. Измените отображаемое имя.\n4. Нажмите кнопку «Speichern».\n\n**Ожидаемое:** Новое имя сохраняется и появляется сообщение об успехе.\n\n**Фактическое:** Ничего не происходит. Имя не меняется. Сообщения об ошибке нет.",
    },
    hint: {
      en: "Use three headings: Schritte, Erwartet, Tatsächlich. Keep each sentence short. 'Es passiert nichts' is a natural way to say 'nothing happens'.",
      ru: "Используйте три заголовка: Schritte, Erwartet, Tatsächlich. Каждое предложение делайте коротким. 'Es passiert nichts' — естественный способ сказать «ничего не происходит».",
    },
  },
  {
    id: "out-de-pr-comment-a2",
    band: "A2",
    type: "pr-comment",
    prompt: {
      en: "You are reviewing a pull request. The code works, but the function name is unclear — it is called `machDinge` (do stuff). Write a short, friendly German PR comment asking the author to rename it to something more descriptive.",
      ru: "Вы проверяете пул-реквест. Код работает, но название функции неясное — она называется `machDinge` (делать всякое). Напишите короткий и дружелюбный комментарий к PR на немецком с просьбой переименовать её во что-то более понятное.",
    },
    rubric: [
      "Höflicher, freundlicher Ton — keine harte Kritik.",
      "Benennt klar, was geändert werden soll (der Funktionsname).",
      "Höfliche Bitte mit 'Könntest du …?' oder 'Würdest du …?' und korrekter A2-Grammatik.",
    ],
    modelAnswer: {
      de: "Hi! Der Code sieht gut aus. Könntest du `machDinge` in einen aussagekräftigeren Namen umbenennen, zum Beispiel `formatiereNutzerdaten`? Dann ist der Code leichter zu lesen. Danke!",
      ru: "Привет! Код выглядит хорошо. Не мог бы ты переименовать `machDinge` во что-то более понятное, например `formatiereNutzerdaten`? Тогда код будет легче читать. Спасибо!",
    },
    hint: {
      en: "Start positive ('Der Code sieht gut aus'). Make the request with 'Könntest du …?'. The separable verb 'umbenennen' goes to the end of the clause.",
      ru: "Начните с позитива ('Der Code sieht gut aus'). Сделайте просьбу с 'Könntest du …?'. Отделяемый глагол 'umbenennen' уходит в конец придаточного.",
    },
  },
  {
    id: "out-de-rfc-summary-a2",
    band: "A2",
    type: "rfc-summary",
    prompt: {
      en: "Your team wants to add a rate limit in front of the public REST API to prevent abuse. Write a short German Summary (Zusammenfassung) section of an RFC — 3–4 sentences. Say what is proposed, why it is needed, and what the expected result is.",
      ru: "Ваша команда хочет добавить ограничение запросов перед публичным REST API, чтобы предотвратить злоупотребления. Напишите короткий раздел Summary (Zusammenfassung) для RFC на немецком — 3–4 предложения. Скажите, что предлагается, почему это нужно и каков ожидаемый результат.",
    },
    rubric: [
      "Sagt klar, was vorgeschlagen wird (Rate-Limiting für die öffentliche API).",
      "Erklärt das Problem bzw. die Motivation (Schutz vor Missbrauch, Stabilität).",
      "Beschreibt das erwartete Ergebnis oder den Nutzen.",
      "Neutraler, sachlicher Ton; korrekte A2-Grammatik.",
    ],
    modelAnswer: {
      de: "## Zusammenfassung\n\nDieses RFC schlägt vor, ein Rate-Limit vor der öffentlichen REST-API einzuführen. Ohne Limit kann ein einzelner Client zu viele Anfragen senden und den Server überlasten. Wir wollen pro Client ein Limit setzen, zum Beispiel 1000 Anfragen pro Minute. Dadurch wird die API stabiler und für alle Nutzer fairer.",
      ru: "## Резюме\n\nЭтот RFC предлагает ввести ограничение запросов перед публичным REST API. Без лимита один клиент может отправлять слишком много запросов и перегрузить сервер. Мы хотим установить лимит на каждого клиента, например 1000 запросов в минуту. Благодаря этому API станет стабильнее и справедливее для всех пользователей.",
    },
    hint: {
      en: "Three questions: Was? Warum? Was wird besser? State proposals as facts ('Dieses RFC schlägt vor …'), not as opinions. Keep sentences short and direct.",
      ru: "Три вопроса: Was? Warum? Was wird besser? Формулируйте предложения как факты ('Dieses RFC schlägt vor …'), а не как мнения. Делайте предложения короткими и прямыми.",
    },
  },
  {
    id: "out-de-design-rationale-b1",
    band: "B1",
    type: "design-rationale",
    prompt: {
      en: "Your team debated two options for storing user sessions: a JWT in localStorage vs a short-lived HTTP-only cookie backed by a Redis session store. You chose the cookie + Redis approach. Write 3–4 German sentences explaining your reasoning to a colleague who missed the meeting.",
      ru: "Ваша команда обсуждала два варианта хранения пользовательских сессий: JWT в localStorage или короткоживущая HTTP-only cookie с хранилищем сессий в Redis. Вы выбрали подход с cookie + Redis. Напишите 3–4 предложения на немецком, объясняя свой выбор коллеге, который пропустил встречу.",
    },
    rubric: [
      "Nennt die gewählte Option klar im ersten Satz.",
      "Gibt mindestens einen konkreten Sicherheits- oder Betriebsgrund gegen die abgelehnte Option (z. B. XSS-Risiko bei localStorage).",
      "Verwendet abwägende Sprache ('die Hauptsorge war', 'wir haben uns dafür entschieden').",
      "Bleibt knapp: höchstens 4 Sätze, korrekte B1-Grammatik mit Nebensätzen.",
    ],
    modelAnswer: {
      de: "Wir haben uns für HTTP-only-Cookies mit Redis entschieden statt für JWTs im localStorage. Die Hauptsorge war XSS: Jedes Skript auf der Seite kann localStorage lesen, sodass eine kompromittierte Abhängigkeit die Tokens unbemerkt stehlen könnte. Bei einem HTTP-only-Cookie gibt der Browser den Wert nie an JavaScript weiter, und mit Redis können wir Sitzungen sofort ungültig machen, wenn wir etwas Verdächtiges bemerken. Die zusätzlichen Infrastrukturkosten sind die kleinere Angriffsfläche wert.",
      ru: "Мы выбрали HTTP-only cookie с Redis вместо JWT в localStorage. Главной заботой был XSS: любой скрипт на странице может читать localStorage, поэтому скомпрометированная зависимость могла бы незаметно украсть токены. При HTTP-only cookie браузер никогда не передаёт значение в JavaScript, а с Redis мы можем мгновенно аннулировать сессии, если заметим что-то подозрительное. Дополнительные затраты на инфраструктуру оправданы меньшей поверхностью атаки.",
    },
    hint: {
      en: "Start with the decision ('Wir haben uns für … entschieden'), then name the risk you avoided, then the trade-off you accepted. Subordinate clauses with 'weil' or 'sodass' send the verb to the end.",
      ru: "Начните с решения ('Wir haben uns für … entschieden'), затем назовите риск, которого избежали, потом принятый компромисс. В придаточных с 'weil' или 'sodass' глагол уходит в конец.",
    },
  },
  {
    id: "out-de-review-reply-b1",
    band: "B1",
    type: "review-reply",
    prompt: {
      en: "A reviewer left this comment on your pull request:\n\n> Warum cachst du das User-Objekt 10 Minuten lang? Das wirkt zu lange — was, wenn der Nutzer sein Profil ändert?\n\nWrite a German reply (4–6 sentences) that: (1) explains why you chose 10 minutes (high-traffic endpoint, profile changes are rare), (2) acknowledges the reviewer's concern is valid, (3) proposes a compromise: keep the 10-minute TTL but add cache invalidation on profile update.",
      ru: "Ревьюер оставил такой комментарий к вашему пул-реквесту:\n\n> Warum cachst du das User-Objekt 10 Minuten lang? Das wirkt zu lange — was, wenn der Nutzer sein Profil ändert?\n\nНапишите ответ на немецком (4–6 предложений), в котором: (1) объясните, почему выбрали 10 минут (загруженный эндпоинт, изменения профиля редки), (2) признаете, что замечание обоснованно, (3) предложите компромисс: сохранить TTL 10 минут, но добавить инвалидацию кэша при обновлении профиля.",
    },
    rubric: [
      "Erklärt die ursprüngliche technische Begründung klar (Traffic, Cache-Trefferrate, seltene Profiländerungen).",
      "Erkennt die Bedenken des Reviewers an, ohne sie abzutun.",
      "Schlägt einen konkreten Kompromiss vor (TTL bleibt, explizite Cache-Invalidierung bei Profiländerung).",
      "Korrekte B1-Grammatik mit Verbindungswörtern (allerdings, dennoch, um das zu lösen).",
    ],
    modelAnswer: {
      de: "Das TTL von 10 Minuten habe ich gewählt, weil dieser Endpunkt bei jedem Seitenaufruf getroffen wird und etwa 40 % des gesamten API-Traffics ausmacht — ein längeres Caching senkt die Datenbanklast also deutlich. Profiländerungen sind in der Praxis außerdem recht selten; die meisten Nutzer ändern ihr Profil nach der Registrierung nie. Dennoch ist dein Einwand berechtigt: Wer sein Profil ändert, würde bis zu 10 Minuten veraltete Daten sehen, was verwirrend sein kann. Um das zu lösen, kann ich im Profil-Update-Handler einen expliziten Aufruf zur Cache-Invalidierung hinzufügen, sodass der Cache sofort geleert wird, wenn eine Änderung gespeichert wird. So behalten wir den Performance-Vorteil und stellen trotzdem sicher, dass die Daten nach bewussten Änderungen aktuell bleiben. Klingt das nach einem sinnvollen Kompromiss?",
      ru: "TTL в 10 минут я выбрал потому, что этот эндпоинт вызывается при каждой загрузке страницы и составляет около 40 % всего трафика API — поэтому более длительное кэширование заметно снижает нагрузку на базу данных. К тому же изменения профиля на практике довольно редки; большинство пользователей никогда не меняют профиль после регистрации. Тем не менее твоё замечание обоснованно: тот, кто всё же изменит профиль, будет видеть устаревшие данные до 10 минут, что может сбивать с толку. Чтобы это решить, я могу добавить в обработчик обновления профиля явный вызов инвалидации кэша, чтобы кэш сбрасывался сразу при сохранении изменения. Так мы сохраним выигрыш в производительности и при этом обеспечим актуальность данных после намеренных изменений. Звучит как разумный компромисс?",
    },
    hint: {
      en: "Three moves: explain your reasoning, validate the concern with 'Dennoch ist dein Einwand berechtigt', then propose the fix with 'Um das zu lösen, …'. End with a question to invite agreement.",
      ru: "Три шага: объясните своё решение, признайте замечание через 'Dennoch ist dein Einwand berechtigt', затем предложите решение через 'Um das zu lösen, …'. Завершите вопросом для приглашения к согласию.",
    },
  },
  {
    id: "out-de-incident-summary-b1",
    band: "B1",
    type: "incident-summary",
    prompt: {
      en: "A production incident just ended. The image-upload service was down for 47 minutes during peak hours: a deployment introduced a misconfigured environment variable, so every upload request failed with HTTP 500. The incident is resolved — the bad deploy was rolled back. Write a short German internal incident summary (5–8 sentences) covering what happened, the impact, and the current status.",
      ru: "Производственный инцидент только что завершился. Сервис загрузки изображений не работал 47 минут в часы пик: в деплое была неправильно настроена переменная окружения, поэтому каждый запрос на загрузку завершался с HTTP 500. Инцидент разрешён — неудачный деплой откатан. Напишите короткое внутреннее резюме инцидента на немецком (5–8 предложений), охватив произошедшее, влияние и текущий статус.",
    },
    rubric: [
      "Nennt die Zeitachse klar (Startzeit, Dauer, Lösungszeit).",
      "Beschreibt die Ursache in klarer, korrekter Sprache ohne übermäßigen Jargon.",
      "Beziffert oder charakterisiert die Auswirkung (welche Nutzer oder Funktionen betroffen waren).",
      "Endet mit einer klaren Statusaussage (behoben, Überwachung läuft, Post-Mortem geplant).",
    ],
    modelAnswer: {
      de: "**Incident-Zusammenfassung — Ausfall des Bild-Upload-Dienstes**\n\nAm 30.05.2026 von 14:03 bis 14:50 UTC war der Bild-Upload-Dienst für alle Nutzer vollständig nicht verfügbar. Während dieser 47 Minuten schlug jede Upload-Anfrage mit HTTP 500 fehl; betroffen waren Profilbilder, Anhänge in Beiträgen und Dokument-Uploads sowohl in der Web-App als auch im Mobil-Client. Ursache war eine falsch konfigurierte Umgebungsvariable `STORAGE_BUCKET_REGION`, die mit dem Deployment v4.11.0 um 14:02 UTC eingeführt wurde. Der falsche Wert führte dazu, dass das Storage-SDK bei jeder Anfrage fehlschlug. Der Bereitschaftsingenieur erkannte den Konfigurationsfehler um 14:38 UTC und führte um 14:50 UTC ein Rollback auf v4.10.5 durch. Der Dienst erholte sich unmittelbar nach dem Rollback. Stand 15:10 UTC ist der Dienst voll funktionsfähig und die Fehlerrate liegt wieder auf dem Normalwert. Für morgen ist ein Post-Mortem geplant, um eine Validierung der Umgebungsvariablen in die CI-Pipeline aufzunehmen.",
      ru: "**Резюме инцидента — недоступность сервиса загрузки изображений**\n\n30.05.2026 с 14:03 до 14:50 UTC сервис загрузки изображений был полностью недоступен для всех пользователей. В течение этих 47 минут каждый запрос на загрузку завершался с HTTP 500; были затронуты аватары профилей, вложения в публикациях и загрузка документов как в веб-приложении, так и в мобильном клиенте. Причиной стала неправильно настроенная переменная окружения `STORAGE_BUCKET_REGION`, введённая деплоем v4.11.0 в 14:02 UTC. Из-за неверного значения Storage SDK завершался ошибкой при каждом запросе. Дежурный инженер обнаружил ошибку конфигурации в 14:38 UTC и в 14:50 UTC выполнил откат на v4.10.5. Сервис восстановился сразу после отката. По состоянию на 15:10 UTC сервис полностью работоспособен, частота ошибок вернулась к норме. На завтра запланирован постмортем, чтобы добавить в CI-пайплайн валидацию переменных окружения.",
    },
    hint: {
      en: "A good summary answers four questions: When and for how long? What broke and for whom? Why? What is the status now? Stay factual and chronological. German dates: '30.05.2026', times in 24-hour UTC.",
      ru: "Хорошее резюме отвечает на четыре вопроса: когда и как долго? Что сломалось и для кого? Почему? Каков статус сейчас? Придерживайтесь фактов и хронологии. Немецкие даты: '30.05.2026', время в 24-часовом UTC.",
    },
  },
];
