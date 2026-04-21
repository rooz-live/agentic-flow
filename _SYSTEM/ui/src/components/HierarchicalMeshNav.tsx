import React, { useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
} from "reactflow";
import "reactflow/dist/style.css";

/**
 * Hierarchical Mesh Nav UI
 *
 * Swarm topology visualization
 */

const initialNodes: Node[] = [
  {
    id: "n1",
    position: { x: 250, y: 5 },
    data: { label: "Swarm Orchestrator" },
    style: { background: "#6366f1", color: "#fff", border: "none" },
  },
  {
    id: "n2",
    position: { x: 100, y: 100 },
    data: { label: "Analyze Agent" },
    style: { background: "#ec4899", color: "#fff", border: "none" },
  },
  {
    id: "n3",
    position: { x: 400, y: 100 },
    data: { label: "Execution Agent" },
    style: { background: "#f59e0b", color: "#fff", border: "none" },
  },
];

const initialEdges: Edge[] = [
  {
    id: "e1-2",
    source: "n1",
    target: "n2",
    animated: true,
    style: { stroke: "#4f46e5" },
  },
  {
    id: "e1-3",
    source: "n1",
    target: "n3",
    animated: true,
    style: { stroke: "#4f46e5" },
  },
];

export const HierarchicalMeshNav: React.FC = () => {
  const [nodes] = useState<Node[]>(initialNodes);
  const [edges] = useState<Edge[]>(initialEdges);

  return (
    <div className="bg-gray-950 p-6 rounded-xl border border-gray-800 font-mono text-gray-300">
      <h2 className="text-lg font-bold text-indigo-400 mb-4 tracking-widest border-b border-indigo-900/50 pb-2">
        HIERARCHICAL MESH NAV
      </h2>
      <div className="w-full h-64 bg-black/50 rounded overflow-hidden border border-gray-800/50">
        <ReactFlow nodes={nodes} edges={edges} fitView>
          <Background color="#334155" gap={16} />
          <Controls />
          <MiniMap nodeColor="#ec4899" maskColor="rgba(0,0,0,0.8)" />
        </ReactFlow>
      </div>
    </div>
  );
};
