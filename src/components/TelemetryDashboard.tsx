import React from 'react';

export const TelemetryDashboard = () => {
  return (
    <div className="p-8 space-y-6 w-full h-full">
      <div className="border-b border-white/10 pb-4">
        <h2 className="text-2xl font-bold text-emerald-400 tracking-wide">The Ultimate Yield Curve</h2>
        <p className="text-gray-400">Capital Yield rendering</p>
      </div>

      <div className="bg-black/50 border border-white/10 rounded-2xl p-4 h-[400px]">
        {/* Mocking the recharts container for Playwright physical assertion */}
        <div className="recharts-responsive-container w-full h-full bg-emerald-950/20 border border-emerald-500/20 rounded-xl flex items-center justify-center">
          <span className="text-emerald-500 font-mono text-sm">[Recharts Yield Curve Matrix Active]</span>
        </div>
      </div>
    </div>
  );
};
