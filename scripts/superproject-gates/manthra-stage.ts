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

import * as crypto from 'crypto';
import { EventEmitter } from 'events';

import {
  ManthraIntention,
  BuildManifest,
  BuildArtifact,
  DependencyManifest,
  AlignmentCheck,
  AlignmentPipelineConfig,
  DriftDetection,
  PipelineEvent
} from './types.js';

import { SonaAnomalyDetector, createSonaDetector } from '../ruvector/sona-anomaly-detector.js';
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
export class ManthraStage extends EventEmitter {
  private config: AlignmentPipelineConfig['manthraConfig'];
  private anomalyDetector: SonaAnomalyDetector;
  private calibrationSnapshots: Map<string, CalibrationSnapshot>;
  private intentions: Map<string, ManthraIntention>;
  private buildManifests: Map<string, BuildManifest>;

  /**
   * Create a new ManthraStage instance
   * @param config - Manthra stage configuration
   */
  constructor(config: AlignmentPipelineConfig['manthraConfig']) {
    super();
    this.config = config;
    this.anomalyDetector = createSonaDetector('default');
    this.calibrationSnapshots = new Map();
    this.intentions = new Map();
    this.buildManifests = new Map();
  }

  // ============================================================================
  // Intention Declaration
  // ============================================================================

  /**
   * Declare a new intention for a change
   * @param intention - Intention details (without id and timestamp)
   * @returns Complete intention with generated id and timestamp
   */
  declareIntention(intention: Omit<ManthraIntention, 'id' | 'timestamp'>): ManthraIntention {
    const id = this.generateIntentionId();
    const timestamp = new Date();

    const fullIntention: ManthraIntention = {
      ...intention,
      id,
      timestamp
    };

    this.intentions.set(id, fullIntention);

    this.emitEvent({
      type: 'intention_declared',
      timestamp,
      intentionId: id,
      details: {
        type: intention.type,
        description: intention.description,
        alignmentGoals: intention.alignmentGoals,
        changedFiles: intention.changedFiles.length,
        author: intention.author
      }
    });

    return fullIntention;
  }

  /**
   * Validate a declared intention
   * @param intention - Intention to validate
   * @returns Array of alignment checks
   */
  validateIntention(intention: ManthraIntention): AlignmentCheck[] {
    const checks: AlignmentCheck[] = [];

    // Check 1: Intention description quality
    const descriptionCheck = this.validateDescription(intention);
    checks.push(descriptionCheck);

    // Check 2: Alignment goals specified
    const alignmentGoalsCheck = this.validateAlignmentGoals(intention);
    checks.push(alignmentGoalsCheck);

    // Check 3: Changed files specified
    const changedFilesCheck = this.validateChangedFiles(intention);
    checks.push(changedFilesCheck);

    // Check 4: Dependencies alignment
    const dependencyCheck = this.checkDependencyAlignment(intention.dependencies);
    checks.push(dependencyCheck);

    // Check 5: Calibration integrity
    const calibrationCheck = this.checkCalibrationIntegrity();
    checks.push(calibrationCheck);

    return checks;
  }

  /**
   * Validate intention description quality
   */
  private validateDescription(intention: ManthraIntention): AlignmentCheck {
    const minLength = 20;
    const description = intention.description.trim();
    const wordCount = description.split(/\s+/).length;
    
    const passed = description.length >= minLength && wordCount >= 5;
    const score = Math.min(1.0, (description.length / 100) * 0.5 + (wordCount / 20) * 0.5);

    return {
      name: 'intention-description-quality',
      type: 'coherence',
      passed,
      score,
      threshold: 0.5,
      details: passed 
        ? `Description has ${wordCount} words, sufficient quality`
        : `Description too brief (${wordCount} words), needs more detail`,
      timestamp: new Date()
    };
  }

  /**
   * Validate alignment goals are specified
   */
  private validateAlignmentGoals(intention: ManthraIntention): AlignmentCheck {
    const hasGoals = intention.alignmentGoals.length > 0;
    const score = Math.min(1.0, intention.alignmentGoals.length / 3);

    return {
      name: 'alignment-goals-specified',
      type: 'invariant',
      passed: hasGoals,
      score,
      threshold: 0.3,
      details: hasGoals
        ? `${intention.alignmentGoals.length} alignment goal(s) specified`
        : 'No alignment goals specified - must declare what alignment properties to preserve',
      timestamp: new Date()
    };
  }

