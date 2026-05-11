import React, { useEffect } from 'react';

export const MeshNavigation = () => {
  // Bind Whop Affiliate state traversal physically
  const handleCrossDomainTraversal = (viewMode: string) => {
    localStorage.setItem('sovereign_active_view', viewMode);
    
    // Cross-Domain Affiliates: Capture physical state
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    
    // Explicitly preserve the affiliate attribute if it exists across the mesh
    if (ref) {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('ref', ref);
      window.history.replaceState({}, '', newUrl.toString());
    }
    
    // Attempt Whop SDK tracking injection if canonical object is available
    if (typeof window !== 'undefined' && (window as any).Whop) {
      (window as any).Whop.track('mesh_navigation_traversal', { view: viewMode, ref });
    }

    // Execute physical reload to transition states
    window.location.reload();
  };

  return (
    <aside className="bg-mesh-800 w-72 h-full border-r border-white/10 flex flex-col p-4">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white tracking-wide">Sovereign Swarm</h2>
        <p className="text-xs text-gray-400">Agentic Flow Control</p>
      </div>
      
      <nav className="flex-1 space-y-2">
        <button 
          onClick={() => handleCrossDomainTraversal('legtech')}
          className="w-full text-left px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 transition-all border border-transparent hover:border-emerald-500/30"
        >
          <div className="text-sm font-semibold text-emerald-400">LegTech / Forensic Sovereignty</div>
        </button>

        <button 
          onClick={() => handleCrossDomainTraversal('fintech')}
          className="w-full text-left px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 transition-all border border-transparent hover:border-indigo-500/30"
        >
          <div className="text-sm font-semibold text-indigo-400">FinTech / Scale Algorithmic</div>
        </button>

        <button 
          onClick={() => handleCrossDomainTraversal('deftech')}
          className="w-full text-left px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 transition-all border border-transparent hover:border-red-500/30"
        >
          <div className="text-sm font-semibold text-red-400">DefTech / Adversarial Shield</div>
        </button>
      </nav>
      
      {/* Test stub for click assertion if needed */}
      <div className="text-[10px] text-gray-500 mt-auto opacity-10">Phase Gate Conductor: FINTECH</div>
    </aside>
  );
};
