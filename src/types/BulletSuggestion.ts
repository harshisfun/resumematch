export type BulletSuggestion = {
  index: number;
  original: string;

  // Structured slots that compose the bullet
  slots: {
    actionVerb: string;
    scope: string;
    problem: string;
    method: string;
    tools: string[];
    metrics: { value: string; what: string };
    outcome: string;
    jdKeywordsMapped: string[];
  };

  // Three renderings from the same slots
  variants: {
    conservative: string;
    balanced: string;
    keywordHeavy: string;
  };

  // Back-compat: the currently selected/improved text (defaults to balanced)
  improved: string;

  // Controls and evidence
  constraints: { tense: "past" | "present"; maxWords: number; oneMetric: boolean };
  evidence: Array<{ source: "resume" | "jd"; start: number; end: number; quote: string }>;

  explanation: string;
  coverageBefore: number; // 0..1
  coverageAfter: number; // 0..1 (for the default selected variant)
  riskFlags: string[]; // empty => safe
  confidence: number; // 0..1
};


