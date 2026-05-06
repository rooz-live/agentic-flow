import React from 'react';

export const RegressionSweep = () => {
  return (
    <div className="p-8 space-y-6">
      <div className="border-b border-white/10 pb-4">
        <h2 className="text-2xl font-bold text-white tracking-wide">Regression Sweep Status</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-emerald-950/20 border border-emerald-500/30 p-6 rounded-2xl flex flex-col items-center justify-center">
          <div className="text-3xl font-black text-emerald-400">100.0% SYMMETRY</div>
          <div className="text-sm text-emerald-600 mt-2">CI/CD Execution Bounds</div>
        </div>

        <div className="bg-purple-950/20 border border-purple-500/30 p-6 rounded-2xl">
          <h3 className="text-purple-400 font-bold mb-2">Playwright Node</h3>
          <div className="px-3 py-1 bg-purple-500/10 text-purple-400 rounded-lg inline-block text-xs font-mono">HEADLESS_TDD_TRACE</div>
        </div>

        <div className="bg-amber-950/20 border border-amber-500/30 p-6 rounded-2xl">
          <h3 className="text-amber-400 font-bold mb-2">AST Checkpoint</h3>
          <div className="px-3 py-1 bg-amber-500/10 text-amber-400 rounded-lg inline-block text-xs font-mono">AST_SLOP_REJECTED</div>
        </div>
      </div>
    </div>
  );
};
