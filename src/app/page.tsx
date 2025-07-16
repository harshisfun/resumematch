"use client";

import { SessionProvider, useSession, signIn, signOut } from "next-auth/react";
import { useCallback, useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";

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
        setError("Please upload a DOCX or TXT file. PDF support is coming soon!");
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
              DOCX, TXT up to 10MB (PDF support coming soon)
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
}

function ResultsDashboard({ analysis, onBack }: { analysis: AnalysisResult; onBack: () => void }) {
  const matchScore = analysis["Match Score"];
  const [isExporting, setIsExporting] = useState(false);

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

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      // Create a formatted HTML content for PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Job Compatibility Analysis Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .score-section { text-align: center; margin: 30px 0; }
            .score-circle { 
              width: 120px; height: 120px; border-radius: 50%; 
              border: 8px solid #e5e7eb; display: inline-flex; 
              align-items: center; justify-content: center; font-size: 24px; font-weight: bold;
              background: ${matchScore >= 80 ? '#10B981' : matchScore >= 60 ? '#F59E0B' : '#EF4444'};
              color: white;
            }
            .section { margin: 30px 0; }
            .section h3 { color: #1f2937; border-bottom: 1px solid #d1d5db; padding-bottom: 10px; }
            .metric { margin: 15px 0; }
            .metric-header { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .progress-bar { width: 100%; height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }
            .progress-fill { height: 100%; background: #3b82f6; }
            .skill-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin: 20px 0; }
            .skill-column h4 { color: #374151; margin-bottom: 10px; }
            .skill-list { list-style: none; padding: 0; }
            .skill-list li { padding: 5px 0; border-bottom: 1px solid #f3f4f6; }
            .recommendations { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .recommendation-category { margin: 15px 0; }
            .recommendation-category h4 { color: #1e40af; margin-bottom: 10px; }
            .missing-criteria { background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .missing-criteria h3 { color: #dc2626; }
            .timestamp { text-align: center; color: #6b7280; font-size: 14px; margin-top: 40px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Job Compatibility Analysis Report</h1>
            <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          </div>

          <div class="score-section">
            <h2>Overall Match Score</h2>
            <div class="score-circle">${matchScore}%</div>
            <p><strong>${analysis["Overall Match Score Verdict"]}</strong></p>
          </div>

          <div class="section">
            <h3>Skill Match Analysis</h3>
            ${Object.entries(analysis["Score Breakdown"]["Skill Match"]).map(([skillType, data]) => `
              <div class="metric">
                <div class="metric-header">
                  <span><strong>${skillType}</strong></span>
                  <span>${data.Match}%</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${data.Match}%"></div>
                </div>
                ${data["Matched Skills"] && data["Matched Skills"] !== "None" ? 
                  `<p><strong>Matched Skills:</strong> ${data["Matched Skills"]}</p>` : ''}
              </div>
            `).join('')}
          </div>

          <div class="section">
            <h3>Other Metrics</h3>
            ${Object.entries(analysis["Score Breakdown"]).filter(([key]) => key !== "Skill Match").map(([metric, data]) => {
              const score = 'Score' in data ? data.Score : 0;
              return `
                <div class="metric">
                  <div class="metric-header">
                    <span><strong>${metric}</strong></span>
                    <span>${score}%</span>
                  </div>
                  <div class="progress-bar">
                    <div class="progress-fill" style="width: ${score}%"></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          ${analysis["Missing Criteria"] ? `
            <div class="missing-criteria">
              <h3>Missing Criteria</h3>
              <ul>
                ${Array.isArray(analysis["Missing Criteria"]) 
                  ? analysis["Missing Criteria"].map(criteria => `<li>${criteria}</li>`).join('')
                  : analysis["Missing Criteria"].split(", ").map(criteria => `<li>${criteria}</li>`).join('')
                }
              </ul>
            </div>
          ` : ''}

          <div class="section">
            <h3>Skill Comparison</h3>
            <div class="skill-grid">
              <div>
                <h4>Required Skills</h4>
                <ul class="skill-list">
                  ${Array.isArray(analysis["Overall Skill Comparison Table"]["Required Skill"])
                    ? analysis["Overall Skill Comparison Table"]["Required Skill"].map(skill => `<li>${skill}</li>`).join('')
                    : analysis["Overall Skill Comparison Table"]["Required Skill"].split(", ").map(skill => `<li>${skill}</li>`).join('')
                  }
                </ul>
              </div>
              <div>
                <h4>Present in Resume</h4>
                <ul class="skill-list">
                  ${Array.isArray(analysis["Overall Skill Comparison Table"]["Present in Resume"])
                    ? analysis["Overall Skill Comparison Table"]["Present in Resume"].map(skill => `<li>${skill}</li>`).join('')
                    : analysis["Overall Skill Comparison Table"]["Present in Resume"].split(", ").map(skill => `<li>${skill}</li>`).join('')
                  }
                </ul>
              </div>
              <div>
                <h4>Absent in Resume</h4>
                <ul class="skill-list">
                  ${Array.isArray(analysis["Overall Skill Comparison Table"]["Absent in Resume"])
                    ? analysis["Overall Skill Comparison Table"]["Absent in Resume"].map(skill => `<li>${skill}</li>`).join('')
                    : analysis["Overall Skill Comparison Table"]["Absent in Resume"].split(", ").map(skill => `<li>${skill}</li>`).join('')
                  }
                </ul>
              </div>
            </div>
          </div>

          ${analysis["Improvement Recommendations"] ? `
            <div class="recommendations">
              <h3>Improvement Recommendations</h3>
              
              <div class="recommendation-category">
                <h4>🎯 Skills Development</h4>
                <ul>
                  ${Array.isArray(analysis["Improvement Recommendations"]["Skills Development"])
                    ? analysis["Improvement Recommendations"]["Skills Development"].map(rec => `<li>${rec}</li>`).join('')
                    : analysis["Improvement Recommendations"]["Skills Development"].split(". ").map(rec => `<li>${rec}</li>`).join('')
                  }
                </ul>
              </div>

              <div class="recommendation-category">
                <h4>🚀 Experience Enhancement</h4>
                <ul>
                  ${Array.isArray(analysis["Improvement Recommendations"]["Experience Enhancement"])
                    ? analysis["Improvement Recommendations"]["Experience Enhancement"].map(rec => `<li>${rec}</li>`).join('')
                    : analysis["Improvement Recommendations"]["Experience Enhancement"].split(". ").map(rec => `<li>${rec}</li>`).join('')
                  }
                </ul>
              </div>

              <div class="recommendation-category">
                <h4>📝 Resume Optimization</h4>
                <ul>
                  ${Array.isArray(analysis["Improvement Recommendations"]["Resume Optimization"])
                    ? analysis["Improvement Recommendations"]["Resume Optimization"].map(rec => `<li>${rec}</li>`).join('')
                    : analysis["Improvement Recommendations"]["Resume Optimization"].split(". ").map(rec => `<li>${rec}</li>`).join('')
                  }
                </ul>
              </div>

              <div class="recommendation-category">
                <h4>🎓 Education/Certifications</h4>
                <ul>
                  ${Array.isArray(analysis["Improvement Recommendations"]["Education/Certifications"])
                    ? analysis["Improvement Recommendations"]["Education/Certifications"].map(rec => `<li>${rec}</li>`).join('')
                    : analysis["Improvement Recommendations"]["Education/Certifications"].split(". ").map(rec => `<li>${rec}</li>`).join('')
                  }
                </ul>
              </div>

              <div class="recommendation-category">
                <h4>📋 Overall Strategy</h4>
                <ul>
                  ${Array.isArray(analysis["Improvement Recommendations"]["Overall Strategy"])
                    ? analysis["Improvement Recommendations"]["Overall Strategy"].map(rec => `<li>${rec}</li>`).join('')
                    : analysis["Improvement Recommendations"]["Overall Strategy"].split(". ").map(rec => `<li>${rec}</li>`).join('')
                  }
                </ul>
              </div>
            </div>
          ` : ''}

          <div class="timestamp">
            <p>Report generated by Job Compatibility Portal</p>
          </div>
        </body>
        </html>
      `;

      // Use browser's print functionality to generate PDF
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        
        // Wait for content to load, then print
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 1000);
      }
    } catch (error) {
      console.error('PDF export error:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsExporting(false);
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
                disabled={isExporting}
                className={`px-3 py-1 rounded text-sm ${
                  isExporting 
                    ? "bg-gray-600 cursor-not-allowed" 
                    : "bg-blue-600 hover:bg-blue-700"
                } text-white`}
              >
                {isExporting ? "Generating PDF..." : "Export PDF"}
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
        {/* Overall Score */}
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
          
          <p className="text-gray-400 max-w-2xl mx-auto">
            {analysis["Overall Match Score Verdict"]}
          </p>
        </div>

        {/* Detailed Breakdown */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Skill Match */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4">Skill Match</h3>
            <div className="space-y-4">
              {Object.entries(analysis["Score Breakdown"]["Skill Match"]).map(([skillType, data]) => (
                <div key={skillType} className="border-b border-gray-700 pb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">{skillType}</span>
                    <span className="text-sm text-gray-400">{data.Match}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${data.Match}%` }}
                    ></div>
                  </div>
                  {data["Matched Skills"] && data["Matched Skills"] !== "None" && (
                    <div className="mt-2 text-sm text-gray-300">
                      <span className="font-medium">Matched:</span> {data["Matched Skills"]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Other Metrics */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4">Other Metrics</h3>
            <div className="space-y-4">
              {Object.entries(analysis["Score Breakdown"]).filter(([key]) => key !== "Skill Match").map(([metric, data]) => {
                const score = 'Score' in data ? data.Score : 0;
                return (
                  <div key={metric} className="border-b border-gray-700 pb-4">
                                      <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">{metric}</span>
                    <span className="text-sm text-gray-400">{score}</span>
                  </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${score}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Missing Criteria */}
        {analysis["Missing Criteria"] && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-6 mb-8">
            <h3 className="text-xl font-semibold mb-4 text-red-400">Missing Criteria</h3>
            <div className="text-gray-300">
              {Array.isArray(analysis["Missing Criteria"]) 
                ? analysis["Missing Criteria"].map((criteria, index) => (
                    <div key={index} className="flex items-start space-x-2 mb-2">
                      <span className="text-red-400 mt-1">•</span>
                      <span className="text-gray-300">{criteria}</span>
                    </div>
                  ))
                : analysis["Missing Criteria"].split(", ").map((criteria, index) => (
                    <div key={index} className="flex items-start space-x-2 mb-2">
                      <span className="text-red-400 mt-1">•</span>
                      <span className="text-gray-300">{criteria}</span>
                    </div>
                  ))
              }
            </div>
          </div>
        )}

        {/* Skill Comparison Table */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h3 className="text-xl font-semibold mb-4">Skill Comparison</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium text-red-400 mb-2">Required Skills</h4>
              <div className="space-y-1">
                {Array.isArray(analysis["Overall Skill Comparison Table"]["Required Skill"])
                  ? analysis["Overall Skill Comparison Table"]["Required Skill"].map((skill, index) => (
                      <div key={index} className="text-sm text-gray-300">• {skill}</div>
                    ))
                  : analysis["Overall Skill Comparison Table"]["Required Skill"].split(", ").map((skill, index) => (
                      <div key={index} className="text-sm text-gray-300">• {skill}</div>
                    ))
                }
              </div>
            </div>
            <div>
              <h4 className="font-medium text-green-400 mb-2">Present in Resume</h4>
              <div className="space-y-1">
                {Array.isArray(analysis["Overall Skill Comparison Table"]["Present in Resume"])
                  ? analysis["Overall Skill Comparison Table"]["Present in Resume"].map((skill, index) => (
                      <div key={index} className="text-sm text-gray-300">• {skill}</div>
                    ))
                  : analysis["Overall Skill Comparison Table"]["Present in Resume"].split(", ").map((skill, index) => (
                      <div key={index} className="text-sm text-gray-300">• {skill}</div>
                    ))
                }
              </div>
            </div>
            <div>
              <h4 className="font-medium text-yellow-400 mb-2">Absent in Resume</h4>
              <div className="space-y-1">
                {Array.isArray(analysis["Overall Skill Comparison Table"]["Absent in Resume"])
                  ? analysis["Overall Skill Comparison Table"]["Absent in Resume"].map((skill, index) => (
                      <div key={index} className="text-sm text-gray-300">• {skill}</div>
                    ))
                  : analysis["Overall Skill Comparison Table"]["Absent in Resume"].split(", ").map((skill, index) => (
                      <div key={index} className="text-sm text-gray-300">• {skill}</div>
                    ))
                }
              </div>
            </div>
          </div>
        </div>

        {/* Improvement Recommendations */}
        {analysis["Improvement Recommendations"] && (
          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-6 text-blue-400">💡 Improvement Recommendations</h3>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Skills Development */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="font-medium text-blue-300 mb-3 flex items-center">
                  <span className="mr-2">🎯</span>
                  Skills Development
                </h4>
                <div className="space-y-2">
                  {Array.isArray(analysis["Improvement Recommendations"]["Skills Development"])
                    ? analysis["Improvement Recommendations"]["Skills Development"].map((rec, index) => (
                        <div key={index} className="text-sm text-gray-300">• {rec}</div>
                      ))
                    : analysis["Improvement Recommendations"]["Skills Development"].split(". ").map((rec, index) => (
                        <div key={index} className="text-sm text-gray-300">• {rec}</div>
                      ))
                  }
                </div>
              </div>

              {/* Experience Enhancement */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="font-medium text-blue-300 mb-3 flex items-center">
                  <span className="mr-2">🚀</span>
                  Experience Enhancement
                </h4>
                <div className="space-y-2">
                  {Array.isArray(analysis["Improvement Recommendations"]["Experience Enhancement"])
                    ? analysis["Improvement Recommendations"]["Experience Enhancement"].map((rec, index) => (
                        <div key={index} className="text-sm text-gray-300">• {rec}</div>
                      ))
                    : analysis["Improvement Recommendations"]["Experience Enhancement"].split(". ").map((rec, index) => (
                        <div key={index} className="text-sm text-gray-300">• {rec}</div>
                      ))
                  }
                </div>
              </div>

              {/* Resume Optimization */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="font-medium text-blue-300 mb-3 flex items-center">
                  <span className="mr-2">📝</span>
                  Resume Optimization
                </h4>
                <div className="space-y-2">
                  {Array.isArray(analysis["Improvement Recommendations"]["Resume Optimization"])
                    ? analysis["Improvement Recommendations"]["Resume Optimization"].map((rec, index) => (
                        <div key={index} className="text-sm text-gray-300">• {rec}</div>
                      ))
                    : analysis["Improvement Recommendations"]["Resume Optimization"].split(". ").map((rec, index) => (
                        <div key={index} className="text-sm text-gray-300">• {rec}</div>
                      ))
                  }
                </div>
              </div>

              {/* Education/Certifications */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="font-medium text-blue-300 mb-3 flex items-center">
                  <span className="mr-2">🎓</span>
                  Education/Certifications
                </h4>
                <div className="space-y-2">
                  {Array.isArray(analysis["Improvement Recommendations"]["Education/Certifications"])
                    ? analysis["Improvement Recommendations"]["Education/Certifications"].map((rec, index) => (
                        <div key={index} className="text-sm text-gray-300">• {rec}</div>
                      ))
                    : analysis["Improvement Recommendations"]["Education/Certifications"].split(". ").map((rec, index) => (
                        <div key={index} className="text-sm text-gray-300">• {rec}</div>
                      ))
                  }
                </div>
              </div>
            </div>

            {/* Overall Strategy */}
            <div className="mt-6 bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg p-4">
              <h4 className="font-medium text-blue-300 mb-3 flex items-center">
                <span className="mr-2">📋</span>
                Overall Strategy
              </h4>
              <div className="space-y-2">
                {Array.isArray(analysis["Improvement Recommendations"]["Overall Strategy"])
                  ? analysis["Improvement Recommendations"]["Overall Strategy"].map((rec, index) => (
                      <div key={index} className="text-sm text-gray-300">• {rec}</div>
                    ))
                  : analysis["Improvement Recommendations"]["Overall Strategy"].split(". ").map((rec, index) => (
                      <div key={index} className="text-sm text-gray-300">• {rec}</div>
                    ))
                }
              </div>
            </div>
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
      
      const { text: resumeText } = await extractResponse.json();
      
      // Step 2: Send to OpenAI for analysis
      const analysisResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resumeText,
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
    return <ResultsDashboard analysis={analysisResult} onBack={() => setAnalysisResult(null)} />;
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
