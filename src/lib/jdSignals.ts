export type JdSignals = {
  canonicalSkills: { name: string; synonyms: string[] }[];
  responsibilities: string[];
  actionVerbs: string[];
  seniorityHints: string[];
};

export const JD_SIGNALS_SCHEMA = {
  type: "object",
  properties: {
    canonicalSkills: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          synonyms: { type: "array", items: { type: "string" } }
        },
        required: ["name","synonyms"]
      }
    },
    responsibilities: { type: "array", items: { type: "string" } },
    actionVerbs: { type: "array", items: { type: "string" } },
    seniorityHints: { type: "array", items: { type: "string" } }
  },
  required: ["canonicalSkills","responsibilities","actionVerbs","seniorityHints"]
} as const;


