/**
 * Migration Handler
 * 
 * Provides utilities for migrating legacy evidence logs to unified format
 * Handles backward compatibility and format conversion
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { EvidenceEvent, ValidationResult, MigrationResult, LegacyEvidenceEvent } from './types/evidence-types';
import { EvidenceValidator } from './evidence-validator';

/**
 * Legacy Event Format Converter
 * 
 * Converts legacy evidence events to unified format
 */
export class LegacyEventConverter {
  private static readonly LEGACY_EVENT_MAPPINGS = {
    // Revenue Safe -> Economic Compounding
    'revenue_safe_start': {
      unified_emitter: 'economic_compounding',
      unified_event_type: 'compounding_start',
      data_transform: (data: any) => ({
        revenue_baseline: data.baseline_revenue,
        target_growth: data.target_growth_rate,
        compounding_strategy: data.strategy
      })
    },
    'revenue_safe_complete': {
      unified_emitter: 'economic_compounding',
      unified_event_type: 'compounding_complete',
      data_transform: (data: any) => ({
        total_revenue: data.total_revenue,
        growth_achieved: data.growth_percentage,
        compounding_effective: data.compounding_effective_rate
      })
    },
    
    // Tier Depth -> Maturity Coverage
    'tier_depth_analysis_start': {
      unified_emitter: 'maturity_coverage',
      unified_event_type: 'coverage_analysis_start',
      data_transform: (data: any) => ({
        analysis_scope: data.scope,
        target_tiers: data.target_tiers,
        depth_levels: data.depth_levels
      })
    },
    'tier_depth_analysis_complete': {
      unified_emitter: 'maturity_coverage',
      unified_event_type: 'coverage_analysis_complete',
      data_transform: (data: any) => ({
        coverage_percentage: data.coverage_percentage,
        tier_breakdown: data.tier_breakdown,
        recommendations: data.recommendations
      })
    },
    
    // Gaps -> Observability Gaps
    'gap_detection_start': {
      unified_emitter: 'observability_gaps',
      unified_event_type: 'gap_detection_start',
      data_transform: (data: any) => ({
        detection_scope: data.scope,
        gap_categories: data.categories,
        analysis_method: data.method
      })
    },
    'gap_detection_complete': {
      unified_emitter: 'observability_gaps',
      unified_event_type: 'gap_detection_complete',
      data_transform: (data: any) => ({
        total_gaps: data.total_gaps,
        critical_gaps: data.critical_gaps,
        remediation_plan: data.remediation_plan
      })
    },
    
    // Intent Coverage -> Pattern Hit Percent
    'intent_coverage_start': {
      unified_emitter: 'pattern_hit_percent',
      unified_event_type: 'pattern_analysis_start',
      data_transform: (data: any) => ({
        pattern_scope: data.scope,
        target_patterns: data.target_patterns,
        analysis_method: data.method
      })
    },
    'intent_coverage_complete': {
      unified_emitter: 'pattern_hit_percent',
      unified_event_type: 'pattern_analysis_complete',
      data_transform: (data: any) => ({
        hit_rate: data.hit_rate,
        pattern_accuracy: data.accuracy,
        confidence_score: data.confidence
      })
    },
    
    // Winner Grade -> Production Cycle Qualification
    'winner_grade_start': {
      unified_emitter: 'prod_cycle_qualification',
      unified_event_type: 'qualification_start',
      data_transform: (data: any) => ({
        qualification_criteria: data.criteria,
        target_grade: data.target_grade,
        assessment_method: data.method
      })
    },
    'winner_grade_complete': {
      unified_emitter: 'prod_cycle_qualification',
      unified_event_type: 'qualification_complete',
      data_transform: (data: any) => ({
        readiness_score: data.score,
        qualification_status: data.status,
        blocking_issues: data.blocking_issues
      })
    }
  };
  
