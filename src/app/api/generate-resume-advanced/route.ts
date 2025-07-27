/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { resumeText, jobDescription, level1Improvements, candidateName, contactInfo } = await request.json();

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

    // Extract candidate info
    const extractedInfo = extractCandidateInfo(resumeText);
    const finalCandidateName = candidateName || extractedInfo.name || "Professional Candidate";
    const finalContactInfo = contactInfo || extractedInfo.contact || "Contact information to be updated";

    // Analyze job description for company type and role specifics
    const jobAnalysis = await analyzeJobDescription(jobDescription);

    // Generate multiple resume versions
    const resumeVersions = await generateMultipleVersions(
      resumeText, 
      jobDescription, 
      level1Improvements, 
      finalCandidateName, 
      finalContactInfo,
      jobAnalysis
    );

    return NextResponse.json({
      success: true,
      candidateName: finalCandidateName,
      jobAnalysis,
      resumeVersions
    });

  } catch (error) {
    console.error('Error generating advanced resume:', error);
    return NextResponse.json({ 
      error: 'Failed to generate resume versions' 
    }, { status: 500 });
  }
}

async function analyzeJobDescription(jobDescription: string) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are an expert at analyzing job descriptions to determine optimal resume positioning strategies."
      },
      {
        role: "user",
        content: `Analyze this job description and provide strategic insights for resume optimization:

${jobDescription}

Provide your analysis in this JSON format:
{
  "companyType": "startup|midsize|enterprise|faang|consulting|finance|healthcare|other",
  "industryVertical": "specific industry",
  "roleLevel": "entry|mid|senior|principal|executive",
  "cultureType": "innovative|traditional|results-driven|collaborative|fast-paced",
  "keySuccessMetrics": ["metric1", "metric2", "metric3"],
  "criticalSkills": ["skill1", "skill2", "skill3"],
  "preferredBackground": "specific background preferences",
  "competitiveAdvantages": ["what makes candidates stand out"],
  "languageStyle": "formal|casual|technical|business|creative",
  "priorityAreas": ["area1", "area2", "area3"]
}`
      }
    ],
    max_tokens: 1000,
    temperature: 0.3
  });

  try {
    const analysisText = completion.choices[0].message.content || '';
    return JSON.parse(analysisText);
  } catch (error) {
    console.error('Error parsing job analysis:', error);
    return {
      companyType: "midsize",
      industryVertical: "technology",
      roleLevel: "mid",
      cultureType: "results-driven",
      keySuccessMetrics: ["performance", "growth", "innovation"],
      criticalSkills: ["communication", "problem-solving", "technical skills"],
      preferredBackground: "relevant experience",
      competitiveAdvantages: ["proven track record", "strong skills"],
      languageStyle: "business",
      priorityAreas: ["experience", "skills", "achievements"]
    };
  }
}

async function generateMultipleVersions(
  resumeText: string, 
  jobDescription: string, 
  level1Improvements: any, 
  candidateName: string, 
  contactInfo: string,
  jobAnalysis: any
) {
  const versions = [
    {
      name: "ATS-Optimized Version",
      strategy: "Maximum ATS compatibility with strategic keyword optimization",
      focusArea: "ats_optimization"
    },
    {
      name: "Impact-Focused Version", 
      strategy: "Emphasize quantified achievements and leadership impact",
      focusArea: "impact_maximization"
    },
    {
      name: "Skills-Forward Version",
      strategy: "Technical skills and competencies prominently featured",
      focusArea: "skills_emphasis"
    }
  ];

  const generatedVersions = [];

  for (const version of versions) {
    try {
      const htmlContent = await generateVersionSpecificResume(
        resumeText,
        jobDescription,
        level1Improvements,
        candidateName,
        contactInfo,
        jobAnalysis,
        version
      );

      generatedVersions.push({
        ...version,
        htmlCode: htmlContent,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error(`Error generating ${version.name}:`, error);
    }
  }

  return generatedVersions;
}

async function generateVersionSpecificResume(
  resumeText: string,
  jobDescription: string,
  level1Improvements: any,
  candidateName: string,
  contactInfo: string,
  jobAnalysis: any,
  version: any
) {
  const versionSpecificPrompt = createVersionSpecificPrompt(version, jobAnalysis);
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are an expert resume strategist specializing in creating targeted, high-impact resumes that surpass industry standards. Your response must be ONLY the filled HTML template with no additional text, explanations, or markdown formatting."
      },
      {
        role: "user",
        content: `${versionSpecificPrompt}

ORIGINAL RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

LEVEL 1 IMPROVEMENTS:
${JSON.stringify(level1Improvements, null, 2)}

CANDIDATE INFO:
Name: ${candidateName}
Contact: ${contactInfo}

JOB ANALYSIS:
${JSON.stringify(jobAnalysis, null, 2)}

VERSION FOCUS: ${version.strategy}

Create a superior ${version.name} using the advanced HTML template with strategic positioning for this specific role.`
      }
    ],
    max_tokens: 16000,
    temperature: 0.4
  });

  return completion.choices[0].message.content || '';
}

