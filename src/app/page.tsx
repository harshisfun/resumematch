/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
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
function ResultsDashboard({ analysis, onBack }: { analysis: any; onBack: () => void }) {
  const [isExporting, setIsExporting] = useState(false);
  
  // Extract match score - try different possible field names
  let matchScore = 75; // Default fallback
  if (analysis) {
    // Try various possible field names for the score
    const scoreFields = ["Match Score", "matchScore", "score", "overall_score", "compatibility_score"];
    for (const field of scoreFields) {
      if (analysis[field] && !isNaN(Number(analysis[field]))) {
        matchScore = Number(analysis[field]);
        break;
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

        {/* Analysis Sections - Display all available data */}
        {analysis && Object.keys(analysis).length > 0 && (
          <div className="space-y-8">
            {Object.entries(analysis).map(([key, value]) => {
              // Skip certain fields that are better displayed elsewhere
              if (key === "timestamp" || key === "rateLimit") return null;
              
              return (
                <div key={key} className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-xl font-semibold mb-4 text-blue-400">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </h3>
                  
                  <div className="text-gray-300">
                    {typeof value === 'string' ? (
                      <p className="whitespace-pre-wrap">{value}</p>
                    ) : typeof value === 'number' ? (
                      <p className="text-2xl font-bold">{value}</p>
                    ) : typeof value === 'object' && value !== null ? (
                      <pre className="text-sm bg-gray-900 p-4 rounded overflow-auto max-h-96">
                        {JSON.stringify(value, null, 2)}
                      </pre>
                    ) : (
                      <p>{String(value)}</p>
                    )}
                  </div>
                </div>
              );
            })}
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
