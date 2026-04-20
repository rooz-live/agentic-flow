import React from 'react';

/**
 * Panic Matrix Viewer
 *
 * Topological panic visualization. Translates the 1024-dimensional
 * Cosine Similarity distance into a comprehensible 2D heatmap or
 * scatter plot for the operator to review the anomaly gravity well.
 */
export const PanicMatrixViewer: React.FC<{ dataPoints: { id: string; x: number; y: number; panic: number }[] }> = ({ dataPoints }) => {
  return (
    <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl font-mono text-gray-300">
      <h2 className="text-lg font-bold text-red-400 mb-4 tracking-widest border-b border-red-900/50 pb-2">
        TOPOLOGICAL PANIC MATRIX
      </h2>
      <div className="relative w-full h-64 bg-black/50 rounded overflow-hidden border border-gray-800/50">
        {/* Simplified scatter representation of the 1024D vector distance */}
        {dataPoints.map((pt, i) => (
          <div
            key={i}
            className="absolute rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ease-in-out"
            style={{
              left: `${pt.x}%`,
              top: `${pt.y}%`,
              width: `${Math.max(4, pt.panic * 20)}px`,
              height: `${Math.max(4, pt.panic * 20)}px`,
              backgroundColor: `rgba(${255 * pt.panic}, ${50 * (1 - pt.panic)}, ${100 * (1 - pt.panic)}, ${0.4 + (pt.panic * 0.6)})`,
              boxShadow: `0 0 ${pt.panic * 15}px rgba(255,0,0,${pt.panic})`
            }}
            title={`${pt.id}: ${(pt.panic * 100).toFixed(1)}% Gravity`}
          />
        ))}
        {dataPoints.length === 0 && (
          <div className="flex h-full items-center justify-center text-gray-600 text-sm">
            NO ANOMALOUS VECTORS DETECTED IN LATENT SPACE
          </div>
        )}
      </div>
      <div className="mt-3 flex justify-between text-[10px] text-gray-500 uppercase">
        <span>Baseline (Safe)</span>
        <span>Gravity Well (Panic)</span>
      </div>
    </div>
  );
};
