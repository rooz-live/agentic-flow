export type RiskCategory = 'security' | 'performance' | 'compliance' | 'business-critical';
export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';
export interface RiskProfile {
    category: RiskCategory;
    severity: RiskSeverity;
    complexity: number;
}
export declare function normalizeRiskProfile(risk: RiskProfile): RiskProfile;
export declare function calculateAgentCount(risk: RiskProfile): number;
export type SwarmTopology = 'mesh' | 'hierarchical';
export declare function calculateTopology(risk: RiskProfile): SwarmTopology;
export declare function splitAgentCountAcrossSandboxes(agentCount: number, maxAgentsPerSandbox: number): number[];
//# sourceMappingURL=riskAgentAllocation.d.ts.map