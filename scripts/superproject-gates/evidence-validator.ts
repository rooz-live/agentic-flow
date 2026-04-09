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
export class EvidenceValidator {
  private static readonly ISO_8601_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}\.\d{3}Z$/;
  private static readonly VALID_EMITTER_NAMES = [
    'economic_compounding',
    'maturity_coverage',
    'observability_gaps',
    'pattern_hit_percent',
    'prod_cycle_qualification'
  ];
  private static readonly VALID_CATEGORIES = ['core', 'extended', 'debug'];
  private static readonly VALID_PRIORITIES = ['low', 'medium', 'high', 'critical'];

  /**
   * Validate evidence event against unified schema
   */
  static validateEvent(event: EvidenceEvent): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required field validation
    errors.push(...this.validateRequiredFields(event));

    // Field format validation
    errors.push(...this.validateFieldFormats(event));

    // Business logic validation
    errors.push(...this.validateBusinessLogic(event));
    warnings.push(...this.validateBusinessWarnings(event));

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions: EvidenceValidator.generateSuggestions(errors)
    };
  }

  /**
   * Validate required fields are present and valid
   */
  private static validateRequiredFields(event: EvidenceEvent): string[] {
    const errors: string[] = [];
    const requiredFields = ['timestamp', 'run_id', 'command', 'mode', 'emitter_name', 'event_type', 'data'];

    for (const field of requiredFields) {
      if (!event[field as keyof EvidenceEvent]) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    return errors;
  }

  /**
   * Validate field formats and values
   */
  private static validateFieldFormats(event: EvidenceEvent): string[] {
    const errors: string[] = [];

    // Timestamp format validation
    if (!this.isValidTimestamp(event.timestamp)) {
      errors.push('Invalid timestamp format. Must be ISO 8601 UTC (YYYY-MM-DDTHH:MM:SS.sssZ)');
    }

    // Run ID format validation
    if (event.run_id && !this.isValidUUID(event.run_id)) {
      errors.push('Invalid run_id format. Must be a valid UUID');
    }

    // Emitter name validation
    if (!this.VALID_EMITTER_NAMES.includes(event.emitter_name)) {
      errors.push(`Invalid emitter_name: ${event.emitter_name}. Must be one of: ${this.VALID_EMITTER_NAMES.join(', ')}`);
    }

    // Category validation
    if (event.category && !this.VALID_CATEGORIES.includes(event.category)) {
      errors.push(`Invalid category: ${event.category}. Must be one of: ${this.VALID_CATEGORIES.join(', ')}`);
    }

    // Priority validation
    if (event.priority && !this.VALID_PRIORITIES.includes(event.priority)) {
      errors.push(`Invalid priority: ${event.priority}. Must be one of: ${this.VALID_PRIORITIES.join(', ')}`);
    }

    // Duration validation
    if (event.duration_ms !== undefined) {
      if (typeof event.duration_ms !== 'number' || event.duration_ms < 0) {
        errors.push('duration_ms must be a positive number');
      }
    }

    return errors;
  }

  /**
   * Validate business logic and constraints
   */
  private static validateBusinessLogic(event: EvidenceEvent): string[] {
    const errors: string[] = [];

    // Validate command names
    const validCommands = ['prod-cycle', 'prod-swarm', 'system'];
    if (!validCommands.includes(event.command)) {
      errors.push(`Invalid command: ${event.command}. Must be one of: ${validCommands.join(', ')}`);
    }

    // Validate mode values
    const validModes = ['mutate', 'normal', 'advisory', 'enforcement'];
    if (!validModes.includes(event.mode)) {
      errors.push(`Invalid mode: ${event.mode}. Must be one of: ${validModes.join(', ')}`);
    }

    // Validate data is object
    if (typeof event.data !== 'object' || event.data === null) {
      errors.push('data field must be a valid object');
    }

    // Validate system_info if present
    if (event.system_info) {
      const systemInfoErrors = this.validateSystemInfo(event.system_info);
      errors.push(...systemInfoErrors);
    }

    return errors;
  }

  /**
   * Validate business logic warnings
   */
  private static validateBusinessWarnings(event: EvidenceEvent): string[] {
    const warnings: string[] = [];

    // Check for deprecated field combinations
    if (event.emitter_name === 'economic_compounding' && !event.data.revenue_growth) {
      warnings.push('economic_compounding event should include revenue_growth data');
    }

    if (event.emitter_name === 'maturity_coverage' && !event.data.tier_coverage) {
      warnings.push('maturity_coverage event should include tier_coverage data');
    }

    if (event.emitter_name === 'observability_gaps' && !event.data.total_gaps) {
      warnings.push('observability_gaps event should include total_gaps data');
    }

    if (event.emitter_name === 'pattern_hit_percent' && !event.data.hit_rate) {
      warnings.push('pattern_hit_percent event should include hit_rate data');
    }

    // Check for very old timestamps (might indicate stale data)
    const eventTime = new Date(event.timestamp);
    const now = new Date();
    const daysDiff = (now.getTime() - eventTime.getTime()) / (1000 * 60 * 60 * 24);

    if (daysDiff > 365) {
      warnings.push(`Event timestamp is over a year old: ${event.timestamp}`);
    }

    return warnings;
  }

  /**
   * Validate system information structure
   */
  private static validateSystemInfo(systemInfo: any): string[] {
    const errors: string[] = [];

    if (typeof systemInfo !== 'object' || systemInfo === null) {
      errors.push('system_info must be an object');
      return errors;
    }

    // Validate required system info fields
    const requiredFields = ['cpu_usage', 'memory_usage', 'node_version', 'platform'];
    for (const field of requiredFields) {
      if (!(field in systemInfo)) {
        errors.push(`Missing required system_info field: ${field}`);
      }
    }

    // Validate field types and ranges
    if (systemInfo.cpu_usage !== undefined && (typeof systemInfo.cpu_usage !== 'number' || systemInfo.cpu_usage < 0 || systemInfo.cpu_usage > 100)) {
      errors.push('cpu_usage must be a number between 0 and 100');
    }

    if (systemInfo.memory_usage !== undefined && (typeof systemInfo.memory_usage !== 'number' || systemInfo.memory_usage < 0)) {
      errors.push('memory_usage must be a positive number');
    }

    if (systemInfo.node_version && typeof systemInfo.node_version !== 'string') {
      errors.push('node_version must be a string');
    }

    if (systemInfo.platform && typeof systemInfo.platform !== 'string') {
      errors.push('platform must be a string');
    }

    return errors;
  }

  /**
   * Validate evidence configuration
   */
  static validateConfig(config: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if config is object
    if (typeof config !== 'object' || config === null) {
      errors.push('Configuration must be a valid object');
      return { valid: false, errors, warnings, suggestions: [] };
    }

    // Validate version
    if (!config.version || typeof config.version !== 'string') {
      errors.push('Configuration must include a version string');
    }

    // Validate emitters structure
    if (!config.emitters || typeof config.emitters !== 'object') {
      errors.push('Configuration must include emitters object');
    } else {
      const emitterErrors = this.validateEmittersConfig(config.emitters);
      errors.push(...emitterErrors);
    }

    // Validate performance config
    if (config.performance) {
      const perfErrors = this.validatePerformanceConfig(config.performance);
      errors.push(...perfErrors);
    }

    // Validate storage config
    if (config.storage) {
      const storageErrors = this.validateStorageConfig(config.storage);
      errors.push(...storageErrors);
    }

    // Validate migration config
    if (config.migration) {
      const migrationErrors = this.validateMigrationConfig(config.migration);
      errors.push(...migrationErrors);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions: this.generateConfigSuggestions(errors)
    };
  }

  /**
   * Validate emitters configuration section
   */
  private static validateEmittersConfig(emitters: any): string[] {
    const errors: string[] = [];

    if (!emitters.default || !Array.isArray(emitters.default)) {
      errors.push('emitters.default must be an array of strings');
    }

    if (!emitters.optional || !Array.isArray(emitters.optional)) {
      errors.push('emitters.optional must be an array of strings');
    }

    if (!emitters.custom || !Array.isArray(emitters.custom)) {
      errors.push('emitters.custom must be an array of strings');
    }

    // Validate emitter names
    const allEmitters = [...(emitters.default || []), ...(emitters.optional || []), ...(emitters.custom || [])];
    for (const emitter of allEmitters) {
      if (typeof emitter !== 'string') {
        errors.push(`Emitter name must be a string: ${emitter}`);
      }
    }

    // Check for duplicates
    const duplicates = allEmitters.filter((item, index) => allEmitters.indexOf(item) !== index);
    if (duplicates.length > 0) {
      errors.push(`Duplicate emitter names found: ${duplicates.join(', ')}`);
    }

    return errors;
  }

  /**
   * Validate performance configuration
   */
  private static validatePerformanceConfig(perf: any): string[] {
    const errors: string[] = [];

    if (!perf.max_events_per_second || typeof perf.max_events_per_second !== 'number' || perf.max_events_per_second <= 0) {
      errors.push('max_events_per_second must be a positive number');
    }

    if (!perf.batch_size || typeof perf.batch_size !== 'number' || perf.batch_size <= 0) {
      errors.push('batch_size must be a positive number');
    }

    if (typeof perf.async_write !== 'boolean') {
      errors.push('async_write must be a boolean');
    }

    if (!perf.memory_limit_mb || typeof perf.memory_limit_mb !== 'number' || perf.memory_limit_mb <= 0) {
      errors.push('memory_limit_mb must be a positive number');
    }

    return errors;
  }

  /**
   * Validate storage configuration
   */
  private static validateStorageConfig(storage: any): string[] {
    const errors: string[] = [];

    if (typeof storage.compression !== 'boolean') {
      errors.push('compression must be a boolean');
    }

    if (!storage.rotation_days || typeof storage.rotation_days !== 'number' || storage.rotation_days <= 0) {
      errors.push('rotation_days must be a positive number');
    }

    if (!storage.backup_count || typeof storage.backup_count !== 'number' || storage.backup_count <= 0) {
      errors.push('backup_count must be a positive number');
    }

    if (!storage.max_file_size_mb || typeof storage.max_file_size_mb !== 'number' || storage.max_file_size_mb <= 0) {
      errors.push('max_file_size_mb must be a positive number');
    }

    return errors;
  }

  /**
   * Validate migration configuration
   */
  private static validateMigrationConfig(migration: any): string[] {
    const errors: string[] = [];

    if (typeof migration.legacy_format_support !== 'boolean') {
      errors.push('legacy_format_support must be a boolean');
    }

    if (typeof migration.auto_migrate !== 'boolean') {
      errors.push('auto_migrate must be a boolean');
    }

    if (!migration.migration_retention_days || typeof migration.migration_retention_days !== 'number' || migration.migration_retention_days <= 0) {
      errors.push('migration_retention_days must be a positive number');
    }

    return errors;
  }

  /**
   * Check if timestamp is valid ISO 8601 format
   */
  static isValidTimestamp(timestamp: string): boolean {
    return this.ISO_8601_REGEX.test(timestamp);
  }

  /**
   * Check if UUID is valid format
   */
  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    return uuidRegex.test(uuid);
  }

  /**
   * Generate suggestions for validation errors
   */
  private static generateSuggestions(errors: string[]): string[] {
    const suggestions: string[] = [];

    if (errors.some(e => e.includes('timestamp'))) {
      suggestions.push('Use ISO 8601 UTC timestamp format (YYYY-MM-DDTHH:MM:SS.sssZ)');
    }

    if (errors.some(e => e.includes('emitter_name'))) {
      suggestions.push('Check emitter name against unified specification');
    }

    if (errors.some(e => e.includes('Configuration'))) {
      suggestions.push('Refer to evidence configuration documentation');
    }

    return suggestions;
  }

  /**
   * Generate suggestions for configuration validation errors
   */
  private static generateConfigSuggestions(errors: string[]): string[] {
    const suggestions: string[] = [];

    if (errors.some(e => e.includes('version'))) {
      suggestions.push('Include configuration version following semantic versioning (x.y.z)');
    }

    if (errors.some(e => e.includes('emitters'))) {
      suggestions.push('Ensure emitters configuration includes default, optional, and custom arrays');
    }

    if (errors.some(e => e.includes('max_events_per_second'))) {
      suggestions.push('Set reasonable performance limits based on system capabilities');
    }

    return suggestions;
  }
}
