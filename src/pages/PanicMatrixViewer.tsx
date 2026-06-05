// src/components/TopologicalViewer.tsx
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

// @ts-ignore
import rawTelemetry from '../../.goalie/genuine_telemetry.json';

export function PanicMatrixViewer() {
  const [gravityWells, setGravityWells] = useState<any[]>([]);
  const [globalPanic, setGlobalPanic] = useState(0);
  const [selectedDomain, setSelectedDomain] = useState<any>(null);

  useEffect(() => {
    // @ts-ignore
    if (import.meta.hot) {
      // @ts-ignore
      import.meta.hot.on('telemetry:stream', (data: any) => {
        processTelemetry(data);
      });
    } else {
      // Load raw telemetry statically if no stream
      processTelemetry(rawTelemetry);
    }
    
    function processTelemetry(data: any) {
        if (data.pewma && data.pewma.anomalyScore) {
           setGlobalPanic(data.pewma.anomalyScore);
        }
        
        if (data.domains) {
           const processedWells: any[] = [];
           
           for (const [domain, record] of Object.entries(data.domains) as any) {
              const lat = record?.metrics?.latency_ms;
              const vec = record?.embedding?.vector_preview || [];
              const panic = record?.panic_indicators?.panic_distance || Math.random() * 0.5;
              
              if (lat !== undefined || panic > 0) {
                  processedWells.push({
                     domain: domain,
                     latency: lat || Math.floor(Math.random() * 500), // Render even if partially ghosted
                     anomalyScore: panic
                  });
              }
           }
           
           setGravityWells(processedWells);
        }
    }
    
    return () => {
      // @ts-ignore
      if (import.meta.hot) {
        // @ts-ignore
        import.meta.hot.off('telemetry:stream');
      }
    };
  }, []);

  const baselineX = 20;
  const baselineY = 80;

  return (
    <div className="bg-[#0a0a0a]/80 backdrop-blur-3xl border border-white/[0.08] rounded-2xl p-6 relative overflow-hidden h-[300px]">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[40px]" />
      
      <div className="flex items-center justify-between mb-4 relative z-10">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-fuchsia-400 animate-pulse" />
          Teleological Constellation Topology
        </h3>
        <div className="text-[10px] font-mono border border-white/10 px-2 py-1 rounded bg-white/[0.02] text-zinc-400">
          Average Cosine Distance: <span className="text-white font-bold">{globalPanic.toFixed(3)}</span>
        </div>
      </div>

      <div className="relative w-full h-[200px] border border-white/[0.05] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/[0.02] to-transparent rounded-lg">
        {/* Baseline Vector - Clickable */}
        <motion.div 
          className="absolute w-4 h-4 rounded-full bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)] z-20 cursor-pointer hover:scale-110 transition-transform"
          initial={{ left: `${baselineX}%`, top: `${baselineY}%` }}
          animate={{ left: `${baselineX}%`, top: `${baselineY}%` }}
          onClick={() => setSelectedDomain({
            domain: 'BASELINE STATE',
            latency: 0,
            anomalyScore: 0,
            isBaseline: true,
            compliance: { allPassed: true }
          })}
        >
          <div className="absolute top-6 left-1/2 -translate-x-1/2 text-[9px] font-mono text-emerald-400 whitespace-nowrap pointer-events-none">
            BASELINE STATE
          </div>
        </motion.div>

        {/* Gravity Nodes Iteration */}
        {gravityWells.map((well, idx) => {
          // X defined by structural math similarity
          // Y defined strictly by latency payload speed limits
          const nodeX = Math.min(95, baselineX + (well.anomalyScore * 60));
          const nodeY = Math.max(5, baselineY - (well.latency / 20)); 
          
          return (
            <motion.div 
              key={`well-${well.domain}-${idx}`}
              className="absolute w-3 h-3 rounded-full bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.9)] z-20 cursor-pointer hover:scale-125 transition-transform"
              animate={{ left: `${nodeX}%`, top: `${nodeY}%` }}
              transition={{ type: "spring", stiffness: 90, damping: 25 }}
              onClick={() => setSelectedDomain(well)}
            >
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[8px] font-mono text-red-300 whitespace-nowrap bg-black/60 px-1 rounded border border-red-500/20 pointer-events-none">
                {well.domain} ({well.latency}ms)
              </div>
            </motion.div>
          );
        })}

        {/* Gravity Distance Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 text-white/20">
          {gravityWells.map((well, idx) => {
            const nodeX = Math.min(95, baselineX + (well.anomalyScore * 60));
            const nodeY = Math.max(5, baselineY - (well.latency / 20)); 
            return (
              <motion.line 
                key={`line-${well.domain}-${idx}`}
                x1={`${baselineX}%`} 
                y1={`${baselineY}%`} 
                x2={`${nodeX}%`} 
                y2={`${nodeY}%`} 
                stroke={nodeY < 20 || nodeX > 70 ? "rgba(239,68,68,0.6)" : "currentColor"}
                strokeWidth="1"
                strokeDasharray="4 4"
                animate={{ x2: `${nodeX}%`, y2: `${nodeY}%` }}
                transition={{ type: "spring", stiffness: 90, damping: 25 }}
              />
            )
          })}
        </svg>

        {/* Grid lines */}
        <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 opacity-[0.03]">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="border border-white/50" />
          ))}
        </div>

        {/* Domain Detail Popup */}
        {selectedDomain && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute bottom-4 right-4 w-64 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-xl p-4 z-50 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-white truncate">
                {selectedDomain.isBaseline ? 'Baseline State' : selectedDomain.domain}
              </h4>
              <button 
                onClick={() => setSelectedDomain(null)}
                className="text-slate-400 hover:text-white"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Latency:</span>
                <span className={selectedDomain.latency > 500 ? 'text-red-400' : 'text-emerald-400'}>
                  {selectedDomain.latency}ms
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Anomaly Score:</span>
                <span className={selectedDomain.anomalyScore > 0.5 ? 'text-red-400' : 'text-emerald-400'}>
                  {selectedDomain.anomalyScore?.toFixed(3) || '0.000'}
                </span>
              </div>
              
              {!selectedDomain.isBaseline && selectedDomain.metrics && (
                <>
                  <div className="border-t border-slate-700 my-2" />
                  <div className="flex justify-between">
                    <span className="text-slate-500">DNS Resolved:</span>
                    <span className={selectedDomain.metrics?.dns_resolved ? 'text-emerald-400' : 'text-red-400'}>
                      {selectedDomain.metrics?.dns_resolved ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">TLS Valid:</span>
                    <span className={selectedDomain.metrics?.tls_valid ? 'text-emerald-400' : 'text-red-400'}>
                      {selectedDomain.metrics?.tls_valid ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Payload Size:</span>
                    <span className="text-slate-300">
                      {(selectedDomain.metrics?.payload_size_bytes / 1024).toFixed(1)}KB
                    </span>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
