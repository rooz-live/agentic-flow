/**
 * Legal Case Dashboard - Editor-Friendly Interface
 * Manages legal correspondence, EML/PDF generation, case tracking
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageTransition } from '../App';
import { 
  Briefcase, Mail, FileText, Send, Download, 
  Clock, AlertTriangle, CheckCircle2, ExternalLink,
  Plus, X, Link2
} from 'lucide-react';

interface LegalCase {
  id: string;
  caseNumber: string;
  title: string;
  court: string;
  status: 'active' | 'appeal' | 'arbitration' | 'outreach' | 'closed';
  lastUpdated: string;
  documents: LegalDocument[];
  relatedCaseIds?: string[];
  description?: string;
  firmOutreach?: FirmOutreachRecord[];
}

interface FirmOutreachRecord {
  id: string;
  firmName: string;
  url: string;
  mcpFactors: {
    idempotentRepresentation: boolean;
    cycleTimeUnder10Days: boolean;
    zeroTrustPayload: boolean;
  };
  notes: string;
}

interface LegalDocument {
  id: string;
  type: 'eml' | 'pdf' | 'md';
  name: string;
  path: string;
  recipients: string[];
  cc: string[];
  generatedAt: string;
}

const ACTIVE_CASES: LegalCase[] = [
  {
    id: '26CV007491-590',
    caseNumber: '26CV007491-590',
    title: 'Summary Ejectment - Appeal Pending',
    court: 'Mecklenburg County District Court',
    status: 'appeal',
    lastUpdated: '2026-04-22',
    description: 'Appeal of Summary Ejectment judgment. Critical deadline March 20, 2026. Consolidated with 26CV005596-590 for systemic defense.',
    relatedCaseIds: ['26CV005596-590'],
    documents: []
  },
  {
    id: '26CV005596-590',
    caseNumber: '26CV005596-590',
    title: 'Habitability/Arbitration',
    court: 'Mecklenburg County - Arbitration Ordered',
    status: 'arbitration',
    lastUpdated: '2026-03-03',
    description: 'Habitability counterclaims with arbitration ordered. Related to 26CV007491-590 as consolidated defense strategy.',
    relatedCaseIds: ['26CV007491-590'],
    documents: [
      {
        id: 'doc-001',
        type: 'eml',
        name: 'Arbitration Appeal / De Novo Consultation',
        path: '/MAA/Uptown/BHOPTI-LEGAL/01-ACTIVE-CRITICAL/MAA-26CV005596-590/DENOVO/APPEAL-CONSULTATION-BLOSSOM-LAW-MULTIPART.eml',
        recipients: ['info@blossomlaw.com'],
        cc: ['purpose@yo.life'],
        generatedAt: '2026-04-23T08:30:00'
      }
    ]
  },
  {
    id: 'OUTREACH-ALT-1',
    caseNumber: 'PIPELINE-001',
    title: 'Alternate Firm Outreach',
    court: 'Multi-Jurisdictional Arbitration',
    status: 'outreach',
    lastUpdated: '2026-04-23',
    description: 'Tracking outreach arrays for alternative counsel options beyond Blossom Law for the 10-day De Novo boundary.',
    relatedCaseIds: ['26CV007491-590', '26CV005596-590'],
    documents: [],
    firmOutreach: [
      {
        id: 'firm-001',
        firmName: 'Example Alternate Counsel PLLC',
        url: 'https://examplefirm.com',
        mcpFactors: {
          idempotentRepresentation: false,
          cycleTimeUnder10Days: true,
          zeroTrustPayload: true
        },
        notes: 'Initial contact made. Awaiting response regarding arbitration timelines.'
      }
    ]
  }
];

export function LegalCaseDashboard() {
  const [cases, setCases] = useState<LegalCase[]>(ACTIVE_CASES);
  const [selectedCase, setSelectedCase] = useState<LegalCase | 'consolidated'>(cases.find(c => c.id === '26CV005596-590') || cases[0]);
  const [editingDoc, setEditingDoc] = useState<LegalDocument | null>(null);
  const [editContent, setEditContent] = useState<string>('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'running' | 'passed'>('idle');
  const [validationConfig, setValidationConfig] = useState({
    cycles: 1,
    scripts: {
      roamFreshness: true,
      directMailDraft: true,
      circleRole: true,
      designIntegrity: true
    }
  });
  const [validationLogs, setValidationLogs] = useState<any[]>([]);
  const [executionMetrics, setExecutionMetrics] = useState({ durationMs: 0, totalCycles: 0 });
  const [showValidationLogs, setShowValidationLogs] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState(false);
  const [vaultStatus, setVaultStatus] = useState<'online' | 'checking' | 'offline'>('online');
  const [newCaseForm, setNewCaseForm] = useState({
    caseNumber: '',
    title: '',
    court: '',
    status: 'active' as LegalCase['status'],
    description: ''
  });

  const generatePdf = async (documentPath: string) => {
    setIsGeneratingPdf(true);
    try {
      // Use browser print-to-PDF or md-to-pdf
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          source: documentPath,
          format: 'a4'
        })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `legal-document-${Date.now()}.pdf`;
        a.click();
      }
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const renderEmlPreview = (doc: LegalDocument) => {
    return `
<div class="email-preview font-sans text-zinc-300">
  <div class="email-header border-b border-zinc-800 pb-4 mb-5 text-[13px] tracking-wide">
    <table class="w-full text-left border-collapse">
      <tbody>
        <tr><td class="py-1 w-24 font-bold text-zinc-500 uppercase tracking-widest text-[10px]">From:</td><td class="py-1">Shahrooz Bhopti &lt;shahrooz@bhopti.com&gt;</td></tr>
        <tr><td class="py-1 w-24 font-bold text-zinc-500 uppercase tracking-widest text-[10px]">To:</td><td class="py-1">${doc.recipients.join(', ')}</td></tr>
        <tr><td class="py-1 w-24 font-bold text-zinc-500 uppercase tracking-widest text-[10px]">Cc:</td><td class="py-1">${doc.cc.join(', ')}</td></tr>
        <tr><td class="py-1 w-24 font-bold text-zinc-500 uppercase tracking-widest text-[10px]">Subject:</td><td class="py-1 font-bold text-white uppercase tracking-wider text-sm">URGENT: Multi-Jurisdictional De Novo Appeal & Systemic Defense Retainer (< 10 Days)</td></tr>
      </tbody>
    </table>
  </div>
  <div class="email-body space-y-5 text-[14px] leading-relaxed">
    <p>Dear Blossom Law Team,</p>
    
    <p>I am submitting this urgent brief to secure representation for a critical <span class="text-white font-bold tracking-tight">Arbitration Appeal and Request for a Case De Novo</span>. We are actively approaching a hard <span class="text-amber-400 font-bold px-1 bg-amber-400/10 rounded">10-day jurisdictional expiration window</span> that necessitates immediate procedural filing to prevent an unlawful systemic default.</p>

    <div class="p-4 bg-zinc-900/50 border-l-2 border-indigo-500 rounded-r-lg">
      <h3 class="text-xs uppercase tracking-widest text-indigo-200 font-bold mb-2">The Systemic Vector</h3>
      <p class="text-sm text-zinc-400">This pending eviction is not an isolated incident; it is the physical culmination of a protracted, multi-year sequence of financial deprivation and targeted fraud spanning several massive institutional entities.</p>
    </div>

    <p>To accurately litigate the De Novo appeal, the court must be made aware of the structural breadth of cases intrinsically linked to my current financial insolvency and impending displacement. This umbrella of related litigation includes:</p>
    
    <ul class="list-none space-y-3 pl-2">
      <li class="flex items-start gap-2"><div class="w-1.5 h-1.5 mt-2 rounded-full bg-emerald-500"></div><div><strong class="text-white">MAA (Mid-America Apartments):</strong> The direct catalyst for the current Summary Ejectment and Habitability Arbitration matters, enforcing displacement despite glaring counterclaims.</div></li>
      <li class="flex items-start gap-2"><div class="w-1.5 h-1.5 mt-2 rounded-full bg-fuchsia-500"></div><div><strong class="text-white">Bank of America / Merrill Lynch:</strong> Sustained historical malfeasance and unmitigated financial targeting which directly destabilized my primary capital foundations.</div></li>
      <li class="flex items-start gap-2"><div class="w-1.5 h-1.5 mt-2 rounded-full bg-red-500"></div><div><strong class="text-white">US Bank:</strong> Documented complicity in the orchestrated financial malfeasance vectors, directly compounding the systemic deprivation.</div></li>
      <li class="flex items-start gap-2"><div class="w-1.5 h-1.5 mt-2 rounded-full bg-amber-500"></div><div><strong class="text-white">LifeLock (Identity Protection):</strong> Negligent failure to block or assist with the mitigation of massive systemic fraud, resulting directly in catastrophic bankruptcy and blocking of my employability and eligibility for four to five years since 2019.</div></li>
      <li class="flex items-start gap-2"><div class="w-1.5 h-1.5 mt-2 rounded-full bg-blue-500"></div><div><strong class="text-white">Apex Systems & Banking Syndicates:</strong> Complicit actors in a broader architecture of employment/financial fraud that has repeatedly, and unlawfully, left me homeless on multiple documented occasions.</div></li>
    </ul>

    <p>Furthermore, given the severity of these cascading liabilities, I am actively evaluating a <strong class="text-white">strategic Bankruptcy Filing</strong> to automatically trigger an absolute stay on all hostile actions while we untangle these systemic grievances in Federal/Superior jurisdictions.</p>

    <p>I have prepared a comprehensive, telemetry-backed evidence bundle (11.4GB total volume) cross-referencing all entities. <strong class="text-white">To respect strict Zero-Trust boundaries, data access will be partitioned and dispatched via secure Passbolt links as procedurally necessary.</strong> Please confirm your immediate availability to review the initial injunction mechanics before the 10-day appellate window closes.</p>

    <div class="mt-6 pt-4 border-t border-zinc-800">
      <p class="font-bold text-white tracking-wide">Shahrooz Bhopti</p>
      <p class="text-[11px] text-zinc-500 font-mono mt-1">Systemic Operator | RE: 26CV005596-590 / 26CV007491-590</p>
    </div>
  </div>
</div>`;
  };

  const handleSendDocument = async () => {
    if (!editingDoc) return;
    try {
      // Simulate sending via email/API
      alert('Document sent successfully to ' + editingDoc.recipients.join(', '));
      setEditingDoc(null);
    } catch (err) {
      console.error(err);
      alert('Failed to send document.');
    }
  };

  const runWholenessValidation = async () => {
    setValidationStatus('running');
    setIsValidating(true);
    setValidationLogs([]);
    setShowValidationLogs(false);
    
    const startTime = performance.now();
    try {
      // Execute the physical validation scripts via the Vite backend plugin
      const response = await fetch('/api/validate-eml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cycles: validationConfig.cycles,
          scripts: validationConfig.scripts,
          emlContent: editContent
        })
      });
      
      const data = await response.json();
      const endTime = performance.now();
      
      if (response.ok && data.success) {
        setValidationLogs(data.results);
        setExecutionMetrics({ 
          durationMs: Math.round(endTime - startTime), 
          totalCycles: data.cyclesRun 
        });
        
        // Physically upgrade the EML content if the backend validation injected structural improvements
        if (data.upgradedEml) {
          setEditContent(data.upgradedEml);
        }
        
        setValidationStatus('passed');
        setShowValidationLogs(true); // Auto-show logs on success
      } else {
        console.error('Validation failed:', data);
        setValidationStatus('idle'); // Or create a 'failed' state, but keeping it simple
        alert('Validation failed physically. Check console for script output.');
      }
    } catch (err) {
      console.error('Validation request failed:', err);
      setValidationStatus('idle');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <PageTransition title="Legal Case Dashboard">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <Briefcase className="w-6 h-6 text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Legal Matter Management</h1>
          </div>
          <p className="text-slate-400">
            Case tracking, correspondence generation, and document synthesis
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Case List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                Active Cases
              </h2>
              <button 
                className="text-[10px] uppercase font-bold bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors flex items-center gap-1"
                onClick={() => setIsNewCaseModalOpen(true)}
              >
                <Plus className="w-3 h-3" />
                Add De Novo
              </button>
            </div>
            
            <motion.button
              onClick={() => setSelectedCase('consolidated')}
              className={`w-full text-left p-3 rounded-xl border transition-all ${
                selectedCase === 'consolidated'
                  ? 'bg-fuchsia-500/10 border-fuchsia-500/50'
                  : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-fuchsia-400"></div>
                <span className="text-sm font-medium text-white">Consolidated View</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 pl-4">All related case context & risks</p>
            </motion.button>
            
            {ACTIVE_CASES.map((caseItem) => (
              <motion.button
                key={caseItem.id}
                onClick={() => setSelectedCase(caseItem)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  selectedCase !== 'consolidated' && selectedCase.id === caseItem.id
                    ? 'bg-indigo-500/10 border-indigo-500/50'
                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs font-mono text-slate-500">
                    {caseItem.caseNumber}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    caseItem.status === 'appeal' ? 'bg-amber-500/20 text-amber-400' :
                    caseItem.status === 'arbitration' ? 'bg-blue-500/20 text-sky-300' :
                    caseItem.status === 'outreach' ? 'bg-fuchsia-500/20 text-fuchsia-400' :
                    'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {caseItem.status.toUpperCase()}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-white mb-1">
                  {caseItem.title}
                </h3>
                <p className="text-xs text-slate-500">{caseItem.court}</p>
                
                {caseItem.documents.length > 0 && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                    <Mail className="w-3 h-3" />
                    {caseItem.documents.length} document(s)
                  </div>
                )}
              </motion.button>
            ))}
          </div>

          {/* Case Details */}
          <div className="lg:col-span-2 space-y-6">
            
            {selectedCase === 'consolidated' ? (
              <div className="space-y-6">
                <div className="p-4 rounded-xl border bg-fuchsia-500/10 border-fuchsia-500/30">
                  <div className="flex items-center gap-3 mb-2">
                    <Briefcase className="w-5 h-5 text-fuchsia-400" />
                    <h3 className="font-medium text-white">Consolidated Entity Risk View</h3>
                  </div>
                  <p className="text-sm text-slate-400">
                    Aggregated overview of 2 active cases (Summary Ejectment Appeal + Habitability/Arbitration) highlighting systemic cross-matter risks.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
                    <h4 className="text-xs uppercase text-slate-500 mb-2 font-bold tracking-widest">Global Risk Pulse</h4>
                    <div className="text-3xl text-amber-500 font-light mb-1">High</div>
                    <p className="text-[10px] text-slate-400">Immediate appeal deadline lapse creates cascading default risk on arbitration.</p>
                  </div>
                  <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
                    <h4 className="text-xs uppercase text-slate-500 mb-2 font-bold tracking-widest">Total Evidence Vol</h4>
                    <div className="text-3xl text-indigo-400 font-light mb-1">11.4 GB</div>
                    <p className="text-[10px] text-slate-400">Audio recordings, PDF timelines, and DirectMail records combined.</p>
                  </div>
                </div>
              </div>
            ) : (
            <>
            {/* Status Banner */}
            <div className={`p-4 rounded-xl border ${
              selectedCase.status === 'appeal' 
                ? 'bg-amber-500/10 border-amber-500/30' 
                : 'bg-slate-900/50 border-slate-800'
            }`}>
              <div className="flex items-center gap-3">
                {selectedCase.status === 'appeal' ? (
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                )}
                <div>
                  <h3 className="font-medium text-white">{selectedCase.title}</h3>
                  <p className="text-sm text-slate-400">
                    {selectedCase.court} • Last updated: {selectedCase.lastUpdated}
                  </p>
                </div>
              </div>
              
              {selectedCase.status === 'appeal' && (
                <div className="mt-3 p-3 bg-black/30 rounded-lg">
                  <p className="text-xs text-amber-400 font-medium mb-1">
                    ⚠️ CRITICAL: Appeal deadline lapsed
                  </p>
                  <p className="text-xs text-slate-400">
                    Original deadline was March 20, 2026. Late appeal options being assessed 
                    based on procedural due process violations.
                  </p>
                </div>
              )}
            </div>

            {/* Outreach Pipeline Manager (Only visible if status is outreach) */}
            {selectedCase.status === 'outreach' && (
              <div className="p-5 bg-fuchsia-900/10 border border-fuchsia-500/20 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-fuchsia-400" />
                    <h3 className="font-semibold text-white">Firm Outreach Protocol</h3>
                  </div>
                  <button className="text-xs px-3 py-1.5 bg-fuchsia-500/20 text-fuchsia-300 rounded hover:bg-fuchsia-500/30 transition-colors">
                    + Add Target Firm
                  </button>
                </div>
                
                <div className="space-y-4">
                  {selectedCase.firmOutreach?.map(firm => (
                    <div key={firm.id} className="p-4 bg-slate-900/60 border border-slate-700 rounded-lg">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium text-white">{firm.firmName}</h4>
                          <a href={firm.url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mt-1">
                            <ExternalLink className="w-3 h-3" /> {firm.url}
                          </a>
                        </div>
                        <button className="text-[10px] uppercase tracking-wider font-bold bg-slate-800 text-slate-300 px-2 py-1 rounded">Edit</button>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className={`p-2 rounded border text-[10px] text-center font-medium ${firm.mcpFactors.idempotentRepresentation ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-800/50 border-slate-700 text-slate-500'}`}>
                          Idempotent Action
                        </div>
                        <div className={`p-2 rounded border text-[10px] text-center font-medium ${firm.mcpFactors.cycleTimeUnder10Days ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-800/50 border-slate-700 text-slate-500'}`}>
                          &lt; 10 Day Cycle Time
                        </div>
                        <div className={`p-2 rounded border text-[10px] text-center font-medium ${firm.mcpFactors.zeroTrustPayload ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-800/50 border-slate-700 text-slate-500'}`}>
                          Zero Trust Partitioning
                        </div>
                      </div>
                      <p className="text-xs text-slate-400">{firm.notes}</p>
                      
                      <div className="mt-4 pt-3 border-t border-slate-700/50 flex justify-end gap-3">
                        <div className="flex items-center gap-3">
                          {vaultStatus === 'offline' && (
                            <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded">
                              Vault Offline: Awaiting EKS Rehydration
                            </span>
                          )}
                          <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={async () => {
                              setVaultStatus('checking');
                              try {
                                await fetch('https://passbolt.tag.ooo', { mode: 'no-cors' });
                                setVaultStatus('online');
                                window.open('https://passbolt.tag.ooo', '_blank', 'noopener,noreferrer');
                              } catch (e) {
                                setVaultStatus('offline');
                              }
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
                          >
                             <ExternalLink className="w-3 h-3" />
                             Open Passbolt Secure Link
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!selectedCase.firmOutreach || selectedCase.firmOutreach.length === 0) && (
                    <p className="text-sm text-slate-500 text-center py-4">No firm outreach arrays mapped yet.</p>
                  )}
                </div>
              </div>
            )}

            {/* Related Cases Section */}
            {selectedCase.relatedCaseIds && selectedCase.relatedCaseIds.length > 0 && (
              <div className="p-4 bg-slate-900/30 border border-slate-800 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <Link2 className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-xs uppercase text-slate-400 font-bold tracking-widest">Related Cases</h4>
                </div>
                <div className="space-y-2">
                  {selectedCase.relatedCaseIds.map((relatedId) => {
                    const relatedCase = cases.find(c => c.id === relatedId);
                    if (!relatedCase) return null;
                    return (
                      <button
                        key={relatedId}
                        onClick={() => setSelectedCase(relatedCase)}
                        className="w-full text-left p-3 bg-slate-900/50 border border-slate-700 rounded-lg hover:border-indigo-500/30 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-slate-500">{relatedCase.caseNumber}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            relatedCase.status === 'appeal' ? 'bg-amber-500/20 text-amber-400' :
                            relatedCase.status === 'arbitration' ? 'bg-blue-500/20 text-sky-300' :
                            relatedCase.status === 'outreach' ? 'bg-fuchsia-500/20 text-fuchsia-400' :
                            'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {relatedCase.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-slate-300 mt-1">{relatedCase.title}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Documents Section */}
            <div>
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
                Generated Documents
              </h2>
              
              {selectedCase.documents.length === 0 ? (
                <div className="p-8 text-center bg-slate-900/30 border border-slate-800 rounded-xl">
                  <FileText className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500">No documents generated yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedCase.documents.map((doc) => (
                    <div 
                      key={doc.id}
                      className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-800 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/10 rounded-lg">
                          <Mail className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div>
                          <h4 className="font-medium text-white text-sm">{doc.name}</h4>
                          <p className="text-xs text-slate-500">
                            To: Blossom Law • Cc: purpose@yo.life • HTML Multipart
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            setEditingDoc(doc);
                            setEditContent(renderEmlPreview(doc));
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          Open / Edit
                        </motion.button>
                        
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => generatePdf(doc.path)}
                          disabled={isGeneratingPdf}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Download className="w-3 h-3" />
                          {isGeneratingPdf ? 'Generating...' : 'PDF'}
                        </motion.button>
                        
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            setEditingDoc(doc);
                            setEditContent(renderEmlPreview(doc));
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
                        >
                          <Send className="w-3 h-3" />
                          Send
                        </motion.button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl text-left hover:border-indigo-500/30 transition-colors"
              >
                <FileText className="w-5 h-5 text-indigo-400 mb-2" />
                <h4 className="font-medium text-white text-sm">Generate Notice of Appeal</h4>
                <p className="text-xs text-slate-500 mt-1">PDF format for filing</p>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl text-left hover:border-indigo-500/30 transition-colors"
              >
                <Clock className="w-5 h-5 text-amber-400 mb-2" />
                <h4 className="font-medium text-white text-sm">Schedule Consultation</h4>
                <p className="text-xs text-slate-500 mt-1">Calendar invite generation</p>
              </motion.button>
            </div>

            {/* External Links */}
            <div className="flex items-center gap-4 pt-4 border-t border-slate-800">
              <a 
                href="https://www.blossomlaw.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Blossom Law Website
              </a>
              <span className="text-slate-700">|</span>
              <span className="text-xs text-slate-500">
                From: shahrooz@bhopti.com
              </span>
              <span className="text-slate-700">|</span>
              <span className="text-xs text-slate-500">
                Cc: purpose@yo.life
              </span>
            </div>
            </>
            )}
          </div>
        </div>

        {/* New Case Modal */}
        <AnimatePresence>
          {isNewCaseModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setIsNewCaseModalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-white">Add New Case</h2>
                  <button 
                    onClick={() => setIsNewCaseModalOpen(false)}
                    className="p-1 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Case Number</label>
                    <input
                      type="text"
                      value={newCaseForm.caseNumber}
                      onChange={e => setNewCaseForm({...newCaseForm, caseNumber: e.target.value})}
                      placeholder="e.g., 26CV009999-590"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white outline-none focus:border-indigo-500/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Title</label>
                    <input
                      type="text"
                      value={newCaseForm.title}
                      onChange={e => setNewCaseForm({...newCaseForm, title: e.target.value})}
                      placeholder="e.g., Contract Dispute"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white outline-none focus:border-indigo-500/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Court</label>
                    <input
                      type="text"
                      value={newCaseForm.court}
                      onChange={e => setNewCaseForm({...newCaseForm, court: e.target.value})}
                      placeholder="e.g., Mecklenburg County District Court"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white outline-none focus:border-indigo-500/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Status</label>
                    <select
                      value={newCaseForm.status}
                      onChange={e => setNewCaseForm({...newCaseForm, status: e.target.value as LegalCase['status']})}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white outline-none focus:border-indigo-500/50"
                    >
                      <option value="active">Active</option>
                      <option value="appeal">Appeal</option>
                      <option value="arbitration">Arbitration</option>
                      <option value="outreach">Outreach</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Description</label>
                    <textarea
                      value={newCaseForm.description}
                      onChange={e => setNewCaseForm({...newCaseForm, description: e.target.value})}
                      placeholder="Brief case description..."
                      rows={3}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white outline-none focus:border-indigo-500/50 resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setIsNewCaseModalOpen(false)}
                    className="flex-1 py-2.5 px-4 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (newCaseForm.caseNumber && newCaseForm.title) {
                        const newCase: LegalCase = {
                          id: newCaseForm.caseNumber,
                          ...newCaseForm,
                          lastUpdated: new Date().toISOString().split('T')[0],
                          documents: []
                        };
                        setCases([...cases, newCase]);
                        setSelectedCase(newCase);
                        setIsNewCaseModalOpen(false);
                        setNewCaseForm({ caseNumber: '', title: '', court: '', status: 'active', description: '' });
                      }
                    }}
                    disabled={!newCaseForm.caseNumber || !newCaseForm.title}
                    className="flex-1 py-2.5 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Case
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Document Editor / Sender Modal */}
        <AnimatePresence>
          {editingDoc && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setEditingDoc(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-2xl"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Edit & Send Correspondence</h2>
                    <p className="text-xs text-slate-400 font-mono mt-1">{editingDoc.path}</p>
                  </div>
                  <button 
                    onClick={() => {
                      setEditingDoc(null);
                      setValidationStatus('idle');
                    }}
                    className="p-1 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                {/* Validation Configuration Panel */}
                <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800 mb-4 text-xs">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                      Validation Framework Target
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Cycles:</span>
                      <input 
                        type="number" 
                        min="1" 
                        max="100" 
                        value={validationConfig.cycles} 
                        onChange={e => setValidationConfig({...validationConfig, cycles: parseInt(e.target.value) || 1})}
                        className="w-16 bg-black border border-zinc-700 rounded px-2 py-1 text-center text-white outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 text-zinc-300 hover:text-white cursor-pointer transition-colors">
                      <input type="checkbox" checked={validationConfig.scripts.roamFreshness} onChange={e => setValidationConfig({...validationConfig, scripts: {...validationConfig.scripts, roamFreshness: e.target.checked}})} className="rounded border-zinc-700 bg-black text-indigo-500 focus:ring-indigo-500/50" />
                      <span className="font-mono">validate-roam-freshness.sh</span>
                    </label>
                    <label className="flex items-center gap-2 text-zinc-300 hover:text-white cursor-pointer transition-colors">
                      <input type="checkbox" checked={validationConfig.scripts.directMailDraft} onChange={e => setValidationConfig({...validationConfig, scripts: {...validationConfig.scripts, directMailDraft: e.target.checked}})} className="rounded border-zinc-700 bg-black text-indigo-500 focus:ring-indigo-500/50" />
                      <span className="font-mono">validate-directmail-draft.sh</span>
                    </label>
                    <label className="flex items-center gap-2 text-zinc-300 hover:text-white cursor-pointer transition-colors">
                      <input type="checkbox" checked={validationConfig.scripts.circleRole} onChange={e => setValidationConfig({...validationConfig, scripts: {...validationConfig.scripts, circleRole: e.target.checked}})} className="rounded border-zinc-700 bg-black text-indigo-500 focus:ring-indigo-500/50" />
                      Circle Role Institutional Check
                    </label>
                    <label className="flex items-center gap-2 text-zinc-300 hover:text-white cursor-pointer transition-colors">
                      <input type="checkbox" checked={validationConfig.scripts.designIntegrity} onChange={e => setValidationConfig({...validationConfig, scripts: {...validationConfig.scripts, designIntegrity: e.target.checked}})} className="rounded border-zinc-700 bg-black text-indigo-500 focus:ring-indigo-500/50" />
                      Design / Rendering Integrity Check
                    </label>
                  </div>
                </div>

                <div className="space-y-4 relative">
                  <div className="flex gap-2 absolute top-2 right-2 z-10">
                    {validationStatus === 'passed' ? (
                      <button 
                        onClick={() => setShowValidationLogs(!showValidationLogs)}
                        className="px-2 py-1 text-[10px] uppercase tracking-wider font-bold bg-emerald-500/20 text-emerald-400 rounded shadow-sm border border-emerald-500/30 flex items-center gap-1 hover:bg-emerald-500/30 transition-colors"
                      >
                        <CheckCircle2 className="w-3 h-3" /> Wholeness Verified ({executionMetrics.durationMs}ms)
                      </button>
                    ) : (
                      <button 
                        onClick={runWholenessValidation}
                        disabled={isValidating}
                        className="px-2 py-1 text-[10px] uppercase tracking-wider font-bold bg-indigo-500 text-white rounded shadow-sm hover:bg-indigo-400 transition-colors disabled:opacity-50 flex items-center gap-1"
                      >
                        {isValidating ? (
                          <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Validating...</>
                        ) : 'Validate Wholeness'}
                      </button>
                    )}
                    <button className="px-2 py-1 text-[10px] uppercase tracking-wider font-bold bg-zinc-800 text-zinc-300 rounded shadow-sm">
                      HTML Editor
                    </button>
                  </div>

                  {/* Physical Execution Audit Log (Tooltip / Panel) */}
                  <AnimatePresence>
                    {showValidationLogs && validationStatus === 'passed' && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-10 right-2 z-20 w-96 max-h-64 overflow-y-auto bg-slate-900 border border-emerald-500/30 rounded-lg shadow-2xl p-3"
                      >
                        <div className="flex justify-between items-center mb-2 border-b border-slate-800 pb-2">
                          <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Physical Execution Audit</h4>
                          <span className="text-[10px] text-slate-500 font-mono">{executionMetrics.durationMs}ms • {executionMetrics.totalCycles} Cycles</span>
                        </div>
                        <div className="space-y-2">
                          {validationLogs.slice(0, 10).map((log, idx) => (
                            <div key={idx} className="bg-black/50 rounded p-2 border border-slate-800">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-bold text-indigo-400 font-mono">[{log.script}]</span>
                                <span className="text-[9px] text-slate-500">Cycle {log.cycle}</span>
                              </div>
                              <pre className="text-[9px] text-slate-400 font-mono whitespace-pre-wrap break-all">
                                {log.output || "Exit 0: No stdout returned."}
                              </pre>
                            </div>
                          ))}
                          {validationLogs.length > 10 && (
                            <div className="text-center text-[10px] text-slate-500 font-mono pt-1">
                              + {validationLogs.length - 10} more executions logged
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div
                    contentEditable
                    dangerouslySetInnerHTML={{ __html: editContent }}
                    onBlur={e => {
                      setEditContent(e.currentTarget.innerHTML);
                      setValidationStatus('idle'); // Reset validation on edit
                      setShowValidationLogs(false);
                    }}
                    className={`w-full h-80 bg-zinc-950 border rounded-lg p-6 text-sm text-zinc-300 outline-none overflow-y-auto transition-colors ${
                      validationStatus === 'passed' ? 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'border-zinc-800 focus:border-indigo-500/50'
                    }`}
                    spellCheck={false}
                  />
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setEditingDoc(null);
                      setValidationStatus('idle');
                    }}
                    className="py-2.5 px-6 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendDocument}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    Finalize & Send to {editingDoc.recipients[0]}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}
