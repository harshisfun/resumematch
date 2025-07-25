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

    const prompt = `You are a senior technical recruiter and career strategist with 15+ years of experience evaluating candidates for tech roles across Fortune 500 companies.

Inputs:
1. Candidate's resume
2. Job description

Core Instructions:
* Be fair, objective, and data-driven. Never hallucinate information not present in the resume.
* Use only explicit content from both documents.
* Penalize heavily for missing critical requirements from the JD.
* Provide actionable, specific recommendations based on industry best practices.
* Consider market competitiveness and hiring standards for the role level.

Task: Analyze the resume against the job description and provide a comprehensive evaluation with the following structure:

## CORE ANALYSIS
* "Match Score": Overall compatibility percentage (0-100)
* "Score Breakdown": Detailed category analysis:
   * "Technical Skills Match": 
      * Primary Skills: Critical must-have skills from JD
         * Skills List: Comma-separated list
         * Significance: Percentage weight (should total ~60-70% for technical roles)
         * Match Score: 0-100%
         * Evidence: Exact resume quotes supporting each match
         * Gap Analysis: Missing critical skills with impact assessment
      * Secondary Skills: Important but not critical skills
         * Skills List: Comma-separated list  
         * Significance: Percentage weight (should total ~20-30%)
         * Match Score: 0-100%
         * Evidence: Exact resume quotes
      * Nice-to-have Skills: Bonus skills that add value
         * Skills List: Comma-separated list
         * Significance: Percentage weight (should total ~10-20%)
         * Match Score: 0-100%
         * Evidence: Exact resume quotes
   * "Experience Analysis":
      * Years of Experience: Required vs. actual with gap analysis
      * Relevant Project Complexity: Scale and impact of projects
      * Leadership/Management: Team size, scope of responsibility
      * Evidence: Exact resume quotes supporting experience claims
   * "Industry & Domain Expertise":
      * Industry Familiarity: Specific industry knowledge (0-100)
      * Domain Depth: Technical domain specialization (0-100)
      * Business Context: Understanding of business challenges (0-100)
      * Evidence: Exact resume quotes
   * "Education & Credentials": 
      * Degree Requirements: Match analysis (0-100)
      * Certifications: Relevant professional certifications
      * Continuous Learning: Evidence of skill development
      * Evidence: Exact resume quotes

* "Missing Critical Elements": 
   * Must-have skills completely absent from resume
   * Experience gaps (years, type, scale)
   * Required certifications or education
   * Industry-specific knowledge gaps
   * Evidence: Exact JD quotes showing requirements

* "Competitive Assessment":
   * Role Level: Junior/Mid/Senior/Principal based on JD requirements
   * Market Competitiveness: How this candidate compares to typical hires
   * Hiring Bar: Company tier estimation (Startup/Mid-size/Enterprise/FAANG)
   * Candidate Positioning: Where they stand in the applicant pool

## THREE-LEVEL RECOMMENDATION SYSTEM

### "Level 1 - Immediate Resume Optimization" (0-2 weeks implementation):
* "Keyword Enhancement": 
   * Missing keywords to add based on existing experience
   * Technical terms to incorporate naturally
   * Industry jargon alignment
* "Content Restructuring":
   * Better presentation of existing achievements
   * Quantification opportunities (add metrics, percentages, scale)
   * Action verb improvements for experience bullets
   * Skills section reorganization
* "Format Optimization":
   * Section reordering for maximum impact
   * Highlighting relevant experience more prominently
   * ATS optimization suggestions

### "Level 2 - Market Positioning Strategy" (Immediate insight):
* "Role Competitiveness Analysis":
   * Estimated application pool size for this role/company
   * Typical candidate profile for this position
   * Success rate estimation based on current qualifications
   * Timeline expectations for hiring process
* "Competitive Standing":
   * Strengths that differentiate from other candidates
   * Common competitor profiles for this role
   * Unique value propositions to emphasize
   * Red flags that might concern recruiters
* "Application Strategy":
   * Best approach for this specific company/role
   * Networking opportunities within the organization
   * Interview preparation focus areas
   * Timing recommendations for application

### "Level 3 - Long-term Development Plan" (3-18 months implementation):
* "Skills Development Roadmap":
   * Priority skills to learn (with specific technologies/tools)
   * Recommended learning resources (courses, books, platforms)
   * Practical application opportunities (projects, open source)
   * Timeline for skill acquisition (3/6/12 month milestones)
* "Experience Enhancement":
   * Specific project ideas to bridge experience gaps
   * Volunteer/freelance opportunities in target domain
   * Career move strategy (lateral moves, promotions)
   * Side projects that demonstrate relevant skills
* "Professional Development":
   * Industry certifications with highest ROI
   * Conference attendance and networking events
   * Thought leadership opportunities (writing, speaking)
   * Mentorship and advisory opportunities
* "Educational Advancement":
   * Degree programs if needed for role progression
   * Specialized bootcamps or intensive programs
   * Online course sequences with industry recognition
   * Research or academic involvement opportunities

## SUPPORTING ANALYSIS
* "Skill Comparison Matrix":
   * Required Skills: All skills from JD with priority levels
   * Present in Resume: Matching skills with evidence quotes
   * Absent from Resume: Missing skills with impact assessment
   * Transferable Skills: Related skills that could bridge gaps

* "Overall Verdict": 
   * 3-4 sentence recruiter-friendly summary
   * Hiring recommendation (Strong Yes/Yes/Maybe/No/Strong No)
   * Key strengths and critical gaps
   * Realistic timeline for candidacy improvement

* "Resume Rewrite Potential":
   * Assess if Level 1 improvements alone could significantly boost match score
   * Estimated score improvement possible through better presentation
   * Specific achievements that could be highlighted more effectively
   * ROI analysis for professional resume rewrite service

Resume:
${resumeText}

Job Description:
${jobDescription}

CRITICAL: Return ONLY valid JSON following the exact structure above. Do not include any text before or after the JSON. The response must start with { and end with }. Ensure all recommendations are specific, actionable, and based on current market conditions for the target role.`;

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