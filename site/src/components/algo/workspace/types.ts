import type { Locale } from "~/i18n";

export type Bi = { en: string; ru: string };

export type SolveMode = "timed" | "untimed" | "interview";
export type Scheme = "ink" | "paper" | "slate";
export type Screen = "workspace" | "debrief" | "metrics" | "bank";
export type RailTab = "hints" | "attempts" | "solutions";
export type DebriefTab = "analysis" | "diff" | "next";

export type WorkedExample = { input: string; output: string; why: Bi };

export type WorkspaceTest = {
  /** JS expression producing the argument tuple for the target function, e.g. "[[-1,0,1,2,-1,-4]]" */
  args: string;
  /** Canonical expected value, compared after JSON-stable canonicalization. */
  expected: unknown;
  /** How to canonicalize the function's return value before comparing (order-independent triplets, etc). */
  compare: "exact" | "unordered-triplets";
  visible: boolean;
  /** Shown only when this specific case fails — ties a known bug shape to a diagnosis. */
  diagnosis?: Bi;
};

export type SolutionIdea = {
  title: Bi;
  time: string;
  space: string;
  mark: "canonical" | "same-bound" | "niche";
  note: Bi;
};

export type WorkspaceProblem = {
  id: string;
  leetcodeId: number;
  slug: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  pattern: string;
  targetMinutes: number;
  companies: string[];
  statement: Bi[];
  example: WorkedExample;
  /** Hint ladder, rungs 1..4, real content from the drill bank (bilingual). */
  hints: Bi[];
  followUp?: Bi;
  referenceBigO: string;
  seedCode: string;
  tests: WorkspaceTest[];
  solutions: SolutionIdea[];
  referenceSolution: string;
  functionName: string;
};

export type TraceEvent = { atSeconds: number; kind: string; label: Bi };

export type Attempt = {
  atLabel: string;
  mode: SolveMode;
  mastery: number;
  code: string;
  lines: number;
  chars: number;
  /** Absent when the attempt was saved without ever running the tests. */
  testsSummary?: { passed: number; total: number };
};

export type PersistedSession = {
  code: string;
  mode: SolveMode;
  scheme: Scheme;
  attempts: Attempt[];
};

export type TestRunResult = {
  test: WorkspaceTest;
  pass: boolean;
  actual: string;
  ms: number;
};

export type BankStatus = "unattempted" | "attempted" | "solved" | "due";

export type BankRow = {
  id: string;
  leetcodeId: number;
  title: string;
  pattern: string;
  difficulty: "easy" | "medium" | "hard";
  targetMinutes: number;
  companies: string[];
  status: BankStatus;
  href: string;
  isWorkspaceProblem: boolean;
};

export type Props = { lang: Locale };
