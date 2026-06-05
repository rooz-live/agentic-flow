import { motion } from 'framer-motion';

import { PageTransition } from '../App';
import { Network, ArrowRight, ShieldCheck, Cpu, Anchor, Briefcase, Zap } from 'lucide-react';


export function ClientAdvisoryOnboarding() {
  return (
    <PageTransition title="Strategic Value Optimization">
      <div className="p-8 max-w-5xl mx-auto font-sans">
        
        {/* Hero Advisory Banner */}
        <div className="relative border border-fuchsia-500/20 bg-[#0a0a0a] rounded-[2rem] p-10 mb-10 overflow-hidden group shadow-[0_20px_60px_-15px_rgba(217,70,239,0.1)]">
          <div className="absolute top-0 right-0 w-96 h-96 bg-fuchsia-500/10 blur-[100px] rounded-full pointer-events-none transition-all duration-700 group-hover:bg-fuchsia-400/20" />
          <div className="absolute bottom-0 left-[-20%] w-[500px] h-[500px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row gap-10 items-center justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-400 text-[10px] font-black uppercase tracking-[0.2em] mb-6">
                <Network className="w-3 h-3" />
                <span>Agentic Advisory Matrix</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-light text-white mb-6 leading-tight tracking-tight">
                Execute Impactful Results <br/>
                <span className="text-fuchsia-400/80 italic font-serif">Within Luxurious Boundaries.</span>
              </h2>
              <p className="text-lg text-slate-400 leading-relaxed max-w-xl font-light">
                Leveraging lean foundations in Agile methodologies and Data Analytics to optimize product teams, programs, and enterprise portfolios at scale.
              </p>
            </div>
            
            {/* CTA Sync Vector */}
            <div className="shrink-0">
              <a 
                href="https://cal.rooz.live" 
                target="_blank" 
                rel="noreferrer" 
                className="group/btn relative inline-flex items-center justify-center"
                onClick={async (e) => {
                  e.preventDefault();
                  try {
                    await fetch('/api/mapek/telemetry', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'X-Scenario': 'baseline',
                        'X-BML': 'UNLEASH'
                      },
                      body: JSON.stringify({
                        type: 'mapek_onboarding_capture',
                        wsjf_priority: 9.5,
                        timestamp: new Date().toISOString(),
                        vector: 'advisory',
                        target: 'cal.rooz.live'
                      })
                    });
                  } catch (err) {
                    console.warn('[MAPE-K] Telemetry dispatch degraded:', err);
                  }
                  window.open('https://cal.rooz.live', '_blank');
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-600 to-indigo-600 rounded-2xl blur-lg opacity-40 group-hover/btn:opacity-100 transition-opacity duration-500" />
                <div className="relative flex items-center gap-3 bg-[#0f0f0f] border border-white/10 text-white px-8 py-4 rounded-2xl group-hover/btn:border-fuchsia-500/50 transition-colors">
                  <span className="font-semibold tracking-wide">Sync External Port</span>
                  <ArrowRight className="w-5 h-5 text-fuchsia-400 group-hover/btn:translate-x-1 transition-transform" />
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Structural Capabilities Array */}
        <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500 mb-6 pl-2 border-l border-fuchsia-500/50">Engagement Verticals</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          
          {[
            { icon: Briefcase, title: 'Portfolio Architecture', desc: 'Holistic restructuring of enterprise value streams enforcing WSJF prioritization loops.', color: 'emerald' },
            { icon: Zap, title: 'Agile Acceleration', desc: 'Deploying high-frequency deployment boundaries bypassing localized resistance zones.', color: 'fuchsia' },
            { icon: ShieldCheck, title: 'Risk Neutralization', desc: 'Mapping ROAM pipelines and establishing proactive circuit breakers against systemic drift.', color: 'indigo' },
          ].map((item, i) => (
            <motion.div 
              key={i}
              whileHover={{ y: -5 }}
              className="bg-[#050505] border border-white/5 hover:border-white/10 rounded-3xl p-8 relative overflow-hidden group/card shadow-2xl"
            >
              <div className={`absolute top-0 right-0 w-32 h-32 blur-[60px] rounded-full opacity-0 group-hover/card:opacity-100 transition-opacity bg-${item.color}-500/20`} />
              <item.icon className={`w-8 h-8 text-${item.color}-400 mb-6 opacity-80`} />
              <h4 className="text-xl text-white font-medium mb-3">{item.title}</h4>
              <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Boundary Declaration */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-6 flex items-start gap-4 shadow-inner">
          <Anchor className="w-6 h-6 text-amber-500 shrink-0 mt-1" />
          <p className="text-sm text-slate-400 leading-relaxed font-mono">
            // ADVISORY NOTE: <br/>
            Services operate distinctly within advisory boundaries. Formal consultative assessments are structurally blocked without accepted Request Parameters in effect. Pre-sync validation required via TAG.VOTE authority matrix.
          </p>
        </div>

      </div>
    </PageTransition>
  );
}
