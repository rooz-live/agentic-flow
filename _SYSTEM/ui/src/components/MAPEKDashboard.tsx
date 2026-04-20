import React, { useState, useEffect } from 'react';
import type { TelemetryData } from '../lib/physicsTypes';
import { mapGenuineTelemetryFile } from '../lib/mapGenuineTelemetryToPhysics';

/**
 * MAPEK Dashboard (Monitor, Analyze, Plan, Execute, Knowledge)
 *
 * Real-time guardian visualization binding the physical telemetry of the
 * Economic Reactor to a user-facing React component. Reads directly from
 * .goalie/genuine_telemetry.json to bypass subjective reporting.
 */

export const MAPEKDashboard: React.FC<{
  /** When set, skips network fetch and displays this snapshot */
  telemetrySnapshot?: TelemetryData | null;
}> = ({ telemetrySnapshot }) => {
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(
    telemetrySnapshot ?? null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (telemetrySnapshot !== undefined) {
      setTelemetry(telemetrySnapshot ?? null);
      setError(null);
      return;
    }

    const fetchTelemetry = async () => {
      try {
        const response = await fetch("/.goalie/genuine_telemetry.json", {
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Telemetry fetch failed");
        const text = await response.text();
        const mapped = mapGenuineTelemetryFile(text);
        if (!mapped) throw new Error("Unparseable genuine telemetry ledger");
        setTelemetry(mapped);
        setError(null);
      } catch (err) {
        setError(
          "Failed to load .goalie/genuine_telemetry.json (serve repo root or proxy /.goalie/).",
        );
        console.error(err);
      }
    };

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 2000);
    return () => clearInterval(interval);
  }, [telemetrySnapshot]);

  if (error) {
    return (
      <div className="p-4 bg-red-900 border border-red-500 text-red-100 rounded-lg font-mono">
        <h2 className="text-lg font-bold mb-2">[CRITICAL] TELEMETRY LOST</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!telemetry) {
    return <div className="animate-pulse text-indigo-400 font-mono">Establishing telemetry link...</div>;
  }

  const { monitor, analyze, plan, execute, knowledge } = telemetry;

  // Layer 4 domain health from legal-entity-matrix.json
  const layer4Domains = telemetry.layer4?.domains || {
    'rooz.live': { status: 'healthy', role: 'interface' },
    'tag.ooo': { status: 'healthy', role: 'auth' },
    'pur.tag.vote': { status: 'healthy', role: 'consensus' },
    'hab.yo.life': { status: 'healthy', role: 'preservation' },
  };

  // Dynamic styling based on physical state
  const executeColor =
    execute.status === 'CIRCUIT_TRIPPED' ? 'text-red-500 border-red-500 bg-red-950/30' :
    execute.status === 'EXECUTING' ? 'text-yellow-400 border-yellow-400 bg-yellow-950/30' :
    'text-green-400 border-green-400 bg-green-950/30';

  const panicColor = analyze.panic_matrix_distance > 0.8 ? 'text-red-500' : 'text-emerald-400';

  return (
    <div className="bg-gray-950 text-gray-200 p-6 rounded-xl border border-gray-800 shadow-2xl font-mono max-w-4xl w-full">
      <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
        <h1 className="text-2xl font-black text-indigo-400 tracking-wider">
          SYSTEMIC.OS // MAPE-K GUARDIAN
        </h1>
        <div className="text-xs text-gray-500 flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
          </span>
          PHYSICAL LINK ACTIVE
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* MONITOR */}
        <div className="bg-gray-900 p-4 rounded border border-gray-800">
          <h3 className="text-sm text-gray-500 uppercase tracking-widest mb-3">M // Monitor</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Kernel MMAP:</span>
              <span className="text-indigo-300">{monitor.memory_mapped_mb} MB</span>
            </div>
            <div className="flex justify-between">
              <span>Active Agents:</span>
              <span>{monitor.active_agents}</span>
            </div>
            <div className="flex justify-between">
              <span>API Latency:</span>
              <span className={monitor.api_latency_ms > 1000 ? 'text-red-400' : 'text-green-400'}>
                {monitor.api_latency_ms}ms
              </span>
            </div>
          </div>
        </div>

        {/* ANALYZE */}
        <div className="bg-gray-900 p-4 rounded border border-gray-800">
          <h3 className="text-sm text-gray-500 uppercase tracking-widest mb-3">A // Analyze</h3>
          <div className="space-y-2 text-sm">
            <div className="flex flex-col">
              <span className="text-gray-400 mb-1">Panic Matrix Distance:</span>
              <div className="w-full bg-gray-800 rounded-full h-2.5 mb-1">
                <div
                  className={`h-2.5 rounded-full ${analyze.panic_matrix_distance > 0.8 ? 'bg-red-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(analyze.panic_matrix_distance * 100, 100)}%` }}
                ></div>
              </div>
              <span className={`text-right font-bold ${panicColor}`}>
                {analyze.panic_matrix_distance.toFixed(4)}
              </span>
            </div>
            <div className="mt-2 text-xs">
              {analyze.anomaly_detected ?
                <span className="text-red-400 bg-red-900/20 px-2 py-1 rounded border border-red-900/50">ANOMALY GRAVITY WELL DETECTED</span> :
                <span className="text-gray-500">Nominal Topological Flow</span>
              }
            </div>
          </div>
        </div>

        {/* EXECUTE / CONTAINMENT */}
        <div className={`p-4 rounded border ${executeColor} transition-colors duration-300`}>
          <h3 className="text-sm uppercase tracking-widest mb-3 opacity-80">E // Execute (Cage)</h3>
          <div className="flex flex-col items-center justify-center h-16">
            <span className="text-xl font-black tracking-widest">{execute.status}</span>
            {execute.status === 'CIRCUIT_TRIPPED' && (
              <span className="text-xs mt-1 font-bold animate-pulse">
                MECHANICAL SAFETY ENGAGED
              </span>
            )}
          </div>
        </div>

        {/* PLAN */}
        <div className="bg-gray-900 p-4 rounded border border-gray-800 col-span-1 md:col-span-2">
          <h3 className="text-sm text-gray-500 uppercase tracking-widest mb-3">P // Plan (WSJF Queue)</h3>
          <div className="flex items-center justify-between bg-gray-950 p-3 rounded border border-gray-800/50">
            <div className="truncate pr-4 text-indigo-200">
              <span className="text-gray-500 mr-2">&gt;</span>
              {plan.proposed_action}
            </div>
            <div className="flex gap-4 shrink-0">
              <div className="text-right">
                <div className="text-[10px] text-gray-500 uppercase">WSJF</div>
                <div className="text-emerald-400 font-bold">{plan.wsjf_score.toFixed(1)}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-gray-500 uppercase">Conf</div>
                <div className="text-blue-400 font-bold">{(plan.confidence * 100).toFixed(0)}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* KNOWLEDGE */}
        <div className="bg-gray-900 p-4 rounded border border-gray-800">
          <h3 className="text-sm text-gray-500 uppercase tracking-widest mb-3">K // Knowledge</h3>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full border-2 border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold">
              {knowledge.active_context_rings}
            </div>
            <div className="text-xs text-gray-400 leading-tight">
              Active Context Rings<br/>
              <span className="text-gray-600">Identity-Locked Vectors</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 text-right text-[10px] text-gray-600 uppercase">
        Last Sync: {new Date(telemetry.timestamp).toLocaleTimeString()} UTC
      </div>
    </div>
  );
};
