# Исследования и референсы для интерактивного гайда «Как работает интернет»

## TL;DR
- **Прогрессия от junior к senior в одном гайде возможна и научно обоснована**, если опереться на Expertise Reversal Effect (Kalyuga, Ayres, Chandler & Sweller, 2003), faded worked examples (Renkl, Atkinson & Große, 2004) и spiral curriculum Bruner'а — каждый раздел («OSI», «TCP/IP», «DNS», «HTTP») должен иметь три прохода: интуитивный → механика → инженерные трейдоффы, с возможностью переключения уровня детализации (progressive disclosure).
- **Декомпозиция «Как работает интернет» должна строиться как DAG, а не как линейная книга**: подстатьи 1500–3000 слов (≈10–20 минут чтения) с явными prerequisite-рёбрами, тремя верхними узлами-«пилларами» (по образцу OSTEP: транспорт / именование / приложения) и атомарной единицей знания в 4±1 концепта (Cowan 2001) на подстатью.
- **Лучшая визуальная модель — интерактивные слойные/пошаговые диаграммы (Distill + Ciechanowski + Nicky Case)**: TCP handshake и DNS resolution требуют не статики и не видео, а system-paced анимации с пользовательским контролем; OSI-модель — кликабельная многослойная диаграмма, в которой каждый слой проваливается в подстатью; протоколы хорошо передаются текстом, форматы пакетов — диаграммами, состояния — анимациями.

---

## Направление 1. Прогрессия сложности (от новичка к эксперту)

### 1.1 Expertise Reversal Effect (Kalyuga, Ayres, Chandler & Sweller, *Educational Psychologist*, 2003)
Главный эмпирический факт, релевантный гайду «один материал для всех уровней»: инструкции, помогающие новичку (полностью развёрнутые worked examples, интегрированные пояснения в диаграмме, дублирование текста и аудио), **систематически вредят эксперту** — Kalyuga, Chandler & Sweller (1998, 2000, 2001) показывают статистически значимое падение производительности продвинутых учащихся при «новичковом» формате. Median effect sizes — крупные (g≈0.8–1.2 в обзоре Mayer & Fiorella, *Cambridge Handbook of Multimedia Learning*, 2014). Kalyuga (2007, *Educational Psychology Review* 19:509–539) формулирует прямое следствие: материал нужно делать **адаптивным** или **многослойным**.

**Применение к «Как работает интернет»:** одна страница про TCP handshake должна предлагать минимум три «слоя»:
- **Junior:** анимация «клиент — сервер — три стрелки SYN/SYN-ACK/ACK», метафора «звонок по телефону».
- **Middle:** TCP state machine, объяснение зачем нужен ACK, пример pcap.
- **Senior:** TFO, congestion window, BBR vs CUBIC — но **свёрнуто по умолчанию**, иначе сработает expertise reversal в обратную сторону у новичка (он перегружен) и в прямую — у эксперта (он раздражён).

### 1.2 Faded worked examples и scaffolding
Renkl, Atkinson & Große (2004, *Instructional Science* 32:59–82) показали, что переход от полностью решённого примера к самостоятельной задаче через постепенное «фейдинг» шагов даёт лучший transfer, чем оба полюса по отдельности. Shin, Jung, Zumbach & Yi (2023, *Journal of Educational Computing Research*) на 140 студентах подтвердили: **concept-oriented faded WOE** (фейдим концептуально значимые шаги, а не позиционно последние) превосходит позиционный фейдинг и для near-, и для far-transfer. Мета-исследование 2024 г. в *Education and Information Technologies* (Shin et al.) добавляет, что faded WOE + metacognitive scaffolding оптимизирует germane load в коллаборативном программировании.

**Применение:** в подстатье «Как работает DNS» дайте полностью разобранный пример резолва `www.example.com` через корневые/TLD/authoritative серверы → затем тот же пример, но с пробелом «впишите, какой сервер отвечает следующим» → затем `cdn.example.co.uk` без подсказок. На каждой ступени **скрывайте подсказку под disclosure-элементом**, а не убирайте полностью.

### 1.3 Zone of Proximal Development (Vygotsky, 1978) и scaffolding
Wood, Bruner & Ross (1976) ввели термин «scaffolding», операционализировав ZPD: задача должна быть чуть выше актуального уровня, опоры — временными. Wass & Golding (2014) показывают, что наибольший прирост достигается, когда задача максимально сложная **из доступных при scaffolding**. На веб-гайде «scaffolder» — это не человек, а сама структура страницы: hint-кнопки, раскрываемые подсказки, прерывисто появляющиеся вопросы.

