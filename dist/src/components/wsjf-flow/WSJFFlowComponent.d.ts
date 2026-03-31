/**
 * ReactFlow Component for WSJF Workflow Visualization
 * Modern UI with HeroUI styling patterns
 */
import React from 'react';
import { Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
type FlowType = 'wsjf' | 'goap' | 'testing';
interface WSJFFlowProps {
    flowType?: FlowType;
    onNodeClick?: (node: Node) => void;
    onEdgeClick?: (edge: Edge) => void;
}
export declare const WSJFFlowComponent: React.FC<WSJFFlowProps>;
export default WSJFFlowComponent;
//# sourceMappingURL=WSJFFlowComponent.d.ts.map