import type { ReadingUnit } from "~/english/types";

export const b2General: ReadingUnit[] = [
  {
    "id": "b2g-remote-async",
    "level": "B2",
    "stream": "general",
    "title": {
      "en": "Remote Work and Async Communication",
      "ru": "Удалённая работа и асинхронное общение"
    },
    "blurb": {
      "en": "When your team is spread across time zones, every message becomes a tiny act of design.",
      "ru": "Когда ваша команда разбросана по часовым поясам, каждое сообщение превращается в маленький акт проектирования."
    },
    "source": {
      "en": "Blog post",
      "ru": "Блог-пост"
    },
    "passages": [
      {
        "en": "Remote work did not simply move the office online — it changed the fundamental rhythm of collaboration. When everyone sits in the same room, quick questions get quick answers. Online, that same question can sit in a chat thread for hours, blocking whoever asked it.",
        "ru": "Удалённая работа не просто перенесла офис в интернет — она изменила сам ритм совместной работы. Когда все сидят в одной комнате, быстрые вопросы получают быстрые ответы. В онлайне тот же вопрос может часами висеть в чате, блокируя того, кто его задал."
      },
      {
        "en": "The solution most high-performing distributed teams reach is a shift toward async-first communication. Instead of expecting an instant reply, you write messages that carry enough context to be acted on without a follow-up dialog. This feels slower at first, but it actually speeds the whole team up.",
        "ru": "Решение, к которому приходят большинство высокоэффективных распределённых команд, — переход к асинхронному общению как основному режиму. Вместо ожидания мгновенного ответа вы пишете сообщения, которые содержат достаточно контекста, чтобы по ним можно было действовать без дополнительного диалога. Поначалу это кажется медленнее, но на самом деле ускоряет всю команду."
      },
      {
        "en": "A practical rule is to treat every message as a small specification. Include the why, not just the what. If you are asking someone to change a configuration, explain the reason, show the expected output, and specify who needs to review the result. The receiver can then act completely independently.",
        "ru": "Практическое правило — воспринимать каждое сообщение как маленькую спецификацию. Включайте причину, а не только суть задачи. Если вы просите кого-то изменить конфигурацию, объясните причину, покажите ожидаемый результат и укажите, кто должен проверить итог. Получатель сможет действовать полностью самостоятельно."
      },
      {
        "en": "Teams that master async communication often discover an unexpected benefit: a natural log of decisions. Every important discussion lives in a searchable thread, not in someone's memory or a meeting that was never recorded. New team members can read through months of context in an afternoon.",
        "ru": "Команды, освоившие асинхронное общение, нередко обнаруживают неожиданное преимущество: естественный журнал решений. Каждое важное обсуждение хранится в доступном для поиска треде, а не в чьей-то памяти или на совещании, которое никто не записал. Новые участники команды могут за один день прочитать месяцы контекста."
      }
    ],
    "phrases": [
      {
        "id": "b2g-remote-async-p1",
        "en": "async-first communication",
        "ru": "асинхронное общение как приоритет",
        "note": {
          "en": "An approach where messages do not require an instant reply.",
          "ru": "Подход, при котором сообщения не требуют мгновенного ответа."
        }
      },
      {
        "id": "b2g-remote-async-p2",
        "en": "carry enough context",
        "ru": "содержать достаточно контекста",
        "note": {
          "en": "Include all information so the reader can act without asking more questions.",
          "ru": "Включить всю информацию, чтобы читатель мог действовать без дополнительных вопросов."
        }
      },
      {
        "id": "b2g-remote-async-p3",
        "en": "natural log of decisions",
        "ru": "естественный журнал решений",
        "note": {
          "en": "A record of choices that builds up automatically through written communication.",
          "ru": "Запись решений, которая формируется автоматически в процессе письменного общения."
        }
      }
    ],
    "questions": [
      {
        "id": "b2g-remote-async-q1",
        "q": {
          "en": "According to the passage, what is the main advantage of async-first communication for a distributed team?",
          "ru": "Согласно тексту, в чём главное преимущество асинхронного общения для распределённой команды?"
        },
        "options": [
          {
            "en": "It eliminates the need for any meetings.",
            "ru": "Оно устраняет необходимость в любых встречах."
          },
          {
            "en": "It speeds up the whole team even though individual replies feel slower.",
            "ru": "Оно ускоряет всю команду, хотя отдельные ответы кажутся медленнее."
          },
          {
            "en": "It makes hiring new team members much easier.",
            "ru": "Оно значительно упрощает найм новых сотрудников."
          },
          {
            "en": "It removes the need to write documentation.",
            "ru": "Оно устраняет необходимость писать документацию."
          }
        ],
        "answer": 1,
        "explain": {
          "en": "The passage states that writing async messages 'feels slower at first, but it actually speeds the whole team up.'",
          "ru": "В тексте сказано, что написание асинхронных сообщений «поначалу кажется медленнее, но на самом деле ускоряет всю команду»."
        }
      },
      {
        "id": "b2g-remote-async-q2",
        "q": {
          "en": "What does the author compare a well-written async message to?",
          "ru": "С чем автор сравнивает хорошо написанное асинхронное сообщение?"
        },
        "options": [
          {
            "en": "A meeting agenda",
            "ru": "Повестке дня совещания"
          },
          {
            "en": "A small specification",
            "ru": "Маленькой спецификации"
          },
          {
            "en": "A broadcast message",
            "ru": "Широковещательному сообщению"
          },
          {
            "en": "A formal report",
            "ru": "Официальному отчёту"
          }
        ],
        "answer": 1,
        "explain": {
          "en": "The author writes: 'treat every message as a small specification.'",
          "ru": "Автор пишет: «воспринимайте каждое сообщение как маленькую спецификацию»."
        }
      },
      {
        "id": "b2g-remote-async-q3",
        "q": {
          "en": "What unexpected benefit of async communication does the passage mention?",
          "ru": "Какое неожиданное преимущество асинхронного общения упоминается в тексте?"
        },
        "options": [
          {
            "en": "Decisions are automatically turned into tasks.",
            "ru": "Решения автоматически превращаются в задачи."
          },
          {
            "en": "Team members work fewer hours.",
            "ru": "Члены команды работают меньше часов."
          },
          {
            "en": "A searchable record of decisions is created naturally.",
            "ru": "Естественным образом создаётся доступный для поиска журнал решений."
          },
          {
            "en": "The team needs fewer collaboration tools.",
            "ru": "Команде требуется меньше инструментов для совместной работы."
          }
        ],
        "answer": 2,
        "explain": {
          "en": "The passage says teams discover 'a natural log of decisions' stored in searchable threads.",
          "ru": "В тексте говорится, что команды обнаруживают «естественный журнал решений», хранящийся в тредах с возможностью поиска."
        }
      }
    ],
    "targetWords": [
      "ngsl:2385",
      "ngsl:2224",
      "ngsl:2202",
      "ngsl:2028",
      "ngsl:2252",
      "ngsl:2258"
    ]
  },
  {
    "id": "b2g-deep-work",
    "level": "B2",
    "stream": "general",
    "title": {
      "en": "Deep Work and the Art of Focus",
      "ru": "Глубокая работа и искусство концентрации"
    },
    "blurb": {
      "en": "Constant notifications are the enemy of serious thinking. Protecting your attention is a professional skill.",
      "ru": "Постоянные уведомления — враг серьёзного мышления. Защита своего внимания — это профессиональный навык."
    },
    "source": {
      "en": "Essay",
      "ru": "Эссе"
    },
    "passages": [
      {
        "en": "The modern knowledge worker is interrupted, on average, every eleven minutes. After each interruption, it takes roughly twenty minutes to return to the same depth of focus. If you do the arithmetic, a typical eight-hour day contains almost no time for genuinely difficult thinking.",
        "ru": "Современный работник умственного труда отвлекается в среднем каждые одиннадцать минут. После каждого прерывания требуется примерно двадцать минут, чтобы вернуться к прежней глубине концентрации. Если посчитать, в типичном восьмичасовом рабочем дне практически не остаётся времени для по-настоящему сложного мышления."
      },
      {
        "en": "Cal Newport, who popularised the term 'deep work', defines it as professional activity performed in a state of distraction-free concentration that pushes your cognitive abilities to their limit. The key insight is that this state is not a luxury — it is the mode in which most valuable, hard-to-replicate work gets done.",
        "ru": "Кэл Ньюпорт, который популяризировал термин «глубокая работа», определяет её как профессиональную деятельность, выполняемую в состоянии концентрации без отвлечений, доводящей ваши когнитивные способности до предела. Ключевая мысль состоит в том, что это состояние — не роскошь, а режим, в котором создаётся большинство ценных и труднокопируемых результатов."
      },
      {
        "en": "Achieving deep work requires deliberate scheduling, not willpower. Reserve your highest-energy hours for hard problems. Treat these blocks as immovable, just as you would an important meeting. Turn off notifications, close extra browser tabs, and specify a clear goal for each session.",
        "ru": "Достижение состояния глубокой работы требует осознанного планирования, а не силы воли. Резервируйте самые продуктивные часы для сложных задач. Относитесь к этим блокам как к неотменяемым, так же как к важной встрече. Отключите уведомления, закройте лишние вкладки браузера и поставьте чёткую цель для каждой сессии."
      },
      {
        "en": "There is a counterintuitive parallel here with physical training: rest is as important as effort. Shallow tasks — answering email, attending routine meetings — are not wasted time if you schedule them deliberately. They give your focused attention time to recover before the next deep session.",
        "ru": "Здесь есть неочевидная параллель с физическими тренировками: отдых так же важен, как и усилие. Поверхностные задачи — ответы на письма, участие в плановых совещаниях — не являются потерянным временем, если вы сознательно их планируете. Они дают вашему сфокусированному вниманию время восстановиться перед следующей глубокой сессией."
      },
      {
        "en": "Developers who practise deep work consistently report not only higher output but also stronger job satisfaction. When you can see the direct connection between a concentrated hour and a genuinely hard problem solved, work feels meaningful in a way that a day of meetings rarely does.",
        "ru": "Разработчики, которые регулярно практикуют глубокую работу, отмечают не только более высокую производительность, но и большую удовлетворённость работой. Когда вы видите прямую связь между часом концентрации и решённой по-настоящему сложной задачей, работа приобретает смысл, который редко даёт день, проведённый на совещаниях."
      }
    ],
    "phrases": [
      {
        "id": "b2g-deep-work-p1",
        "en": "distraction-free concentration",
        "ru": "концентрация без отвлечений",
        "note": {
          "en": "A mental state where no interruptions are allowed.",
          "ru": "Состояние сосредоточенности, при котором никакие прерывания не допускаются."
        }
      },
      {
        "id": "b2g-deep-work-p2",
        "en": "deliberate scheduling",
        "ru": "осознанное планирование",
        "note": {
          "en": "Intentionally setting aside specific time blocks for important activities.",
          "ru": "Намеренное выделение определённых временных блоков для важных дел."
        }
      },
      {
        "id": "b2g-deep-work-p3",
        "en": "hard-to-replicate work",
        "ru": "труднокопируемые результаты",
        "note": {
          "en": "Output that requires rare skill and cannot be easily reproduced by others.",
          "ru": "Результаты, требующие редких навыков и не поддающиеся лёгкому воспроизведению другими."
        }
      }
    ],
    "questions": [
      {
        "id": "b2g-deep-work-q1",
        "q": {
          "en": "According to the first passage, why is it hard to do deep work in a typical workday?",
          "ru": "Согласно первому абзацу, почему сложно заниматься глубокой работой в обычный рабочий день?"
        },
        "options": [
          {
            "en": "Workers are not motivated enough.",
            "ru": "Работники недостаточно мотивированы."
          },
          {
            "en": "The working day is too short.",
            "ru": "Рабочий день слишком короткий."
          },
          {
            "en": "Frequent interruptions consume the time needed to regain focus.",
            "ru": "Частые прерывания поглощают время, необходимое для восстановления концентрации."
          },
          {
            "en": "Most tasks do not require serious thinking.",
            "ru": "Большинство задач не требуют серьёзного мышления."
          }
        ],
        "answer": 2,
        "explain": {
          "en": "The passage explains that interruptions happen every 11 minutes and recovery takes 20 minutes, leaving almost no time for deep thinking.",
          "ru": "В тексте объясняется, что прерывания происходят каждые 11 минут, а восстановление занимает 20 минут, что практически не оставляет времени для глубокого мышления."
        }
      },
      {
        "id": "b2g-deep-work-q2",
        "q": {
          "en": "What does the author say is the key to achieving deep work?",
          "ru": "Что, по мнению автора, является ключом к достижению состояния глубокой работы?"
        },
        "options": [
          {
            "en": "Strong willpower and self-discipline",
            "ru": "Сильная воля и самодисциплина"
          },
          {
            "en": "Deliberate scheduling of focused time blocks",
            "ru": "Осознанное планирование сфокусированных временных блоков"
          },
          {
            "en": "Working longer hours than colleagues",
            "ru": "Работа большее количество часов, чем коллеги"
          },
          {
            "en": "Avoiding all meetings completely",
            "ru": "Полный отказ от участия в совещаниях"
          }
        ],
        "answer": 1,
        "explain": {
          "en": "The author states: 'Achieving deep work requires deliberate scheduling, not willpower.'",
          "ru": "Автор утверждает: «Достижение состояния глубокой работы требует осознанного планирования, а не силы воли»."
        }
      },
      {
        "id": "b2g-deep-work-q3",
        "q": {
          "en": "What does the author compare deep work practice to?",
          "ru": "С чем автор сравнивает практику глубокой работы?"
        },
        "options": [
          {
            "en": "Writing a daily journal",
            "ru": "Ведению ежедневного дневника"
          },
          {
            "en": "Physical training, where rest is as important as effort",
            "ru": "Физическим тренировкам, где отдых так же важен, как усилие"
          },
          {
            "en": "Playing a musical instrument",
            "ru": "Игре на музыкальном инструменте"
          },
          {
            "en": "Managing a large project",
            "ru": "Управлению крупным проектом"
          }
        ],
        "answer": 1,
        "explain": {
          "en": "The passage says 'there is a counterintuitive parallel here with physical training: rest is as important as effort.'",
          "ru": "В тексте говорится: «здесь есть неочевидная параллель с физическими тренировками: отдых так же важен, как и усилие»."
        }
      },
      {
        "id": "b2g-deep-work-q4",
        "q": {
          "en": "According to the last passage, what do developers who practise deep work report?",
          "ru": "Что, согласно последнему абзацу, отмечают разработчики, практикующие глубокую работу?"
        },
        "options": [
          {
            "en": "Higher output but lower job satisfaction",
            "ru": "Более высокую производительность, но меньшую удовлетворённость работой"
          },
          {
            "en": "Higher output and stronger job satisfaction",
            "ru": "Более высокую производительность и бо́льшую удовлетворённость работой"
          },
          {
            "en": "Less stress but the same output",
            "ru": "Меньший стресс, но ту же производительность"
          },
          {
            "en": "Better relationships with colleagues",
            "ru": "Лучшие отношения с коллегами"
          }
        ],
        "answer": 1,
        "explain": {
          "en": "The passage explicitly states 'higher output but also stronger job satisfaction.'",
          "ru": "В тексте прямо говорится: «более высокую производительность, но и большую удовлетворённость работой»."
        }
      }
    ],
    "targetWords": [
      "ngsl:2202",
      "ngsl:2324",
      "ngsl:2277",
      "ngsl:2252",
      "ngsl:2102",
      "ngsl:2029"
    ]
  },
  {
    "id": "b2g-burnout-pace",
    "level": "B2",
    "stream": "general",
    "title": {
      "en": "Burnout and the Sustainable Pace",
      "ru": "Выгорание и устойчивый темп работы"
    },
    "blurb": {
      "en": "Burning out is not a badge of honour. It is an engineering failure — and it is preventable.",
      "ru": "Выгорание — это не знак отличия. Это инженерная ошибка — и её можно предотвратить."
    },
    "source": {
      "en": "Opinion piece",
      "ru": "Авторская колонка"
    },
    "passages": [
      {
        "en": "Burnout in software engineering tends to arrive quietly. You stop feeling curious about problems you used to find fascinating. Code review feels like a burden, not a conversation. You submit work you know is mediocre because you simply do not have the energy to make it better.",
        "ru": "Выгорание в разработке программного обеспечения, как правило, наступает незаметно. Вы перестаёте испытывать любопытство к задачам, которые раньше казались вам захватывающими. Ревью кода ощущается как обуза, а не как диалог. Вы сдаёте работу, которую сами считаете посредственной, потому что у вас просто нет сил сделать её лучше."
      },
      {
        "en": "The most common cause is not a single dramatic crisis but a slow accumulation of tension without adequate recovery. You work a slightly long week, then another, then several more. Each week your recovery debt grows, and at some point the body and mind refuse to pretend everything is fine.",
        "ru": "Наиболее распространённая причина — не один драматический кризис, а медленное накопление напряжения без достаточного восстановления. Вы работаете чуть больше недели, потом ещё, потом ещё несколько. С каждой неделей ваш «долг восстановления» растёт, и в какой-то момент тело и разум отказываются делать вид, что всё в порядке."
      },
      {
        "en": "A sustainable pace means working at a rate you could maintain, without damage, for years. Extreme Programming formulated this explicitly: a team that works sustainable hours is more productive in the long run than a team that sprints constantly. The key phrase is 'long run' — most burnout arguments are lost because we compare the short-term output of crunch against the long-term output of sustainable pace.",
        "ru": "Устойчивый темп означает работу в таком режиме, который вы могли бы поддерживать без ущерба для себя годами. Экстремальное программирование сформулировало это явно: команда, работающая в устойчивом ритме, в долгосрочной перспективе продуктивнее команды, которая постоянно работает в авральном режиме. Ключевое словосочетание — «долгосрочная перспектива»: большинство споров о выгорании проигрываются потому, что мы сравниваем краткосрочный результат аврала с долгосрочным результатом устойчивого темпа."
      },
      {
        "en": "Recovery is not just sleep. Social connection, physical movement, and genuine leisure — activities with no productive goal — all restore cognitive capacity in ways that rest alone cannot. Engineers who eliminate every non-work activity in the name of efficiency are, ironically, eliminating the very inputs that make their work possible.",
        "ru": "Восстановление — это не только сон. Социальные связи, физическая активность и настоящий досуг — занятия без какой-либо продуктивной цели — восстанавливают когнитивные способности так, как один лишь отдых не может. Инженеры, которые во имя эффективности устраняют все нерабочие занятия, иронически устраняют те самые составляющие, которые делают их работу возможной."
      }
    ],
    "phrases": [
      {
        "id": "b2g-burnout-pace-p1",
        "en": "recovery debt",
        "ru": "долг восстановления",
        "note": {
          "en": "Accumulated fatigue caused by not resting enough over time.",
          "ru": "Накопленная усталость, вызванная недостаточным отдыхом на протяжении длительного времени."
        }
      },
      {
        "id": "b2g-burnout-pace-p2",
        "en": "sustainable pace",
        "ru": "устойчивый темп",
        "note": {
          "en": "A work rate that can be maintained indefinitely without causing harm.",
          "ru": "Темп работы, который можно поддерживать бесконечно без ущерба для здоровья."
        }
      },
      {
        "id": "b2g-burnout-pace-p3",
        "en": "genuine leisure",
        "ru": "настоящий досуг",
        "note": {
          "en": "Free time spent on activities with no productive goal.",
          "ru": "Свободное время, проводимое за занятиями без какой-либо продуктивной цели."
        }
      }
    ],
    "questions": [
      {
        "id": "b2g-burnout-pace-q1",
        "q": {
          "en": "According to the passage, what is the most common cause of burnout?",
          "ru": "Согласно тексту, какова наиболее распространённая причина выгорания?"
        },
        "options": [
          {
            "en": "A single large professional failure",
            "ru": "Один крупный профессиональный провал"
          },
          {
            "en": "Slow accumulation of tension without adequate recovery",
            "ru": "Медленное накопление напряжения без достаточного восстановления"
          },
          {
            "en": "Working in a toxic team environment",
            "ru": "Работа в токсичной командной среде"
          },
          {
            "en": "Lack of interesting technical challenges",
            "ru": "Отсутствие интересных технических задач"
          }
        ],
        "answer": 1,
        "explain": {
          "en": "The passage states: 'The most common cause is not a single dramatic crisis but a slow accumulation of tension without adequate recovery.'",
          "ru": "В тексте говорится: «Наиболее распространённая причина — не один драматический кризис, а медленное накопление напряжения без достаточного восстановления»."
        }
      },
      {
        "id": "b2g-burnout-pace-q2",
        "q": {
          "en": "Why does the author say burnout arguments are often 'lost'?",
          "ru": "Почему автор говорит, что споры о выгорании часто «проигрываются»?"
        },
        "options": [
          {
            "en": "Because managers do not believe burnout is real",
            "ru": "Потому что руководители не верят в реальность выгорания"
          },
          {
            "en": "Because crunch mode is always more effective",
            "ru": "Потому что авральный режим всегда эффективнее"
          },
          {
            "en": "Because short-term crunch output is compared to long-term sustainable output unfairly",
            "ru": "Потому что краткосрочный результат аврала несправедливо сравнивается с долгосрочным результатом устойчивого темпа"
          },
          {
            "en": "Because engineers cannot measure their own productivity",
            "ru": "Потому что инженеры не могут измерить собственную производительность"
          }
        ],
        "answer": 2,
        "explain": {
          "en": "The passage says 'most burnout arguments are lost because we compare the short-term output of crunch against the long-term output of sustainable pace.'",
          "ru": "В тексте сказано: «большинство споров о выгорании проигрываются потому, что мы сравниваем краткосрочный результат аврала с долгосрочным результатом устойчивого темпа»."
        }
      },
      {
        "id": "b2g-burnout-pace-q3",
        "q": {
          "en": "What irony does the author point out about engineers who eliminate all non-work activities?",
          "ru": "Какую иронию автор указывает в отношении инженеров, устраняющих все нерабочие занятия?"
        },
        "options": [
          {
            "en": "They end up working fewer total hours.",
            "ru": "В итоге они работают меньше часов в сумме."
          },
          {
            "en": "They remove the very things that make their work possible.",
            "ru": "Они устраняют именно то, что делает их работу возможной."
          },
          {
            "en": "They become more creative as a result.",
            "ru": "В результате они становятся более творческими."
          },
          {
            "en": "They are actually happier at work.",
            "ru": "На самом деле они чувствуют себя счастливее на работе."
          }
        ],
        "answer": 1,
        "explain": {
          "en": "The passage states they are 'eliminating the very inputs that make their work possible.'",
          "ru": "В тексте говорится, что они «устраняют те самые составляющие, которые делают их работу возможной»."
        }
      }
    ],
    "targetWords": [
      "ngsl:2073",
      "ngsl:2069",
      "ngsl:2084",
      "ngsl:2252",
      "ngsl:2064",
      "ngsl:2098"
    ]
  },
  {
    "id": "b2g-learning-to-learn",
    "level": "B2",
    "stream": "general",
    "title": {
      "en": "Learning How to Learn",
      "ru": "Учиться учиться"
    },
    "blurb": {
      "en": "Reading a chapter twice is comfortable but almost useless. The science of memory points in a very different direction.",
      "ru": "Перечитывать главу дважды комфортно, но почти бесполезно. Наука о памяти указывает совершенно в другом направлении."
    },
    "source": {
      "en": "Long-form article",
      "ru": "Лонгрид"
    },
    "passages": [
      {
        "en": "Most people learn by re-reading and highlighting, two strategies that feel productive but produce very little lasting retention. Cognitive science has repeatedly shown that the feeling of fluency — reading something and thinking 'I understand this' — is a poor proxy for actually being able to recall or apply the material.",
        "ru": "Большинство людей учатся, перечитывая текст и подчёркивая важное — две стратегии, которые кажутся продуктивными, но дают очень мало устойчивого запоминания. Когнитивная наука неоднократно показывала, что ощущение лёгкости понимания — когда читаешь что-то и думаешь «я это понимаю» — плохо предсказывает реальную способность вспомнить или применить материал."
      },
      {
        "en": "The most effective learning technique is retrieval practice: closing the book and trying to recall what you just studied. This feels uncomfortable because you make errors, but those errors are exactly the discovery mechanism that drives long-term memory formation. Every time you struggle to remember something, the memory trace becomes stronger.",
        "ru": "Наиболее эффективная техника обучения — это практика извлечения: закрыть книгу и попытаться вспомнить то, что вы только что изучали. Это некомфортно, потому что вы допускаете ошибки, но именно эти ошибки являются механизмом открытия, который стимулирует формирование долгосрочной памяти. Каждый раз, когда вы с трудом что-то вспоминаете, след памяти становится сильнее."
      },
      {
        "en": "A second powerful technique is spaced repetition — reviewing material at increasing intervals rather than all at once. The principle is simple: revisit a concept just before you would naturally forget it. This exploits the 'forgetting curve' to consolidate knowledge with the minimum amount of review time.",
        "ru": "Вторая мощная техника — интервальное повторение: изучение материала через нарастающие промежутки времени, а не всего за один раз. Принцип прост: возвращайтесь к понятию как раз перед тем, как вы естественным образом его забудете. Это использует «кривую забывания» для закрепления знаний при минимальном времени повторения."
      },
      {
        "en": "For software engineers, these principles translate directly into a learning routine. Instead of watching a tutorial and calling it done, pause every ten minutes and explain the concept in your own words — or better, apply it in code. Use a flashcard system with spaced repetition for language features, algorithms, and design patterns you want to retain permanently.",
        "ru": "Для разработчиков программного обеспечения эти принципы напрямую переводятся в учебную рутину. Вместо того чтобы просмотреть обучающий видеоролик и считать задачу выполненной, делайте паузу каждые десять минут и объясняйте концепцию своими словами — или, что ещё лучше, применяйте её в коде. Используйте систему карточек с интервальным повторением для возможностей языка, алгоритмов и паттернов проектирования, которые хотите запомнить навсегда."
      },
      {
        "en": "There is a meta-skill above all individual techniques: accurate self-assessment. Most learners are overconfident — they believe they have mastered something after one successful pass. Building the habit of testing yourself before you feel ready is the single most reliable proof that learning has actually occurred.",
        "ru": "Над всеми отдельными техниками стоит метанавык: точная самооценка. Большинство обучающихся самонадеянны — они считают, что овладели чем-то после одного успешного прохождения. Выработка привычки проверять себя до того, как вы почувствуете готовность, — это единственное наиболее надёжное доказательство того, что обучение действительно произошло."
      }
    ],
    "phrases": [
      {
        "id": "b2g-learning-to-learn-p1",
        "en": "retrieval practice",
        "ru": "практика извлечения",
        "note": {
          "en": "A learning method where you recall information from memory rather than re-reading it.",
          "ru": "Метод обучения, при котором вы воспроизводите информацию из памяти, а не перечитываете её."
        }
      },
      {
        "id": "b2g-learning-to-learn-p2",
        "en": "feeling of fluency",
        "ru": "ощущение лёгкости понимания",
        "note": {
          "en": "The misleading sense that you understand something just because you can follow it as you read.",
          "ru": "Обманчивое ощущение, что вы понимаете что-то только потому, что можете следить за текстом по мере чтения."
        }
      },
      {
        "id": "b2g-learning-to-learn-p3",
        "en": "spaced repetition",
        "ru": "интервальное повторение",
        "note": {
          "en": "Reviewing material at increasing time intervals to maximise retention.",
          "ru": "Повторение материала через нарастающие промежутки времени для максимального запоминания."
        }
      }
    ],
    "questions": [
      {
        "id": "b2g-learning-to-learn-q1",
        "q": {
          "en": "What does the author say about re-reading as a learning strategy?",
          "ru": "Что автор говорит о перечитывании как стратегии обучения?"
        },
        "options": [
          {
            "en": "It is the most reliable way to retain information.",
            "ru": "Это наиболее надёжный способ запоминания информации."
          },
          {
            "en": "It works well for complex technical material.",
            "ru": "Оно хорошо работает для сложного технического материала."
          },
          {
            "en": "It feels productive but produces very little lasting retention.",
            "ru": "Оно кажется продуктивным, но даёт очень мало устойчивого запоминания."
          },
          {
            "en": "It is useful only when combined with highlighting.",
            "ru": "Оно полезно только в сочетании с подчёркиванием."
          }
        ],
        "answer": 2,
        "explain": {
          "en": "The passage states re-reading and highlighting 'feel productive but produce very little lasting retention.'",
          "ru": "В тексте говорится, что перечитывание и подчёркивание «кажутся продуктивными, но дают очень мало устойчивого запоминания»."
        }
      },
      {
        "id": "b2g-learning-to-learn-q2",
        "q": {
          "en": "Why does retrieval practice involve making errors, according to the passage?",
          "ru": "Почему практика извлечения предполагает допущение ошибок, согласно тексту?"
        },
        "options": [
          {
            "en": "Errors show you which material to skip.",
            "ru": "Ошибки показывают, какой материал можно пропустить."
          },
          {
            "en": "Errors are the discovery mechanism that drives long-term memory formation.",
            "ru": "Ошибки являются механизмом открытия, стимулирующим формирование долгосрочной памяти."
          },
          {
            "en": "Errors motivate learners to study harder.",
            "ru": "Ошибки мотивируют учащихся заниматься усерднее."
          },
          {
            "en": "Errors help identify the weakest students.",
            "ru": "Ошибки помогают выявить наименее успевающих учеников."
          }
        ],
        "answer": 1,
        "explain": {
          "en": "The passage says 'those errors are exactly the discovery mechanism that drives long-term memory formation.'",
          "ru": "В тексте говорится: «именно эти ошибки являются механизмом открытия, который стимулирует формирование долгосрочной памяти»."
        }
      },
      {
        "id": "b2g-learning-to-learn-q3",
        "q": {
          "en": "What does the author identify as the most reliable proof that learning has occurred?",
          "ru": "Что автор называет наиболее надёжным доказательством того, что обучение произошло?"
        },
        "options": [
          {
            "en": "Completing a tutorial without pausing",
            "ru": "Завершение учебного курса без пауз"
          },
          {
            "en": "Receiving praise from a mentor",
            "ru": "Похвала от наставника"
          },
          {
            "en": "Testing yourself before you feel ready",
            "ru": "Проверка себя до того, как вы почувствуете готовность"
          },
          {
            "en": "Reading multiple sources on the same topic",
            "ru": "Чтение нескольких источников по одной теме"
          }
        ],
        "answer": 2,
        "explain": {
          "en": "The passage calls 'the habit of testing yourself before you feel ready' the 'single most reliable proof that learning has actually occurred.'",
          "ru": "В тексте «привычка проверять себя до того, как вы почувствуете готовность» названа «единственным наиболее надёжным доказательством того, что обучение действительно произошло»."
        }
      }
    ],
    "targetWords": [
      "ngsl:2290",
      "ngsl:2102",
      "ngsl:2019",
      "ngsl:2101",
      "ngsl:2099",
      "ngsl:2029",
      "ngsl:2025"
    ]
  },
  {
    "id": "b2g-decision-uncertainty",
    "level": "B2",
    "stream": "general",
    "title": {
      "en": "Decision-Making Under Uncertainty",
      "ru": "Принятие решений в условиях неопределённости"
    },
    "blurb": {
      "en": "Good decisions and good outcomes are not the same thing. Learning to separate them will make you a much better engineer.",
      "ru": "Хорошие решения и хорошие результаты — это не одно и то же. Умение их разделять сделает вас значительно более сильным инженером."
    },
    "source": {
      "en": "Essay",
      "ru": "Эссе"
    },
    "passages": [
      {
        "en": "Software engineers make dozens of decisions every day under incomplete information: which architecture to choose, which edge case to prioritise, whether to ship now or wait for one more round of testing. Most of these decisions cannot be fully specified in advance — the information simply does not exist yet.",
        "ru": "Разработчики программного обеспечения принимают десятки решений каждый день в условиях неполной информации: какую архитектуру выбрать, какому граничному случаю отдать приоритет, отправить ли продукт сейчас или подождать ещё один раунд тестирования. Большинство из этих решений не могут быть полностью заданы заранее — информации попросту ещё не существует."
      },
      {
        "en": "A useful mental framework is to separate the quality of a decision from the quality of its outcome. A good decision, made with the best available information and sound reasoning, can still lead to a bad outcome due to factors you could not have known. A bad decision can occasionally produce a good outcome by random chance. Judging past decisions only by their outcomes is called 'resulting' and it is one of the most common thinking errors in engineering teams.",
        "ru": "Полезный мысленный фреймворк — отделять качество решения от качества его результата. Хорошее решение, принятое на основе наилучшей доступной информации и здравых рассуждений, всё равно может привести к плохому результату из-за факторов, которые вы не могли знать. Плохое решение иногда случайно приводит к хорошему результату. Оценка прошлых решений исключительно по их результатам называется «результатизмом» и является одной из наиболее распространённых ошибок мышления в инженерных командах."
      },
      {
        "en": "One practical tool is to write down your reasoning at the time you make a decision. When you capture what you knew, what you assumed, and why you chose one option over another, you can later evaluate whether your process was sound — regardless of how things turned out. This habit also makes your thinking visible to teammates and builds a shared decision log.",
        "ru": "Один практический инструмент — записывать своё обоснование в момент принятия решения. Когда вы фиксируете, что вы знали, что предполагали и почему выбрали один вариант вместо другого, вы можете впоследствии оценить, был ли ваш процесс обоснованным — независимо от того, как всё обернулось. Эта привычка также делает ваше мышление видимым для товарищей по команде и формирует общий журнал решений."
      },
      {
        "en": "Another approach is to prefer reversible decisions over irreversible ones whenever possible. If you are genuinely uncertain, choose the option that leaves the most doors open. Commit to the irreversible choice only when the cost of waiting exceeds the benefit of more information. This is not indecision — it is rational risk management.",
        "ru": "Другой подход — по возможности отдавать предпочтение обратимым решениям перед необратимыми. Если вы действительно не уверены, выбирайте вариант, который оставляет максимум возможностей. Переходите к необратимому выбору только тогда, когда цена ожидания превышает выгоду от получения дополнительной информации. Это не нерешительность — это рациональное управление рисками."
      },
      {
        "en": "Finally, get comfortable with the idea that uncertainty is permanent, not temporary. You will never reach a point where every variable is known. The engineers who make the best decisions are not those who eliminate uncertainty — they are those who act confidently on incomplete information while remaining genuinely open to updating their view.",
        "ru": "Наконец, примиритесь с тем, что неопределённость постоянна, а не временна. Вы никогда не достигнете момента, когда будут известны все переменные. Инженеры, принимающие наилучшие решения, — это не те, кто устраняет неопределённость, а те, кто уверенно действует при неполной информации, оставаясь при этом по-настоящему открытым к пересмотру своей точки зрения."
      }
    ],
    "phrases": [
      {
        "id": "b2g-decision-uncertainty-p1",
        "en": "resulting",
        "ru": "результатизм",
        "note": {
          "en": "The error of judging the quality of a decision solely by its outcome.",
          "ru": "Ошибка оценки качества решения исключительно по его результату."
        }
      },
      {
        "id": "b2g-decision-uncertainty-p2",
        "en": "reversible decision",
        "ru": "обратимое решение",
        "note": {
          "en": "A choice that can be undone or changed later if new information emerges.",
          "ru": "Выбор, который можно отменить или изменить позже, если появится новая информация."
        }
      },
      {
        "id": "b2g-decision-uncertainty-p3",
        "en": "sound reasoning",
        "ru": "здравые рассуждения",
        "note": {
          "en": "Logic and analysis that are solid and well-founded, even if the conclusion turns out to be wrong.",
          "ru": "Логика и анализ, которые обоснованы и хорошо проработаны, даже если вывод окажется неверным."
        }
      }
    ],
    "questions": [
      {
        "id": "b2g-decision-uncertainty-q1",
        "q": {
          "en": "What is 'resulting', as defined in the passage?",
          "ru": "Что такое «результатизм» в том смысле, в котором это понятие определяется в тексте?"
        },
        "options": [
          {
            "en": "A method for calculating the expected outcome of a decision",
            "ru": "Метод вычисления ожидаемого результата решения"
          },
          {
            "en": "The error of judging past decisions only by their outcomes",
            "ru": "Ошибка оценки прошлых решений исключительно по их результатам"
          },
          {
            "en": "A technique for making faster decisions under pressure",
            "ru": "Техника принятия более быстрых решений под давлением"
          },
          {
            "en": "The practice of writing down results after a project ends",
            "ru": "Практика записи результатов после завершения проекта"
          }
        ],
        "answer": 1,
        "explain": {
          "en": "The passage defines 'resulting' as 'judging past decisions only by their outcomes' and calls it 'one of the most common thinking errors.'",
          "ru": "В тексте «результатизм» определяется как «оценка прошлых решений исключительно по их результатам» и называется «одной из наиболее распространённых ошибок мышления»."
        }
      },
      {
        "id": "b2g-decision-uncertainty-q2",
        "q": {
          "en": "Why does the author recommend writing down your reasoning when making a decision?",
          "ru": "Почему автор рекомендует записывать своё обоснование при принятии решения?"
        },
        "options": [
          {
            "en": "To impress your manager with your analytical skills",
            "ru": "Чтобы произвести впечатление на руководителя своими аналитическими способностями"
          },
          {
            "en": "To avoid making the same decision twice",
            "ru": "Чтобы не принимать одно и то же решение дважды"
          },
          {
            "en": "So you can later evaluate whether your process was sound, regardless of the outcome",
            "ru": "Чтобы впоследствии оценить, был ли ваш процесс обоснованным, независимо от результата"
          },
          {
            "en": "To reduce the time spent on future decisions",
            "ru": "Чтобы сократить время, затрачиваемое на будущие решения"
          }
        ],
        "answer": 2,
        "explain": {
          "en": "The passage says this 'allows you to later evaluate whether your process was sound — regardless of how things turned out.'",
          "ru": "В тексте говорится, что это «позволяет впоследствии оценить, был ли ваш процесс обоснованным — независимо от того, как всё обернулось»."
        }
      },
      {
        "id": "b2g-decision-uncertainty-q3",
        "q": {
          "en": "What does the author say about engineers who make the best decisions?",
          "ru": "Что автор говорит об инженерах, принимающих наилучшие решения?"
        },
        "options": [
          {
            "en": "They always wait until they have complete information.",
            "ru": "Они всегда ждут, пока не получат полную информацию."
          },
          {
            "en": "They eliminate uncertainty before acting.",
            "ru": "Они устраняют неопределённость перед тем, как действовать."
          },
          {
            "en": "They act confidently on incomplete information while staying open to updating their view.",
            "ru": "Они уверенно действуют при неполной информации, оставаясь открытыми к пересмотру своей точки зрения."
          },
          {
            "en": "They rely on their intuition rather than analysis.",
            "ru": "Они полагаются на интуицию, а не на анализ."
          }
        ],
        "answer": 2,
        "explain": {
          "en": "The passage describes them as engineers who 'act confidently on incomplete information while remaining genuinely open to updating their view.'",
          "ru": "В тексте они описываются как инженеры, которые «уверенно действуют при неполной информации, оставаясь при этом по-настоящему открытыми к пересмотру своей точки зрения»."
        }
      },
      {
        "id": "b2g-decision-uncertainty-q4",
        "q": {
          "en": "When does the author say you should commit to an irreversible decision?",
          "ru": "Когда, по словам автора, следует принимать необратимое решение?"
        },
        "options": [
          {
            "en": "As soon as you have any information at all",
            "ru": "Как только у вас появляется хоть какая-то информация"
          },
          {
            "en": "Only when you are completely certain of the outcome",
            "ru": "Только когда вы полностью уверены в результате"
          },
          {
            "en": "When the cost of waiting exceeds the benefit of more information",
            "ru": "Когда цена ожидания превышает выгоду от получения дополнительной информации"
          },
          {
            "en": "After consulting the whole team",
            "ru": "После консультации со всей командой"
          }
        ],
        "answer": 2,
        "explain": {
          "en": "The passage states: 'Commit to the irreversible choice only when the cost of waiting exceeds the benefit of more information.'",
          "ru": "В тексте сказано: «Переходите к необратимому выбору только тогда, когда цена ожидания превышает выгоду от получения дополнительной информации»."
        }
      }
    ],
    "targetWords": [
      "ngsl:2042",
      "ngsl:2425",
      "ngsl:2430",
      "ngsl:2437",
      "ngsl:2019",
      "ngsl:2324",
      "ngsl:2041"
    ]
  },
  {
    "id": "b2g-open-source-economics",
    "level": "B2",
    "stream": "general",
    "title": {
      "en": "Who Actually Pays for Open Source?",
      "ru": "Кто на самом деле платит за открытый код?"
    },
    "blurb": {
      "en": "Open-source software powers most of the internet, yet the people who write it are often unpaid. This essay examines the economic tension at the heart of the movement.",
      "ru": "Программное обеспечение с открытым исходным кодом лежит в основе большей части интернета, но люди, которые его пишут, нередко работают бесплатно. Этот эссе рассматривает экономическое противоречие в центре движения."
    },
    "source": {
      "en": "Essay",
      "ru": "Эссе"
    },
    "passages": [
      {
        "en": "Open-source software is one of the most remarkable economic anomalies of the modern world. Enormous enterprises — banks, hospitals, governments — run their operations on code that a handful of volunteers wrote in their spare time. The value flows upward; the labour, too often, goes uncompensated.",
        "ru": "Программное обеспечение с открытым исходным кодом — одна из самых поразительных экономических аномалий современного мира. Огромные предприятия — банки, больницы, правительства — ведут свою деятельность на коде, который несколько добровольцев написали в свободное время. Ценность течёт вверх; труд же слишком часто остаётся без вознаграждения."
      },
      {
        "en": "Large technology companies benefit enormously from this arrangement. They consume open-source libraries, build proprietary platforms on top of them, and occasionally contribute back — but rarely in proportion to what they extract. A single widely-used framework can save a company millions of dollars in development costs, yet its core maintainer may rely on donation buttons and part-time sponsorships.",
        "ru": "Крупные технологические компании извлекают огромную выгоду из этого положения дел. Они потребляют библиотеки с открытым исходным кодом, строят на их основе проприетарные платформы и время от времени вносят свой вклад обратно — но редко в той мере, которая соответствует тому, что они берут. Один широко используемый фреймворк может сэкономить компании миллионы долларов на разработке, однако основной разработчик-поддерживатель может жить на пожертвования и частичное спонсорство."
      },
      {
        "en": "The open-source sustainability problem became impossible to ignore after the Heartbleed vulnerability in 2014. A critical bug in OpenSSL — a library that secured most encrypted web traffic — had gone undetected for two years, partly because only one or two people were responsible for reviewing the code. The discovery prompted a wave of new funding initiatives, though the structural problem remains.",
        "ru": "Проблема устойчивости открытого исходного кода стало невозможно игнорировать после уязвимости Heartbleed в 2014 году. Критическая ошибка в OpenSSL — библиотеке, обеспечивавшей безопасность большей части зашифрованного веб-трафика — оставалась незамеченной два года, отчасти потому что за проверку кода отвечали лишь один-два человека. Это открытие породило волну новых инициатив по финансированию, хотя структурная проблема никуда не делась."
      },
      {
        "en": "Some projects have found viable models: dual licences, paid support tiers, hosted cloud versions, or corporate backing from a single dominant supplier. None of these solutions is universal, and each comes with trade-offs. A project that accepts significant funding from one enterprise may find its priorities quietly reshaped. Independence, it turns out, has a price too.",
        "ru": "Некоторые проекты нашли жизнеспособные модели: двойные лицензии, платные уровни поддержки, облачные версии за подписку или корпоративная поддержка от одного доминирующего поставщика. Ни одно из этих решений не является универсальным, и у каждого есть свои компромиссы. Проект, принявший значительное финансирование от одной компании, может обнаружить, что его приоритеты тихо меняются. Независимость, как выясняется, тоже имеет свою цену."
      },
      {
        "en": "Perhaps the most honest framing is this: open source is not free software, it is software whose costs are externalised. Someone, somewhere, is paying — with time, with career sacrifice, or with the slow accumulation of burnout. The efficiency gains that enterprises capture are real; the question is only whether they will ever acknowledge the debt.",
        "ru": "Возможно, наиболее честная формулировка такова: открытый исходный код — это не бесплатное программное обеспечение, это программное обеспечение, чьи издержки вынесены вовне. Кто-то, где-то, платит — временем, жертвуя карьерой или накапливая выгорание. Выигрыш в эффективности, который получают предприятия, реален; вопрос лишь в том, признают ли они когда-нибудь этот долг."
      }
    ],
    "phrases": [
      {
        "id": "b2g-osc-p1",
        "en": "goes uncompensated",
        "ru": "остаётся без вознаграждения",
        "note": {
          "en": "Used when effort or work is not paid or rewarded.",
          "ru": "Используется, когда усилие или работа не оплачиваются и не вознаграждаются."
        }
      },
      {
        "id": "b2g-osc-p2",
        "en": "in proportion to",
        "ru": "пропорционально чему-либо",
        "note": {
          "en": "Indicates a relationship of scale between two things.",
          "ru": "Указывает на соразмерность между двумя вещами."
        }
      },
      {
        "id": "b2g-osc-p3",
        "en": "externalised costs",
        "ru": "вынесенные вовне издержки",
        "note": {
          "en": "Costs shifted onto others rather than borne by the beneficiary.",
          "ru": "Издержки, переложенные на других, а не несомые тем, кто получает выгоду."
        }
      }
    ],
    "questions": [
      {
        "id": "b2g-osc-q1",
        "q": {
          "en": "According to the essay, what did the Heartbleed vulnerability reveal?",
          "ru": "Что, по утверждению эссе, выявила уязвимость Heartbleed?"
        },
        "options": [
          {
            "en": "That cloud platforms are insecure by design.",
            "ru": "Что облачные платформы небезопасны по своей конструкции."
          },
          {
            "en": "That a critical library was maintained by very few people.",
            "ru": "Что критически важную библиотеку поддерживало очень мало людей."
          },
          {
            "en": "That enterprises refused to use open-source encryption.",
            "ru": "Что предприятия отказались использовать шифрование с открытым исходным кодом."
          },
          {
            "en": "That open-source projects should be banned from production use.",
            "ru": "Что проекты с открытым исходным кодом следует запретить в производственных средах."
          }
        ],
        "answer": 1,
        "explain": {
          "en": "The passage states that only one or two people were responsible for reviewing OpenSSL's code, which allowed the bug to go undetected.",
          "ru": "В тексте говорится, что за проверку кода OpenSSL отвечали лишь один-два человека, что и позволило ошибке остаться незамеченной."
        }
      },
      {
        "id": "b2g-osc-q2",
        "q": {
          "en": "What trade-off does the author associate with corporate funding of open-source projects?",
          "ru": "Какой компромисс автор связывает с корпоративным финансированием проектов с открытым исходным кодом?"
        },
        "options": [
          {
            "en": "Projects may lose their independence and see priorities shift.",
            "ru": "Проекты могут потерять независимость и изменить свои приоритеты."
          },
          {
            "en": "Corporate funding always leads to better code quality.",
            "ru": "Корпоративное финансирование всегда приводит к более высокому качеству кода."
          },
          {
            "en": "Maintainers become employees and stop accepting contributions.",
            "ru": "Разработчики становятся сотрудниками и перестают принимать вклады от других."
          }
        ],
        "answer": 0,
        "explain": {
          "en": "The author writes that a project accepting significant funding from one enterprise may find its priorities quietly reshaped.",
          "ru": "Автор пишет, что проект, принявший значительное финансирование от одной компании, может обнаружить, что его приоритеты тихо меняются."
        }
      },
      {
        "id": "b2g-osc-q3",
        "q": {
          "en": "How does the author reframe the idea that open-source software is 'free'?",
          "ru": "Как автор переформулирует представление о том, что программное обеспечение с открытым исходным кодом «бесплатно»?"
        },
        "options": [
          {
            "en": "By arguing that all software should require a paid licence.",
            "ru": "Утверждая, что всё программное обеспечение должно требовать платной лицензии."
          },
          {
            "en": "By saying that costs are hidden and paid by maintainers, not enterprises.",
            "ru": "Говоря, что издержки скрыты и оплачиваются разработчиками, а не предприятиями."
          },
          {
            "en": "By claiming that volunteers enjoy the work and need no payment.",
            "ru": "Утверждая, что добровольцам нравится эта работа и им не нужна оплата."
          },
          {
            "en": "By showing that open source is always more expensive than proprietary software.",
            "ru": "Показывая, что открытый исходный код всегда дороже проприетарного программного обеспечения."
          }
        ],
        "answer": 1,
        "explain": {
          "en": "The author says open source is software whose costs are externalised — paid by someone else in time, career sacrifice, or burnout.",
          "ru": "Автор говорит, что открытый исходный код — это программное обеспечение, чьи издержки вынесены вовне — и оплачиваются кем-то другим временем, жертвой карьерой или выгоранием."
        }
      }
    ],
    "targetWords": [
      "ngsl:2042",
      "ngsl:2169",
      "ngsl:2252",
      "ngsl:2049",
      "ngsl:2002",
      "ngsl:2088",
      "ngsl:2221",
      "ngsl:2001"
    ]
  },
  {
    "id": "b2g-habits-systems",
    "level": "B2",
    "stream": "general",
    "title": {
      "en": "Habits Are Not Enough: Why You Need Systems",
      "ru": "Привычек недостаточно: зачем нужны системы"
    },
    "blurb": {
      "en": "Self-help culture puts individual habits on a pedestal, but lasting change often comes from designing your environment, not forcing your willpower.",
      "ru": "Культура саморазвития ставит личные привычки на пьедестал, но устойчивые изменения часто рождаются из проектирования среды, а не из усилий воли."
    },
    "source": {
      "en": "Long read",
      "ru": "Лонгрид"
    },
    "passages": [
      {
        "en": "The popular advice to 'build better habits' implies that personal change is primarily a matter of mental discipline. Wake up at five, meditate, write in a journal, and your life will transform. There is something appealing about this narrative, but it places too much weight on willpower — a resource that research consistently shows to be limited and unreliable.",
        "ru": "Популярный совет «вырабатывать лучшие привычки» предполагает, что личные изменения — это прежде всего вопрос психической дисциплины. Вставай в пять, медитируй, веди дневник — и жизнь преобразится. В этом нарративе есть что-то привлекательное, но он возлагает слишком большую нагрузку на силу воли — ресурс, который исследования неизменно показывают ограниченным и ненадёжным."
      },
      {
        "en": "Systems thinking offers a different approach. Instead of asking 'how do I force myself to do this?' you ask 'how do I design my environment so that the desired behaviour becomes the default?' A software engineer who wants to write more might remove social media apps from their work laptop, schedule deep-work blocks in a shared calendar, and keep a text editor open at boot. The routine becomes structural, not heroic.",
        "ru": "Системное мышление предлагает иной подход. Вместо того чтобы спрашивать «как заставить себя делать это?», вы спрашиваете «как спроектировать свою среду так, чтобы желаемое поведение стало поведением по умолчанию?» Инженер-программист, желающий больше писать, может удалить приложения социальных сетей с рабочего ноутбука, запланировать блоки глубокой работы в общем календаре и держать текстовый редактор открытым при загрузке. Рутина становится структурной, а не героической."
      },
      {
        "en": "The distinction matters most under pressure. When you are tired, stressed, or distracted, your habits erode and your willpower collapses — but a well-designed system continues to function. The friction that prevents bad behaviour and the ease that enables good behaviour operate independently of your mood or energy level on any given day.",
        "ru": "Это различие особенно важно под давлением. Когда вы устали, испытываете стресс или отвлечены, привычки разрушаются, а сила воли иссякает — но хорошо спроектированная система продолжает работать. Сопротивление, препятствующее плохому поведению, и лёгкость, обеспечивающая хорошее поведение, действуют независимо от вашего настроения или уровня энергии в любой конкретный день."
      },
      {
        "en": "Critics of systems thinking argue that it risks removing personal responsibility from the equation. If your environment explains everything, what is left of agency? The fair response is that designing your system is itself an act of agency — one that requires honest self-perception and deliberate effort. You are not escaping responsibility; you are exercising it upstream, before temptation arrives.",
        "ru": "Критики системного мышления утверждают, что оно рискует исключить личную ответственность из уравнения. Если всё объясняется средой, что остаётся от воли? Справедливый ответ таков: проектирование своей системы само по себе является проявлением воли — требующим честного самовосприятия и намеренных усилий. Вы не уходите от ответственности; вы проявляете её заблаговременно, до того как появится соблазн."
      }
    ],
    "phrases": [
      {
        "id": "b2g-hs-p1",
        "en": "places too much weight on",
        "ru": "возлагает слишком большую нагрузку на",
        "note": {
          "en": "Means over-relying on something or overestimating its importance.",
          "ru": "Означает чрезмерно полагаться на что-то или переоценивать его важность."
        }
      },
      {
        "id": "b2g-hs-p2",
        "en": "the desired behaviour becomes the default",
        "ru": "желаемое поведение становится поведением по умолчанию",
        "note": {
          "en": "The outcome happens automatically without extra effort.",
          "ru": "Результат происходит автоматически, без дополнительных усилий."
        }
      },
      {
        "id": "b2g-hs-p3",
        "en": "exercising agency upstream",
        "ru": "проявлять волю заблаговременно",
        "note": {
          "en": "Making choices earlier in a process to shape later outcomes.",
          "ru": "Принимать решения раньше в процессе, чтобы повлиять на последующие результаты."
        }
      }
    ],
    "questions": [
      {
        "id": "b2g-hs-q1",
        "q": {
          "en": "What does the author claim is the main weakness of habit-focused advice?",
          "ru": "Что, по утверждению автора, является главным недостатком советов, ориентированных на привычки?"
        },
        "options": [
          {
            "en": "It ignores the role of genetics in behaviour.",
            "ru": "Оно игнорирует роль генетики в поведении."
          },
          {
            "en": "It relies on willpower, which is limited and unreliable.",
            "ru": "Оно опирается на силу воли, которая ограничена и ненадёжна."
          },
          {
            "en": "It works only for software engineers, not other professions.",
            "ru": "Оно работает только для инженеров-программистов, а не для других профессий."
          },
          {
            "en": "It produces change that is too fast to maintain.",
            "ru": "Оно производит изменения, которые слишком быстрые для поддержания."
          }
        ],
        "answer": 1,
        "explain": {
          "en": "The author states that habit-focused advice places too much weight on willpower, which research shows to be limited and unreliable.",
          "ru": "Автор утверждает, что советы, ориентированные на привычки, возлагают слишком большую нагрузку на силу воли, которую исследования показывают ограниченной и ненадёжной."
        }
      },
      {
        "id": "b2g-hs-q2",
        "q": {
          "en": "Why does the author say a well-designed system is especially valuable under pressure?",
          "ru": "Почему автор говорит, что хорошо спроектированная система особенно ценна под давлением?"
        },
        "options": [
          {
            "en": "Because it replaces the need for any motivation.",
            "ru": "Потому что она заменяет необходимость в какой-либо мотивации."
          },
          {
            "en": "Because it continues to function even when mood and energy are low.",
            "ru": "Потому что она продолжает работать, даже когда настроение и энергия низки."
          },
          {
            "en": "Because it broadcasts your intentions to colleagues.",
            "ru": "Потому что она транслирует ваши намерения коллегам."
          }
        ],
        "answer": 1,
        "explain": {
          "en": "The passage explains that friction and ease operate independently of mood or energy level, so the system works even when willpower fails.",
          "ru": "В тексте объясняется, что сопротивление и лёгкость действуют независимо от настроения или уровня энергии, поэтому система работает даже при отсутствии силы воли."
        }
      },
      {
        "id": "b2g-hs-q3",
        "q": {
          "en": "How does the author answer the criticism that systems thinking removes personal responsibility?",
          "ru": "Как автор отвечает на критику того, что системное мышление устраняет личную ответственность?"
        },
        "options": [
          {
            "en": "By agreeing that responsibility is less important than outcomes.",
            "ru": "Соглашаясь, что ответственность менее важна, чем результаты."
          },
          {
            "en": "By arguing that designing your system is itself an act of responsible agency.",
            "ru": "Утверждая, что проектирование своей системы само по себе является проявлением ответственной воли."
          },
          {
            "en": "By saying that critics misunderstand what personal responsibility means.",
            "ru": "Говоря, что критики неправильно понимают, что такое личная ответственность."
          },
          {
            "en": "By pointing out that most people already use systems without knowing it.",
            "ru": "Указывая, что большинство людей уже используют системы, не осознавая этого."
          }
        ],
        "answer": 1,
        "explain": {
          "en": "The author says designing your system requires honest self-perception and deliberate effort — that is the exercise of agency, just done upstream before temptation arrives.",
          "ru": "Автор говорит, что проектирование системы требует честного самовосприятия и намеренных усилий — это и есть проявление воли, только заблаговременное, до появления соблазна."
        }
      }
    ],
    "targetWords": [
      "ngsl:2102",
      "ngsl:2202",
      "ngsl:2280",
      "ngsl:2252",
      "ngsl:2064",
      "ngsl:2059",
      "ngsl:2021",
      "ngsl:2100"
    ]
  },
  {
    "id": "b2g-technical-interviews",
    "level": "B2",
    "stream": "general",
    "title": {
      "en": "The Technical Interview as Performance Art",
      "ru": "Техническое собеседование как жанр перформанса"
    },
    "blurb": {
      "en": "Solving algorithms on a whiteboard tells you almost nothing about how someone writes production code. Yet the format persists. Here is why — and what it actually tests.",
      "ru": "Решение алгоритмов на доске почти ничего не говорит о том, как человек пишет производственный код. Тем не менее этот формат сохраняется. Вот почему — и что он на самом деле проверяет."
    },
    "source": {
      "en": "Opinion piece",
      "ru": "Колонка мнений"
    },
    "passages": [
      {
        "en": "Ask most engineers what they think of technical interviews and you will get a consistent answer: they are broken. The typical format asks a candidate to solve an algorithmic puzzle under a time limit, explain their reasoning aloud, and write syntactically correct code on a whiteboard — conditions that bear almost no resemblance to daily engineering work.",
        "ru": "Спросите большинство инженеров, что они думают о технических собеседованиях, и получите одинаковый ответ: они сломаны. Типичный формат просит кандидата решить алгоритмическую задачу в условиях ограничения по времени, объяснить свои рассуждения вслух и написать синтаксически правильный код на доске — в условиях, которые практически не напоминают повседневную инженерную работу."
      },
      {
        "en": "And yet the format refuses to die. The most likely explanation is not that companies believe it identifies great engineers — many talent acquisition specialists privately admit it does not — but that it functions as a known, legally defensible filter. A standardised prompt with a clear answer is easy to grade, easy to compare, and hard to challenge in court.",
        "ru": "Тем не менее этот формат не умирает. Наиболее вероятное объяснение состоит не в том, что компании верят, будто он выявляет великих инженеров — многие специалисты по подбору персонала в частных беседах признают, что это не так, — а в том, что он функционирует как известный, юридически защищаемый фильтр. Стандартизированное задание с чётким ответом легко оценивать, легко сравнивать и сложно оспорить в суде."
      },
      {
        "en": "What the format genuinely tests, when you strip away the performance anxiety, is something worth measuring: the ability to hold a problem in working memory, decompose it into smaller segments, and communicate a solution clearly while under mild stress. These are real skills — they just have almost no relation to the specific algorithm being tested.",
        "ru": "То, что этот формат действительно проверяет, если отбросить тревогу, порождаемую самим процессом, — это нечто достойное измерения: способность удерживать задачу в рабочей памяти, разбивать её на меньшие сегменты и чётко излагать решение в условиях лёгкого стресса. Это реальные навыки — они просто почти не связаны с конкретным алгоритмом, который проверяется."
      },
      {
        "en": "The engineer who aces every LeetCode problem but cannot collaborate, read other people's code, or articulate a trade-off in plain language will still struggle in most teams. Conversely, the engineer who freezes at a whiteboard but writes clear, well-tested code and asks sharp questions in design reviews is someone most managers would prefer to hire — if only the interview format gave them a chance.",
        "ru": "Инженер, решающий любую задачу LeetCode, но неспособный сотрудничать, читать чужой код или объяснять компромиссы простым языком, всё равно будет испытывать трудности в большинстве команд. И наоборот, инженер, застывающий у доски, но пишущий чистый, хорошо протестированный код и задающий острые вопросы на обсуждениях дизайна, — это тот, кого большинство менеджеров предпочло бы нанять, если бы только формат собеседования давал им такой шанс."
      },
      {
        "en": "Alternatives exist and are slowly gaining traction: paid take-home projects, live code reviews of the candidate's own previous work, structured conversations about past incidents. Each has its own biases and failure modes. The honest verdict is that there is no perfect interview format — only trade-offs between signal quality, candidate experience, and operational cost.",
        "ru": "Существуют альтернативы, которые медленно набирают популярность: оплачиваемые домашние проекты, живые обзоры кода из предыдущей работы кандидата, структурированные беседы о прошлых инцидентах. У каждой из них свои предвзятости и сбои. Честный вердикт: не существует идеального формата собеседования — только компромиссы между качеством сигнала, опытом кандидата и операционными затратами."
      }
    ],
    "phrases": [
      {
        "id": "b2g-ti-p1",
        "en": "legally defensible filter",
        "ru": "юридически защищаемый фильтр",
        "note": {
          "en": "A selection criterion that can withstand legal challenge because it is standardised.",
          "ru": "Критерий отбора, способный выдержать юридическую проверку благодаря стандартизации."
        }
      },
      {
        "id": "b2g-ti-p2",
        "en": "strip away the performance anxiety",
        "ru": "отбросить тревогу, порождаемую самим процессом",
        "note": {
          "en": "To ignore the stress caused by being observed or evaluated.",
          "ru": "Игнорировать стресс, вызванный тем, что за тобой наблюдают или тебя оценивают."
        }
      },
      {
        "id": "b2g-ti-p3",
        "en": "gaining traction",
        "ru": "набирать популярность",
        "note": {
          "en": "Becoming more widely accepted or adopted over time.",
          "ru": "Становиться всё более широко принятым или используемым со временем."
        }
      }
    ],
    "questions": [
      {
        "id": "b2g-ti-q1",
        "q": {
          "en": "According to the author, why do companies continue to use the algorithmic interview format?",
          "ru": "По мнению автора, почему компании продолжают использовать формат алгоритмического собеседования?"
        },
        "options": [
          {
            "en": "Because it reliably identifies the best engineers.",
            "ru": "Потому что он надёжно выявляет лучших инженеров."
          },
          {
            "en": "Because it is a standardised, legally defensible filter.",
            "ru": "Потому что это стандартизированный, юридически защищаемый фильтр."
          },
          {
            "en": "Because it tests collaboration and communication skills.",
            "ru": "Потому что он проверяет навыки сотрудничества и общения."
          },
          {
            "en": "Because candidates prefer it to take-home projects.",
            "ru": "Потому что кандидаты предпочитают его домашним проектам."
          }
        ],
        "answer": 1,
        "explain": {
          "en": "The passage states the format persists because it is a known, legally defensible filter that is easy to grade and hard to challenge in court.",
          "ru": "В тексте говорится, что формат сохраняется, поскольку он является известным, юридически защищаемым фильтром, который легко оценивать и сложно оспорить в суде."
        }
      },
      {
        "id": "b2g-ti-q2",
        "q": {
          "en": "What skill does the author say the whiteboard format genuinely measures?",
          "ru": "Какой навык, по мнению автора, формат с доской действительно измеряет?"
        },
        "options": [
          {
            "en": "The ability to memorise algorithms precisely.",
            "ru": "Способность точно запоминать алгоритмы."
          },
          {
            "en": "The ability to hold a problem in memory, decompose it, and explain it under mild stress.",
            "ru": "Способность удерживать задачу в памяти, разбивать её и объяснять в условиях лёгкого стресса."
          },
          {
            "en": "The ability to write bug-free production code quickly.",
            "ru": "Способность быстро писать безошибочный производственный код."
          }
        ],
        "answer": 1,
        "explain": {
          "en": "The author says these are real skills — holding a problem in working memory, decomposing it into segments, and communicating clearly under stress.",
          "ru": "Автор говорит, что это реальные навыки — удерживать задачу в рабочей памяти, разбивать её на сегменты и чётко излагать решение в условиях стресса."
        }
      },
      {
        "id": "b2g-ti-q3",
        "q": {
          "en": "What is the author's overall conclusion about interview formats?",
          "ru": "Каков общий вывод автора о форматах собеседований?"
        },
        "options": [
          {
            "en": "Algorithmic interviews should be completely abolished.",
            "ru": "Алгоритмические собеседования следует полностью отменить."
          },
          {
            "en": "Take-home projects are always superior to live coding.",
            "ru": "Домашние проекты всегда лучше написания кода вживую."
          },
          {
            "en": "No perfect format exists; all involve trade-offs.",
            "ru": "Идеального формата не существует; все форматы предполагают компромиссы."
          },
          {
            "en": "The best interviews focus on personality rather than skills.",
            "ru": "Лучшие собеседования сосредоточены на личности, а не на навыках."
          }
        ],
        "answer": 2,
        "explain": {
          "en": "The final paragraph states there is no perfect interview format — only trade-offs between signal quality, candidate experience, and operational cost.",
          "ru": "В последнем абзаце говорится, что не существует идеального формата собеседования — только компромиссы между качеством сигнала, опытом кандидата и операционными затратами."
        }
      }
    ],
    "targetWords": [
      "ngsl:2373",
      "ngsl:2368",
      "ngsl:2063",
      "ngsl:2073",
      "ngsl:2029",
      "ngsl:2085",
      "ngsl:2467",
      "ngsl:2061"
    ]
  },
  {
    "id": "b2g-writing-clearly",
    "level": "B2",
    "stream": "general",
    "title": {
      "en": "Writing Clearly Is an Engineering Skill",
      "ru": "Ясное изложение мыслей — это инженерный навык"
    },
    "blurb": {
      "en": "The engineers who advance in their careers are rarely the sharpest coders. They are the ones who can explain a complex trade-off in two sentences and write a design document that people actually read.",
      "ru": "Инженеры, которые продвигаются в карьере, редко бывают самыми острыми программистами. Это те, кто способен объяснить сложный компромисс в двух предложениях и написать проектный документ, который люди действительно читают."
    },
    "source": {
      "en": "Professional essay",
      "ru": "Профессиональное эссе"
    },
    "passages": [
      {
        "en": "Writing is not a soft skill that lives alongside engineering; it is a core part of the work itself. Every pull request description, every incident post-mortem, every architecture decision record is a document that will be read by people who were not in the room when the decision was made. The quality of that document determines whether the decision survives, scales, or gets reversed by the next team that inherits the system.",
        "ru": "Письмо — это не мягкий навык, существующий рядом с инженерией; это неотъемлемая часть самой работы. Каждое описание пул-реквеста, каждый постмортем инцидента, каждый документ о принятии архитектурного решения — это документ, который будут читать люди, не присутствовавшие на совещании, где было принято это решение. Качество этого документа определяет, выживет ли решение, масштабируется или будет отменено следующей командой, унаследовавшей систему."
      },
      {
        "en": "The most common failure mode in engineering writing is burying the point. A document might open with three paragraphs of context before specifying what the author actually recommends, or conclude with 'therefore we might want to consider possibly exploring option B.' This kind of writing signals unclear thinking as much as it signals poor prose. If you cannot state your recommendation in the first sentence, you probably have not finished deciding.",
        "ru": "Наиболее распространённый сбой в инженерном письме — это закапывать суть. Документ может открываться тремя абзацами контекста, прежде чем указать, что автор на самом деле рекомендует, или завершаться словами «поэтому нам, возможно, стоит рассмотреть вариант изучения варианта Б». Такое письмо сигнализирует о нечётком мышлении не меньше, чем о слабой прозе. Если вы не можете изложить свою рекомендацию в первом предложении, вероятно, вы ещё не приняли окончательного решения."
      },
      {
        "en": "Good engineering writing is concrete. It does not say 'this approach may have performance implications'; it says 'this query runs in O(n²) time and will be noticeably slow above ten thousand rows, based on profiling on our test database.' Vague warnings are noise. Precise statements with numbers are a contribution.",
        "ru": "Хорошее инженерное письмо конкретно. Оно не говорит «этот подход может иметь последствия для производительности»; оно говорит «этот запрос выполняется за время O(n²) и будет заметно медленным при числе строк свыше десяти тысяч, на основании профилирования в нашей тестовой базе данных». Расплывчатые предупреждения — это шум. Точные утверждения с цифрами — это вклад."
      },
      {
        "en": "There is also a political dimension that engineers tend to underestimate. A well-written proposal that acknowledges competing priorities, attributes ideas correctly, and addresses the concerns of stakeholders is far more likely to gain approval than a technically superior one that reads as though it was written in isolation. Prose is how engineers build consensus without being in the same room.",
        "ru": "Есть и политическое измерение, которое инженеры склонны недооценивать. Хорошо написанное предложение, признающее конкурирующие приоритеты, правильно атрибутирующее идеи и учитывающее озабоченности заинтересованных сторон, с гораздо большей вероятностью получит одобрение, чем технически превосходящее его, которое читается так, будто было написано в изоляции. Проза — это то, как инженеры строят консенсус, не находясь в одной комнате."
      },
      {
        "en": "The practical advice is simple: write the recommendation first, then justify it. Use short sentences when the content is complex. Specify numbers rather than adjectives. Review your own writing for any phrase that hedges without adding information — 'it could be argued', 'some might say', 'there are potential issues with' — and replace each one with a direct statement or delete it entirely.",
        "ru": "Практический совет прост: сначала напишите рекомендацию, затем обоснуйте её. Используйте короткие предложения, когда содержание сложное. Указывайте цифры, а не прилагательные. Проверяйте свои тексты на предмет любой фразы, которая уклончива, не добавляя информации — «можно было бы утверждать», «некоторые могут сказать», «есть потенциальные проблемы с» — и заменяйте каждую из них прямым утверждением или вовсе удаляйте."
      }
    ],
    "phrases": [
      {
        "id": "b2g-wc-p1",
        "en": "burying the point",
        "ru": "закапывать суть",
        "note": {
          "en": "Placing the most important information too late in a document or speech.",
          "ru": "Размещение наиболее важной информации слишком поздно в документе или речи."
        }
      },
      {
        "id": "b2g-wc-p2",
        "en": "hedges without adding information",
        "ru": "уклончиво, не добавляя информации",
        "note": {
          "en": "Language that avoids commitment and does not actually say anything new.",
          "ru": "Язык, избегающий обязательств и не говорящий ничего нового."
        }
      },
      {
        "id": "b2g-wc-p3",
        "en": "build consensus",
        "ru": "строить консенсус",
        "note": {
          "en": "To bring people to a shared agreement through persuasion and communication.",
          "ru": "Приводить людей к общему согласию посредством убеждения и общения."
        }
      }
    ],
    "questions": [
      {
        "id": "b2g-wc-q1",
        "q": {
          "en": "What does the author say the most common failure in engineering writing is?",
          "ru": "Каким, по мнению автора, является наиболее распространённый сбой в инженерном письме?"
        },
        "options": [
          {
            "en": "Using too many technical terms.",
            "ru": "Использование слишком большого количества технических терминов."
          },
          {
            "en": "Writing sentences that are too short.",
            "ru": "Написание слишком коротких предложений."
          },
          {
            "en": "Not stating the main recommendation early enough.",
            "ru": "Недостаточно раннее изложение основной рекомендации."
          },
          {
            "en": "Including too many numbers and statistics.",
            "ru": "Включение слишком большого количества цифр и статистики."
          }
        ],
        "answer": 2,
        "explain": {
          "en": "The author calls this 'burying the point' — opening with paragraphs of context before stating what you actually recommend.",
          "ru": "Автор называет это «закапыванием сути» — открытие абзацами контекста, прежде чем изложить то, что вы на самом деле рекомендуете."
        }
      },
      {
        "id": "b2g-wc-q2",
        "q": {
          "en": "How does the author contrast vague warnings with precise statements?",
          "ru": "Как автор противопоставляет расплывчатые предупреждения точным утверждениям?"
        },
        "options": [
          {
            "en": "Vague warnings are friendlier; precise statements can upset colleagues.",
            "ru": "Расплывчатые предупреждения более дружелюбны; точные утверждения могут расстроить коллег."
          },
          {
            "en": "Vague warnings are noise; precise statements with numbers are a contribution.",
            "ru": "Расплывчатые предупреждения — это шум; точные утверждения с цифрами — это вклад."
          },
          {
            "en": "Precise statements are harder to understand for non-technical stakeholders.",
            "ru": "Точные утверждения сложнее понять нетехническим заинтересованным сторонам."
          }
        ],
        "answer": 1,
        "explain": {
          "en": "The author states directly: 'Vague warnings are noise. Precise statements with numbers are a contribution.'",
          "ru": "Автор прямо заявляет: «Расплывчатые предупреждения — это шум. Точные утверждения с цифрами — это вклад»."
        }
      },
      {
        "id": "b2g-wc-q3",
        "q": {
          "en": "According to the author, what is the 'political dimension' of writing in engineering?",
          "ru": "Что, по мнению автора, является «политическим измерением» письма в инженерии?"
        },
        "options": [
          {
            "en": "Writing can be used to manipulate decisions unfairly.",
            "ru": "Письмо можно использовать для несправедливого манипулирования решениями."
          },
          {
            "en": "Well-written proposals that address stakeholder concerns are more likely to be approved.",
            "ru": "Хорошо написанные предложения, учитывающие озабоченности заинтересованных сторон, с большей вероятностью будут одобрены."
          },
          {
            "en": "Technical accuracy matters less than political tone in documents.",
            "ru": "Техническая точность имеет меньшее значение, чем политический тон в документах."
          },
          {
            "en": "Engineers should write differently depending on who will read the document.",
            "ru": "Инженеры должны писать по-разному в зависимости от того, кто будет читать документ."
          }
        ],
        "answer": 1,
        "explain": {
          "en": "The author argues that a well-written proposal acknowledging competing priorities and stakeholder concerns is far more likely to gain approval than a technically superior but isolated one.",
          "ru": "Автор утверждает, что хорошо написанное предложение, признающее конкурирующие приоритеты и озабоченности заинтересованных сторон, с гораздо большей вероятностью получит одобрение, чем технически превосходящее, но написанное в изоляции."
        }
      }
    ],
    "targetWords": [
      "ngsl:2425",
      "ngsl:2028",
      "ngsl:2029",
      "ngsl:2089",
      "ngsl:2324",
      "ngsl:2025",
      "ngsl:2143",
      "ngsl:2039"
    ]
  },
  {
    "id": "b2g-history-version-control",
    "level": "B2",
    "stream": "general",
    "title": {
      "en": "A Brief History of Version Control",
      "ru": "Краткая история систем контроля версий"
    },
    "blurb": {
      "en": "From manually numbered zip files to distributed commits, version control has quietly shaped how software teams think about time, collaboration, and trust.",
      "ru": "От вручную пронумерованных zip-архивов до распределённых коммитов — контроль версий незаметно изменил то, как команды разработчиков думают о времени, сотрудничестве и доверии."
    },
    "source": {
      "en": "Narrative long read",
      "ru": "Нарративный лонгрид"
    },
    "passages": [
      {
        "en": "Before version control tools existed, programmers managed change by hand. A working copy of the codebase might live in a folder named 'project_final', alongside siblings called 'project_final_v2' and 'project_final_REALLY_FINAL'. This approach was universal, fragile, and — as anyone who has inherited such a directory can confirm — extraordinarily difficult to reason about.",
        "ru": "До появления инструментов контроля версий программисты управляли изменениями вручную. Рабочая копия кодовой базы могла находиться в папке с именем «project_final», рядом с папками «project_final_v2» и «project_final_REALLY_FINAL». Этот подход был повсеместным, хрупким и — как может подтвердить любой, кто унаследовал такую директорию, — чрезвычайно сложным для понимания."
      },
      {
        "en": "The first generation of formal tools, led by SCCS (1972) and RCS (1982), solved the single-file problem. They kept a log of every change to a file and could restore any earlier version. The breakthrough was conceptual as much as technical: code could now have a past. But these tools were local — they lived on one machine and offered no meaningful support for parallel work by multiple developers.",
        "ru": "Первое поколение формальных инструментов, представленное SCCS (1972) и RCS (1982), решило задачу отдельного файла. Они вели журнал каждого изменения файла и могли восстановить любую более раннюю версию. Прорыв был концептуальным не меньше, чем техническим: теперь у кода было прошлое. Но эти инструменты были локальными — они работали на одной машине и не предлагали существенной поддержки параллельной работы нескольких разработчиков."
      },
      {
        "en": "CVS and then Subversion introduced a centralised server model: one canonical repository from which developers would check out files, make changes, and commit back. This architecture matched how many organisations already thought about authority and ownership. It also introduced a new class of problem — the central server became a single point of failure, and its log of history was only as trustworthy as the people with administrator privilege.",
        "ru": "CVS, а затем Subversion представили модель централизованного сервера: один канонический репозиторий, из которого разработчики получали файлы, вносили изменения и фиксировали их обратно. Эта архитектура соответствовала тому, как многие организации уже думали об авторитете и владении. Она также породила новый класс проблем — центральный сервер стал единой точкой отказа, а его журнал истории был настолько надёжен, насколько надёжны были люди с правами администратора."
      },
      {
        "en": "Git, released by Linus Torvalds in 2005 as a direct response to a licensing dispute over the BitKeeper tool used by the Linux kernel, changed the architecture fundamentally. Every clone of a Git repository is a complete copy of the entire history. There is no canonical server in a technical sense — only convention. The efficiency of Git's storage format and the clarity of its data model (every commit is a cryptographic hash of its content and parent) made it not just a backup tool but a platform for new collaboration patterns.",
        "ru": "Git, выпущенный Линусом Торвальдсом в 2005 году как прямой ответ на лицензионный спор вокруг инструмента BitKeeper, используемого ядром Linux, коренным образом изменил архитектуру. Каждый клон репозитория Git является полной копией всей истории. В техническом смысле канонического сервера нет — есть только соглашение. Эффективность формата хранения Git и ясность его модели данных (каждый коммит является криптографическим хешем своего содержимого и родителя) сделали его не просто инструментом резервного копирования, но платформой для новых паттернов сотрудничества."
      },
      {
        "en": "Today Git so thoroughly dominates the field that many junior engineers have never seriously used an alternative. But it is worth remembering that its current position was not inevitable. Several distributed systems competed in the mid-2000s — Mercurial, Bazaar, Darcs — each with genuine technical strengths. Git won largely because of GitHub, which turned a command-line tool into a social platform. The discovery that code review, project visibility, and contributor recognition could all happen in one web interface made the social layer inseparable from the technical one.",
        "ru": "Сегодня Git настолько доминирует в этой области, что многие молодые инженеры никогда всерьёз не пользовались альтернативой. Но стоит помнить, что его нынешнее положение не было предопределено. В середине 2000-х годов конкурировали несколько распределённых систем — Mercurial, Bazaar, Darcs — каждая с реальными техническими преимуществами. Git выиграл во многом благодаря GitHub, который превратил инструмент командной строки в социальную платформу. Открытие того, что обзор кода, видимость проекта и признание вкладчиков могут происходить в одном веб-интерфейсе, сделало социальный слой неотделимым от технического."
      },
      {
        "en": "Version control is, at its core, a technology for trusting the past. It does not prevent mistakes; it makes them recoverable. Every engineering team that has ever performed a restore operation after a bad deploy, traced a bug to a specific commit, or simply asked 'why did we do it this way?' has benefited from a concept that started with two engineers and a numbered zip file.",
        "ru": "Контроль версий — это, по сути, технология доверия к прошлому. Она не предотвращает ошибки; она делает их исправимыми. Каждая инженерная команда, которая когда-либо выполняла восстановление после неудачного развёртывания, отслеживала ошибку до конкретного коммита или просто задавалась вопросом «почему мы сделали это именно так?», воспользовалась концепцией, которая началась с двух инженеров и пронумерованного zip-файла."
      }
    ],
    "phrases": [
      {
        "id": "b2g-vc-p1",
        "en": "single point of failure",
        "ru": "единая точка отказа",
        "note": {
          "en": "A component whose failure brings down the entire system.",
          "ru": "Компонент, отказ которого приводит к остановке всей системы."
        }
      },
      {
        "id": "b2g-vc-p2",
        "en": "cryptographic hash",
        "ru": "криптографический хеш",
        "note": {
          "en": "A fixed-length fingerprint computed from data, used to verify integrity.",
          "ru": "Отпечаток фиксированной длины, вычисляемый из данных и используемый для проверки целостности."
        }
      },
      {
        "id": "b2g-vc-p3",
        "en": "thoroughly dominates",
        "ru": "безоговорочно доминирует",
        "note": {
          "en": "Controls or occupies a field so completely that alternatives are marginal.",
          "ru": "Контролирует или занимает область настолько полно, что альтернативы незначительны."
        }
      }
    ],
    "questions": [
      {
        "id": "b2g-vc-q1",
        "q": {
          "en": "What conceptual breakthrough did SCCS and RCS introduce, according to the passage?",
          "ru": "Какой концептуальный прорыв принесли SCCS и RCS, согласно тексту?"
        },
        "options": [
          {
            "en": "They allowed multiple developers to work in parallel on the same server.",
            "ru": "Они позволили нескольким разработчикам работать параллельно на одном сервере."
          },
          {
            "en": "They gave code a retrievable past by logging every change.",
            "ru": "Они дали коду извлекаемое прошлое, фиксируя каждое изменение."
          },
          {
            "en": "They introduced cryptographic verification of code integrity.",
            "ru": "Они ввели криптографическую проверку целостности кода."
          },
          {
            "en": "They created the concept of a central repository.",
            "ru": "Они создали концепцию центрального репозитория."
          }
        ],
        "answer": 1,
        "explain": {
          "en": "The passage says the breakthrough was conceptual: 'code could now have a past,' meaning earlier versions could be restored.",
          "ru": "В тексте говорится, что прорыв был концептуальным: «теперь у кода было прошлое», то есть более ранние версии можно было восстановить."
        }
      },
      {
        "id": "b2g-vc-q2",
        "q": {
          "en": "Why did Git's architecture represent a fundamental change from Subversion?",
          "ru": "Почему архитектура Git представляла собой фундаментальное изменение по сравнению с Subversion?"
        },
        "options": [
          {
            "en": "Git stored only the latest version of files, making it faster.",
            "ru": "Git хранил только последнюю версию файлов, что делало его быстрее."
          },
          {
            "en": "Every Git clone is a complete copy of the history, with no required central server.",
            "ru": "Каждый клон Git является полной копией истории без необходимости центрального сервера."
          },
          {
            "en": "Git introduced the concept of branches for the first time.",
            "ru": "Git впервые ввёл концепцию веток."
          },
          {
            "en": "Git required a paid licence, ensuring professional maintenance.",
            "ru": "Git требовал платной лицензии, обеспечивая профессиональное обслуживание."
          }
        ],
        "answer": 1,
        "explain": {
          "en": "The passage states that every clone of a Git repository is a complete copy of the entire history, and there is no canonical server in a technical sense.",
          "ru": "В тексте говорится, что каждый клон репозитория Git является полной копией всей истории, и в техническом смысле канонического сервера нет."
        }
      },
      {
        "id": "b2g-vc-q3",
        "q": {
          "en": "What does the author identify as the main reason Git won against Mercurial and other competitors?",
          "ru": "Что автор называет главной причиной победы Git над Mercurial и другими конкурентами?"
        },
        "options": [
          {
            "en": "Git had better performance on large repositories.",
            "ru": "Git показывал лучшую производительность на больших репозиториях."
          },
          {
            "en": "Linus Torvalds actively promoted it in public.",
            "ru": "Линус Торвальдс активно продвигал его публично."
          },
          {
            "en": "GitHub transformed it into a social platform for code review and visibility.",
            "ru": "GitHub превратил его в социальную платформу для обзора кода и видимости."
          },
          {
            "en": "Git was the only distributed version control system available.",
            "ru": "Git был единственной доступной распределённой системой контроля версий."
          }
        ],
        "answer": 2,
        "explain": {
          "en": "The author says Git won largely because of GitHub, which turned it into a social platform where code review, visibility, and contributor recognition all happened in one interface.",
          "ru": "Автор говорит, что Git выиграл во многом благодаря GitHub, который превратил его в социальную платформу, где обзор кода, видимость и признание вкладчиков происходили в одном интерфейсе."
        }
      }
    ],
    "targetWords": [
      "ngsl:2224",
      "ngsl:2169",
      "ngsl:2022",
      "ngsl:2435",
      "ngsl:2290",
      "ngsl:2045",
      "ngsl:2412",
      "ngsl:2277",
      "ngsl:2001",
      "ngsl:2011"
    ]
  }
];
