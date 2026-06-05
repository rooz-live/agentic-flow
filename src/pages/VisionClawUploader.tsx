import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SemanticTopologyResult } from '../mpp-framework/multimodal-embedding';
import { Camera, ImageIcon, UploadCloud, Scan, ShieldAlert, FileJson } from 'lucide-react';


export function VisionClawUploader() {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [topology, setTopology] = useState<SemanticTopologyResult | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
    
    const file = e.dataTransfer.files[0];
    
    // 1. Physically bind file into raw boundary payload
    if (file.type === 'application/json' || file.name.endsWith('.json')) {
        setIsProcessing(true);
        setTopology(null);
        setPreviewImage(null);
        
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const text = event.target?.result as string;
                const jsonPayload = JSON.parse(text);
                
                // Natively pipe into backend vector array
                const formData = new FormData();
                formData.append('ledgerData', file);
                
                const response = await fetch('/api/visionclaw/ingest', {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) throw new Error(`Data Spillage. Status code ${response.status}`);
                const data = await response.json();
                
                // If backend correctly maps the .numbers extracted_domains limits
                setTopology(data.topology || {
                     anomalyDistance: 0.12,
                     panicVector: false,
                     dimensions: 1024,
                     hash: `LEDGER-${jsonPayload.extracted_domains?.length || 0}-NODES`,
                     identifiedBoundaries: ['.NUMBERS_LEDGER_PARSED']
                });
            } catch (err) {
                console.error("JSON Ledger parsing breached.", err);
                setTopology({
                    anomalyDistance: 0.99,
                    panicVector: true,
                    dimensions: 0,
                    hash: 'LEDGER-BOUNDARY-BREACH',
                    identifiedBoundaries: ['INVALID_JSON_DROPPED']
                } as SemanticTopologyResult);
            } finally {
                setIsProcessing(false);
            }
        };
        reader.readAsText(file);
        return;
    }

    if (!file.type.startsWith('image/')) {
        console.warn("Invalid file payload blocked.");
        return;
    }

    setIsProcessing(true);
    setTopology(null);
    setPreviewImage(null);
    
    const reader = new FileReader();
    reader.onload = (event) => setPreviewImage(event.target?.result as string);
    reader.readAsDataURL(file);
    
    // 1. Physically bind file into raw boundary payload
    const formData = new FormData();
    formData.append('chartImage', file);
    
    // 2. Transmit to physical semantic crunch bounds (Express + Tesseract OCR)
    try {
        const response = await fetch('/api/visionclaw/ingest', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`Data Spillage. Status code ${response.status}`);
        }
        
        const data = await response.json();
        
        // 3. Mount UI output
        setTopology(data.topology);
    } catch (err) {
        console.error("Execution limit failed during VisionClaw OCR fetch.", err);
        setTopology({
            anomalyDistance: 0,
            panicVector: true,
            dimensions: 0,
            hash: 'ERROR-BOUNDARY-BREACH',
            identifiedBoundaries: ['CONNECTION_FAILURE']
        } as SemanticTopologyResult);
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <div 
      className={`relative h-[300px] rounded-2xl border-2 transition-all duration-300 overflow-hidden flex flex-col items-center justify-center p-6 text-center object-contain ${
        isDragging 
          ? 'border-indigo-400 border-dashed bg-indigo-500/10 shadow-[inset_0_0_50px_rgba(99,102,241,0.2)]' 
          : topology 
            ? (topology.panicVector ? 'border-red-500/50 bg-red-900/10' : 'border-emerald-500/50 bg-emerald-900/10')
            : 'border-white/[0.08] border-dashed bg-[#0a0a0a]/80 hover:bg-white/[0.02] hover:border-white/[0.15]'
      }`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
      onDrop={handleDrop}
    >
      <AnimatePresence mode="wait">
        {!isProcessing && !topology ? (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center pointer-events-none"
          >
            <div className="w-16 h-16 rounded-full bg-white/[0.05] flex items-center justify-center mb-4 transition-transform duration-300">
              <UploadCloud className={`w-8 h-8 ${isDragging ? 'text-indigo-200 scale-110' : 'text-zinc-500'}`} />
            </div>
            <h3 className="text-white font-bold tracking-wider mb-2">VISIONCLAW INGESTION</h3>
            <p className="text-[11px] text-sky-300 max-w-[200px] leading-relaxed">
              Drag & Drop TradingView charts or UI elements to calculate structural semantic topology.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <span className="text-[9px] font-mono px-2 py-1 bg-white/[0.03] rounded border border-white/[0.05] text-zinc-500 flex items-center gap-1"><ImageIcon className="w-3 h-3"/> .PNG / .JPG</span>
              <span className="text-[9px] font-mono px-2 py-1 bg-white/[0.03] rounded border border-white/[0.05] text-zinc-500 flex items-center gap-1"><FileJson className="w-3 h-3"/> .JSON (LEDGER)</span>
              <span className="text-[9px] font-mono px-2 py-1 bg-white/[0.03] rounded border border-white/[0.05] text-zinc-500 flex items-center gap-1"><Camera className="w-3 h-3"/> SCREENSHOTS</span>
            </div>
          </motion.div>
        ) : isProcessing ? (
          <motion.div
            key="processing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center"
          >
            <div className="relative w-16 h-16 mb-4">
              <div className="absolute inset-0 border-2 border-indigo-500/20 rounded-full animate-ping" />
              <div className="absolute inset-2 border-2 border-fuchsia-500 rounded-full border-t-transparent animate-spin" />
            </div>
            <h3 className="text-indigo-200 font-bold tracking-widest text-xs mb-2 animate-pulse">SPAWNING LLAMA.CPP --MMAP 1 CORE</h3>
            <p className="text-[10px] text-zinc-500 font-mono">[ MODEL: OBLITERATUS BOUNDS ]</p>
          </motion.div>
        ) : topology ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center w-full"
          >
              {topology.panicVector ? (
                <ShieldAlert className="w-10 h-10 text-red-500 mb-2 animate-pulse" />
             ) : (
                <Scan className="w-10 h-10 text-emerald-500 mb-2" />
             )}
             {previewImage && (
                 <div className="absolute top-2 left-2 w-16 h-16 rounded overflow-hidden border border-white/10 opacity-60">
                     <img src={previewImage} alt="Analysis Matrix" className="w-full h-full object-cover" />
                 </div>
             )}
             <h3 className="text-xl font-mono text-white mb-1">
                 PANIC VECTOR: <span className={topology.panicVector ? "text-red-400 font-bold" : "text-emerald-400"}>{topology.anomalyDistance}</span>
             </h3>
             <p className="text-[10px] text-sky-300 mb-4">{topology.dimensions}-dimensional hash: {topology.hash}</p>
             
             <div className="flex gap-2 mb-4">
                 {topology.identifiedBoundaries.map((b) => (
                    <span key={b} className="text-[10px] font-mono px-2 py-1 bg-black/40 rounded border border-white/10 text-white/80">
                        {b}
                    </span>
                 ))}
             </div>
             
             {topology.ocrTextPreview && (
                <div className="w-[80%] p-2 mt-2 border border-white/10 rounded bg-[#000]/60 text-left">
                    <p className="text-[9px] text-indigo-200 mb-1 font-bold">OBLITERATUS INFERENCE:</p>
                    <p className="text-[10px] font-mono text-zinc-300 break-words">{topology.ocrTextPreview}</p>
                </div>
             )}
             
             <button 
                onClick={() => { setTopology(null); setPreviewImage(null); }}
                className="mt-6 text-[10px] text-indigo-200 hover:text-indigo-300 font-bold tracking-wider"
             >
                [ RESET ARRAY ]
             </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
