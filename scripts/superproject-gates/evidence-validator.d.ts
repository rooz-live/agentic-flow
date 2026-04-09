/**
 * Evidence Validator
 *
 * Validation utilities for unified evidence events and configuration
 * Provides schema validation, format checking, and error reporting
 */
import { EvidenceEvent, ValidationResult } from './types/evidence-types';
/**
 * Evidence Validator
 *
 * Provides comprehensive validation for evidence events and configuration
 */
export declare class EvidenceValidator {
    private static readonly ISO_8601_REGEX;
    private static readonly VALID_EMITTER_NAMES;
    private static readonly VALID_CATEGORIES;
    private static readonly VALID_PRIORITIES;
    /**
     * Validate evidence event against unified schema
     */
    static validateEvent(event: EvidenceEvent): ValidationResult;
    /**
     * Validate required fields are present and valid
     */
    private static validateRequiredFields;
    /**
     * Validate field formats and values
     */
    private static validateFieldFormats;
    /**
     * Validate business logic and constraints
     */
    private static validateBusinessLogic;
    /**
     * Validate business logic warnings
     */
    private static validateBusinessWarnings;
    /**
     * Validate system information structure
     */
    private static validateSystemInfo;
    /**
     * Validate evidence configuration
     */
    static validateConfig(config: any): ValidationResult;
    /**
     * Validate emitters configuration section
     */
    private static validateEmittersConfig;
    /**
     * Validate performance configuration
     */
    private static validatePerformanceConfig;
    /**
     * Validate storage configuration
     */
    private static validateStorageConfig;
    /**
     * Validate migration configuration
     */
    private static validateMigrationConfig;
    /**
     * Check if timestamp is valid ISO 8601 format
     */
    static isValidTimestamp(timestamp: string): boolean;
    /**
     * Check if UUID is valid format
     */
    static isValidUUID(uuid: string): boolean;
    /**
     * Generate suggestions for validation errors
     */
    private static generateSuggestions;
    /**
     * Generate suggestions for configuration validation errors
     */
    private static generateConfigSuggestions;
}
//# sourceMappingURL=evidence-validator.d.ts.map