/**
 * yo.life Digital Cockpit Types
 * Standalone type definitions for dimensional UI/UX menu system
 * Can be imported without pulling in CLI dependencies
 */
export declare enum Dimension {
    TEMPORAL = "temporal",
    SPATIAL = "spatial",
    DEMOGRAPHIC = "demographic",
    PSYCHOLOGICAL = "psychological",
    ECONOMIC = "economic"
}
export declare enum ViewMode {
    TIMELINE = "timeline",
    MAP = "map",
    NETWORK = "network",
    MENTAL_MODEL = "mental-model",
    RESOURCE = "resource"
}
export interface CockpitConfig {
    primaryDimension: Dimension;
    viewMode: ViewMode;
    claudeFlowEnabled: boolean;
    mcpServers: string[];
    agentdbConnected: boolean;
}
export interface LifeEvent {
    id: string;
    timestamp: Date;
    title: string;
    description: string;
    location?: {
        lat: number;
        lng: number;
        name: string;
    };
    emotional: {
        valence: number;
        arousal: number;
    };
    tags: string[];
    significance: number;
}
export interface DimensionalInsight {
    dimension: Dimension;
    metric: string;
    value: any;
    trend: 'up' | 'down' | 'stable';
    agentSource?: string;
}
//# sourceMappingURL=yolife-types.d.ts.map