import { NextRequest, NextResponse } from 'next/server';
import { openai, getModel } from '@/lib/ai';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canUseAnalysis, recordAnalysisUsage } from '@/lib/rateLimit';

// centralized client + model via lib/ai

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ 
        error: 'Authentication required' 
      }, { status: 401 });
    }

    // Check rate limit
    const rateLimitResult = canUseAnalysis(session.user.email);
    
    if (!rateLimitResult.allowed) {
      const resetTime = rateLimitResult.resetTime ? new Date(rateLimitResult.resetTime) : null;
      const resetDate = resetTime ? resetTime.toLocaleDateString() : 'tomorrow';
      
      return NextResponse.json({ 
        error: `Rate limit exceeded. You can perform 3 analyses per 24-hour period. Please try again ${resetDate}.`,
        rateLimit: rateLimitResult
      }, { status: 429 });
    }

    const { resumeText, jobDescription } = await request.json();

    if (!resumeText || !jobDescription) {
      return NextResponse.json({ 
        error: 'Resume text and job description are required' 
      }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        error: 'OpenAI API key not configured' 
      }, { status: 500 });
    }

    // Upgraded grounded prompt + strict JSON schema (GPT-5 ready)
    const SYSTEM_PROMPT = `
You are an expert resume strategist and ATS optimization specialist.

Constraints:
- Ground every statement in the provided Resume or Job Description (JD). Do not infer beyond the text.
- Preserve numeric facts (metrics, dates, counts) verbatim.
- Prefer JD vocabulary/synonyms only when meaning is identical.
- Never fabricate skills, tools, titles, or timelines.
- Return ONLY JSON matching the provided schema (no extra keys, no comments).
- When uncertain, list it under "ambiguities" instead of guessing.

Scoring rubric (apply consistently to all scores):
- 90–100: Direct, complete fit; strong quantified impact; skills/tools fully align with JD.
- 80–89: Strong fit; minor gaps; mostly quantified; easy to fix with small changes.
- 70–79: Partial fit; several gaps or weak quantification; needs targeted edits.
- 60–69: Limited fit; missing key skills or weak evidence.
- <60: Poor fit; role mismatch or major missing requirements.

Evidence rules:
- For any claim in analysis or optimized text, include an evidence span referencing the exact substring in Resume/JD with start/end character indices.
- If a needed claim is absent, add it to "missing_requirements".
- If the model thinks something might be true but can’t prove it, add it to "unsupported_claims".
`.trim();

    function buildKeywordMap(jd: string) {
      const raw = Array.from(new Set(jd.toLowerCase().match(/\b([a-z][a-z0-9+\-#\. ]{2,})\b/g) || []));
      const keep = raw.filter(t => t.includes(' ') || /[+#\.\-]/.test(t));
      const obj: Record<string, string[]> = {};
      keep.slice(0, 50).forEach(k => { obj[k] = [k]; });
      return obj;
    }

    const resume_text = String(resumeText);
    const job_description = String(jobDescription);
    const jd_keyword_map = buildKeywordMap(job_description);

    const ANALYSIS_SCHEMA = {
      type: 'object',
      required: [
        'overall','sections','scores','strengths','weaknesses','improvement_roadmap',
        'market_competitiveness','missing_requirements','unsupported_claims','ambiguities'
      ],
      properties: {
        overall: {
          type: 'object',
          required: ['candidacy_score','reasoning'],
          properties: {
            candidacy_score: { type: 'integer', minimum: 0, maximum: 100 },
            reasoning: { type: 'string', maxLength: 700 }
          }
        },
        sections: {
          type: 'array',
          items: {
            type: 'object',
            required: ['name','current_extract','optimized_text','section_score','improvements','jd_keywords_used','evidence'],
            properties: {
              name: { type: 'string', enum: ['Summary','Experience','Skills','Education','Projects'] },
              current_extract: { type: 'string' },
              optimized_text: { type: 'string' },
              section_score: { type: 'integer', minimum: 0, maximum: 100 },
              improvements: { type: 'array', items: { type: 'string' } },
              jd_keywords_used: { type: 'array', items: { type: 'string' } },
              evidence: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['source','start','end','quote'],
                  properties: {
                    source: { type: 'string', enum: ['resume','jd'] },
                    start: { type: 'integer', minimum: 0 },
                    end: { type: 'integer', minimum: 0 },
                    quote: { type: 'string' }
                  }
                }
              }
            }
          }
        },
        scores: {
          type: 'object',
          required: ['experience_alignment','skills_match','impact_quantification','seniority_signal','keyword_coverage'],
          properties: {
            experience_alignment: { type: 'integer', minimum: 0, maximum: 100 },
            skills_match: { type: 'integer', minimum: 0, maximum: 100 },
            impact_quantification: { type: 'integer', minimum: 0, maximum: 100 },
            seniority_signal: { type: 'integer', minimum: 0, maximum: 100 },
            keyword_coverage: { type: 'integer', minimum: 0, maximum: 100 }
          }
        },
        strengths: { type: 'array', items: { type: 'string' } },
        weaknesses: { type: 'array', items: { type: 'string' } },
        improvement_roadmap: {
          type: 'object', required: ['immediate','short_term','long_term'],
          properties: {
            immediate: { type: 'array', items: { type: 'string' } },
            short_term: { type: 'array', items: { type: 'string' } },
            long_term: { type: 'array', items: { type: 'string' } }
          }
        },
        market_competitiveness: {
          type: 'object', required: ['positioning','estimated_hiring_probability','benchmarking_notes'],
          properties: {
            positioning: { type: 'string' },
            estimated_hiring_probability: { type: 'integer', minimum: 0, maximum: 100 },
            benchmarking_notes: { type: 'string' }
          }
        },
        missing_requirements: { type: 'array', items: { type: 'string' } },
        unsupported_claims: { type: 'array', items: { type: 'string' } },
        ambiguities: { type: 'array', items: { type: 'string' } }
      }
    } as const;

    const userContent = {
      instructions: `Analyze the candidate's Resume against the Job Description using the schema below.\n- Use only the provided inputs.\n- Optimize each section's text with JD-aligned keywords without adding new facts.\n- Populate evidence arrays with quotes and character offsets.\n- Apply the scoring rubric from the system message.\n- Output MUST be valid JSON per schema. No additional keys.`,
      inputs: { resume_text, job_description, jd_keyword_map },
      schema: ANALYSIS_SCHEMA
    };

    const rsp = await openai.responses.create({
      model: getModel(),
      input: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(userContent) }
      ],
      response_format: { type: 'json_schema', json_schema: { name: 'ResumeJDAnalysis', schema: ANALYSIS_SCHEMA, strict: true } as any },
      temperature: 0.2,
      top_p: 1,
      seed: 7,
      max_output_tokens: 2000
    });

    let analysis: unknown;
    try {
      // @ts-expect-error helper on SDK
      const text = (rsp as any).output_text ?? JSON.stringify(rsp);
      analysis = JSON.parse(text);
    } catch (err) {
      console.error('Invalid JSON from model', err);
      return NextResponse.json({ error: 'Invalid JSON from model' }, { status: 500 });
    }

    if (!analysis || typeof analysis !== 'object') {
      return NextResponse.json({ error: 'Invalid analysis structure received' }, { status: 500 });
    }

    recordAnalysisUsage(session.user.email);

    return NextResponse.json({ analysis, message: 'Analysis completed successfully' });

  } catch (error) {
    console.error('Analysis error:', error);
    
    return NextResponse.json({ 
      error: 'An error occurred during analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 