function createVersionSpecificPrompt(version: any, jobAnalysis: any) {
  const basePrompt = `You are creating a ${version.name} that ${version.strategy}.`;
  
  switch (version.focusArea) {
    case 'ats_optimization':
      return `${basePrompt}

ATS OPTIMIZATION FOCUS:
- Use exact keywords from job description strategically throughout resume
- Optimize section headers for ATS parsing ("Professional Experience", "Core Competencies", "Technical Skills")
- Ensure clean, parseable format with proper heading hierarchy
- Include skills section with both spelled-out and abbreviated terms
- Use standard bullet points and avoid special characters
- Maintain consistent formatting and spacing
- Include relevant keywords in multiple sections naturally`;

    case 'impact_maximization':
      return `${basePrompt}

IMPACT MAXIMIZATION FOCUS:
- Lead with most impressive, quantified achievements
- Use strong action verbs and power words
- Emphasize leadership, influence, and business impact
- Highlight ROI, cost savings, revenue generation, efficiency improvements
- Show progression and growth throughout career
- Position candidate as a results-driven professional
- Use metrics and percentages wherever possible`;

    case 'skills_emphasis':
      return `${basePrompt}

SKILLS-FORWARD FOCUS:
- Create a prominent "Core Competencies" or "Technical Expertise" section
- Organize skills by category (Technical, Leadership, Industry-Specific)
- Integrate skills naturally into experience descriptions
- Highlight transferable skills for career pivots
- Show skill application through specific examples
- Balance hard skills with soft skills based on role requirements
- Demonstrate continuous learning and skill development`;

    default:
      return basePrompt;
  }
}

function extractCandidateInfo(resumeText: string) {
  const info = {
    name: '',
    contact: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    github: ''
  };

  // Extract name (usually the first line or at the top)
  const namePatterns = [
    /^([A-Z][a-z]+ [A-Z][a-z]+)/m,
    /([A-Z][a-z]+ [A-Z][a-z]+[A-Z]?[a-z]*)/,
  ];
  
  for (const pattern of namePatterns) {
    const nameMatch = resumeText.match(pattern);
    if (nameMatch && nameMatch[1] && nameMatch[1].length < 50) {
      info.name = nameMatch[1].trim();
      break;
    }
  }

  // Extract email
  const emailMatch = resumeText.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
  if (emailMatch) {
    info.email = emailMatch[1];
  }

  // Extract phone
  const phoneMatch = resumeText.match(/(\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/);
  if (phoneMatch) {
    info.phone = phoneMatch[1].trim();
  }

  // Extract LinkedIn
  const linkedinMatch = resumeText.match(/(?:linkedin\.com\/in\/)([^\s\n\r,]+)/i);
  if (linkedinMatch) {
    info.linkedin = `linkedin.com/in/${linkedinMatch[1]}`;
  }

  // Extract GitHub
  const githubMatch = resumeText.match(/(?:github\.com\/)([^\s\n\r,]+)/i);
  if (githubMatch) {
    info.github = `github.com/${githubMatch[1]}`;
  }

  // Extract location
  const locationMatch = resumeText.match(/([A-Za-z\s]+,\s*[A-Z]{2}(?:\s+[0-9]{5})?)/);
  if (locationMatch) {
    info.location = locationMatch[1].trim();
  }

  // Combine contact info
  const contactParts = [];
  if (info.location) contactParts.push(info.location);
  if (info.email) contactParts.push(info.email);
  if (info.phone) contactParts.push(info.phone);
  if (info.linkedin) contactParts.push(info.linkedin);
  if (info.github) contactParts.push(info.github);
  
  info.contact = contactParts.join(' | ');

  return info;
} 