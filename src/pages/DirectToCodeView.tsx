import React, { useState, useEffect } from 'react';
import { DirectToCodeDiff, DiffChunk } from '../components/DirectToCodeDiff';
import { Sparkles, Terminal, Code, ShieldCheck, Activity } from 'lucide-react';

const mockDiffs: DiffChunk[] = [
  { type: 'unchanged', lineNumber: 42, content: 'export const SovereignAuth = () => {' },
  { type: 'unchanged', lineNumber: 43, content: '  const [isAuthenticated, setIsAuthenticated] = useState(false);' },
  { type: 'removed', content: '  const userSession = mockSession;' },
  { type: 'added', content: '  const { userSession, oidcToken } = useSovereignContext();' },
  { type: 'added', content: '  ' },
  { type: 'added', content: '  useEffect(() => {' },
  { type: 'added', content: '    if (oidcToken) validateToken(oidcToken);' },
  { type: 'added', content: '  }, [oidcToken]);' },
  { type: 'unchanged', lineNumber: 45, content: '  return (' },
  { type: 'unchanged', lineNumber: 46, content: '    <div className="auth-wrapper">' },
];

export const DirectToCodeView = () => {
  const [synced, setSynced] = useState(false);
  const [gateStatus, setGateStatus] = useState<'IDLE' | 'VALIDATING' | 'CLEARED'>('IDLE');

  const handleApply = () => {
    setSynced(true);
    setGateStatus('VALIDATING');
    // Simulate Phase Gate Conductor validation via execution tensor
    setTimeout(() => {
      setGateStatus('CLEARED');
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-[#05070A] p-8 text-gray-200 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400 flex items-center gap-3">
              <Sparkles className="text-blue-400" />
              Sovereign Component Sync
            </h1>
            <p className="text-gray-500 mt-2">Phase Gate Conductor & Direct-to-Code Merge Protocol</p>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-900/50 rounded-xl border border-gray-800 text-sm">
              <Activity size={16} className={gateStatus === 'VALIDATING' ? 'text-yellow-400 animate-spin' : 'text-green-400'} />
              <span>Conductor: {gateStatus}</span>
            </div>
          </div>
        </div>

        {/* Dynamic Canvas Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Context/Prompt Panel */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-gray-900/50 rounded-2xl border border-gray-800 p-6 backdrop-blur-sm shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-indigo-500/20 rounded-lg">
                  <Code size={18} className="text-indigo-400" />
                </div>
                <h3 className="font-semibold text-gray-200">Execution Tensor</h3>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed mb-6">
                Detected usage of mocked sessions in <code className="text-pink-400 bg-pink-400/10 px-1 rounded">SovereignAuth.tsx</code>. 
                I've generated a Direct-to-Code sync to inject the OIDC Token validator. 
                <br/><br/>
                Applying this diff will autonomously dispatch <strong>Gate 1.5 (TDD Verification)</strong> to ensure DoD compliance.
              </p>
              
              <div className="space-y-3">
                <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Phase Gates</span>
                <div className="bg-black/50 border border-gray-800 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">Gate 0: Context Budget</span>
                    <span className="text-green-400">CLEARED</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">Gate 1.5: TDD</span>
                    <span className={gateStatus === 'VALIDATING' ? 'text-yellow-400' : gateStatus === 'CLEARED' ? 'text-green-400' : 'text-gray-600'}>
                      {gateStatus === 'IDLE' ? 'PENDING' : gateStatus}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Diff View Component */}
          <div className="lg:col-span-2">
            <div className={`transition-all duration-500 ${synced ? 'opacity-50 blur-[2px] pointer-events-none' : ''}`}>
              <DirectToCodeDiff
                fileName="src/components/SovereignAuth.tsx"
                diffs={mockDiffs}
                onApply={handleApply}
                onReject={() => console.log('Rejected')}
              />
            </div>
            
            {synced && (
              <div className="mt-6 p-6 bg-gradient-to-r from-gray-900 to-black border border-indigo-500/20 rounded-2xl text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-3">
                  <ShieldCheck size={24} />
                </div>
                <h3 className="text-lg font-semibold text-indigo-400 mb-1">Code Synced & Enforced</h3>
                <p className="text-sm text-gray-400 mb-4">The artifact has been committed and validated by the Phase Gate Conductor.</p>
                
                {gateStatus === 'CLEARED' && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-400 text-xs rounded-full">
                    <Sparkles size={12} />
                    Gate 1.5 Cleared Successfully
                  </div>
                )}
                {gateStatus === 'VALIDATING' && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs rounded-full">
                    <Activity size={12} className="animate-spin" />
                    Validating Artifact Checksums...
                  </div>
                )}
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
};
