/**
 * WSJF (Weighted Shortest Job First) 3D Visualization
 *
 * Uses Deck.gl for GPU-powered rendering of:
 * - MCP (Model Context Protocol) factors
 * - MPP (Method Pattern Protocol) factors
 * - WSJF scores with auto-selection
 * - Hierarchical-mesh topology overlay
 * - Real-time priority heatmap
 */
interface WsjfItem {
    id: string;
    title: string;
    businessValue: number;
    timeCriticality: number;
    riskReduction: number;
    jobSize: number;
    wsjfScore: number;
    position: [number, number, number];
    mcpFactor?: number;
    mppFactor?: number;
    selected: boolean;
    type: 'feature' | 'bug' | 'tech-debt' | 'spike';
}
interface WsjfVisualizationProps {
    items: WsjfItem[];
    onItemSelect?: (item: WsjfItem) => void;
    autoSelectTop?: number;
    showMeshTopology?: boolean;
}
export default function WsjfVisualization({ items, onItemSelect, autoSelectTop, showMeshTopology }: WsjfVisualizationProps): import("react/jsx-runtime").JSX.Element;
export declare function generateSampleWsjfData(): WsjfItem[];
export {};
//# sourceMappingURL=WsjfVisualization.d.ts.map