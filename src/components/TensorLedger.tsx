import React from 'react';

export const TensorLedger = () => {
  return (
    <div className="p-8 space-y-6 w-full h-full">
      <div className="border-b border-white/10 pb-4 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-red-400 tracking-wide">Systemic Ledger</h2>
          <p className="text-gray-400">Auditor DBOS drillable E2E data table depth probes</p>
        </div>
        <button className="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg border border-red-500/30 hover:bg-red-500/30 transition-colors text-sm font-bold">
          Rerun Node
        </button>
      </div>

      <div className="bg-black/50 border border-white/10 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="bg-white/5 border-b border-white/10">
            <tr>
              <th className="p-4 font-mono text-xs uppercase tracking-wider text-gray-500">Time</th>
              <th className="p-4 font-mono text-xs uppercase tracking-wider text-gray-500">Vector</th>
              <th className="p-4 font-mono text-xs uppercase tracking-wider text-gray-500">Target</th>
              <th className="p-4 font-mono text-xs uppercase tracking-wider text-gray-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            <tr className="hover:bg-white/5 transition-colors">
              <td className="p-4 font-mono text-xs text-gray-500">2026-05-06T12:00:00Z</td>
              <td className="p-4"><span className="px-2 py-1 bg-indigo-500/10 text-indigo-400 rounded text-xs font-mono border border-indigo-500/20">AUTH_INGRESS</span></td>
              <td className="p-4 font-mono text-gray-400">auth.tag.ooo</td>
              <td className="p-4 text-right">
                <button className="bg-white/5 text-gray-300 px-3 py-1 rounded text-xs hover:bg-white/10">Inspect</button>
              </td>
            </tr>
            <tr className="hover:bg-white/5 transition-colors">
              <td className="p-4 font-mono text-xs text-gray-500">2026-05-06T12:01:23Z</td>
              <td className="p-4"><span className="px-2 py-1 bg-red-500/10 text-red-400 rounded text-xs font-mono border border-red-500/20">QUARANTINE_NODE</span></td>
              <td className="p-4 font-mono text-gray-400">compute-7.stx.net</td>
              <td className="p-4 text-right">
                <button className="bg-white/5 text-gray-300 px-3 py-1 rounded text-xs hover:bg-white/10">Inspect</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
