"use client";
import React from "react";
import { BulletSuggestion } from "@/types/BulletSuggestion";

type Props = { suggestions: BulletSuggestion[]; onApply: (index: number, improved: string) => void };

function diffAddedTokens(original: string, improved: string): React.ReactNode[] {
  const o = original.split(/\s+/);
  const i = improved.split(/\s+/);
  const added = new Set<string>();
  const oSet = new Set(o);
  for (const tok of i) {
    if (!oSet.has(tok)) added.add(tok);
  }
  return i.map((tok, idx) =>
    added.has(tok) ? <mark key={idx} className="bg-yellow-600/40 px-0.5 rounded-sm">{tok} </mark> : <span key={idx}>{tok} </span>
  );
}

export const SuggestionsPanel: React.FC<Props> = ({ suggestions, onApply }) => {
  const safeApplyAll = () => {
    suggestions.forEach(s => {
      if (!s.riskFlags || s.riskFlags.length === 0) onApply(s.index, s.improved);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Resume Bullet Rewriter</h3>
        <button
          onClick={safeApplyAll}
          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded disabled:opacity-50"
          disabled={suggestions.every(s => s.riskFlags && s.riskFlags.length > 0)}
        >
          Apply all safe
        </button>
      </div>

      {suggestions.map((s) => (
        <div key={s.index} className="bg-gray-800/40 border border-gray-700 rounded-lg p-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-gray-900/40 border border-gray-700 rounded p-3">
              <div className="text-red-400 text-sm font-medium mb-2">Original</div>
              <pre className="whitespace-pre-wrap text-xs font-mono text-gray-200">{s.original}</pre>
            </div>
            <div className="bg-gray-900/40 border border-gray-700 rounded p-3">
              <div className="text-green-400 text-sm font-medium mb-2">Improved</div>
              <p className="text-xs font-medium text-gray-100">{diffAddedTokens(s.original, s.improved)}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            {s.jdKeywordsUsed.map((kw, i) => (
              <span key={i} className="bg-blue-600/20 text-blue-300 px-2 py-0.5 rounded text-xs">{kw}</span>
            ))}
          </div>

          <div className="mt-2 text-xs text-gray-300">
            Coverage: {(s.coverageBefore * 100).toFixed(0)}% → {(s.coverageAfter * 100).toFixed(0)}%
          </div>

          <div className="mt-2 text-sm text-gray-300">
            Why: {s.explanation}
          </div>

          <div className="mt-3 flex items-center justify-between">
            {s.riskFlags && s.riskFlags.length > 0 ? (
              <div className="flex items-center text-red-400 text-xs">
                <span className="mr-2">🛡️</span>
                <span>Risk: {s.riskFlags.join(", ")}</span>
              </div>
            ) : (
              <div className="text-green-400 text-xs">No risk flags</div>
            )}

            <button
              onClick={() => onApply(s.index, s.improved)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded disabled:opacity-50"
              disabled={s.riskFlags && s.riskFlags.length > 0}
            >
              Apply
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};