### 1.4 Spiral curriculum (Bruner, *The Process of Education*, 1960)
Каждая тема возвращается с увеличением глубины. Harden & Stamper (1999) формализовали для медобразования; Detroit Mercy ECE применили к электротехнике вокруг robotics-темы. Эмпирическая база умеренная (ED538282; Cambridge Assessment paper «Perspectives on curriculum design»), но **признаки** спирального подхода (revisit, deepening, contextual reuse) надёжно коррелируют с retention.

**Применение:** один и тот же концепт «инкапсуляция» проходит через гайд трижды — в OSI (теория), в TCP/IP (практика поверх IP), в HTTP-over-TLS (security context). Каждый раз тоньше, чем предыдущий.

### 1.5 Threshold concepts (Meyer & Land, 2003, 2005)
Meyer & Land (*Threshold Concepts and Troublesome Knowledge*, ETL Project Occasional Report 4, 2003; *Higher Education* 49:373–388, 2005) определяют «пороговые концепты» как трансформативные, интегративные, необратимые, часто «troublesome». В CS-образовании Eckerdal et al., Sanders & McCartney (Koli Calling 2005), Boustedt et al. (ICER 2007), Zander et al. (2008) идентифицировали кандидатов: указатели/референсы, абстракция, ООП, рекурсия. Для сетевой темы кандидаты: **инкапсуляция / multiplexing / stateful vs stateless / асинхронность**. Без них дальше двигаться невозможно — и именно эти концепты заслуживают отдельных «boss»-страниц с обилием визуализаций и упражнений.

### 1.6 Bloom's Taxonomy revised (Anderson & Krathwohl, 2001)
Revised taxonomy: Remember → Understand → Apply → Analyze → Evaluate → Create + двумерная сетка с типами знания (factual / conceptual / procedural / metacognitive). Для одной подстатьи это даёт явный чек-лист: **на каждом уровне нужен activity**.

Пример для «HTTP/2»: Remember — таблица фреймов; Understand — диаграмма мультиплексирования; Apply — задача «отладьте, почему HOL-blocking всё ещё возможен»; Analyze — сравнение с HTTP/3; Evaluate — выбор протокола под кейс; Create — спроектировать API.

### 1.7 Адаптивные системы и rapid expertise diagnostics
Kalyuga & Sweller (2004, *ETR&D* 53:83–93) предложили **rapid dynamic assessment** — короткий пред-тест по 1–2 вопросам, который выбирает формат подачи. На веб-гайде это сводится к одному модулю в начале статьи: «оцените, сколько вы уже знаете про X», три вопроса → переключатель Junior/Middle/Senior. Метаанализ Höffler & Leutner (2007, *Learning and Instruction*, 17(6):722–738; «26 primary studies, yielding 76 pair-wise comparisons… mean weighted effect size on learning outcome is d = 0.37, 95% CI 0.25–0.49») и более широкий метаанализ Berney & Bétrancourt (2016, *Computers & Education*, vol. 101, pp. 150–167, DOI: 10.1016/j.compedu.2016.06.005) подтверждают, что **уровень prior knowledge — один из сильнейших модераторов** эффективности визуализаций.

### 1.8 Как избежать резкого скачка сложности
Сводный практический рецепт из CLT-литературы (Sweller, van Merriënboer & Paas, *Educational Psychology Review*, 2019, 31:261–292):
1. Pre-training principle (Mayer): заранее ввести термины, прежде чем использовать их в диаграмме.
2. Segmenting principle: дробить на короткие самодостаточные части.
3. Faded scaffolding между секциями.
4. Threshold-проверки: перед следующей секцией задать 1 retrieval-вопрос, проверяющий ключевой концепт.

---

## Направление 2. Декомпозиция крупной темы на подтемы

### 2.1 Chunking и оптимальный размер атомарной статьи
Miller (1956) — 7±2; Cowan (2001, *Behavioral and Brain Sciences* 24:87–185) — 4±1 при контроле rehearsal/chunking; Mathy & Feldman (2012, *Cognition*) показывают, что обе цифры верны для разных величин (4±1 — число чанков, 7±2 — длина последовательности после компрессии). Для образовательного дизайна это означает: **новая статья должна вводить не более 4±1 новых концептов**; если их больше — статью надо разделить.

Эмпирическая длина «удобной для прочтения за один присест» технической статьи — 1500–3000 слов (≈10–20 минут чтения); это согласуется с segmenting principle Mayer'a и practical опытом MDN, web.dev (модули по ~5–10 мин), Brilliant (5–15 мин/урок).

