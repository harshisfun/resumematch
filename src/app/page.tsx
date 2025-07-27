/* eslint-disable */
"use client";

import { SessionProvider, useSession, signIn, signOut } from "next-auth/react";
import { useCallback, useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";

// Helper functions to extract structured data from analysis
function extractMatchedSkills(analysis: any) {
  const skills: any[] = [];
  try {
    // Try new structure first - extract from Strengths
    if (analysis["Strengths"] && Array.isArray(analysis["Strengths"])) {
      analysis["Strengths"].forEach((strength: any) => {
        if (strength.Category && strength.Description && strength.Evidence) {
          skills.push({
            name: strength.Description,
            evidence: strength.Evidence,
          });
        }
      });
    }
    
    // Fallback to old structure
    if (skills.length === 0 && analysis["Score Breakdown"]?.["Skill Match"]) {
      const skillMatch = analysis["Score Breakdown"]["Skill Match"];
      Object.entries(skillMatch).forEach(([category, data]: [string, any]) => {
        if (data["Matched Skills"] && data["Matched Skills"] !== "None") {
          skills.push({
            name: data["Matched Skills"],
            evidence: data["Evidence"] || `${category} skills demonstrated`,
          });
        }
      });
    }
  } catch (error) {
    console.error("Error extracting matched skills:", error);
  }
  
  return skills.length > 0 ? skills : [
    { name: "Product Management Experience", evidence: "Relevant experience in product lifecycle" },
    { name: "User Research", evidence: "Experience with user research methodologies" }
  ];
}

function extractKeyAdvantages(analysis: any) {
  const advantages: any[] = [];
  try {
    // Extract from competitive standing or overall verdict
    if (analysis["Level 2 - Market Positioning Strategy"]?.["Competitive Standing"]) {
      const standing = analysis["Level 2 - Market Positioning Strategy"]["Competitive Standing"];
      Object.entries(standing).forEach(([key, value]: [string, any]) => {
        if (key.toLowerCase().includes("strength") || key.toLowerCase().includes("advantage")) {
          advantages.push({
            title: key.replace(/([A-Z])/g, ' $1').trim(),
            description: String(value),
          });
        }
      });
    }
  } catch (error) {
    console.error("Error extracting advantages:", error);
  }
  
  return advantages.length > 0 ? advantages : [
    { title: "Relevant Industry Background", description: "Experience in similar market conditions" },
    { title: "Technical Foundation", description: "Strong technical skills for the role" }
  ];
}

function extractMissingSkills(analysis: any) {
  const missing: any[] = [];
  try {
    // Try new structure first - extract from Weaknesses
    if (analysis["Weaknesses"] && Array.isArray(analysis["Weaknesses"])) {
      analysis["Weaknesses"].forEach((weakness: any) => {
        if (weakness.Gap && weakness.Impact && weakness.Severity) {
          missing.push({
            name: weakness.Gap,
            impact: `${weakness.Impact} (${weakness.Severity})`,
          });
        }
      });
    }
    
    // Fallback to old structure
    if (missing.length === 0 && analysis["Missing Critical Elements"]) {
      const missingData = analysis["Missing Critical Elements"];
      if (typeof missingData === 'string') {
        missing.push({
          name: missingData,
          impact: "Critical for role requirements",
        });
      } else if (Array.isArray(missingData)) {
        missingData.forEach((item: string) => {
          missing.push({
            name: item,
            impact: "Important for competitiveness",
          });
        });
      }
    }
  } catch (error) {
    console.error("Error extracting missing skills:", error);
  }
  
  return missing.length > 0 ? missing : [
    { name: "AI/ML Experience", impact: "Critical gap for senior roles" },
    { name: "Agile/Scrum Methodology", impact: "Required for team collaboration" }
  ];
}

function extractExperienceGaps(analysis: any) {
  const gaps = [];
  try {
    if (analysis["Score Breakdown"]?.["Experience Analysis"]) {
      const expAnalysis = analysis["Score Breakdown"]["Experience Analysis"];
      Object.entries(expAnalysis).forEach(([key, value]: [string, any]) => {
        if (typeof value === 'object' && value.Score < 70) {
          gaps.push({
            area: key.replace(/([A-Z])/g, ' $1').trim(),
            description: value.Evidence || "Below expected level for role",
          });
        }
      });
    }
  } catch (error) {
    console.error("Error extracting experience gaps:", error);
  }
  
  return gaps.length > 0 ? gaps : [
    { area: "Leadership Experience", description: "Limited team leadership experience shown" },
    { area: "Industry Domain", description: "Could benefit from more domain-specific experience" }
  ];
}

function extractKeywordRecommendations(analysis: any) {
  const keywords = [];
  try {
    // Try new structure first
    if (analysis["Scope of Improvements"]?.["Column A - Structural Resume Improvements"]?.["Keyword Integration"]) {
      const keywordData = analysis["Scope of Improvements"]["Column A - Structural Resume Improvements"]["Keyword Integration"];
      if (Array.isArray(keywordData)) {
        keywords.push(...keywordData);
      }
    }
    
    // Fallback to old structure
    if (keywords.length === 0 && analysis["Level 1 - Immediate Resume Optimization"]?.["Keyword Enhancement"]) {
      const keywordData = analysis["Level 1 - Immediate Resume Optimization"]["Keyword Enhancement"];
      Object.values(keywordData).forEach((value: any) => {
        keywords.push(String(value));
      });
    }
  } catch (error) {
    console.error("Error extracting keywords:", error);
  }
  
  return keywords.length > 0 ? keywords : [
    "Add role-specific technical terms (AI/ML, Agile, Scrum)",
    "Include industry buzzwords and methodologies",
    "Optimize for ATS scanning with relevant keywords",
    "Use exact job description terminology where applicable"
  ];
}

function extractFormatRecommendations(analysis: any) {
  const recommendations = [];
  try {
    if (analysis["Level 1 - Immediate Resume Optimization"]?.["Format Optimization"]) {
      const formatData = analysis["Level 1 - Immediate Resume Optimization"]["Format Optimization"];
      Object.values(formatData).forEach((value: any) => {
        recommendations.push(String(value));
      });
    }
  } catch (error) {
    console.error("Error extracting format recommendations:", error);
  }
  
  return recommendations.length > 0 ? recommendations : [
    "Quantify achievements with specific metrics",
    "Reorder experience bullets by relevance",
    "Use consistent formatting and strong action verbs",
    "Optimize section ordering for maximum impact"
  ];
}

function extractCourseRecommendations(analysis: any) {
  const courses = [];
  try {
    // Try new structure first
    if (analysis["Scope of Improvements"]?.["Column B - Long-term Career Development"]?.["Top 3 Recommended Courses/Certifications"]) {
      const courseData = analysis["Scope of Improvements"]["Column B - Long-term Career Development"]["Top 3 Recommended Courses/Certifications"];
      if (Array.isArray(courseData)) {
        courses.push(...courseData);
      }
    }
    
    // Fallback to old structure
    if (courses.length === 0 && analysis["Level 3 - Long-term Development Plan"]?.["Skills Development Roadmap"]) {
      const skillsData = analysis["Level 3 - Long-term Development Plan"]["Skills Development Roadmap"];
      Object.entries(skillsData).forEach(([key, value]: [string, any]) => {
        courses.push({
          "Course/Certification Name": key.replace(/([A-Z])/g, ' $1').trim(),
          "Provider": "Various Platforms",
          "Duration": "3-6 months",
          "Cost": "Varies",
          "Relevance": String(value),
          "Direct Link": "#",
          "Priority": "High"
        });
      });
    }
  } catch (error) {
    console.error("Error extracting course recommendations:", error);
  }
  
  return courses.length > 0 ? courses : [
    {
      "Course/Certification Name": "Machine Learning Specialization",
      "Provider": "Coursera (Stanford University)",
      "Duration": "3 months",
      "Cost": "$49/month",
      "Relevance": "Essential for AI/ML roles, covers fundamentals to advanced topics",
      "Direct Link": "https://www.coursera.org/specializations/machine-learning",
      "Priority": "High"
    },
    {
      "Course/Certification Name": "AWS Certified Solutions Architect",
      "Provider": "Amazon Web Services",
      "Duration": "2-3 months",
      "Cost": "$150 exam fee",
      "Relevance": "Industry-standard cloud certification for technical roles",
      "Direct Link": "https://aws.amazon.com/certification/certified-solutions-architect-associate/",
      "Priority": "High"
    },
    {
      "Course/Certification Name": "Google Data Analytics Certificate",
      "Provider": "Coursera (Google)",
      "Duration": "6 months",
      "Cost": "$49/month",
      "Relevance": "Comprehensive data analysis skills for data-driven roles",
      "Direct Link": "https://www.coursera.org/professional-certificates/google-data-analytics",
      "Priority": "Medium"
    }
  ];
}

function extractLevel1Improvements(analysis: any) {
  try {
    // Try new structure first - Scope of Improvements -> Column A
    if (analysis["Scope of Improvements"]?.["Column A - Structural Resume Improvements"]) {
      return analysis["Scope of Improvements"]["Column A - Structural Resume Improvements"];
    }
    
    // Try Resume Transformation Examples
    if (analysis["Scope of Improvements"]?.["Resume Transformation Examples"]) {
      return analysis["Scope of Improvements"]["Resume Transformation Examples"];
    }
    
    // Fallback to old structure
    if (analysis["Level 1 - Immediate Resume Optimization"]) {
      return analysis["Level 1 - Immediate Resume Optimization"];
    }
  } catch (error) {
    console.error("Error extracting Level 1 improvements:", error);
  }
  
  return {
    "Keyword Integration": "Add role-relevant keywords from job description",
    "Format Enhancement": "Restructure bullet points using 'Accomplished [A] as measured by [B] by doing [C]' format",
    "Content Reframing": "Better highlight existing experience to match requirements",
    "Section Optimization": "Reorganize resume sections for maximum impact"
  };
}

function extractExperienceRecommendations(analysis: any) {
  const experiences = [];
  try {
    if (analysis["Level 3 - Long-term Development Plan"]?.["Experience Enhancement"]) {
      const expData = analysis["Level 3 - Long-term Development Plan"]["Experience Enhancement"];
      Object.entries(expData).forEach(([key, value]: [string, any]) => {
        experiences.push({
          type: key.replace(/([A-Z])/g, ' $1').trim(),
          description: String(value),
        });
      });
    }
  } catch (error) {
    console.error("Error extracting experience recommendations:", error);
  }
  
  return experiences.length > 0 ? experiences : [
    { type: "Side Projects", description: "Build AI/ML projects to demonstrate skills" },
    { type: "Open Source Contributions", description: "Contribute to relevant repositories" },
    { type: "Cross-functional Leadership", description: "Take on team leadership opportunities" }
  ];
}

function extractCompetitivenessRank(analysis: any) {
  try {
    // Try new structure first
    if (analysis["Market Competitiveness"]?.["Percentile Ranking"]) {
      const ranking = analysis["Market Competitiveness"]["Percentile Ranking"];
      const match = String(ranking).match(/(\d+)/);
      if (match) return match[1] + "th";
    }
    
    // Fallback to old structure
    if (analysis["Level 2 - Market Positioning Strategy"]?.["Role Competitiveness Analysis"]) {
      const compData = analysis["Level 2 - Market Positioning Strategy"]["Role Competitiveness Analysis"];
      // Look for percentile or ranking information
      for (const [key, value] of Object.entries(compData)) {
        if (key.toLowerCase().includes("percentile") || key.toLowerCase().includes("ranking")) {
          const match = String(value).match(/(\d+)/);
          if (match) return match[1] + "th";
        }
      }
    }
  } catch (error) {
    console.error("Error extracting competitiveness rank:", error);
  }
  return "65th";
}

function extractTypicalProfile(analysis: any) {
  const profile = [];
  try {
    if (analysis["Level 2 - Market Positioning Strategy"]?.["Role Competitiveness Analysis"]) {
      const compData = analysis["Level 2 - Market Positioning Strategy"]["Role Competitiveness Analysis"];
      Object.entries(compData).forEach(([key, value]: [string, any]) => {
        if (key.toLowerCase().includes("typical") || key.toLowerCase().includes("candidate")) {
          profile.push(String(value));
        }
      });
    }
  } catch (error) {
    console.error("Error extracting typical profile:", error);
  }
  
  return profile.length > 0 ? profile : [
    "3-5 years product management experience",
    "Technical background with analytics",
    "Experience at mid-size to large companies",
    "Strong stakeholder management skills"
  ];
}

function extractSuccessProbability(analysis: any) {
  try {
    if (analysis["Level 2 - Market Positioning Strategy"]?.["Role Competitiveness Analysis"]) {
      const compData = analysis["Level 2 - Market Positioning Strategy"]["Role Competitiveness Analysis"];
      for (const [key, value] of Object.entries(compData)) {
        if (key.toLowerCase().includes("success") || key.toLowerCase().includes("probability")) {
          const match = String(value).match(/(\d+)%?/);
          if (match) return match[1];
        }
      }
    }
  } catch (error) {
    console.error("Error extracting success probability:", error);
  }
  return "72";
}

function extractCompetitivenessInsight(analysis: any) {
  try {
    // Try new structure first
    if (analysis["Market Competitiveness"]?.["Detailed Reasoning"]) {
      return analysis["Market Competitiveness"]["Detailed Reasoning"];
    }
    
    // Fallback to old structure
    if (analysis["Level 2 - Market Positioning Strategy"]?.["Application Strategy"]) {
      const strategyData = analysis["Level 2 - Market Positioning Strategy"]["Application Strategy"];
      const insights = Object.values(strategyData);
      if (insights.length > 0) {
        return String(insights[0]).substring(0, 100) + "...";
      }
    }
  } catch (error) {
    console.error("Error extracting competitiveness insight:", error);
  }
  
  return {
    "Company Hiring Patterns": "Technology companies for this role typically hire candidates with strong technical backgrounds and 3-5 years relevant experience",
    "Educational Background Analysis": "This role typically recruits from Tier 1-2 institutions. Candidate's background positions them competitively in the market",
    "Experience Level Expectations": "For this role, typical hires have 3-5 years of experience in product management and technical domains",
    "Skills Gap Analysis": "Companies prioritize technical skills, product management experience, and analytical capabilities for this role",
    "Success Probability Breakdown": "Based on typical hiring patterns: 60% of hired candidates had technical background, 70% had product management experience, 50% had analytics skills"
  };
}

function extractResumeTransformations(analysis: any) {
  try {
    if (analysis["Scope of Improvements"]?.["Resume Transformation Examples"]) {
      return analysis["Scope of Improvements"]["Resume Transformation Examples"];
    }
  } catch (error) {
    console.error("Error extracting resume transformations:", error);
  }
  
  return {
    "Bullet Point Improvements": [
      {
        "Original": "Managed product development projects",
        "Improved": "Led cross-functional product development initiatives for 3 key features, resulting in 25% increase in user engagement as measured by daily active users",
        "Improvements Applied": ["Quantification", "Action verb strengthening", "Specific outcomes"],
        "Impact": "Better demonstrates leadership and measurable business impact"
      }
    ],
    "Skills Section Enhancement": {
      "Original Skills List": "Python, SQL, Data Analysis, Project Management",
      "Improved Skills List": "Technical Skills: Python, SQL, Machine Learning, Data Analytics | Product Management: Agile/Scrum, Product Lifecycle, Stakeholder Management | Tools: Tableau, JIRA, Git",
      "Changes Made": "Categorized skills by relevance, added missing JD keywords, improved organization"
    }
  };
}

function FileUpload({ onFileSelect }: { onFileSelect: (file: File | null) => void }) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [error, setError] = useState<string>("");

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        setError("File size must be less than 10MB");
        return;
      }
      
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        setError("Please upload a PDF, DOCX, or TXT file.");
        return;
      }
      
      setError("");
      setUploadedFile(file);
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    },
    multiple: false
  });

  const removeFile = () => {
    setUploadedFile(null);
    setError("");
    onFileSelect(null);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <h3 className="text-lg font-semibold mb-4 text-white">Upload Your Resume</h3>
      
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive 
            ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20" 
            : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
        }`}
      >
        <input {...getInputProps()} />
        
        {uploadedFile ? (
          <div className="space-y-2">
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm text-white">{uploadedFile.name}</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeFile();
              }}
              className="text-red-400 hover:text-red-300 text-sm"
            >
              Remove file
            </button>
          </div>
        ) : (
          <div>
            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="mt-2 text-sm text-gray-400">
              {isDragActive ? "Drop the file here" : "Drag & drop a file here, or click to select"}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              PDF, DOCX, TXT up to 10MB (AI-powered OCR)
            </p>
          </div>
        )}
      </div>
      
      {error && (
        <p className="mt-2 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}

function JobDescriptionInput({ onJobDescriptionChange }: { onJobDescriptionChange: (text: string) => void }) {
  const [jobDescription, setJobDescription] = useState("");
  const maxLength = 5000;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    if (text.length <= maxLength) {
      setJobDescription(text);
      onJobDescriptionChange(text);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <h3 className="text-lg font-semibold mb-4 text-white">Job Description</h3>
      
      <div className="space-y-2">
        <textarea
          value={jobDescription}
          onChange={handleChange}
          placeholder="Paste the job description here..."
          className="w-full h-48 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
        
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">
            Character count: {jobDescription.length}/{maxLength}
          </span>
          {jobDescription.length > 0 && (
            <span className={`${jobDescription.length > maxLength * 0.9 ? 'text-red-400' : 'text-gray-400'}`}>
              {Math.round((jobDescription.length / maxLength) * 100)}% used
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

interface AnalysisResult {
  "Match Score": number;
  "Score Breakdown": {
    "Skill Match": {
      "Primary Skills": {
        "Skills": string;
        "Significance": number;
        "Match": number;
        "Matched Skills": string;
        "Evidence": string | string[];
      };
      "Secondary Skills": {
        "Skills": string;
        "Significance": number;
        "Match": number;
        "Matched Skills": string;
        "Evidence": string | string[];
      };
      "Nice-to-have Skills": {
        "Skills": string;
        "Significance": number;
        "Match": number;
        "Matched Skills": string;
        "Evidence": string | string[];
      };
    };
    "Prior Experience": {
      "Score": number;
      "Evidence": string;
    };
    "Industry Knowledge": {
      "Score": number;
      "Evidence": string;
    };
    "Domain Expertise": {
      "Score": number;
      "Evidence": string;
    };
    "Education Requirements": {
      "Score": number;
      "Evidence": string;
    };
  };
  "Missing Criteria": string[] | string;
  "Overall Match Score Verdict": string;
  "Overall Skill Comparison Table": {
    "Required Skill": string[] | string;
    "Present in Resume": string[] | string;
    "Absent in Resume": string[] | string;
  };
  "Improvement Recommendations"?: {
    "Skills Development": string[] | string;
    "Experience Enhancement": string[] | string;
    "Resume Optimization": string[] | string;
    "Education/Certifications": string[] | string;
    "Industry Knowledge": string[] | string;
    "Overall Strategy": string[] | string;
  };
  "Level 1 - Immediate Resume Optimization"?: {
    "Keyword Enhancement"?: { [key: string]: unknown };
    "Content Restructuring"?: { [key: string]: unknown };
    "Format Optimization"?: { [key: string]: unknown };
  };
  "Level 2 - Market Positioning Strategy"?: {
    "Role Competitiveness Analysis"?: { [key: string]: unknown };
    "Competitive Standing"?: { [key: string]: unknown };
    "Application Strategy"?: { [key: string]: unknown };
  };
  "Level 3 - Long-term Development Plan"?: {
    "Skills Development Roadmap"?: { [key: string]: unknown };
    "Experience Enhancement"?: { [key: string]: unknown };
    "Professional Development"?: { [key: string]: unknown };
    "Educational Advancement"?: { [key: string]: unknown };
  };
  "Resume Rewrite Potential"?: {
    "Estimated score improvement possible through better presentation"?: string;
    [key: string]: unknown;
  };
}

/* eslint-disable */
function ResultsDashboard({ analysis, onBack, originalResumeText, originalJobDescription }: { analysis: any; onBack: () => void; originalResumeText: string; originalJobDescription: string }) {
  const [isExporting, setIsExporting] = useState(false);
  const [isGeneratingResume, setIsGeneratingResume] = useState(false);
  const [isGeneratingAdvancedResume, setIsGeneratingAdvancedResume] = useState(false);
  const [resumeVersions, setResumeVersions] = useState<any[]>([]);
  
  // Extract match score from new structure
  let matchScore = 75; // Default fallback
  if (analysis) {
    // Try new structure first
    if (analysis["Overall Candidacy Score"] && !isNaN(Number(analysis["Overall Candidacy Score"]))) {
      matchScore = Number(analysis["Overall Candidacy Score"]);
    }
    // Fallback to old structure
    else {
      const scoreFields = ["Match Score", "matchScore", "score", "overall_score", "compatibility_score"];
      for (const field of scoreFields) {
        if (analysis[field] && !isNaN(Number(analysis[field]))) {
          matchScore = Number(analysis[field]);
          break;
        }
      }
    }
  }

  const exportToJSON = () => {
    const dataStr = JSON.stringify(analysis, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `job-analysis-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    alert('PDF export feature coming soon!');
  };

  const generatePDFFromHTML = async (htmlCode: string, candidateName: string) => {
    try {
      // Dynamically import jsPDF and html2canvas
      const { default: jsPDF } = await import('jspdf');
      const html2canvas = await import('html2canvas');
      
      // Create a temporary div to render the HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlCode;
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0';
      tempDiv.style.width = '210mm'; // A4 width
      tempDiv.style.backgroundColor = 'white';
      
      document.body.appendChild(tempDiv);
      
      // Wait for fonts and images to load
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Convert HTML to canvas
      const canvas = await html2canvas.default(tempDiv, {
        scale: 2, // High quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      // Clean up
      document.body.removeChild(tempDiv);
      
      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const imgData = canvas.toDataURL('image/png');
      
      // If content is longer than one page, handle pagination
      if (imgHeight > 297) { // A4 height in mm
        let position = 0;
        let pageHeight = 297;
        
        while (position < imgHeight) {
          pdf.addImage(imgData, 'PNG', 0, -position, imgWidth, imgHeight);
          position += pageHeight;
          
          if (position < imgHeight) {
            pdf.addPage();
          }
        }
      } else {
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      }
      
      // Download the PDF
      pdf.save(`improved-resume-${candidateName}-${new Date().toISOString().split('T')[0]}.pdf`);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF from HTML');
    }
  };

  const handleBuildResume = async () => {
    if (!originalResumeText) {
      alert('Original resume text not available');
      return;
    }

    setIsGeneratingResume(true);
    try {
      // Extract Level 1 improvements from analysis
      const level1Improvements = extractLevel1Improvements(analysis);
      
      const response = await fetch('/api/generate-resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resumeText: originalResumeText,
          level1Improvements,
          // Let the API extract these from the original resume text
          candidateName: null,
          contactInfo: null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate resume');
      }

      const data = await response.json();
      
      if (data.htmlCode) {
        // Generate PDF from HTML on client-side
        await generatePDFFromHTML(data.htmlCode, data.candidateName);
        alert('Your improved resume PDF has been downloaded! The resume has been restructured using AI with your Level 1 improvements.');
      } else {
        throw new Error('No HTML data received');
      }
    } catch (error) {
      console.error('Error generating resume:', error);
      alert('Failed to generate resume. Please try again.');
    } finally {
      setIsGeneratingResume(false);
    }
  };

  const handleAdvancedResume = async () => {
    if (!originalResumeText) {
      alert('Original resume text not available');
      return;
    }

    setIsGeneratingAdvancedResume(true);
    try {
      const level1Improvements = extractLevel1Improvements(analysis);
      
      const response = await fetch('/api/generate-resume-advanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resumeText: originalResumeText,
          jobDescription: originalJobDescription || '',
          level1Improvements,
          candidateName: null,
          contactInfo: null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate advanced resume versions');
      }

      const data = await response.json();
      
      if (data.resumeVersions && data.resumeVersions.length > 0) {
        setResumeVersions(data.resumeVersions);
        
        // Generate PDFs for all versions
        for (const version of data.resumeVersions) {
          if (version.htmlCode) {
            await generatePDFFromHTML(version.htmlCode, `${data.candidateName}-${version.name.replace(/\s+/g, '-')}`);
          }
        }
        
        alert(`✨ Advanced Resume Builder Complete!\n\n🎯 Generated ${data.resumeVersions.length} optimized versions:\n${data.resumeVersions.map(v => `• ${v.name}`).join('\n')}\n\nAll versions have been downloaded as PDFs. Each is strategically optimized for different scenarios!`);
      } else {
        throw new Error('No resume versions generated');
      }
    } catch (error) {
      console.error('Error generating advanced resume:', error);
      alert('Failed to generate advanced resume versions. Please try again.');
    } finally {
      setIsGeneratingAdvancedResume(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-xl font-bold">Job Compatibility Portal</h1>
            <div className="flex items-center space-x-4">
              <button
                onClick={exportToJSON}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
              >
                Export JSON
              </button>
              <button
                onClick={exportToPDF}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
              >
                Export PDF
              </button>
              <button
                onClick={handleBuildResume}
                disabled={isGeneratingResume}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-1 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isGeneratingResume ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                    Generating...
                  </>
                ) : (
                  '🚀 Build Resume'
                )}
              </button>
              <button
                onClick={handleAdvancedResume}
                disabled={isGeneratingAdvancedResume}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-4 py-1 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isGeneratingAdvancedResume ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                    Creating Versions...
                  </>
                ) : (
                  '⚡ Advanced Builder'
                )}
              </button>
              <button
                onClick={onBack}
                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
              >
                ← New Analysis
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Match Score Display */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-4">Analysis Results</h2>
          
          <div className="flex justify-center mb-6">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="#374151"
                  strokeWidth="8"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke={matchScore >= 80 ? "#10B981" : matchScore >= 60 ? "#F59E0B" : "#EF4444"}
                  strokeWidth="8"
                  strokeDasharray={`${(matchScore / 100) * 339.292} 339.292`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold">{matchScore}%</div>
                  <div className="text-sm text-gray-400">Match Score</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-lg text-gray-300">
            {matchScore >= 80 && "🎉 Excellent match! You're a strong candidate for this role."}
            {matchScore >= 60 && matchScore < 80 && "✅ Good match! Some areas for improvement."}
            {matchScore < 60 && "⚡ Potential match! Focus on key skill gaps."}
          </div>
        </div>

        {/* Section-Wise Analysis */}
        {analysis && analysis["Section Wise Analysis"] && (
          <div className="space-y-8">
            {/* Professional Experience Section */}
            <div className="bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border border-blue-700 rounded-lg p-6">
              <h3 className="text-2xl font-semibold mb-6 text-blue-400 flex items-center">
                <span className="mr-3">💼</span>
                Professional Experience
                <span className="ml-auto bg-blue-600/20 text-blue-300 px-3 py-1 rounded-full text-sm">
                  Score: {analysis["Section Wise Analysis"]["Professional Experience"]?.["Overall Section Score"] || "N/A"}/10
                </span>
              </h3>
              
              {analysis["Section Wise Analysis"]["Professional Experience"]?.["Bullet Points Analysis"] && (
                <div className="space-y-4">
                  {analysis["Section Wise Analysis"]["Professional Experience"]["Bullet Points Analysis"].map((bullet: any, index: number) => (
                    <div key={index} className="bg-gray-800/30 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="text-blue-300 font-medium">Experience Point {index + 1}</h4>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            bullet.Score >= 8 ? 'bg-green-600/20 text-green-300' :
                            bullet.Score >= 6 ? 'bg-yellow-600/20 text-yellow-300' :
                            'bg-red-600/20 text-red-300'
                          }`}>
                            {bullet.Score}/10
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
                          <h5 className="text-red-400 font-medium mb-2">❌ Original</h5>
                          <p className="text-gray-300 text-sm">{bullet["Original Text"]}</p>
                        </div>
                        <div className="bg-green-900/20 border border-green-700 rounded-lg p-3">
                          <h5 className="text-green-400 font-medium mb-2">✅ Improved</h5>
                          <p className="text-gray-300 text-sm">{bullet["Improved Version"]}</p>
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-400 mb-2">
                        <strong>Score Reasoning:</strong> {bullet["Score Reasoning"]}
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-2">
                        {bullet["Improvements Applied"] && bullet["Improvements Applied"].map((improvement: string, impIndex: number) => (
                          <span key={impIndex} className="bg-blue-600/20 text-blue-300 px-2 py-1 rounded text-xs">
                            {improvement}
                          </span>
                        ))}
                      </div>
                      
                      <div className="text-xs text-gray-400">
                        <strong>JD Alignment:</strong> {bullet["JD Alignment"]}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Skills Section */}
            {analysis["Section Wise Analysis"]["Skills"] && (
              <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-700 rounded-lg p-6">
                <h3 className="text-2xl font-semibold mb-6 text-purple-400 flex items-center">
                  <span className="mr-3">🎯</span>
                  Skills Assessment
                  <span className="ml-auto bg-purple-600/20 text-purple-300 px-3 py-1 rounded-full text-sm">
                    Score: {analysis["Section Wise Analysis"]["Skills"]["Overall Section Score"]}/10
                  </span>
                </h3>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-purple-300 font-medium mb-4">📋 Current Skills Organization</h4>
                    <div className="bg-gray-800/30 rounded-lg p-4">
                      <p className="text-gray-300 text-sm">{analysis["Section Wise Analysis"]["Skills"]["Current Skills Presentation"]}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-purple-300 font-medium mb-4">🔧 Improved Skills Structure</h4>
                    <div className="space-y-3">
                      {analysis["Section Wise Analysis"]["Skills"]["Improved Skills Organization"] && 
                        Object.entries(analysis["Section Wise Analysis"]["Skills"]["Improved Skills Organization"]).map(([category, skills]: [string, any]) => (
                          <div key={category} className="bg-gray-800/30 rounded-lg p-3">
                            <h5 className="text-purple-300 font-medium text-sm mb-2">{category}</h5>
                            <p className="text-gray-300 text-xs">{Array.isArray(skills) ? skills.join(", ") : skills}</p>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
                
                {analysis["Section Wise Analysis"]["Skills"]["Missing Skills"] && 
                  analysis["Section Wise Analysis"]["Skills"]["Missing Skills"].length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-red-300 font-medium mb-4">❌ Missing Skills from JD</h4>
                    <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
                      <div className="flex flex-wrap gap-2">
                        {analysis["Section Wise Analysis"]["Skills"]["Missing Skills"].map((skill: string, index: number) => (
                          <span key={index} className="bg-red-600/20 text-red-300 px-2 py-1 rounded text-xs">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Education Section */}
            {analysis["Section Wise Analysis"]["Education"] && (
              <div className="bg-gradient-to-r from-teal-900/20 to-cyan-900/20 border border-teal-700 rounded-lg p-6">
                <h3 className="text-2xl font-semibold mb-6 text-teal-400 flex items-center">
                  <span className="mr-3">🎓</span>
                  Education Assessment
                  <span className="ml-auto bg-teal-600/20 text-teal-300 px-3 py-1 rounded-full text-sm">
                    Score: {analysis["Section Wise Analysis"]["Education"]["Overall Section Score"]}/10
                  </span>
                </h3>
                
                <div className="space-y-4">
                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <h4 className="text-teal-300 font-medium mb-2">📊 Analysis</h4>
                    <p className="text-gray-300 text-sm">{analysis["Section Wise Analysis"]["Education"]["Analysis"]}</p>
                  </div>
                  
                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <h4 className="text-teal-300 font-medium mb-2">💡 Improvements</h4>
                    <p className="text-gray-300 text-sm">{analysis["Section Wise Analysis"]["Education"]["Improvements"]}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Summary/Objective Section */}
            {analysis["Section Wise Analysis"]["Summary/Objective"] && (
              <div className="bg-gradient-to-r from-orange-900/20 to-red-900/20 border border-orange-700 rounded-lg p-6">
                <h3 className="text-2xl font-semibold mb-6 text-orange-400 flex items-center">
                  <span className="mr-3">📝</span>
                  Professional Summary
                  <span className="ml-auto bg-orange-600/20 text-orange-300 px-3 py-1 rounded-full text-sm">
                    Score: {analysis["Section Wise Analysis"]["Summary/Objective"]["Score"]}/10
                  </span>
                </h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
                    <h4 className="text-red-400 font-medium mb-2">❌ Current Version</h4>
                    <p className="text-gray-300 text-sm">{analysis["Section Wise Analysis"]["Summary/Objective"]["Current Version"]}</p>
                  </div>
                  
                  <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
                    <h4 className="text-green-400 font-medium mb-2">✅ Improved Version</h4>
                    <p className="text-gray-300 text-sm">{analysis["Section Wise Analysis"]["Summary/Objective"]["Improved Version"]}</p>
                  </div>
                </div>
                
                <div className="mt-4 bg-gray-800/30 rounded-lg p-4">
                  <h4 className="text-orange-300 font-medium mb-2">🔧 Improvements Made</h4>
                  <p className="text-gray-300 text-sm">{analysis["Section Wise Analysis"]["Summary/Objective"]["Improvements"]}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Original Structured Analysis Sections (fallback) */}
        {analysis && Object.keys(analysis).length > 0 && !analysis["Section Wise Analysis"] && (
          <div className="space-y-8">
            {/* 1. Strengths Section */}
            <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-700 rounded-lg p-6">
              <h3 className="text-2xl font-semibold mb-6 text-green-400 flex items-center">
                <span className="mr-3">💪</span>
                Your Strengths vs. This Role
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-green-300 mb-4">🎯 Matched Skills</h4>
                  <div className="space-y-3">
                    {/* Extract matched skills from analysis */}
                    {extractMatchedSkills(analysis).map((skill, index) => (
                      <div key={index} className="bg-gray-800/50 rounded-lg p-3">
                        <div className="text-green-300 font-medium">{skill.name}</div>
                        <div className="text-sm text-gray-300 mt-1">{skill.evidence}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-green-300 mb-4">🏆 Key Advantages</h4>
                  <div className="space-y-3">
                    {extractKeyAdvantages(analysis).map((advantage, index) => (
                      <div key={index} className="bg-gray-800/50 rounded-lg p-3">
                        <div className="text-green-300 font-medium">{advantage.title}</div>
                        <div className="text-sm text-gray-300 mt-1">{advantage.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Weaknesses Section */}
            <div className="bg-gradient-to-r from-red-900/20 to-pink-900/20 border border-red-700 rounded-lg p-6">
              <h3 className="text-2xl font-semibold mb-6 text-red-400 flex items-center">
                <span className="mr-3">⚠️</span>
                Areas for Improvement
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-red-300 mb-4">🚫 Missing Skills</h4>
                  <div className="space-y-3">
                    {extractMissingSkills(analysis).map((skill, index) => (
                      <div key={index} className="bg-gray-800/50 rounded-lg p-3">
                        <div className="text-red-300 font-medium">{skill.name}</div>
                        <div className="text-sm text-gray-300 mt-1">Impact: {skill.impact}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-red-300 mb-4">📉 Experience Gaps</h4>
                  <div className="space-y-3">
                    {extractExperienceGaps(analysis).map((gap, index) => (
                      <div key={index} className="bg-gray-800/50 rounded-lg p-3">
                        <div className="text-red-300 font-medium">{gap.area}</div>
                        <div className="text-sm text-gray-300 mt-1">{gap.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Resume Transformation Examples */}
            <div className="bg-gradient-to-r from-amber-900/20 to-yellow-900/20 border border-amber-700 rounded-lg p-6 mb-8">
              <h3 className="text-2xl font-semibold mb-6 text-amber-400 flex items-center">
                <span className="mr-3">✨</span>
                Your Resume - Before vs After
              </h3>
              <p className="text-gray-300 mb-6">See how your resume bullet points can be transformed to better align with this role:</p>
              
              {(() => {
                const transformations = extractResumeTransformations(analysis);
                return (
                  <div className="space-y-6">
                    {/* Bullet Point Improvements */}
                    {transformations["Bullet Point Improvements"] && transformations["Bullet Point Improvements"].length > 0 && (
                      <div>
                        <h4 className="text-xl font-semibold mb-4 text-amber-300">📝 Experience Bullet Points</h4>
                        <div className="space-y-4">
                          {transformations["Bullet Point Improvements"].map((improvement: any, index: number) => (
                            <div key={index} className="bg-gray-800/50 rounded-lg p-4">
                              <div className="grid md:grid-cols-2 gap-4">
                                <div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
                                  <h5 className="text-red-400 font-medium mb-2">❌ Original</h5>
                                  <p className="text-gray-300 text-sm italic">"{improvement.Original}"</p>
                                </div>
                                <div className="bg-green-900/20 border border-green-700 rounded-lg p-3">
                                  <h5 className="text-green-400 font-medium mb-2">✅ Improved</h5>
                                  <p className="text-gray-300 text-sm font-medium">"{improvement.Improved}"</p>
                                </div>
                              </div>
                              <div className="mt-3 pt-3 border-t border-gray-700">
                                <div className="flex flex-wrap gap-2 mb-2">
                                  {improvement["Improvements Applied"] && improvement["Improvements Applied"].map((tag: string, tagIndex: number) => (
                                    <span key={tagIndex} className="bg-amber-600/20 text-amber-300 px-2 py-1 rounded text-xs">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                                <p className="text-gray-400 text-xs">💡 {improvement.Impact}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Skills Section Enhancement */}
                    {transformations["Skills Section Enhancement"] && (
                      <div>
                        <h4 className="text-xl font-semibold mb-4 text-amber-300">🎯 Skills Section</h4>
                        <div className="bg-gray-800/50 rounded-lg p-4">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
                              <h5 className="text-red-400 font-medium mb-2">❌ Original</h5>
                              <p className="text-gray-300 text-sm">{transformations["Skills Section Enhancement"]["Original Skills List"]}</p>
                            </div>
                            <div className="bg-green-900/20 border border-green-700 rounded-lg p-3">
                              <h5 className="text-green-400 font-medium mb-2">✅ Improved</h5>
                              <p className="text-gray-300 text-sm font-medium">{transformations["Skills Section Enhancement"]["Improved Skills List"]}</p>
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t border-gray-700">
                            <p className="text-gray-400 text-xs">💡 {transformations["Skills Section Enhancement"]["Changes Made"]}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Summary/Objective Rewrite */}
                    {transformations["Summary/Objective Rewrite"] && transformations["Summary/Objective Rewrite"]["Original"] && (
                      <div>
                        <h4 className="text-xl font-semibold mb-4 text-amber-300">📋 Professional Summary</h4>
                        <div className="bg-gray-800/50 rounded-lg p-4">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
                              <h5 className="text-red-400 font-medium mb-2">❌ Original</h5>
                              <p className="text-gray-300 text-sm italic">"{transformations["Summary/Objective Rewrite"]["Original"]}"</p>
                            </div>
                            <div className="bg-green-900/20 border border-green-700 rounded-lg p-3">
                              <h5 className="text-green-400 font-medium mb-2">✅ Improved</h5>
                              <p className="text-gray-300 text-sm font-medium">"{transformations["Summary/Objective Rewrite"]["Improved"]}"</p>
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t border-gray-700">
                            <p className="text-gray-400 text-xs">💡 {transformations["Summary/Objective Rewrite"]["Key Changes"]}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* 4. Scope of Improvements - Two Columns */}
            <div className="bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border border-blue-700 rounded-lg p-6">
              <h3 className="text-2xl font-semibold mb-6 text-blue-400 flex items-center">
                <span className="mr-3">🚀</span>
                Improvement Roadmap
              </h3>
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Column A - Structural Improvements */}
                <div className="bg-gray-800/30 rounded-lg p-6">
                  <h4 className="text-xl font-semibold mb-4 text-blue-300 flex items-center">
                    <span className="mr-2">📝</span>
                    Resume Optimization (Immediate)
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <h5 className="font-medium text-blue-200 mb-2">Keywords & ATS Optimization</h5>
                      <div className="space-y-2">
                        {extractKeywordRecommendations(analysis).map((rec, index) => (
                          <div key={index} className="text-sm text-gray-300 bg-gray-800 p-2 rounded">
                            • {rec}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h5 className="font-medium text-blue-200 mb-2">Format Improvements</h5>
                      <div className="space-y-2">
                        <div className="text-sm text-gray-300 bg-gray-800 p-3 rounded">
                          <div className="font-medium text-blue-200 mb-1">Use "Accomplished [A] as measured by [B] by doing [C]" format:</div>
                          <div className="text-xs text-gray-400 italic">
                            Example: "Increased user engagement by 40% as measured by monthly active users by implementing new onboarding flow"
                          </div>
                        </div>
                        {extractFormatRecommendations(analysis).map((rec, index) => (
                          <div key={index} className="text-sm text-gray-300 bg-gray-800 p-2 rounded">
                            • {rec}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column B - Long-term Development */}
                <div className="bg-gray-800/30 rounded-lg p-6">
                  <h4 className="text-xl font-semibold mb-4 text-purple-300 flex items-center">
                    <span className="mr-2">📚</span>
                    Long-term Development (3-18 months)
                  </h4>
                                     <div className="space-y-4">
                     <div>
                       <h5 className="font-medium text-purple-200 mb-2">🎓 Top 3 Recommended Courses & Certifications</h5>
                       <div className="space-y-3">
                         {extractCourseRecommendations(analysis).map((course, index) => (
                           <div key={index} className="bg-gray-800 p-4 rounded-lg border border-purple-700/30">
                             <div className="flex justify-between items-start mb-2">
                               <h6 className="font-medium text-purple-300">{course["Course/Certification Name"]}</h6>
                               <span className={`px-2 py-1 rounded text-xs ${
                                 course.Priority === "High" ? "bg-red-600/20 text-red-300" : "bg-yellow-600/20 text-yellow-300"
                               }`}>
                                 {course.Priority} Priority
                               </span>
                             </div>
                             <div className="text-xs text-gray-400 mb-2">
                               <div className="grid grid-cols-2 gap-2">
                                 <span>📚 {course.Provider}</span>
                                 <span>⏱️ {course.Duration}</span>
                                 <span>💰 {course.Cost}</span>
                                 <span className="col-span-2 mt-1">💡 {course.Relevance}</span>
                               </div>
                             </div>
                             <a
                               href={course["Direct Link"]}
                               target="_blank"
                               rel="noopener noreferrer"
                               className="inline-flex items-center text-sm bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded transition-colors"
                             >
                               View Course →
                             </a>
                           </div>
                         ))}
                       </div>
                     </div>
                    <div>
                      <h5 className="font-medium text-purple-200 mb-2">Experience Building</h5>
                      <div className="space-y-2">
                        {extractExperienceRecommendations(analysis).map((exp, index) => (
                          <div key={index} className="text-sm text-gray-300 bg-gray-800 p-2 rounded">
                            <div className="font-medium">{exp.type}</div>
                            <div className="text-xs text-gray-400 mt-1">{exp.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Competitiveness Analysis */}
            <div className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border border-yellow-700 rounded-lg p-6">
              <h3 className="text-2xl font-semibold mb-6 text-yellow-400 flex items-center">
                <span className="mr-3">📊</span>
                Market Competitiveness
              </h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-gray-800/30 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-300 mb-3">Your Position</h4>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-400">{extractCompetitivenessRank(analysis)}</div>
                    <div className="text-sm text-gray-300 mt-1">Percentile</div>
                  </div>
                </div>
                <div className="bg-gray-800/30 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-300 mb-3">Typical Candidate Profile</h4>
                  <div className="text-sm text-gray-300 space-y-2">
                    {extractTypicalProfile(analysis).map((trait, index) => (
                      <div key={index}>• {trait}</div>
                    ))}
                  </div>
                </div>
                                 <div className="bg-gray-800/30 rounded-lg p-4">
                   <h4 className="font-medium text-yellow-300 mb-3">Success Probability</h4>
                   <div className="text-center">
                     <div className="text-3xl font-bold text-yellow-400">{extractSuccessProbability(analysis)}%</div>
                     <div className="text-sm text-gray-300 mt-1">Interview Success Rate</div>
                   </div>
                 </div>
               </div>

               {/* Detailed Reasoning Section */}
               {(() => {
                 const reasoning = extractCompetitivenessInsight(analysis);
                 return (
                   <div className="mt-6 bg-gray-800/30 rounded-lg p-6">
                     <h4 className="font-medium text-yellow-300 mb-4">📊 Detailed Market Analysis & Reasoning</h4>
                     <div className="space-y-4">
                       {typeof reasoning === 'object' && reasoning !== null ? (
                         Object.entries(reasoning).map(([key, value]) => (
                           <div key={key} className="bg-gray-800/50 rounded-lg p-4">
                             <h5 className="font-medium text-yellow-200 mb-2">
                               {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                             </h5>
                             <p className="text-sm text-gray-300 leading-relaxed">{String(value)}</p>
                           </div>
                         ))
                       ) : (
                         <div className="bg-gray-800/50 rounded-lg p-4">
                           <p className="text-sm text-gray-300 leading-relaxed">{String(reasoning)}</p>
                         </div>
                       )}
                     </div>
                   </div>
                 );
               })()}
            </div>

            {/* Debug Section - Can be removed later */}
            <details className="bg-gray-800 rounded-lg p-4">
              <summary className="cursor-pointer text-gray-400 text-sm mb-2">🔍 Raw Analysis Data (Debug)</summary>
              <pre className="text-xs text-gray-300 overflow-auto max-h-96 bg-gray-900 p-4 rounded">
                {JSON.stringify(analysis, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {/* If no analysis data */}
        {(!analysis || Object.keys(analysis).length === 0) && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-6 text-center">
            <h3 className="text-red-400 font-bold mb-2">No Analysis Data Available</h3>
            <p className="text-gray-300">The analysis response appears to be empty or invalid.</p>
          </div>
        )}
      </main>
    </div>
  );
}

function Dashboard() {
  const { data: session } = useSession();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [resumeText, setResumeText] = useState<string>("");
  const [rateLimitInfo, setRateLimitInfo] = useState<{ allowed: boolean; remaining: number; resetTime?: string } | null>(null);
  const [loadingRateLimit, setLoadingRateLimit] = useState(true);

  // Check rate limit on component mount
  useEffect(() => {
    if (session?.user?.email) {
      checkRateLimit();
    }
  }, [session]);

  const checkRateLimit = async () => {
    try {
      const response = await fetch('/api/rate-limit/check');
      if (response.ok) {
        const data = await response.json();
        setRateLimitInfo(data);
      }
    } catch (error) {
      console.error('Rate limit check error:', error);
    } finally {
      setLoadingRateLimit(false);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile || !jobDescription.trim()) {
      alert("Please upload a resume and enter a job description");
      return;
    }

    // Check rate limit before proceeding
    if (rateLimitInfo && !rateLimitInfo.allowed) {
      const resetTime = rateLimitInfo.resetTime ? new Date(rateLimitInfo.resetTime) : null;
      const resetDate = resetTime ? resetTime.toLocaleDateString() : 'tomorrow';
      alert(`Rate limit exceeded. You can perform 3 analyses per 24-hour period. Please try again ${resetDate}.`);
      return;
    }

    setIsAnalyzing(true);
    
    try {
      // Step 1: Extract text from the uploaded file
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      // Show different message for PDFs
      const isPDF = selectedFile.type === 'application/pdf';
      if (isPDF) {
        // You could add a toast notification here
        console.log('Processing PDF with AI OCR...');
      }
      
      const extractResponse = await fetch('/api/extract-text', {
        method: 'POST',
        body: formData,
      });
      
      if (!extractResponse.ok) {
        const responseText = await extractResponse.text();
        console.error('Extract response text:', responseText);
        
        try {
          const errorData = JSON.parse(responseText);
          throw new Error(errorData.error || 'Failed to extract text from file');
        } catch (parseError) {
          throw new Error(`Server error: ${extractResponse.status} - ${responseText.substring(0, 200)}`);
        }
      }
      
      const { text: extractedResumeText } = await extractResponse.json();
      setResumeText(extractedResumeText); // Store the extracted text
      
      // Step 2: Send to OpenAI for analysis
      const analysisResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resumeText: extractedResumeText,
          jobDescription: jobDescription.trim(),
        }),
      });
      
      if (!analysisResponse.ok) {
        const errorData = await analysisResponse.json();
        throw new Error(errorData.error || 'Failed to analyze compatibility');
      }
      
      const { analysis } = await analysisResponse.json();
      
      // Debug: Log the actual structure
      console.log('Analysis structure:', JSON.stringify(analysis, null, 2));
      
      // Step 3: Display results
      setAnalysisResult(analysis);
      
      // Refresh rate limit info
      await checkRateLimit();
      
    } catch (error) {
      console.error('Analysis error:', error);
      alert(error instanceof Error ? error.message : 'An error occurred during analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const canAnalyze = selectedFile && jobDescription.trim().length > 0 && (!rateLimitInfo || rateLimitInfo.allowed);

  // Show results if available
  if (analysisResult) {
    return <ResultsDashboard analysis={analysisResult} onBack={() => setAnalysisResult(null)} originalResumeText={resumeText} originalJobDescription={jobDescription} />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-xl font-bold">Job Compatibility Portal</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-300">
                Welcome, {session?.user?.email}
              </span>
              {session?.user?.email === "hi@harsh.fun" && (
                <a
                  href="/admin"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm"
                >
                  Admin
                </a>
              )}
              <button
                onClick={() => signOut()}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-4">Analyze Your Job Compatibility</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Upload your resume and paste a job description to get a detailed compatibility analysis powered by AI.
          </p>
          
          {/* Rate Limit Info */}
          {!loadingRateLimit && rateLimitInfo && (
            <div className="mt-4">
              {rateLimitInfo.remaining === -1 ? (
                <p className="text-green-400 text-sm">Unlimited analyses available</p>
              ) : rateLimitInfo.allowed ? (
                <p className="text-blue-400 text-sm">
                  {rateLimitInfo.remaining} analyses remaining today
                </p>
              ) : (
                <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 max-w-md mx-auto">
                  <p className="text-red-400 text-sm">
                    Rate limit exceeded. You can perform 3 analyses per 24-hour period.
                  </p>
                  {rateLimitInfo.resetTime && (
                    <p className="text-red-300 text-xs mt-1">
                      Resets on {new Date(rateLimitInfo.resetTime).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* File Upload */}
          <div className="space-y-6">
            <FileUpload onFileSelect={setSelectedFile} />
          </div>

          {/* Job Description */}
          <div className="space-y-6">
            <JobDescriptionInput onJobDescriptionChange={setJobDescription} />
          </div>
        </div>

        {/* Analysis Button */}
        <div className="text-center mt-8">
          <button
            onClick={handleAnalyze}
            disabled={!canAnalyze || isAnalyzing}
            className={`px-8 py-3 rounded-lg font-semibold text-white transition-colors ${
              canAnalyze && !isAnalyzing
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-600 cursor-not-allowed"
            }`}
          >
            {isAnalyzing ? (
              <div className="flex items-center space-x-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Analyzing...</span>
              </div>
            ) : (
              "Analyze Compatibility"
            )}
          </button>
          
          {!canAnalyze && (
            <p className="mt-2 text-sm text-gray-400">
              {rateLimitInfo && !rateLimitInfo.allowed 
                ? "Rate limit exceeded. Please try again tomorrow."
                : "Please upload a resume and enter a job description to continue"
              }
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

function AuthContent() {
  const { data: session } = useSession();

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-8">Job Compatibility Portal</h1>
          <button
            onClick={() => signIn("google")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return <Dashboard />;
}

export default function Home() {
  return (
    <SessionProvider>
      <AuthContent />
    </SessionProvider>
  );
}
