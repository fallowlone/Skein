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
  {
    id: "out-de-standup-a2",
    band: "A2",
    type: "standup",
    prompt: {
      en: "Write your daily standup in German. Yesterday you reviewed a colleague's pull request. Today you will deploy to staging. You have one blocker: you are waiting on QA before the deploy. Use three lines: Gestern / Heute / Blocker.",
      ru: "Напишите своё ежедневное стендап-сообщение на немецком. Вчера вы проверили пул-реквест коллеги. Сегодня вы выкатите релиз на staging. Есть один блокер: вы ждёте QA перед деплоем. Используйте три строки: Gestern / Heute / Blocker.",
    },
    rubric: [
      "Deckt alle drei Punkte ab: Gestern, Heute und Blocker.",
      "Perfekt für gestern (z. B. 'habe … überprüft'), Präsens oder werden für heute.",
      "Der Blocker nennt klar die Abhängigkeit von QA (z. B. 'Ich warte auf QA').",
      "Korrekte A2-Wortstellung; trennbare Verben (deployen/freigeben) richtig verwendet.",
    ],
    modelAnswer: {
      de: "Gestern: Ich habe den Pull-Request von Lena überprüft und freigegeben.\nHeute: Ich deploye die neue Version auf Staging.\nBlocker: Ich warte noch auf QA — vor dem Deploy muss das Team die Tests bestätigen.",
      ru: "Вчера: я проверил и одобрил пул-реквест Лены.\nСегодня: я выкатываю новую версию на staging.\nБлокер: я всё ещё жду QA — перед деплоем команда должна подтвердить тесты.",
    },
    hint: {
      en: "Use Perfekt for yesterday ('Ich habe … überprüft'), present for today ('Ich deploye …'). For the blocker, 'Ich warte auf QA' (warten auf + Akkusativ) is the natural phrasing.",
      ru: "Используйте Perfekt для вчера ('Ich habe … überprüft'), настоящее для сегодня ('Ich deploye …'). Для блокера 'Ich warte auf QA' (warten auf + винительный) — естественная формулировка.",
    },
  },
  {
    id: "out-de-commit-message-a2",
    band: "A2",
    type: "commit-message",
    prompt: {
      en: "The profile page crashed when a user had no avatar, because the code did not check for null. You added a null check. Write a German git commit message: an imperative subject line plus one body line explaining why.",
      ru: "Страница профиля падала, когда у пользователя не было аватара, потому что код не проверял null. Вы добавили проверку на null. Напишите сообщение git-коммита на немецком: строка темы в повелительном наклонении плюс одна строка тела, объясняющая причину.",
    },
    rubric: [
      "Betreffzeile im Imperativ mit Präfix 'fix:' und kurz (unter 72 Zeichen).",
      "Eine Body-Zeile, die das Warum erklärt (fehlender Avatar führte zum Absturz).",
      "Leerzeile zwischen Betreff und Body.",
      "Korrektes, knappes A2-Deutsch ohne überflüssige Wörter.",
    ],
    modelAnswer: {
      de: "fix: Prüfe auf fehlenden Avatar auf der Profilseite\n\nOhne diese Prüfung stürzte die Seite ab, wenn der Nutzer kein Avatar-Bild hatte.",
      ru: "fix: проверять отсутствующий аватар на странице профиля\n\nБез этой проверки страница падала, если у пользователя не было изображения аватара.",
    },
    hint: {
      en: "Subject: 'fix:' + imperative ('Prüfe …'). Leave a blank line, then one sentence with 'Ohne …, wenn …' for the cause. Past tense 'stürzte … ab' (separable verb abstürzen) describes the old behaviour.",
      ru: "Тема: 'fix:' + императив ('Prüfe …'). Пустая строка, затем одно предложение с 'Ohne …, wenn …' для причины. Прошедшее 'stürzte … ab' (отделяемый глагол abstürzen) описывает прежнее поведение.",
    },
  },
  {
    id: "out-de-pr-comment-b1",
    band: "B1",
    type: "pr-comment",
    prompt: {
      en: "You are reviewing a pull request. The same database query (loading a user by id with their roles) is duplicated in two service methods. Write a polite German PR comment (3–5 sentences) asking the author to extract it into a shared helper, with a concrete suggestion for how.",
      ru: "Вы проверяете пул-реквест. Один и тот же запрос к базе (загрузка пользователя по id вместе с ролями) дублируется в двух методах сервиса. Напишите вежливый комментарий к PR на немецком (3–5 предложений) с просьбой вынести его в общий хелпер и конкретным предложением, как это сделать.",
    },
    rubric: [
      "Höflicher, kollegialer Ton; benennt das Problem klar (duplizierte Query).",
      "Macht einen konkreten Vorschlag (z. B. eine Methode 'findUserWithRoles' im Repository).",
      "Begründet den Nutzen (eine Stelle zum Ändern, weniger Fehlerrisiko).",
      "Korrekte B1-Grammatik mit Nebensatz und höflicher Bitte ('Könntest du …?').",
    ],
    modelAnswer: {
      de: "Mir ist aufgefallen, dass dieselbe Query — den Nutzer per ID samt Rollen laden — in `getProfile` und `updateProfile` fast identisch vorkommt. Könntest du sie in eine gemeinsame Methode auslagern, zum Beispiel `findUserWithRoles(id)` im UserRepository? Dann gibt es nur noch eine Stelle, die wir anpassen müssen, falls sich das Schema ändert, und das Risiko, dass die beiden Varianten auseinanderlaufen, fällt weg. Ansonsten sieht der PR gut aus — danke!",
      ru: "Я заметил, что один и тот же запрос — загрузка пользователя по ID вместе с ролями — почти идентично встречается в `getProfile` и `updateProfile`. Не мог бы ты вынести его в общий метод, например `findUserWithRoles(id)` в UserRepository? Тогда останется только одно место, которое нужно будет править при изменении схемы, и исчезнет риск, что эти два варианта разойдутся. В остальном PR выглядит хорошо — спасибо!",
    },
    hint: {
      en: "State the observation neutrally ('Mir ist aufgefallen, dass …'), make the request with 'Könntest du …?', then give the benefit. The separable verb 'auslagern' goes to the end of its clause.",
      ru: "Сформулируйте наблюдение нейтрально ('Mir ist aufgefallen, dass …'), просьбу — через 'Könntest du …?', затем дайте выгоду. Отделяемый глагол 'auslagern' уходит в конец придаточного.",
    },
  },
  {
    id: "out-de-bug-report-b1",
    band: "B1",
    type: "bug-report",
    prompt: {
      en: "You found an intermittent bug: under load, the /search endpoint sometimes returns HTTP 504 (Gateway Timeout). It happens roughly once in twenty requests during peak traffic, only on production. Write a German bug report with sections: Schritte, Erwartet, Tatsächlich, plus a note on frequency (Häufigkeit) and environment (Umgebung).",
      ru: "Вы нашли непостоянный баг: под нагрузкой эндпоинт /search иногда возвращает HTTP 504 (Gateway Timeout). Это случается примерно раз на двадцать запросов в часы пик, только на проде. Напишите баг-репорт на немецком с разделами: Schritte, Erwartet, Tatsächlich, плюс заметка о частоте (Häufigkeit) и окружении (Umgebung).",
    },
    rubric: [
      "Enthält nummerierte Reproduktionsschritte, die die Last (paralleles Aufrufen) erwähnen.",
      "Klar getrennte Abschnitte 'Erwartet' und 'Tatsächlich' mit dem konkreten Statuscode (504).",
      "Beschreibt die Häufigkeit (sporadisch, ungefähre Rate) und die Umgebung (nur Produktion).",
      "Korrektes B1-Deutsch; sachlicher Ton, präzise Fachbegriffe.",
    ],
    modelAnswer: {
      de: "**Schritte zur Reproduktion:**\n1. Sende viele gleichzeitige Anfragen an den Endpunkt `GET /search?q=...` (z. B. 50 parallele Requests).\n2. Wiederhole das während des Spitzenverkehrs.\n3. Beobachte die HTTP-Statuscodes der Antworten.\n\n**Erwartet:** Jede Anfrage liefert innerhalb von zwei Sekunden HTTP 200 mit den Suchergebnissen.\n\n**Tatsächlich:** Etwa jede zwanzigste Anfrage läuft in einen Timeout und gibt nach 30 Sekunden HTTP 504 (Gateway Timeout) zurück. Die übrigen Anfragen funktionieren normal.\n\n**Häufigkeit:** Sporadisch, ungefähr 5 % der Anfragen, ausschließlich unter Last zu Spitzenzeiten. Bei geringem Traffic tritt der Fehler nicht auf.\n\n**Umgebung:** Nur Produktion (Region eu-central-1). In Staging konnte der Fehler bisher nicht reproduziert werden.",
      ru: "**Шаги для воспроизведения:**\n1. Отправьте много одновременных запросов на эндпоинт `GET /search?q=...` (например, 50 параллельных запросов).\n2. Повторите это в часы пик.\n3. Наблюдайте за HTTP-статусами ответов.\n\n**Ожидаемое:** Каждый запрос возвращает HTTP 200 с результатами поиска в течение двух секунд.\n\n**Фактическое:** Примерно каждый двадцатый запрос уходит в таймаут и спустя 30 секунд возвращает HTTP 504 (Gateway Timeout). Остальные запросы работают нормально.\n\n**Частота:** Спорадически, примерно 5 % запросов, исключительно под нагрузкой в часы пик. При низком трафике ошибка не возникает.\n\n**Окружение:** Только продакшн (регион eu-central-1). В staging ошибку пока воспроизвести не удалось.",
    },
    hint: {
      en: "For intermittent bugs, frequency and environment matter as much as the steps. 'Etwa jede zwanzigste Anfrage' = 'roughly one in twenty requests'. Use 'ausschließlich unter Last' to scope the conditions precisely.",
      ru: "Для непостоянных багов частота и окружение важны не меньше шагов. 'Etwa jede zwanzigste Anfrage' = «примерно каждый двадцатый запрос». Используйте 'ausschließlich unter Last', чтобы точно ограничить условия.",
    },
  },
  {
    id: "out-de-design-rationale-a2",
    band: "A2",
    type: "design-rationale",
    prompt: {
      en: "Your list endpoint used to return all rows at once. You added pagination (returning the data in pages). Write 3–4 simple German sentences explaining to a colleague why pagination is better than returning everything.",
      ru: "Ваш эндпоинт списка раньше возвращал все строки сразу. Вы добавили пагинацию (возврат данных страницами). Напишите 3–4 простых предложения на немецком, объясняя коллеге, почему пагинация лучше, чем возврат всего сразу.",
    },
    rubric: [
      "Nennt klar die Entscheidung (Pagination statt alle Zeilen auf einmal).",
      "Gibt mindestens zwei einfache Gründe (Geschwindigkeit/Serverlast, weniger Daten pro Antwort).",
      "Einfache, korrekte A2-Sätze; 'weil' oder 'so' richtig verwendet.",
      "Sachlicher, klarer Ton ohne komplizierte Nebensätze.",
    ],
    modelAnswer: {
      de: "Ich habe Pagination hinzugefügt, statt alle Zeilen auf einmal zu schicken. Bei vielen Daten war die Antwort sehr groß und langsam. Jetzt schicken wir nur eine Seite, zum Beispiel 20 Einträge. So lädt die Liste schneller und der Server hat weniger Last.",
      ru: "Я добавил пагинацию вместо отправки всех строк сразу. При большом объёме данных ответ был очень большим и медленным. Теперь мы отправляем только одну страницу, например 20 записей. Так список загружается быстрее, а сервер получает меньше нагрузки.",
    },
    hint: {
      en: "Keep it simple: decision first, then the problem ('war sehr groß und langsam'), then the fix and the benefit. 'So lädt die Liste schneller' uses inversion — verb second after 'So'.",
      ru: "Проще: сначала решение, затем проблема ('war sehr groß und langsam'), потом решение и выгода. 'So lädt die Liste schneller' использует инверсию — глагол на втором месте после 'So'.",
    },
  },
  {
    id: "out-de-rfc-summary-b1",
    band: "B1",
    type: "rfc-summary",
    prompt: {
      en: "Your team wants to migrate the internal services from plain REST to a typed API contract (e.g. OpenAPI- or tRPC-style), so request and response types are generated and checked at compile time. Write a German Summary (Zusammenfassung) section of an RFC (5–7 sentences) covering: what is proposed, why, the expected outcome, and the main risks.",
      ru: "Ваша команда хочет мигрировать внутренние сервисы с обычного REST на типизированный API-контракт (в стиле OpenAPI или tRPC), чтобы типы запросов и ответов генерировались и проверялись на этапе компиляции. Напишите раздел Summary (Zusammenfassung) для RFC на немецком (5–7 предложений): что предлагается, зачем, ожидаемый результат и основные риски.",
    },
    rubric: [
      "Sagt klar, was vorgeschlagen wird (Wechsel zu einem typisierten API-Vertrag).",
      "Erklärt die Motivation (Typsicherheit, weniger Integrationsfehler zwischen Diensten).",
      "Beschreibt das erwartete Ergebnis (generierte Typen, Fehler zur Compile-Zeit statt zur Laufzeit).",
      "Nennt mindestens zwei konkrete Risiken (Migrationsaufwand, Lernkurve/Tooling) und bleibt sachlich; korrekte B1-Grammatik.",
    ],
    modelAnswer: {
      de: "## Zusammenfassung\n\nDieses RFC schlägt vor, die internen Dienste schrittweise von handgeschriebenen REST-Aufrufen auf einen typisierten API-Vertrag umzustellen (OpenAPI- bzw. tRPC-Stil). Aktuell sind Request- und Response-Formate nur in der Dokumentation festgehalten, sodass Abweichungen zwischen Anbieter und Aufrufer erst zur Laufzeit auffallen — oft erst in der Produktion. Mit einem gemeinsamen Vertrag generieren wir die Typen für beide Seiten aus einer einzigen Quelle, und der Compiler erkennt nicht passende Felder, bevor der Code überhaupt deployt wird. Wir erwarten dadurch weniger Integrationsfehler, schnellere Reviews und sicherere Refactorings, weil sich vertragsbrechende Änderungen sofort zeigen. Die Hauptrisiken sind der einmalige Migrationsaufwand für die bestehenden Endpunkte sowie eine gewisse Lernkurve beim neuen Tooling und im Build-Prozess. Um das Risiko zu begrenzen, schlagen wir eine schrittweise Migration vor, bei der wir mit einem unkritischen Dienst beginnen und die Erfahrungen vor dem breiten Rollout auswerten.",
      ru: "## Резюме\n\nЭтот RFC предлагает поэтапно перевести внутренние сервисы с вручную написанных REST-вызовов на типизированный API-контракт (в стиле OpenAPI или tRPC). Сейчас форматы запросов и ответов зафиксированы только в документации, поэтому расхождения между поставщиком и вызывающей стороной обнаруживаются лишь во время выполнения — нередко уже в продакшене. С общим контрактом мы генерируем типы для обеих сторон из единого источника, и компилятор находит несоответствующие поля ещё до того, как код вообще будет задеплоен. Благодаря этому мы ожидаем меньше ошибок интеграции, более быстрые ревью и более безопасный рефакторинг, потому что нарушающие контракт изменения проявляются сразу. Основные риски — это разовые трудозатраты на миграцию существующих эндпоинтов, а также определённая кривая обучения новому инструментарию и процессу сборки. Чтобы ограничить риск, мы предлагаем поэтапную миграцию: начать с некритичного сервиса и проанализировать опыт перед широким развёртыванием.",
    },
    hint: {
      en: "Structure: Was? Warum? Was wird besser? Welche Risiken? State the proposal as fact ('Dieses RFC schlägt vor, … umzustellen'). For the risk-mitigation, 'Um das Risiko zu begrenzen, schlagen wir … vor' reads naturally.",
      ru: "Структура: Was? Warum? Was wird besser? Welche Risiken? Формулируйте предложение как факт ('Dieses RFC schlägt vor, … umzustellen'). Для смягчения рисков естественно звучит 'Um das Risiko zu begrenzen, schlagen wir … vor'.",
    },
  },
];
