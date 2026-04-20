import React from "react";
import type { TelemetryData } from "../lib/physicsTypes";

/**
 * Hierarchical mesh navigation: WSJF lanes (now / next / later) derived from
 * normalized physics telemetry (including economic gate `wsjfQueue` when set).
 */
export const HierarchicalMeshNav: React.FC<{
  telemetry: TelemetryData | null;
}> = ({ telemetry }) => {
  const lanes = telemetry?.wsjfQueue ?? {
    now: "Awaiting telemetry — run OPEX probe or MAPE-K cycle",
    next: "—",
    later: "—",
  };

  const wsjf = telemetry?.plan.wsjf_score ?? 0;
  const panic = telemetry?.analyze.panic_matrix_distance ?? 0;

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 font-mono text-gray-300">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 pb-3 mb-3">
        <h2 className="text-sm font-black tracking-widest text-indigo-400">
          HIERARCHICAL_MESH // WSJF
        </h2>
        <div className="flex gap-2 text-[10px] uppercase">
          <span className="px-2 py-0.5 rounded border border-emerald-800 text-emerald-400">
            score {wsjf.toFixed(0)}
          </span>
          <span
            className={`px-2 py-0.5 rounded border ${
              panic > 0.75
                ? "border-red-800 text-red-400"
                : "border-gray-700 text-gray-500"
            }`}
          >
            panic {panic.toFixed(3)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="rounded-lg bg-emerald-950/30 border border-emerald-900/50 p-3">
          <div className="text-[10px] text-emerald-500 font-bold mb-1 tracking-widest">
            NOW
          </div>
          <p className="text-emerald-100/90 leading-snug">{lanes.now}</p>
        </div>
        <div className="rounded-lg bg-amber-950/20 border border-amber-900/40 p-3">
          <div className="text-[10px] text-amber-500 font-bold mb-1 tracking-widest">
            NEXT
          </div>
          <p className="text-amber-100/90 leading-snug">{lanes.next}</p>
        </div>
        <div className="rounded-lg bg-slate-900/80 border border-slate-700 p-3">
          <div className="text-[10px] text-slate-500 font-bold mb-1 tracking-widest">
            LATER
          </div>
          <p className="text-slate-300/90 leading-snug">{lanes.later}</p>
        </div>
      </div>
    </div>
  );
};
