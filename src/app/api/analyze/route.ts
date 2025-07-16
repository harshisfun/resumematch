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

    const prompt = `You are a technical recruiter tasked to evaluate how well a candidate's resume matches a job description.

Inputs:
1. Candidate's resume
2. Job description

Instructions:
* Be fair and objective. Do not hallucinate information not present in the resume.
* Use only the content available in both documents, resume and job description.
* Do not speculate about potential fit beyond what's explicitly stated.
* Penalize if the required key skills from the JD are missing in the resume.
* Deduct points if any critical skills, years of experience, or industry/domain context are missing from the candidate resume.

Task: Compare the resume to the job description and produce a structured output that includes the below details:
* "Match Score": A percentage scoring from 0 to 100 representing the overall match between the candidate's resume and the job description.
* "Score Breakdown": A breakdown of the match in key categories:
   * "Skill Match": Match score for each skill: Primary, Secondary and Nice-to-have skills (0–100).
      * Primary Skills: List all the primary skills in comma separated format.
         * Significance: Percentage weights based on their importance compared to remaining skills.
         * Match: Match Score, e.g. X%.
         * List all the skills that match the candidate's resume.
         * Provide an exact line or bullet point from the resume that supports the match.
      * Secondary Skills: List all the secondary skills in comma separated format.
         * Significance: Percentage weights based on their importance compared to remaining skills.
         * Match: Match Score, e.g. Y%.
         * List all the skills that match the candidate's resume.
         * Provide an exact line or bullet point from the resume that supports the match.
      * Nice-to-have Skills: List all nice-to-have skills in comma separated format.
         * Significance: Percentage weights based on their importance compared to remaining skills.
         * Match: Match Score, e.g. Z%.
         * List all the skills that match the candidate's resume.
         * Provide an exact line or bullet point from the resume that supports the match.
   * "Prior Experience": Relevant prior years of experience (0–100). Provide an exact line or bullet point from the resume that supports the match.
   * "Industry Knowledge": Evidence of familiarity with the specific industry mentioned in the job that matches the candidate resume, (e.g., finance, healthcare, e-commerce, etc) (0-100). Provide an exact line or bullet point from the resume that supports the match.
   * "Domain Expertise": Depth of experience or specialization in the specific domain or technical field relevant to the role (e.g., backend systems, machine learning, supply chain, operations & strategy, marketing, sales, etc.) (0-100). Provide an exact line or bullet point from the resume that supports the match. 
   * "Education Requirements": Alignment of academic background with job requirements (0–100). Provide an exact line or bullet point from the resume that supports the match.
* "Missing Criteria": Important skills, experience, or qualifications listed in the job description that are not present in the candidate's resume. Provide an exact line or bullet point from the job description that supports the claim.
* "Overall Match Score Verdict": A short textual summary (2–3 sentences) justifying the score, written in recruiter-friendly language.
* "Overall Skill Comparison Table": Provide a list of skills by:
* "Required Skill": Bullet point required skills from job description.
* "Present in Resume": Bullet point skills that were present in the candidate's resume.
* "Absent in Resume": Bullet point skills that were not present in the candidate's resume.
* "Improvement Recommendations": Provide specific, actionable recommendations for the candidate to improve their match with the job description. Include:
  * "Skills Development": Specific skills to learn or improve, with suggested learning resources or approaches.
  * "Experience Enhancement": How to gain relevant experience, including project ideas, volunteer opportunities, or career moves.
  * "Resume Optimization": Suggestions for better presenting existing experience and skills.
  * "Education/Certifications": Recommended courses, certifications, or educational paths.
  * "Industry Knowledge": How to build domain expertise in the specific industry.
  * "Overall Strategy": A prioritized action plan with timeline suggestions.

Resume:
${resumeText}

Job Description:
${jobDescription}

Please provide your analysis in JSON format with the structure described above.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a professional technical recruiter with expertise in evaluating candidate-job compatibility. Provide detailed, objective analysis in JSON format."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 4000,
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
      analysis = JSON.parse(analysisText);
    } catch (parseError) {
      // If JSON parsing fails, return the raw text
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      return NextResponse.json({ 
        error: 'Failed to parse analysis response',
        rawResponse: analysisText
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