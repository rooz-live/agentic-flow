#!/usr/bin/env node
/**
 * yo.life Digital Cockpit CLI
 *
 * Dimensional UI/UX command-line interface for life enhancement
 * Integrates with claude-flow V3, MCP, and AgentDB
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
//# sourceMappingURL=yolife-cockpit.d.ts.map