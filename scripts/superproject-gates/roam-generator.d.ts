import { AgentDB } from '../core/agentdb';
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
export interface RoamData {
    nodes: RoamNode[];
    edges: RoamEdge[];
}
export declare function generateRoamData(db: AgentDB): Promise<RoamData>;
export declare function generateMockRoamData(): RoamData;
export {};
//# sourceMappingURL=roam-generator.d.ts.map