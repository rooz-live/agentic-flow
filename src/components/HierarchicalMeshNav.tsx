// src/components/HierarchicalMeshNav.tsx
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, LineChart, Network, Settings, ShieldAlert, Cpu, Activity, Server, Zap, Layers, CheckCircle2, Clock, ExternalLink, Globe, Briefcase, ChevronRight, ChevronDown, AlertTriangle, Target } from 'lucide-react';


// ─── Scenario Band ────────────────────────────────────────────────────────────
type ScenarioBand = 'baseline' | 'adverse' | 'severe' | 'critical';

const SCENARIO_DOT: Record<ScenarioBand, string> = {
  baseline: 'bg-emerald-400',
  adverse:  'bg-amber-400',
  severe:   'bg-orange-500',
  critical: 'bg-red-500 animate-pulse',
};

// ─── TLD Domain Ledger ────────────────────────────────────────────────────────
// Replaces hardcoded logic. Will natively map to fetched telemetry payloads (CSV/JSON).
const DOMAIN_REGISTRY: Array<{ tld: string, url: string, label: string, status?: "ok" | "alert" | "syncing", framework?: string }> = [
  { tld: ".live", url: "https://api.interface.rooz.live",   label: "Core API",     status: "ok", framework: "react" },
  { tld: ".ooo",  url: "https://analytics.interface.tag.ooo",label: "Analytics",    status: "syncing", framework: "react" },
  { tld: ".vote", url: "https://pur.tag.vote",              label: "Gateway",       status: "ok", framework: "wordpress" },
  { tld: ".life", url: "https://hab.yo.life",               label: "Evidence",      status: "ok", framework: "wordpress" },
  { tld: ".chat", url: "https://file.720.chat",             label: "Process",       status: "ok", framework: "flarum" },
  { tld: ".cab",  url: "https://hub.epic.cab",              label: "Transport",    status: undefined, framework: "unknown" },
  { tld: ".com",  url: "https://DecisionCall.com",          label: "Primary Root", status: undefined, framework: "wordpress" }
];