  /**
   * Convert legacy event to unified format
   */
  static convertLegacyEvent(legacyEvent: LegacyEvidenceEvent): EvidenceEvent | null {
    const mapping = LegacyEventConverter.LEGACY_EVENT_MAPPINGS[legacyEvent.event_type];
    
    if (!mapping) {
      console.warn(`[MIGRATION] Unknown legacy event type: ${legacyEvent.event_type}`);
      return null;
    }
    
    // Transform data according to mapping
    const transformedData = mapping.data_transform(legacyEvent.data);
    
    return {
      timestamp: legacyEvent.timestamp || new Date().toISOString(),
      run_id: legacyEvent.run_id || 'unknown',
      command: legacyEvent.command || 'unknown',
      mode: legacyEvent.mode || 'normal',
      emitter_name: mapping.unified_emitter,
      event_type: mapping.unified_event_type,
      category: 'core',
      data: transformedData,
      system_info: {
        cpu_usage: 0,
        memory_usage: 0,
        node_version: process.version,
        platform: process.platform
      }
    };
  }
  
  /**
   * Get all supported legacy event types
   */
  static getSupportedLegacyEventTypes(): string[] {
    return Object.keys(LegacyEventConverter.LEGACY_EVENT_MAPPINGS);
  }
  
  /**
   * Check if event type is supported for migration
   */
  static isSupportedLegacyEventType(eventType: string): boolean {
    return LegacyEventConverter.getSupportedLegacyEventTypes().includes(eventType);
  }
}

/**
 * Migration Handler
 * 
 * Handles migration of legacy evidence logs to unified format
 * Provides batch processing, validation, and error recovery
 */
export class MigrationHandler {
  private migrationLogPath: string;
  private backupDir: string;
  
  constructor(goalieDir: string) {
    this.migrationLogPath = path.join(goalieDir, '.goalie', 'migration', 'legacy_converter.log');
    this.backupDir = path.join(goalieDir, '.goalie', 'backups');
  }
  
  /**
   * Migrate all legacy evidence files in a directory
   */
  async migrateLegacyEvidenceLogs(legacyDir: string): Promise<MigrationResult> {
    const startTime = Date.now();
    
    try {
      // Ensure backup directory exists
      await fs.mkdir(this.backupDir, { recursive: true });
      
      // Find all legacy evidence files
      const legacyFiles = await this.findLegacyEvidenceFiles(legacyDir);
      
      if (legacyFiles.length === 0) {
        return {
          success: true,
          files_migrated: 0,
          errors: [],
          warnings: ['No legacy evidence files found'],
          duration_ms: Date.now() - startTime
        };
      }
      
      let totalMigrated = 0;
      const allErrors: string[] = [];
      const allWarnings: string[] = [];
      
      // Process each legacy file
      for (const legacyFile of legacyFiles) {
        const fileResult = await this.migrateLegacyFile(legacyFile);
        
        if (fileResult.success) {
          totalMigrated++;
        } else {
          allErrors.push(...fileResult.errors);
          allWarnings.push(...fileResult.warnings);
        }
      }
      
      // Write migration summary
      await this.writeMigrationSummary({
        startTime,
        totalFiles: legacyFiles.length,
        filesMigrated: totalMigrated,
        errors: allErrors,
        warnings: allWarnings
      });
      
      return {
        success: totalMigrated > 0,
        files_migrated: totalMigrated,
        errors: allErrors,
        warnings: allWarnings,
        duration_ms: Date.now() - startTime
      };
      
    } catch (error) {
      return {
        success: false,
        files_migrated: 0,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
        duration_ms: Date.now() - startTime
      };
    }
  }
  
