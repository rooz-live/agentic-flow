// src/components/AlphaHarvestingDashboard.tsx
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { PageTransition } from '../App';
import { Zap, ShieldAlert, LineChart, TrendingDown, RefreshCw, Crosshair, DollarSign } from 'lucide-react';


interface ExecutionLog {
  id: number;
  time: string;
  type: 'INFO' | 'SUCCESS' | 'WARN' | 'EXECUTE';
  content: string;
}

export function AlphaHarvestingDashboard() {
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [pool, setPool] = useState(14200.00);
  const [velocity, setVelocity] = useState(0);
  const [washSaleBlocked, setWashSaleBlocked] = useState(0);
  const logEndRef = useRef<HTMLDivElement>(null);
  
  // Terminal log simulator
  useEffect(() => {
    let internalId = 0;
    const addLog = (type: ExecutionLog['type'], content: string) => {
      internalId++;
      const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric", second: "numeric" });
      setLogs(prev => [...prev.slice(-30), { id: internalId, time, type, content }]);
    };

    const scenarios = [
      () => addLog('INFO', 'Scanning Sub-Accounts mapping edge latency arrays...'),
      () => addLog('INFO', 'Evaluating standard deviation vector against ETF baseline...'),
      () => {
         addLog('EXECUTE', 'Isolated -8.4% Delta in SQQQ holding. Initiating liquidation payload.');
         const drop = Number((Math.random() * 400 + 100).toFixed(2));
         setPool(p => p + drop);
         addLog('SUCCESS', `Target Harvest Captured: $${drop.toFixed(2)} offset generated.`);
      },
      () => {
         addLog('WARN', 'Wash-Sale GUARDIAN INTERCEPT: 30-day IRS proximity block active for re-entry.');
         setWashSaleBlocked(b => b + 1);
      },
      () => {
         addLog('EXECUTE', 'Capital matrix redeploying to correlated proxy ETF to bypass wash-sale delay.');
         setVelocity(v => v + 12);
      }
    ];

    addLog('SUCCESS', '// NEURAL HARVEST INITIALIZED: Agentic Autonomous Routine Engaged');

    const tick = setInterval(() => {
       const chance = Math.random();
       if (chance < 0.3) scenarios[0]();
       else if (chance < 0.5) scenarios[1]();
       else if (chance < 0.7) scenarios[2]();
       else if (chance < 0.85) scenarios[3]();
       else scenarios[4]();
    }, 2500);

    return () => clearInterval(tick);
  }, []);

  // Auto-scroll terminal
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <PageTransition title="Alpha Harvesting Visualizer">
      <div className="p-6 space-y-6 max-w-6xl relative">
        {/* Background glow */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-fuchsia-600/10 blur-[150px] pointer-events-none rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-600/10 blur-[120px] pointer-events-none rounded-full" />

        {/* Dashboard Top Row Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#0a0a0a]/80 backdrop-blur-2xl border border-white/[0.08] p-6 rounded-2xl shadow-xl relative overflow-hidden group hover:border-emerald-500/30 transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 blur-[30px] transition-transform group-hover:scale-150" />
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs uppercase tracking-widest font-black text-emerald-400">Total Harvest Pool</span>
              <DollarSign className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-3xl font-black text-white tracking-tight">${pool.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="mt-2 text-[10px] text-zinc-500 font-mono">Unrealized tax-loss offsets mapped</div>
          </div>

          <div className="bg-[#0a0a0a]/80 backdrop-blur-2xl border border-white/[0.08] p-6 rounded-2xl shadow-xl relative overflow-hidden group hover:border-indigo-500/30 transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 blur-[30px] transition-transform group-hover:scale-150" />
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs uppercase tracking-widest font-black text-indigo-400">Redeployment Velocity</span>
              <RefreshCw className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-3xl font-black text-white tracking-tight">{velocity}<span className="text-sm text-zinc-500 ml-1 font-bold">ops</span></div>
            <div className="mt-2 text-[10px] text-zinc-500 font-mono">Synchronized correlated asset pivots</div>
          </div>

          <div className="bg-[#0a0a0a]/80 backdrop-blur-2xl border border-white/[0.08] p-6 rounded-2xl shadow-xl relative overflow-hidden group hover:border-red-500/30 transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 blur-[30px] transition-transform group-hover:scale-150" />
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs uppercase tracking-widest font-black text-red-400">Wash-Sale Blocks</span>
              <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" />
            </div>
            <div className="text-3xl font-black text-white tracking-tight">{washSaleBlocked}<span className="text-sm text-zinc-500 ml-1 font-bold">hits</span></div>
            <div className="mt-2 text-[10px] text-zinc-500 font-mono">IRS 30-day compliance boundary guarded</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Target Matrix */}
          <div className="bg-[#0a0a0a]/80 backdrop-blur-3xl border border-fuchsia-500/20 p-6 rounded-2xl shadow-[0_0_30px_rgba(217,70,239,0.05)] relative flex flex-col h-[400px]">
             <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
                <Crosshair className="w-5 h-5 text-fuchsia-400" />
                <h3 className="text-white font-bold tracking-wider">Sub-Account Anomaly Radar</h3>
             </div>
             
             <div className="flex-1 space-y-4">
                {/* Simulated radar UI elements */}
                <div className="flex justify-between items-center p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                  <div className="flex items-center gap-3">
                     <TrendingDown className="w-4 h-4 text-red-400" />
                     <div>
                       <div className="text-xs font-bold text-white">SQQQ <span className="text-[9px] text-zinc-500 px-1 border border-white/10 rounded ml-1 bg-black">XNAS</span></div>
                       <div className="text-[10px] text-zinc-500">Short QQQ Proxy</div>
                     </div>
                  </div>
                  <div className="text-right">
                     <div className="text-sm font-black text-red-400">-12.4%</div>
                     <div className="text-[9px] text-fuchsia-400 font-bold uppercase tracking-widest">Harvesting</div>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 rounded-lg bg-zinc-900/50 border border-white/5 opacity-60">
                  <div className="flex items-center gap-3">
                     <LineChart className="w-4 h-4 text-zinc-400" />
                     <div>
                       <div className="text-xs font-bold text-white">SPY <span className="text-[9px] text-zinc-600 px-1 border border-white/10 rounded ml-1 bg-black">ARCA</span></div>
                       <div className="text-[10px] text-zinc-600">S&P 500 Sub-hold</div>
                     </div>
                  </div>
                  <div className="text-right">
                     <div className="text-sm font-black text-emerald-500/50">+4.1%</div>
                     <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Holding</div>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 rounded-lg bg-zinc-900/50 border border-white/5 opacity-60">
                  <div className="flex items-center gap-3">
                     <LineChart className="w-4 h-4 text-zinc-400" />
                     <div>
                       <div className="text-xs font-bold text-white">TQQQ <span className="text-[9px] text-zinc-600 px-1 border border-white/10 rounded ml-1 bg-black">XNAS</span></div>
                       <div className="text-[10px] text-zinc-600">Long QQQ Edge</div>
                     </div>
                  </div>
                  <div className="text-right">
                     <div className="text-sm font-black text-emerald-500/50">+18.2%</div>
                     <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Holding</div>
                  </div>
                </div>
             </div>

             <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Radar Mode</span>
                <span className="text-[10px] font-bold text-fuchsia-400 bg-fuchsia-500/10 px-2 py-1 rounded border border-fuchsia-500/30 animate-pulse">AUTONOMOUS ENGAGED</span>
             </div>
          </div>

          {/* Neural Terminal */}
          <div className="lg:col-span-2 bg-[#050505] border border-white/[0.08] p-1 rounded-2xl shadow-2xl relative flex flex-col h-[400px] overflow-hidden">
             {/* Terminal Header */}
             <div className="flex items-center gap-2 px-4 py-3 bg-[#0a0a0a] border-b border-white/5 rounded-t-xl">
                <div className="flex gap-1.5">
                   <div className="w-3 h-3 rounded-full bg-red-500/80" />
                   <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                   <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <div className="mx-auto flex items-center gap-2 opacity-50">
                   <Zap className="w-3 h-3 text-fuchsia-400" />
                   <span className="text-[10px] font-mono tracking-widest text-zinc-400">_SYSTEM/trading/neural-harvest-cli</span>
                </div>
             </div>

             {/* Terminal Body */}
             <div className="flex-1 overflow-y-auto p-4 space-y-1.5 scrollbar-hide font-mono text-[11px] leading-relaxed">
                <AnimatePresence initial={false}>
                  {logs.map((log) => {
                    const colors = {
                      INFO: 'text-sky-400',
                      SUCCESS: 'text-emerald-400',
                      WARN: 'text-amber-400 bg-amber-400/10 border border-amber-500/20 px-2 py-0.5 rounded inline-block',
                      EXECUTE: 'text-fuchsia-400 font-bold bg-fuchsia-500/10 border border-fuchsia-500/30 px-2 py-0.5 rounded shadow-[0_0_10px_rgba(217,70,239,0.2)] inline-block'
                    };
                    return (
                      <motion.div 
                        key={log.id} 
                        initial={{ opacity: 0, x: -10 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        className="flex items-start gap-3"
                      >
                         <span className="text-zinc-600 shrink-0 select-none">[{log.time}]</span>
                         <span className={`shrink-0 w-[60px] font-bold ${log.type === 'INFO' ? 'text-sky-600' : log.type === 'WARN' ? 'text-amber-500' : log.type === 'SUCCESS' ? 'text-emerald-600' : 'text-fuchsia-500'}`}>{log.type}</span>
                         <span className={`${colors[log.type]} font-medium max-w-full break-words`}>{log.content}</span>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                <div ref={logEndRef} />
             </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
