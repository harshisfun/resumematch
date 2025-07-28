// Resume parser based on OpenResume's 4-step algorithm
// Optimized for Web Worker execution (FR-P2)

interface ParsedResume {
  profile: Record<string, string>;
  workExperiences: Array<{
    company: string;
    jobTitle: string;
    date: string;
    descriptions: string[];
  }>;
  educations: Array<{
    school: string;
    degree: string;
    date: string;
    gpa: string;
  }>;
  projects: Array<{
    project: string;
    date: string;
    descriptions: string[];
  }>;
  skills: {
    featuredSkills: Array<{ skill: string; rating: number }>;
    descriptions: string[];
  };
  custom: {
    descriptions: string[];
  };
}

interface ATSScore {
  overall: number;
  profile: number;
  experience: number;
  education: number;
  skills: number;
  formatting: number;
  keywords: number;
}

interface ParserResult {
  parsedResume: ParsedResume;
  atsScore: ATSScore;
  warnings: string[];
  suggestions: string[];
}

// Text item interface from PDF.js
interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName: string;
  hasEOL: boolean;
}

interface Line {
  text: string;
  y: number;
  isBold: boolean;
  isUppercase: boolean;
  items: TextItem[];
}

interface Section {
  title: string;
  lines: Line[];
  startY: number;
  endY: number;
}

// Feature scoring system for resume extraction
interface FeatureSet {
  matcher: (text: string) => boolean;
  score: number;
}

// Core resume section keywords (from OpenResume)
const SECTION_KEYWORDS = {
  profile: ['summary', 'objective', 'profile', 'about'],
  experience: ['experience', 'work', 'employment', 'professional', 'career'],
  education: ['education', 'academic', 'degree', 'university', 'college', 'school'],
  skills: ['skills', 'technologies', 'competencies', 'proficiencies'],
  projects: ['projects', 'portfolio', 'work samples'],
  custom: ['achievements', 'awards', 'certifications', 'volunteer', 'publications']
};

// Email regex pattern
const EMAIL_REGEX = /\S+@\S+\.\S+/;

// Phone regex pattern  
const PHONE_REGEX = /\(?(\d{3})\)?[\s-]?(\d{3})[\s-]?(\d{4})/;

// URL regex pattern
const URL_REGEX = /\S+\.\w+\/\S+/;

// GPA regex pattern
const GPA_REGEX = /[0-4]\.\d{1,2}/;

// Date patterns
const DATE_REGEX = /(?:19|20)\d{2}/;

export async function parseResumeFromPdf(pdfFile: File): Promise<ParserResult> {
  try {
    // Step 1: Extract text items from PDF
    const textItems = await extractTextItemsFromPdf(pdfFile);
    
    // Step 2: Group text items into lines
    const lines = groupTextItemsIntoLines(textItems);
    
    // Step 3: Group lines into sections
    const sections = groupLinesIntoSections(lines);
    
    // Step 4: Extract resume data from sections
    const parsedResume = extractResumeFromSections(sections);
    
    // Calculate ATS score
    const atsScore = calculateATSScore(parsedResume, textItems);
    
    // Generate warnings and suggestions
    const { warnings, suggestions } = generateFeedback(parsedResume, atsScore);
    
    return {
      parsedResume,
      atsScore,
      warnings,
      suggestions
    };
  } catch (error) {
    console.error('PDF parsing failed:', error);
    throw new Error('Failed to parse resume PDF');
  }
}

async function extractTextItemsFromPdf(pdfFile: File): Promise<TextItem[]> {
  // Dynamic import for PDF.js to support Web Worker
  const pdfjsLib = await import('pdfjs-dist');
  
  // Set worker source
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  
  const arrayBuffer = await pdfFile.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  const textItems: TextItem[] = [];
  
  // Process each page
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    // Convert PDF.js items to our TextItem format
    for (const item of textContent.items) {
      if ('str' in item && item.str.trim()) {
        textItems.push({
          str: item.str,
          x: item.transform[4],
          y: item.transform[5],
          width: item.width,
          height: item.height,
          fontName: item.fontName,
          hasEOL: item.hasEOL || false,
        });
      }
    }
  }
  
  return textItems;
}

