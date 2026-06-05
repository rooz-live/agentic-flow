// src/components/MAPEKDashboard.tsx
import { Link } from 'react-router-dom';

import { useEffect, useState } from 'react';
import { PageTransition } from '../App';
import { PanicMatrixViewer } from './PanicMatrixViewer';
import { VisionClawUploader } from './VisionClawUploader';
import { Activity, BarChart3, CheckCircle, Clock, Cpu, Database, TrendingUp, Zap, Shield, Mail, Users, RefreshCw, DollarSign, FlaskConical, Layers, RotateCcw, GitBranch, Bot, Globe, Radio, Server, HardDrive, Terminal, CloudLightning } from 'lucide-react';


type ScenarioBand = 'baseline' | 'adverse' | 'severe' | 'critical';


const SCENARIO_COLORS: Record<ScenarioBand, string> = {
  baseline: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]',
  adverse:  'text-amber-400 bg-amber-500/10 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]',
  severe:   'text-orange-400 bg-orange-500/10 border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.2)]',
  critical: 'text-red-400 bg-red-500/10 border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.3)] animate-[pulse_2s_ease-in-out_infinite]',
};

// ─── Agile Ceremonies ──────────────────────────────────────────────────────────
type AgileceremonyKey = 'standup' | 'review' | 'retro' | 'replenish' | 'refine' | 'pi_prep' | 'sync';

interface AgileCeremony {
  key: AgileceremonyKey;
  label: string;
  description: string;
  channel: 'macOS Mail' | 'MailMaven' | 'Daylite' | 'Direct Mail' | 'Slack';
  roleRequirement: 'team' | 'circle' | 'institution';
  wsjfScore: number;
}

const AGILE_CEREMONIES: AgileCeremony[] = [
  { key: 'standup',  label: 'Daily Stand-up',        description: 'MAPE-K status + blocker triage',           channel: 'Slack',       roleRequirement: 'team',        wsjfScore: 9.2 },
  { key: 'review',   label: 'Sprint Review',          description: 'Demo: BML decision + swarm increment',     channel: 'Daylite',     roleRequirement: 'circle',      wsjfScore: 8.7 },
  { key: 'retro',    label: 'Retrospective',          description: 'Red-Green-Refactor learnings',             channel: 'Direct Mail', roleRequirement: 'team',        wsjfScore: 7.9 },
  { key: 'replenish',label: 'Backlog Replenishment',  description: 'WSJF re-score + OPEX allocation',          channel: 'MailMaven',   roleRequirement: 'circle',      wsjfScore: 8.1 },
  { key: 'refine',   label: 'Story Refinement',       description: 'Acceptance criteria + fake-door gates',    channel: 'macOS Mail',  roleRequirement: 'team',        wsjfScore: 7.4 },
  { key: 'pi_prep',  label: 'PI Planning Prep',       description: 'Scenario bands × institution objectives',  channel: 'Daylite',     roleRequirement: 'institution', wsjfScore: 9.8 },
  { key: 'sync',     label: 'Cross-Circle Sync',      description: 'ROAM risk escalation + LBEC offload plan', channel: 'MailMaven',   roleRequirement: 'institution', wsjfScore: 8.4 },
];

// ─── Email Channel Colours ─────────────────────────────────────────────────────
const CHANNEL_COLORS: Record<AgileCeremony['channel'], string> = {
  'macOS Mail':  'bg-blue-500/10 border-blue-500/20 text-blue-400',
  'MailMaven':   'bg-violet-500/10 border-violet-500/20 text-violet-400',
  'Daylite':     'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
  'Direct Mail': 'bg-orange-500/10 border-orange-500/20 text-orange-400',
  'Slack':       'bg-green-500/10 border-green-500/20 text-green-400',
};

const ROLE_COLORS: Record<AgileCeremony['roleRequirement'], string> = {
  team:        'text-zinc-400',
  circle:      'text-zinc-100',
  institution: 'text-fuchsia-400',
};

// ─── Swarm Increment ──────────────────────────────────────────────────────────
type SwarmIncrement = 'baseline' | 'adverse' | 'severe' | 'critical';

interface AdaptationEntry {
  time: string;
  decision: string;
  confidence: number;
  scenario: ScenarioBand;
}

interface SystemMetrics {
  timestamp: string;
  latency_ms: number;
  throughput_rps: number;
  circuit_breaker_trips: number;
  error_rate: number;
  cpu_percent: number;
  memory_mb: number;
  active_agents: number;
}

export const POLLING_INTERVAL_MS = 1500;

