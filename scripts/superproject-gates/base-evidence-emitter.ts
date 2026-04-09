/**
 * Base Evidence Emitter
 * 
 * Provides a base implementation for all evidence emitters with common functionality.
 * Ensures consistent behavior and reduces code duplication.
 */

import { randomUUID } from 'crypto';
import {
  EvidenceEmitter,
  EvidenceEmitterConfig,
  UnifiedEvidenceEvent,
  EvidenceData,
  ValidationStatus,
  EvidenceCategory,
  EvidencePriority,
  SystemInfo,
  ValidationRule,
  TransformationRule
} from './unified-evidence-schema';

/**
 * Base Evidence Emitter
 * 
 * Provides common functionality for all evidence emitters
 */
export abstract class BaseEvidenceEmitter implements EvidenceEmitter {
  public abstract name: string;
  public abstract category: EvidenceCategory;
  public abstract version: string;
  
  protected config: EvidenceEmitterConfig;
  protected runId: string;
  protected correlationId?: string;
  protected tags: string[] = [];

  constructor(config?: Partial<EvidenceEmitterConfig>) {
    this.runId = process.env['AF_RUN_ID'] || randomUUID();
    const correlationId = process.env['AF_CORRELATION_ID'];
    if (correlationId) {
      this.correlationId = correlationId;
    }
    
    // Create default config and merge with provided config
    this.config = this.createDefaultConfig();
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Emit evidence event
   */
  async emit(eventType: string, data: EvidenceData): Promise<UnifiedEvidenceEvent> {
    try {
      // Validate data
      const validation = this.validate(data);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }
      
      // Transform data
      const transformedData = this.transform(data);
      
      // Create unified event
      const event: UnifiedEvidenceEvent = {
        // Core metadata
        timestamp: new Date().toISOString(),
        run_id: this.runId,
        command: process.argv[2] || 'unknown',
        mode: process.env['AF_MODE'] || 'normal',

        // Event identification
        emitter_name: this.name,
        event_type: eventType,
        category: this.category,

        // Event data
        data: transformedData,

        // Performance metadata
        priority: this.determinePriority(eventType, transformedData),

        // System metadata
        system_info: this.getSystemInfo(),

        // Validation and quality
        validation_status: validation,
        quality_score: this.calculateQualityScore(transformedData),

        // Correlation and tracing (optional)
        ...(this.correlationId && { correlation_id: this.correlationId }),
        ...(this.tags.length > 0 && { tags: [...this.tags] })
      };
      
      // Emit to specific implementation
      await this.emitEvent(event);
      
      return event;
      
    } catch (error) {
      throw new Error(`Failed to emit event: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Flush pending events
   */
  async flush(): Promise<void> {
    // Default implementation - no pending events
    // Override in subclasses if buffering is needed
  }

  /**
   * Configure emitter
   */
  configure(config: EvidenceEmitterConfig): void {
    this.config = { ...this.config, ...config };
    
    // Update correlation ID if provided
    if (config.correlation_id) {
      this.correlationId = config.correlation_id;
    }
    
    // Update tags if provided
    if (config.tags) {
      this.tags = config.tags;
    }
  }

  /**
   * Initialize emitter
   */
  async initialize(): Promise<void> {
    // Default implementation - no initialization needed
    // Override in subclasses if initialization is needed
  }

  /**
   * Cleanup emitter resources
   */
  async cleanup(): Promise<void> {
    // Default implementation - no cleanup needed
    // Override in subclasses if cleanup is needed
  }

  /**
   * Validate evidence data
   */
  validate(data: EvidenceData): ValidationStatus {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Base validation
    if (!data) {
      errors.push('Data is required');
      return {
        valid: false,
        errors,
        warnings,
        schema_version: this.config.schema_version || '1.0.0'
      };
    }
    
    // Custom validation rules
    if (this.config.validation_rules) {
      for (const rule of this.config.validation_rules) {
        const result = this.applyValidationRule(rule, data);
        if (!result.valid) {
          errors.push(result.error || rule.error_message);
        }
        if (result.warning) {
          warnings.push(result.warning);
        }
      }
    }
    
    // Emitter-specific validation
    const emitterValidation = this.validateEmitterData(data);
    errors.push(...emitterValidation.errors);
    warnings.push(...emitterValidation.warnings);
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      schema_version: this.config.schema_version || '1.0.0'
    };
  }

  /**
   * Transform evidence data
   */
  transform(data: EvidenceData): EvidenceData {
    let transformedData = { ...data };
    
    // Apply transformation rules
    if (this.config.transformation_rules) {
      for (const rule of this.config.transformation_rules) {
        transformedData = this.applyTransformationRule(rule, transformedData);
      }
    }
    
    // Emitter-specific transformations
    return this.transformEmitterData(transformedData);
  }

  /**
   * Set correlation ID for all subsequent events
   */
  setCorrelationId(correlationId: string): void {
    this.correlationId = correlationId;
  }

  /**
   * Add tag to all subsequent events
   */
  addTag(tag: string): void {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }
  }

  /**
   * Remove tag from all subsequent events
   */
  removeTag(tag: string): void {
    const index = this.tags.indexOf(tag);
    if (index > -1) {
      this.tags.splice(index, 1);
    }
  }

  /**
   * Clear all tags
   */
  clearTags(): void {
    this.tags = [];
  }

  /**
   * Get current configuration
   */
  getConfig(): EvidenceEmitterConfig {
    return { ...this.config };
  }

  /**
   * Check if emitter is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Emit event to specific implementation (abstract method)
   */
  protected abstract emitEvent(event: UnifiedEvidenceEvent): Promise<void>;

  /**
   * Validate emitter-specific data (abstract method)
   */
  protected abstract validateEmitterData(data: EvidenceData): {
    errors: string[];
    warnings: string[];
  };

  /**
   * Transform emitter-specific data (abstract method)
   */
  protected abstract transformEmitterData(data: EvidenceData): EvidenceData;

  /**
   * Create default configuration
   */
  private createDefaultConfig(): EvidenceEmitterConfig {
    return {
      name: this.name,
      version: this.version,
      category: this.category,
      enabled: true,
      priority: 'medium' as EvidencePriority,
      schema_version: '1.0.0'
    };
  }

  /**
   * Determine event priority
   */
  private determinePriority(eventType: string, _data: EvidenceData): EvidencePriority {
    // Use configured priority if available
    if (this.config.priority) {
      return this.config.priority;
    }
    
    // Determine based on event type and data
    if (eventType.includes('error') || eventType.includes('critical') || eventType.includes('failure')) {
      return EvidencePriority.Critical;
    }

    if (eventType.includes('warning') || eventType.includes('alert')) {
      return EvidencePriority.High;
    }

    if (eventType.includes('info') || eventType.includes('status')) {
      return EvidencePriority.Medium;
    }

    return EvidencePriority.Low;
  }

  /**
   * Get system information
   */
  private getSystemInfo(): SystemInfo {
    return {
      cpu_usage: process.cpuUsage ? process.cpuUsage().user / 1000000 : 0,
      memory_usage: process.memoryUsage ? process.memoryUsage().heapUsed / 1024 / 1024 : 0,
      node_version: process.version,
      platform: process.platform,
      hostname: require('os').hostname(),
      process_id: process.pid
    };
  }

  /**
   * Calculate quality score
   */
  private calculateQualityScore(data: EvidenceData): number {
    let score = 100;
    
    // Deduct points for missing optional fields
    if (!data.source) score -= 5;
    if (!data.collection_method) score -= 5;
    if (data.confidence === undefined) score -= 10;
    if (!data.metadata || Object.keys(data.metadata).length === 0) score -= 5;
    
    // Emitter-specific quality calculation
    score = this.calculateEmitterQualityScore(data, score);
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate emitter-specific quality score (abstract method)
   */
  protected abstract calculateEmitterQualityScore(data: EvidenceData, baseScore: number): number;

  /**
   * Apply validation rule
   */
  private applyValidationRule(rule: ValidationRule, data: EvidenceData): {
    valid: boolean;
    error?: string;
    warning?: string;
  } {
    const value = this.getNestedValue(data, rule.field);
    
    switch (rule.rule) {
      case 'required':
        return {
          valid: value !== undefined && value !== null && value !== '',
          error: rule.error_message
        };
        
      case 'type':
        const expectedType = rule.parameters['type'] as string;
        const actualType = typeof value;
        return {
          valid: actualType === expectedType,
          error: rule.error_message
        };
        
      case 'range':
        const min = rule.parameters['min'] as number;
        const max = rule.parameters['max'] as number;
        const numValue = Number(value);
        return {
          valid: !isNaN(numValue) && numValue >= min && numValue <= max,
          error: rule.error_message
        };
        
      case 'pattern':
        const pattern = new RegExp(rule.parameters['pattern'] as string);
        const strValue = String(value);
        return {
          valid: pattern.test(strValue),
          error: rule.error_message
        };
        
      case 'custom':
        // Custom validation function would be provided in parameters
        const customValidator = rule.parameters['validator'] as Function;
        if (typeof customValidator === 'function') {
          return customValidator(value);
        }
        return { valid: true };
        
      default:
        return { valid: true };
    }
  }

  /**
   * Apply transformation rule
   */
  private applyTransformationRule(rule: TransformationRule, data: EvidenceData): EvidenceData {
    const sourceValue = this.getNestedValue(data, rule.source_field);
    
    switch (rule.transformation) {
      case 'rename':
        this.setNestedValue(data, rule.target_field, sourceValue);
        this.deleteNestedValue(data, rule.source_field);
        break;
        
      case 'calculate':
        const calculateFn = rule.parameters['calculate'] as Function;
        if (typeof calculateFn === 'function') {
          const calculatedValue = calculateFn(sourceValue, data);
          this.setNestedValue(data, rule.target_field, calculatedValue);
        }
        break;
        
      case 'format':
        const formatFn = rule.parameters['format'] as Function;
        if (typeof formatFn === 'function') {
          const formattedValue = formatFn(sourceValue);
          this.setNestedValue(data, rule.target_field, formattedValue);
        }
        break;
        
      case 'custom':
        const customFn = rule.parameters['transform'] as Function;
        if (typeof customFn === 'function') {
          customFn(data, rule);
        }
        break;
    }
    
    return data;
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Set nested value in object
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  /**
   * Delete nested value from object
   */
  private deleteNestedValue(obj: any, path: string): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => current?.[key], obj);
    if (target) {
      delete target[lastKey];
    }
  }
}