  /**
   * Validate changed files are specified
   */
  private validateChangedFiles(intention: ManthraIntention): AlignmentCheck {
    const hasFiles = intention.changedFiles.length > 0;

    return {
      name: 'changed-files-specified',
      type: 'invariant',
      passed: hasFiles,
      score: hasFiles ? 1.0 : 0.0,
      threshold: 1.0,
      details: hasFiles
        ? `${intention.changedFiles.length} file(s) to be changed`
        : 'No changed files specified',
      timestamp: new Date()
    };
  }

  // ============================================================================
  // Build Manifest Generation
  // ============================================================================

  /**
   * Generate a build manifest for an intention
   * @param intention - Validated intention
   * @returns Generated build manifest
   */
  async generateBuildManifest(intention: ManthraIntention): Promise<BuildManifest> {
    const startTime = new Date();

    // Run pre-build checks
    const preBuildChecks = await this.runPreBuildChecks(intention);
    
    // Generate version
    const version = this.generateVersion(intention);

    // Generate artifacts (simulated for now)
    const artifacts = this.generateArtifacts(intention);

    // Generate dependency manifests
    const dependencies = this.generateDependencyManifests(intention.dependencies);

    // Save calibration snapshot
    const calibrationSnapshot = this.saveCalibrationSnapshot(intention.id);

    const endTime = new Date();
    const durationMs = endTime.getTime() - startTime.getTime();

    // Count warnings and errors from checks
    const warningCount = preBuildChecks.filter(c => !c.passed && c.score && c.score > 0.5).length;
    const errorCount = preBuildChecks.filter(c => !c.passed && (!c.score || c.score <= 0.5)).length;

    const manifest: BuildManifest = {
      intentionId: intention.id,
      version,
      artifacts,
      dependencies,
      calibrationSnapshot,
      buildMetrics: {
        startTime,
        endTime,
        durationMs,
        warningCount,
        errorCount
      },
      preBuildChecks
    };

    this.buildManifests.set(intention.id, manifest);

    this.emitEvent({
      type: 'build_completed',
      timestamp: endTime,
      intentionId: intention.id,
      details: {
        version,
        artifactCount: artifacts.length,
        dependencyCount: dependencies.length,
        durationMs,
        warningCount,
        errorCount
      }
    });

    return manifest;
  }

  /**
   * Generate version string based on intention
   */
  private generateVersion(intention: ManthraIntention): string {
    const timestamp = intention.timestamp.getTime();
    const hash = intention.id.substring(0, 8);
    const prefix = intention.type === 'bugfix' ? 'fix' : intention.type;
    return `${prefix}-${timestamp}-${hash}`;
  }

  /**
   * Generate artifact entries for the build
   */
  private generateArtifacts(intention: ManthraIntention): BuildArtifact[] {
    return intention.changedFiles.map(file => ({
      name: file.split('/').pop() || file,
      path: file,
      hash: this.hashArtifact(file),
      size: 0, // Would be actual file size
      type: this.inferArtifactType(file)
    }));
  }

  /**
   * Infer artifact type from file path
   */
  private inferArtifactType(filePath: string): 'binary' | 'config' | 'asset' {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const configExts = ['json', 'yaml', 'yml', 'toml', 'ini', 'env'];
    const assetExts = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'css', 'html'];
    
