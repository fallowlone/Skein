import type { Scenario } from "~/english/types";

export const scenarios: Scenario[] = [
  { id: "standup", level: "A2", role: "your scrum master running daily standup", goal: "give yesterday/today/blockers clearly", opening: "Morning! Can you give us your standup update?", titleRu: "Дейли-стендап" },
  { id: "code-review", level: "B1", role: "a senior engineer reviewing your pull request", goal: "explain and defend your design choices", opening: "Thanks for the PR. Why did you put a queue in front of the worker?", titleRu: "Код-ревью" },
  { id: "incident", level: "B2", role: "an incident commander on a sev-2 call", goal: "report status and next actions under pressure", opening: "We're paging. What's the current impact and your next step?", titleRu: "Инцидент-колл" },
  { id: "sprint-planning", level: "B1", role: "a product manager in sprint planning", goal: "estimate work and push back on scope", opening: "Can we ship the search rewrite this sprint?", titleRu: "Планирование спринта" },
  { id: "explain-bug", level: "A2", role: "a non-technical manager", goal: "explain a bug in plain language", opening: "Customers say checkout is broken. What happened?", titleRu: "Объяснить баг менеджеру" },
  { id: "design-interview", level: "B2", role: "a system-design interviewer", goal: "walk through a design out loud", opening: "Design a URL shortener. Where do you start?", titleRu: "Систем-дизайн интервью" },
  { id: "onboarding", level: "A2", role: "a new teammate you are onboarding", goal: "explain how the service is deployed", opening: "How do we ship code to production here?", titleRu: "Онбординг новичка" },
  { id: "scope-negotiation", level: "B2", role: "a stakeholder who wants more features", goal: "negotiate scope and timeline", opening: "Can we also add real-time notifications by Friday?", titleRu: "Переговоры по скоупу" },
  { id: "retro", level: "B1", role: "a facilitator in a sprint retrospective", goal: "give honest, constructive feedback", opening: "What went well, and what should we change?", titleRu: "Ретроспектива" },
  { id: "oncall-handoff", level: "B1", role: "the engineer taking over on-call from you", goal: "hand off open issues clearly", opening: "Anything I should watch tonight?", titleRu: "Передача дежурства" },
  { id: "tech-talk-q", level: "B2", role: "an audience member after your tech talk", goal: "answer questions about your approach", opening: "Nice talk. Why not just use a managed database?", titleRu: "Вопросы после доклада" },
  { id: "vendor-call", level: "B2", role: "a cloud vendor solutions engineer", goal: "ask precise questions about limits and pricing", opening: "Happy to help — what are you trying to build on our platform?", titleRu: "Звонок с вендором" },
];
