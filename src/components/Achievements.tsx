"use client";
import { useState } from 'react';

interface AchievementSystemProps {
  // keep unknown to avoid any rule
  analysis: unknown;
}

export const AchievementSystem = ({ analysis }: AchievementSystemProps) => {
  // narrow for safe access
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = (analysis as Record<string, any>) || {};
  const [achievements] = useState([
    { id: 'first_analysis', name: 'First Analysis', description: 'Complete your first resume analysis', earned: true, icon: '🎯' },
    { id: 'high_score', name: 'High Achiever', description: 'Score 80% or higher on any analysis', earned: (a?.["Overall Candidacy Score"] ?? 0) >= 80, icon: '🏆' },
    { id: 'skill_master', name: 'Skill Master', description: 'Achieve 90%+ in skills match', earned: a?.["Score Breakdown"]?.["Technical & Core Skills Match"]?.Score >= 18, icon: '⚡' },
    { id: 'optimizer', name: 'Resume Optimizer', description: 'Complete 5 analyses', earned: false, icon: '🔧' },
    { id: 'market_expert', name: 'Market Expert', description: 'Achieve above-average market position', earned: a?.["Market Competitiveness"]?.["Competitive Level"] === 'Above Average' || a?.["Market Competitiveness"]?.["Competitive Level"] === 'Exceptional', icon: '📈' }
  ]);

  const earnedCount = achievements.filter(a => a.earned).length;

  return (
    <div className="bg-gray-800/30 rounded-lg p-6">
      <h3 className="text-xl font-semibold mb-4 text-purple-400">🏅 Achievements</h3>
      
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-300">Progress</span>
          <span className="text-sm text-purple-400">{earnedCount}/{achievements.length}</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className="bg-purple-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(earnedCount / achievements.length) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {achievements.map((achievement) => (
          <div 
            key={achievement.id} 
            className={`p-3 rounded-lg border ${
              achievement.earned 
                ? 'bg-purple-900/20 border-purple-700' 
                : 'bg-gray-700/50 border-gray-600'
            }`}
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{achievement.icon}</span>
              <div className="flex-1">
                <div className={`font-medium ${achievement.earned ? 'text-purple-300' : 'text-gray-400'}`}>
                  {achievement.name}
                </div>
                <div className="text-xs text-gray-500">{achievement.description}</div>
              </div>
              {achievement.earned && (
                <span className="text-green-400">✓</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 