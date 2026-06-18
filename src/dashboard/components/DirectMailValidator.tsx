import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clipboard, BrainCircuit, RefreshCw } from 'lucide-react';

import { DIRECT_MAIL_SCENARIOS, DirectMailScenarioConfig, RuleVector } from './directmail-rules';

type Scenario = 'MAA_DENOVO' | 'TITLE_IX' | 'DAY1099' | 'GENERAL' | 'HIRING_REFERRAL';

type ValidationResult = {
  status: 'IDLE' | 'PASS' | 'FAIL' | 'WARNING';
  logs: string[];
  suggestions: string[];
  links: string[];
  upgradedEml: string;
};

export function DirectMailValidator() {
  const [scenario, setScenario] = useState<Scenario>('MAA_DENOVO');
  const [contextGroup, setContextGroup] = useState<string>('');
  const [result, setResult] = useState<ValidationResult>({ status: 'IDLE', logs: [], suggestions: [], links: [], upgradedEml: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  const handleNativePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    setIsProcessing(true);
    setHasContent(true);
    setResult({ status: 'IDLE', logs: [], suggestions: [], links: [], upgradedEml: '' });

    setTimeout(() => {
      if (!editorRef.current) return;
      const htmlText = editorRef.current.innerHTML;
      const plainText = editorRef.current.innerText;
      runValidation(plainText, htmlText, scenario);
    }, 50);
  };

  const clearBuffer = () => {
    if (editorRef.current) editorRef.current.innerHTML = '';
    setHasContent(false);
    setResult({ status: 'IDLE', logs: [], suggestions: [], links: [], upgradedEml: '' });
  };

  const runValidation = (text: string, html: string, activeScenario: Scenario) => {
    const logs: string[] = [];
    const suggestions: string[] = [];
    const links: string[] = [];
    let upgradedEml = '';
    let hasFailures = false;

    // --- HTML LINK EXTRACTION ---
    if (html) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const anchors = doc.querySelectorAll('a');
      anchors.forEach(a => {
        if (a.href && !links.includes(a.href)) {
           links.push(a.href);
        }
      });
    }

    // --- DYNAMIC SCENARIO MATRIX ---
    logs.push(`Executing Pass 1: Deterministic Constraints for [${activeScenario}]...`);
    
    const config = DIRECT_MAIL_SCENARIOS[activeScenario];
    if (config) {
      config.vectors.forEach((vector: RuleVector) => {
        const match = text.match(vector.pattern);
        if (match) {
          const finalMessage = vector.message.replace('[MATCH]', match[0]);
          logs.push(finalMessage);
          if (vector.severity === '🔴') hasFailures = true;
        }
      });

      // Agentic / Cross-check pass
      logs.push("Executing Pass 2: Agentic Capability Review...");
      if (config.crossCheckRequirements && config.crossCheckRequirements.length > 0) {
         const missing = config.crossCheckRequirements.filter(req => !text.toLowerCase().includes(req));
         if (missing.length === config.crossCheckRequirements.length) {
            suggestions.push(`⚠️ WARNING: This message lacks expected context for: ${config.crossCheckRequirements.join(', ')}.`);
         }
      }
    }

    if (links.some(l => l.includes('localhost') || l.includes('127.0.0.1') || l.includes('staging'))) {
      suggestions.push("⚠️ WARNING: Detected internal/staging links in draft payload. External delivery may break.");
    }
    
    if (!hasFailures && text.length > 10) {
      upgradedEml = "MIME-Version: 1.0\r\nContent-Type: text/html; charset=utf-8\r\n\r\n" +
        "<html><body>\n" +
        (contextGroup ? `<p><strong>Context Group:</strong> ${contextGroup}</p>\n` : "") +
        `<p>${text.replace(/\\n/g, '<br/>')}</p>\n` +
        "<br/><p><em>[Synthesized & Upgraded by Agentic Flow]</em></p>\n" +
        "</body></html>";
    }

    setTimeout(() => {
      setResult({
        status: hasFailures ? 'FAIL' : (suggestions.some(s => s.includes('WARNING')) ? 'WARNING' : 'PASS'),
        logs,
        suggestions,
        links,
        upgradedEml
      });
      setIsProcessing(false);
    }, 800);
  };

  const dispatchToOS = async () => {
    if (!result.upgradedEml) return;
    setIsDispatching(true);
    try {
      const response = await fetch('http://localhost:5001/api/legal/directmail/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emlPayload: result.upgradedEml, scenario })
      });
      const data = await response.json();
      if (!data.success) {
         setResult(prev => ({ ...prev, logs: [...prev.logs, `🔴 DISPATCH FAILED: ${data.error}`] }));
      } else {
         setResult(prev => ({ ...prev, logs: [...prev.logs, `🟢 DISPATCH SUCCESS: Handed off to macOS DirectMail`] }));
      }
    } catch (err: any) {
      setResult(prev => ({ ...prev, logs: [...prev.logs, `🔴 DISPATCH PANIC: ${err.message}`] }));
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-3xl border border-white/10 rounded-2xl p-6 relative overflow-hidden shadow-2xl">
      <div className="absolute top-0 right-0 w-48 h-48 bg-sky-500/10 blur-[60px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 blur-[60px] rounded-full pointer-events-none"></div>
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BrainCircuit className="w-6 h-6 text-sky-400" />
          <h2 className="text-xl font-light text-slate-100 tracking-wide">DirectMail Validation Matrix</h2>
        </div>
        
        <div className="flex items-center gap-4 relative z-10">
          <select 
            value={scenario}
            onChange={(e) => setScenario(e.target.value as Scenario)}
            className="bg-slate-950/80 border border-slate-700 text-slate-300 text-sm rounded-lg px-4 py-2 outline-none focus:border-sky-500/50 shadow-inner"
          >
            <option value="MAA_DENOVO">MAA / Frazier De Novo</option>
            <option value="TITLE_IX">Civil Rights / Title IX</option>
            <option value="DAY1099">2025 Day1099</option>
            <option value="HIRING_REFERRAL">Hiring Manager Referral Request</option>
            <option value="GENERAL">General Outreach</option>
          </select>

          <button 
            onClick={clearBuffer}
            disabled={isProcessing}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 text-slate-300 border border-slate-700 rounded-lg hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-50 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin text-sky-400' : ''}`} />
            <span className="text-sm font-medium tracking-wide">
              {isProcessing ? 'SCANNING...' : 'CLEAR BUFFER'}
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 relative z-10">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs text-slate-400 font-mono uppercase tracking-widest">Context Group</label>
            <input 
              type="text" 
              placeholder="e.g., Plaintiff Strategy, Defense Evidentiary..." 
              value={contextGroup}
              onChange={(e) => setContextGroup(e.target.value)}
              className="w-full bg-slate-950/50 border border-slate-700/80 rounded-lg p-3 text-sm text-slate-300 font-mono outline-none focus:border-sky-500/60 transition-colors"
            />
          </div>
          <div className="space-y-2 relative group">
            <label className="text-xs text-slate-400 font-mono uppercase tracking-widest flex items-center justify-between">
              <span>Active Clipboard Buffer</span>
              <span className="text-[10px] text-sky-400/80 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">⌘V TO PASTE</span>
            </label>
          <div className="relative h-48">
            {!hasContent && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-500 font-mono text-xs border border-dashed border-slate-700 rounded-lg bg-slate-950/30">
                <Clipboard className="w-6 h-6 mb-2 opacity-50" />
                Click here and press <kbd className="mx-1 px-1.5 py-0.5 bg-slate-800 rounded text-slate-300 border border-slate-700">Cmd + V</kbd> to paste Rich Text
              </div>
            )}
            <div 
              ref={editorRef}
              contentEditable
              onPaste={handleNativePaste}
              onInput={(e) => setHasContent(e.currentTarget.textContent !== '')}
              className="w-full h-full bg-slate-950/50 border border-slate-700/80 rounded-lg p-4 text-sm text-slate-300 font-mono outline-none focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/30 transition-all overflow-y-auto"
              style={{ minHeight: '12rem' }}
            />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs text-slate-400 font-mono uppercase tracking-widest">Validation Matrix Output</label>
            <div className="w-full h-40 bg-slate-950/80 border border-slate-800 rounded-lg p-4 overflow-y-auto font-mono text-xs shadow-inner">
            <AnimatePresence>
              {result.logs.map((log, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={i} 
                  className={`mb-2 ${log.includes('🔴') ? 'text-rose-400' : log.includes('🟢') ? 'text-emerald-400' : log.includes('🟡') ? 'text-amber-400' : 'text-slate-400'}`}
                >
                  {log}
                </motion.div>
              ))}
              
              {result.links.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mt-4 pt-4 border-t border-slate-800"
                >
                  <div className="text-emerald-400 font-bold mb-2">🔗 EXTRACTED DOMAINS:</div>
                  {result.links.map((link, i) => (
                    <div key={i} className="mb-1 text-slate-400 break-all overflow-hidden hover:text-sky-400 transition-colors">
                      <a href={link} target="_blank" rel="noreferrer">{link}</a>
                    </div>
                  ))}
                </motion.div>
              )}

              {result.suggestions.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-4 pt-4 border-t border-slate-800"
                >
                  <div className="text-amber-400 font-bold mb-2">🤖 AGENTIC SUGGESTIONS:</div>
                  {result.suggestions.map((sug, i) => (
                    <div key={i} className="mb-2 text-amber-200/90">{sug}</div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            
            {result.status === 'IDLE' && !isProcessing && (
              <div className="h-full flex items-center justify-center text-slate-600">
                Awaiting scenario configuration & payload...
              </div>
            )}
          </div>
        </div>
          {result.upgradedEml && (
            <div className="space-y-2 mt-4">
               <label className="text-xs text-emerald-400 font-mono uppercase tracking-widest flex items-center justify-between">
                 <span>Upgraded EML Payload</span>
                 <div className="flex gap-2">
                   <button 
                     onClick={() => navigator.clipboard.writeText(result.upgradedEml)} 
                     className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors"
                   >
                     COPY
                   </button>
                   <button 
                     onClick={dispatchToOS} 
                     disabled={isDispatching}
                     className="text-[10px] px-2 py-0.5 bg-sky-500/20 text-sky-400 rounded border border-sky-500/30 hover:bg-sky-500/30 transition-colors disabled:opacity-50"
                   >
                     {isDispatching ? 'ROUTING...' : 'DISPATCH TO OS'}
                   </button>
                 </div>
               </label>
               <pre className="w-full h-32 bg-emerald-950/20 border border-emerald-500/30 rounded-lg p-4 overflow-y-auto font-mono text-[10px] text-emerald-400/80 shadow-inner whitespace-pre-wrap">
                 {result.upgradedEml}
               </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
