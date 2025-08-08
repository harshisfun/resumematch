import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { keywordCoverage } from "@/lib/coverage";
import { JdSignals, JD_SIGNALS_SCHEMA } from "@/lib/jdSignals";
import { BulletSuggestion } from "@/types/BulletSuggestion";
import { openai, getModel } from "@/lib/ai";

type FactLock = { facts: string[] };
type RewriteResult = {
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
  variants: { conservative: string; balanced: string; keywordHeavy: string };
  constraints: { tense: "past" | "present"; maxWords: number; oneMetric: boolean };
  evidence: Array<{ source: "resume" | "jd"; start: number; end: number; quote: string }>;
  explanation: string;
};
type ValidatorResult = { unsupported: string[]; omissions?: string[]; confidence?: number };

// use centralized client directly

function bulletize(text: string): string[] {
  const lines = text
    .split(/\n+/)
    .map(l => l.trim())
    .filter(Boolean);
  const bullets: string[] = [];
  for (const line of lines) {
    if (/^(?:[-•–]\s+)/.test(line) || (line.endsWith(".") && line.length <= 300)) {
      bullets.push(line.replace(/^(?:[-•–]\s+)/, ""));
    }
  }
  if (bullets.length === 0 && text.trim()) bullets.push(text.trim());
  return bullets;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const resumeBullets: string[] = Array.isArray(body?.resumeBullets) ? body.resumeBullets : bulletize(String(body?.resumeText || ""));
    const jobDescription: string = String(body?.jobDescription || "");

    if (!jobDescription || resumeBullets.length === 0) {
      return NextResponse.json({ error: "resumeBullets and jobDescription are required" }, { status: 400 });
    }

    const client = openai;

    // 1) JD Signals extraction via Structured Output
    const jdExtraction = await client.chat.completions.create({
      model: getModel(),
      messages: [
        { role: "system", content: "Extract skills & synonyms strictly from this JD. No creativity. Return JSON by schema." },
        { role: "user", content: jobDescription }
      ],
      temperature: 0,
      // cast is fine in runtime; SDK types may lag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      response_format: { type: "json_schema", json_schema: { name: "jd_signals", schema: JD_SIGNALS_SCHEMA } as any }
    });

    const jdSignals: JdSignals = JSON.parse(jdExtraction.choices[0]?.message?.content || "{}");

    const suggestions: BulletSuggestion[] = [];

    // Helper function calls
    const runFactLock = async (bullet: string): Promise<FactLock> => {
      const res = await client.chat.completions.create({
        model: getModel(),
        messages: [
          { role: "system", content: "Extract atomic facts from the bullet. Keep metrics/dates verbatim. Return JSON: { facts: string[] } only." },
          { role: "user", content: bullet }
        ],
        temperature: 0,
        response_format: { type: "json_object" }
      });
      return JSON.parse(res.choices[0]?.message?.content || "{}");
    };

    const runRewrite = async (facts: string[], signals: JdSignals): Promise<RewriteResult> => {
      const res = await client.chat.completions.create({
        model: getModel(),
        messages: [
          { role: "system", content: "Rewrite using ONLY these facts. Keep numbers/dates verbatim. Prefer JD vocabulary and action verbs. No new claims, no fluff. Output the `slots` object first (strictly from facts), then `variants` rendered via templates (conservative/balanced/keywordHeavy). Enforce constraints: 18-26 words, exactly one metric, tense by role, one sentence, no semicolons/emojis/first-person. Normalize action verb from: [\"Drove\",\"Built\",\"Shipped\",\"Automated\",\"Scaled\",\"Optimized\",\"Designed\",\"Led\",\"Launched\",\"Reduced\",\"Increased\",\"Improved\"]. Return JSON by schema only." },
          { role: "user", content: JSON.stringify({ facts, signals }) }
        ],
        temperature: 0.2,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "rewrite_result",
            schema: {
              type: "object",
              properties: {
                slots: {
                  type: "object",
                  properties: {
                    actionVerb: { type: "string" },
                    scope: { type: "string" },
                    problem: { type: "string" },
                    method: { type: "string" },
                    tools: { type: "array", items: { type: "string" } },
                    metrics: { type: "object", properties: { value: { type: "string" }, what: { type: "string" } }, required: ["value","what"] },
                    outcome: { type: "string" },
                    jdKeywordsMapped: { type: "array", items: { type: "string" } }
                  },
                  required: ["actionVerb","problem","method","metrics","outcome","jdKeywordsMapped"],
                },
                variants: {
                  type: "object",
                  properties: {
                    conservative: { type: "string" },
                    balanced: { type: "string" },
                    keywordHeavy: { type: "string" }
                  },
                  required: ["conservative","balanced","keywordHeavy"]
                },
                constraints: {
                  type: "object",
                  properties: {
                    tense: { type: "string", enum: ["past","present"] },
                    maxWords: { type: "integer" },
                    oneMetric: { type: "boolean" }
                  },
                  required: ["tense","maxWords","oneMetric"]
                },
                evidence: {
                  type: "array",
                  items: { type: "object", properties: { source: { type: "string", enum: ["resume","jd"] }, start: { type: "integer" }, end: { type: "integer" }, quote: { type: "string" } }, required: ["source","start","end","quote"] }
                },
                explanation: { type: "string" }
              },
              required: ["slots","variants","constraints","evidence","explanation"]
            }
          } as any
        }
      });
      return JSON.parse(res.choices[0]?.message?.content || "{}");
    };

    const runValidator = async (facts: string[], improved: string): Promise<ValidatorResult> => {
      const res = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Compare original facts and improved bullet. List unsupported phrases, note omissions like missing metric/scope, and compute confidence: start 1.0, -0.3 if any unsupported, -0.1 per omission, +0.1 if all numbers match; clamp 0..1. Return JSON: { unsupported: string[], omissions: string[], confidence: number } only." },
          { role: "user", content: JSON.stringify({ facts, improved }) }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      });
      return JSON.parse(res.choices[0]?.message?.content || "{}");
    };

    for (let i = 0; i < resumeBullets.length; i++) {
      const original = resumeBullets[i];
      const factLock = await runFactLock(original);
      const facts = Array.isArray(factLock.facts) ? factLock.facts : [];
      const rewrite = await runRewrite(facts, jdSignals);
      const selected = rewrite.variants?.balanced || rewrite.variants?.conservative || original;
      const validator = await runValidator(facts, selected);

      const coverageBefore = keywordCoverage(original, jdSignals);
      const coverageAfter = keywordCoverage(selected || original, jdSignals);

      const riskFlags = Array.isArray(validator.unsupported) ? validator.unsupported : [];

      const suggestion: BulletSuggestion = {
        index: i,
        original,
        slots: rewrite.slots || {
          actionVerb: "",
          scope: "",
          problem: "",
          method: "",
          tools: [],
          metrics: { value: "", what: "" },
          outcome: "",
          jdKeywordsMapped: []
        },
        variants: rewrite.variants || { conservative: selected, balanced: selected, keywordHeavy: selected },
        improved: selected,
        constraints: rewrite.constraints || { tense: "past", maxWords: 26, oneMetric: true },
        evidence: rewrite.evidence || [],
        explanation: rewrite.explanation || "",
        coverageBefore,
        coverageAfter,
        riskFlags,
        confidence: typeof validator.confidence === "number" ? Math.max(0, Math.min(1, validator.confidence)) : (riskFlags.length ? 0.5 : 0.8)
      };

      suggestions.push(suggestion);
    }

    return NextResponse.json({ suggestions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