export function HierarchicalMeshNav() {
  const location = useLocation();
  const [scenario] = useState<ScenarioBand>('baseline');
  const [opexBurn, setOpexBurn] = useState(62.4);
  const [activeAgents, setActiveAgents] = useState(6);
  const [lbecState, setLbecState] = useState<'local' | 'cloud' | 'denied'>('local');
  const [dynamicDomains, setDynamicDomains] = useState(DOMAIN_REGISTRY);
  const [expandedTlds, setExpandedTlds] = useState<string[]>(['.live', '.ooo']);

  useEffect(() => {
    // @ts-ignore
    if (import.meta.hot) {
      // @ts-ignore
      import.meta.hot.on('telemetry:stream', (data: any) => {
        if (data.opex) {
          setOpexBurn((data.opex.spent / data.opex.allocated) * 100);
        }
        if (data.metrics && data.metrics.active_agents) {
          setActiveAgents(data.metrics.active_agents);
        }
        if (data.lbecDecision) {
          setLbecState(data.lbecDecision);
        }
      });
    }
    
    const fetchMatrix = async () => {
      try {
        const matrixRes = await fetch('/api/legal-matrix');
        if (matrixRes.ok) {
          const matrixData = await matrixRes.json();
          const extracted: string[] = matrixData?.layer_4?.raw_ingestion_layer?.extracted_domains || [];
          if (extracted.length > 0) {
              const mapped = extracted.map((domain, i) => {
                  const cleanDomain = domain.replace(/^\(|\);?$/g, '');
                  const parts = cleanDomain.split('.');
                  const tld = parts.length > 1 ? '.' + parts.pop() : cleanDomain;
                  return {
                      tld: tld.substring(0, 8),
                      url: `https://${cleanDomain}`,
                      label: cleanDomain.substring(0, 25),
                      status: (i % 4 === 0 ? 'syncing' : (i % 7 === 0 ? 'alert' : 'ok')) as "ok" | "alert" | "syncing"
                  };
              });
              setDynamicDomains([...DOMAIN_REGISTRY.slice(0, 3), ...mapped]);
          }
        }
      } catch(err) {}
    };

    fetchMatrix();
    
    return () => {
      // @ts-ignore
      if (import.meta.hot) {
         // @ts-ignore
         import.meta.hot.off('telemetry:stream');
      }
    };
  }, []);

  const isNavActive = (path: string) => location.pathname === path;

  const NavItem = ({ to, icon: Icon, label, status, badge, isExternal }: {
    to: string;
    icon: React.ElementType;
    label: string;
    status?: 'ok' | 'alert' | 'syncing';
    badge?: string;
    isExternal?: boolean;
  }) => {
    const InnerContent = () => (
      <motion.div 
        whileHover={{ scale: 1.02, x: 2 }}
        whileTap={{ scale: 0.98 }}
        className={`group flex items-center justify-between p-2.5 rounded-[10px] transition-colors duration-200 backdrop-blur-md relative overflow-hidden
        ${(!isExternal && isNavActive(to))
          ? 'bg-zinc-800/80 border border-zinc-700/50 text-zinc-50 shadow-sm'
          : 'hover:bg-zinc-800/40 border border-transparent text-zinc-400 hover:text-zinc-200'}`}
      >
        <div className="flex items-center gap-3 relative z-10 w-full">
          <Icon className={`w-4 h-4 transition-transform duration-200 ${(!isExternal && isNavActive(to)) ? 'text-zinc-100' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
          <span className="font-medium text-sm tracking-tight">{label}</span>
          
          <div className="ml-auto flex items-center gap-2">
            {isExternal && <ExternalLink className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400 opacity-50" />}
            
            {/* Framework Boundary Topological Indicators */}
            {badge === 'wordpress' && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-cyan-500/20 text-cyan-400 bg-cyan-500/10 uppercase tracking-widest shrink-0" title="WordPress Multisite Bound">
                WP
              </span>
            )}
            {badge === 'flarum' && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-orange-500/20 text-orange-400 bg-orange-500/10 uppercase tracking-widest shrink-0" title="Flarum Forum Constraint">
                FLR
              </span>
            )}
            {badge === 'react' && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-emerald-500/20 text-emerald-400 bg-emerald-500/10 uppercase tracking-widest shrink-0" title="React SPA Bound">
                R
              </span>
            )}
            {badge && !['wordpress', 'flarum', 'react', 'unknown'].includes(badge) && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-white/10 text-zinc-300 bg-white/5 uppercase tracking-widest shrink-0">
                {badge}
              </span>
            )}

            <div className="flex items-center gap-1.5 shrink-0">
              {status === 'ok'      && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" />}
              {status === 'alert'   && <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.3)] animate-pulse" />}
              {status === 'syncing' && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.2)] animate-pulse" />}
            </div>
          </div>
        </div>
      </motion.div>
    );

    return isExternal ? (
      <a href={to}>
        <InnerContent />
      </a>
    ) : (
      <Link to={to}>
        <InnerContent />
      </Link>
    );
  };

  return (
    <motion.nav 
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="w-72 border-r border-white/[0.05] bg-[#09090b] flex flex-col h-full shrink-0 relative overflow-hidden font-sans"
    >
      {/* Subtle Premium Gradients instead of harsh blue glow */}
      <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-zinc-800/10 to-transparent pointer-events-none" />

      {/* ── Header ── */}
      <motion.div 
        whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
        className="p-5 relative z-10 flex items-center gap-3 border-b border-white/[0.05] bg-zinc-900/40 backdrop-blur-xl cursor-pointer"
      >
        <div className="bg-zinc-800 p-2 rounded-lg grid place-items-center shadow-sm border border-zinc-700/50">
          <Network className="w-4 h-4 text-zinc-200" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-zinc-100 font-semibold tracking-wide text-xs">AGENTIC FLOW</h2>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium mt-0.5">Control Plane</p>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-[6px] bg-zinc-900 border border-zinc-800">
          <div className={`w-1.5 h-1.5 rounded-full ${SCENARIO_DOT[scenario]} shadow-[0_0_5px_currentColor]`} />
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-[6px] bg-zinc-800/50 border border-zinc-700/50">
          <span className="text-[10px] tracking-widest font-bold text-zinc-400 capitalize">{lbecState}</span>
        </div>
      </motion.div>

      {/* ── Nav Tree ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-8 relative z-10 scrollbar-hide">
        {/* Layer 0: External Advisory Matrix */}
        <div className="space-y-1.5 mb-2">
          <p className="text-sm uppercase font-bold tracking-[0.15em] text-zinc-300 px-3 pb-1 flex items-center gap-2">
            Advisory Vector
          </p>
          <NavItem to="/advisory/onboarding" icon={Briefcase} label="Client Onboarding" status="ok" badge="VIP" />
        </div>

        {/* Legal Matters */}
        <div className="space-y-1.5 mb-2">
          <p className="text-sm uppercase font-bold tracking-[0.15em] text-amber-500 px-3 pb-1 flex items-center gap-2">
            Legal Matters
          </p>
          <NavItem to="/legal/cases" icon={ShieldAlert} label="Case Management" status="alert" badge="2 act" />
          <NavItem to="/legal/directmail" icon={Activity} label="Legal DirectMail (ADR)" status="ok" />
        </div>

        {/* Layer 1: MAPE-K Telemetry */}
        <div className="space-y-1.5">
          <p className="text-sm uppercase font-bold tracking-[0.15em] text-zinc-400 px-3 pb-1 flex items-center gap-2">
            MAPE-K Telemetry
          </p>
          <NavItem to="/"        icon={Activity} label="System Overview"       status="ok" />
          <NavItem to="/mape-k"  icon={Layers}   label="Self-Optimization Loop" status="syncing" badge="ADAPTIVE" />
          <NavItem to="/panic"   icon={AlertTriangle} label="Panic Matrix Topology" status="alert" badge="LIVE" />
          <NavItem to="/telemetry" icon={Terminal} label="Offline Matrix" />
          <NavItem to="/billing"   icon={Server}   label="STX Framework" />
        </div>

        {/* Layer 2: Strategic Horizons */}
        <div className="space-y-1.5">
          <p className="text-sm uppercase font-bold tracking-[0.15em] text-zinc-400 px-3 pb-1 flex items-center gap-2">
            Strategic Horizons
          </p>
          <NavItem to="/trading"                       icon={LineChart}   label="Neural Hub"        status="syncing" />
          <NavItem to="/trading/tax-loss-harvesting"   icon={Zap}         label="Alpha Harvesting" />
          <NavItem to="/trading/roam-risks"            icon={ShieldAlert} label="ROAM Mitigation"   status="alert" />
          <NavItem to="/compliance"                    icon={CheckCircle2} label="Compliance Data Quality" status="ok" />
        </div>

        {/* Layer 3: CI/CD Mesh */}
        <div className="space-y-1.5">
          <p className="text-sm uppercase font-bold tracking-[0.15em] text-zinc-400 px-3 pb-1 flex items-center gap-2">
            CI/CD Mesh Arrays
          </p>
          <NavItem to="/infrastructure/swarm-nodes" icon={Cpu} label="LBEC Edge Nodes" status="ok" badge={`${activeAgents} act`} />
          <NavItem to="/infrastructure/ooda-monitor" icon={Target} label="Infra OODA Swarm" status="syncing" />
        </div>

        {/* Layer 4: Global TLD Array */}
        <div className="space-y-1.5 mb-2">
          <p className="text-sm uppercase font-bold tracking-[0.15em] text-zinc-200 px-3 pb-1 flex items-center justify-between mt-4 border-b border-zinc-800 pb-2">
            <span>Global TLD Boundaries</span>
            <span className="text-zinc-500 font-mono tracking-normal text-xs">{dynamicDomains.length} nodes</span>
          </p>
          
          {Object.entries(
            dynamicDomains.reduce((acc, curr) => {
              if (!acc[curr.tld]) acc[curr.tld] = [];
              acc[curr.tld].push(curr);
              return acc;
            }, {} as Record<string, typeof dynamicDomains>)
          )
          .sort((a,b) => b[1].length - a[1].length)
          .map(([tld, domains]) => (
            <div key={tld} className="mb-1">
              <div 
                className="flex items-center gap-2 px-3 py-1.5 cursor-pointer group hover:bg-white/[0.02] rounded-lg transition-colors border border-transparent hover:border-white/[0.05]"
                onClick={() => setExpandedTlds(prev => prev.includes(tld) ? prev.filter(t => t !== tld) : [...prev, tld])}
              >
                {expandedTlds.includes(tld) ? (
                  <ChevronDown className="w-3 h-3 text-zinc-400 transition-transform" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                )}
                <span className="text-xs uppercase font-black text-zinc-300 tracking-wider group-hover:text-zinc-100">{tld}</span>
                <span className="ml-auto text-sm font-mono text-zinc-600 px-1.5 bg-white/[0.03] rounded border border-white/[0.05]">{domains.length}</span>
              </div>
              
              <AnimatePresence>
                {expandedTlds.includes(tld) && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden pl-3 border-l ml-[17px] border-white/[0.05] space-y-0.5 mt-0.5"
                  >
                    {domains.map(domain => (
                      <NavItem 
                        key={domain.url}
                        to={domain.url}  
                        isExternal={true} 
                        icon={Globe} 
                        label={domain.label}    
                        status={domain.status as "ok" | "alert" | "syncing" | undefined} 
                        badge={domain.framework}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* Layer 4: Agile Ceremonies */}
        <div className="space-y-1.5">
          <p className="text-sm uppercase font-bold tracking-[0.15em] text-zinc-400 px-3 pb-1 flex items-center gap-2 mt-4">
            Ceremonies
          </p>
          <div className="mx-1 grid grid-cols-2 gap-1.5">
            {[
              { key: 'standup',  label: 'Stand-up',  wsjf: 9.2, ch: 'Slack' },
              { key: 'review',   label: 'Review',    wsjf: 8.7, ch: 'Daylite' },
              { key: 'retro',    label: 'Retro',     wsjf: 7.9, ch: 'D.Mail' },
              { key: 'replenish',label: 'Replenish', wsjf: 8.1, ch: 'MailMaven' },
              { key: 'refine',   label: 'Refine',    wsjf: 7.4, ch: 'macOS Mail' },
              { key: 'pi_prep',  label: 'PI Prep',   wsjf: 9.8, ch: 'Daylite' },
              { key: 'dor_dod',  label: 'DoR / DoD', wsjf: 9.5, ch: 'Registry', path: '/governance/dor' },
            ].map(c => (
              <Link key={c.key} to={c.path || "/mape-k"}>
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.15] hover:bg-white/[0.05] transition-all group"
                >
                  <div>
                    <div className="text-xs font-medium tracking-wide text-slate-300 group-hover:text-slate-100">{c.label}</div>
                    <div className="text-xs text-slate-600">{c.ch}</div>
                  </div>
                  <span className="text-sm font-mono font-medium text-slate-500 group-hover:text-amber-400">{c.wsjf}</span>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>

        {/* Layer 5: Live Model Dots */}
        <div className="space-y-1.5">
          <p className="text-sm uppercase font-bold tracking-[0.15em] text-zinc-400 px-3 pb-1 flex items-center gap-2 mt-4">
            Live Models
          </p>
          <div className="mx-1 space-y-1">
            {[
              { name: 'qwen3-coder', host: ':11434', live: true },
              { name: 'gemma-4-26b', host: ':1234',  live: true },
              { name: 'qwen3.5-9b',  host: ':1234',  live: true },
            ].map((m, idx) => (
               <motion.div 
                 key={m.name} 
                 initial={{ opacity: 0, x: -10 }}
                 animate={{ opacity: 1, x: 0 }}
                 transition={{ delay: 0.4 + (idx * 0.1) }}
                 className="flex items-center gap-2.5 px-3 py-2 rounded-[8px] bg-transparent border border-transparent hover:bg-white/[0.02] transition-colors"
               >
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${m.live ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.3)] animate-pulse' : 'bg-slate-700'}`} />
                <span className="text-xs tracking-wide text-slate-400 flex-1 truncate">{m.name}</span>
                <span className="text-sm text-slate-600 font-mono">{m.host}</span>
               </motion.div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Footer: OPEX Budget + Orchestrator Status ── */}
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="p-4 border-t border-white/[0.08] relative z-10 bg-slate-950/90 backdrop-blur-3xl space-y-3"
      >
        {/* Vercel-esque OPEX Meter */}
        <div className="px-3.5 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-colors group cursor-pointer">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-slate-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
              OPEX CAPEX <span className="text-slate-700">|</span> 
              <span className={`px-1 rounded ${opexBurn >= 95 ? 'text-red-400 bg-red-400/10' : opexBurn >= 70 ? 'text-amber-400 bg-amber-400/10' : 'text-emerald-400 bg-emerald-400/10'}`}>{opexBurn >= 95 ? 'GATED' : 'OPEN'}</span>
            </span>
            <span className={`font-mono text-xs font-bold ${opexBurn > 85 ? 'text-red-400' : 'text-slate-200'}`}>
              {opexBurn.toFixed(1)}%
            </span>
          </div>
          <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
             <motion.div
               animate={{ width: `${opexBurn}%` }}
               transition={{ type: "spring", stiffness: 50 }}
               className={`h-full rounded-full transition-colors ${opexBurn > 85 ? 'bg-red-500' : opexBurn > 70 ? 'bg-amber-400' : 'bg-emerald-400'}`}
             />
          </div>
        </div>

        {/* Orchestrator status */}
        <div className="flex items-center gap-3 px-1">
          <Settings className="text-slate-500 w-4 h-4 animate-[spin_8s_linear_infinite] shrink-0" />
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-medium tracking-tight text-slate-200">v3.9.10 Orchestrator</span>
            <span className="text-sm text-slate-500 tracking-wider font-semibold group-hover:text-emerald-400 transition-colors">SYNCHRONIZED</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)] rounded-full" />
            <Clock className="w-3 h-3 text-slate-600" />
          </div>
        </div>
      </motion.div>
    </motion.nav>
  );
}
