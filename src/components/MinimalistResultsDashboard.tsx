/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';

interface ResultsDashboardProps {
  analysis: any; // Using any for now to match existing AnalysisResult type
  onBack: () => void;
  originalResumeText: string;
}

export default function MinimalistResultsDashboard({ analysis, onBack, originalResumeText }: ResultsDashboardProps) {
  const [isGeneratingResume, setIsGeneratingResume] = useState(false);
  
  // Extract match score from analysis
  let matchScore = 75; // Default fallback
  if (analysis) {
    if (analysis["Overall Candidacy Score"] && !isNaN(Number(analysis["Overall Candidacy Score"]))) {
      matchScore = Number(analysis["Overall Candidacy Score"]);
    } else {
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

  const generatePDFFromHTML = async (htmlCode: string, candidateName: string) => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const html2canvas = await import('html2canvas');
      
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlCode;
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0';
      tempDiv.style.width = '210mm';
      tempDiv.style.backgroundColor = 'white';
      
      document.body.appendChild(tempDiv);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const canvas = await html2canvas.default(tempDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      document.body.removeChild(tempDiv);
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const imgData = canvas.toDataURL('image/png');
      
      if (imgHeight > 297) {
        let position = 0;
                 const pageHeight = 297;
        
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
      
      pdf.save(`improved-resume-${candidateName}-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF from HTML');
    }
  };

  const extractLevel1Improvements = (analysis: any) => {
    try {
      if (analysis["Scope of Improvements"]?.["Column A - Structural Resume Improvements"]) {
        return analysis["Scope of Improvements"]["Column A - Structural Resume Improvements"];
      }
      if (analysis["Scope of Improvements"]?.["Resume Transformation Examples"]) {
        return analysis["Scope of Improvements"]["Resume Transformation Examples"];
      }
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
  };

  const handleBuildResume = async () => {
    if (!originalResumeText) {
      alert('Original resume text not available');
      return;
    }

    setIsGeneratingResume(true);
    try {
      const level1Improvements = extractLevel1Improvements(analysis);
      
      const response = await fetch('/api/generate-resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resumeText: originalResumeText,
          level1Improvements,
          candidateName: null,
          contactInfo: null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate resume');
      }

      const data = await response.json();
      
      if (data.htmlCode) {
        await generatePDFFromHTML(data.htmlCode, data.candidateName);
        alert('Your improved resume PDF has been downloaded!');
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

  // Helper functions to extract data from analysis
  const extractStrengths = (analysis: any) => {
    const strengths = [];
    try {
      if (analysis["Strengths"]) {
        Object.entries(analysis["Strengths"]).forEach(([key, value]) => {
          strengths.push({ title: key, description: String(value) });
        });
      }
    } catch (error) {
      console.error('Error extracting strengths:', error);
    }
    return strengths.length > 0 ? strengths : [
      { title: "Technical Skills", description: "Strong technical foundation" },
      { title: "Experience", description: "Relevant work experience" }
    ];
  };

  const extractWeaknesses = (analysis: any) => {
    const weaknesses = [];
    try {
      if (analysis["Weaknesses"]) {
        Object.entries(analysis["Weaknesses"]).forEach(([key, value]) => {
          weaknesses.push({ title: key, description: String(value) });
        });
      }
    } catch (error) {
      console.error('Error extracting weaknesses:', error);
    }
    return weaknesses.length > 0 ? weaknesses : [
      { title: "Missing Skills", description: "Some required skills are missing" },
      { title: "Experience Gap", description: "Could benefit from more relevant experience" }
    ];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="text-gray-500 hover:text-gray-700 flex items-center space-x-2 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="text-sm font-medium">Back</span>
              </button>
              <div className="h-6 w-px bg-gray-300" />
              <h1 className="text-xl font-semibold text-gray-900">Resume Analysis</h1>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={exportToJSON}
                className="text-gray-600 hover:text-gray-800 bg-white border border-gray-300 hover:border-gray-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Export Data
              </button>
              <button
                onClick={handleBuildResume}
                disabled={isGeneratingResume}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                {isGeneratingResume ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Build Resume
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content with Side Panel Layout */}
      <div className="flex">
        {/* Side Panel - Original Resume */}
        <div className="w-80 bg-white border-r border-gray-200 shadow-sm h-screen sticky top-0">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Your Resume</h3>
              <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-medium">Original</span>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                {originalResumeText || "Resume text not available"}
              </pre>
            </div>
          </div>
        </div>

        {/* Main Analysis Content */}
        <div className="flex-1 bg-gray-50">
          <main className="max-w-5xl mx-auto px-6 py-8">
            {/* Match Score Display */}
            <div className="mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Overall Match Score</h2>
                    <p className="text-gray-600 text-lg">
                      {matchScore >= 80 && "🎉 Excellent match! You're a strong candidate for this role."}
                      {matchScore >= 60 && matchScore < 80 && "✅ Good match! Some areas for improvement."}
                      {matchScore < 60 && "⚡ Potential match! Focus on key skill gaps."}
                    </p>
                  </div>
                  <div className="flex items-center space-x-8">
                    <div className="relative">
                      <div className="w-28 h-28 relative">
                        <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 100 100">
                          <circle
                            cx="50"
                            cy="50"
                            r="42"
                            fill="none"
                            stroke="#E5E7EB"
                            strokeWidth="6"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="42"
                            fill="none"
                            stroke={matchScore >= 80 ? "#10B981" : matchScore >= 60 ? "#F59E0B" : "#EF4444"}
                            strokeWidth="6"
                            strokeDasharray={`${(matchScore / 100) * 264} 264`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-2xl font-bold text-gray-900">{matchScore}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-bold text-gray-900">{matchScore}%</div>
                      <div className="text-sm text-gray-500 font-medium">Compatibility Score</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Analysis Sections */}
            <div className="space-y-6">
              {/* Strengths */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="border-b border-gray-100 p-6">
                  <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    Your Strengths
                  </h3>
                </div>
                <div className="p-6">
                  <div className="grid gap-4">
                    {extractStrengths(analysis).map((strength, index) => (
                      <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 className="font-semibold text-green-800 mb-2">{strength.title}</h4>
                        <p className="text-green-700 text-sm">{strength.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Areas for Improvement */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="border-b border-gray-100 p-6">
                  <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    Areas for Improvement
                  </h3>
                </div>
                <div className="p-6">
                  <div className="grid gap-4">
                    {extractWeaknesses(analysis).map((weakness, index) => (
                      <div key={index} className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <h4 className="font-semibold text-amber-800 mb-2">{weakness.title}</h4>
                        <p className="text-amber-700 text-sm">{weakness.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Raw Analysis Data */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="border-b border-gray-100 p-6">
                  <h3 className="text-xl font-semibold text-gray-900">Detailed Analysis</h3>
                </div>
                <div className="p-6">
                  <details className="group">
                    <summary className="cursor-pointer text-gray-600 text-sm mb-4 hover:text-gray-800">
                      🔍 View Raw Analysis Data (for debugging)
                    </summary>
                    <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-auto">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                        {JSON.stringify(analysis, null, 2)}
                      </pre>
                    </div>
                  </details>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
} 