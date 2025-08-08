import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { keywordCoverage } from "@/lib/coverage";
import { JdSignals, JD_SIGNALS_SCHEMA } from "@/lib/jdSignals";
import { BulletSuggestion } from "@/types/BulletSuggestion";
import { openai, getModel } from "@/lib/ai";

type FactLock = { facts: string[] };
type RewriteResult = { improved: string; explanation: string; jdKeywordsUsed: string[] };
type ValidatorResult = { unsupported: string[] };

const openai = getOpenAIClient;

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
          { role: "system", content: "Rewrite using ONLY these facts. Keep numbers/dates verbatim. Prefer JD vocabulary and action verbs. No new claims, no fluff. Return JSON by schema." },
          { role: "user", content: JSON.stringify({ facts, signals }) }
        ],
        temperature: 0,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "rewrite_result",
            schema: {
              type: "object",
              properties: {
                improved: { type: "string" },
                explanation: { type: "string" },
                jdKeywordsUsed: { type: "array", items: { type: "string" } }
              },
              required: ["improved", "explanation", "jdKeywordsUsed"]
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
          { role: "system", content: "Compare original facts and improved bullet. List phrases in the improved text that are NOT supported by the original facts. Return JSON: { unsupported: string[] } only." },
          { role: "user", content: JSON.stringify({ facts, improved }) }
        ],
        temperature: 0,
        response_format: { type: "json_object" }
      });
      return JSON.parse(res.choices[0]?.message?.content || "{}");
    };

    for (let i = 0; i < resumeBullets.length; i++) {
      const original = resumeBullets[i];
      const factLock = await runFactLock(original);
      const facts = Array.isArray(factLock.facts) ? factLock.facts : [];
      const rewrite = await runRewrite(facts, jdSignals);
      const validator = await runValidator(facts, rewrite.improved || "");

      const coverageBefore = keywordCoverage(original, jdSignals);
      const coverageAfter = keywordCoverage(rewrite.improved || original, jdSignals);

      const riskFlags = Array.isArray(validator.unsupported) ? validator.unsupported : [];

      suggestions.push({
        index: i,
        original,
        improved: rewrite.improved || original,
        explanation: rewrite.explanation || "",
        jdKeywordsUsed: Array.isArray(rewrite.jdKeywordsUsed) ? rewrite.jdKeywordsUsed : [],
        coverageBefore,
        coverageAfter,
        riskFlags
      });
    }

    return NextResponse.json({ suggestions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


