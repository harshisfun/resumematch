import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canUseAnalysis, recordAnalysisUsage } from '@/lib/rateLimit';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    const prompt = `You are an expert resume analyzer and career consultant. Your task is to conduct a comprehensive analysis of a candidate's resume against a specific job description and provide structured feedback in the format specified below.

Analysis Instructions:
Carefully compare the candidate's resume against the job description, considering:
* Required skills, qualifications, and experience
* Preferred qualifications and nice-to-have skills
* Company culture and industry standards
* Role responsibilities and expectations
* Career progression requirements

Provide the analysis in the following JSON structure:

{
  "Overall Candidacy Score": [0-100 numeric value],
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
      "Skills Development": [
        "Technical and soft skills to acquire for better role fit"
      ],
      "Certifications": [
        "Industry-relevant certifications that would strengthen candidacy"
      ],
      "Education": [
        "Additional degrees, courses, or training programs to pursue"
      ],
      "Experience": [
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
    "Percentile Ranking": "Top X% of candidates for this role"
  }
}

Resume:
${resumeText}

Job Description:
${jobDescription}

CRITICAL: Return ONLY valid JSON following the exact structure above. Do not include any text before or after the JSON. The response must start with { and end with }. Ensure all recommendations are specific, actionable, and tailored to the exact role and candidate profile.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a professional technical recruiter and career strategist with 15+ years of experience evaluating candidates for tech roles across Fortune 500 companies. Provide detailed, objective analysis in JSON format."
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
      
      // Remove markdown code block syntax if present
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Find the first { and last } to extract just the JSON part
      const firstBrace = cleanedText.indexOf('{');
      const lastBrace = cleanedText.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleanedText = cleanedText.substring(firstBrace, lastBrace + 1);
      }
      
      analysis = JSON.parse(cleanedText);
    } catch (parseError) {
      // If JSON parsing fails, return the raw text for debugging
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      console.error('Raw response:', analysisText);
      return NextResponse.json({ 
        error: 'Failed to parse analysis response',
        rawResponse: analysisText,
        parseError: parseError instanceof Error ? parseError.message : String(parseError)
      }, { status: 500 });
    }

    // Record usage after successful analysis
    recordAnalysisUsage(session.user.email);

    return NextResponse.json({
      analysis,
      timestamp: new Date().toISOString(),
      rateLimit: {
        remaining: rateLimitResult.remaining
      }
    });

  } catch (error) {
    console.error('Analysis error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json({ 
        error: error.message 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 