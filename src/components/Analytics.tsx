"use client";
import { useState } from 'react';

interface AnalyticsDashboardProps {
  analysis: any;
  history: any[];
}

export const AnalyticsDashboard = ({ analysis, history }: AnalyticsDashboardProps) => {
  const [timeRange, setTimeRange] = useState('30d');
  const [metric, setMetric] = useState('overall');

  const getAnalyticsData = () => {
    // Mock data - in real implementation, this would come from database
    return {
      overall: { current: analysis?.["Overall Candidacy Score"] || 0, trend: 5.2 },
      skills: { current: analysis?.["Score Breakdown"]?.["Technical & Core Skills Match"]?.Score || 0, trend: 3.1 },
      experience: { current: analysis?.["Score Breakdown"]?.["Previous Work Quality & Impact"]?.Score || 0, trend: 2.8 },
      education: { current: analysis?.["Score Breakdown"]?.["Education Institution Tier"]?.Score || 0, trend: 1.5 }
    };
  };

  const data = getAnalyticsData();

  return (
    <div className="bg-gray-800/30 rounded-lg p-6">
      <h3 className="text-xl font-semibold mb-4 text-blue-400">📊 Analytics Dashboard</h3>
      
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Time Range</label>
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Metric</label>
          <select 
            value={metric} 
            onChange={(e) => setMetric(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
          >
            <option value="overall">Overall Score</option>
            <option value="skills">Skills Match</option>
            <option value="experience">Experience Quality</option>
            <option value="education">Education Tier</option>
          </select>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="bg-gray-700/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-400">{value.current}</div>
            <div className="text-sm text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
            <div className={`text-xs mt-1 ${value.trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {value.trend > 0 ? '↗' : '↘'} {Math.abs(value.trend)}% from last period
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 