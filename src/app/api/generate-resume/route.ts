import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    const prompt = `You are a professional resume writer and PDF formatting expert. Your task is to transform a candidate's resume into a professional, well-formatted resume while implementing Level 1 improvements.

CRITICAL RULES:
1. NEVER create or fabricate new facts, achievements, or experiences not present in the original resume
2. Only restructure, reword, and optimize existing information
3. Use the "Accomplished [A] as measured by [B] by doing [C]" format for all experience bullets
4. Maintain chronological accuracy and factual integrity
5. Create a clean, professional resume format suitable for ATS systems

INPUT DATA:
Original Resume:
${resumeText}

Level 1 Improvements to Implement:
${JSON.stringify(level1Improvements, null, 2)}

Candidate Name: ${finalCandidateName}
Contact Information: ${finalContactInfo}
Extracted Info: ${JSON.stringify(extractedInfo, null, 2)}

TASK:
Transform the resume into a clean, professional format with the following structure. Extract information from the original resume and restructure it according to Level 1 improvements.

For each experience entry, use this format:
- "Accomplished [A] as measured by [B] by doing [C]"
- Include quantified results where available in original resume
- Enhance technical keywords based on Level 1 keyword recommendations
- Reorganize content for maximum ATS compatibility

RESUME FORMAT TO FOLLOW (Return as clean HTML format for PDF conversion):

<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>[CANDIDATE_NAME] - Resume</title>
    <style>
        body {
            font-family: 'Times New Roman', serif;
            font-size: 11pt;
            line-height: 1.4;
            margin: 0.75in;
            color: #000;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
        }
        .name {
            font-size: 24pt;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .contact {
            font-size: 11pt;
            margin-bottom: 3px;
        }
        .section {
            margin-bottom: 18px;
        }
        .section-title {
            font-size: 14pt;
            font-weight: bold;
            text-transform: uppercase;
            border-bottom: 1px solid #000;
            margin-bottom: 8px;
            padding-bottom: 2px;
        }
        .job-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 3px;
        }
        .job-title {
            font-weight: bold;
            font-size: 12pt;
        }
        .job-date {
            font-style: italic;
            font-size: 10pt;
        }
        .company {
            font-style: italic;
            margin-bottom: 5px;
        }
        .achievements {
            margin-left: 0;
            padding-left: 15px;
        }
        .achievements li {
            margin-bottom: 3px;
            text-align: justify;
        }
        .skills-section {
            display: flex;
            flex-wrap: wrap;
        }
        .skill-category {
            margin-right: 20px;
            margin-bottom: 8px;
        }
        .skill-category strong {
            font-weight: bold;
        }
        @media print {
            body { margin: 0.5in; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="name">[CANDIDATE_NAME]</div>
        <div class="contact">[CONTACT_INFORMATION]</div>
    </div>

    [RESUME_SECTIONS]

</body>
</html>

TRANSFORMATION INSTRUCTIONS:
1. Replace [CANDIDATE_NAME] with the extracted candidate name: "${finalCandidateName}"
2. Replace [CONTACT_INFORMATION] with the extracted contact details: "${finalContactInfo}"
3. Replace [RESUME_SECTIONS] with optimized sections following this priority order:
   - Professional Summary (if exists) - enhance with Level 1 keywords
   - Experience (most important) - apply "Accomplished [A] as measured by [B] by doing [C]" format
   - Skills - reorganize based on Level 1 recommendations
   - Education - maintain factual accuracy
   - Projects/Certifications - if relevant to target role

EXPERIENCE BULLET TRANSFORMATION RULES:
For each experience bullet, follow this exact format:
- "Accomplished [A] as measured by [B] by doing [C]"
- [A] = The achievement/result (what was accomplished)
- [B] = The quantified measurement (metrics, percentages, numbers)
- [C] = The method/process used (how it was done)

SECTION FORMATTING:
- Use <div class="section"> for each section
- Use <div class="section-title"> for section headers
- Use <div class="job-header"> for job titles and dates
- Use <ul class="achievements"> for bullet points
- Maintain professional, clean formatting

Return ONLY the complete HTML resume, properly formatted and ready for PDF conversion.

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

IMPORTANT EXTRACTION RULES:
1. Extract actual dates from the original resume - do not use placeholder dates like "[Dates]"
2. Use the exact candidate name and contact information from the original resume
3. Preserve all factual information while improving presentation
4. If contact information is incomplete, use only what is available
5. Maintain chronological accuracy for all dates and durations

Return ONLY the complete HTML code, ready for PDF conversion. Do not include any explanations or comments outside the HTML document.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a professional resume writer and HTML expert. Generate complete, well-formatted HTML that transforms resumes while maintaining factual accuracy. Return ONLY clean HTML code."
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