### 2.2 Concept maps и prerequisite knowledge graphs
Novak & Cañas (2006) — концепт-карты как визуализация связей. Современная работа над **Educational Knowledge Graphs (EduKG)** — Manrique, Pereira & Mariño (2019, *Smart Learning Environments* 6:1–18); Wang et al. (2016) — извлечение concept maps из учебников; Pan et al. (2017) — supervised prereq prediction на MOOC. Свежие 2024–2025 работы (ACE, *JEDM*; CourseMapper 2025, arXiv:2509.05393) автоматизируют построение DAG'ов. Bijl (2025, arXiv:2504.16966) — «Concept/Skill Tree framework».

**Применение:** «Как работает интернет» должен иметь явный DAG в репо/в навигации:
```
Bits → Frames (Ethernet) → Packets (IP) ↘
                                          → TCP segment → HTTP request → TLS → DNS
        Routing ↗                        ↗
```
Каждый узел — статья; рёбра — кликабельные prerequisite-индикаторы. Roadmap.sh — это и есть рендеринг такого DAG'а на canvas.

### 2.3 Hierarchical Task Analysis и modular curriculum design
HTA (Annett & Duncan, 1967) и её современная educational версия — van Merriënboer's 4C/ID model (2002, 2018) — предписывают: декомпозируйте до уровня, на котором задачу можно решить за один cognitive act. 4C/ID специально критикует «topic-by-topic» подход и продвигает **whole-task practice**: даже в начале студент решает упрощённый, но полный сценарий, а не упражняется только в подзадачах. Для веб-гайда: каждая «подстатья» — не только теория, но и микро-кейс end-to-end (даже примитивный).

### 2.4 Schema theory и mental models
Sweller (1988) — schema acquisition как цель обучения. Rist (1989, *Cognitive Science* 13:389–414) — schema creation in programming. На практике: при декомпозиции тем **полагайтесь на существующие схемы читателя** (метафоры «звонок», «почта», «адрес»). Refactoring.Guru — образцовое использование: «реальная аналогия» предшествует UML.

### 2.5 Card sorting и information architecture
Spencer (*Card Sorting*, 2009) — стандарт для построения IA. Для образовательного сайта это даёт два важных вывода: (1) сортируют *учащиеся*, а не дизайнеры; (2) hybrid card sort выявляет, какие концепты читатели объединяют (что часто противоречит формальной таксономии RFC).

### 2.6 Modularity и границы темы
Принцип, согласующий 4C/ID, schema theory и Cowan: вынесите в отдельную статью, если (а) предмет имеет собственный prereq-набор, (б) вводит ≥1 threshold-концепт, (в) ссылается из ≥2 других статей. Иначе — оставьте в исходной статье как expandable disclosure блок.

---

## Направление 3. Баланс текста и инфографики

### 3.1 15 принципов Mayer (Multimedia Learning, 3rd ed., 2021)
Основа — Cognitive Theory of Multimedia Learning (CTML). Свыше 200 экспериментов; перечисляю с медианными effect sizes из *Cambridge Handbook of Multimedia Learning* (Mayer & Fiorella, 2014, 2022):

**Сокращение extraneous load:**
- *Coherence* (исключить лишнее): 23/23 экспериментов, median d=0.86.
- *Signaling* (выделение важного): 24/28, d=0.41.
- *Redundancy* (не дублировать текст голосом+на экране): 16/16, d=0.86.
- *Spatial contiguity* (текст рядом с картинкой): 22/22, d=1.10.
- *Temporal contiguity* (синхронность анимации и нарратива): 9/9, d=1.22.

**Управление essential load:** Segmenting, Pre-training, Modality.
**Foster generative:** Multimedia, Personalization, Voice, Embodiment, Guided Discovery, Self-Explanation, Drawing.

### 3.2 Когда диаграмма ЛУЧШЕ текста
Larkin & Simon (1987, *Cognitive Science* 11:65–99, «Why a Diagram is (Sometimes) Worth Ten Thousand Words») — формальное доказательство: диаграммы экономят шаги поиска информации, когда нужно проследить связи между элементами с фиксированной топологией. Это **ровно случай протоколов и системной архитектуры**:
- **OSI/TCP-IP стек** — слойная диаграмма строго лучше.
- **Формат пакета (IP header, TCP segment)** — таблица/«packet diagram» лучше прозы.
- **Топология запроса (browser → resolver → root → TLD → auth → server)** — направленный граф.

