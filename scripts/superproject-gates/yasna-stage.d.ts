/**
 * Yasna Stage - Integration Ceremonies
 *
 * Phase 4 Implementation - CI/CD Pipeline Yasna Stage
 *
 * The Yasna stage represents the "ritual" phase of the pipeline where:
 * - Integration ceremonies are executed with multiple stages
 * - Alignment validation is performed throughout
 * - Staging deployments are managed
 *
 * Integration: Uses TestExecutionPlanner for test orchestration
 *
 * @module alignment-cicd/yasna-stage
 */
import { EventEmitter } from 'events';
import { IntegrationCeremony, CeremonyStage, BuildManifest, AlignmentCheck, AlignmentPipelineConfig } from './types.js';
import { TestExecutionPlanner } from '../ruvector/test-execution-planner.js';
/**
 * YasnaStage handles integration ceremonies and alignment validation
 *
 * Key responsibilities:
 * - Manage ceremony lifecycle (start, advance, complete, rollback)
 * - Execute various ceremony stages (tests, validation, deployment)
 * - Perform alignment checks at each stage
 * - Execute pre-flight and post-flight rituals
 */
export declare class YasnaStage extends EventEmitter {
    private config;
    private testPlanner;
    private activeCeremonies;
    private ceremonyLogs;
    /**
     * Create a new YasnaStage instance
     * @param config - Yasna stage configuration
     */
    constructor(config: AlignmentPipelineConfig['yasnaConfig']);
    /**
     * Start a new integration ceremony
     * @param buildManifest - Build manifest to integrate
     * @returns New integration ceremony
     */
    startCeremony(buildManifest: BuildManifest): IntegrationCeremony;
    /**
     * Create ceremony stages based on configuration
     */
    private createCeremonyStages;
    /**
     * Advance to the next stage in the ceremony
     * @param ceremonyId - Ceremony identifier
     * @returns The next stage to execute
     */
    advanceStage(ceremonyId: string): CeremonyStage;
    /**
     * Complete the ceremony
     * @param ceremonyId - Ceremony identifier
     * @returns Completed ceremony
     */
    completeCeremony(ceremonyId: string): IntegrationCeremony;
    /**
     * Rollback a ceremony
     * @param ceremonyId - Ceremony identifier
     * @param reason - Reason for rollback
     */
    rollbackCeremony(ceremonyId: string, reason: string): void;
    /**
     * Execute a specific stage
     * @param ceremony - Integration ceremony
     * @param stageName - Name of the stage to execute
     * @returns Executed stage
     */
    executeStage(ceremony: IntegrationCeremony, stageName: string): Promise<CeremonyStage>;
    /**
     * Run unit tests stage
     * @param ceremony - Integration ceremony
     * @returns Completed stage
     */
    runUnitTests(ceremony: IntegrationCeremony): Promise<CeremonyStage>;
    /**
     * Run integration tests stage
     * @param ceremony - Integration ceremony
     * @returns Completed stage
     */
    runIntegrationTests(ceremony: IntegrationCeremony): Promise<CeremonyStage>;
    /**
     * Run alignment validation stage
     * @param ceremony - Integration ceremony
     * @returns Completed stage
     */
    runAlignmentValidation(ceremony: IntegrationCeremony): Promise<CeremonyStage>;
    /**
     * Deploy to staging environment
     * @param ceremony - Integration ceremony
     * @returns Completed stage
     */
    deployStagingEnvironment(ceremony: IntegrationCeremony): Promise<CeremonyStage>;
    /**
     * Validate alignment for a build manifest
     * @param buildManifest - Build manifest to validate
     * @returns Array of alignment checks
     */
    validateAlignment(buildManifest: BuildManifest): AlignmentCheck[];
    /**
     * Check invariants for build manifest
     * @param buildManifest - Build manifest
     * @returns Alignment check result
     */
    checkInvariants(buildManifest: BuildManifest): AlignmentCheck;
    /**
     * Check coherence between intention and build
     * @param buildManifest - Build manifest
     * @returns Alignment check result
     */
    checkCoherence(buildManifest: BuildManifest): AlignmentCheck;
    /**
     * Perform pre-flight ritual before ceremony starts
     * @param ceremony - Integration ceremony
     */
    performPreFlightRitual(ceremony: IntegrationCeremony): void;
    /**
     * Perform post-flight ritual after ceremony completes
     * @param ceremony - Integration ceremony
     */
    performPostFlightRitual(ceremony: IntegrationCeremony): void;
    /**
     * Append a log entry for a stage
     * @param ceremonyId - Ceremony identifier
     * @param stageName - Stage name
     * @param message - Log message
     */
    appendLog(ceremonyId: string, stageName: string, message: string): void;
    /**
     * Get all logs for a ceremony
     * @param ceremonyId - Ceremony identifier
     * @returns Array of log entries
     */
    getCeremonyLogs(ceremonyId: string): string[];
    /**
     * Generate a unique ceremony ID
     */
    private generateCeremonyId;
    /**
     * Emit a pipeline event
     */
    private emitEvent;
    /**
     * Get a ceremony by ID
     */
    getCeremony(id: string): IntegrationCeremony | undefined;
    /**
     * Get the test planner for direct access
     */
    getTestPlanner(): TestExecutionPlanner;
    /**
     * Update configuration
     */
    updateConfig(config: Partial<AlignmentPipelineConfig['yasnaConfig']>): void;
    /**
     * Get current configuration
     */
    getConfig(): AlignmentPipelineConfig['yasnaConfig'];
}
/**
 * Factory function to create a YasnaStage
 * @param config - Yasna stage configuration
 * @returns Configured YasnaStage instance
 */
export declare function createYasnaStage(config?: Partial<AlignmentPipelineConfig['yasnaConfig']>): YasnaStage;
//# sourceMappingURL=yasna-stage.d.ts.map