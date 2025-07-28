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

    const prompt = `You are an expert resume analyzer and career consultant. Your task is to conduct a comprehensive section-wise analysis of a candidate's resume against a specific job description and provide detailed feedback with individual scoring for each resume element.

SECTION-WISE ANALYSIS REQUIREMENTS:

1. PROFESSIONAL EXPERIENCE ANALYSIS:
   - Extract EVERY bullet point from each job/role in the resume
   - Score each bullet point individually (0-10) based on:
     * Impact and quantification (30%)
     * Relevance to target JD (25%)
     * Action verb strength (20%)
     * Clarity and specificity (15%)
     * Keyword alignment (10%)
   - Provide improved version of each bullet point using "Accomplished [A] as measured by [B] by doing [C]" format
   - Explain what improvements were made (action verbs, quantification, keywords, etc.)

2. SKILLS SECTION ANALYSIS:
   - Evaluate current skills presentation and organization
   - Reorganize skills into relevant categories with JD keywords
   - Identify missing skills from JD requirements
   - Score the overall skills section presentation

3. EDUCATION SECTION ANALYSIS:
   - Assess educational background relevance to role
   - Suggest improvements in presentation
   - Score based on relevance and presentation

4. OTHER SECTIONS (Projects, Summary, etc.):
   - Analyze each section if present
   - Provide specific improvement suggestions
   - Individual scoring for each section

Analysis Instructions:
Carefully compare the candidate's resume against the job description, considering:
* Required skills, qualifications, and experience
* Preferred qualifications and nice-to-have skills
* Company culture and industry standards
* Role responsibilities and expectations
* Career progression requirements

CRITICAL REQUIREMENTS:

FOR RESUME TRANSFORMATION EXAMPLES:
1. Extract 3-5 actual bullet points from the candidate's resume (copy them exactly)
2. Rewrite each bullet point to better align with the JD using:
   - Job-relevant keywords from the JD
   - "Accomplished [A] as measured by [B] by doing [C]" format
   - Stronger action verbs
   - Quantification where possible (estimate if needed)
   - Industry-specific terminology
3. For the skills section, take the actual skills listed and reorganize/enhance them
4. If there's a summary/objective, rewrite it to better match the JD
5. Always preserve factual accuracy - enhance presentation, don't fabricate new experiences

FOR COURSE/CERTIFICATION RECOMMENDATIONS:
1. Recommend EXACTLY 3 courses/certifications that are most relevant to the JD requirements
2. Prioritize well-known, reputable providers (Coursera, Udemy, AWS, Google, Microsoft, etc.)
3. Include actual, working URLs to the specific courses (not just platform homepages)
4. Focus on the most popular and industry-recognized certifications/courses
5. Consider the candidate's current skill level and suggest appropriate next steps
6. Examples of good recommendations:
   - AWS Certified Solutions Architect (for cloud roles)
   - Google Data Analytics Certificate (for data roles)
   - Coursera Machine Learning Specialization by Stanford (for ML roles)
   - Scrum Master Certification (for product/project management roles)

FOR MARKET COMPETITIVENESS DETAILED REASONING:
1. Analyze the company type/tier based on JD (startup, mid-size, enterprise, FAANG, etc.)
2. Provide specific hiring patterns for that company type and role level
3. Reference actual educational tiers relevant to Indian market (IIT/IIM/ISI = Tier 1, NIT/IIIT = Tier 2, etc.)
4. Give concrete percentages and statistics for typical hiring criteria
5. Compare candidate's background point-by-point against typical successful hires
6. Explain WHY each factor helps or hurts their chances with specific reasoning
7. Examples of good reasoning:
   - "FAANG companies for Senior PM roles typically hire 70% from Tier 1 institutions, 25% from Tier 2, 5% from Tier 3"
   - "For this Data Scientist role, Google typically requires 5+ years ML experience, PhD/Masters preferred, Python/TensorFlow expertise"
   - "Mid-size startups in fintech prioritize domain experience (60%) over educational pedigree (20%)"

Provide the analysis in the following JSON structure:

{
  "Overall Candidacy Score": [0-100 numeric value],
  "Section Wise Analysis": {
    "Professional Experience": {
      "Overall Section Score": [0-10],
      "Bullet Points Analysis": [
        {
          "Original Text": "Exact bullet point from resume",
          "Score": [0-10],
          "Score Reasoning": "Why this score was given",
          "Improved Version": "Rewritten bullet point using 'Accomplished [A] as measured by [B] by doing [C]' format",
          "Improvements Applied": ["Action Verb Enhancement", "Quantification Added", "Keywords Integrated", "Impact Clarified"],
          "JD Alignment": "How this relates to job requirements"
        }
      ]
    },
    "Education": {
      "Overall Section Score": [0-10],
      "Analysis": "Assessment of educational background vs JD requirements",
      "Improvements": "Suggestions for better presentation of education"
    },
    "Skills": {
      "Overall Section Score": [0-10],
      "Current Skills Presentation": "How skills are currently listed",
      "Improved Skills Organization": {
        "Technical Skills": ["List of reorganized technical skills with JD keywords"],
        "Soft Skills": ["List of relevant soft skills"],
        "Tools & Technologies": ["List of tools/platforms"]
      },
      "Missing Skills": ["Skills mentioned in JD but not in resume"]
    },
    "Projects": {
      "Overall Section Score": [0-10],
      "Analysis": "Assessment of projects section if present",
      "Suggestions": "How to better present projects"
    },
    "Summary/Objective": {
      "Score": [0-10],
      "Current Version": "Current summary/objective from resume",
      "Improved Version": "Rewritten summary targeting the specific role",
      "Improvements": "What was enhanced"
    }
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
     "Resume Transformation Examples": {
       "Bullet Point Improvements": [
         {
           "Original": "Exact original bullet point from candidate's resume",
           "Improved": "Enhanced version using suggestions and JD alignment",
           "Improvements Applied": ["Keyword integration", "Quantification", "Action verb strengthening"],
           "Impact": "Explanation of how this change improves JD alignment and ATS compatibility"
         }
       ],
       "Skills Section Enhancement": {
         "Original Skills List": "Current skills section from resume",
         "Improved Skills List": "Reorganized and enhanced skills section with JD-relevant keywords",
         "Changes Made": "Specific improvements made to skills presentation"
       },
       "Summary/Objective Rewrite": {
         "Original": "Current summary/objective if present",
         "Improved": "Enhanced version aligned with JD requirements",
         "Key Changes": "Specific improvements made"
       }
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