export function MAPEKDashboard() {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    timestamp: new Date().toISOString(),
    latency_ms: 87.3,
    throughput_rps: 142,
    circuit_breaker_trips: 0,
    error_rate: 0.012,
    cpu_percent: 34.8,
    memory_mb: 1287,
    active_agents: 6
  });

  const [adaptationHistory] = useState<Array<AdaptationEntry>>([
    { time: '14:23:15', decision: 'BASELINE', confidence: 0.95, scenario: 'baseline' },
    { time: '14:24:42', decision: 'SCALE_AGENTS', confidence: 0.87, scenario: 'adverse' },
    { time: '14:26:18', decision: 'ADJUST_CB', confidence: 0.92, scenario: 'baseline' }
  ]);

  const [knowledgeEntries] = useState(127);
  const [isLearning] = useState(true);
  const [scenario, setScenario] = useState<ScenarioBand>('baseline');
  const [pewmaLatency, setPewmaLatency] = useState(87.3);
  const [anomalyScore, setAnomalyScore] = useState(0.04);
  const [refinerConfidence] = useState(0.95);

  // OPEX Budget state
  const [opexAllocated] = useState(500);
  const [opexSpent] = useState(142.80);
  const opexUtilization = (opexSpent / opexAllocated) * 100;
  const opexGated = opexUtilization >= 95;

  // Circuit-breaker session state
  const [cbCalls] = useState(3);
  const cbMax = 12;
  const cbUtilization = (cbCalls / cbMax) * 100;

  // Swarm increment + ceremony state
  const [swarmIncrement, setSwarmIncrement] = useState<SwarmIncrement>('baseline');
  const [activeCeremony, setActiveCeremony] = useState<AgileceremonyKey | null>(null);

  // SA: Circle role + vector + integration tier
  type CircleRole = 'team-circle' | 'circle-circle' | 'institution-circle';
  type IntegrationTier = 1 | 2 | 3 | 4;
  type VectorBadge = 'code' | 'clt' | 'shared';
  const [circleRole, setCircleRole] = useState<CircleRole>('team-circle');
  const [integrationTier, setIntegrationTier] = useState<IntegrationTier>(2);
  const [activeVector, setActiveVector] = useState<VectorBadge>('code');

  // SA: Ledger timeline (simulated last 3 events)
  const [ledgerEvents] = useState([
    { id: 'evt-001', ts: Date.now() - 90000, action: 'DISPATCH', appId: 'com.tinyspeck.slackmacgap', ceremony: 'standup', scenario: 'baseline' },
    { id: 'evt-002', ts: Date.now() - 45000, action: 'DISPATCH', appId: 'com.omnigroup.OmniFocus5', ceremony: 'review', scenario: 'adverse' },
    { id: 'evt-003', ts: Date.now() - 12000, action: 'WRITE', appId: 'md.obsidian', ceremony: 'retro', scenario: 'baseline' },
  ]);
  const [lastRolledBack, setLastRolledBack] = useState<string | null>(null);

  // SA: Live model status
  const liveModels = [
    { name: 'qwen3-coder', host: 'Ollama :11434', live: true, tier: 4 },
    { name: 'gemma-4-26b', host: 'LM Studio :1234', live: true, tier: 4 },
    { name: 'qwen3.5-9b',  host: 'LM Studio :1234', live: true, tier: 4 },
  ];

  // Dynamic Telemetry Domains
  const [telemetryDomains, setTelemetryDomains] = useState<Record<string, any>>({});

  // Sovereign Infrastructure & OPEX Gravity Bounds
  const [gravityBreach, setGravityBreach] = useState<boolean>(false);
  const [sovereigntyManifest, setSovereigntyManifest] = useState<any>(null);

  // Economic Telemetry (OpenBadges Justification)
  const [economicPipelines] = useState([
    { name: 'Reverse Recruiting (Tag.ooo)', conversion_pct: 2.4, threshold: 5.0 },
    { name: 'Contingency Counsel Intake', conversion_pct: 8.7, threshold: 12.0 },
    { name: 'Agentic B2B Contracting', conversion_pct: 14.2, threshold: 10.0 }
  ]);

  // REFACTOR: Physical binding to genuine telemetry via WebSockets
  useEffect(() => {
    // @ts-ignore
    if (import.meta.hot) {
      // @ts-ignore
      import.meta.hot.on('telemetry:stream', (data: any) => {
        // Sync raw hardware state < 50ms latency natively
        setMetrics({
            ...data.metrics,
            timestamp: new Date().toISOString()
        });
        
        // Sync PEWMA anomaly density bounds
        setPewmaLatency(data.pewma.latency);
        setAnomalyScore(data.pewma.anomalyScore);
        
        // Sync exact frugal constraints
        if (data.scenario) setScenario(data.scenario);

        // Sync Layer 4 Domain Boundaries
        if (data.domains) setTelemetryDomains(data.domains);

        // Sync Physical Ground Truth (Gravity & Sovereignty)
        if (data.gravity_breach !== undefined) setGravityBreach(data.gravity_breach);
        if (data.sovereignty_manifest) setSovereigntyManifest(data.sovereignty_manifest);
      });
    } else {
       console.warn('[TELEMETRY] HMR WebSockets decoupled. Ensure Native Node WebSocket mounts for prod edges.');
    }
    
    return () => {
      // @ts-ignore
      if (import.meta.hot) {
         // @ts-ignore
         import.meta.hot.off('telemetry:stream');
      }
    };
  }, []);

  const getHealthColor = (metric: keyof SystemMetrics, value: number): string => {
    const thresholds: Record<string, { warn: number; crit: number }> = {
      latency_ms: { warn: 150, crit: 200 },
      error_rate: { warn: 0.03, crit: 0.05 },
      cpu_percent: { warn: 70, crit: 85 }
    };

    const threshold = thresholds[metric];
    if (!threshold) return 'text-emerald-400';

    if (value >= threshold.crit) return 'text-red-400';
    if (value >= threshold.warn) return 'text-amber-400';
    return 'text-emerald-400';
  };

  return (
    <PageTransition title="Self-Optimizing Architecture [TELEMETRY-AWARE MPP]">
      {/* THE GRAVITY LOCK: Total UI Lockdown if OPEX Boundary is breached */}
      {gravityBreach && (
        <div className="fixed inset-0 z-[9999] bg-rose-950/90 backdrop-blur-3xl flex flex-col items-center justify-center border-[20px] border-rose-500 animate-[pulse_2s_ease-in-out_infinite]">
           <HardDrive className="w-32 h-32 text-rose-500 mb-8" />
           <h1 className="text-6xl font-black text-rose-100 uppercase tracking-widest text-center shadow-black drop-shadow-2xl">
             FATAL GRAVITY BREACH
           </h1>
           <p className="mt-6 text-xl text-rose-300 font-mono max-w-2xl text-center">
             Internal OS APFS Drive dropped below 10.0GB OPEX Boundary. <br/><br/>
             Swarm Memory Swap Kernel Panic Imminent. <br/>
             All Phase Gate executions have been physically severed.
           </p>
           <div className="mt-12 bg-black/50 p-6 rounded-xl border border-rose-500/50">
              <span className="text-zinc-400 font-mono uppercase text-xs">Resolution Pathway:</span>
              <p className="text-white font-mono mt-2">Execute Symlink Offloading to `/Volumes/cPanelBackups`</p>
           </div>
        </div>
      )}

      <div className={`p-8 space-y-6 relative ${gravityBreach ? 'blur-xl opacity-20 pointer-events-none' : ''}`}>
        <div className="absolute top-0 inset-x-0 h-[600px] bg-gradient-to-b from-indigo-500/10 via-fuchsia-500/5 to-transparent pointer-events-none -z-10" />
        <div className="absolute top-20 right-20 w-[400px] h-[400px] bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none -z-10" />
        <div className="absolute bottom-40 left-20 w-[400px] h-[400px] bg-fuchsia-600/10 blur-[150px] rounded-full pointer-events-none -z-10" />

        {/* Phase II: Teleological Physics Mapping */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <PanicMatrixViewer />
          <VisionClawUploader />
        </div>

        {/* Vertical Integration Top-Level Domains */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Link to="/trading" className="group flex flex-col p-4 bg-[#0a0a0a]/80 backdrop-blur-3xl border border-white/[0.08] rounded-xl hover:bg-white/[0.02] hover:border-indigo-500/50 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] transition-all">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
              <span className="text-white font-bold text-sm tracking-wide">/trading</span>
            </div>
            <p className="text-[10px] text-zinc-500 font-mono">Neural Execution & Market Data</p>
          </Link>
          <Link to="/trading/tax-loss-harvesting" className="group flex flex-col p-4 bg-[#0a0a0a]/80 backdrop-blur-3xl border border-white/[0.08] rounded-xl hover:bg-white/[0.02] hover:border-fuchsia-500/50 hover:shadow-[0_0_20px_rgba(217,70,239,0.15)] transition-all">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-5 h-5 text-fuchsia-400 group-hover:scale-110 transition-transform" />
              <span className="text-white font-bold text-sm tracking-wide">/tax-loss-harvest</span>
            </div>
            <p className="text-[10px] text-zinc-500 font-mono">Automated TLH Optimizations</p>
          </Link>
          <Link to="/trading/roam-risks" className="group flex flex-col p-4 bg-[#0a0a0a]/80 backdrop-blur-3xl border border-white/[0.08] rounded-xl hover:bg-white/[0.02] hover:border-amber-500/50 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)] transition-all">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="text-white font-bold text-sm tracking-wide">/roam-risks</span>
            </div>
            <p className="text-[10px] text-zinc-500 font-mono">Ledger ROAM Vulnerability</p>
          </Link>
          <Link to="/infrastructure/swarm-nodes" className="group flex flex-col p-4 bg-[#0a0a0a]/80 backdrop-blur-3xl border border-sky-500/30 rounded-xl hover:bg-sky-500/10 hover:border-sky-400 shadow-[0_0_15px_rgba(14,165,233,0.1)] transition-all relative overflow-hidden">
            <div className="flex items-center gap-2 mb-2 relative z-10">
              <Radio className="w-5 h-5 text-sky-400 group-hover:scale-110 transition-transform animate-pulse" />
              <span className="text-sky-300 font-bold text-sm tracking-wide">/swarm-nodes</span>
            </div>
            <p className="text-[10px] text-sky-500/70 font-mono relative z-10">Deep MAPEK Orchestration</p>
            <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/20 blur-[30px]" />
          </Link>
        </div>

        {/* Scenario Band Selector */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Scenario Band:</span>
          {(['baseline', 'adverse', 'severe', 'critical'] as ScenarioBand[]).map(s => (
            <button
              key={s}
              onClick={() => setScenario(s)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all ${
                scenario === s ? SCENARIO_COLORS[s] : 'bg-white/[0.02] backdrop-blur-2xl border-white/[0.05] text-zinc-600 hover:text-zinc-300'
              }`}
            >
              {s}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-white/[0.04] backdrop-blur-2xl border border-white/[0.05] rounded-lg">
            <div className={`w-1.5 h-1.5 rounded-full ${anomalyScore > 0.25 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
            <span className="text-[10px] font-mono text-zinc-400">
              PEWMA {pewmaLatency.toFixed(1)}ms · density {(anomalyScore * 100).toFixed(1)}%
            </span>
          </div>
        </div>
        {/* Header Stats Bar */}
        <div className="grid grid-cols-4 gap-4 relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500/5 via-transparent to-transparent pointer-events-none" />
          
          <div className="bg-[#0a0a0a]/80 backdrop-blur-3xl backdrop-blur-xl border-t border-white/[0.08] shadow-[0_8px_30px_rgb(0,0,0,0.8)] ring-1 ring-white/[0.05] rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 blur-[30px]" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-400 font-bold uppercase tracking-widest">Latency</span>
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div className={`text-3xl font-black tracking-tight ${getHealthColor('latency_ms', metrics.latency_ms)}`}>
              {metrics.latency_ms.toFixed(1)}<span className="text-sm ml-1 font-bold">ms</span>
            </div>
            <div className="text-[10px] text-zinc-500 mt-2 font-mono bg-white/[0.02] inline-block px-2 py-0.5 rounded">P95: 127.4ms</div>
          </div>

          <div className="bg-[#0a0a0a]/80 backdrop-blur-3xl backdrop-blur-xl border-t border-white/[0.08] shadow-[0_8px_30px_rgb(0,0,0,0.8)] ring-1 ring-white/[0.05] rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/[0.03] blur-[30px]" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-400 font-bold uppercase tracking-widest">Throughput</span>
              <TrendingUp className="w-4 h-4 text-zinc-100" />
            </div>
            <div className="text-3xl font-black tracking-tight text-zinc-100">
              {Math.round(metrics.throughput_rps)}<span className="text-sm ml-1 font-bold">rps</span>
            </div>
            <div className="text-[10px] text-zinc-500 mt-2 font-mono bg-white/[0.02] inline-block px-2 py-0.5 rounded">+12% vs base</div>
          </div>

          <div className="bg-[#0a0a0a]/80 backdrop-blur-3xl backdrop-blur-xl border-t border-white/[0.08] shadow-[0_8px_30px_rgb(0,0,0,0.8)] ring-1 ring-white/[0.05] rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-fuchsia-500/10 blur-[30px]" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-400 font-bold uppercase tracking-widest">CPU Mesh</span>
              <Cpu className="w-4 h-4 text-fuchsia-400" />
            </div>
            <div className={`text-3xl font-black tracking-tight ${getHealthColor('cpu_percent', metrics.cpu_percent)}`}>
              {metrics.cpu_percent.toFixed(1)}<span className="text-sm ml-1 font-bold">%</span>
            </div>
            <div className="text-[10px] text-zinc-500 mt-2 font-mono bg-white/[0.02] inline-block px-2 py-0.5 rounded">6 nodes active</div>
          </div>

          <div className="bg-[#0a0a0a]/80 backdrop-blur-3xl backdrop-blur-xl border-t border-white/[0.08] shadow-[0_8px_30px_rgb(0,0,0,0.8)] ring-1 ring-white/[0.05] rounded-2xl p-5 relative overflow-hidden shadow-[inset_0_0_20px_rgba(14,165,233,0.05)]">
            <div className="absolute top-0 right-0 w-20 h-20 bg-sky-500/10 blur-[30px]" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-400 font-bold uppercase tracking-widest">Knowledge</span>
              <Database className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-3xl font-black tracking-tight text-sky-400">
              {knowledgeEntries}<span className="text-sm ml-1 font-bold">obj</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 mt-2 font-mono bg-emerald-500/5 inline-block px-2 py-0.5 rounded border border-emerald-500/20">
              {isLearning && <div className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
              Learning active
            </div>
          </div>
        </div>

        {/* DR/HA Control Surface */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button className="flex flex-col items-center justify-center p-4 bg-slate-900/50 border border-slate-800 rounded-xl hover:bg-slate-800/80 hover:border-indigo-500/50 transition-all group">
            <Zap className="w-6 h-6 text-indigo-400 mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold text-white">Swarm Inference Metrics</span>
            <span className="text-[9px] text-slate-500 mt-1">activation_orchestrator.py</span>
          </button>
          <button className="flex flex-col items-center justify-center p-4 bg-amber-900/20 border border-amber-500/30 rounded-xl hover:bg-amber-900/40 hover:border-amber-400 transition-all group">
            <Server className="w-6 h-6 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold text-white">Disaster Recovery (Decade Boot)</span>
            <span className="text-[9px] text-amber-500/70 mt-1">Spawn .venv → omni_restore_decade.sh</span>
          </button>
        </div>

        {/* MAPE-K Phase Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Monitor */}
          <div className="bg-white/[0.02] backdrop-blur-2xl border border-white/[0.06] p-6 rounded-2xl">
            <div className="w-10 h-10 rounded-full bg-white/[0.05] flex items-center justify-center mb-4">
              <span className="text-zinc-100 font-bold">M</span>
            </div>
            <h4 className="text-white font-medium mb-2">Monitor</h4>
            <p className="text-xs text-zinc-400">Continually gathers real-time metrics & CPU load.</p>
            <div className="mt-4 bg-white/[0.03] border border-white/[0.08] p-2 rounded text-[10px] text-zinc-300 font-mono">
              [MonitorAgent] Scanning E2B
            </div>
          </div>

          {/* Analyze */}
          <div className="bg-white/[0.02] backdrop-blur-2xl border border-white/[0.06] p-6 rounded-2xl relative">
            <div className="absolute top-1/2 -left-3 w-6 h-[1px] bg-slate-700 hidden lg:block"></div>
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
              <span className="text-amber-400 font-bold">A</span>
            </div>
            <h4 className="text-white font-medium mb-2">Analyze</h4>
            <p className="text-xs text-zinc-400">Processes drift and limit thresholding natively.</p>
            <div className="mt-4 bg-amber-500/10 border border-amber-500/20 p-2 rounded text-[10px] text-amber-300 font-mono">
              [AnalyzeAgent] Drift Det.
            </div>
          </div>

          {/* Plan */}
          <div className="bg-white/[0.02] backdrop-blur-2xl border border-fuchsia-500/30 shadow-[0_0_15px_rgba(217,70,239,0.1)] p-6 rounded-2xl relative">
            <div className="absolute top-1/2 -left-3 w-6 h-[1px] bg-slate-700 hidden lg:block"></div>
            <div className="w-10 h-10 rounded-full bg-fuchsia-500/20 flex items-center justify-center mb-4">
              <span className="text-fuchsia-400 font-bold">P</span>
            </div>
            <h4 className="text-white font-medium mb-2">Plan (Refiner)</h4>
            <p className="text-xs text-zinc-400">Inner-loop recursive validation and Self-Edits synthesis.</p>
            <div className="mt-4 bg-fuchsia-500/10 border border-fuchsia-500/20 p-2 rounded text-[10px] text-fuchsia-300 font-mono">
              [PlanAgent] Critique Matrix
            </div>
          </div>

          {/* Execute */}
          <div className="bg-white/[0.02] backdrop-blur-2xl border border-white/[0.06] p-6 rounded-2xl relative">
            <div className="absolute top-1/2 -left-3 w-6 h-[1px] bg-slate-700 hidden lg:block"></div>
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
              <span className="text-emerald-400 font-bold">E</span>
            </div>
            <h4 className="text-white font-medium mb-2">Execute</h4>
            <p className="text-xs text-zinc-400">Executes LBEC Sandbox payload safely.</p>
            <div className="mt-4 bg-emerald-500/10 border border-emerald-500/20 p-2 rounded text-[10px] text-emerald-300 font-mono">
              [ExecuteAgent] Sandbox Run
            </div>
          </div>

          {/* Knowledge */}
          <div className="bg-white/[0.02] backdrop-blur-2xl border border-white/[0.06] p-6 rounded-2xl relative">
            <div className="absolute top-1/2 -left-3 w-6 h-[1px] bg-slate-700 hidden lg:block"></div>
            <div className="w-10 h-10 rounded-full bg-sky-500/20 flex items-center justify-center mb-4">
              <span className="text-sky-400 font-bold">K</span>
            </div>
            <h4 className="text-white font-medium mb-2">Knowledge</h4>
            <p className="text-xs text-zinc-400">Garbage collection into .agentdb schemas.</p>
            <div className="mt-4 bg-sky-500/10 border border-sky-500/20 p-2 rounded text-[10px] text-sky-300 font-mono">
              [Knowledge] SQLite Sync
            </div>
          </div>
        </div>

        {/* LAYER 4 // MCP + MPP Domain Health Grid */}
        {(() => {
          const sortedDomains = Object.entries(telemetryDomains)
            .sort(([, aData]: any, [, bData]: any) => {
              const aPanic = aData?.panic_indicators?.panic_distance || 0;
              const bPanic = bData?.panic_indicators?.panic_distance || 0;
              return bPanic - aPanic;
            })
            .slice(0, 8); // Top 8 off-ending gravity wells
          
          if (sortedDomains.length === 0) return null;

          return (
            <div className="bg-white/[0.02] backdrop-blur-2xl border border-white/[0.06] p-6 rounded-2xl w-full">
               <h3 className="text-[10px] text-zinc-400 uppercase tracking-[0.2em] font-bold mb-4 flex items-center gap-2">
                 <div className="w-1.5 h-1.5 bg-indigo-500 rounded-sm"></div> Sub-Layer Gateways [MCP + MPP]
               </h3>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                 {sortedDomains.map(([domain, info]: any) => {
                   const pDist = info?.panic_indicators?.panic_distance || 0;
                   let dStatus = 'healthy';
                   if (pDist > 0.8) dStatus = 'critical';
                   else if (pDist > 0.5) dStatus = 'degraded';

                   const role = info?.mechanical_compliance?.verification_method || 'detected';

                   return (
                     <div
                       key={domain}
                       className={`relative p-3 rounded-lg border backdrop-blur-sm group overflow-hidden ${
                         dStatus === 'healthy'
                           ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-100 hover:border-emerald-500/50'
                           : dStatus === 'degraded'
                           ? 'bg-amber-950/20 border-amber-500/20 text-amber-100 hover:border-amber-500/50'
                           : 'bg-rose-950/20 border-rose-500/20 text-rose-100 hover:border-rose-500/50'
                       } transition-colors duration-300`}
                     >
                       <div className="absolute top-0 left-0 w-1 h-full bg-current opacity-20 group-hover:opacity-100 transition-opacity"></div>
                       <div className="font-bold tracking-wider text-sm truncate pl-2 shadow-black drop-shadow-md">{domain}</div>
                       <div className="flex justify-between items-end mt-2 pl-2">
                         <div className="text-[9px] uppercase tracking-[0.2em] font-bold opacity-60 bg-black/40 px-1.5 py-0.5 rounded">{role}</div>
                         <div className="flex items-center gap-1.5">
                           <div className={`w-1.5 h-1.5 rounded-full ${dStatus === 'healthy' ? 'bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,1)]' : 'bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,1)]'}`}></div>
                           <div className="text-[9px] uppercase font-bold tracking-widest opacity-80">{dStatus}</div>
                         </div>
                       </div>
                     </div>
                   );
                 })}
               </div>
            </div>
          );
        })()}

        {/* Economic Demand Telemetry (OpenBadges Justification Matrix) */}
        <div className="bg-white/[0.02] backdrop-blur-2xl border border-white/[0.06] rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              Economic Telemetry (OpenBadges Justification)
            </h3>
            <span className="text-[10px] text-zinc-500 font-mono tracking-wider bg-black/40 px-2 py-1 rounded">1EdTech Specification Gating</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {economicPipelines.map(pipe => {
              const isJustified = pipe.conversion_pct >= pipe.threshold;
              return (
                <div key={pipe.name} className={`p-4 rounded-xl border ${isJustified ? 'bg-emerald-950/20 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-[#0a0a0a]/80 border-white/[0.06]'}`}>
                  <div className="text-xs text-zinc-400 font-bold mb-2 truncate">{pipe.name}</div>
                  <div className="flex items-end justify-between mb-2">
                    <div className={`text-3xl font-black tracking-tight ${isJustified ? 'text-emerald-400' : 'text-zinc-100'}`}>
                      {pipe.conversion_pct.toFixed(1)}<span className="text-sm ml-1 font-bold">%</span>
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono mb-1 bg-white/[0.03] px-2 py-0.5 rounded">Target: {pipe.threshold.toFixed(1)}%</div>
                  </div>
                  <div className="h-1.5 bg-[#050505] rounded-full overflow-hidden mb-3">
                    <div className={`h-full transition-all duration-500 ${isJustified ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min((pipe.conversion_pct / pipe.threshold) * 100, 100)}%` }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-[9px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded border ${isJustified ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-white/[0.02] border-white/[0.05] text-zinc-500'}`}>
                      {isJustified ? 'WSJF: NOW' : 'WSJF: LATER'}
                    </span>
                    {isJustified && (
                      <span className="text-[9px] text-emerald-400 font-mono uppercase font-black animate-pulse flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Mint Badge
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-lg flex items-start gap-3">
            <RefreshCw className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
            <p className="text-[11px] text-indigo-200/80 font-mono leading-relaxed">
              <strong className="text-indigo-300">INVERTED THINKING:</strong> OpenBadges specification compilation is mathematically suspended until the Conversion % breaches the economic threshold. Only justified pipelines will trigger a 1EdTech verification payload.
            </p>
          </div>
        </div>

        {/* Adaptation History & System Health */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent Adaptations */}
          <div className="bg-white/[0.02] backdrop-blur-2xl border border-white/[0.06] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5 text-zinc-100" />
                Recent Adaptations
              </h3>
              <span className="text-xs text-zinc-500">{adaptationHistory.length} decisions</span>
            </div>
            <div className="space-y-3">
              {adaptationHistory.map((entry, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white/[0.01] rounded-lg border border-white/[0.06]/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/[0.05] flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-zinc-100" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{entry.decision.replace(/_/g, ' ')}</div>
                      <div className="text-xs text-zinc-500">{entry.time}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-zinc-400">Confidence</div>
                    <div className={`text-sm font-bold ${entry.confidence > 0.9 ? 'text-emerald-400' : entry.confidence > 0.8 ? 'text-amber-400' : 'text-zinc-400'}`}>
                      {(entry.confidence * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Health Matrix */}
          <div className="bg-white/[0.02] backdrop-blur-2xl border border-white/[0.06] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-400" />
                System Health Matrix
              </h3>
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-emerald-400 font-medium">Healthy</span>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-zinc-400">Error Rate</span>
                  <span className={getHealthColor('error_rate', metrics.error_rate)}>{(metrics.error_rate * 100).toFixed(2)}%</span>
                </div>
                <div className="h-2 bg-[#050505] rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-500 ${metrics.error_rate > 0.05 ? 'bg-red-500' : metrics.error_rate > 0.03 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(metrics.error_rate * 1000, 100)}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-zinc-400">Circuit Breaker Trips</span>
                  <span className="text-sky-400">{metrics.circuit_breaker_trips}</span>
                </div>
                <div className="h-2 bg-[#050505] rounded-full overflow-hidden">
                  <div className="h-full bg-sky-500 transition-all duration-500" style={{ width: `${Math.min(metrics.circuit_breaker_trips * 10, 100)}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-zinc-400">Memory Usage</span>
                  <span className="text-fuchsia-400">{metrics.memory_mb.toFixed(0)} MB / 2000 MB</span>
                </div>
                <div className="h-2 bg-[#050505] rounded-full overflow-hidden">
                  <div className="h-full bg-fuchsia-500 transition-all duration-500" style={{ width: `${(metrics.memory_mb / 2000) * 100}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-zinc-400">Active Agents</span>
                  <span className="text-zinc-100">{metrics.active_agents} / 12</span>
                </div>
                <div className="h-2 bg-[#050505] rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${(metrics.active_agents / 12) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* OPEX Budget + Circuit-Breaker Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* OPEX Budget Authorization Panel */}
          <div className="bg-white/[0.02] backdrop-blur-2xl border border-white/[0.06] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                OPEX Test Budget
              </h3>
              <span className={`text-[10px] font-black uppercase px-2 py-1 rounded border ${opexGated ? 'text-red-400 border-red-500/30 bg-red-500/10' : opexUtilization >= 70 ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'}`}>
                {opexGated ? 'GATE CLOSED' : opexUtilization >= 70 ? 'REHEARSE' : 'GATE OPEN'}
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-xs text-zinc-400">
                <span>Allocated: <span className="text-white font-mono">${opexAllocated.toFixed(2)}</span></span>
                <span>Spent: <span className={`font-mono font-bold ${opexUtilization >= 95 ? 'text-red-400' : opexUtilization >= 70 ? 'text-amber-400' : 'text-emerald-400'}`}>${opexSpent.toFixed(2)}</span></span>
              </div>
              <div className="h-3 bg-[#050505] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${opexUtilization >= 95 ? 'bg-red-500' : opexUtilization >= 70 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(opexUtilization, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-zinc-500">
                <span>{opexUtilization.toFixed(1)}% utilization</span>
                <span>Remaining: <span className="text-white font-mono">${(opexAllocated - opexSpent).toFixed(2)}</span></span>
              </div>
              {/* Scenario multipliers */}
              <div className="grid grid-cols-4 gap-1 mt-2">
                {(['baseline', 'adverse', 'severe', 'critical'] as ScenarioBand[]).map((s, i) => {
                  const multipliers = [1.00, 1.25, 1.75, 2.50];
                  return (
                    <div key={s} className={`p-2 rounded-lg text-center border ${SCENARIO_COLORS[s]}`}>
                      <div className="text-[9px] uppercase font-bold">{s}</div>
                      <div className="text-[11px] font-mono font-black">{multipliers[i]}×</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Circuit-Breaker Session Utilization */}
          <div className="bg-white/[0.02] backdrop-blur-2xl border border-white/[0.06] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Shield className="w-5 h-5 text-sky-400" />
                Circuit Breaker / ADR-092
              </h3>
              <span className={`text-[10px] font-black uppercase px-2 py-1 rounded border ${cbUtilization >= 80 ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' : 'text-sky-400 border-sky-500/30 bg-sky-500/10'}`}>
                {cbCalls}/{cbMax} calls
              </span>
            </div>
            <div className="space-y-3">
              <div className="h-3 bg-[#050505] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${cbUtilization >= 80 ? 'bg-amber-400' : 'bg-sky-500'}`}
                  style={{ width: `${cbUtilization}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-zinc-500">
                <span>{cbUtilization.toFixed(0)}% session utilization</span>
                <span>{cbMax - cbCalls} calls remaining</span>
              </div>
              {/* Slow-edge thresholds per band */}
              <div className="mt-3 space-y-1">
                <div className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold mb-2">Slow-Edge Thresholds</div>
                {([['baseline', '2,000ms'], ['adverse', '4,000ms'], ['severe', '9,000ms'], ['critical', '15,000ms']] as const).map(([s, threshold]) => (
                  <div key={s} className="flex justify-between text-[10px]">
                    <span className={scenario === s ? 'text-white font-bold' : 'text-zinc-500'}>{s}</span>
                    <span className={`font-mono ${scenario === s ? 'text-sky-400 font-bold' : 'text-zinc-600'}`}>{threshold}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Swarm Increment Selector */}
        <div className="bg-white/[0.02] backdrop-blur-2xl border border-white/[0.06] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-fuchsia-400" />
              Swarm Increment Selector
              <span className="text-[10px] text-zinc-500 font-normal ml-1">Fake-Door Gated · .goalie/genuine_telemetry.json</span>
            </h3>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${opexGated ? 'bg-red-500 animate-pulse' : 'bg-emerald-500 animate-pulse'}`} />
              <span className="text-[10px] text-zinc-400">{opexGated ? 'Gate Blocked' : 'Ready to Trigger'}</span>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {(['baseline', 'adverse', 'severe', 'critical'] as SwarmIncrement[]).map(inc => {
              const isActive = swarmIncrement === inc;
              const costs = { baseline: '$5.00', adverse: '$6.25', severe: '$8.75', critical: '$12.50' };
              const descs = {
                baseline: 'Standard PEWMA · local edge · WSJF 5',
                adverse:  'Elevated load · cloud offload · WSJF 7',
                severe:   'High stress · density anomaly · WSJF 9',
                critical: 'Max load · LBEC denied · frugal · WSJF 10',
              };
              return (
                <button
                  key={inc}
                  onClick={() => setSwarmIncrement(inc)}
                  disabled={opexGated}
                  className={`p-4 rounded-xl border text-left transition-all ${isActive ? SCENARIO_COLORS[inc] : 'border-white/[0.05] bg-white/[0.01] text-zinc-500 hover:text-zinc-300 hover:border-white/10'} ${opexGated ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="text-xs font-black uppercase tracking-wider mb-1">{inc}</div>
                  <div className="text-[10px] leading-relaxed opacity-80">{descs[inc]}</div>
                  <div className="text-[11px] font-mono font-bold mt-2">{costs[inc]} / cycle</div>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-3 text-[10px] text-zinc-500">
            <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Fake-door dry-run active</span>
            <span>·</span>
            <span>Selected: <span className="text-white font-bold uppercase">{swarmIncrement}</span></span>
            <span>·</span>
            <span>BML: <span className={`font-bold ${opexGated ? 'text-red-400' : opexUtilization >= 70 ? 'text-amber-400' : 'text-emerald-400'}`}>{opexGated ? 'ITERATE' : opexUtilization >= 70 ? 'REHEARSE' : 'UNLEASH'}</span></span>
          </div>
        </div>

        {/* SA: Integration Tier + Circle Role + Vector Selector Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Integration Tier Selector */}
          <div className="bg-white/[0.02] backdrop-blur-2xl border border-white/[0.06] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-fuchsia-400" />
              <span className="text-white text-xs font-semibold">Integration Tier</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {([1,2,3,4] as IntegrationTier[]).map(t => {
                const labels = ['', 'URL Scheme', 'AppleScript', 'Live API'];
                const colors = ['', 'border-blue-500/30 text-blue-400', 'border-violet-500/30 text-violet-400', 'border-emerald-500/30 text-emerald-400', 'border-amber-500/30 text-amber-400'];
                return (
                  <button key={t} onClick={() => setIntegrationTier(t)}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      integrationTier === t ? colors[t] + ' bg-white/5' : 'border-white/[0.05] text-zinc-600 hover:text-zinc-400'
                    }`}>
                    <div className="text-[11px] font-black">T{t}</div>
                    <div className="text-[8px] leading-tight mt-0.5">{labels[t]}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Circle Role Selector */}
          <div className="bg-white/[0.02] backdrop-blur-2xl border border-white/[0.06] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-zinc-100" />
              <span className="text-white text-xs font-semibold">Circle Role</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {(['team-circle','circle-circle','institution-circle'] as CircleRole[]).map(r => {
                const colors: Record<CircleRole,string> = {
                  'team-circle': 'border-slate-500/40 text-zinc-300',
                  'circle-circle': 'border-indigo-500/40 text-zinc-100',
                  'institution-circle': 'border-fuchsia-500/40 text-fuchsia-400',
                };
                return (
                  <button key={r} onClick={() => setCircleRole(r)}
                    className={`px-2 py-1.5 rounded-lg border text-[10px] font-bold transition-all text-left ${
                      circleRole === r ? colors[r] + ' bg-white/5' : 'border-white/[0.05] text-zinc-600 hover:text-zinc-400'
                    }`}>
                    {r}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Vector Badge + Live Models */}
          <div className="bg-white/[0.02] backdrop-blur-2xl border border-white/[0.06] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <GitBranch className="w-4 h-4 text-sky-400" />
              <span className="text-white text-xs font-semibold">Vector / Live Models</span>
            </div>
            <div className="flex gap-1.5 mb-3">
              {(['code','clt','shared'] as VectorBadge[]).map(v => (
                <button key={v} onClick={() => setActiveVector(v)}
                  className={`px-2 py-1 rounded-lg border text-[10px] font-black uppercase transition-all ${
                    activeVector === v ? 'border-sky-500/40 text-sky-400 bg-sky-500/10' : 'border-white/[0.05] text-zinc-600 hover:text-zinc-400'
                  }`}>{v}</button>
              ))}
            </div>
            <div className="space-y-1.5">
              {liveModels.map(m => (
                <div key={m.name} className="flex items-center gap-2 text-[10px]">
                  <div className={`w-1.5 h-1.5 rounded-full ${ m.live ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
                  <Bot className="w-3 h-3 text-zinc-500" />
                  <span className="text-zinc-300 font-mono">{m.name}</span>
                  <span className="text-zinc-600 ml-auto">{m.host}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SA: Ledger Timeline + Undo */}
        <div className="bg-white/[0.02] backdrop-blur-2xl border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-400" />
              <span className="text-white text-xs font-semibold">Ceremony Ledger Timeline</span>
              <span className="text-[9px] text-zinc-600">.goalie/app-integration-ledger.ndjson · append-only</span>
            </div>
            <button
              onClick={() => {
                const last = ledgerEvents[ledgerEvents.length - 1];
                if (last) setLastRolledBack(last.id);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/30 text-amber-400 text-[10px] font-bold hover:bg-amber-500/10 transition-all"
            >
              <RotateCcw className="w-3 h-3" />
              Undo Last Action
            </button>
          </div>
          <div className="space-y-2">
            {ledgerEvents.slice().reverse().map(evt => {
              const isRolledBack = lastRolledBack === evt.id;
              const age = Math.round((Date.now() - evt.ts) / 1000);
              return (
                <div key={evt.id} className={`flex items-center gap-3 p-2 rounded-lg border text-[10px] transition-all ${
                  isRolledBack ? 'border-amber-500/30 bg-amber-500/5 opacity-50' : 'border-white/[0.05] bg-transparent'
                }`}>
                  <span className={`font-black px-1.5 py-0.5 rounded text-[9px] ${
                    evt.action === 'ROLLBACK' ? 'bg-amber-500/20 text-amber-400' : 'bg-white/[0.05] text-zinc-100'
                  }`}>{evt.action}</span>
                  <span className="text-zinc-400 font-mono truncate max-w-[140px]">{evt.appId.split('.').pop()}</span>
                  <span className="text-zinc-600">{evt.ceremony}</span>
                  <span className={`ml-auto font-mono ${ evt.scenario === 'baseline' ? 'text-emerald-400' : 'text-amber-400'}`}>{evt.scenario}</span>
                  <span className="text-slate-700">{age}s ago</span>
                  {isRolledBack && <span className="text-amber-400 font-bold">↩ ROLLED BACK</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Infrastructure Agentics [DR/HA] */}
        <div className="bg-white/[0.02] backdrop-blur-2xl border border-sky-500/20 rounded-2xl p-6 shadow-[0_0_30px_rgba(14,165,233,0.05)]">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Server className="w-5 h-5 text-sky-400" />
              Infrastructure Agentics · Zero-Trust Physical Data Layer [DR/HA]
            </h3>
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Execution Perimeter</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            
            <button className="group flex flex-col items-start text-left p-4 rounded-xl border border-white/[0.05] bg-[#050505]/50 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <HardDrive className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span className="text-white text-[11px] font-bold uppercase tracking-wider">Physical Sync</span>
              </div>
              <p className="text-[10px] text-zinc-500 mb-3">Pulls live CPanel/AWS backups locally via op injection.</p>
              <div className="text-[9px] font-mono text-zinc-600 mt-auto bg-black/40 px-1.5 py-0.5 rounded border border-white/5 group-hover:text-emerald-500/70 transition-colors">./cpanel_full_backup_sync.sh</div>
            </button>

            <button className="group flex flex-col items-start text-left p-4 rounded-xl border border-white/[0.05] bg-[#050505]/50 hover:border-violet-500/40 hover:bg-violet-500/5 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-violet-400 group-hover:scale-110 transition-transform" />
                <span className="text-white text-[11px] font-bold uppercase tracking-wider">Passbolt Vault</span>
              </div>
              <p className="text-[10px] text-zinc-500 mb-3">Playwright automated export of zero-trust keys to temporal RAM.</p>
              <div className="text-[9px] font-mono text-zinc-600 mt-auto bg-black/40 px-1.5 py-0.5 rounded border border-white/5 group-hover:text-violet-500/70 transition-colors">passbolt-export-workflow.ts</div>
            </button>

            <button className="group flex flex-col items-start text-left p-4 rounded-xl border border-white/[0.05] bg-[#050505]/50 hover:border-sky-500/40 hover:bg-sky-500/5 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <CloudLightning className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
                <span className="text-white text-[11px] font-bold uppercase tracking-wider">Deploy EKS</span>
              </div>
              <p className="text-[10px] text-zinc-500 mb-3">Zero-state AWS hardware re-provisioning phase gate.</p>
              <div className="text-[9px] font-mono text-zinc-600 mt-auto bg-black/40 px-1.5 py-0.5 rounded border border-white/5 group-hover:text-sky-500/70 transition-colors">./deploy_eks_infrastructure.sh</div>
            </button>

            <button className="group flex flex-col items-start text-left p-4 rounded-xl border border-white/[0.05] bg-[#050505]/50 hover:border-amber-500/40 hover:bg-amber-500/5 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <RotateCcw className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                <span className="text-white text-[11px] font-bold uppercase tracking-wider">Disaster Recovery</span>
              </div>
              <p className="text-[10px] text-zinc-500 mb-3">Decade-Restoration: Rehydrates DBs and IMAP states.</p>
              <div className="text-[9px] font-mono text-zinc-600 mt-auto bg-black/40 px-1.5 py-0.5 rounded border border-white/5 group-hover:text-amber-500/70 transition-colors">./omni_restore_decade.sh</div>
            </button>

            <button className="group flex flex-col items-start text-left p-4 rounded-xl border border-white/[0.05] bg-[#050505]/50 hover:border-fuchsia-500/40 hover:bg-fuchsia-500/5 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <Terminal className="w-4 h-4 text-fuchsia-400 group-hover:scale-110 transition-transform animate-pulse" />
                <span className="text-white text-[11px] font-bold uppercase tracking-wider">Loop Array</span>
              </div>
              <p className="text-[10px] text-zinc-500 mb-3">Engages the Swarm orchestrator for continuous telemetry.</p>
              <div className="text-[9px] font-mono text-zinc-600 mt-auto bg-black/40 px-1.5 py-0.5 rounded border border-white/5 group-hover:text-fuchsia-500/70 transition-colors">/loop (sensing)</div>
            </button>

            <button className="group flex flex-col items-start text-left p-4 rounded-xl border border-white/[0.05] bg-[#050505]/50 hover:border-orange-500/40 hover:bg-orange-500/5 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-orange-400 group-hover:scale-110 transition-transform" />
                <span className="text-white text-[11px] font-bold uppercase tracking-wider">Schedule Array</span>
              </div>
              <p className="text-[10px] text-zinc-500 mb-3">Engages the cron-bound deterministic routing boundaries.</p>
              <div className="text-[9px] font-mono text-zinc-600 mt-auto bg-black/40 px-1.5 py-0.5 rounded border border-white/5 group-hover:text-orange-500/70 transition-colors">/schedule (monitor)</div>
            </button>

          </div>

          <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4 pt-6 border-t border-white/[0.05]">
            <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-xl">
              <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-1">Local/Remote Backup</div>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-black text-white">100<span className="text-sm">%</span></span>
                <span className="text-xs text-emerald-500 mb-1">Coverage</span>
              </div>
              <div className="mt-2 text-[9px] text-emerald-500/70 font-mono flex flex-col gap-1">
                <span>LOCAL: .goalie/physical_cpanel_backups/</span>
                <span>REMOTE: AWS EKS / Hivelocity</span>
              </div>
            </div>

            <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl">
              <div className="text-[10px] text-amber-400 font-bold uppercase tracking-widest mb-1">Criticality Density</div>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-black text-white">99.9<span className="text-sm">%</span></span>
                <span className="text-xs text-amber-500 mb-1">SCD Type 2</span>
              </div>
              <div className="mt-2 text-[9px] text-amber-500/70 font-mono flex flex-col gap-1">
                <span>cpmove-systemic-20260423.tar.gz</span>
                <span>Data Quality: VERIFIED</span>
              </div>
            </div>

            <div className="bg-sky-500/5 border border-sky-500/20 p-4 rounded-xl col-span-2">
              <div className="text-[10px] text-sky-400 font-bold uppercase tracking-widest mb-2">DR/HA Control Capabilities</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] font-mono">
                <div className="flex justify-between items-center"><span className="text-zinc-400">Control Panel:</span> <span className="text-sky-300">Cpanel/WHM, Hostbill</span></div>
                <div className="flex justify-between items-center"><span className="text-zinc-400">Infrastructure:</span> <span className="text-sky-300">AWS, Hivelocity, STX</span></div>
                <div className="flex justify-between items-center"><span className="text-zinc-400">Email Pipeline:</span> <span className="text-sky-300">Direct Mail / macOS Local</span></div>
                <div className="flex justify-between items-center"><span className="text-zinc-400">DNS & Sites:</span> <span className="text-emerald-400">Fully Rehydratable</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Agile Ceremony Matrix + Email Channel */}
        <div className="bg-white/[0.02] backdrop-blur-2xl border border-white/[0.06] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-zinc-100" />
              Ceremony Matrix · Review / Retro / Replenish / Refine / Stand-up / PI Prep / Sync
            </h3>
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Circle Role Institution</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-2">
            {AGILE_CEREMONIES.sort((a, b) => b.wsjfScore - a.wsjfScore).map(ceremony => {
              const isActive = activeCeremony === ceremony.key;
              return (
                <button
                  key={ceremony.key}
                  onClick={() => setActiveCeremony(isActive ? null : ceremony.key)}
                  className={`p-3 rounded-xl border text-left transition-all ${isActive ? 'bg-white/[0.05] border-indigo-500/40' : 'border-white/[0.05] bg-white/[0.01] hover:border-white/10'}`}
                >
                  <div className="text-[9px] font-black uppercase tracking-wider text-white mb-1">{ceremony.label}</div>
                  <div className="text-[8px] text-zinc-500 mb-2 leading-tight">{ceremony.description}</div>
                  <div className="flex flex-col gap-1">
                    <span className={`text-[8px] px-1.5 py-0.5 rounded border font-bold ${CHANNEL_COLORS[ceremony.channel]}`}>{ceremony.channel}</span>
                    <span className={`text-[8px] font-bold ${ROLE_COLORS[ceremony.roleRequirement]}`}>{ceremony.roleRequirement}</span>
                    <span className="text-[8px] font-mono text-zinc-600">WSJF {ceremony.wsjfScore}</span>
                  </div>
                </button>
              );
            })}
          </div>
          {/* EML Preview for active ceremony */}
          {activeCeremony && (() => {
            const c = AGILE_CEREMONIES.find(x => x.key === activeCeremony)!;
            const bml = opexGated ? 'ITERATE' : opexUtilization >= 70 ? 'REHEARSE' : 'UNLEASH';
            return (
              <div className="mt-4 p-4 bg-[#000000]/50 backdrop-blur-xl border border-white/[0.05] rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <Mail className="w-4 h-4 text-zinc-100" />
                  <span className="text-xs font-bold text-white">Optimal One-Shot EML · {c.channel}</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded border font-bold ml-auto ${CHANNEL_COLORS[c.channel]}`}>{c.channel}</span>
                </div>
                <div className="font-mono text-[10px] space-y-1 text-zinc-300">
                  <div><span className="text-zinc-600">From:</span> orchestrator@agentic-flow.local</div>
                  <div><span className="text-zinc-600">To:</span> {c.roleRequirement}-circle@institution.local</div>
                  <div><span className="text-zinc-600">Subject:</span> [{scenario.toUpperCase()}] {c.label} — BML: {bml} | WSJF {c.wsjfScore}</div>
                  <div><span className="text-zinc-600">X-Scenario:</span> {scenario} | X-OPEX: {opexUtilization.toFixed(1)}% | X-PEWMA: {pewmaLatency.toFixed(1)}ms</div>
                  <div className="mt-2 pt-2 border-t border-white/[0.05] text-zinc-400 leading-relaxed">
                    {c.description}. Current anomaly density: {(anomalyScore * 100).toFixed(1)}%.
                    Swarm increment: {swarmIncrement.toUpperCase()}. RefinerAgent confidence: {(refinerConfidence * 100).toFixed(0)}%.
                    LBEC offload: {scenario === 'critical' ? 'denied (frugal)' : anomalyScore > 0.25 && scenario !== 'baseline' ? 'cloud tier' : 'local edge'}.
                    Decision: <span className={bml === 'UNLEASH' ? 'text-emerald-400' : bml === 'REHEARSE' ? 'text-amber-400' : 'text-red-400'}>{bml}</span>.
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* ROAM Risk Register (inline) */}
        {(() => {
          const bml = opexGated ? 'ITERATE' : opexUtilization >= 70 ? 'REHEARSE' : 'UNLEASH';
          const roamItems = [
            { id: 'r1', desc: 'LBEC offload denied — frugal mode', status: 'Owned',     wsjf: 9.0, visible: scenario === 'critical' },
            { id: 'r2', desc: `OPEX at ${opexUtilization.toFixed(1)}% — gate risk`,    status: 'Accepted',  wsjf: 10.0, visible: opexUtilization >= 85 },
            { id: 'r3', desc: `Anomaly density ${(anomalyScore*100).toFixed(1)}%`,     status: 'Owned',     wsjf: 8.5,  visible: anomalyScore > 0.4 && anomalyScore < 0.99 },
            { id: 'r4', desc: `CB at ${cbUtilization.toFixed(0)}% — nearing limit`,    status: 'Accepted',  wsjf: 7.5,  visible: cbUtilization > 75 },
            { id: 'r5', desc: `Data Spillage Blocked — Tier 1 Cross-Contamination`, status: 'Resolved', wsjf: 10.0, visible: scenario === 'critical' && anomalyScore >= 0.99 },
          ].filter(r => r.visible);
          if (roamItems.length === 0) return null;
          const statusColors: Record<string, string> = {
            Owned:    'border-amber-500/20 text-amber-400 bg-amber-500/5',
            Accepted: 'border-red-500/20 text-red-400 bg-red-500/5',
            Mitigated:'border-white/[0.08] text-zinc-100 bg-white/[0.02]',
          };
          return (
            <div className="bg-white/[0.02] backdrop-blur-2xl border border-amber-500/10 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4 text-amber-400" />
                <span className="text-white text-xs font-semibold">ROAM Risk Register · {bml} cycle</span>
                <span className="ml-auto text-[9px] text-zinc-600">{roamItems.length} active risks · sorted WSJF ↓</span>
              </div>
              <div className="space-y-2">
                {roamItems.sort((a,b) => b.wsjf - a.wsjf).map(r => (
                  <div key={r.id} className="flex items-center gap-3 px-3 py-2 bg-white/[0.02] border border-white/[0.05] rounded-lg">
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${statusColors[r.status] ?? ''}`}>{r.status}</span>
                    <span className="text-[10px] text-zinc-400 flex-1">{r.desc}</span>
                    <span className="text-[9px] font-mono font-black text-white">WSJF {r.wsjf}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Footer: BML Decision Recommendation */}
        {(() => {
          const bml = opexGated ? 'ITERATE' : opexUtilization >= 70 ? 'REHEARSE' : 'UNLEASH';
          const lbec = scenario === 'critical' ? 'denied (frugal)' : anomalyScore > 0.25 && scenario !== 'baseline' ? 'cloud tier' : 'local edge';
          const ESCALATE: Record<ScenarioBand, ScenarioBand> = { baseline:'adverse', adverse:'severe', severe:'critical', critical:'critical' };
          const DEESCALATE: Record<ScenarioBand, ScenarioBand> = { baseline:'baseline', adverse:'baseline', severe:'adverse', critical:'severe' };
          const nextScenario = bml === 'UNLEASH' ? ESCALATE[scenario] : bml === 'ITERATE' ? DEESCALATE[scenario] : scenario;
          const ceremonyPriority: Record<string, string> = { UNLEASH:'pi_prep → Daylite', REHEARSE:'review → Daylite', ITERATE:'retro → Direct Mail' };
          const bmlColors: Record<string, string> = { UNLEASH:'text-emerald-400 bg-emerald-500/20 border-emerald-500/30', REHEARSE:'text-amber-400 bg-amber-500/20 border-amber-500/30', ITERATE:'text-red-400 bg-red-500/20 border-red-500/30' };
          return (
            <div className="bg-gradient-to-br from-white/[0.03] via-white/[0.01] to-transparent border border-white/[0.08] rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-zinc-100" />
                Build-Measure-Learn Recommendation
              </h3>
              <div className="flex items-center gap-3 flex-wrap">
                <div className={`px-4 py-2 rounded-lg border ${bmlColors[bml]}`}>
                  <div className="text-xs opacity-70 mb-1">Decision</div>
                  <div className="text-lg font-bold">{bml}</div>
                </div>
                <div className="px-4 py-2 bg-white/[0.05] border border-white/[0.1] rounded-lg">
                  <div className="text-xs text-zinc-300 mb-1">Refiner Confidence</div>
                  <div className="text-lg font-bold text-zinc-100">{(refinerConfidence * 100).toFixed(0)}%</div>
                </div>
                <div className="px-4 py-2 bg-sky-500/20 border border-sky-500/30 rounded-lg">
                  <div className="text-xs text-sky-300 mb-1">LBEC Offload</div>
                  <div className="text-sm font-medium text-sky-400">{lbec}</div>
                </div>
                <div className="px-4 py-2 bg-fuchsia-500/20 border border-fuchsia-500/30 rounded-lg">
                  <div className="text-xs text-fuchsia-300 mb-1">Next Scenario</div>
                  <div className="text-sm font-bold text-fuchsia-400 uppercase">{nextScenario}</div>
                </div>
                <div className="px-4 py-2 bg-slate-800/60 border border-white/[0.05] rounded-lg">
                  <div className="text-xs text-zinc-500 mb-1">Next Ceremony</div>
                  <div className="text-sm font-medium text-zinc-300">{ceremonyPriority[bml]}</div>
                </div>
              </div>
              <p className="text-[10px] text-zinc-600 mt-3">
                Latency {metrics.latency_ms.toFixed(1)}ms · CPU {metrics.cpu_percent.toFixed(1)}% · anomaly {(anomalyScore*100).toFixed(1)}% · OPEX {opexUtilization.toFixed(1)}%
              </p>
            </div>
          );
        })()}
      </div>
    </PageTransition>
  );
}
