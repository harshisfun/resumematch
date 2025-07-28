"use client";
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface ParserResult {
  parsedResume: Record<string, unknown>;
  atsScore: {
    overall: number;
    profile: number;
    experience: number;
    education: number;
    skills: number;
    formatting: number;
    keywords: number;
  };
  warnings: string[];
  suggestions: string[];
}

export default function Parser() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ParserResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/parser/score', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to parse resume');
      }

      const { data } = await response.json();
      setResult({
        parsedResume: data.parsedJson,
        atsScore: data.atsScore,
        warnings: data.warnings,
        suggestions: data.suggestions
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find(file => file.type === 'application/pdf');
    
    if (pdfFile) {
      handleFileUpload(pdfFile);
    } else {
      setError('Please upload a PDF file');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleSendToGPT4 = async () => {
    if (!result) return;
    
    // FR-P5: Expose "Send to GPT-4 for deeper critique" using existing /api/analyze
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resumeText: JSON.stringify(result.parsedResume),
          jobDescription: '', // Could prompt user for JD
        }),
      });

      if (response.ok) {
        // Analysis completed successfully

        alert('Analysis completed! Navigate to the main page to see results.');
      }
    } catch (err) {

      setError('Failed to analyze with GPT-4');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Resume Parser</h1>
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900"
          >
            ← Back
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-6">
        {!result ? (
          // Upload Section
          <div className="text-center">
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-12 hover:border-gray-400 transition-colors"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Upload your resume for ATS analysis
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Drop a PDF file here or click to browse (max 2MB)
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isProcessing ? 'Processing...' : 'Choose File'}
                  </button>
                </div>
              </div>
            </div>
            
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800">{error}</p>
              </div>
            )}
          </div>
        ) : (
          // Results Section
          <div className="space-y-6">
            {/* ATS Score */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">ATS Readability Score</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ScoreCard label="Overall" score={result.atsScore.overall} />
                <ScoreCard label="Profile" score={result.atsScore.profile} />
                <ScoreCard label="Experience" score={result.atsScore.experience} />
                <ScoreCard label="Education" score={result.atsScore.education} />
                <ScoreCard label="Skills" score={result.atsScore.skills} />
                <ScoreCard label="Formatting" score={result.atsScore.formatting} />
                <ScoreCard label="Keywords" score={result.atsScore.keywords} />
              </div>
            </div>

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Warnings</h3>
                <ul className="list-disc list-inside text-yellow-700 space-y-1">
                  {result.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suggestions */}
            {result.suggestions.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-2">💡 Suggestions</h3>
                <ul className="list-disc list-inside text-blue-700 space-y-1">
                  {result.suggestions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-4">
              <button
                onClick={handleSendToGPT4}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
              >
                🤖 Analyze with GPT-4
              </button>
              <button
                onClick={() => setResult(null)}
                className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
              >
                Parse Another Resume
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreCard({ label, score }: { label: string; score: number }) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className={`p-3 rounded-lg ${getScoreColor(score)}`}>
      <div className="text-2xl font-bold">{score}</div>
      <div className="text-sm font-medium">{label}</div>
    </div>
  );
} 