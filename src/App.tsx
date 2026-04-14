// src/App.tsx
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, Cpu, Layers, LineChart, Network, Server, Settings, ShieldAlert, Terminal, Zap } from 'lucide-react';
import { useState } from 'react';
import { Link, Route, BrowserRouter as Router, Routes, useLocation } from 'react-router-dom';
import { CommandPaletteMesh } from './components/CommandPaletteMesh';
import { MAPEKDashboard } from './components/MAPEKDashboard';
import { HierarchicalMeshNav } from './components/HierarchicalMeshNav';

const API_ENDPOINT = 'https://api.interface.rooz.live'; // Native cloud proxy boundaries

// Shared Motion Wrapper for Route Transitions mimicking "Mesh Cascades"
export const PageTransition = ({ children, title }: { children: React.ReactNode, title: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
    exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    className="h-full flex flex-col"
  >
    <div className="flex items-center gap-3 mb-8">
      <div className="h-6 w-2 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.6)]"></div>
      <h1 className="text-3xl font-light tracking-tight text-white">{title}</h1>
    </div>
    <div className="flex-1 relative">
       {/* Background structural glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-fuchsia-500/5 rounded-3xl pointer-events-none border border-white/5"></div>
      <div className="relative z-10">{children}</div>
    </div>
  </motion.div>
);

// Extracted MeshSidebar to components/HierarchicalMeshNav.tsx

function MainSystemOverview() {
  return (
    <PageTransition title="Command Nexus">
      <div className="p-8 grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <div className="col-span-full border border-indigo-500/20 bg-indigo-500/5 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden group hover:border-indigo-500/40 transition-colors">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-[50px] rounded-full transform translate-x-1/2 -translate-y-1/2 group-hover:bg-indigo-400/30 transition-colors"></div>
          <h3 className="text-white text-lg font-medium mb-2">Overall Topology Trace</h3>
          <p className="text-slate-400 leading-relaxed max-w-3xl">
            Welcome to the natively integrated TLD Dashboard. The self-optimizing CI array natively balances bounds, passing telemetry recursively back into the observation pool.
            Select your target layer within the Hierarchical Mesh Menu to proceed.
          </p>
        </div>
      </div>
    </PageTransition>
  );
}

function TelemetryDashboard() {
  const [temporalLimit, setTemporalLimit] = useState(1000);
  const [inferenceResult, setInferenceResult] = useState('');
  const [governanceBlocked, setGovernanceBlocked] = useState(false);

  const performOfflineInference = async () => {
    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: `!turboquant ${temporalLimit}`,
          requested_minutes: temporalLimit
        })
      });
      const data = await response.json();
      if (data.status === 'governance_drop' || temporalLimit > 5000) {
        setGovernanceBlocked(true);
        setInferenceResult('WSJF R-2026-018: Attention Fragmented. Zoom limit severely exceeds 5000 minute array constraints. Request blocked natively by Governance Admission.');
      } else {
        setGovernanceBlocked(false);
        setInferenceResult(JSON.stringify(data.chunks, null, 2) || "Inference Matrix Accepted.");
      }
    } catch (err) {
      setGovernanceBlocked(true);
      setInferenceResult('Offline Network Proxy unreachable. Verify tld-config bounds are bound.');
    }
  };

  return (
    <PageTransition title="Offline Inference Matrix">
      <div className="p-8 max-w-4xl">
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-xl mb-6">
          <label className="text-xs uppercase tracking-widest text-indigo-400 font-bold mb-3 block">Temporal Zoom Boundaries</label>
          <div className="flex gap-4 items-center">
            <input
              type="number"
              value={temporalLimit}
              onChange={(e) => setTemporalLimit(Number(e.target.value))}
              className="bg-black/50 text-white outline-none border border-slate-700 focus:border-indigo-500 transition-colors px-4 py-3 rounded-xl w-64 shadow-inner"
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={performOfflineInference}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl shadow-[0_0_15px_rgba(79,70,229,0.4)] font-medium transition-colors"
            >
              Request Trace
            </motion.button>
          </div>
        </div>

        <motion.div
          animate={{ opacity: inferenceResult ? 1 : 0 }}
          className={`p-6 backdrop-blur-xl border rounded-2xl shadow-xl
            ${governanceBlocked
              ? 'border-red-500/30 bg-red-950/20 shadow-[0_0_25px_rgba(239,68,68,0.1)]'
              : 'border-emerald-500/30 bg-emerald-950/20 shadow-[0_0_25px_rgba(16,185,129,0.1)]'}`}
        >
          <div className="flex items-center gap-3 mb-4">
            {governanceBlocked ? <ShieldAlert className="text-red-400 w-5 h-5" /> : <Activity className="text-emerald-400 w-5 h-5" />}
            <span className={`text-sm font-semibold tracking-wider ${governanceBlocked ? 'text-red-400' : 'text-emerald-400'}`}>
              {governanceBlocked ? 'CRITICAL BOUNDARY ENFORCED' : 'TRACE ACTIVE'}
            </span>
          </div>
          <pre className="text-sm font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">{inferenceResult}</pre>
        </motion.div>
      </div>
    </PageTransition>
  );
}

function HostBillBilling() {
  const [telemetry] = useState<any>({
    stx_node: 'compute-0.stx.edge.net',
    ipmi_telemetry: { pmbus_average_watts: 412.5, peak_thermal_celsius: 44.2 },
    hostbill_mapping_usd: 0.08,
    status: 'GREEN'
  }); // Simulated payload showing premium styling

  return (
    <PageTransition title="StarlingX Integrations">
      <div className="p-8">
        <h3 className="text-slate-400 mb-8 max-w-2xl font-light">
          Dashboard mapping dynamic Infrastructure Edge boundaries cleanly parsing realtime HostBill accounting limits.
        </h3>

        {telemetry && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6 rounded-2xl relative overflow-hidden">
               <div className="text-xs uppercase text-slate-500 tracking-wider mb-2">Edge Node</div>
               <div className="text-xl text-white font-medium">{telemetry.stx_node}</div>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6 rounded-2xl relative overflow-hidden">
               <div className="text-xs uppercase text-slate-500 tracking-wider mb-2">Avg Power Draw</div>
               <div className="text-2xl text-emerald-400 font-medium">{telemetry.ipmi_telemetry.pmbus_average_watts}<span className="text-sm text-slate-500 ml-1">W</span></div>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6 rounded-2xl relative overflow-hidden">
               <div className="text-xs uppercase text-slate-500 tracking-wider mb-2">Peak Thermal</div>
               <div className="text-2xl text-amber-500 font-medium">{telemetry.ipmi_telemetry.peak_thermal_celsius}<span className="text-sm text-slate-500 ml-1">°C</span></div>
            </div>

            <div className="bg-indigo-900/20 backdrop-blur-xl border border-indigo-500/30 p-6 rounded-2xl relative overflow-hidden shadow-[0_0_20px_rgba(99,102,241,0.1)]">
               <div className="absolute top-0 right-0 p-4 opacity-10">
                 <Server className="w-16 h-16 text-indigo-500" />
               </div>
               <div className="text-xs uppercase text-indigo-400 tracking-wider mb-2 relative z-10">Running OPEX Burn</div>
               <div className="text-3xl text-white font-medium relative z-10">${telemetry.hostbill_mapping_usd}<span className="text-sm text-slate-400 ml-1">/hr</span></div>
            </div>

          </div>
        )}
      </div>
    </PageTransition>
  );
}

function TradingHub() {
  return (
    <PageTransition title="Neural Trading Arrays">
      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
          <Link to="/trading/tax-loss-harvesting">
            <motion.div whileHover={{ scale: 1.02 }} className="h-full bg-slate-900/60 backdrop-blur-xl border border-slate-800 hover:border-fuchsia-500/50 p-8 rounded-3xl cursor-pointer group transition-colors">
              <Zap className="w-10 h-10 text-slate-600 mb-6 group-hover:text-fuchsia-400 transition-colors" />
              <h3 className="text-2xl text-white font-light mb-3">Alpha Harvesting</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Engage the dynamic tax-loss matrix. Safely optimize automated positions without alerting traditional bounds.</p>
            </motion.div>
          </Link>

          <Link to="/trading/roam-risks">
            <motion.div whileHover={{ scale: 1.02 }} className="h-full bg-slate-900/60 backdrop-blur-xl border border-slate-800 hover:border-red-500/50 p-8 rounded-3xl cursor-pointer group transition-colors">
              <ShieldAlert className="w-10 h-10 text-slate-600 mb-6 group-hover:text-red-400 transition-colors" />
              <h3 className="text-2xl text-white font-light mb-3">ROAM Mitigation</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Direct pipeline intercepting volatility risks via rigorous neural evaluation boundaries before actualization.</p>
            </motion.div>
          </Link>
        </div>
      </div>
    </PageTransition>
  );
}

function TaxLossHarvesting() {
  return (
    <PageTransition title="Alpha Harvesting Core">
      <div className="p-8">
        <div className="bg-[#0b101e] border border-white/5 rounded-3xl p-8 max-w-3xl font-mono text-sm shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-fuchsia-500 to-indigo-500"></div>
          <p className="text-slate-500 mb-4">// NEURAL HARVEST INITIALIZED</p>
          <div className="space-y-3">
            <p className="text-slate-300"><span className="text-fuchsia-400">INFO:</span> Scanning Sub-Accounts mapping edge latency arrays...</p>
            <p className="text-emerald-400 blink">SUCCESS: Target Harvest Opportunity Captured: $14,200.00</p>
            <p className="text-indigo-400">MODE: Long-Term Capital Matrix (Agentic Autonomous)</p>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

function RoamRisks() {
  return (
    <PageTransition title="Volatility Mitigation">
      <div className="p-8">
        <div className="bg-red-950/20 border border-red-500/30 rounded-3xl p-8 max-w-3xl shadow-[0_0_50px_rgba(239,68,68,0.05)] relative">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-red-500/20 rounded-xl relative">
              <ShieldAlert className="w-6 h-6 text-red-500 relative z-10" />
              <div className="absolute inset-0 bg-red-500/20 blur-md rounded-xl animate-pulse"></div>
            </div>
            <h3 className="text-2xl text-red-100 font-medium">Risk Breach Analyzed</h3>
          </div>

          <div className="space-y-4">
            <div className="bg-black/50 rounded-xl p-4 border border-red-900/50 flex justify-between items-center">
              <div className="text-slate-400 text-xs tracking-widest uppercase">Anomaly Source Core</div>
              <div className="font-mono text-red-300">src/neural-trading-risk-management/core</div>
            </div>
            <div className="bg-black/50 rounded-xl p-4 border border-red-900/50">
              <div className="text-slate-400 text-xs tracking-widest uppercase mb-2">Automated Remediation Loop</div>
              <div className="text-slate-200">Scaling back dynamic thresholds natively across heavily shorted Volatility Ticker streams mimicking K-Dense PlanAgent critiques.</div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

function SwarmNodes() {
  return (
    <PageTransition title="MAPE-K Execution Array">
      <div className="p-8">
        <div className="flex gap-4 mb-8">
           <div className="bg-indigo-500/10 border border-indigo-500/30 px-6 py-3 rounded-full flex items-center gap-3">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <span className="text-indigo-200 text-sm">Concurrent Edges: <strong>2 Active</strong></span>
           </div>
           <div className="bg-emerald-500/10 border border-emerald-500/30 px-6 py-3 rounded-full flex items-center gap-3">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-200 text-sm">Topology: <strong>Hierarchical Mesh</strong></span>
           </div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
           <div className="flex border-b border-white/5 bg-black/40 px-6 py-4">
              <div className="flex gap-2">
                 <div className="w-3 h-3 rounded-full bg-red-500"></div>
                 <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                 <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              </div>
           </div>
           <div className="p-8 font-mono text-sm leading-8">
             <div className="flex items-center gap-4 text-slate-300">
               <span className="text-fuchsia-500">[Swarm Refiner Node 0x1]</span>
               <span>Traversing inner-loop TypeScript validation critique ...</span>
               <span className="text-emerald-400 w-20 text-right font-bold ml-auto">PASS ⚪️</span>
             </div>
             <div className="flex items-center gap-4 text-slate-300 mt-2">
               <span className="text-indigo-500">[Swarm Execution Node 0x2]</span>
               <span>Executing Lean Learning compilation traces physically ...</span>
               <span className="text-emerald-400 w-20 text-right font-bold ml-auto">PASS 🟢</span>
             </div>
             <div className="flex items-center gap-4 text-slate-300 mt-2 opacity-50">
               <span className="text-amber-500">[CircuitBreaker EdgeLimit]</span>
               <span>Evaluating Local LBEC Cost/Makespan ...</span>
               <span className="text-amber-400 w-20 text-right font-bold ml-auto animate-pulse">SYNCING</span>
             </div>
           </div>
        </div>
      </div>
    </PageTransition>
  );
}

// Global App Shell
export default function App() {
  return (
    <Router>
      <div className="flex h-screen w-full bg-[#030712] font-sans selection:bg-indigo-500/30 text-slate-200 overflow-hidden">
        {/* Command Palette - Horizontally Lateral Navigation */}
        <CommandPaletteMesh />

        <HierarchicalMeshNav />
        <main className="flex-1 relative overflow-y-auto scrollbar-hide">
          {/* Subtle noise texture overlay for premium depth */}
          <div className="absolute inset-0 opacity-[0.015] pointer-events-none mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>

          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<MainSystemOverview />} />
              <Route path="/telemetry" element={<TelemetryDashboard />} />
              <Route path="/billing" element={<HostBillBilling />} />
              <Route path="/trading" element={<TradingHub />} />
              <Route path="/trading/tax-loss-harvesting" element={<TaxLossHarvesting />} />
              <Route path="/trading/roam-risks" element={<RoamRisks />} />
              <Route path="/infrastructure/swarm-nodes" element={<SwarmNodes />} />
              <Route path="/mape-k" element={<MAPEKDashboard />} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>
    </Router>
  );
}
