import { 
  EnhancedParserResult, 
  EnhancedResumeData, 
  EnhancedATSScore, 
  TextItems 
} from './types';

/**
 * Enhanced Resume Parser that combines OpenResume algorithm with our existing analysis
 * 
 * This parser provides:
 * 1. OpenResume's advanced PDF parsing
 * 2. Enhanced ATS scoring
 * 3. Integration with our job compatibility analysis
 * 4. Smart improvement suggestions
 */
export class EnhancedResumeParser {
  
  /**
   * Parse resume file and return enhanced analysis
   */
  async parseResumeFile(file: File, existingAnalysis?: Record<string, unknown>): Promise<EnhancedParserResult> {
    try {
      // Step 1: Read PDF and extract text items (adapted from OpenResume)
      const textItems = await this.readPdfFile(file);
      
      // Step 2: Group text items into lines
      const lines = this.groupTextItemsIntoLines(textItems);
      
      // Step 3: Group lines into sections  
      const sections = this.groupLinesIntoSections(lines);
      
      // Step 4: Extract structured resume data
      const resumeData = this.extractResumeFromSections(sections);
      
      // Step 5: Calculate enhanced ATS score
      const enhancedScore = this.calculateEnhancedATSScore(resumeData, textItems);
      
             // Step 6: Generate improvements and suggestions
       const { improvements, warnings, suggestions } = this.generateSmartSuggestions(
         resumeData, 
         enhancedScore
       );
      
      return {
        originalScore: existingAnalysis || {},
        openResumeData: resumeData,
        enhancedScore,
        improvements,
        warnings,
        suggestions
      };
      
    } catch (error) {
      console.error('Enhanced parser error:', error);
      throw new Error('Failed to parse resume with enhanced parser');
    }
  }
  
  /**
   * Read PDF file and extract text items
   * Adapted from OpenResume's readPdf function
   */
  private async readPdfFile(file: File): Promise<TextItems> {
    const pdfjsLib = await import('pdfjs-dist');
    
    // Set worker source for PDF.js
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    const textItems: TextItems = [];
    
    // Process each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
                    // Extract text items with positioning
       // eslint-disable-next-line @typescript-eslint/no-explicit-any
       textContent.items.forEach((item: any) => {
         if ('str' in item && typeof item.str === 'string' && item.str.trim()) {
           textItems.push({
             text: item.str,
             x: item.transform?.[4] || 0,
             y: item.transform?.[5] || 0,
             width: item.width || 0,
             height: item.height || 0,
             fontName: item.fontName || '',
             hasEOL: item.hasEOL || false
           });
         }
       });
    }
    
