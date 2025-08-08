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

    // Legacy prompt removed
    /*
    ANALYSIS REQUIREMENTS:

1. OVERALL CANDIDACY SCORE (0-100):
   - Calculate a comprehensive score based on all factors
   - Consider skills match, experience relevance, education, and overall fit
   - Provide clear reasoning for the score

2. SECTION-WISE ANALYSIS:
   For each resume section (Professional Summary, Experience, Skills, Education, Projects):
   - Extract current content exactly as written
   - Provide optimized versions with JD-specific keywords
   - Score each section (0-10) with detailed reasoning
   - Include specific improvements and keyword integrations

3. SCORE BREAKDOWN:
   - Years of Relevant Experience (0-25 points)
   - Technical & Core Skills Match (0-20 points)
   - Previous Work Quality & Impact (0-15 points)
   - Education Institution Tier (0-15 points)
   - Relevant Projects & Internships (0-10 points)
   - Certifications & Additional Qualifications (0-8 points)
   - Extracurricular Activities & Leadership (0-4 points)
    - Communication & Presentation Skills (0-3 points)

4. STRENGTHS & WEAKNESSES:
   - Identify 3-5 key strengths that align with the JD
   - Identify 3-5 areas for improvement
   - Provide specific evidence and impact assessment

5. IMPROVEMENT ROADMAP:
   - Immediate resume optimizations (keywords, format, content)
   - Long-term development recommendations (courses, certifications, experience)
   - Specific actionable steps with timelines

6. MARKET COMPETITIVENESS:
   - Assess candidate's position in the talent pool
   - Provide realistic success probability
   - Compare against typical successful candidates
    - Include detailed market reasoning

    CRITICAL REQUIREMENTS:

- FACTUAL ACCURACY: Never fabricate experiences or qualifications
- KEYWORD INTEGRATION: Naturally incorporate JD keywords into existing content
- ACTION VERBS: Enhance weak verbs with powerful alternatives
- QUANTIFICATION: Preserve existing numbers and add context where logical
- ATS OPTIMIZATION: Use standard headers and industry terminology
    - SPECIFIC RECOMMENDATIONS: Provide exact course names, URLs, and actionable steps

Resume:
${resumeText}

Job Description:
${jobDescription}

Provide the analysis in the following JSON structure:

{
  "Overall Candidacy Score": [0-100 numeric value],
  "Section Wise Analysis": {
    "Professional Summary": {
      "Current Version": "Exact current summary/objective (or 'Not Present' if missing)",
      "Optimized Version": "Enhanced summary with JD-relevant keywords and value proposition",
      "Keywords Added": ["List of JD keywords integrated"],
      "Improvements Made": ["Specific enhancements"],
      "Current Score": [0-10],
      "Optimized Score": [8-10],
      "ATS Impact": "How the optimization improves ATS scanning"
    },
    "Professional Experience": {
      "Overall Section Score": [0-10],
      "Jobs": [
        {
          "Job Title": "Exact job title from resume",
          "Company": "Company name",
          "date": "Date range",
          "Bullet Points": [
            {
              "Original Text": "Exact bullet point from resume",
              "Optimized Version": "Enhanced version with JD keywords and stronger action verbs",
              "Keywords Added": ["Specific JD keywords integrated"],
              "Action Verb Enhancement": "Original verb → Enhanced verb",
              "Quantification Improvement": "How numbers/metrics were enhanced",
              "Current Score": [0-10],
              "Optimized Score": [8-10],
              "Relevance Explanation": "How this bullet now better matches JD requirements",
              "ATS Keyword Density": "Keywords per sentence ratio"
            }
          ]
        }
      ]
    },
    "Skills": {
      "Current Skills List": "Exact skills as listed in resume",
      "Optimized Skills Organization": {
        "Technical Skills": ["JD-prioritized technical skills"],
        "Core Competencies": ["JD-aligned soft skills and methodologies"],
        "Tools & Platforms": ["JD-relevant tools and technologies"],
        "Industry Knowledge": ["Domain-specific skills from JD"]
      },
      "Missing Critical Skills": ["Important JD skills not currently listed"],
      "Skills Placement Strategy": "Where to position skills for maximum ATS impact",
      "Current Score": [0-10],
      "Optimized Score": [8-10],
      "Keyword Match Percentage": "[X]% of JD skills present"
    },
    "Education": {
      "Current Education": "Exact education section from resume",
      "Optimized Presentation": "Enhanced education section highlighting JD-relevant aspects",
      "Relevant Coursework": ["JD-aligned courses to highlight"],
      "Academic Achievements": ["Honors/projects relevant to target role"],
      "Positioning Strategy": "Whether to place education at top or bottom",
      "Current Score": [0-10],
      "Optimized Score": [7-10],
      "Analysis": "Detailed assessment of education relevance",
      "Improvements": "Specific recommendations for education section"
    }
    */
    // end legacy block
  },
  "Score Breakdown": {
    "Years of Relevant Experience": {
      "Score": [0-25 points],
      "Weight": "25%",
      "Analysis": "Detailed assessment of experience alignment with JD requirements and quality"
    },
    "Technical & Core Skills Match": {
      "Score": [0-20 points],
      "Weight": "20%",
      "Analysis": "Evaluation of proficiency in required skills vs JD requirements"
    },
    "Previous Work Quality & Impact": {
      "Score": [0-15 points],
      "Weight": "15%",
      "Analysis": "Assessment of achievements, responsibilities, and measurable outcomes"
    },
    "Education Institution Tier": {
      "Score": [0-15 points],
      "Weight": "15%",
      "Analysis": "Institution ranking based on tier system (Tier 1: 13-15, Tier 2: 8-12, Tier 3: 3-7)"
    },
    "Relevant Projects & Internships": {
      "Score": [0-10 points],
      "Weight": "10%",
      "Analysis": "Quality and relevance of academic/professional projects"
    },
    "Certifications & Additional Qualifications": {
      "Score": [0-8 points],
      "Weight": "8%",
      "Analysis": "Industry-relevant certifications, professional courses, licenses"
    },
    "Extracurricular Activities & Leadership": {
      "Score": [0-4 points],
      "Weight": "4%",
      "Analysis": "Leadership roles, volunteer work, sports, cultural activities"
    },
    "Communication & Presentation Skills": {
      "Score": [0-3 points],
      "Weight": "3%",
      "Analysis": "Based on resume quality, presentation, portfolio"
    }
  },
  "Strengths": [
    {
      "Category": "Skills/Experience/Education/etc",
      "Description": "Specific qualification, skill, or experience that strongly aligns with JD",
      "Evidence": "Exact quote or reference from resume",
      "Impact": "How this strength benefits the role"
    }
  ],
  "Weaknesses": [
    {
      "Category": "Skills/Experience/Education/etc", 
      "Gap": "Specific missing requirement or area of concern",
      "Impact": "How this weakness affects candidacy",
      "Severity": "Critical/Moderate/Minor"
    }
  ],
  "Scope of Improvements": {
    "Column A - Structural Resume Improvements": {
      "Keyword Integration": [
        "Specific industry and role-relevant keywords to add from JD"
      ],
      "Format Enhancement": [
        "Specific bullet points to restructure using 'Accomplished [A] as measured by [B] by doing [C]' format"
      ],
      "Content Reframing": [
        "Ways to better highlight existing experience to match JD requirements"
      ],
      "Section Optimization": [
        "Recommendations for resume section reorganization or emphasis"
      ],
      "Quantification": [
        "Areas where metrics and numbers should be added to existing achievements"
      ]
    },
    "Column B - Long-term Career Development": {
      "Top 3 Recommended Courses/Certifications": [
        {
          "Course/Certification Name": "Specific course or certification name",
          "Provider": "Platform or institution name (e.g., Coursera, Udemy, AWS, Google)",
          "Duration": "Time to complete (e.g., 3-6 months, 40 hours)",
          "Cost": "Approximate cost (e.g., $49/month, $2000, Free)",
          "Relevance": "Why this specific course/cert is valuable for the JD",
          "Direct Link": "https://actual-course-url.com",
          "Priority": "High/Medium based on JD alignment"
        }
      ],
      "Skills Development": [
        "Technical and soft skills to acquire for better role fit"
      ],
      "Experience Building": [
        "Types of projects, roles, or responsibilities to seek"
      ],
      "Professional Development": [
        "Networking, leadership opportunities, or industry involvement"
      ]
    }
  },
  "Market Competitiveness": {
    "Competitive Level": "Below Average/Average/Above Average/Exceptional",
    "Market Position": "Explanation of where candidate stands in talent pool",
    "Hiring Probability": "Realistic assessment of chances based on current profile", 
    "Benchmark Comparison": "How candidate compares to successful hires for similar positions",
    "Percentile Ranking": "Top X% of candidates for this role",
    "Detailed Reasoning": {
      "Company Hiring Patterns": "Company X typically hires candidates with [specific skills/experience/education]. For this role, they prefer [specific requirements with examples]",
      "Educational Background Analysis": "This company/role typically recruits from [Tier 1/2/3] institutions. Candidate's [institution name] falls in [tier] which [helps/hurts] their chances because [specific reasoning]",
      "Experience Level Expectations": "For this role at Company X, typical hires have [X-Y years] of experience in [specific areas]. Candidate has [actual experience] which positions them [above/below/at] the typical range",
      "Skills Gap Analysis": "Company X prioritizes [specific skill set] for this role. Based on typical hiring patterns, candidates need proficiency in [specific technologies/skills]. Candidate's profile shows [specific gaps/strengths]",
      "Success Probability Breakdown": "Based on Company X's hiring history for similar roles: [X]% of hired candidates had [qualification 1], [Y]% had [qualification 2], [Z]% had [qualification 3]. Candidate meets [number] of these criteria"
    }
  }
}

