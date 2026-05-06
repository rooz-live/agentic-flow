import React, { useState } from 'react';
import { Check, X, Code2, Copy, GitMerge, FileCode, CheckCircle2 } from 'lucide-react';

export interface DiffChunk {
  type: 'unchanged' | 'added' | 'removed';
  content: string;
  lineNumber?: number;
}

interface DirectToCodeDiffProps {
  fileName: string;
  originalCode?: string;
  suggestedCode?: string;
  diffs: DiffChunk[];
  onApply: () => void;
  onReject: () => void;
}

export const DirectToCodeDiff: React.FC<DirectToCodeDiffProps> = ({
  fileName,
  diffs,
  onApply,
  onReject,
}) => {
  const [isApplying, setIsApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleApply = async () => {
    setIsApplying(true);
    // Simulate git-style merge operation
    setTimeout(() => {
      setIsApplying(false);
      setApplied(true);
      onApply();
    }, 1200);
  };

  const handleCopy = () => {
    const fullCode = diffs
      .filter((d) => d.type === 'unchanged' || d.type === 'added')
      .map((d) => d.content)
      .join('\n');
    navigator.clipboard.writeText(fullCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full rounded-2xl bg-[#0B0F19] border border-gray-800 shadow-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_rgba(59,130,246,0.1)] font-['Inter']">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900/50 border-b border-gray-800 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
            <FileCode size={18} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-200 tracking-wide">{fileName}</span>
            <span className="text-xs text-gray-500">Direct-to-Code Sync</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            title="Copy final code"
          >
            {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
          </button>
        </div>
      </div>

      {/* Diff Content */}
      <div className="relative font-mono text-[13px] leading-relaxed overflow-x-auto bg-[#0A0D14]">
        <div className="min-w-max p-4">
          {diffs.map((chunk, index) => {
            if (chunk.type === 'unchanged') {
              return (
                <div key={index} className="flex group text-gray-400 hover:bg-white/5 px-2 py-0.5 rounded transition-colors">
                  <span className="w-8 select-none text-gray-600 border-r border-gray-800/50 mr-4 text-right pr-2">
                    {chunk.lineNumber}
                  </span>
                  <span className="whitespace-pre">{chunk.content}</span>
                </div>
              );
            }
            if (chunk.type === 'removed') {
              return (
                <div key={index} className="flex bg-red-500/10 text-red-300 px-2 py-0.5 rounded border border-red-500/10 my-0.5">
                  <span className="w-8 select-none text-red-500/50 border-r border-red-500/20 mr-4 text-right pr-2">
                    -
                  </span>
                  <span className="whitespace-pre">{chunk.content}</span>
                </div>
              );
            }
            if (chunk.type === 'added') {
              return (
                <div key={index} className="flex bg-green-500/10 text-green-300 px-2 py-0.5 rounded border border-green-500/10 my-0.5 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-transparent w-full h-full animate-pulse" />
                  <span className="w-8 select-none text-green-500/50 border-r border-green-500/20 mr-4 text-right pr-2 relative z-10">
                    +
                  </span>
                  <span className="whitespace-pre relative z-10">{chunk.content}</span>
                </div>
              );
            }
            return null;
          })}
        </div>
      </div>

      {/* Footer / Actions */}
      <div className="flex items-center justify-between px-6 py-4 bg-gray-900/50 border-t border-gray-800">
        <div className="flex items-center space-x-2 text-xs text-gray-400">
          <GitMerge size={14} className="text-purple-400" />
          <span>Merge requires workspace write access</span>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={onReject}
            disabled={isApplying || applied}
            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reject
          </button>
          <button
            onClick={handleApply}
            disabled={isApplying || applied}
            className={`
              relative overflow-hidden px-6 py-2 rounded-xl text-sm font-semibold transition-all duration-300
              ${applied 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:-translate-y-0.5'
              }
              disabled:opacity-80 disabled:cursor-not-allowed
            `}
          >
            {isApplying ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Merging...</span>
              </div>
            ) : applied ? (
              <div className="flex items-center space-x-2">
                <CheckCircle2 size={16} />
                <span>Merged</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Code2 size={16} />
                <span>Apply to Workspace</span>
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
