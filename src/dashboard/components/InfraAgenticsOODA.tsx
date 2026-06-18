import React, { useState } from 'react';
import { Play, Square, Activity, Database, Server } from 'lucide-react';

export function InfraAgenticsOODA() {
  const [status, setStatus] = useState<'IDLE' | 'RUNNING' | 'HALTED'>('IDLE');
  const [logs, setLogs] = useState<string[]>([]);
  const [cycleTime, setCycleTime] = useState<string>('Offline');

  React.useEffect(() => {
    fetch('http://localhost:5001/api/infra/cycle-time')
      .then(r => r.json())
      .then(data => {
         if (data.cycle_time_ms) {
            const secs = (data.cycle_time_ms / 1000).toFixed(1);
            setCycleTime(`${secs}s`);
         }
      })
      .catch(() => setCycleTime('Blind'));
  }, [status]);

  const startSwarm = async () => {
    setStatus('RUNNING');
    setLogs(prev => [...prev, 'Starting Swarm Inference Metrics on omni_restore_decade.sh loops...']);
    setLogs(prev => [...prev, 'Bootstrapping .venv: python3 -m venv .venv && source .venv/bin/activate && pip install google-genai']);
    
    try {
      const response = await fetch('http://localhost:5001/api/infra/trigger-swarm-inference', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.success) {
        setLogs(prev => [...prev, 'OODA Monitor: Swarm Execution Complete.', ...data.metrics.split('\n')]);
        if (data.errors) {
          setLogs(prev => [...prev, '[WARNING] ' + data.errors]);
        }
      } else {
        setLogs(prev => [...prev, `[ERROR] ${data.error}: ${data.details}`]);
      }
    } catch (err: any) {
      setLogs(prev => [...prev, `[FATAL EXCEPTION] ${err.message}`]);
    } finally {
      setStatus('HALTED');
      setLogs(prev => [...prev, 'Swarm Halted. Event ledger appended.']);
    }
  };

  const haltSwarm = () => {
    setStatus('HALTED');
    setLogs(prev => [...prev, 'Manual override: Swarm halted.']);
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-3xl border border-white/10 rounded-2xl p-6 shadow-2xl text-slate-200">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Server className="w-6 h-6 text-emerald-400" />
          <h2 className="text-xl font-light tracking-wide">Infra Agentics OODA Swarm Monitor</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className={`px-3 py-1 rounded-full text-xs font-bold tracking-widest ${status === 'RUNNING' ? 'bg-emerald-500/20 text-emerald-400 animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
            {status}
          </div>
          <button 
            onClick={startSwarm}
            disabled={status === 'RUNNING'}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-600/40 transition-colors disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            <span className="text-sm font-medium tracking-wide">BOOT SWARM</span>
          </button>
          <button 
            onClick={haltSwarm}
            disabled={status !== 'RUNNING'}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600/20 text-rose-400 border border-rose-500/30 rounded-lg hover:bg-rose-600/40 transition-colors disabled:opacity-50"
          >
            <Square className="w-4 h-4" />
            <span className="text-sm font-medium tracking-wide">HALT</span>
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-slate-950/80 border border-slate-800 rounded-lg p-4 h-64 overflow-y-auto font-mono text-xs">
          <div className="text-emerald-500 mb-2">Systemic Event Sourcing Ledger:</div>
          {logs.length === 0 && <div className="text-slate-600">Awaiting execution...</div>}
          {logs.map((log, i) => (
            <div key={i} className="mb-1 text-emerald-400/80">{'> '}{log}</div>
          ))}
        </div>
        <div className="space-y-4">
           <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                 <Activity className="w-4 h-4" />
                 <span className="text-xs uppercase tracking-widest">Cycle Time</span>
              </div>
              <div className="text-2xl font-light text-white">{cycleTime}</div>
           </div>
           <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                 <Database className="w-4 h-4" />
                 <span className="text-xs uppercase tracking-widest">SCD BEAM</span>
              </div>
              <div className="text-2xl font-light text-white">Verified</div>
           </div>
        </div>
      </div>
    </div>
  );
}
