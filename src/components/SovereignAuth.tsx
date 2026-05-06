import React from 'react';

export const SovereignAuth = () => {
  const login = (role: string, view: string) => {
    localStorage.setItem('sovereign_operator_role', role);
    localStorage.setItem('sovereign_active_view', view);
    window.location.reload();
  };

  return (
    <div className="flex items-center justify-center h-full w-full">
      <div className="bg-black/50 border border-white/10 p-8 rounded-3xl max-w-md w-full">
        <h2 className="text-2xl font-bold text-white tracking-wide mb-6">Sovereign Gate: Ingress Required</h2>
        
        <div className="space-y-4">
          <button 
            onClick={() => login('cfo', 'fintech')}
            className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl transition-all font-semibold"
          >
            Chief Financial Officer
          </button>

          <button 
            onClick={() => login('lawyer', 'legtech')}
            className="w-full bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 p-4 rounded-xl transition-all font-semibold"
          >
            General Counsel
          </button>

          <button 
            onClick={() => login('auditor', 'deftech')}
            className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 p-4 rounded-xl transition-all font-semibold"
          >
            System Auditor
          </button>

          <button 
            onClick={() => login('vip', 'vibecast')}
            className="w-full bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-400 p-4 rounded-xl transition-all font-semibold mt-4"
          >
            VIP Ingress (Vibecast)
          </button>
        </div>
      </div>
    </div>
  );
};
