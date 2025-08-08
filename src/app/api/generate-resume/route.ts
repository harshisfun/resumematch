import { NextRequest, NextResponse } from 'next/server';
import { openai, getModel } from '@/lib/ai';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// centralized client + model via lib/ai

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

  // Extract name - typically at the beginning of resume, often in all caps or title case
  const namePatterns = [
    /^([A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/m, // First line name
    /^([A-Z\s]{3,50})\s*$/m, // All caps name
    /Name:\s*([^\n\r]+)/i, // "Name: John Doe" format
  ];
  
  for (const pattern of namePatterns) {
    const nameMatch = resumeText.match(pattern);
    if (nameMatch && nameMatch[1]) {
      info.name = nameMatch[1].trim();
      break;
    }
  }

  // Extract email
  const emailMatch = resumeText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) {
    info.email = emailMatch[1];
  }

  // Extract phone number
  const phonePatterns = [
    /(\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/,
    /(\+?[0-9]{1,3}[-.\s]?[0-9]{3,4}[-.\s]?[0-9]{3,4}[-.\s]?[0-9]{3,4})/
  ];
  
  for (const pattern of phonePatterns) {
    const phoneMatch = resumeText.match(pattern);
    if (phoneMatch) {
      info.phone = phoneMatch[1].trim();
      break;
    }
  }

  // Extract LinkedIn
  const linkedinMatch = resumeText.match(/(?:linkedin\.com\/in\/|linkedin\.com\/profile\/view\?id=)([^\s\n\r,]+)/i);
  if (linkedinMatch) {
    info.linkedin = `linkedin.com/in/${linkedinMatch[1]}`;
  }

  // Extract GitHub
  const githubMatch = resumeText.match(/(?:github\.com\/)([^\s\n\r,]+)/i);
  if (githubMatch) {
    info.github = `github.com/${githubMatch[1]}`;
  }

  // Extract location/address
  const locationPatterns = [
    /([A-Za-z\s]+,\s*[A-Z]{2}(?:\s+[0-9]{5})?)/,  // City, State ZIP
    /([A-Za-z\s]+,\s*[A-Za-z\s]+,\s*[A-Za-z\s]+)/, // City, State, Country
    /Location:\s*([^\n\r]+)/i, // "Location: ..." format
  ];
  
  for (const pattern of locationPatterns) {
    const locationMatch = resumeText.match(pattern);
    if (locationMatch && locationMatch[1]) {
      info.location = locationMatch[1].trim();
      break;
    }
  }

  // Build contact string
  const contactParts = [];
  if (info.location) contactParts.push(info.location);
  if (info.email) contactParts.push(info.email);
  if (info.phone) contactParts.push(info.phone);
  if (info.linkedin) contactParts.push(info.linkedin);
  if (info.github) contactParts.push(info.github);
  
  info.contact = contactParts.join(' | ');

  return info;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ 
        error: 'Authentication required' 
      }, { status: 401 });
    }

    const { resumeText, level1Improvements, candidateName, contactInfo } = await request.json();

    if (!resumeText || !level1Improvements) {
      return NextResponse.json({ 
        error: 'Resume text and Level 1 improvements are required' 
      }, { status: 400 });
    }

    // Extract candidate information from the original resume
    const extractedInfo = extractCandidateInfo(resumeText);
    const finalCandidateName = candidateName || extractedInfo.name || "Professional Candidate";
    const finalContactInfo = contactInfo || extractedInfo.contact || "your@email.com";

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        error: 'OpenAI API key not configured' 
      }, { status: 500 });
    }

    const prompt = `You are an expert resume strategist and professional writer with deep knowledge of industry hiring practices, ATS optimization, and competitive positioning. Your task is to transform the candidate's resume into a superior, strategically-crafted document that surpasses Resume Worded quality standards.

ADVANCED RESUME TRANSFORMATION STRATEGY:

1. STRATEGIC POSITIONING ANALYSIS:
   - Analyze the job description to identify the company type (startup, mid-size, enterprise, FAANG, consulting, etc.)
   - Determine the role's seniority level and key success metrics
   - Identify industry-specific language patterns and terminology
   - Position the candidate optimally for this specific role and company culture

2. ADVANCED CONTENT OPTIMIZATION:
   - Use the "Accomplished [A] as measured by [B] by doing [C]" format but with sophisticated variations
   - Prioritize achievements based on relevance to the target role
   - Strategically reframe experiences to highlight transferable skills
   - Use industry-specific action verbs and terminology
   - Optimize keyword density without keyword stuffing

3. ATS & HIRING MANAGER DUAL OPTIMIZATION:
   - Structure content for maximum ATS parsing success
   - Use strategic keyword placement in multiple resume sections
   - Balance technical skills with leadership/soft skills based on role requirements
   - Create scannable format for human reviewers

4. COMPETITIVE DIFFERENTIATION:
   - Identify unique value propositions from the candidate's background
   - Emphasize achievements that set them apart from typical candidates
   - Use market-relevant metrics and benchmarks
   - Position experience progression strategically

CRITICAL RULES:
1. NEVER create or fabricate new facts, achievements, or experiences
2. Only restructure, reword, and optimize existing information
3. Maintain chronological accuracy and factual integrity
4. Create multiple strategic angles for the same experiences
5. Use advanced resume psychology and positioning techniques

INPUT DATA:
Original Resume:
${resumeText}

Level 1 Improvements to Implement:
${JSON.stringify(level1Improvements, null, 2)}

Candidate Name: ${finalCandidateName}
Contact Information: ${finalContactInfo}
Extracted Info: ${JSON.stringify(extractedInfo, null, 2)}

TASK:
Transform the resume using ADVANCED STRATEGIC POSITIONING for the specific role and company. Create a superior resume that demonstrates:

STRATEGIC CONTENT FRAMEWORK:
1. **Professional Summary**: 3-4 lines that position the candidate as the ideal fit for this specific role, using industry language and highlighting unique value proposition
2. **Core Competencies**: Strategic skill grouping that matches JD requirements exactly
3. **Professional Experience**: Reordered and reframed to emphasize most relevant experiences first
4. **Strategic Achievement Positioning**: Each bullet point optimized for maximum impact and relevance

ADVANCED FORMATTING TECHNIQUES:
- Use industry-appropriate section headers and terminology
- Optimize white space and visual hierarchy for both ATS and human scanning
- Strategic keyword placement throughout (not just skills section)
- Professional typography and consistent formatting

COMPANY-SPECIFIC OPTIMIZATION:
Based on the job description, tailor the resume for:
- **Startup Environment**: Emphasize agility, growth mindset, wearing multiple hats, rapid execution
- **Enterprise/Corporate**: Focus on process improvement, compliance, stakeholder management, scale
- **FAANG/Tech**: Highlight technical depth, innovation, data-driven decisions, system thinking
- **Consulting**: Emphasize problem-solving, client relationship, analytical thinking, communication
- **Finance**: Focus on accuracy, regulatory knowledge, risk management, analytical skills

For each experience entry, use this format:
- "Accomplished [A] as measured by [B] by doing [C]"
- Include quantified results where available in original resume
- Enhance technical keywords based on Level 1 keyword recommendations
- Reorganize content for maximum ATS compatibility

RESUME TEMPLATE TO USE (Return ONLY the filled template with NO extra text):

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
        .job-entry {
            margin-bottom: 18px;
            padding: 8px 0;
        }
        .job-header {
            margin-bottom: 5px;
        }
        .job-title-company {
            font-weight: bold;
            font-size: 11pt;
            margin-bottom: 2px;
        }
        .job-date {
            font-style: italic;
            font-size: 10pt;
            color: #555;
            float: right;
            margin-top: -18px;
        }
        .job-achievements {
            list-style: none;
            margin-left: 0;
            padding-left: 0;
        }
        .job-achievements li {
            margin-bottom: 6px;
            padding-left: 18px;
            padding-right: 5px;
            position: relative;
            text-align: justify;
            line-height: 1.4;
        }
        .job-achievements li:before {
            content: "•";
            position: absolute;
            left: 0;
            font-weight: bold;
        }
        .skills-grid {
            display: block;
            padding: 5px 0;
        }
        .skill-category {
            margin-bottom: 10px;
            padding: 3px 0;
            line-height: 1.4;
        }
        .skill-label {
            font-weight: bold;
            display: inline;
        }
        .skill-list {
            display: inline;
            font-weight: normal;
        }
        .education-entry {
            margin-bottom: 12px;
            padding: 5px 0;
        }
        .degree-info {
            font-weight: bold;
            margin-bottom: 2px;
        }
        .university-info {
            font-style: italic;
            margin-bottom: 2px;
        }
        .education-date {
            font-size: 10pt;
            color: #555;
            float: right;
            margin-top: -18px;
        }
        @media print {
            body { 
                margin: 0.75in; 
                padding: 0.25in;
            }
            .section { 
                page-break-inside: avoid; 
                padding: 0 5px;
            }
            .header {
                padding: 10px 15px;
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

CRITICAL INSTRUCTIONS - READ CAREFULLY:
1. Extract ALL content from the original resume - do not skip any sections, jobs, or information
2. Replace [CANDIDATE_NAME] with: ${finalCandidateName}
3. Replace [CONTACT_INFORMATION] with: ${finalContactInfo}
4. Include ALL jobs, roles, and experiences from the original resume
5. Preserve chronological order and ALL details
6. Replace [RESUME_SECTIONS] with ALL sections below using EXACT classes:

PROFESSIONAL SUMMARY SECTION (if exists):
<div class="section">
    <div class="section-title">Professional Summary</div>
    <p>Enhanced summary with Level 1 keywords...</p>
</div>

EXPERIENCE SECTION - INCLUDE ALL JOBS FROM ORIGINAL RESUME:
<div class="section">
    <div class="section-title">Professional Experience</div>
    
    <!-- FIRST JOB ENTRY -->
    <div class="job-entry">
        <div class="job-header">
            <div class="job-title-company">Most Recent Job Title - Company Name</div>
            <div class="job-date">Start Date - End Date</div>
        </div>
        <ul class="job-achievements">
            <li>Accomplished [specific result] as measured by [quantified metric] by doing [specific method/action]</li>
            <li>Accomplished [specific result] as measured by [quantified metric] by doing [specific method/action]</li>
            <li>Continue with ALL achievements from this role...</li>
        </ul>
    </div>
    
    <!-- SECOND JOB ENTRY (if exists) -->
    <div class="job-entry">
        <div class="job-header">
            <div class="job-title-company">Previous Job Title - Company Name</div>
            <div class="job-date">Start Date - End Date</div>
        </div>
        <ul class="job-achievements">
            <li>Accomplished [specific result] as measured by [quantified metric] by doing [specific method/action]</li>
            <li>Include ALL achievements from this role...</li>
        </ul>
    </div>
    
    <!-- ADD MORE JOB ENTRIES AS NEEDED - DO NOT SKIP ANY ROLES -->
</div>

SKILLS SECTION:
<div class="section">
    <div class="section-title">Relevant Skills</div>
    <div class="skills-grid">
        <div class="skill-category">
            <span class="skill-label">Category:</span>
            <span class="skill-list">Skill1, Skill2, Skill3</span>
        </div>
    </div>
</div>

EDUCATION SECTION:
<div class="section">
    <div class="section-title">Education</div>
    <div class="education-entry">
        <div class="degree-info">Degree Name</div>
        <div class="university-info">University Name, Location</div>
        <div class="education-date">Start Year - End Year</div>
    </div>
</div>

ADDITIONAL SECTIONS (if present in original resume):
<!-- Include any of these sections if they exist in the original resume -->
<!-- PROJECTS SECTION -->
<div class="section">
    <div class="section-title">Projects</div>
    <div class="job-entry">
        <div class="job-header">
            <div class="job-title-company">Project Name</div>
            <div class="job-date">Project Date</div>
        </div>
        <ul class="job-achievements">
            <li>Project accomplishment...</li>
        </ul>
    </div>
</div>

<!-- CERTIFICATIONS SECTION -->
<div class="section">
    <div class="section-title">Certifications</div>
    <div class="skills-grid">
        <div class="skill-category">
            <span class="skill-label">Certification:</span>
            <span class="skill-list">Issuing Organization, Date</span>
        </div>
    </div>
</div>

MANDATORY: Review the original resume and include ALL sections that exist, not just the basic ones.

CRITICAL: Return ONLY the complete HTML document starting with <!DOCTYPE html> and ending with </html>. 
Do NOT include any explanatory text, markdown formatting, or additional comments outside the HTML.
The response must be pure HTML code that can be directly rendered.

Examples of proper transformation:
BEFORE: "Worked on various marketing campaigns"
AFTER: "Led 5 digital marketing campaigns resulting in 40% increase in lead generation"

BEFORE: "Responsible for database management"
AFTER: "Optimized PostgreSQL database queries reducing response time by 60% for 10K+ daily users"

KEYWORD INTEGRATION:
- Naturally incorporate Level 1 keyword recommendations into existing experience
- Ensure technical terms appear in appropriate context
- Maintain readability while optimizing for ATS scanning

QUALITY ASSURANCE:
- NEVER add metrics, dates, or achievements not present in original resume
- ONLY enhance presentation of existing facts
- Preserve all chronological information exactly as provided
- Maintain professional tone throughout

MANDATORY CONTENT INCLUSION RULES:
1. Extract actual dates from the original resume - do not use placeholder dates like "[Dates]"
2. Use the exact candidate name and contact information from the original resume
3. Include EVERY job, role, and position mentioned in the original resume
4. Include ALL bullet points and achievements from each role
5. Include ALL skills mentioned in the original resume
6. Include ALL education details (degree, university, dates, GPA if mentioned)
7. Include any projects, certifications, or additional sections from original
8. Do NOT summarize or condense - include complete information
9. Preserve all factual information while improving presentation format
10. Maintain chronological accuracy for all dates and durations

CONTENT COMPLETENESS CHECK:
- Count the number of jobs in original resume and ensure all are included
- Count the number of bullet points per job and ensure all are included
- Verify all skills categories are preserved
- Ensure contact information is complete and properly formatted

Return ONLY the complete HTML code, ready for PDF conversion. Do not include any explanations or comments outside the HTML document.`;

    const completion = await openai.chat.completions.create({
      model: getModel(),
      messages: [
        {
          role: "system",
          content: "You are a professional resume writer and HTML expert. Transform resumes using the provided template while maintaining factual accuracy and COMPLETE content inclusion. You must include ALL jobs, achievements, skills, and sections from the original resume. Do NOT summarize or omit content. Your response must be ONLY the filled HTML template with no additional text, explanations, or markdown formatting."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 16000,
    });

    const htmlCode = completion.choices[0]?.message?.content;
    
    if (!htmlCode) {
      return NextResponse.json({ 
        error: 'No HTML code generated' 
      }, { status: 500 });
    }

    // Return HTML for client-side PDF generation
    return NextResponse.json({
      htmlCode: htmlCode,
      timestamp: new Date().toISOString(),
      candidateName: candidateName || "Resume",
    });

  } catch (error) {
    console.error('Resume generation error:', error);
    
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