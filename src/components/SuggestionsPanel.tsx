"use client";
import React, { useState } from "react";
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

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round((Math.max(0, Math.min(1, value)) || 0) * 100);
  const color = pct >= 80 ? "bg-green-500" : pct >= 60 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="w-24 h-2 bg-gray-700 rounded">
        <div className={`${color} h-2 rounded`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-gray-300">{pct}%</span>
    </div>
  );
}

export const SuggestionsPanel: React.FC<Props> = ({ suggestions, onApply }) => {
  const [variantChoice, setVariantChoice] = useState<Record<number, "conservative" | "balanced" | "keywordHeavy">>({});

  const getSelectedText = (s: BulletSuggestion) => {
    const choice = variantChoice[s.index] || "balanced";
    return s.variants[choice] || s.improved;
  };

  const safeApplyAll = () => {
    suggestions.forEach(s => {
      const text = getSelectedText(s);
      const isSafe = (!s.riskFlags || s.riskFlags.length === 0) && (s.confidence ?? 0) >= 0.8;
      if (isSafe) onApply(s.index, text);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Resume Bullet Rewriter</h3>
        <button
          onClick={safeApplyAll}
          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded disabled:opacity-50"
          disabled={suggestions.every(s => (s.riskFlags && s.riskFlags.length > 0) || (s.confidence ?? 0) < 0.8)}
        >
          Apply safe best
        </button>
      </div>

      {suggestions.map((s) => {
        const selectedText = getSelectedText(s);
        const canApply = (!s.riskFlags || s.riskFlags.length === 0) && (s.confidence ?? 0) >= 0.6;
        return (
          <div key={s.index} className="bg-gray-800/40 border border-gray-700 rounded-lg p-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gray-900/40 border border-gray-700 rounded p-3">
                <div className="text-red-400 text-sm font-medium mb-2">Original</div>
                <pre className="whitespace-pre-wrap text-xs font-mono text-gray-200">{s.original}</pre>
              </div>
              <div className="bg-gray-900/40 border border-gray-700 rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-green-400 text-sm font-medium">Improved</div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-300">Variant:</label>
                    <select
                      className="bg-gray-800 text-gray-100 text-xs rounded px-2 py-1 border border-gray-700"
                      value={variantChoice[s.index] || "balanced"}
                      onChange={(e) => setVariantChoice(prev => ({ ...prev, [s.index]: e.target.value as any }))}
                    >
                      <option value="conservative">Conservative</option>
                      <option value="balanced">Balanced</option>
                      <option value="keywordHeavy">Keyword-heavy</option>
                    </select>
                  </div>
                </div>
                <p className="text-xs font-medium text-gray-100">{diffAddedTokens(s.original, selectedText)}</p>
              </div>
            </div>

            {/* Chips */}
            <div className="flex flex-wrap gap-2 mt-3">
              {s.slots?.actionVerb && (
                <span className="bg-purple-600/20 text-purple-300 px-2 py-0.5 rounded text-xs">{s.slots.actionVerb}</span>
              )}
              {s.slots?.tools?.map((t, i) => (
                <span key={i} className="bg-teal-600/20 text-teal-300 px-2 py-0.5 rounded text-xs">{t}</span>
              ))}
              {s.slots?.jdKeywordsMapped?.map((kw, i) => (
                <span key={i} className="bg-blue-600/20 text-blue-300 px-2 py-0.5 rounded text-xs">{kw}</span>
              ))}
            </div>

            <div className="mt-2 text-xs text-gray-300">
              Coverage: {(s.coverageBefore * 100).toFixed(0)}% → {(s.coverageAfter * 100).toFixed(0)}%
            </div>

            <div className="mt-2 flex items-center justify-between">
              <div className="text-sm text-gray-300">Why: {s.explanation}</div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">Confidence</span>
                <ConfidenceBar value={s.confidence ?? 0} />
              </div>
            </div>

            {/* Risk & Apply */}
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
                onClick={() => onApply(s.index, selectedText)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded disabled:opacity-50"
                disabled={!canApply}
                title={!canApply ? "Applying disabled: confidence < 0.6 or has risks" : undefined}
              >
                Apply
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};