### 3.3 Когда диаграмма ХУЖЕ или избыточна
- **Redundancy effect** (Kalyuga, Chandler, Sweller 1999; Mayer 2014): если ту же информацию даёт чёткий текст рядом, диаграмма дублирует.
- **Split-attention effect** (Sweller & Chandler 1994): если диаграмма требует постоянного перевода взгляда на легенду/текст внизу — лучше один интегрированный объект или просто текст.
- **Expertise reversal на диаграммах**: для эксперта длинная пошаговая диаграмма TCP handshake — extraneous load; ему нужен compact reference.

### 3.4 Animation vs static
Tversky, Bauer-Morrison & Bétrancourt (2002, *International Journal of Human-Computer Studies* 57:247–262, «Animation: can it facilitate?») — нет робастного преимущества анимации над статикой при контроле количества информации. Höffler & Leutner (2007, *Learning and Instruction* 17(6):722–738) метаанализ 26 первичных исследований / 76 парных сравнений: **mean weighted effect size d = 0.37 (95% CI 0.25–0.49)** в пользу анимации. Berney & Bétrancourt (2016, *Computers & Education* 101:150–167) метаанализ 140 сравнений (N=7036): **g=0.226 (95% CI 0.12–0.33)** в пользу анимации, существенно выше при **system-paced** (g=0.31), **с аудио-нарративом** (g=0.34), **без сопровождающего текста** (g=0.88). Ploetzner et al. (2020) и Schwan/Garsoffky подчёркивают: анимации выигрывают, когда нужно показать **microsteps изменения во времени** (TCP slow start, DNS race) — иначе серия из 3–4 статичных кадров не хуже.

**Применение:** TCP handshake — короткая анимация с пользовательским контролем play/pause/step (system-paced побеждает learner-paced при низком prior knowledge). DNS resolution — пошаговая статика с подсветкой текущего шага лучше непрерывной анимации (микрошаги дискретны — Tversky). OSI стек — статика с интерактивным раскрытием слоя.

### 3.5 Interactive vs passive
Plass, Homer & Hayward (2009) и Roth & Mavin (*Computers & Education*, 2015): interactive simulations превосходят пассивные при условии **scaffolded interactivity** (не «вот вам слайдеры, играйте», а с направляющими вопросами). Bétrancourt (2005, *Cambridge Handbook*) — interactivity без guidance может ухудшать low-prior-knowledge learners. Вывод для гайда: каждая интерактивная диаграмма должна сопровождаться явным заданием «попробуй задать MSS=1, что произойдёт?».

### 3.6 Signaling, цветовое кодирование, типографика
Signaling principle (van Gog 2014, Mayer 2014) — стрелки, контуры, цветовые акценты повышают результат с d≈0.41. Дополнительно: Ware (*Information Visualization: Perception for Design*, 4th ed. 2020) — для технических диаграмм используйте максимум 5–7 категорий цвета (предел pre-attentive processing); резервируйте цвет для семантики (красный=ошибка/блокировка, зелёный=ACK/успех), а не декорации. Типографика: моноширинный шрифт для байт/полей пакетов; serif — для длинной прозы (улучшает sustained reading, см. Beier & Larson 2010); sans-serif — для UI элементов.

### 3.7 Какие концепты лучше передаются текстом
- **Определения и инварианты** («HTTP is stateless») — текст; диаграмма не добавляет.
- **Trade-offs и контекстные решения** («когда выбирать UDP») — текст + табличка.
- **История и motivation** («почему HTTP/2 заменил pipelining») — нарратив.
Диаграммы добавляйте только когда они уменьшают search cost (Larkin & Simon) или показывают изменение во времени, которое трудно нарисовать словами.

---

## Направление 4. Высококачественные референсы (детальный разбор)

### 4.1 High Performance Browser Networking (Ilya Grigorik, O'Reilly 2013, hpbn.co)
**Хорошо:** канонический pedagogical arc для сетей — latency primer → TCP → TLS → mobile → HTTP/1.1 → HTTP/2 → WebSocket → WebRTC. Каждый протокол объясняется в порядке «зачем → как → ограничения → tuning» — это spiral curriculum Бруннера в действии. Бесплатная HTML-версия с фиксированными anchor-якорями. Глубина и breadth уникальны.
**Заимствовать:** pattern «зачем → как → tuning»; мотивационная вставка «Performance is a feature» перед каждым разделом.
**Слабо/устарело:** последнее обновление 2013, HTTP/3/QUIC отсутствуют, 5G не покрыт, мобильная часть устарела; отзывы (Goodreads) отмечают неровную глубину — TCP-глава великолепна, но «не книга для глубокого изучения TCP». Никакой интерактивности.
**Стек:** HTML-версия — статика, источник — O'Reilly Atlas.

