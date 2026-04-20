import React, { useState, useEffect } from 'react';
import { MAPEKDashboard } from '../components/MAPEKDashboard';
import { PanicMatrixViewer } from '../components/PanicMatrixViewer';
import { VisionClawUploader } from '../components/VisionClawUploader';

export const DashboardPage: React.FC = () => {
  // Simulated data for the Panic Matrix Viewer
  const [matrixData, setMatrixData] = useState<{ id: string; x: number; y: number; panic: number }[]>([]);

  useEffect(() => {
    // Simulate incoming OSINT vectors causing gravity wells
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        const newPoint = {
          id: `VEC-${Math.floor(Math.random() * 1000)}`,
          x: Math.random() * 100,
          y: Math.random() * 100,
          panic: Math.random() // 0 to 1 gravity distance
        };

        setMatrixData(prev => {
          const updated = [...prev, newPoint];
          if (updated.length > 20) return updated.slice(updated.length - 20);
          return updated;
        });
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#030712] p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black text-gray-100 tracking-tighter">
            ECONOMIC REACTOR <span className="text-indigo-500">PHYSICS ENGINE</span>
          </h1>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-indigo-900/30 text-indigo-400 border border-indigo-500/30 rounded text-xs font-bold font-mono tracking-widest">--mmap 1</span>
            <span className="px-3 py-1 bg-red-900/30 text-red-400 border border-red-500/30 rounded text-xs font-bold font-mono tracking-widest">CAGE: LOCKED</span>
          </div>
        </div>

        <p className="text-gray-500 font-mono text-sm max-w-3xl">
          Deterministic logic replaced by thermodynamic boundaries. The system measures pressure, constraint, and entropy via spatial topology. Immunity is physical, not contractual.
        </p>

        {/* Top Row: MAPEK Guardian */}
        <div className="w-full">
          <MAPEKDashboard />
        </div>

        {/* Bottom Row: Topology & Ingestion */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PanicMatrixViewer dataPoints={matrixData} />
          <VisionClawUploader />
        </div>

      </div>
    </div>
  );
};
