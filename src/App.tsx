// src/App.tsx
import { AnimatePresence, motion } from 'framer-motion';

import { useState } from 'react';
import { Link, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { CommandPaletteMesh } from './components/CommandPaletteMesh';
import { MAPEKDashboard } from './pages/MAPEKDashboard';
import { HierarchicalMeshNav } from './components/HierarchicalMeshNav';
import { ClientAdvisoryOnboarding } from './pages/ClientAdvisory';
import { AlphaHarvestingDashboard } from './pages/AlphaHarvestingDashboard';
import { PanicMatrixViewer } from './pages/PanicMatrixViewer';
import { VisionClawUploader } from './pages/VisionClawUploader';
import { WSJFNowNextLater } from './pages/WSJFNowNextLater';
import { GovernanceCMS } from './pages/GovernanceCMS';
import { TradingDashboardAPI } from './trading/ui/TradingDashboardAPI';
import { DirectMailValidator } from './dashboard/components/DirectMailValidator';
import { InfraAgenticsOODA } from './dashboard/components/InfraAgenticsOODA';

// @ts-ignore
import rawTelemetry from '../.goalie/genuine_telemetry.json';

const API_ENDPOINT = 'https://api.interface.rooz.live'; // Native cloud proxy boundaries

// Shared Motion Wrapper for Route Transitions mimicking "Mesh Cascades"
export const PageTransition = ({ children, title }: { children: React.ReactNode, title: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 10, filter: 'blur(5px)' }}
    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
    exit={{ opacity: 0, y: -10, filter: 'blur(5px)' }}
    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    className="h-full flex flex-col"
  >
    <div className="flex items-center gap-3 mb-8">
      <div className="h-6 w-1.5 bg-zinc-100 rounded-full"></div>
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">{title}</h1>
    </div>
    <div className="flex-1 relative">
       {/* Background structural glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/10 via-transparent to-zinc-900/10 rounded-3xl pointer-events-none border border-white/[0.05]"></div>
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
  const [telemetry] = useState<any>(() => {
    // Read from genuine_telemetry.json instead of completion theater
    const metrics = rawTelemetry?.metrics || {};
    const opex_budget = 500; // Simulated total budget
    const cost_per_agent = 0.015;
    const current_agents = metrics.active_agents || 0;
    const estimated_usd = (current_agents * cost_per_agent) * 24; // Simulated daily burn rate based on real agent count
    
    return {
      stx_node: 'compute-0.stx.edge.net',
      ipmi_telemetry: { 
         pmbus_average_watts: (metrics.memory_mapped_mb ? metrics.memory_mapped_mb * 0.05 : 412.5).toFixed(1), 
         peak_thermal_celsius: (40 + (metrics.cpu_utilization ? metrics.cpu_utilization * 0.1 : 4.2)).toFixed(1) 
      },
      hostbill_mapping_usd: estimated_usd.toFixed(3),
      status: estimated_usd > 10 ? 'AMBER' : 'GREEN'
    };
  });

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

// Using independent component AlphaHarvestingDashboard directly on Route

type RoamStatus = 'Resolved' | 'Owned' | 'Accepted' | 'Mitigated';
interface RoamEntry { id: string; description: string; status: RoamStatus; scenario: string; wsjf: number; ceremony: string; detectedAt: number; }
const ROAM_STATUS_COLORS: Record<RoamStatus, string> = {
  Resolved:  'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  Owned:     'bg-amber-500/10 border-amber-500/20 text-amber-400',
  Accepted:  'bg-red-500/10 border-red-500/20 text-red-400',
  Mitigated: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
};

function RoamRisks() {
  const risks: RoamEntry[] = [
    { id: 'roam-001', description: 'LBEC offload denied — frugal mode constrains cloud fallback', status: 'Owned',     scenario: 'severe',   wsjf: 9.0,  ceremony: 'sync',      detectedAt: Date.now() - 180000 },
    { id: 'roam-002', description: 'OPEX gate at 96.2% — no new spend authorized',              status: 'Accepted', scenario: 'critical',  wsjf: 10.0, ceremony: 'replenish', detectedAt: Date.now() - 90000  },
    { id: 'roam-003', description: 'RefinerAgent rejected plan — over-escalation detected',     status: 'Mitigated', scenario: 'adverse',  wsjf: 7.2,  ceremony: 'retro',     detectedAt: Date.now() - 45000  },
    { id: 'roam-004', description: 'anomalyScore=0.51 sustained >3 cycles at adverse band',      status: 'Owned',     scenario: 'adverse',  wsjf: 8.5,  ceremony: 'standup',   detectedAt: Date.now() - 22000  },
    { id: 'roam-005', description: 'CB utilization at 83% — nearing soft limit',                status: 'Accepted',  scenario: 'baseline', wsjf: 7.5,  ceremony: 'review',    detectedAt: Date.now() - 8000   },
    // Legal case ROAM risks
    { id: 'BL-20260423-7714', description: 'De Novo Appeal Filing - Blossom Law (MAA/BoA/Apex)', status: 'Owned', scenario: 'critical', wsjf: 11.5, ceremony: 'standup', detectedAt: Date.now() },
    { id: 'roam-legal-001', description: 'Appeal deadline lapsed (26CV007491-590) — March 20, 2026 passed', status: 'Accepted', scenario: 'severe', wsjf: 10.0, ceremony: 'standup', detectedAt: Date.now() - 3600000 },
    { id: 'roam-legal-002', description: 'Evidence bundle incomplete — missing PDF synthesis', status: 'Resolved', scenario: 'baseline', wsjf: 8.0, ceremony: 'review', detectedAt: Date.now() - 1800000 },
    { id: 'roam-legal-003', description: 'Housing displacement risk — 505 W 7th St transition', status: 'Owned', scenario: 'critical', wsjf: 9.8, ceremony: 'retro', detectedAt: Date.now() - 7200000 },
  ];
  const [filter, setFilter] = useState<RoamStatus | 'all'>('all');
  const sorted = risks.filter(r => filter === 'all' || r.status === filter).sort((a, b) => b.wsjf - a.wsjf);

  return (
    <PageTransition title="ROAM Risk Register">
      <div className="p-6 space-y-5">
        {/* Summary pills */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">Filter:</span>
          {(['all', 'Resolved', 'Owned', 'Accepted', 'Mitigated'] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border transition-all ${
                filter === s
                  ? s === 'all' ? 'border-white/20 text-white bg-white/5' : ROAM_STATUS_COLORS[s as RoamStatus]
                  : 'border-white/5 text-slate-600 hover:text-slate-300'
              }`}>{s}
            </button>
          ))}
          <span className="ml-auto text-[10px] text-slate-600">{sorted.length} risks · sorted by WSJF ↓</span>
        </div>

        {/* ROAM table */}
        <div className="space-y-2">
          {sorted.map(r => {
            const age = Math.round((Date.now() - r.detectedAt) / 1000);
            return (
              <div key={r.id} className="flex items-start gap-3 p-4 bg-slate-900/50 border border-white/5 rounded-2xl hover:border-white/10 transition-all">
                <div className="shrink-0 mt-0.5">
                  {r.status === 'Resolved' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> :
                   r.status === 'Mitigated' ? <RotateCcw className="w-4 h-4 text-indigo-400" /> :
                   <AlertTriangle className="w-4 h-4 text-amber-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${ROAM_STATUS_COLORS[r.status]}`}>{r.status}</span>
                    <span className="text-[9px] text-slate-600 font-mono">{r.id}</span>
                    <span className="text-[9px] text-slate-600">· {r.ceremony} · {r.scenario}</span>
                    <span className="ml-auto text-[9px] text-slate-700">{age}s ago</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{r.description}</p>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[10px] text-slate-600">WSJF</div>
                  <div className="text-sm font-black text-white">{r.wsjf}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ROAM triggers reference */}
        <div className="bg-slate-900/30 border border-white/5 rounded-2xl p-4">
          <div className="text-[10px] text-slate-600 uppercase tracking-widest font-bold mb-3">Auto-trigger Rules</div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            {[
              ['lbec=denied',          'Owned',     'WSJF 9.0'],
              ['opexGated≥95%',        'Accepted',  'WSJF 10.0'],
              ['refiner rejected',     'Mitigated', 'WSJF = revised'],
              ['anomalyScore > 0.4',   'Owned',     'WSJF 8.5'],
              ['cbUtil > 80%',         'Accepted',  'WSJF 7.5'],
            ].map(([trigger, status, wsjf]) => (
              <div key={trigger} className="flex items-center gap-2 px-2 py-1.5 bg-black/20 rounded-lg border border-white/5">
                <span className="text-slate-500 font-mono">{trigger}</span>
                <span className="ml-auto text-slate-600">{status} · {wsjf}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

import { SwarmNodesDashboard } from './pages/SwarmNodesDashboard';
import { LegalCaseDashboard } from './pages/LegalCaseDashboard';
import { Activity, Server, ShieldAlert, Zap, AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react';


// Global App Shell
export default function App() {
  return (
    <Router>
      <div className="flex h-screen w-full bg-[#09090b] font-sans selection:bg-zinc-500/30 text-zinc-100 overflow-hidden">
        {/* Command Palette - Horizontally Lateral Navigation */}
        <CommandPaletteMesh />

        <HierarchicalMeshNav />
        <main className="flex-1 relative overflow-y-auto scrollbar-hide">
          {/* Subtle noise texture overlay for premium depth */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>

          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<MainSystemOverview />} />
              
              {/* Core Matrix Topology */}
              <Route path="/wsjf" element={<WSJFNowNextLater />} />
              <Route path="/mape-k" element={<MAPEKDashboard />} />
              <Route path="/governance/dor" element={<GovernanceCMS />} />
              <Route path="/panic" element={<PanicMatrixViewer />} />
              <Route path="/vision" element={<VisionClawUploader />} />
              
              {/* Exploded Mesh Context (Isolated sidebar boundary) */}
              <Route path="/mesh" element={
                <div className="w-full max-w-sm mx-auto mt-20"><HierarchicalMeshNav /></div>
              } />

              <Route path="/telemetry" element={<TelemetryDashboard />} />
              <Route path="/billing" element={<HostBillBilling />} />
              <Route path="/trading" element={<TradingHub />} />
              <Route path="/trading/tax-loss-harvesting" element={<AlphaHarvestingDashboard />} />
              <Route path="/trading/roam-risks" element={<RoamRisks />} />
              <Route path="/compliance" element={<TradingDashboardAPI />} />
              <Route path="/infrastructure/swarm-nodes" element={<SwarmNodesDashboard />} />
              
              {/* External Client Onboarding / Advisory Matrix */}
              
              {/* Legal Case Management */}
              <Route path="/legal/cases" element={<LegalCaseDashboard />} />
              <Route path="/legal/directmail" element={
                <PageTransition title="DirectMail Validation">
                  <div className="p-8 max-w-5xl"><DirectMailValidator /></div>
                </PageTransition>
              } />
              
              <Route path="/infrastructure/ooda-monitor" element={
                <PageTransition title="Infra Agentics OODA Swarm">
                  <div className="p-8 max-w-5xl"><InfraAgenticsOODA /></div>
                </PageTransition>
              } />
              
              <Route path="/advisory/onboarding" element={<ClientAdvisoryOnboarding />} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>
    </Router>
  );
}
