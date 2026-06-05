import { useState } from 'react';
import { PageTransition } from '../App';
import { Mail, CheckCircle, RefreshCw, Send, AlertTriangle, Smartphone, Monitor, Edit3, Save } from 'lucide-react';

export function DayliteDirectMailPreview() {
  const [deviceView, setDeviceView] = useState<'desktop' | 'mobile'>('desktop');
  const [isSending, setIsSending] = useState(false);
  const [dayliteCategories, setDayliteCategories] = useState([
    { id: '1', name: 'Hiring Manager (Tier 1)', count: 42, selected: true },
    { id: '2', name: 'Technical Recruiter', count: 128, selected: true },
    { id: '3', name: 'Venture Capital Partner', count: 15, selected: false },
    { id: '4', name: 'Alumni Network', count: 310, selected: false },
  ]);

  const [isEditingMode, setIsEditingMode] = useState(false);
  const [emailSubject, setEmailSubject] = useState('Connecting regarding Engineering Management Opportunities');
  const [emailIntro, setEmailIntro] = useState('I noticed your team at [Company Name] is scaling its engineering organization, and I wanted to reach out. I am an Engineering Manager specializing in building Agentic AI Infrastructure and high-throughput CI/CD pipelines.');
  const [emailClose, setEmailClose] = useState('I would love to connect to discuss how my background aligns with your current technical roadmap. Do you have 15 minutes next week for a brief introductory call?');

  const toggleCategory = (id: string) => {
    setDayliteCategories(cats => cats.map(c => c.id === id ? { ...c, selected: !c.selected } : c));
  };

  const handleSimulateDispatch = () => {
    setIsSending(true);
    setTimeout(() => setIsSending(false), 2000);
  };

  const totalSelected = dayliteCategories.filter(c => c.selected).reduce((acc, c) => acc + c.count, 0);

  return (
    <PageTransition title="DirectMail + Daylite Integration [EML PREVIEW]">
      <div className="p-8 space-y-6 relative max-w-[1600px] mx-auto">
        <div className="absolute top-0 inset-x-0 h-[600px] bg-gradient-to-b from-orange-500/10 via-fuchsia-500/5 to-transparent pointer-events-none -z-10" />

        <div className="flex items-center justify-between bg-white/[0.02] backdrop-blur-2xl border border-white/[0.06] p-6 rounded-2xl">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Mail className="w-6 h-6 text-orange-400" />
              HIRING-MANAGER-REFERRAL-REQUEST.eml
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              Edit and Validate HTML Upgrades against DirectMail parsing engine & Daylite Smart Lists.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditingMode(!isEditingMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border font-bold transition-all ${isEditingMode ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400' : 'bg-transparent border-white/[0.05] text-zinc-400 hover:bg-white/5'}`}
            >
              {isEditingMode ? <><Save className="w-4 h-4" /> Save Template</> : <><Edit3 className="w-4 h-4" /> Edit Content</>}
            </button>
            <div className="w-px h-10 bg-white/10 mx-2"></div>
            <button
              onClick={() => setDeviceView('desktop')}
              className={`p-2 rounded-lg border transition-all ${deviceView === 'desktop' ? 'bg-orange-500/20 border-orange-500/40 text-orange-400' : 'bg-transparent border-white/[0.05] text-zinc-500'}`}
            >
              <Monitor className="w-5 h-5" />
            </button>
            <button
              onClick={() => setDeviceView('mobile')}
              className={`p-2 rounded-lg border transition-all ${deviceView === 'mobile' ? 'bg-orange-500/20 border-orange-500/40 text-orange-400' : 'bg-transparent border-white/[0.05] text-zinc-500'}`}
            >
              <Smartphone className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Daylite Routing Bounds */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white/[0.02] backdrop-blur-2xl border border-white/[0.06] rounded-2xl p-6">
              <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                Daylite Smart List Routing
              </h3>
              <div className="space-y-3">
                {dayliteCategories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                      cat.selected ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-100' : 'bg-white/[0.01] border-white/[0.05] text-zinc-500 hover:border-white/10'
                    }`}
                  >
                    <span className="text-sm font-medium">{cat.name}</span>
                    <span className={`text-xs font-mono px-2 py-0.5 rounded ${cat.selected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-zinc-600'}`}>
                      {cat.count} contacts
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-white/[0.08]">
                <div className="flex justify-between text-sm mb-4">
                  <span className="text-zinc-400">Total Validated Audience:</span>
                  <span className="text-white font-bold bg-white/10 px-3 py-1 rounded-full">{totalSelected} recipients</span>
                </div>
                <button 
                  onClick={handleSimulateDispatch}
                  disabled={isSending || totalSelected === 0}
                  className={`w-full group flex justify-center items-center gap-3 py-4 rounded-xl font-bold transition-all duration-300 transform shadow-2xl ${
                    isSending 
                      ? 'bg-orange-500/50 text-white cursor-wait' 
                      : totalSelected > 0 
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black hover:scale-[1.02] active:scale-95' 
                        : 'bg-white/5 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  {isSending ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                  {isSending ? 'Syncing to DirectMail Engine...' : 'Commit to DirectMail Dispatch'}
                </button>
              </div>
            </div>

            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6">
              <h3 className="text-amber-400 font-semibold flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5" />
                ROAM Risk / Post-Condition
              </h3>
              <ul className="space-y-2 text-xs text-amber-200/70">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1 shrink-0" />
                  <span>Ensure Daylite tags exactly match DirectMail mapping keys.</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1 shrink-0" />
                  <span>AppleScript automation requires local execution perimeter (un-sandboxed).</span>
                </li>
              </ul>
            </div>
          </div>

          {/* EML Visual Render */}
          <div className={`lg:col-span-2 flex justify-center ${deviceView === 'mobile' ? 'px-12' : ''}`}>
            <div className={`w-full transition-all duration-500 ${deviceView === 'mobile' ? 'max-w-[400px]' : 'max-w-full'}`}>
              <div className="bg-white rounded-t-xl p-4 border-b border-zinc-200">
                <div className="flex gap-1.5 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                </div>
                <div className="text-zinc-500 text-xs font-mono space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-700 shrink-0">Subject:</span>
                    {isEditingMode ? (
                      <input type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} className="flex-1 bg-zinc-100 border-none outline-none px-2 py-1 rounded text-zinc-800 font-sans" />
                    ) : (
                      <span>{emailSubject}</span>
                    )}
                  </div>
                  <div><span className="font-bold text-zinc-700">From:</span> Shahrooz Bhopti &lt;sbhopti@gmail.com&gt;</div>
                  <div><span className="font-bold text-zinc-700">To:</span> [Daylite Dynamic Merge Tags]</div>
                </div>
              </div>
              <div className="bg-white p-8 rounded-b-xl min-h-[600px] shadow-2xl text-zinc-800">
                {/* Simulated Upgraded HTML Render */}
                <div className="max-w-2xl mx-auto space-y-5" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                  <p className="text-[15px] leading-relaxed">
                    Hi [First Name],
                  </p>
                  
                  {isEditingMode ? (
                    <textarea value={emailIntro} onChange={e => setEmailIntro(e.target.value)} rows={3} className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-[15px] outline-none focus:border-indigo-500" />
                  ) : (
                    <p className="text-[15px] leading-relaxed">{emailIntro}</p>
                  )}
                  
                  {/* HTML Upgrade: Metric Block */}
                  <div className="bg-gradient-to-br from-indigo-50/50 to-white border border-indigo-100 p-6 rounded-xl my-6 shadow-sm">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-600/80 mb-4 flex items-center gap-2">
                      <Monitor className="w-4 h-4" />
                      Recent Architectural Wins
                    </h4>
                    <ul className="space-y-4">
                      <li className="flex items-start gap-3 group">
                        <div className="bg-emerald-100 p-1 rounded mt-0.5 group-hover:scale-110 transition-transform"><CheckCircle className="w-3.5 h-3.5 text-emerald-600" /></div>
                        <span className="text-[15px] text-zinc-700 leading-relaxed">Architected a <strong>Zero-Trust MAPE-K Swarm</strong>, reducing operational cycle times by 80%.</span>
                      </li>
                      <li className="flex items-start gap-3 group">
                        <div className="bg-emerald-100 p-1 rounded mt-0.5 group-hover:scale-110 transition-transform"><CheckCircle className="w-3.5 h-3.5 text-emerald-600" /></div>
                        <span className="text-[15px] text-zinc-700 leading-relaxed">Implemented <strong>100% Visual Sweep Automation</strong> via Playwright, eliminating CI/CD completion theater.</span>
                      </li>
                      <li className="flex items-start gap-3 group">
                        <div className="bg-emerald-100 p-1 rounded mt-0.5 group-hover:scale-110 transition-transform"><CheckCircle className="w-3.5 h-3.5 text-emerald-600" /></div>
                        <span className="text-[15px] text-zinc-700 leading-relaxed">Engineered a <strong>Physical Data Sovereignty Mesh</strong> across AWS & Hivelocity edge nodes.</span>
                      </li>
                    </ul>
                  </div>

                  {isEditingMode ? (
                    <textarea value={emailClose} onChange={e => setEmailClose(e.target.value)} rows={3} className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-[15px] outline-none focus:border-indigo-500" />
                  ) : (
                    <p className="text-[15px] leading-relaxed">{emailClose}</p>
                  )}
                  
                  {/* HTML Upgrade: Premium CTA */}
                  <div className="pt-4 pb-2">
                    <a href="https://calendly.com/sbhopti" className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg text-sm transition-colors decoration-none">
                      Schedule a 15-Min Sync
                    </a>
                  </div>

                  <p className="text-[15px] leading-relaxed pt-4">
                    Best regards,<br/>
                    <strong>Shahrooz Bhopti</strong><br/>
                    <span className="text-sm text-zinc-500">Engineering Manager | Agentic Infrastructure</span><br/>
                    <a href="https://linkedin.com/in/sbhopti" className="text-indigo-600 text-sm">linkedin.com/in/sbhopti</a>
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </PageTransition>
  );
}
