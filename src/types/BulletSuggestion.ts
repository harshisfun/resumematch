export type BulletSuggestion = {
  index: number;
  original: string;
  improved: string;
  explanation: string;
  jdKeywordsUsed: string[];
  coverageBefore: number; // 0..1
  coverageAfter: number; // 0..1
  riskFlags: string[]; // empty => safe
};