function groupTextItemsIntoLines(textItems: TextItem[]): Line[] {
  // Sort by Y position (top to bottom)
  const sortedItems = textItems.sort((a, b) => b.y - a.y);
  
  const lines: Line[] = [];
  const tolerance = 5; // Y-position tolerance for grouping
  
  for (const item of sortedItems) {
    // Find existing line with similar Y position
    let existingLine = lines.find(line => Math.abs(line.y - item.y) <= tolerance);
    
    if (!existingLine) {
      // Create new line
      existingLine = {
        text: '',
        y: item.y,
        isBold: item.fontName.toLowerCase().includes('bold'),
        isUppercase: false,
        items: []
      };
      lines.push(existingLine);
    }
    
    existingLine.items.push(item);
  }
  
  // Sort items within each line by X position and build text
  for (const line of lines) {
    line.items.sort((a, b) => a.x - b.x);
    line.text = line.items.map(item => item.str).join(' ').trim();
    line.isUppercase = line.text === line.text.toUpperCase() && line.text.length > 1;
  }
  
  return lines.filter(line => line.text.length > 0);
}

function groupLinesIntoSections(lines: Line[]): Section[] {
  const sections: Section[] = [];
  let currentSection: Section | null = null;
  
  for (const line of lines) {
    // Check if this line is a section header
    if (isSectionTitle(line)) {
      // Save previous section
      if (currentSection) {
        sections.push(currentSection);
      }
      
      // Start new section
      currentSection = {
        title: line.text.toLowerCase(),
        lines: [],
        startY: line.y,
        endY: line.y
      };
    } else if (currentSection) {
      // Add line to current section
      currentSection.lines.push(line);
      currentSection.endY = line.y;
    } else {
      // No section yet, this might be profile info
      if (!sections.find(s => s.title === 'profile')) {
        sections.push({
          title: 'profile',
          lines: [line],
          startY: line.y,
          endY: line.y
        });
      } else {
        const profileSection = sections.find(s => s.title === 'profile');
        if (profileSection) {
          profileSection.lines.push(line);
          profileSection.endY = line.y;
        }
      }
    }
  }
  
  // Add final section
  if (currentSection) {
    sections.push(currentSection);
  }
  
  return sections;
}

function isSectionTitle(line: Line): boolean {
  // Main heuristic: bold + uppercase + single item
  if (line.isBold && line.isUppercase && line.items.length === 1) {
    return true;
  }
  
  // Fallback: keyword matching
  const text = line.text.toLowerCase();
  return Object.values(SECTION_KEYWORDS).some(keywords =>
    keywords.some(keyword => text.includes(keyword))
  );
}

function extractResumeFromSections(sections: Section[]): ParsedResume {
  const resume: ParsedResume = {
    profile: {},
    workExperiences: [],
    educations: [],
    projects: [],
    skills: { featuredSkills: [], descriptions: [] },
    custom: { descriptions: [] }
  };
  
  for (const section of sections) {
    const sectionType = categorizeSectionType(section.title);
    
    switch (sectionType) {
      case 'profile':
        resume.profile = extractProfileFromSection(section);
        break;
      case 'experience':
        resume.workExperiences = extractWorkExperiencesFromSection(section);
        break;
      case 'education':
        resume.educations = extractEducationsFromSection(section);
        break;
      case 'skills':
        resume.skills = extractSkillsFromSection(section);
        break;
      case 'projects':
        resume.projects = extractProjectsFromSection(section);
        break;
      default:
        // Add to custom section
        resume.custom!.descriptions!.push(...section.lines.map(line => line.text));
    }
  }
  
  return resume;
}

function categorizeSectionType(title: string): string {
  const lowerTitle = title.toLowerCase();
  
  for (const [type, keywords] of Object.entries(SECTION_KEYWORDS)) {
    if (keywords.some(keyword => lowerTitle.includes(keyword))) {
      return type;
    }
  }
  
  return 'custom';
}