### 4.2 Refactoring.Guru (Alexander Shvets)
**Хорошо:** жёсткий повторяющийся template для каждой страницы (Intent → Problem → Solution → Real-World Analogy → Structure UML → Pseudocode → Applicability → Implementation steps → Pros/Cons → Relations). Это формирует у читателя schema (Sweller) после 2–3 страниц. Многоязычные code tabs из одной канонической pseudocode. Bidirectional cross-links между паттернами создают граф.
**Заимствовать:** template-driven uniformity (для нас: каждый протокол — Intent → Problem → On-the-wire format → State machine → Failure modes → Tuning → Relations); analogy-before-formalism; «pros/cons» с явным «когда НЕ использовать».
**Слабо:** один автор → медленные обновления; примеры в Java/C#/PHP; нет интерактивности (нельзя запустить код); paywall на e-book.
**Стек:** PHP + Bootstrap + jQuery; GitHub-репы с per-language реализациями.

### 4.3 Roadmap.sh (Kamran Ahmed)
**Хорошо:** карьерный путь как **dependency-граф на одном canvas**, а не линейная книга; цветовая кодировка обязательного/опционального; клик по ноде → панель с ресурсами (progressive disclosure); чекбоксы прогресса в localStorage; community-driven через PR. Согласно собственной главной странице roadmap.sh (май 2026): «Rank out of 28M! 355K GitHub Stars — Star us on GitHub» — это входит в top-tier open-source проектов на GitHub.
**Заимствовать:** «одна большая визуальная карта = оглавление»; checkbox-прогресс прямо на карте; разделение beginner / full roadmap.
**Слабо:** карта может пугать абсолютных новичков; качество описаний неоднородное; некоторые ноды — только названия без объяснения «почему именно тут»; недавние AI-сгенерированные мини-курсы рискуют галлюцинациями.
**Стек:** Astro + React + TypeScript + Tailwind; SVG-рендер из JSON.

### 4.4 Crafting Interpreters (Bob Nystrom, craftinginterpreters.com)
**Хорошо:** Один язык (Lox) — две реализации (Java tree-walking → C bytecode VM). Это эталонный **spiral curriculum**: вторая часть переосмысливает ту же проблему на другом уровне абстракции. Каждая строка финального кода появляется в книге с диффами-callout'ами и стрелками «вставьте сюда». В конце каждой главы — «Challenges» (расширения) и «Design Notes» (трейдоффы языкового дизайна).
**Заимствовать:** code-weaving — показывайте *где именно* в существующем файле появляется новая строка; sidebar-блоки «Challenge» + «Design Notes» в каждой подстатье; повторный проход на другом уровне абстракции.
**Слабо:** никакой интерактивности (нельзя запустить в браузере); ~640 страниц — тяжело на мобильном; нет интерактивных диаграмм AST/heap; single-pass compiler — спорное педагогическое решение (рецензия Eli Bendersky).
**Стек:** свой SSG на Dart (изначально Python), Markdown + code snippet markers `^code`, Sass + Jinja2.

### 4.5 Operating Systems: Three Easy Pieces (OSTEP, Arpaci-Dusseaus)
**Хорошо:** Вся область OS — в три «пиллара» (Virtualization / Concurrency / Persistence). Каждая глава 15–25 страниц, начинается с «**The crux of the problem**» — формулировки вопроса. Диалоги Professor/Student как разгрузка. Python-симуляторы для CPU scheduling, paging — студент крутит параметры и наблюдает поведение. Бесплатные PDF поглавно.
**Заимствовать:** **трёхпилларная декомпозиция огромной области** — для интернета: «Транспорт / Именование / Семантика приложения»; «**crux**» в начале каждой статьи как мотивация (cognitive hook); Socratic-вставки для разгрузки; параметризуемые мини-симуляторы.
**Слабо:** сайт примитивный (один HTML), 0 web-интерактивности; симуляторы — Python CLI, не embedded; x86-центричный; редкие обновления.
**Стек:** статичный HTML на серверах UW-Madison, LaTeX → PDF.

### 4.6 Distill.pub
**Хорошо:** reactive diagrams как центральная единица — каждое утверждение имеет «ручку» (slider, drag). Большие single-page articles; визуалы first-class. Peer-reviewed, ISSN, CrossRef — мост между академией и популяризацией.
**Заимствовать:** reactive diagrams (для нас: drag «MSS», «RTT» — пересчёт throughput на лету); сериф-типографика + щедрый whitespace для long-form; scrubbing-timeline для процессов.
**Слабо:** Distill объявил **точную дату начала паузы — 2 июля 2021** (Distill Hiatus, DOI: 10.23915/distill.00031): «Starting today Distill will be taking a one year hiatus, which may be extended indefinitely.» Per-article effort огромен → не масштабируется; некоторые интерактивы сломаны на новых браузерах; мобильный опыт плохой.
**Стек:** distill-template (Web Components / lit-html), D3.js, Vue, Idyll; статика.

