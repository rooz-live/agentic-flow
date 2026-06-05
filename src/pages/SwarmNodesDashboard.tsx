// src/components/SwarmNodesDashboard.tsx
import { useState, useEffect } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { PageTransition } from '../App';
import { Cpu, Bot, CheckCircle2, RotateCcw, AlertTriangle } from 'lucide-react';


type SwarmNodeStatus = 'PASS' | 'RUNNING' | 'BLOCKED' | 'SYNCING';
interface SwarmNode { 
  id: string; 
  label: string; 
  phase: string; 
  status: SwarmNodeStatus; 
  latencyMs: number; 
  bml: string; 
  vector: string; 
}

const PHASES = ['M', 'A', 'P', 'R', 'E', 'B', 'K'];
const LABELS = ['MonitorAgent', 'AnalyzeAgent', 'PlanAgent', 'RefinerAgent', 'ExecuteAgent', 'BmlAgent', 'KnowledgeAgent'];

export function SwarmNodesDashboard() {
  const [scenario, setScenario] = useState<'baseline'|'adverse'|'severe'|'critical'>('baseline');
  const [nodes, setNodes] = useState<SwarmNode[]>([]);
  const [cycleMs, setCycleMs] = useState(0);

  // Initialize the baseline nodes
  useEffect(() => {
    // @ts-ignore
    if (import.meta.hot) {
      // @ts-ignore
      import.meta.hot.on('telemetry:stream', (data: any) => {
        let size = 12; // default
        if (data.metrics?.active_agents) {
          size = data.metrics.active_agents;
        }
        
        let initialNodes: SwarmNode[] = [];
        for (let i = 0; i < size; i++) {
          initialNodes.push({
            id: `0x${(i + 1).toString(16)}`,
            label: LABELS[i % LABELS.length],
            phase: PHASES[i % PHASES.length],
            status: 'PASS',
            latencyMs: 15 + Math.floor(Math.random() * 50),
            bml: 'UNLEASH',
            vector: i % 2 === 0 ? 'code' : 'clt'
          });
        }
        setNodes(initialNodes);
      });
    }

    return () => {
      // @ts-ignore
      if (import.meta.hot) {
        // @ts-ignore
        import.meta.hot.off('telemetry:stream');
      }
    };
  }, []);

  // Hallucination engine
  useEffect(() => {
    if (nodes.length === 0) return;

    const tick = setInterval(() => {
      setNodes(currentNodes => {
        return currentNodes.map(node => {
          // 4% chance to die entirely
          if (node.status === 'PASS' && Math.random() < 0.04) {
            return { ...node, status: 'BLOCKED', latencyMs: 0, bml: '—' };
          }
          // Self-heal a dead node
          if (node.status === 'BLOCKED' && Math.random() < 0.3) {
            return {
              ...node,
              id: `0x${Math.floor(Math.random() * 1000).toString(16)}`, // New identity spawned
              status: 'SYNCING',
              latencyMs: 50 + Math.floor(Math.random() * 50),
            };
          }
          // Sync goes to run
          if (node.status === 'SYNCING' && Math.random() < 0.5) {
            return { ...node, status: 'RUNNING', bml: 'REHEARSE' };
          }
          // Run goes to pass
          if (node.status === 'RUNNING' && Math.random() < 0.6) {
            return { ...node, status: 'PASS', bml: 'UNLEASH', latencyMs: 20 + Math.floor(Math.random() * 30) };
          }
          return node;
        });
      });
    }, 1500);

    return () => clearInterval(tick);
  }, [nodes.length]);

  useEffect(() => {
    setCycleMs(nodes.reduce((s, n) => s + n.latencyMs, 0));
  }, [nodes]);

  const scenarioColors: Record<string, string> = {
    baseline: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5',
    adverse:  'border-amber-500/30 text-amber-400 bg-amber-500/5',
    severe:   'border-orange-500/30 text-orange-400 bg-orange-500/5',
    critical: 'border-red-500/30 text-red-400 bg-red-500/5',
  };

  const NODE_STATUS_COLORS: Record<SwarmNodeStatus, string> = {
    PASS:    'text-emerald-400 border-emerald-500/20 bg-emerald-500/5',
    RUNNING: 'text-indigo-200 border-indigo-500/20 bg-indigo-500/5 shadow-[0_0_15px_rgba(99,102,241,0.1)]',
    BLOCKED: 'text-zinc-500 border-red-500/50 bg-red-500/5 grayscale opacity-50',
    SYNCING: 'text-amber-400 border-amber-500/30 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.2)]',
  };

  return (
    <PageTransition title="Dynamic LBEC Swarm Topology">
      <div className="p-6 space-y-5 relative max-w-5xl">
        {/* Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">Scenario Stress Test:</span>
          {(['baseline','adverse','severe','critical'] as const).map(s => (
            <button key={s} onClick={() => setScenario(s)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border transition-all ${
                scenario === s ? scenarioColors[s] : 'border-white/5 text-slate-600 hover:text-slate-300'
              }`}>{s}</button>
          ))}
          <div className="ml-auto flex items-center gap-3">
            <span className="text-[10px] text-slate-600 font-mono">Total Overhead {cycleMs}ms</span>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
              <Cpu className="w-3 h-3 text-indigo-200 animate-pulse" />
              <span className="text-[10px] text-indigo-300">{nodes.length} edges active</span>
            </div>
          </div>
        </div>

        {/* Nodes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {nodes.map(n => (
              <motion.div 
                key={n.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.3 }}
                className={`relative flex flex-col p-4 border rounded-2xl transition-all duration-500 ${NODE_STATUS_COLORS[n.status]}`}
              >
                <div className="flex items-center justify-between mb-3">
                   <div className="flex items-center gap-2">
                     <div className="w-6 h-6 rounded-md bg-black/40 border border-white/10 flex items-center justify-center">
                        <span className="text-[9px] font-black text-slate-300">{n.phase}</span>
                     </div>
                     <span className="text-xs font-bold text-slate-200">{n.label}</span>
                   </div>
                   <div className="text-[9px] font-mono border border-white/10 px-1.5 py-0.5 rounded bg-black/50">
                     {n.id}
                   </div>
                </div>

                <div className="flex items-center gap-2 mb-2">
                   <Bot className="w-3 h-3 text-slate-500" />
                   <span className="text-[10px] uppercase font-bold text-sky-300">{n.status}</span>
                   {n.latencyMs > 0 && <span className="ml-auto text-[9px] font-mono">{n.latencyMs}ms</span>}
                </div>

                <div className="mt-auto pt-3 border-t border-white/5 flex gap-2 justify-between">
                   <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${
                      n.vector === 'code' ? 'border-sky-500/20 text-sky-400 bg-sky-500/5'
                      : n.vector === 'clt' ? 'border-amber-500/20 text-amber-400 bg-amber-500/5'
                      : 'border-violet-500/20 text-violet-400 bg-violet-500/5'
                    }`}>{n.vector}</span>
                   <span className={`text-[9px] font-bold ${
                      n.bml === 'UNLEASH' ? 'text-emerald-400' : n.bml === 'REHEARSE' ? 'text-amber-400' : 'text-slate-500'
                   }`}>{n.bml}</span>
                </div>
                
                {n.status === 'BLOCKED' && (
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center">
                    <span className="bg-red-500/80 text-white text-[10px] uppercase font-black tracking-widest px-3 py-1 rounded shadow-xl backdrop-blur-md rotate-[-10deg]">KILLED</span>
                  </div>
                )}
                {n.status === 'SYNCING' && (
                  <div className="absolute top-2 right-2 flex items-center justify-center">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Action Panel */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-xl mt-6">
           <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">Swarm Integrity Status</div>
           <div className="flex items-center gap-4 text-xs font-medium text-slate-300">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Byzantine Fault Tolerance Active
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                <RotateCcw className="w-4 h-4 text-indigo-200 animate-[spin_4s_linear_infinite]" />
                Self-Healing Loop Bound
              </div>
              {nodes.some(n => n.status === 'BLOCKED') && (
                <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 border border-red-500/40 rounded-lg text-red-200 animate-pulse">
                  <AlertTriangle className="w-4 h-4" />
                  Hallucinations Detected
                </div>
              )}
           </div>
        </div>
      </div>
    </PageTransition>
  );
}
