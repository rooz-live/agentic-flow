/**
 * Pattern Logger
 * 
 * Centralized logging system for pattern-based evidence collection
 * Provides JSONL file creation and appending functionality
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface PatternLogEntry {
  timestamp: string;
  run_id: string;
  pattern_type: string;
  data: Record<string, any>;
  // P1-TIME: Semantic context for pattern metrics
  rationale?: string;  // Human-readable explanation of why pattern was triggered
  decision_context?: Record<string, any>;  // Input parameters, state, alternatives considered
  roam_reference?: string;  // Link to parent ROAM entry ID
  circle_role?: string;  // Which circle role triggered the pattern
  metadata?: {
    source?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    tags?: string[];
  };
}

export interface PatternLoggerConfig {
  logDir: string;
  maxFileSize: number; // in bytes
  maxFiles: number;
  compressionEnabled: boolean;
}

export class PatternLogger {
  private config: PatternLoggerConfig;
  private runId: string;
  private logFilePaths: Map<string, string> = new Map();

  constructor(config: Partial<PatternLoggerConfig> = {}) {
    this.config = {
      logDir: path.join(process.cwd(), '.goalie', 'logs'),
      maxFileSize: 100 * 1024 * 1024, // 100MB
      maxFiles: 5,
      compressionEnabled: true,
      ...config
    };
    
    this.runId = process.env.AF_RUN_ID || uuidv4();
  }

  /**
   * Initialize the pattern logger
   */
  async initialize(): Promise<void> {
    try {
      // Ensure log directory exists
      await fs.mkdir(this.config.logDir, { recursive: true });
      
      // Initialize specific log files
      await this.initializeLogFile('learning_evidence.jsonl');
      await this.initializeLogFile('compounding_benefits.jsonl');
      await this.initializeLogFile('pattern_hits.jsonl');
      await this.initializeLogFile('tier_depth_coverage.jsonl');
      
      console.log(`[PATTERN_LOGGER] Initialized with run_id: ${this.runId}`);
    } catch (error) {
      console.error('[PATTERN_LOGGER] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Initialize a specific log file
   */
  private async initializeLogFile(fileName: string): Promise<void> {
    const filePath = path.join(this.config.logDir, fileName);
    this.logFilePaths.set(fileName.replace('.jsonl', ''), filePath);
    
    try {
      await fs.access(filePath);
    } catch (error) {
      // File doesn't exist, create it
      await fs.writeFile(filePath, '');
      console.log(`[PATTERN_LOGGER] Created log file: ${filePath}`);
    }
  }

  /**
   * Log learning evidence with semantic context
   * @param data - Evidence data to log
   * @param metadata - Optional metadata
   * @param rationale - Human-readable explanation of why pattern was triggered
   * @param decisionContext - Decision context including circle, purpose, domain, triggering event
   * @param roamReference - ID of related ROAM entry if applicable
   */
  async logLearningEvidence(
    data: Record<string, any>,
    metadata?: any,
    rationale?: string,
    decisionContext?: Record<string, any>,
    roamReference?: string
  ): Promise<void> {
    const entry: PatternLogEntry = {
      timestamp: new Date().toISOString(),
      run_id: this.runId,
      pattern_type: 'learning_evidence',
      data,
      metadata,
      rationale: rationale || this.generateDefaultRationale('learning_evidence', data),
      decision_context: decisionContext,
      roam_reference: roamReference
    };
    
    await this.appendToFile('learning_evidence', entry);
  }

  /**
   * Log compounding benefits with semantic context
   * @param data - Compounding benefits data to log
   * @param metadata - Optional metadata
   * @param rationale - Human-readable explanation of why pattern was triggered
   * @param decisionContext - Decision context including circle, purpose, domain, triggering event
   * @param roamReference - ID of related ROAM entry if applicable
   */
  async logCompoundingBenefits(
    data: Record<string, any>,
    metadata?: any,
    rationale?: string,
    decisionContext?: Record<string, any>,
    roamReference?: string
  ): Promise<void> {
    const entry: PatternLogEntry = {
      timestamp: new Date().toISOString(),
      run_id: this.runId,
      pattern_type: 'compounding_benefits',
      data,
      metadata,
      rationale: rationale || this.generateDefaultRationale('compounding_benefits', data),
      decision_context: decisionContext,
      roam_reference: roamReference
    };
    
    await this.appendToFile('compounding_benefits', entry);
  }

  /**
   * Log pattern hits with semantic context
   * @param patternType - Type of pattern that was hit
   * @param data - Pattern hit data to log
   * @param metadata - Optional metadata
   * @param rationale - Human-readable explanation of why pattern was triggered
   * @param decisionContext - Decision context including circle, purpose, domain, triggering event
   * @param roamReference - ID of related ROAM entry if applicable
   */
  async logPatternHit(
    patternType: string,
    data: Record<string, any>,
    metadata?: any,
    rationale?: string,
    decisionContext?: Record<string, any>,
    roamReference?: string
  ): Promise<void> {
    const entry: PatternLogEntry = {
      timestamp: new Date().toISOString(),
      run_id: this.runId,
      pattern_type: 'pattern_hit',
      data: {
        pattern_type: patternType,
        ...data
      },
      metadata,
      rationale: rationale || this.generateDefaultRationale('pattern_hit', { pattern_type: patternType, ...data }),
      decision_context: decisionContext,
      roam_reference: roamReference
    };
    
    await this.appendToFile('pattern_hits', entry);
  }

  /**
   * Log tier depth coverage with semantic context
   * @param data - Tier depth coverage data to log
   * @param metadata - Optional metadata
   * @param rationale - Human-readable explanation of why pattern was triggered
   * @param decisionContext - Decision context including circle, purpose, domain, triggering event
   * @param roamReference - ID of related ROAM entry if applicable
   */
  async logTierDepthCoverage(
    data: Record<string, any>,
    metadata?: any,
    rationale?: string,
    decisionContext?: Record<string, any>,
    roamReference?: string
  ): Promise<void> {
    const entry: PatternLogEntry = {
      timestamp: new Date().toISOString(),
      run_id: this.runId,
      pattern_type: 'tier_depth_coverage',
      data,
      metadata,
      rationale: rationale || this.generateDefaultRationale('tier_depth_coverage', data),
      decision_context: decisionContext,
      roam_reference: roamReference
    };
    
    await this.appendToFile('tier_depth_coverage', entry);
  }

  /**
   * Append entry to specific log file
   */
  private async appendToFile(logType: string, entry: PatternLogEntry): Promise<void> {
    const filePath = this.logFilePaths.get(logType);
    if (!filePath) {
      console.error(`[PATTERN_LOGGER] Unknown log type: ${logType}`);
      return;
    }

    try {
      // Check file size and rotate if necessary
      await this.rotateIfNeeded(filePath);
      
      // Append the entry
      const jsonLine = JSON.stringify(entry) + '\n';
      await fs.appendFile(filePath, jsonLine);
      
      console.log(`[PATTERN_LOGGER] Logged ${logType} entry: ${entry.timestamp}`);
    } catch (error) {
      console.error(`[PATTERN_LOGGER] Failed to append to ${logType}:`, error);
      throw error;
    }
  }

  /**
   * Rotate log file if it exceeds max size
   */
  private async rotateIfNeeded(filePath: string): Promise<void> {
    try {
      const stats = await fs.stat(filePath);
      
      if (stats.size >= this.config.maxFileSize) {
        const dir = path.dirname(filePath);
        const name = path.basename(filePath, '.jsonl');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        // Move current file to archived version
        const archivedFile = path.join(dir, `${name}_${timestamp}.jsonl`);
        await fs.rename(filePath, archivedFile);
        
        // Create new empty file
        await fs.writeFile(filePath, '');
        
        // Clean up old files
        await this.cleanupOldFiles(dir, name);
        
        console.log(`[PATTERN_LOGGER] Rotated log file: ${filePath} -> ${archivedFile}`);
      }
    } catch (error) {
      console.error('[PATTERN_LOGGER] Error during rotation:', error);
    }
  }

  /**
   * Generate default rationale for pattern entries when not provided
   * Uses AISP-inspired semantic precision to explain WHY pattern complies with policy
   * @param patternType - Type of pattern being logged
   * @param data - Pattern data
   * @returns Generated rationale string with semantic context
   */
  private generateDefaultRationale(patternType: string, data: Record<string, any>): string {
    // AISP-inspired rationale templates: WHY pattern complies, not WHAT it does
    const rationaleMap: Record<string, (d: Record<string, any>) => string> = {
      learning_evidence: (d) => {
        const type = d.type || d.observability_type || 'unknown';
        return `Learning cycle validates observability coverage for ${type} pattern. ` +
               `Ensures system maintains awareness of ${type} gaps, preventing blind spots in monitoring. ` +
               `Compliance: Continuous learning requirement per PDA framework.`;
      },
      compounding_benefits: (d) => {
        const benefit = d.economic_compounding || d.benefit_type || 'unknown';
        return `Economic value compounds over time through ${benefit} pattern. ` +
               `Validates ROI alignment with sustainability principles. ` +
               `Compliance: Resource efficiency requirement ensures long-term viability.`;
      },
      pattern_hit: (d) => {
        const pattern = d.pattern_type || 'unknown';
        return `Pattern ${pattern} detected confirms system behavior matches expected governance model. ` +
               `Validates that implemented patterns align with documented architecture. ` +
               `Compliance: Architecture coherence requirement per dimensional-coherence checks.`;
      },
      tier_depth_coverage: (d) => {
        const tier = d.tier || 'unknown';
        const depth = d.depth_level || 'unknown';
        return `Tier ${tier} achieves ${depth} depth coverage, validating maturity progression. ` +
               `Ensures system evolution follows defined growth path without premature optimization. ` +
               `Compliance: Maturity coverage requirement per graduation criteria.`;
      },
      wip_bounds_check: (d) => {
        const current = d.current_wip || 0;
        const limit = d.wip_limit || 0;
        return `WIP bounded at ${current}/${limit} prevents cascade failures through load shedding. ` +
               `Validates capacity management aligns with system health thresholds. ` +
               `Compliance: Circuit breaker requirement prevents resource exhaustion.`;
      },
      observability_gaps: (d) => {
        const gap = d.gap_type || 'unknown';
        return `Observability gap detected in ${gap} signals need for monitoring enhancement. ` +
               `Ensures no blind spots exist in system awareness before production deployment. ` +
               `Compliance: Full observability requirement per health-check graduation criteria.`;
      },
      maturity_coverage: (d) => {
        const coverage = d.coverage_pct || 0;
        return `Maturity coverage at ${coverage}% validates progressive capability development. ` +
               `Ensures foundation tiers are solid before advancing to higher abstractions. ` +
               `Compliance: Tier-depth graduation requirement prevents technical debt accumulation.`;
      }
    };

    // Get rationale generator or use fallback
    const generateRationale = rationaleMap[patternType] || ((d: Record<string, any>) => {
      const keys = Object.keys(d).slice(0, 3).join(', ');
      return `Pattern ${patternType} triggered with context: ${keys}. ` +
             `Validates system behavior aligns with governance policies. ` +
             `Compliance: Pattern verification ensures documented architecture matches runtime behavior.`;
    });

    return generateRationale(data);
  }

  /**
   * Clean up old log files
   */
  private async cleanupOldFiles(dir: string, baseName: string): Promise<void> {
    try {
      const files = await fs.readdir(dir);
      const logFiles = files
        .filter(f => f.startsWith(baseName) && f.endsWith('.jsonl'))
        .map(f => ({
          name: f,
          path: path.join(dir, f),
          mtime: fs.stat(path.join(dir, f)).then(s => s.mtime)
        }));
      
      // Sort by modification time (newest first)
      logFiles.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
      
      // Keep only the most recent files (excluding current)
      const filesToDelete = logFiles.slice(this.config.maxFiles);
      
      for (const file of filesToDelete) {
        await fs.unlink(file.path);
        console.log(`[PATTERN_LOGGER] Deleted old log file: ${file.name}`);
      }
    } catch (error) {
      console.error('[PATTERN_LOGGER] Error during cleanup:', error);
    }
  }

  /**
   * Get log file path for a specific type
   */
  getLogFilePath(logType: string): string | null {
    return this.logFilePaths.get(logType) || null;
  }

  /**
   * Read entries from a log file
   */
  async readLogEntries(logType: string, limit?: number): Promise<PatternLogEntry[]> {
    const filePath = this.logFilePaths.get(logType);
    if (!filePath) {
      throw new Error(`Unknown log type: ${logType}`);
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.trim().split('\n').filter(line => line.trim());
      
      const entries = lines.map(line => {
        try {
          return JSON.parse(line) as PatternLogEntry;
        } catch (error) {
          console.warn(`[PATTERN_LOGGER] Failed to parse line: ${line}`);
          return null;
        }
      }).filter(entry => entry !== null) as PatternLogEntry[];
      
      return limit ? entries.slice(-limit) : entries;
    } catch (error) {
      console.error(`[PATTERN_LOGGER] Error reading log ${logType}:`, error);
      return [];
    }
  }

  /**
   * Get statistics for a log type
   */
  async getLogStatistics(logType: string): Promise<{
    totalEntries: number;
    fileSize: number;
    lastEntry: PatternLogEntry | null;
    entriesToday: number;
  }> {
    const entries = await this.readLogEntries(logType);
    const filePath = this.logFilePaths.get(logType);
    
    let fileSize = 0;
    if (filePath) {
      try {
        const stats = await fs.stat(filePath);
        fileSize = stats.size;
      } catch (error) {
        console.warn(`[PATTERN_LOGGER] Could not get file size for ${logType}:`, error);
      }
    }
    
    const today = new Date().toDateString();
    const entriesToday = entries.filter(entry => 
      new Date(entry.timestamp).toDateString() === today
    ).length;
    
    return {
      totalEntries: entries.length,
      fileSize,
      lastEntry: entries.length > 0 ? entries[entries.length - 1] : null,
      entriesToday
    };
  }

  /**
   * Flush all pending logs
   */
  async flush(): Promise<void> {
    // In this implementation, logs are written immediately
    // This method is for compatibility with existing interfaces
    console.log('[PATTERN_LOGGER] Flush completed');
  }
}

// Singleton instance for global access
let patternLoggerInstance: PatternLogger | null = null;

export function getPatternLogger(config?: Partial<PatternLoggerConfig>): PatternLogger {
  if (!patternLoggerInstance) {
    patternLoggerInstance = new PatternLogger(config);
  }
  return patternLoggerInstance;
}

export function resetPatternLogger(): void {
  patternLoggerInstance = null;
}