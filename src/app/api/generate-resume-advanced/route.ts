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

Create a superior ${version.name} using the professional HTML template below with strategic positioning for this specific role.

PROFESSIONAL RESUME TEMPLATE:
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Resume</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', 'Arial', sans-serif;
            font-size: 11pt;
            line-height: 1.5;
            color: #2c3e50;
            background: #ffffff;
            margin: 0.75in;
            padding: 0;
            max-width: 8.5in;
        }
        .header {
            text-align: center;
            margin-bottom: 32px;
            padding-bottom: 20px;
            border-bottom: 3px solid #34495e;
        }
        .name {
            font-size: 28pt;
            font-weight: 700;
            margin-bottom: 12px;
            letter-spacing: 1px;
            color: #2c3e50;
        }
        .contact-info {
            font-size: 11pt;
            line-height: 1.4;
            color: #555;
            font-weight: 400;
        }
        .section {
            margin-bottom: 28px;
            page-break-inside: avoid;
        }
        .section-title {
            font-size: 14pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 2px solid #bdc3c7;
            color: #2c3e50;
        }
        .summary-text {
            font-size: 11pt;
            line-height: 1.6;
            color: #34495e;
            text-align: justify;
            margin-bottom: 4px;
        }
        .job-entry {
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 1px solid #ecf0f1;
        }
        .job-entry:last-child {
            border-bottom: none;
            margin-bottom: 0;
        }
        .job-header {
            margin-bottom: 12px;
        }
        .job-title-company {
            font-weight: 700;
            font-size: 12pt;
            color: #2c3e50;
            margin-bottom: 4px;
        }
        .job-date {
            font-style: italic;
            font-size: 10pt;
            color: #7f8c8d;
            float: right;
            margin-top: -20px;
        }
        .job-location {
            font-size: 10pt;
            color: #7f8c8d;
            margin-bottom: 8px;
        }
        .job-achievements {
            list-style: none;
            margin: 0;
            padding: 0;
        }
        .job-achievements li {
            margin-bottom: 8px;
            padding-left: 20px;
            position: relative;
            text-align: justify;
            line-height: 1.5;
            color: #34495e;
            font-size: 11pt;
        }
        .job-achievements li:before {
            content: "•";
            position: absolute;
            left: 0;
            font-weight: bold;
            color: #34495e;
        }
        .skills-grid {
            display: block;
            padding: 8px 0;
        }
        .skill-category {
            margin-bottom: 12px;
            line-height: 1.5;
        }
        .skill-label {
            font-weight: 700;
            display: inline;
            color: #2c3e50;
            margin-right: 8px;
        }
        .skill-list {
            display: inline;
            font-weight: 400;
            color: #34495e;
        }
        .education-entry {
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid #ecf0f1;
        }
        .education-entry:last-child {
            border-bottom: none;
            margin-bottom: 0;
        }
        .degree-info {
            font-weight: 700;
            font-size: 11pt;
            color: #2c3e50;
            margin-bottom: 4px;
        }
        .university-info {
            font-style: italic;
            color: #7f8c8d;
            margin-bottom: 4px;
        }
        .education-date {
            font-size: 10pt;
            color: #7f8c8d;
            float: right;
            margin-top: -20px;
        }
        .additional-section {
            margin-bottom: 20px;
        }
        .highlight-number {
            font-weight: 700;
            color: #2c3e50;
        }
        @media print {
            body { 
                margin: 0.5in; 
                font-size: 10pt;
            }
            .section { 
                page-break-inside: avoid; 
                margin-bottom: 24px;
            }
            .header {
                margin-bottom: 28px;
                padding-bottom: 16px;
            }
            .name {
                font-size: 24pt;
            }
            .section-title {
                font-size: 12pt;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="name">[CANDIDATE_NAME]</div>
        <div class="contact-info">[CONTACT_INFORMATION]</div>
    </div>

    [RESUME_SECTIONS]

</body>
</html>

SECTION TEMPLATES TO USE:

PROFESSIONAL SUMMARY:
<div class="section">
    <div class="section-title">Professional Summary</div>
    <div class="summary-text">[Enhanced summary with strategic positioning and keywords]</div>
</div>

PROFESSIONAL EXPERIENCE:
<div class="section">
    <div class="section-title">Professional Experience</div>
    [For each job:]
    <div class="job-entry">
        <div class="job-header">
            <div class="job-title-company">[Job Title] - [Company Name]</div>
            <div class="job-date">[Start Date] - [End Date]</div>
        </div>
        <div class="job-location">[City, State/Country]</div>
        <ul class="job-achievements">
            <li>[Accomplished achievement with quantified metrics and impact]</li>
            <li>[Second achievement with specific results and methodology]</li>
            <li>[Additional achievements following the same format]</li>
        </ul>
    </div>
</div>

CORE COMPETENCIES/SKILLS:
<div class="section">
    <div class="section-title">Core Competencies</div>
    <div class="skills-grid">
        <div class="skill-category">
            <span class="skill-label">Technical Skills:</span>
            <span class="skill-list">[Comma-separated technical skills]</span>
        </div>
        <div class="skill-category">
            <span class="skill-label">Leadership & Management:</span>
            <span class="skill-list">[Leadership and management skills]</span>
        </div>
        <div class="skill-category">
            <span class="skill-label">Industry Expertise:</span>
            <span class="skill-list">[Industry-specific skills and knowledge]</span>
        </div>
    </div>
</div>

EDUCATION:
<div class="section">
    <div class="section-title">Education</div>
    <div class="education-entry">
        <div class="degree-info">[Degree Name]</div>
        <div class="university-info">[University Name], [City, State]</div>
        <div class="education-date">[Graduation Year]</div>
    </div>
</div>

FORMATTING INSTRUCTIONS:
1. Use consistent spacing and typography
2. Maintain professional appearance with clean layout
3. Ensure proper visual hierarchy with section titles
4. Use subtle borders and spacing for readability
5. Apply consistent color scheme (blues and grays)
6. Make numbers and metrics stand out with bold formatting
7. Ensure ATS compatibility with clean HTML structure

Return ONLY the complete HTML document with all sections filled out professionally.`
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