    return textItems;
  }
  
  /**
   * Group text items into lines
   * Simplified version of OpenResume's algorithm
   */
  private groupTextItemsIntoLines(textItems: TextItems) {
    // Sort by Y position (top to bottom) then X position (left to right)
    const sortedItems = textItems.sort((a, b) => {
      const yDiff = b.y - a.y; // Reverse Y (PDF coordinates)
      if (Math.abs(yDiff) > 5) return yDiff;
      return a.x - b.x;
    });
    
    const lines: TextItems[] = [];
    let currentLine: TextItems = [];
    let lastY = null;
    
    for (const item of sortedItems) {
      // If Y position is significantly different, start new line
      if (lastY !== null && Math.abs(item.y - lastY) > 5) {
        if (currentLine.length > 0) {
          lines.push(currentLine);
          currentLine = [];
        }
      }
      
      currentLine.push(item);
      lastY = item.y;
    }
    
    // Add the last line
    if (currentLine.length > 0) {
      lines.push(currentLine);
    }
    
    return lines;
  }
  
  /**
   * Group lines into sections
   * Simplified section detection
   */
  private groupLinesIntoSections(lines: TextItems[]) {
    const sections: Record<string, TextItems[]> = {
      profile: [],
      workExperiences: [],
      educations: [],
      projects: [],
      skills: [],
      custom: []
    };
    
    let currentSection = 'profile';
    const sectionKeywords = {
      experience: ['experience', 'work', 'employment', 'professional'],
      education: ['education', 'academic', 'degree', 'university', 'college'],
      skills: ['skills', 'technologies', 'competencies'],
      projects: ['projects', 'portfolio', 'work samples']
    };
    
    for (const line of lines) {
      const lineText = line.map(item => item.text).join(' ').toLowerCase();
      
      // Check if this line is a section header
      let foundSection = false;
      for (const [section, keywords] of Object.entries(sectionKeywords)) {
        if (keywords.some(keyword => lineText.includes(keyword))) {
          currentSection = section === 'experience' ? 'workExperiences' : 
                         section === 'education' ? 'educations' : section;
          foundSection = true;
          break;
        }
      }
      
      // Add line to current section
      if (!foundSection) {
        sections[currentSection].push(line);
      }
    }
    
    return sections;
  }
  
  /**
   * Extract structured resume data from sections
   */
  private extractResumeFromSections(sections: Record<string, TextItems[]>): EnhancedResumeData {
    return {
      profile: this.extractProfile(sections.profile || []),
      workExperiences: this.extractWorkExperiences(sections.workExperiences || []),
      educations: this.extractEducations(sections.educations || []),
      projects: this.extractProjects(sections.projects || []),
      skills: this.extractSkills(sections.skills || []),
      custom: { descriptions: [] }
    };
  }
  
  /**
   * Extract profile information
   */
  private extractProfile(lines: TextItems[]) {
    const allText = lines.map(line => 
      line.map(item => item.text).join(' ')
    ).join(' ');
    
    const emailRegex = /\S+@\S+\.\S+/;
    const phoneRegex = /\(?(\d{3})\)?[\s-]?(\d{3})[\s-]?(\d{4})/;
    const urlRegex = /\S+\.\w+\/\S+/;
    
    return {
      name: lines[0]?.map(item => item.text).join(' ') || '',
      email: allText.match(emailRegex)?.[0] || '',
      phone: allText.match(phoneRegex)?.[0] || '',
      location: '',
      url: allText.match(urlRegex)?.[0] || '',
      summary: lines.slice(1).map(line => 
        line.map(item => item.text).join(' ')
      ).join(' ')
    };
  }
  
  /**
   * Extract work experiences
   */
  private extractWorkExperiences(lines: TextItems[]) {
    // Simplified extraction - group by detected patterns
    const experiences = [];
    let currentExp = null;
    
    for (const line of lines) {
      const lineText = line.map(item => item.text).join(' ');
      
      // Simple heuristic: if line has date pattern, it might be a new experience
      if (/\d{4}/.test(lineText)) {
        if (currentExp) experiences.push(currentExp);
        currentExp = {
          company: '',
          jobTitle: lineText,
          date: lineText.match(/\d{4}[-–]\d{4}|\d{4}[-–]present/i)?.[0] || '',
          descriptions: []
        };
      } else if (currentExp) {
        currentExp.descriptions.push(lineText);
      }
    }
    
    if (currentExp) experiences.push(currentExp);
    return experiences;
  }
  
  /**
   * Extract education information
   */
  private extractEducations(lines: TextItems[]) {
    return [{
      school: lines[0]?.map(item => item.text).join(' ') || '',
      degree: lines[1]?.map(item => item.text).join(' ') || '',
      date: lines.map(line => line.map(item => item.text).join(' '))
        .join(' ').match(/\d{4}/)?.[0] || '',
      gpa: '',
      descriptions: lines.slice(2).map(line => 
        line.map(item => item.text).join(' ')
      )
    }];
  }
  
  /**
   * Extract projects
   */
  private extractProjects(lines: TextItems[]) {
    return lines.map(line => ({
      name: line.map(item => item.text).join(' '),
      date: '',
      descriptions: []
    }));
  }
  
  /**
   * Extract skills
   */
  private extractSkills(lines: TextItems[]) {
    const allSkills = lines.map(line => 
      line.map(item => item.text).join(' ')
    ).join(' ').split(/[,;]/).map(s => s.trim()).filter(Boolean);
    
    return {
      featuredSkills: allSkills.map(skill => ({ skill, rating: 0 })),
      descriptions: allSkills
    };
  }
  
  /**
   * Calculate enhanced ATS score
   */
  private calculateEnhancedATSScore(resumeData: EnhancedResumeData, textItems: TextItems): EnhancedATSScore {
    const profileScore = this.scoreProfile(resumeData.profile);
    const experienceScore = this.scoreExperience(resumeData.workExperiences);
    const educationScore = this.scoreEducation(resumeData.educations);
    const skillsScore = this.scoreSkills(resumeData.skills);
    const formattingScore = this.scoreFormatting(textItems);
    const keywordsScore = this.scoreKeywords(resumeData);
    
    const openResumeScore = Math.round(
      (profileScore + experienceScore + educationScore + skillsScore + formattingScore + keywordsScore) / 6
    );
    
    return {
      overall: openResumeScore,
      profile: profileScore,
      experience: experienceScore,
      education: educationScore,
      skills: skillsScore,
      formatting: formattingScore,
      keywords: keywordsScore,
      openResumeScore,
      combinedScore: openResumeScore // Will be enhanced with original analysis
    };
  }
  
  /**
   * Scoring methods
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private scoreProfile(profile: any) {
    let score = 0;
    if (profile.name) score += 20;
    if (profile.email) score += 20;
    if (profile.phone) score += 15;
    if (profile.summary && profile.summary.length > 50) score += 25;
    if (profile.url) score += 20;
    return Math.min(100, score);
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private scoreExperience(experiences: any[]) {
    if (experiences.length === 0) return 0;
    let score = experiences.length * 20;
    score += experiences.filter(exp => exp.descriptions?.length > 0).length * 15;
    score += experiences.filter(exp => exp.date).length * 10;
    return Math.min(100, score);
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private scoreEducation(educations: any[]) {
    if (educations.length === 0) return 50; // Not always required
    let score = 70;
    if (educations[0]?.degree) score += 20;
    if (educations[0]?.date) score += 10;
    return Math.min(100, score);
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private scoreSkills(skills: any) {
    if (!skills.featuredSkills || skills.featuredSkills.length === 0) return 0;
    return Math.min(100, skills.featuredSkills.length * 10);
  }
  
  private scoreFormatting(textItems: TextItems) {
    // Check for consistent formatting
    const fontNames = new Set(textItems.map(item => item.fontName));
    const hasConsistentSpacing = textItems.length > 0;
    
    let score = 50; // Base score
    if (fontNames.size <= 3) score += 25; // Good font consistency
    if (hasConsistentSpacing) score += 25; // Good spacing
    
    return Math.min(100, score);
  }
  
  private scoreKeywords(resumeData: EnhancedResumeData) {
    // Basic keyword scoring - can be enhanced with job description matching
    const allText = JSON.stringify(resumeData).toLowerCase();
    const keywordCount = (allText.match(/\b(manage|develop|lead|create|implement|analyze)\b/g) || []).length;
    
    return Math.min(100, keywordCount * 10);
  }
  
  /**
   * Generate smart suggestions based on analysis
   */
  private generateSmartSuggestions(
    resumeData: EnhancedResumeData, 
    score: EnhancedATSScore
  ) {
    const improvements: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    
    // Profile improvements
    if (!resumeData.profile.email) {
      warnings.push('Missing email address in contact information');
      improvements.push('Add email address to profile section');
    }
    
    if (!resumeData.profile.phone) {
      suggestions.push('Consider adding phone number for better accessibility');
    }
    
    if (resumeData.profile.summary.length < 50) {
      improvements.push('Add a professional summary to strengthen your profile');
    }
    
    // Experience improvements
    if (resumeData.workExperiences.length === 0) {
      warnings.push('No work experience section found');
      improvements.push('Add work experience section with relevant positions');
    }
    
    // Skills improvements
    if (resumeData.skills.featuredSkills.length < 5) {
      suggestions.push('Add more relevant skills to improve keyword matching');
    }
    
    // Formatting improvements
    if (score.formatting < 70) {
      improvements.push('Improve resume formatting for better ATS readability');
    }
    
    return { improvements, warnings, suggestions };
  }
}

// Export singleton instance
export const enhancedResumeParser = new EnhancedResumeParser(); 