### 4.7 Nicky Case (ncase.me)
**Хорошо:** «Hook → Gate → Practice → Sandbox» как нарративный паттерн каждой эссе. Procedural rhetoric — *правила* интерактива учат, а не текст. Контент-гейтинг (нельзя проскочить prerequisite). Картунный стиль снижает страх. Sandbox в конце даёт читателю продолжить эксперимент.
**Заимствовать:** четырёхактная структура подстатьи (hook/gate/practice/sandbox); cartoon-style для дружелюбности; «homework problems» как интерактивы.
**Слабо:** каждое эссе — bespoke artifact, нет переиспользуемой инфраструктуры; нет глобальной навигации; flash-era patterns в старых работах; доступность плохая.
**Стек:** vanilla HTML/CSS/JS, Canvas/SVG, иногда p5.js; open-source CC0.

### 4.8 Bartosz Ciechanowski (ciechanow.ski)
**Хорошо:** эталон interactive deep-dives (GPS, Bicycle, Gears, Cameras, Internal Combustion Engine). Каждая статья строится по принципу «начни с очень простого объекта (деревянный ящик) → постепенно вводи факторы (силы, трение, инерция)». Это faded scaffolding и spiral curriculum в чистом виде. Все симуляции — собственный JS без фреймворков; работают мгновенно.
**Заимствовать:** принцип «начни с тривиального объекта в той же системе координат, что и финал»; собственная Canvas/WebGL-инфраструктура для перформанса; постепенное добавление контролов слайдеров.
**Слабо:** один автор → 1–2 статьи в год; нет общей навигации по сайту, кроме списка; нет упражнений/чекпоинтов; неперевозимая на мобильный части (touch-vs-mouse).
**Стек:** custom Canvas/WebGL JS, никаких фреймворков; статика.

### 4.9 web.dev / developers.google.com Learn
**Хорошо:** courses из ~20–30 коротких модулей с унифицированной шапкой (overview, prereqs, time estimate). Embedded live editors (Glitch, CodePen iframe) для CSS/HTML; «Check your understanding» MCQ в конце модуля. Чёткое разделение learning paths (curated) и reference (MDN-style).
**Заимствовать:** уровень metadata (time, prereqs, skill level) на каждой подстатье; per-module knowledge check (1–3 вопроса); тэги.
**Слабо:** качество неровное; пересечение с MDN сбивает; Chrome/Lighthouse bias; codelabs ломаются.
**Стек:** Eleventy + Lit Web Components; codelabs через Claat.

### 4.10 Brilliant.org
**Хорошо:** «learn by doing» через interactive problem-solving micro-lessons; **pretest-then-teach** (вопрос ДО объяснения — «productive struggle»/«desirable difficulty», Bjork); немедленный feedback под конкретный неверный ответ; review-sets со spaced practice.
**Заимствовать:** pretest-before-teach; per-wrong-answer feedback (не просто «неверно», а объяснение конкретного misconception); review-sets, перемешивающие старый материал; одна концепция на один урок.
**Слабо:** paywall; глубина не глубже введения; gamification может казаться манипулятивной; closed-source.
**Стек:** React web + native iOS/Android; closed source.

### 4.11 Beej's Guide to Network Programming
**Хорошо:** dual-mode документ — tutorial-половина + reference-половина в одном источнике. Иронический тон («My First Struct™») делает сухой POSIX-материал съедобным. Все примеры — компилируемые программы целиком, не сниппеты. ASCII-диаграммы struct'ов байт-в-байт.
**Заимствовать:** dual-mode (tutorial + reference one source); полные runnable примеры; humor как pedagogical strategy на сухих темах.
**Слабо:** только static HTML, нет shell в браузере; ASCII-art устарел; нет упражнений; single-page navigation тяжёлая.
**Стек:** Pandoc + XeLaTeX + custom build (bgbspd); статика.

### 4.12 «How HTTPS Works» (DNSimple, howhttps.works)
**Хорошо:** комикс с антропоморфными персонажами (коты-клиенты, мопсы-серверы, краб-атакующий) — характеры как мнемоники; эпизодическая декомпозиция; hover-перевод «pun → real term»; финальный quiz + «Certificat of Completion».
**Заимствовать:** персонажи как мнемоники (можно ввести 5–7 «акторов» интернета — браузер, resolver, router, server, CA); episodic decomposition; printable cert.
**Слабо:** глубина мелкая; нет симуляции handshake; маркетинговый funnel для DNSimple продуктов.
**Стек:** статичный сайт, вероятно Middleman/Jekyll + YAML-driven панели.

