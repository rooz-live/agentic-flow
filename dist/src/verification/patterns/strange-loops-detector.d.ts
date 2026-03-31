/**
 * Strange Loops Pattern Detection
 * Identify circular reasoning, detect logical contradictions, validate causal chains
 */
export interface LogicalPattern {
    type: 'circular' | 'contradiction' | 'invalid-causal' | 'self-reference';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    location: PatternLocation[];
    chain: string[];
    suggestion: string;
}
export interface PatternLocation {
    start: number;
    end: number;
    context: string;
}
export interface CausalChain {
    nodes: CausalNode[];
    edges: CausalEdge[];
    valid: boolean;
    cycles: CausalNode[][];
    contradictions: ChainContradiction[];
}
export interface CausalNode {
    id: string;
    claim: string;
    evidence: string[];
    confidence: number;
}
export interface CausalEdge {
    from: string;
    to: string;
    type: 'causes' | 'enables' | 'prevents' | 'correlates';
    strength: number;
}
export interface ChainContradiction {
    node1: string;
    node2: string;
    reason: string;
    severity: 'low' | 'medium' | 'high';
}
export interface RecursivePattern {
    depth: number;
    pattern: string;
    instances: string[];
    problematic: boolean;
    reason?: string;
}
export declare class StrangeLoopsDetector {
    private readonly MAX_RECURSION_DEPTH;
    private readonly CONTRADICTION_KEYWORDS;
    /**
     * Detect circular reasoning patterns
     */
    detectCircularReasoning(text: string, context?: Record<string, any>): Promise<LogicalPattern[]>;
    /**
     * Detect self-referential definition patterns
     */
    private detectSelfReferentialPatterns;
    /**
     * Extract claims from text
     */
    private extractClaims;
    /**
     * Build reasoning graph from claims
     */
    private buildReasoningGraph;
    /**
     * Check if a claim contains a back-reference pattern (circular within single statement)
     */
    private hasBackReference;
    /**
     * Detect relationship between two claims
     */
    private detectRelationship;
    /**
     * Find cycles in reasoning graph using DFS
     */
    private findCycles;
    /**
     * Assess cycle severity
     */
    private assessCycleSeverity;
    /**
     * Locate cycle in text
     */
    private locateCycle;
    /**
     * Detect logical contradictions
     */
    detectContradictions(text: string, context?: Record<string, any>): Promise<LogicalPattern[]>;
    /**
     * Detect contradictions within a single sentence
     */
    private detectWithinSentenceContradictions;
    /**
     * Check for contradiction between two claims
     */
    private checkContradiction;
    /**
     * Validate causal chains
     */
    validateCausalChain(chain: CausalChain, context?: Record<string, any>): Promise<{
        valid: boolean;
        issues: LogicalPattern[];
        strength: number;
    }>;
    /**
     * Detect recursive patterns
     */
    detectRecursivePatterns(text: string, maxDepth?: number): Promise<RecursivePattern[]>;
    /**
     * Find self-referential statements
     */
    private findSelfReferences;
    /**
     * Find nested definition patterns
     */
    private findNestedDefinitions;
    /**
     * Get pattern statistics
     */
    getStatistics(patterns: LogicalPattern[]): {
        total: number;
        byType: Record<string, number>;
        bySeverity: Record<string, number>;
        mostCommon: string;
    };
}
//# sourceMappingURL=strange-loops-detector.d.ts.map