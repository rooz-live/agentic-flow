import React from 'react';
interface RoamNode {
    id: string;
    type: 'skill' | 'episode' | 'circle' | 'causal_edge';
    label: string;
    circle?: string;
    metric?: number;
}
interface RoamEdge {
    source: string;
    target: string;
    type: 'relationship' | 'ontology' | 'attribution' | 'metrics';
    weight: number;
}
interface RoamGraphProps {
    nodes: RoamNode[];
    edges: RoamEdge[];
    width?: number;
    height?: number;
    onNodeClick?: (node: RoamNode) => void;
}
export declare const RoamGraph: React.FC<RoamGraphProps>;
export {};
//# sourceMappingURL=RoamGraph.d.ts.map