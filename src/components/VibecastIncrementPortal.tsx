import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, ShieldCheck, Activity, Zap, CheckCircle2 } from 'lucide-react';

interface WhatsAppPayload {
  id: string;
  sender: string;
  timestamp: string;
  intent: 'De Novo Appeal' | 'Legal Tech Harvest' | 'FinTech Arbitrage';
  rawBody: string;
  confidenceScore: number;
}

const DUMMY_PAYLOADS: WhatsAppPayload[] = [
  {
    id: 'wa-8821a',
    sender: '+1 (555) 019-2831',
    timestamp: '2 mins ago',
    intent: 'De Novo Appeal',
    rawBody: 'Client 401: Please proceed with the immediate filing of the De Novo Appeal. Attach the necessary pdf synthesis bundles.',
    confidenceScore: 0.94
  },
  {
    id: 'wa-8821b',
    sender: '+44 7911 123456',
    timestamp: '15 mins ago',
    intent: 'Legal Tech Harvest',
    rawBody: 'Can we extract the precedent rulings from the 2024 Apex vs Blossom case?',
    confidenceScore: 0.88
  }
];

export const VibecastIncrementPortal = () => {
  const [activePayload, setActivePayload] = useState<string | null>(DUMMY_PAYLOADS[0].id);
  const [ingestionStatus, setIngestionStatus] = useState<'IDLE' | 'PROCESSING' | 'CLEARED'>('IDLE');

  const handleIngest = () => {
    setIngestionStatus('PROCESSING');
    setTimeout(() => {
      setIngestionStatus('CLEARED');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#05070A] p-8 text-gray-200 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-500 flex items-center gap-3">
              <MessageSquare className="text-emerald-400" />
              O-GOV.com VIP (Vibecast Increment Portal)
            </h1>
            <p className="text-gray-500 mt-2">O-GOV WhatsApp Ingress & Multi-Agent Payload Routing</p>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-900/50 rounded-xl border border-gray-800 text-sm">
              <Activity size={16} className="text-emerald-400 animate-pulse" />
              <span>Ingress Stream: ACTIVE</span>
            </div>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Incoming Payload Queue */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-gray-900/40 backdrop-blur-md border border-gray-800 rounded-2xl p-5">
              <h3 className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-4">Inbound Matrix</h3>
              
              <div className="space-y-3">
                {DUMMY_PAYLOADS.map((payload) => (
                  <div 
                    key={payload.id}
                    onClick={() => setActivePayload(payload.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${activePayload === payload.id ? 'bg-emerald-900/20 border-emerald-500/50' : 'bg-black/40 border-gray-800 hover:border-gray-600'}`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-mono text-emerald-400">{payload.sender}</span>
                      <span className="text-[10px] text-gray-500">{payload.timestamp}</span>
                    </div>
                    <div className="text-sm font-semibold text-gray-300 mb-1">{payload.intent}</div>
                    <div className="text-xs text-gray-500 line-clamp-2">{payload.rawBody}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Clean Room Inspection & Action */}
          <div className="lg:col-span-2">
            {activePayload && (
              <motion.div 
                key={activePayload}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-gray-900/40 backdrop-blur-md border border-gray-800 rounded-2xl overflow-hidden"
              >
                {/* Visualizer Header */}
                <div className="bg-gradient-to-r from-gray-900 to-black p-6 border-b border-gray-800">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-bold text-gray-100">Multi-Agent Clean Room Analysis</h2>
                      <p className="text-sm text-gray-500 mt-1">Payload isolating... Awaiting Agent Consensus.</p>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-lg text-emerald-400 text-xs font-mono">
                      CONFIDENCE: {(DUMMY_PAYLOADS.find(p => p.id === activePayload)?.confidenceScore || 0) * 100}%
                    </div>
                  </div>
                </div>

                {/* Payload Data */}
                <div className="p-6 space-y-6">
                  <div>
                    <label className="text-xs text-gray-500 uppercase font-bold tracking-wider block mb-2">Raw Decrypted Body</label>
                    <div className="bg-black/60 border border-gray-800 p-4 rounded-xl text-gray-300 font-mono text-sm leading-relaxed">
                      {DUMMY_PAYLOADS.find(p => p.id === activePayload)?.rawBody}
                    </div>
                  </div>

                  {/* Archetype Inference */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-black/30 border border-gray-800 p-4 rounded-xl">
                      <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Detected Intent Archetype</div>
                      <div className="text-emerald-400 font-medium flex items-center gap-2">
                        <Zap size={14} />
                        {DUMMY_PAYLOADS.find(p => p.id === activePayload)?.intent}
                      </div>
                    </div>
                    <div className="bg-black/30 border border-gray-800 p-4 rounded-xl">
                      <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Target Autonomous Action</div>
                      <div className="text-indigo-400 font-medium flex items-center gap-2">
                        <ShieldCheck size={14} />
                        Route to Phase Gate Conductor
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-800 flex justify-end gap-3 flex-wrap">
                    <button className="px-5 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors text-sm font-semibold">
                      Quarantine (ROAM)
                    </button>
                    <button className="px-5 py-2.5 rounded-xl border border-purple-700/50 text-purple-400 hover:text-white hover:bg-purple-900/30 transition-colors text-sm font-semibold">
                      Engage Arbitrage Lock
                    </button>
                    <button 
                      onClick={handleIngest}
                      disabled={ingestionStatus !== 'IDLE'}
                      className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all
                        ${ingestionStatus === 'IDLE' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 
                          ingestionStatus === 'PROCESSING' ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-500/30' : 
                          'bg-green-500/20 text-green-400 border border-green-500/30'}`}
                    >
                      {ingestionStatus === 'IDLE' && <><CheckCircle2 size={16} /> Trigger Vibecast Pulse</>}
                      {ingestionStatus === 'PROCESSING' && <><Activity size={16} className="animate-spin" /> Verifying TDD Gates...</>}
                      {ingestionStatus === 'CLEARED' && <><ShieldCheck size={16} /> Execution Tensor Logged</>}
                    </button>
                  </div>
                </div>

              </motion.div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
};
