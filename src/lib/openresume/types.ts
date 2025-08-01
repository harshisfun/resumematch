// OpenResume types adapted for our project
export interface TextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName: string;
  hasEOL: boolean;
}

export type TextItems = TextItem[];
export type Line = TextItem[];
export type Lines = Line[];

// Resume sections we want to parse
export type ResumeSection = 
  | 'profile'
  | 'workExperiences' 
  | 'educations'
  | 'projects'
  | 'skills'
  | 'custom';

export type ResumeSectionToLines = { [sectionName in ResumeSection]?: Lines } & {
  [otherSectionName: string]: Lines;
};

export type Subsections = Lines[];

type FeatureScore = -4 | -3 | -2 | -1 | 0 | 1 | 2 | 3 | 4;
type ReturnMatchingTextOnly = boolean;

export type FeatureSet =
  | [(item: TextItem) => boolean, FeatureScore]
  | [
      (item: TextItem) => RegExpMatchArray | null,
      FeatureScore,
      ReturnMatchingTextOnly
    ];

export interface TextScore {
  text: string;
  score: number;
  match: boolean;
}

export type TextScores = TextScore[];

// Enhanced resume structure for our integration
export interface EnhancedResumeData {
  profile: {
    name: string;
    email: string;
    phone: string;
    location: string;
    url: string;
    summary: string;
  };
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
    descriptions?: string[];
  }>;
  projects: Array<{
    name: string;
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

// Enhanced ATS scoring
export interface EnhancedATSScore {
  overall: number;
  profile: number;
  experience: number;
  education: number;
  skills: number;
  formatting: number;
  keywords: number;
  openResumeScore: number;
  combinedScore: number;
}

// Parser result that combines both analyses
export interface EnhancedParserResult {
  originalScore: Record<string, unknown>; // Your existing analysis
  openResumeData: EnhancedResumeData;
  enhancedScore: EnhancedATSScore;
  improvements: string[];
  warnings: string[];
  suggestions: string[];
} 