  /**
   * Find all legacy evidence files in directory
   */
  private async findLegacyEvidenceFiles(dir: string): Promise<string[]> {
    const legacyFiles: string[] = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const stat = await fs.stat(fullPath);
        
        if (stat.isFile() && entry.name.endsWith('.jsonl')) {
          legacyFiles.push(fullPath);
        }
      }
    } catch (error) {
      console.warn(`[MIGRATION] Error scanning directory ${dir}:`, error);
    }
    
    return legacyFiles;
  }
  
  /**
   * Migrate a single legacy evidence file
   */
  private async migrateLegacyFile(legacyFilePath: string): Promise<{
    success: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      // Read legacy file
      const legacyContent = await fs.readFile(legacyFilePath, 'utf-8');
      const legacyLines = legacyContent.split('\n').filter(line => line.trim());
      
      // Create backup
      const backupPath = path.join(this.backupDir, `legacy_backup_${path.basename(legacyFilePath)}_${Date.now()}.jsonl`);
      await fs.writeFile(backupPath, legacyContent);
      
      // Convert and write unified events
      const unifiedEvents: EvidenceEvent[] = [];
      
      for (const line of legacyLines) {
        if (line.trim() === '') continue;
        
        try {
          const legacyEvent: LegacyEvidenceEvent = JSON.parse(line);
          const unifiedEvent = LegacyEventConverter.convertLegacyEvent(legacyEvent);
          
          if (unifiedEvent) {
            unifiedEvents.push(unifiedEvent);
          } else {
            warnings.push(`Failed to convert line: ${line.substring(0, 50)}...`);
          }
        } catch (parseError: unknown) {
          errors.push(`Failed to parse line: ${line.substring(0, 50)}... - ${(parseError as Error).message}`);
        }
      }
      
      // Write unified events
      if (unifiedEvents.length > 0) {
        const unifiedDir = path.join(path.dirname(legacyFilePath), '.goalie');
        await fs.mkdir(unifiedDir, { recursive: true });
        
        const unifiedFilePath = path.join(unifiedDir, 'unified_evidence.jsonl');
        const unifiedContent = unifiedEvents.map(event => JSON.stringify(event)).join('\n') + '\n';
        await fs.writeFile(unifiedFilePath, unifiedContent);
      }
      
      return {
        success: unifiedEvents.length > 0,
        errors,
        warnings
      };
      
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings
      };
    }
  }
  
  /**
   * Write migration summary to log
   */
  private async writeMigrationSummary(summary: {
    startTime: number;
    totalFiles: number;
    filesMigrated: number;
    errors: string[];
    warnings: string[];
  }): Promise<void> {
    const summaryData = {
      migration_type: 'legacy_to_unified',
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - summary.startTime,
      total_files: summary.totalFiles,
      files_migrated: summary.filesMigrated,
      success_rate: summary.totalFiles > 0 ? summary.filesMigrated / summary.totalFiles : 0,
      errors: summary.errors,
      warnings: summary.warnings
    };
    
    // Ensure migration directory exists
    await fs.mkdir(path.dirname(this.migrationLogPath), { recursive: true });
    
    // Write summary to migration log
    const summaryLine = JSON.stringify(summaryData);
    await fs.appendFile(this.migrationLogPath, summaryLine + '\n');
    
    // Also write to console
    console.log(`[MIGRATION] Summary: ${summary.filesMigrated}/${summary.totalFiles} files migrated successfully`);
    
    if (summary.errors.length > 0) {
      console.error(`[MIGRATION] Errors encountered: ${summary.errors.join(', ')}`);
    }
    
    if (summary.warnings.length > 0) {
      console.warn(`[MIGRATION] Warnings: ${summary.warnings.join(', ')}`);
    }
  }
  
  /**
   * Validate legacy file format
   */
  async validateLegacyFile(filePath: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      let lineNumber = 0;
      
      for (const line of lines) {
        lineNumber++;
        
        if (line.trim() === '') continue;
        
        try {
          const event = JSON.parse(line);
          
          // Check if it's a valid legacy event
          if (!LegacyEventConverter.isSupportedLegacyEventType(event.event_type)) {
            warnings.push(`Line ${lineNumber}: Unknown event type: ${event.event_type}`);
          }
          
          // Validate basic structure
          if (!event.timestamp || !event.command || !event.mode || !event.event_type || !event.data) {
            errors.push(`Line ${lineNumber}: Missing required fields`);
          }
          
        } catch (parseError) {
          errors.push(`Line ${lineNumber}: Invalid JSON - ${parseError.message}`);
        }
      }
      
      return {
        valid: errors.length === 0,
        errors,
        warnings,
        suggestions: this.generateValidationSuggestions(errors, warnings)
      };
      
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings,
        suggestions: ['Check file permissions and format']
      };
    }
  }
  
  /**
   * Generate validation suggestions
   */
  private generateValidationSuggestions(errors: string[], warnings: string[]): string[] {
    const suggestions: string[] = [];
    
    if (errors.length > 0) {
      suggestions.push('Fix JSON parsing errors before migration');
    }
    
    if (warnings.length > 0) {
      suggestions.push('Review unsupported event types');
    }
    
    return suggestions;
  }
}