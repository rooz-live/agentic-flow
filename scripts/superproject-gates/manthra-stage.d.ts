/**
 * Manthra Stage - Intention Declaration and Build Manifests
 *
 * Phase 4 Implementation - CI/CD Pipeline Manthra Stage
 *
 * The Manthra stage represents the "intention" phase of the pipeline where:
 * - Change intentions are declared and validated
 * - Build manifests are generated with alignment checks
 * - Calibration snapshots are saved for drift detection
 *
 * Integration: Uses SonaAnomalyDetector for calibration verification
 *
 * @module alignment-cicd/manthra-stage
 */
import { EventEmitter } from 'events';
import { ManthraIntention, BuildManifest, BuildArtifact, AlignmentCheck, AlignmentPipelineConfig, DriftDetection } from './types.js';
import { SonaAnomalyDetector } from '../ruvector/sona-anomaly-detector.js';
import { CalibrationSnapshot } from '../ruvector/types.js';
/**
 * ManthraStage handles intention declaration and build manifest generation
 *
 * Key responsibilities:
 * - Validate change intentions before build
 * - Generate build manifests with artifact tracking
 * - Manage calibration snapshots for alignment preservation
 * - Run pre-build alignment checks
 */
export declare class ManthraStage extends EventEmitter {
    private config;
    private anomalyDetector;
    private calibrationSnapshots;
    private intentions;
    private buildManifests;
    /**
     * Create a new ManthraStage instance
     * @param config - Manthra stage configuration
     */
    constructor(config: AlignmentPipelineConfig['manthraConfig']);
    /**
     * Declare a new intention for a change
     * @param intention - Intention details (without id and timestamp)
     * @returns Complete intention with generated id and timestamp
     */
    declareIntention(intention: Omit<ManthraIntention, 'id' | 'timestamp'>): ManthraIntention;
    /**
     * Validate a declared intention
     * @param intention - Intention to validate
     * @returns Array of alignment checks
     */
    validateIntention(intention: ManthraIntention): AlignmentCheck[];
    /**
     * Validate intention description quality
     */
    private validateDescription;
    /**
     * Validate alignment goals are specified
     */
    private validateAlignmentGoals;
    /**
     * Validate changed files are specified
     */
    private validateChangedFiles;
    /**
     * Generate a build manifest for an intention
     * @param intention - Validated intention
     * @returns Generated build manifest
     */
    generateBuildManifest(intention: ManthraIntention): Promise<BuildManifest>;
    /**
     * Generate version string based on intention
     */
    private generateVersion;
    /**
     * Generate artifact entries for the build
     */
    private generateArtifacts;
    /**
     * Infer artifact type from file path
     */
    private inferArtifactType;
    /**
     * Generate dependency manifest entries
     */
    private generateDependencyManifests;
    /**
     * Generate integrity hash for a dependency
     */
    private generateIntegrityHash;
    /**
     * Run all pre-build alignment checks
     * @param intention - Intention to check
     * @returns Array of alignment checks
     */
    runPreBuildChecks(intention: ManthraIntention): Promise<AlignmentCheck[]>;
    /**
     * Check dependency alignment
     * @param dependencies - List of dependencies
     * @returns Alignment check result
     */
    checkDependencyAlignment(dependencies: string[]): AlignmentCheck;
    /**
     * Check calibration integrity
     * @returns Alignment check result
     */
    checkCalibrationIntegrity(): AlignmentCheck;
    /**
     * Check security compliance
     */
    private checkSecurityCompliance;
    /**
     * Check backwards compatibility
     */
    private checkBackwardsCompatibility;
    /**
     * Save a calibration snapshot for an intention
     * @param intentionId - Intention identifier
     * @returns Path to the snapshot
     */
    saveCalibrationSnapshot(intentionId: string): string;
    /**
     * Load a calibration snapshot
     * @param snapshotPath - Path to the snapshot
     * @returns Loaded calibration data
     */
    loadCalibrationSnapshot(snapshotPath: string): CalibrationSnapshot | null;
    /**
     * Compare two calibrations for drift
     * @param baseline - Baseline calibration
     * @param current - Current calibration
     * @returns Drift detection result
     */
    compareCalibrations(baseline: CalibrationSnapshot, current: CalibrationSnapshot): DriftDetection;
    /**
     * Generate hash for an artifact
     * @param artifactPath - Path to the artifact
     * @returns Hash string
     */
    hashArtifact(artifactPath: string): string;
    /**
     * Verify artifact integrity
     * @param artifact - Artifact to verify
     * @returns Whether the artifact is intact
     */
    verifyArtifactIntegrity(artifact: BuildArtifact): boolean;
    /**
     * Generate a unique intention ID
     */
    private generateIntentionId;
    /**
     * Emit a pipeline event
     */
    private emitEvent;
    /**
     * Get an intention by ID
     */
    getIntention(id: string): ManthraIntention | undefined;
    /**
     * Get a build manifest by intention ID
     */
    getBuildManifest(intentionId: string): BuildManifest | undefined;
    /**
     * Get the anomaly detector for direct access
     */
    getAnomalyDetector(): SonaAnomalyDetector;
    /**
     * Update configuration
     */
    updateConfig(config: Partial<AlignmentPipelineConfig['manthraConfig']>): void;
    /**
     * Get current configuration
     */
    getConfig(): AlignmentPipelineConfig['manthraConfig'];
}
/**
 * Factory function to create a ManthraStage
 * @param config - Manthra stage configuration
 * @returns Configured ManthraStage instance
 */
export declare function createManthraStage(config?: Partial<AlignmentPipelineConfig['manthraConfig']>): ManthraStage;
//# sourceMappingURL=manthra-stage.d.ts.map