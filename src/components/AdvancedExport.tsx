"use client";
import { useState } from 'react';

interface AdvancedExportProps {
  analysis: unknown;
}

export const AdvancedExport = ({ analysis }: AdvancedExportProps) => {
  const [exportFormat, setExportFormat] = useState('pdf');
  const [includeCharts, setIncludeCharts] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const exportData = async () => {
    setIsExporting(true);
    
    try {
      const exportData = {
        analysis,
        format: exportFormat,
        includeCharts,
        timestamp: new Date().toISOString()
      };

      if (exportFormat === 'pdf') {
        // In real implementation, this would generate a PDF
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `resume-analysis-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else if (exportFormat === 'word') {
        // Generate Word document
        alert('Word export feature coming soon!');
      } else if (exportFormat === 'powerpoint') {
        // Generate PowerPoint
        alert('PowerPoint export feature coming soon!');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-gray-800/30 rounded-lg p-6">
      <h3 className="text-xl font-semibold mb-4 text-green-400">📤 Advanced Export</h3>
      
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Export Format</label>
          <select 
            value={exportFormat} 
            onChange={(e) => setExportFormat(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
          >
            <option value="pdf">PDF Report</option>
            <option value="word">Word Document</option>
            <option value="powerpoint">PowerPoint</option>
            <option value="json">JSON Data</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Options</label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input 
                type="checkbox" 
                checked={includeCharts} 
                onChange={(e) => setIncludeCharts(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-300">Include charts and visualizations</span>
            </label>
          </div>
        </div>
      </div>

      <button
        onClick={exportData}
        disabled={isExporting}
        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white px-4 py-2 rounded-lg transition-colors"
      >
        {isExporting ? 'Exporting...' : `Export as ${exportFormat.toUpperCase()}`}
      </button>
    </div>
  );
}; 