function extractProfileFromSection(section: Section) {
  const profile: Record<string, string> = {};
  const allText = section.lines.map(line => line.text).join(' ');
  
  // Extract email
  const emailMatch = allText.match(EMAIL_REGEX);
  if (emailMatch) profile.email = emailMatch[0];
  
  // Extract phone
  const phoneMatch = allText.match(PHONE_REGEX);
  if (phoneMatch) profile.phone = phoneMatch[0];
  
  // Extract URL
  const urlMatch = allText.match(URL_REGEX);
  if (urlMatch) profile.url = urlMatch[0];
  
  // Extract name (usually first line without special characters)
  const nameFeatures: FeatureSet[] = [
    { matcher: (text) => /^[a-zA-Z\s\.]+$/.test(text), score: 3 },
    { matcher: (text) => !text.includes('@'), score: -4 },
    { matcher: (text) => !/\d/.test(text), score: -4 },
    { matcher: (text) => !text.includes(','), score: -4 },
    { matcher: (text) => !text.includes('/'), score: -4 }
  ];
  
  let bestNameScore = -Infinity;
  let bestName = '';
  
  for (const line of section.lines) {
    let score = 0;
    for (const feature of nameFeatures) {
      if (feature.matcher(line.text)) {
        score += feature.score;
      }
    }
    
    if (score > bestNameScore) {
      bestNameScore = score;
      bestName = line.text;
    }
  }
  
  if (bestName) profile.name = bestName;
  
  // Extract summary (longer text that's not contact info)
  const summaryLines = section.lines.filter(line => 
    line.text.length > 50 && 
    !EMAIL_REGEX.test(line.text) && 
    !PHONE_REGEX.test(line.text) &&
    !URL_REGEX.test(line.text) &&
    line.text !== bestName
  );
  
  if (summaryLines.length > 0) {
    profile.summary = summaryLines.map(line => line.text).join(' ');
  }
  
  return profile;
}

function extractWorkExperiencesFromSection(section: Section) {
  return extractSubsections(section).map(subsection => ({
    company: extractCompany(subsection),
    jobTitle: extractJobTitle(subsection),
    date: extractDate(subsection),
    descriptions: extractDescriptions(subsection)
  }));
}

function extractEducationsFromSection(section: Section) {
  return extractSubsections(section).map(subsection => ({
    school: extractSchool(subsection),
    degree: extractDegree(subsection), 
    gpa: extractGPA(subsection),
    date: extractDate(subsection),
    descriptions: extractDescriptions(subsection)
  }));
}

function extractProjectsFromSection(section: Section) {
  return extractSubsections(section).map(subsection => ({
    project: extractProjectName(subsection),
    date: extractDate(subsection),
    descriptions: extractDescriptions(subsection)
  }));
}

function extractSkillsFromSection(section: Section) {
  const allText = section.lines.map(line => line.text).join(' ');
  
  // Simple skill extraction - split by commas, semicolons, or pipes
  const skillsText = allText.replace(/skills?:?/gi, '').trim();
  const skills = skillsText
    .split(/[,;|•]/)
    .map(skill => skill.trim())
    .filter(skill => skill.length > 0 && skill.length < 30);
  
  return {
    featuredSkills: skills.slice(0, 6).map(skill => ({ skill, rating: 4 })),
    descriptions: skills
  };
}

function extractSubsections(section: Section) {
  const subsections: Line[][] = [];
  let currentSubsection: Line[] = [];
  
  for (let i = 0; i < section.lines.length; i++) {
    const line = section.lines[i];
    const nextLine = section.lines[i + 1];
    
    currentSubsection.push(line);
    
    // Check if this is the end of a subsection
    if (nextLine) {
      const yGap = Math.abs(line.y - nextLine.y);
      const avgLineHeight = section.lines.reduce((sum, l) => sum + (l.items[0]?.height || 12), 0) / section.lines.length;
      
      if (yGap > avgLineHeight * 1.4 || nextLine.isBold) {
        subsections.push([...currentSubsection]);
        currentSubsection = [];
      }
    }
  }
  
  if (currentSubsection.length > 0) {
    subsections.push(currentSubsection);
  }
  
  return subsections;
}

// Helper extraction functions
function extractCompany(lines: Line[]): string {
  return lines.find(line => line.isBold && !extractDate(lines).includes(line.text))?.text || '';
}

function extractJobTitle(lines: Line[]): string {
  const jobKeywords = ['engineer', 'developer', 'manager', 'analyst', 'specialist', 'coordinator', 'director', 'intern'];
  return lines.find(line => 
    jobKeywords.some(keyword => line.text.toLowerCase().includes(keyword))
  )?.text || lines[0]?.text || '';
}

function extractSchool(lines: Line[]): string {
  const schoolKeywords = ['university', 'college', 'institute', 'school'];
  return lines.find(line => 
    schoolKeywords.some(keyword => line.text.toLowerCase().includes(keyword))
  )?.text || lines[0]?.text || '';
}

function extractDegree(lines: Line[]): string {
  const degreeKeywords = ['bachelor', 'master', 'phd', 'associate', 'diploma', 'certificate'];
  return lines.find(line => 
    degreeKeywords.some(keyword => line.text.toLowerCase().includes(keyword))
  )?.text || '';
}