### 4.13 MDN Web Docs
**Хорошо:** разделение Learning Area (curated path) и Reference (per-API doc); FED learning pathway (2020) — 3.5–4M pageviews/мес; модульность; community PR-driven; теперь Curriculum (2024). Каждый API-документ имеет одинаковую структуру (Syntax, Parameters, Examples, Specifications, Browser compatibility).
**Заимствовать:** разделение «learning path» vs «reference»; шаблонная структура reference-страницы; компонент Browser Compatibility (для нас — RFC compatibility / browser-vs-server поддержка).
**Слабо:** loosely-structured Learning Area критиковали за отсутствие прогрессии; навигация между Learn и Reference иногда сбивает.
**Стек:** Yari (React SSG); content — Markdown в Git; community PR через GitHub.

---

## Дополнительно: навигация, retrieval, completion

### Навигация в больших обр. сайтах
- **Breadcrumbs** (Nielsen Norman Group, 2018) — повышают findability в hierarchical sites; на сайте с DAG'ом ставьте «текущий путь» + «связанные prereq-узлы».
- **Prerequisite indicators**: чек-марки рядом с ссылками; «complete prereq before reading» как мягкое gate.
- **Difficulty badges** (Junior/Middle/Senior, или ⚙️/⚙️⚙️/⚙️⚙️⚙️) — позволяют читателю калибровать ожидания и не попадать под expertise reversal.
- **Progress tracker**: localStorage + опциональный аккаунт (Roadmap.sh подход).
- **Progressive disclosure** (Nielsen NN/g): «defers advanced or rarely used features to a secondary screen, making applications easier to learn and less error-prone». Применимо к secondary-level контенту в подстатье.

### Retrieval practice и spaced repetition
Karpicke & Roediger (2006, 2008; *Science* 319:966–968, «The Critical Importance of Retrieval for Learning», 2008): retrieval > rereading; spaced retrieval > massed. Roediger & Karpicke (2006, *Perspectives on Psychological Science* 1:181–210) — основа testing effect. Karpicke & Roediger (2007, *J. Exp. Psychol.: LMC* 33(4):704–719) показали: equal-spacing ≥ expanding в long-term retention. Smith & Karpicke (2021): открытый recall эффективнее MCQ. На веб-гайде:
- В конце каждой подстатьи 2–3 открытых retrieval-вопроса.
- «Revisit» blocks через 1 день / 1 неделя / 1 месяц по принципу expanding или equal spacing.
- Cross-link «this was introduced in §X» — embedded retrieval cue.

### Completion rate длинных гайдов
Jordan (2015, *International Review of Research in Open and Distributed Learning* 16(3):341–358) на 221 MOOC: «Completion rates… vary from 0.7% to 52.1%, with a median value of 12.6%»; Jordan (2014) на 42 курсах ранее фиксировал типичный показатель ~5%. Hone & El Said (2016) — sustained engagement коррелирует со структурированным weekly assessment. Sanchez-Gordon & Luján-Mora (*Open Learning* 2019) сравнили версии Study Skills MOOC длительностью 3 и 6 недель: **сокращение длины удвоило engagement и учетверило completion**. Breslow et al. (2013, *Research & Practice in Assessment* 8:13–25) о первом edX-курсе MIT 6.002x «Circuits and Electronics»: «Over 155,000 students initially registered… less than 5% of the students who registered for the course at any one time completed the course».

**Практический вывод:** длинные гайды должны (а) разрешать выход на любом уровне глубины — minimum viable path 30–60 мин; (б) показывать прогресс по pillar'ам; (в) каждый pillar 60–90 мин max; (г) явное «вы прошли минимум» состояние с возможностью продолжать.

### A/B тесты от обр. платформ
Большинство держится приватно. Публичные: Khan Academy опубликовали (через research papers, Murphy et al.) что mastery learning с рандомизированным распределением увеличивает long-term retention. Codecademy через блоги отчитывался об эффектах help-drawers и hints. Доступных детальных публичных A/B данных мало — основная масса в внутренних блогах Duolingo (есть статьи про «learning curves»), Coursera (Reich & Ruipérez-Valiente, *Science* 2019, об «overrepresentation of completers from privileged backgrounds»).

---

## Recommendations (конкретно для гайда «Как работает интернет»)

