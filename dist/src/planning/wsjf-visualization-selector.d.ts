/**
 * WSJF (Weighted Shortest Job First) Visualization Auto-Selector
 *
 * Integrates with MCP (Model Context Protocol) and MPP (Method Pattern Protocol)
 * to automatically select optimal visualization framework based on:
 * - Business Value
 * - Time Criticality
 * - Risk Reduction
 * - Job Size
 *
 * Frameworks evaluated:
 * 1. Deck.gl (GPU-powered, React-friendly, proven scale)
 * 2. Three.js (more control, steeper learning curve)
 * 3. Babylon.js (game engine, full 3D scenes)
 * 4. Cesium (geospatial 3D, massive datasets)
 * 5. WebGPU/Rio Terminal (next-gen GPU compute)
 */
export interface WSJFScore {
    businessValue: number;
    timeCriticality: number;
    riskReduction: number;
    jobSize: number;
    wsjf: number;
}
export interface VisualizationFramework {
    name: string;
    type: 'webgl' | 'webgpu' | 'canvas';
    reactFriendly: boolean;
    gpuPowered: boolean;
    learningCurve: 'easy' | 'moderate' | 'steep';
    maturity: 'experimental' | 'stable' | 'proven';
    dataScale: 'small' | 'medium' | 'large' | 'massive';
    use3D: boolean;
    geospatial: boolean;
    packageSize: string;
    wsjfScore?: WSJFScore;
}
export interface ProjectRequirements {
    mcpFactors: {
        modelComplexity: 'low' | 'medium' | 'high';
        contextSize: number;
        protocolOverhead: 'minimal' | 'moderate' | 'high';
    };
    mppFactors: {
        methodPattern: 'iterate' | 'flow' | 'pi' | 'spike' | 'sprint' | 'sync';
        timeboxed: boolean;
        sprintDuration: number;
        velocity: number;
    };
    technical: {
        dataSize: number;
        recordCount: number;
        requires3D: boolean;
        requiresGeospatial: boolean;
        reactStack: boolean;
        performanceCritical: boolean;
    };
    business: {
        timeToMarket: number;
        budget: number;
        riskTolerance: 'low' | 'medium' | 'high';
        productionDeadline?: Date;
    };
}
export declare class WSJFVisualizationSelector {
    private frameworks;
    /**
     * Calculate WSJF score for a framework given project requirements
     */
    private calculateWSJF;
    /**
     * Evaluate all frameworks and return ranked list
     */
    evaluateFrameworks(requirements: ProjectRequirements): VisualizationFramework[];
    /**
     * Get recommended framework with explanation
     */
    getRecommendation(requirements: ProjectRequirements): {
        framework: VisualizationFramework;
        rationale: string;
        alternatives: VisualizationFramework[];
    };
    private generateRationale;
    private explainBusinessValue;
    private explainTimeCriticality;
    private explainRiskReduction;
    private explainJobSize;
}
/**
 * Example usage for agentic-flow project
 */
export declare function selectVisualizationForAgenticFlow(): void;
/**
 * MCP Integration: Store decision in Model Context Protocol
 */
export interface MCPVisualizationDecision {
    timestamp: Date;
    framework: string;
    wsjfScore: number;
    requirements: ProjectRequirements;
    rationale: string;
}
export declare function storeMCPDecision(decision: MCPVisualizationDecision): void;
/**
 * MPP Integration: Track method pattern protocol factors
 */
export declare function trackMPPFactors(methodPattern: 'iterate' | 'flow' | 'pi' | 'spike' | 'sprint' | 'sync', duration: number, velocity: number): void;
//# sourceMappingURL=wsjf-visualization-selector.d.ts.map