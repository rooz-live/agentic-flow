/**
 * Migration Handler
 *
 * Provides utilities for migrating legacy evidence logs to unified format
 * Handles backward compatibility and format conversion
 */
import { EvidenceEvent, ValidationResult, MigrationResult, LegacyEvidenceEvent } from './types/evidence-types';
/**
 * Legacy Event Format Converter
 *
 * Converts legacy evidence events to unified format
 */
export declare class LegacyEventConverter {
    private static readonly LEGACY_EVENT_MAPPINGS;
    /**
     * Convert legacy event to unified format
     */
    static convertLegacyEvent(legacyEvent: LegacyEvidenceEvent): EvidenceEvent | null;
    /**
     * Get all supported legacy event types
     */
    static getSupportedLegacyEventTypes(): string[];
    /**
     * Check if event type is supported for migration
     */
    static isSupportedLegacyEventType(eventType: string): boolean;
}
/**
 * Migration Handler
 *
 * Handles migration of legacy evidence logs to unified format
 * Provides batch processing, validation, and error recovery
 */
export declare class MigrationHandler {
    private migrationLogPath;
    private backupDir;
    constructor(goalieDir: string);
    /**
     * Migrate all legacy evidence files in a directory
     */
    migrateLegacyEvidenceLogs(legacyDir: string): Promise<MigrationResult>;
    /**
     * Find all legacy evidence files in directory
     */
    private findLegacyEvidenceFiles;
    /**
     * Migrate a single legacy evidence file
     */
    private migrateLegacyFile;
    /**
     * Write migration summary to log
     */
    private writeMigrationSummary;
    /**
     * Validate legacy file format
     */
    validateLegacyFile(filePath: string): Promise<ValidationResult>;
    /**
     * Generate validation suggestions
     */
    private generateValidationSuggestions;
}
//# sourceMappingURL=migration-handler.d.ts.map