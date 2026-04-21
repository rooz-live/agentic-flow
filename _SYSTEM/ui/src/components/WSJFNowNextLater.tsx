import React, { useState } from 'react';
import ReactFlow, { Background, Controls, MiniMap, Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';

/**
 * WSJF Now, Next, Later UI
 *
 * Visually maps the pi-sync-targets.min.json into the ReactFlow
 * architecture to visualize priority execution order across TLDs.
 */

const initialNodes: Node[] = [
  { id: '1', position: { x: 50, y: 50 }, data: { label: 'NOW: interface.rooz.live' }, style: { background: '#10b981', color: '#fff', border: 'none' } },
  { id: '2', position: { x: 300, y: 50 }, data: { label: 'NEXT: hab.yo.life' }, style: { background: '#f59e0b', color: '#fff', border: 'none' } },
  { id: '3', position: { x: 550, y: 50 }, data: { label: 'LATER: file.720.chat' }, style: { background: '#64748b', color: '#fff', border: 'none' } },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#4f46e5' } },
  { id: 'e2-3', source: '2', target: '3', style: { stroke: '#4f46e5' } },
];

export const WSJFNowNextLater: React.FC = () => {
  const [nodes] = useState<Node[]>(initialNodes);
  const [edges] = useState<Edge[]>(initialEdges);

  return (
    <div className="bg-gray-950 p-6 rounded-xl border border-gray-800 font-mono text-gray-300">
      <h2 className="text-lg font-bold text-indigo-400 mb-4 tracking-widest border-b border-indigo-900/50 pb-2">
        WSJF: NOW, NEXT, LATER
      </h2>
      <div className="w-full h-64 bg-black/50 rounded overflow-hidden border border-gray-800/50">
        <ReactFlow nodes={nodes} edges={edges} fitView>
          <Background color="#334155" gap={16} />
          <Controls />
          <MiniMap nodeColor="#4f46e5" maskColor="rgba(0,0,0,0.8)" />
        </ReactFlow>
      </div>
    </div>
  );
};
