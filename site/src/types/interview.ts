// site/src/types/interview.ts
// Types for the interview Q&A bank data.
export interface InterviewQuestion {
  title: string;
  slug: string;
  url: string;
  answer: string;
}

export type InterviewLevel = "junior" | "middle" | "senior";

export interface InterviewCategory {
  name: string;
  url: string;
  questions: InterviewQuestion[];
}

export interface InterviewQData {
  [category: string]: InterviewCategory;
}
