import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const TLDs = [
  { domain: 'interface.rooz.live', status: 'active', desc: 'Primary Production Dashboard' },
  { domain: 'staging.interface.rooz.live', status: 'active', desc: 'Staging Environment' },
  { domain: 'dev.interface.rooz.live', status: 'warning', desc: 'Development Environment' },
  { domain: 'pur.tag.vote', status: 'active', desc: 'Purpose Gateway' },
  { domain: 'hab.yo.life', status: 'error', desc: 'Evidence Tracker' },
  { domain: 'file.720.chat', status: 'active', desc: 'Process Processor' }
];

const TLDDashboard = () => {
  const [activeTab, setActiveTab] = useState(TLDs[0].domain);
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-indigo-500/30 overflow-hidden flex">
      {/* Background Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-600/20 blur-[120px] pointer-events-none" />

      {/* Vertical Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="relative z-10 hidden md:flex flex-col bg-white/5 backdrop-blur-xl border-r border-white/10 p-6"
          >
            <div className="flex items-center gap-3 mb-10">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <span className="font-bold text-white tracking-widest text-sm">TAG</span>
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
                Sync Prep Matrix
              </h1>
            </div>

            <h2 className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-4 px-2">
              TLD Topologies
            </h2>

            <div className="flex flex-col gap-2">
              {TLDs.map((tld) => (
                <button
                  key={tld.domain}
                  onClick={() => setActiveTab(tld.domain)}
                  className={`
                    group text-left px-4 py-3 rounded-xl transition-all duration-300
                    flex items-center gap-3 relative overflow-hidden
                    ${activeTab === tld.domain ? 'bg-white/10 text-white shadow-sm' : 'hover:bg-white/5 text-slate-400 hover:text-slate-200'}
                  `}
                >
                  {activeTab === tld.domain && (
                    <motion.div layoutId="active-pill" className="absolute left-0 w-1 h-full bg-indigo-500 rounded-r-full" />
                  )}
                  <div className={`
                    w-2 h-2 rounded-full shadow-lg
                    ${tld.status === 'active' ? 'bg-emerald-400 shadow-emerald-400/50' : 
                      tld.status === 'warning' ? 'bg-amber-400 shadow-amber-400/50' : 'bg-rose-400 shadow-rose-400/50'}
                  `} />
                  <span className="truncate font-medium text-sm">{tld.domain}</span>
                </button>
              ))}
            </div>

            <div className="mt-auto pt-6 border-t border-white/10">
              <div className="flex items-center gap-3 px-2">
                <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 overflow-hidden">
                  <div className="w-full h-full bg-gradient-to-tr from-cyan-900 to-indigo-900 flex items-center justify-center">
                    <span className="text-xs font-bold text-cyan-200">PI</span>
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-200">PI Sync Coordinator</span>
                  <span className="text-xs text-emerald-400 font-medium tracking-wide">● System Online</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative z-10 w-full">
        {/* Horizontal Nav */}
        <header className="h-20 border-b border-white/10 bg-white/5 backdrop-blur-md px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5 text-slate-400 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <h2 className="text-lg font-medium text-slate-300 hidden sm:block">
              <span className="text-slate-500">Node / </span>
              <span className="text-white">{activeTab}</span>
            </h2>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-2 bg-black/20 rounded-full px-4 py-1.5 border border-white/5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-emerald-100 tracking-wide">CSQBM ENABLED</span>
            </div>
            <button className="px-5 py-2 font-medium text-sm bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg shadow-lg shadow-indigo-500/25 transition-all active:scale-95 border border-indigo-400">
              Execute Matrix Pass
            </button>
          </div>
        </header>

        {/* Dynamic Content Surface */}
        <main className="flex-1 p-8 overflow-y-auto">
          <motion.div 
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="max-w-6xl mx-auto flex flex-col gap-8"
          >
            {/* Header Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: 'Active Micro-Frontends', value: '14', trend: '+2 this cycle', color: 'text-cyan-400' },
                { label: 'Token Burn Rate', value: '1,204\u00A0tk/s', trend: '-12% optimal', color: 'text-emerald-400' },
                { label: 'DGM Re-Render Syncs', value: '99.8%', trend: 'Stable baseline', color: 'text-indigo-400' }
              ].map((stat, i) => (
                <div key={i} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors group">
                  <h3 className="text-slate-400 text-sm font-medium mb-2">{stat.label}</h3>
                  <div className="flex items-end gap-3">
                    <span className="text-3xl font-bold text-white tracking-tight">{stat.value}</span>
                  </div>
                  <div className={`mt-3 text-xs font-medium ${stat.color}`}>{stat.trend}</div>
                </div>
              ))}
            </div>

            {/* Central Panel */}
            <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-3xl p-1 overflow-hidden">
              <div className="bg-white/5 rounded-[22px] p-8 min-h-[400px] flex flex-col">
                <div className="flex justify-between items-center mb-8 pb-6 border-b border-white/5">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2 tracking-wide">Decompiled Node Architecture</h3>
                    <p className="text-sm text-slate-400 max-w-xl">
                      Visualizing the ruvector extracted structural dependencies of {activeTab}.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors">
                      JSON
                    </button>
                    <button className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Graph
                    </button>
                  </div>
                </div>

                <div className="flex-1 flex items-center justify-center relative">
                  {/* Mock Visual Node Graph representation */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-40">
                    <svg className="w-full h-full max-w-lg" viewBox="0 0 400 300" fill="none" stroke="currentColor" strokeWidth="1">
                      <circle cx="200" cy="150" r="100" strokeDasharray="4 4" className="text-indigo-500/50" />
                      <circle cx="200" cy="150" r="60" strokeDasharray="4 4" className="text-cyan-500/50" />
                      <path d="M 200 50 L 200 150 M 200 250 L 200 150 M 100 150 L 300 150" className="text-emerald-500/30" />
                    </svg>
                  </div>

                  <div className="z-10 grid grid-cols-2 gap-x-24 gap-y-12">
                    {['Auth Module', 'Data Sync', 'WebSocket', 'Render Core'].map((mod, j) => (
                      <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.1 * j }}
                        key={j} 
                        className="bg-slate-900/80 backdrop-blur-xl border border-white/10 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 hover:border-indigo-500/50 transition-colors cursor-pointer group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors border border-white/5 group-hover:border-indigo-500/30">
                          <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                        </div>
                        <div>
                          <p className="font-semibold text-white tracking-wide text-sm">{mod}</p>
                          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">Decompiled</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default TLDDashboard;