function extractProjectName(lines: Line[]): string {
  return lines.find(line => line.isBold)?.text || lines[0]?.text || '';
}

function extractDate(lines: Line[]): string {
  const allText = lines.map(line => line.text).join(' ');
  const dateMatch = allText.match(DATE_REGEX);
  return dateMatch ? dateMatch[0] : '';
}

function extractGPA(lines: Line[]): string {
  const allText = lines.map(line => line.text).join(' ');
  const gpaMatch = allText.match(GPA_REGEX);
  return gpaMatch ? gpaMatch[0] : '';
}

function extractDescriptions(lines: Line[]): string[] {
  return lines
    .filter(line => !line.isBold && line.text.length > 10)
    .map(line => line.text);
}

function calculateATSScore(resume: ParsedResume, textItems: TextItem[]): ATSScore {
  let profileScore = 0;
  let experienceScore = 0;
  let educationScore = 0;
  let skillsScore = 0;
  let formattingScore = 0;
  let keywordsScore = 0;
  
  // Profile scoring
  if (resume.profile?.name) profileScore += 25;
  if (resume.profile?.email) profileScore += 25;
  if (resume.profile?.phone) profileScore += 20;
  if (resume.profile?.summary) profileScore += 30;
  
  // Experience scoring
  if (resume.workExperiences && resume.workExperiences.length > 0) {
    experienceScore += 40;
    if (resume.workExperiences.some(exp => exp.descriptions && exp.descriptions.length > 0)) {
      experienceScore += 30;
    }
    if (resume.workExperiences.some(exp => exp.date)) {
      experienceScore += 30;
    }
  }
  
  // Education scoring
  if (resume.educations && resume.educations.length > 0) {
    educationScore += 50;
    if (resume.educations.some(edu => edu.degree)) {
      educationScore += 50;
    }
  }
  
  // Skills scoring
  if (resume.skills?.featuredSkills && resume.skills.featuredSkills.length > 0) {
    skillsScore += 60;
  }
  if (resume.skills?.descriptions && resume.skills.descriptions.length > 0) {
    skillsScore += 40;
  }
  
  // Formatting scoring (based on text items)
  const avgFontSize = textItems.reduce((sum, item) => sum + item.height, 0) / textItems.length;
  if (avgFontSize >= 10 && avgFontSize <= 12) formattingScore += 40;
  if (textItems.some(item => item.fontName.toLowerCase().includes('bold'))) formattingScore += 30;
  formattingScore += 30; // Assume good spacing if parsed successfully
  
  // Keywords scoring (basic implementation)
  const allText = textItems.map(item => item.str).join(' ').toLowerCase();
  const commonKeywords = ['experience', 'skills', 'education', 'project', 'work', 'team', 'management'];
  const foundKeywords = commonKeywords.filter(keyword => allText.includes(keyword));
  keywordsScore = Math.min(100, (foundKeywords.length / commonKeywords.length) * 100);
  
  const overall = Math.round((profileScore + experienceScore + educationScore + skillsScore + formattingScore + keywordsScore) / 6);
  
  return {
    overall,
    profile: profileScore,
    experience: experienceScore,
    education: educationScore,
    skills: skillsScore,
    formatting: formattingScore,
    keywords: keywordsScore
  };
}

function generateFeedback(resume: ParsedResume, atsScore: ATSScore): { warnings: string[]; suggestions: string[] } {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  
  // Profile warnings
  if (!resume.profile?.name) warnings.push('Missing name in profile section');
  if (!resume.profile?.email) warnings.push('Missing email address');
  if (!resume.profile?.phone) warnings.push('Missing phone number');
  
  // Experience warnings
  if (!resume.workExperiences || resume.workExperiences.length === 0) {
    warnings.push('No work experience found');
  }
  
  // ATS score suggestions
  if (atsScore.overall < 70) {
    suggestions.push('Overall ATS score is low. Consider improving formatting and content.');
  }
  
  if (atsScore.profile < 80) {
    suggestions.push('Add more complete contact information and professional summary.');
  }
  
  if (atsScore.experience < 80) {
    suggestions.push('Add more detailed work experience with specific achievements.');
  }
  
  if (atsScore.skills < 80) {
    suggestions.push('Include a comprehensive skills section with relevant technologies.');
  }
  
  return { warnings, suggestions };
} 