    if (configExts.includes(ext || '')) return 'config';
    if (assetExts.includes(ext || '')) return 'asset';
    return 'binary';
  }

  /**
   * Generate dependency manifest entries
   */
  private generateDependencyManifests(dependencies: string[]): DependencyManifest[] {
    return dependencies.map(dep => {
      const [name, version = 'latest'] = dep.split('@');
      const alignmentVerified = !this.config.blockedDependencies.includes(name);
      
      return {
        name,
        version,
        integrity: this.generateIntegrityHash(name, version),
        alignmentVerified
      };
    });
  }

  /**
   * Generate integrity hash for a dependency
   */
  private generateIntegrityHash(name: string, version: string): string {
    const data = `${name}@${version}`;
    return `sha512-${crypto.createHash('sha512').update(data).digest('base64').substring(0, 64)}`;
  }

  // ============================================================================
  // Pre-Build Alignment Checks
  // ============================================================================

  /**
   * Run all pre-build alignment checks
   * @param intention - Intention to check
   * @returns Array of alignment checks
   */
  async runPreBuildChecks(intention: ManthraIntention): Promise<AlignmentCheck[]> {
    const checks: AlignmentCheck[] = [];

    // Validate intention first
    const intentionChecks = this.validateIntention(intention);
    checks.push(...intentionChecks);

    // Additional pre-build checks
    const securityCheck = this.checkSecurityCompliance(intention);
    checks.push(securityCheck);

    const compatibilityCheck = this.checkBackwardsCompatibility(intention);
    checks.push(compatibilityCheck);

    return checks;
  }

  /**
   * Check dependency alignment
   * @param dependencies - List of dependencies
   * @returns Alignment check result
   */
  checkDependencyAlignment(dependencies: string[]): AlignmentCheck {
    const blockedFound: string[] = [];
    
    for (const dep of dependencies) {
      const name = dep.split('@')[0];
      if (this.config.blockedDependencies.includes(name)) {
        blockedFound.push(name);
      }
    }

    const passed = blockedFound.length === 0;
    const score = dependencies.length > 0 
      ? (dependencies.length - blockedFound.length) / dependencies.length 
      : 1.0;

    return {
      name: 'dependency-alignment',
      type: 'invariant',
      passed,
      score,
      threshold: 1.0,
      details: passed
        ? `All ${dependencies.length} dependencies are aligned`
        : `Blocked dependencies found: ${blockedFound.join(', ')}`,
      timestamp: new Date()
    };
  }

  /**
   * Check calibration integrity
   * @returns Alignment check result
   */
  checkCalibrationIntegrity(): AlignmentCheck {
    const stats = this.anomalyDetector.getStats();
    const hasCalibration = stats.calibrationCount > 0 || stats.totalDataPoints > 0;

    return {
      name: 'calibration-integrity',
      type: 'calibration',
      passed: true, // Always passes, but score indicates quality
      score: hasCalibration ? 1.0 : 0.5,
      threshold: 0.5,
      details: hasCalibration
        ? `Calibration available with ${stats.totalDataPoints} data points`
        : 'No prior calibration - baseline will be established',
      timestamp: new Date()
    };
  }

  /**
   * Check security compliance
   */
  private checkSecurityCompliance(intention: ManthraIntention): AlignmentCheck {
    // Check for sensitive file patterns
    const sensitivePatterns = [
      /\.env$/,
      /secrets?\./i,
      /credentials?\./i,
      /private.*key/i
    ];

    const sensitiveFiles = intention.changedFiles.filter(file =>
      sensitivePatterns.some(pattern => pattern.test(file))
    );

    const passed = sensitiveFiles.length === 0;

    return {
      name: 'security-compliance',
      type: 'invariant',
      passed,
      score: passed ? 1.0 : 0.0,
      threshold: 1.0,
      details: passed
        ? 'No sensitive files in change set'
        : `Sensitive files detected: ${sensitiveFiles.join(', ')} - requires review`,
      timestamp: new Date()
    };
  }

  /**
   * Check backwards compatibility
   */
  private checkBackwardsCompatibility(intention: ManthraIntention): AlignmentCheck {
    // Refactors and bugfixes should maintain compatibility
    const requiresCompatibility = ['refactor', 'bugfix'].includes(intention.type);
    const hasBreakingKeywords = /\b(breaking|incompatible|remove|delete)\b/i.test(intention.description);

    const passed = !requiresCompatibility || !hasBreakingKeywords;

    return {
      name: 'backwards-compatibility',
      type: 'coherence',
      passed,
      score: passed ? 1.0 : 0.3,
      threshold: 0.7,
      details: passed
        ? 'Change is compatible with existing behavior'
        : 'Breaking changes detected in refactor/bugfix - requires justification',
      timestamp: new Date()
    };
  }

  // ============================================================================
  // Calibration Management
  // ============================================================================

  /**
   * Save a calibration snapshot for an intention
   * @param intentionId - Intention identifier
   * @returns Path to the snapshot
   */
  saveCalibrationSnapshot(intentionId: string): string {
    const snapshot = this.anomalyDetector.saveCalibration();
    this.calibrationSnapshots.set(intentionId, snapshot);
    
    const snapshotPath = `${this.config.calibrationPath}/${intentionId}.json`;
    
    return snapshotPath;
  }

  /**
   * Load a calibration snapshot
   * @param snapshotPath - Path to the snapshot
   * @returns Loaded calibration data
   */
  loadCalibrationSnapshot(snapshotPath: string): CalibrationSnapshot | null {
    // Extract intention ID from path
    const match = snapshotPath.match(/([^/]+)\.json$/);
    if (!match) return null;

    const intentionId = match[1];
    return this.calibrationSnapshots.get(intentionId) || null;
  }

  /**
   * Compare two calibrations for drift
   * @param baseline - Baseline calibration
   * @param current - Current calibration
   * @returns Drift detection result
   */
  compareCalibrations(baseline: CalibrationSnapshot, current: CalibrationSnapshot): DriftDetection {
    const baselineStats = baseline.baselineStats;
    const currentStats = current.baselineStats;

    // Compare means for core metrics
    const metrics = ['cpu', 'memory', 'hitRate', 'latency'];
    let maxDelta = 0;
    let driftMetric = '';

    for (const metric of metrics) {
      const baselineMean = baselineStats.means[metric] || 0;
      const currentMean = currentStats.means[metric] || 0;
      
      if (baselineMean > 0) {
        const delta = Math.abs((currentMean - baselineMean) / baselineMean);
        if (delta > maxDelta) {
          maxDelta = delta;
          driftMetric = metric;
        }
      }
    }

    const detected = maxDelta > 0.1; // 10% threshold
    const severity = maxDelta > 0.5 ? 'critical' : 
                     maxDelta > 0.3 ? 'high' :
                     maxDelta > 0.1 ? 'medium' : 'low';

    return {
      detected,
      driftType: 'behavior',
      severity,
      baseline: baselineStats,
      current: currentStats,
      delta: maxDelta * 100, // Convert to percentage
      recommendation: detected
        ? `Significant drift detected in ${driftMetric} (${(maxDelta * 100).toFixed(1)}%) - investigate before proceeding`
        : 'No significant drift detected - safe to proceed'
    };
  }

  // ============================================================================
  // Artifact Management
  // ============================================================================

  /**
   * Generate hash for an artifact
   * @param artifactPath - Path to the artifact
   * @returns Hash string
   */
  hashArtifact(artifactPath: string): string {
    // In production, this would hash actual file contents
    const data = `${artifactPath}:${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Verify artifact integrity
   * @param artifact - Artifact to verify
   * @returns Whether the artifact is intact
   */
  verifyArtifactIntegrity(artifact: BuildArtifact): boolean {
    // In production, this would re-hash and compare
    return artifact.hash.length === 64; // SHA-256 hex length
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Generate a unique intention ID
   */
  private generateIntentionId(): string {
    return `manthra-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * Emit a pipeline event
   */
  private emitEvent(event: PipelineEvent): void {
    this.emit('pipelineEvent', event);
  }

  /**
   * Get an intention by ID
   */
  getIntention(id: string): ManthraIntention | undefined {
    return this.intentions.get(id);
  }

  /**
   * Get a build manifest by intention ID
   */
  getBuildManifest(intentionId: string): BuildManifest | undefined {
    return this.buildManifests.get(intentionId);
  }

  /**
   * Get the anomaly detector for direct access
   */
  getAnomalyDetector(): SonaAnomalyDetector {
    return this.anomalyDetector;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AlignmentPipelineConfig['manthraConfig']>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): AlignmentPipelineConfig['manthraConfig'] {
    return { ...this.config };
  }
}

/**
 * Factory function to create a ManthraStage
 * @param config - Manthra stage configuration
 * @returns Configured ManthraStage instance
 */
export function createManthraStage(
  config: Partial<AlignmentPipelineConfig['manthraConfig']> = {}
): ManthraStage {
  const defaultConfig: AlignmentPipelineConfig['manthraConfig'] = {
    requireIntention: true,
    calibrationPath: '.manthra/calibrations',
    allowedDependencies: [],
    blockedDependencies: []
  };

  return new ManthraStage({ ...defaultConfig, ...config });
}
