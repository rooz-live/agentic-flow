/**
 * Advocate CLI - Document/Script Consolidation Tool
 *
 * Capabilities:
 * - Detect and eliminate script/document sprawl
 * - Preserve all capabilities during consolidation
 * - Enforce DDD boundary structure
 * - Generate ADRs for architectural decisions
 * - Analyze script dependencies
 * - WSJF-based prioritization
 */
interface AdvocateConfig {
    workDir: string;
}
interface AuditResult {
    totalFiles: number;
    sprawlDetected: boolean;
    recommendations: string[];
    capabilities?: string[];
    dependencies?: string[];
    duplicates?: Array<{
        files: string[];
        hash: string;
    }>;
}
interface ConsolidateResult {
    success: boolean;
    filesConsolidated: number;
    adrsGenerated: number;
}
interface DependencyGraph {
    nodes: string[];
    edges: Array<{
        from: string;
        to: string;
    }>;
}
interface DependencyAnalysis {
    graph: DependencyGraph;
    circularDependencies: boolean;
    cycles: string[][];
}
interface WsjfValidation {
    sprawlScore: number;
    consolidationOpportunities: string[];
    recommendations?: string[];
    wsjfScore?: number;
}
interface ArchitectureInspection {
    dddCompliant: boolean;
    domains: string[];
    violations?: string[];
}
interface CaseSwitchResult {
    selected: string;
    reasoning: string;
}
export declare class AdvocateCLI {
    private workDir;
    constructor(config: AdvocateConfig);
    /**
     * Audit scripts/docs for sprawl, capabilities, and duplicates
     */
    audit(type: 'scripts' | 'docs', options: {
        path: string;
        extractCapabilities?: boolean;
        detectDuplicates?: boolean;
    }): Promise<AuditResult>;
    /**
     * Consolidate scripts/docs with DDD structure
     */
    consolidate(type: 'scripts' | 'docs', options: {
        source: string;
        target: string;
        preserveCapabilities?: boolean;
        generateADRs?: boolean;
    }): Promise<ConsolidateResult>;
    /**
     * Analyze script dependencies
     */
    analyzeDependencies(dir: string, options?: {
        output?: string;
        format?: 'json' | 'dot';
    }): Promise<DependencyAnalysis>;
    /**
     * Validate WSJF for sprawl
     */
    validateWsjf(dir: string): Promise<WsjfValidation>;
    /**
     * Inspect architecture for DDD compliance
     */
    inspectArchitecture(dir: string, options: {
        dddCompliance?: boolean;
    }): Promise<ArchitectureInspection>;
    /**
     * Case switch for decision support
     */
    caseSwitch(options: {
        scenario: string;
        options: string[];
        autoSelect?: boolean;
    }): Promise<CaseSwitchResult>;
    private getFiles;
    private extractCapabilities;
    private extractCapabilitiesFromContent;
    private extractDependencies;
    private detectDuplicates;
    private inferDomain;
    private extractScriptDependencies;
    private detectCycles;
    private generateADR;
    private slugify;
}
export {};
//# sourceMappingURL=advocate.d.ts.map