import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PageTransition } from '../App';
import { DirectMailValidator } from '../dashboard/components/DirectMailValidator';
import { ShieldAlert, BookOpen, Fingerprint } from 'lucide-react';


export function GovernanceCMS() {
  const [dor, setDor] = useState(`- [x] Node bounds formally defined.\n- [x] Telemetry hooks integrated via WSJF arrays.\n- [ ] Multi-Agent mapping approved by Council.\n\n# Law Firm Onboarding DoR\n- [ ] Firm specializes in De Novo Appeals & Multi-Jurisdictional Arbitration.\n- [ ] DirectMail HTML dispatch verified via Playwright visual sweep.\n- [ ] ROAM risks of zero trust data quality sent as necessary (no firm needs full 11.4GB payload).`);
  const [dod, setDod] = useState(`- [x] Playwright executed correctly.\n- [x] Panic Matrix properly integrated into UI.\n- [ ] UI bundle uploaded to CPanel Production.\n\n# Law Firm Onboarding DoD\n- [ ] Firm formally clears conflicts check.\n- [ ] Retainer agreement signed and telemetry recorded in ledger.\n- [ ] Blossom / Alternate Firm physically added to EKS whitelist bounds.`);
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitSuccess, setCommitSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/legal-matrix')
      .then(r => r.json())
      .then(data => {
        if (data.governance_bounds) {
          if (data.governance_bounds.dor) setDor(data.governance_bounds.dor);
          if (data.governance_bounds.dod) setDod(data.governance_bounds.dod);
        }
      })
      .catch(console.error);
  }, []);

  const handleCommit = async () => {
    setIsCommitting(true);
    setCommitSuccess(false);
    try {
      const res = await fetch('/api/governance/commit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ dor, dod })
      });
      if (res.ok) {
        setCommitSuccess(true);
        setTimeout(() => setCommitSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCommitting(false);
    }
  };
  return (
    <PageTransition title="Governance Admin">
      <div className="p-8 max-w-4xl max-h-[85vh] overflow-y-auto">
        <div className="bg-slate-900/80 backdrop-blur-2xl border border-rose-500/10 rounded-2xl p-8 mb-8 relative group overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[40px] rounded-full"></div>
           
           <div className="flex items-center gap-4 mb-6 relative">
              <ShieldAlert className="w-8 h-8 text-amber-500" />
              <div>
                <h2 className="text-xl font-light text-white tracking-wide">DoR / DoD Configuration Registry</h2>
                <p className="text-xs text-rose-500/60 font-mono mt-1">TLD AUTH GATEWAY: tag.ooo (Active Session)</p>
              </div>
           </div>

           <div className="space-y-6 relative">
              {/* DoR Definition Node */}
              <div className="border border-white/5 bg-white/[0.02] rounded-xl p-5 hover:border-amber-500/20 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm text-slate-300 font-semibold uppercase tracking-widest flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-400" />
                    Definition of Ready (DoR) Bounds
                  </h3>
                  <div className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono">
                    legal-matrix.json [DoR]
                  </div>
                </div>
                <textarea 
                  value={dor}
                  onChange={(e) => setDor(e.target.value)}
                  className="w-full bg-slate-950/40 border border-white/10 rounded-lg p-4 text-sm text-slate-300 font-mono outline-none focus:border-amber-500/50 transition-colors h-32"
                />
              </div>

              {/* DoD Definition Node */}
              <div className="border border-white/5 bg-white/[0.02] rounded-xl p-5 hover:border-rose-500/20 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm text-slate-300 font-semibold uppercase tracking-widest flex items-center gap-2">
                    <Fingerprint className="w-4 h-4 text-rose-400" />
                    Definition of Done (DoD) Checks
                  </h3>
                  <div className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 font-mono">
                    legal-matrix.json [DoD]
                  </div>
                </div>
                <textarea 
                  value={dod}
                  onChange={(e) => setDod(e.target.value)}
                  className="w-full bg-slate-950/40 border border-white/10 rounded-lg p-4 text-sm text-slate-300 font-mono outline-none focus:border-rose-500/50 transition-colors h-32"
                />
              </div>

              <div className="flex justify-end gap-4 mt-6 border-t border-white/5 pt-6">
                <motion.button 
                   onClick={() => window.location.reload()}
                   whileHover={{ scale: 1.02 }}
                   whileTap={{ scale: 0.98 }}
                   className="px-6 py-2 rounded-lg bg-white/5 text-slate-400 text-sm font-medium hover:bg-white/10 border border-white/10"
                >
                  Discard Overrides
                </motion.button>
                <motion.button 
                   onClick={handleCommit}
                   disabled={isCommitting}
                   whileHover={{ scale: 1.02 }}
                   whileTap={{ scale: 0.98 }}
                   className={`px-6 py-2 rounded-lg text-sm font-medium border relative overflow-hidden transition-colors ${
                     commitSuccess ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 
                     isCommitting ? 'bg-amber-500/10 text-amber-500/50 border-amber-500/20 cursor-not-allowed' :
                     'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 border-amber-500/40'
                   }`}
                >
                  <span className="relative z-10 font-bold tracking-wide">
                    {isCommitting ? 'COMMITTING...' : commitSuccess ? 'COMMITTED SUCCESSFULLY' : 'COMMIT GOVERNANCE DELTA'}
                  </span>
                </motion.button>
              </div>
           </div>
        </div>
        
        {/* DirectMail Validation Pipeline Integration */}
        <div className="mb-8">
          <DirectMailValidator />
        </div>
      </div>
    </PageTransition>
  )
}
