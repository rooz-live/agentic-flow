/**
 * Semantic Degradation Analyzer
 *
 * Analyzes API contracts for violations, breaking changes, and semantic drift.
 * Also monitors type coverage trends and documentation staleness.
 *
 * @module structural-diagnostics/semantic-analyzer
 */
import { EventEmitter } from 'events';
import { APIContract, ContractViolation, TypeCoverageReport } from './types.js';
/**
 * SemanticDegradationAnalyzer monitors API contracts and type coverage
 * to detect semantic degradation over time.
 */
export declare class SemanticDegradationAnalyzer extends EventEmitter {
    private contracts;
    private violations;
    private coverageHistory;
    private readonly maxHistorySize;
    /**
     * Create a new SemanticDegradationAnalyzer instance
     */
    constructor();
    /**
     * Register a new API contract
     *
     * @param contract - API contract to register
     */
    registerContract(contract: APIContract): void;
    /**
     * Get a registered contract by ID
     *
     * @param id - Contract ID
     * @returns Contract or null if not found
     */
    getContract(id: string): APIContract | null;
    /**
     * Update an existing contract
     *
     * @param id - Contract ID
     * @param updates - Partial contract updates
     */
    updateContract(id: string, updates: Partial<APIContract>): void;
    /**
     * Mark a contract as deprecated
     *
     * @param id - Contract ID
     */
    deprecateContract(id: string): void;
    /**
     * Validate a request against a contract's request schema
     *
     * @param contractId - Contract ID
     * @param request - Request data to validate
     * @returns Array of contract violations
     */
    validateRequest(contractId: string, request: any): ContractViolation[];
    /**
     * Validate a response against a contract's response schema
     *
     * @param contractId - Contract ID
     * @param response - Response data to validate
     * @returns Array of contract violations
     */
    validateResponse(contractId: string, response: any): ContractViolation[];
    /**
     * Detect breaking changes between old and new contract versions
     *
     * @param oldContract - Previous contract version
     * @param newContract - New contract version
     * @returns Array of contract violations representing breaking changes
     */
    detectBreakingChanges(oldContract: APIContract, newContract: APIContract): ContractViolation[];
    /**
     * Analyze TypeScript type coverage for a project
     *
     * @param projectPath - Path to the project root
     * @returns Promise resolving to type coverage report
     */
    analyzeTypeCoverage(projectPath: string): Promise<TypeCoverageReport>;
    /**
     * Get type coverage trend from historical reports
     *
     * @param reports - Array of type coverage reports (uses history if not provided)
     * @returns Trend analysis
     */
    getTypeCoverageTrend(reports?: TypeCoverageReport[]): {
        direction: 'improving' | 'stable' | 'degrading';
        avgCoverage: number;
        anyTrend: 'increasing' | 'stable' | 'decreasing';
    };
    /**
     * Check documentation staleness by comparing file modification times
     *
     * @param docPath - Path to documentation file
     * @param sourcePath - Path to source file
     * @returns Staleness information
     */
    checkDocumentationStaleness(docPath: string, sourcePath: string): Promise<{
        isStale: boolean;
        staleDays: number;
        lastDocUpdate: Date;
        lastSourceUpdate: Date;
    }>;
    /**
     * Get violations with optional filters
     *
     * @param filters - Optional filters for contract ID and severity
     * @returns Filtered array of contract violations
     */
    getViolations(filters?: {
        contractId?: string;
        severity?: string;
    }): ContractViolation[];
    /**
     * Generate a comprehensive semantic degradation report
     *
     * @returns Semantic report with statistics and recommendations
     */
    generateSemanticReport(): {
        contractCount: number;
        violationCount: number;
        breakingChanges: number;
        typeCoverage: number;
        recommendations: string[];
    };
    /**
     * Get all registered contracts
     */
    getContracts(): Map<string, APIContract>;
    /**
     * Get type coverage history
     */
    getCoverageHistory(): TypeCoverageReport[];
    /**
     * Clear all violations and reset state
     */
    reset(): void;
    private validateAgainstSchema;
    private validateSchemaRecursive;
    private detectSchemaBreakingChanges;
    private getJsonType;
    private findTypeScriptFiles;
    private analyzeFileTypes;
    private checkStrictNullChecks;
}
/**
 * Factory function to create a SemanticDegradationAnalyzer
 * @returns Configured SemanticDegradationAnalyzer instance
 */
export declare function createSemanticAnalyzer(): SemanticDegradationAnalyzer;
//# sourceMappingURL=semantic-analyzer.d.ts.map