**Стадия 1 — MVP (1–2 месяца):**
1. **Каркас сайта**: один DAG в стиле Roadmap.sh как главная навигация; три «pillar»-кластера по OSTEP-методу: **Physical/Transport** (frames, IP, TCP/UDP), **Naming/Routing** (DNS, BGP, ARP), **Application Semantics** (HTTP, TLS, WebSocket).
2. **Шаблон подстатьи** (по Refactoring.Guru + OSTEP):
   - The crux (1 вопрос — мотивация)
   - Hook + интуитивная аналогия
   - On-the-wire / mechanism (статика или короткая system-paced анимация)
   - Three-level disclosure: Junior / Middle / Senior (collapse по умолчанию)
   - Retrieval block: 2–3 открытых вопроса
   - Cross-links: prerequisites + «next»
3. **5–7 ключевых подстатей**: OSI, IP, TCP handshake, DNS, HTTP, TLS, HTTP/2 — каждая 1500–3000 слов.
4. Стек: **Astro + MDX + React-компоненты для интерактивов**; SVG/Canvas для диаграмм. Использование TypeScript для виджетов. Отказ от тяжёлого backend — статика + localStorage для прогресса.

**Стадия 2 — Углубление (3–6 месяцев):**
5. **Pre-test gate** в начале каждой статьи (3 вопроса → Junior/Middle/Senior preset) — Kalyuga rapid diagnostic.
6. **Faded WOE** для DNS, маршрутизации, TLS handshake (3 примера: решённый → полусобран → пустой).
7. **Reactive diagrams** для bandwidth/latency/throughput (Distill-style sliders).
8. **TCP handshake** — system-paced animation с play/pause/step.
9. **OSI стек** — интерактивная многослойная диаграмма с раскрытием слоя.
10. **Packet формат** — таблица + hover-tooltip на каждое поле (signaling).

**Стадия 3 — Удержание (6–12 месяцев):**
11. **Spiral re-entries**: 3–4 концепта-«ниток» (encapsulation, multiplexing, statefulness, latency), пронизывающих весь гайд.
12. **Spaced revisit** через email/push (если есть аккаунт) — 1д/1н/1м.
13. **Difficulty badges** + **prerequisite checkmarks** в навигации.
14. **Sandbox** в стиле Nicky Case в конце pillar'а (например, «сконструируй свой DNS resolver»).

### Бенчмарки, которые меняют рекомендации
- **Completion rate minimum path < 40%** → сократить hook; добавить progress visualization; пересмотреть длину pillar'а.
- **Retrieval pass rate < 70%** → статья слишком плотная или неверно расположена в DAG'е; дробить или менять prereq'ы.
- **Время на странице < 60% от ожидаемого** → pre-test видимо отправил не на тот уровень; пересмотреть Kalyuga calibration.
- **Время > 200%** → слишком много open-ended; ввести scaffolding или faded WOE.
- **Bounce rate с landing > 70%** → DAG-карта пугает абсолютных новичков; ввести гайдед onboarding «5-минутный тур интернета».

---

## Caveats

- Бóльшая часть Mayer-effect sizes получена в лабораторных экспериментах с короткими (3–10 мин) учебными материалами; экстраполяция на 2000-словные технические гайды — sound, но не доказанная.
- Threshold concepts критикуют (Rowbottom 2007; Hodge 2019, *Teaching in Higher Education*) за нестрогую операционализацию; используйте как эвристику для выявления «boss»-страниц, не как формальную теорию.
- Spiral curriculum имеет мало RCT-доказательств за пределами медобразования; опирайтесь на конвергентную поддержку с retrieval / spaced / chunking.
- Distill.pub — мощный референс по форме, но **на паузе с 2 июля 2021**; не копируйте процесс — копируйте артефакты.
- HPBN Grigorik — устарел (2013); используйте структуру, но проверяйте факты против актуальных RFC и HTTP/3-литературы.
- MOOC completion данные не переносимы напрямую на «гайд» (нет жёсткого enrollment): медиана 12.6% (Jordan 2015) служит ориентиром нижней планки, а не прямым целевым показателем.
- Brilliant и closed-source платформы публичных A/B данных не дают; внутренние блоги Codecademy/Khan/Duolingo — единственный относительно открытый источник.
- Single-author проекты (Ciechanowski, Nystrom, Shvets) масштабируют контент медленно; если планируете большой гайд силами 1 человека — закладывайте годы.
- Faded WOE-исследования преимущественно проводились на programming/математике (Shin et al. 2023, 2024); прямая экстраполяция на «network protocol design tasks» — допустимая, но не верифицированная гипотеза, заслуживающая локального A/B-теста.