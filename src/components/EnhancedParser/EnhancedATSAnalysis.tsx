"use client";
import { useState } from 'react';
import { enhancedResumeParser } from '@/lib/openresume/enhancedParser';
import { EnhancedParserResult } from '@/lib/openresume/types';

interface EnhancedATSAnalysisProps {
  originalAnalysis: Record<string, unknown>;
  resumeFile?: File;
}

export const EnhancedATSAnalysis = ({ originalAnalysis, resumeFile }: EnhancedATSAnalysisProps) => {
  const [enhancedResult, setEnhancedResult] = useState<EnhancedParserResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runEnhancedAnalysis = async () => {
    if (!resumeFile) {
      setError('No resume file available for enhanced analysis');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await enhancedResumeParser.parseResumeFile(resumeFile, originalAnalysis);
      setEnhancedResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run enhanced analysis');
    } finally {
      setIsLoading(false);
    }
  };

  if (!enhancedResult) {
    return (
      <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-700 rounded-lg p-6">
        <h3 className="text-2xl font-semibold mb-6 text-purple-400 flex items-center">
          <span className="mr-3">🔍</span>
          Enhanced ATS Analysis
          <span className="ml-2 text-sm bg-purple-600/20 text-purple-300 px-2 py-1 rounded-full">
            Powered by OpenResume
          </span>
        </h3>
        
        <div className="text-center">
          <p className="text-gray-300 mb-4">
                         Get advanced resume parsing and ATS optimization insights powered by OpenResume&apos;s algorithm.
          </p>
          
          <button
            onClick={runEnhancedAnalysis}
            disabled={isLoading || !resumeFile}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Analyzing...</span>
              </div>
            ) : (
              '🚀 Run Enhanced Analysis'
            )}
          </button>
          
          {error && (
            <div className="mt-4 p-3 bg-red-900/20 border border-red-700 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          
          {!resumeFile && (
            <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-700 rounded-lg">
              <p className="text-yellow-400 text-sm">Resume file not available for enhanced analysis</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced ATS Score Comparison */}
      <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-700 rounded-lg p-6">
        <h3 className="text-2xl font-semibold mb-6 text-purple-400 flex items-center">
          <span className="mr-3">🔍</span>
          Enhanced ATS Analysis
          <span className="ml-2 text-sm bg-purple-600/20 text-purple-300 px-2 py-1 rounded-full">
            OpenResume Enhanced
          </span>
        </h3>
        
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <ScoreCard
            title="Overall ATS Score"
            score={enhancedResult.enhancedScore.overall}
            subtitle="Combined analysis"
          />
          <ScoreCard
            title="OpenResume Score"
            score={enhancedResult.enhancedScore.openResumeScore}
            subtitle="Pure OpenResume algorithm"
          />
        </div>
        
        <div className="grid md:grid-cols-3 gap-4">
          <ScoreCard title="Profile" score={enhancedResult.enhancedScore.profile} />
          <ScoreCard title="Experience" score={enhancedResult.enhancedScore.experience} />
          <ScoreCard title="Education" score={enhancedResult.enhancedScore.education} />
          <ScoreCard title="Skills" score={enhancedResult.enhancedScore.skills} />
          <ScoreCard title="Formatting" score={enhancedResult.enhancedScore.formatting} />
          <ScoreCard title="Keywords" score={enhancedResult.enhancedScore.keywords} />
        </div>
      </div>

      {/* Structured Resume Data */}
      <div className="bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border border-blue-700 rounded-lg p-6">
        <h4 className="text-xl font-semibold mb-4 text-blue-400">📋 Parsed Resume Structure</h4>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h5 className="text-blue-300 font-medium mb-3">👤 Profile Information</h5>
            <div className="bg-gray-800/30 rounded-lg p-4 space-y-2">
              <ProfileField label="Name" value={enhancedResult.openResumeData.profile.name} />
              <ProfileField label="Email" value={enhancedResult.openResumeData.profile.email} />
              <ProfileField label="Phone" value={enhancedResult.openResumeData.profile.phone} />
              <ProfileField label="URL" value={enhancedResult.openResumeData.profile.url} />
            </div>
          </div>
          
          <div>
            <h5 className="text-blue-300 font-medium mb-3">💼 Experience & Skills</h5>
            <div className="bg-gray-800/30 rounded-lg p-4 space-y-2">
              <ProfileField 
                label="Work Experiences" 
                value={`${enhancedResult.openResumeData.workExperiences.length} positions found`} 
              />
              <ProfileField 
                label="Education" 
                value={`${enhancedResult.openResumeData.educations.length} entries found`} 
              />
              <ProfileField 
                label="Skills" 
                value={`${enhancedResult.openResumeData.skills.featuredSkills.length} skills identified`} 
              />
              <ProfileField 
                label="Projects" 
                value={`${enhancedResult.openResumeData.projects.length} projects found`} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Improvements and Suggestions */}
      <div className="grid md:grid-cols-3 gap-6">
        {enhancedResult.warnings.length > 0 && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
            <h5 className="text-red-400 font-medium mb-3">⚠️ Critical Issues</h5>
            <ul className="space-y-2">
              {enhancedResult.warnings.map((warning, index) => (
                <li key={index} className="text-red-300 text-sm flex items-start">
                  <span className="mr-2">•</span>
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        )}

        {enhancedResult.improvements.length > 0 && (
          <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
            <h5 className="text-yellow-400 font-medium mb-3">🔧 Recommended Fixes</h5>
            <ul className="space-y-2">
              {enhancedResult.improvements.map((improvement, index) => (
                <li key={index} className="text-yellow-300 text-sm flex items-start">
                  <span className="mr-2">•</span>
                  {improvement}
                </li>
              ))}
            </ul>
          </div>
        )}

        {enhancedResult.suggestions.length > 0 && (
          <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
            <h5 className="text-green-400 font-medium mb-3">💡 Suggestions</h5>
            <ul className="space-y-2">
              {enhancedResult.suggestions.map((suggestion, index) => (
                <li key={index} className="text-green-300 text-sm flex items-start">
                  <span className="mr-2">•</span>
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

const ScoreCard = ({ title, score, subtitle }: { title: string; score: number; subtitle?: string }) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400 bg-green-900/20 border-green-700';
    if (score >= 60) return 'text-yellow-400 bg-yellow-900/20 border-yellow-700';
    return 'text-red-400 bg-red-900/20 border-red-700';
  };

  return (
    <div className={`p-4 rounded-lg border ${getScoreColor(score)}`}>
      <div className="text-center">
        <div className="text-2xl font-bold">{score}</div>
        <div className="text-sm font-medium">{title}</div>
        {subtitle && <div className="text-xs opacity-75 mt-1">{subtitle}</div>}
      </div>
    </div>
  );
};

const ProfileField = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between">
    <span className="text-gray-400 text-sm">{label}:</span>
    <span className="text-gray-300 text-sm">{value || 'Not found'}</span>
  </div>
); 