CRITICAL: Return ONLY valid JSON following the exact structure above. Do not include any text before or after the JSON. The response must start with { and end with }. Ensure all optimizations preserve factual accuracy while maximizing JD alignment and ATS compatibility.`;

    const completion = await openai.chat.completions.create({
      model: getModel(),
      messages: [
        {
          role: "system",
          content: "You are an expert resume strategist and ATS optimization specialist with deep expertise in transforming resumes for maximum impact. Your specialties include: (1) Natural keyword integration that beats ATS systems, (2) Action-verb optimization for role-specific impact, (3) Quantification enhancement while preserving factual accuracy, (4) Content reframing for perfect job-role alignment. You excel at making candidates appear as the ideal fit for specific positions while maintaining complete honesty about their background. Provide detailed optimization analysis in the exact JSON format requested."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 16000,
    });

    const analysisText = completion.choices[0]?.message?.content;
    
    if (!analysisText) {
      return NextResponse.json({ 
        error: 'No analysis generated' 
      }, { status: 500 });
    }

    // Try to parse the response as JSON
    let analysis;
    try {
      // Clean the response text - remove any markdown code blocks or extra text
      let cleanedText = analysisText.trim();
      
      // Remove markdown code blocks if present
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.substring(7);
      }
      if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.substring(3);
      }
      if (cleanedText.endsWith('```')) {
        cleanedText = cleanedText.substring(0, cleanedText.length - 3);
      }
      
      cleanedText = cleanedText.trim();
      
      // Ensure it starts and ends with braces
      if (!cleanedText.startsWith('{')) {
        const braceStart = cleanedText.indexOf('{');
        if (braceStart !== -1) {
          cleanedText = cleanedText.substring(braceStart);
        }
      }
      if (!cleanedText.endsWith('}')) {
        const braceEnd = cleanedText.lastIndexOf('}');
        if (braceEnd !== -1) {
          cleanedText = cleanedText.substring(0, braceEnd + 1);
        }
      }
      
      analysis = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      console.error('Raw response:', analysisText);
      
      return NextResponse.json({ 
        error: 'Failed to parse analysis response. Please try again.',
        details: 'The AI response was not in the expected JSON format.'
      }, { status: 500 });
    }

    // Validate the analysis structure
    if (!analysis || typeof analysis !== 'object') {
      return NextResponse.json({ 
        error: 'Invalid analysis structure received' 
      }, { status: 500 });
    }

    // Record usage
    recordAnalysisUsage(session.user.email);

    return NextResponse.json({ 
      analysis,
      message: 'Analysis completed successfully'
    });

  } catch (error) {
    console.error('Analysis error:', error);
    
    return NextResponse.json({ 
      error: 'An error occurred during analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 