/**
 * Schema Validator
 * 
 * Implements tier-specific schema validation for backlog items and coverage requirements
 * with comprehensive validation rules and compliance checking
 */

import { EventEmitter } from 'events';
import {
  TierLevel,
  SchemaValidationRules,
  BacklogItemSchema,
  ComplianceThresholds,
  CrossFieldValidation,
  CoverageError,
  BacklogComplianceReport,
  ComplianceViolation
} from './types';
import { TierFramework } from './tier-framework';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  complianceScore: number;
  fieldCompliance: Record<string, boolean>;
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  actualValue: any;
  expectedValue?: any;
}

export interface ValidationWarning {
  field: string;
  code: string;
  message: string;
  recommendation: string;
}

export interface ValidationConfig {
  strictMode: boolean;
  enableWarnings: boolean;
  customValidators: Record<string, (value: any) => boolean>;
  fieldOverrides: Record<string, Partial<SchemaValidationRules>>;
  complianceThresholds: Partial<Record<TierLevel, Partial<ComplianceThresholds>>>;
}

export class SchemaValidator extends EventEmitter {
  private tierFramework: TierFramework;
  private config: ValidationConfig;
  private validationCache: Map<string, ValidationResult> = new Map();

  constructor(
    tierFramework: TierFramework,
    config: Partial<ValidationConfig> = {}
  ) {
    super();
    this.tierFramework = tierFramework;
    this.config = {
      strictMode: false,
      enableWarnings: true,
      customValidators: {},
      fieldOverrides: {},
      complianceThresholds: {},
      ...config
    };
  }

  /**
   * Validate backlog item against tier-specific schema
   */
  public async validateBacklogItem(
    item: BacklogItemSchema
  ): Promise<ValidationResult> {
    const cacheKey = this.generateCacheKey(item);
    
    // Check cache first
    if (this.validationCache.has(cacheKey)) {
      return this.validationCache.get(cacheKey)!;
    }

    try {
      const schemaRules = this.tierFramework.getSchemaValidationRules(item.tierLevel);
      if (!schemaRules) {
        throw new CoverageError(
          'SCHEMA_NOT_FOUND',
          `Schema rules not found for tier: ${item.tierLevel}`,
          { tierLevel: item.tierLevel }
        );
      }

      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];
      const fieldCompliance: Record<string, boolean> = {};

      // Apply field overrides if any
      const effectiveRules = this.applyFieldOverrides(schemaRules, item.tierLevel);

      // Validate required fields
      this.validateRequiredFields(item, effectiveRules, errors, fieldCompliance);

      // Validate field types
      this.validateFieldTypes(item, effectiveRules, errors, fieldCompliance);

      // Validate field patterns
      this.validateFieldPatterns(item, effectiveRules, errors, warnings, fieldCompliance);

      // Validate cross-field dependencies
      this.validateCrossFieldRules(item, effectiveRules, errors, warnings, fieldCompliance);

      // Apply custom validators
      this.applyCustomValidators(item, errors, warnings, fieldCompliance);

      // Calculate compliance score
      const complianceScore = this.calculateComplianceScore(
        effectiveRules.requiredFields.length,
        Object.values(fieldCompliance).filter(Boolean).length,
        errors.length,
        warnings.length
      );

      const result: ValidationResult = {
        valid: errors.length === 0,
        errors,
        warnings,
        complianceScore,
        fieldCompliance
      };

      // Cache result
      this.validationCache.set(cacheKey, result);

      this.emit('itemValidated', { item, result });
      return result;

    } catch (error) {
      const validationError = new CoverageError(
        'VALIDATION_FAILED',
        `Failed to validate backlog item: ${item.id}`,
        { itemId: item.id, error: error instanceof Error ? error.message : String(error) }
      );
      this.emit('validationError', validationError);
      throw validationError;
    }
  }

  /**
   * Validate multiple backlog items
   */
  public async validateBacklogItems(
    items: BacklogItemSchema[]
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    for (const item of items) {
      try {
        const result = await this.validateBacklogItem(item);
        results.push(result);
      } catch (error) {
        // Add failed validation result
        results.push({
          valid: false,
          errors: [{
            field: 'general',
            code: 'VALIDATION_EXCEPTION',
            message: error instanceof Error ? error.message : String(error),
            severity: 'critical',
            actualValue: null
          }],
          warnings: [],
          complianceScore: 0,
          fieldCompliance: {}
        });
      }
    }

    this.emit('batchValidationCompleted', { itemCount: items.length, results });
    return results;
  }

  /**
   * Generate compliance report for backlog items
   */
  public async generateComplianceReport(
    circleId: string,
    tierLevel: TierLevel,
    items: BacklogItemSchema[]
  ): Promise<BacklogComplianceReport> {
    try {
      const validationResults = await this.validateBacklogItems(items);
      const complianceThresholds = this.tierFramework.getComplianceThresholds(tierLevel);
      
      if (!complianceThresholds) {
        throw new CoverageError(
          'THRESHOLDS_NOT_FOUND',
          `Compliance thresholds not found for tier: ${tierLevel}`,
          { tierLevel }
        );
      }

      const totalItems = items.length;
      const compliantItems = validationResults.filter(r => r.valid).length;
      const nonCompliantItems = totalItems - compliantItems;
      const compliancePercentage = (compliantItems / totalItems) * 100;

      // Calculate field compliance
      const fieldCompliance: Record<string, number> = {};
      const allFields = new Set<string>();

      items.forEach(item => {
        Object.keys(item).forEach(field => allFields.add(field));
      });

      allFields.forEach(field => {
        const fieldValidCount = validationResults.filter(r => r.fieldCompliance[field]).length;
        fieldCompliance[field] = (fieldValidCount / totalItems) * 100;
      });

      // Identify common violations
      const commonViolations = this.identifyCommonViolations(validationResults);

      // Generate recommendations
      const recommendations = this.generateComplianceRecommendations(
        validationResults,
        complianceThresholds,
        tierLevel
      );

      // Group items by type
      const itemsByType: Record<string, number> = {};
      items.forEach(item => {
        itemsByType[item.type] = (itemsByType[item.type] || 0) + 1;
      });

      const report: BacklogComplianceReport = {
        circleId,
        tierLevel,
        totalItems,
        compliantItems,
        nonCompliantItems,
        compliancePercentage,
        fieldCompliance,
        commonViolations,
        recommendations,
        itemsByType
      };

      this.emit('complianceReportGenerated', report);
      return report;

    } catch (error) {
      const reportError = new CoverageError(
        'REPORT_GENERATION_FAILED',
        `Failed to generate compliance report for ${circleId}`,
        { circleId, tierLevel, error: error instanceof Error ? error.message : String(error) }
      );
      this.emit('reportError', reportError);
      throw reportError;
    }
  }

  /**
   * Validate required fields
   */
  private validateRequiredFields(
    item: BacklogItemSchema,
    rules: SchemaValidationRules,
    errors: ValidationError[],
    fieldCompliance: Record<string, boolean>
  ): void {
    rules.requiredFields.forEach(field => {
      const value = (item as any)[field];
      const isValid = value !== undefined && value !== null && value !== '';

      fieldCompliance[field] = isValid;

      if (!isValid) {
        errors.push({
          field,
          code: 'REQUIRED_FIELD_MISSING',
          message: `Required field '${field}' is missing or empty`,
          severity: 'critical',
          actualValue: value
        });
      }
    });
  }

  /**
   * Validate field types
   */
  private validateFieldTypes(
    item: BacklogItemSchema,
    rules: SchemaValidationRules,
    errors: ValidationError[],
    fieldCompliance: Record<string, boolean>
  ): void {
    Object.entries(rules.fieldTypes).forEach(([field, expectedType]) => {
      const value = (item as any)[field];
      
      if (value === undefined || value === null) {
        return; // Skip validation for missing fields (handled by required fields)
      }

      const actualType = this.getValueType(value);
      const isValid = actualType === expectedType;

      if (fieldCompliance[field] !== false) {
        fieldCompliance[field] = isValid;
      }

      if (!isValid) {
        errors.push({
          field,
          code: 'INVALID_FIELD_TYPE',
          message: `Field '${field}' has invalid type. Expected: ${expectedType}, Actual: ${actualType}`,
          severity: 'high',
          actualValue: value,
          expectedValue: expectedType
        });
      }
    });
  }

  /**
   * Validate field patterns
   */
  private validateFieldPatterns(
    item: BacklogItemSchema,
    rules: SchemaValidationRules,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    fieldCompliance: Record<string, boolean>
  ): void {
    Object.entries(rules.validationPatterns).forEach(([field, pattern]) => {
      const value = (item as any)[field];
      
      if (value === undefined || value === null || typeof value !== 'string') {
        return; // Skip validation for non-string or missing fields
      }

      const isValid = pattern.test(value);

      if (fieldCompliance[field] !== false) {
        fieldCompliance[field] = isValid;
      }

      if (!isValid) {
        errors.push({
          field,
          code: 'PATTERN_VALIDATION_FAILED',
          message: `Field '${field}' does not match required pattern`,
          severity: 'medium',
          actualValue: value
        });
      }
    });
  }

  /**
   * Validate cross-field rules
   */
  private validateCrossFieldRules(
    item: BacklogItemSchema,
    rules: SchemaValidationRules,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    fieldCompliance: Record<string, boolean>
  ): void {
    rules.crossFieldValidation.forEach(rule => {
      const values = rule.fields.map(field => (item as any)[field]);
      
      let isValid = true;
      let message = '';

      switch (rule.rule) {
        case 'required_if':
          isValid = this.validateRequiredIf(values, rule);
          message = `Cross-field validation failed for required_if rule`;
          break;
        case 'mutually_exclusive':
          isValid = this.validateMutuallyExclusive(values, rule);
          message = `Cross-field validation failed for mutually_exclusive rule`;
          break;
        case 'dependency':
          isValid = this.validateDependency(values, rule);
          message = `Cross-field validation failed for dependency rule`;
          break;
        case 'format_consistency':
          isValid = this.validateFormatConsistency(values, rule);
          message = `Cross-field validation failed for format_consistency rule`;
          break;
      }

      if (!isValid) {
        if (this.config.strictMode) {
          errors.push({
            field: rule.fields.join(', '),
            code: 'CROSS_FIELD_VALIDATION_FAILED',
            message: `${message}: ${rule.description}`,
            severity: 'medium',
            actualValue: values
          });
        } else if (this.config.enableWarnings) {
          warnings.push({
            field: rule.fields.join(', '),
            code: 'CROSS_FIELD_WARNING',
            message: `${message}: ${rule.description}`,
            recommendation: rule.description
          });
        }
      }
    });
  }

  /**
   * Apply custom validators
   */
  private applyCustomValidators(
    item: BacklogItemSchema,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    fieldCompliance: Record<string, boolean>
  ): void {
    Object.entries(this.config.customValidators).forEach(([field, validator]) => {
      const value = (item as any)[field];
      
      try {
        const isValid = validator(value);
        fieldCompliance[field] = isValid;

        if (!isValid) {
          errors.push({
            field,
            code: 'CUSTOM_VALIDATION_FAILED',
            message: `Custom validation failed for field '${field}'`,
            severity: 'medium',
            actualValue: value
          });
        }
      } catch (error) {
        warnings.push({
          field,
          code: 'CUSTOM_VALIDATOR_ERROR',
          message: `Custom validator for field '${field}' threw an error`,
          recommendation: 'Check custom validator implementation'
        });
      }
    });
  }

  /**
   * Calculate compliance score
   */
  private calculateComplianceScore(
    requiredFields: number,
    compliantFields: number,
    errors: number,
    warnings: number
  ): number {
    const fieldScore = (compliantFields / requiredFields) * 70; // 70% weight for field compliance
    const errorPenalty = Math.min(errors * 5, 20); // Up to 20% penalty for errors
    const warningPenalty = Math.min(warnings * 2, 10); // Up to 10% penalty for warnings

    return Math.max(0, Math.round(fieldScore - errorPenalty - warningPenalty));
  }

  /**
   * Identify common violations
   */
  private identifyCommonViolations(results: ValidationResult[]): string[] {
    const violationCounts: Record<string, number> = {};

    results.forEach(result => {
      result.errors.forEach(error => {
        const key = `${error.code}:${error.field}`;
        violationCounts[key] = (violationCounts[key] || 0) + 1;
      });
    });

    // Sort by frequency and return top violations
    return Object.entries(violationCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([key]) => key);
  }

  /**
   * Generate compliance recommendations
   */
  private generateComplianceRecommendations(
    results: ValidationResult[],
    thresholds: ComplianceThresholds,
    tierLevel: TierLevel
  ): string[] {
    const recommendations: string[] = [];

    const avgCompliance = results.reduce((sum, r) => sum + r.complianceScore, 0) / results.length;

    if (avgCompliance < thresholds.minimumCoverage) {
      recommendations.push(`Overall compliance (${avgCompliance.toFixed(1)}%) is below minimum threshold (${thresholds.minimumCoverage}%)`);
    }

    // Analyze common error patterns
    const errorPatterns = this.analyzeErrorPatterns(results);
    errorPatterns.forEach(pattern => {
      recommendations.push(`Address common issue: ${pattern}`);
    });

    // Tier-specific recommendations
    switch (tierLevel) {
      case 'high-structure':
        recommendations.push('Ensure all governance requirements are met for high-structure tier');
        recommendations.push('Implement comprehensive documentation and validation processes');
        break;
      case 'medium-structure':
        recommendations.push('Focus on core process and documentation requirements');
        recommendations.push('Establish basic governance structures');
        break;
      case 'flexible':
        recommendations.push('Maintain basic documentation and compliance requirements');
        recommendations.push('Implement minimal validation processes');
        break;
    }

    return recommendations;
  }

  /**
   * Analyze error patterns
   */
  private analyzeErrorPatterns(results: ValidationResult[]): string[] {
    const patterns: string[] = [];
    const fieldErrors: Record<string, number> = {};
    const codeErrors: Record<string, number> = {};

    results.forEach(result => {
      result.errors.forEach(error => {
        fieldErrors[error.field] = (fieldErrors[error.field] || 0) + 1;
        codeErrors[error.code] = (codeErrors[error.code] || 0) + 1;
      });
    });

    // Find most common field errors
    const commonFields = Object.entries(fieldErrors)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([field]) => field);

    if (commonFields.length > 0) {
      patterns.push(`Frequent validation issues in fields: ${commonFields.join(', ')}`);
    }

    // Find most common error codes
    const commonCodes = Object.entries(codeErrors)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([code]) => code);

    if (commonCodes.length > 0) {
      patterns.push(`Common error types: ${commonCodes.join(', ')}`);
    }

    return patterns;
  }

  /**
   * Apply field overrides
   */
  private applyFieldOverrides(
    rules: SchemaValidationRules,
    tierLevel: TierLevel
  ): SchemaValidationRules {
    const overrides = this.config.fieldOverrides[tierLevel];
    if (!overrides) {
      return rules;
    }

    return {
      ...rules,
      ...overrides,
      requiredFields: overrides.requiredFields || rules.requiredFields,
      optionalFields: overrides.optionalFields || rules.optionalFields,
      fieldTypes: { ...rules.fieldTypes, ...overrides.fieldTypes },
      validationPatterns: { ...rules.validationPatterns, ...overrides.validationPatterns },
      crossFieldValidation: overrides.crossFieldValidation || rules.crossFieldValidation
    };
  }

  /**
   * Get value type for validation
   */
  private getValueType(value: any): string {
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object' && value !== null) return 'object';
    return typeof value;
  }

  /**
   * Validate required_if rule
   */
  private validateRequiredIf(values: any[], rule: CrossFieldValidation): boolean {
    // Simple implementation - can be enhanced based on specific requirements
    return values.every(v => v !== undefined && v !== null && v !== '');
  }

  /**
   * Validate mutually_exclusive rule
   */
  private validateMutuallyExclusive(values: any[], rule: CrossFieldValidation): boolean {
    const nonEmptyValues = values.filter(v => v !== undefined && v !== null && v !== '');
    return nonEmptyValues.length <= 1;
  }

  /**
   * Validate dependency rule
   */
  private validateDependency(values: any[], rule: CrossFieldValidation): boolean {
    // Simple implementation - can be enhanced based on specific requirements
    const [primary, ...dependencies] = values;
    if (primary !== undefined && primary !== null && primary !== '') {
      return dependencies.every(dep => dep !== undefined && dep !== null && dep !== '');
    }
    return true;
  }

  /**
   * Validate format_consistency rule
   */
  private validateFormatConsistency(values: any[], rule: CrossFieldValidation): boolean {
    // Simple implementation - check if all string values have consistent format
    const stringValues = values.filter(v => typeof v === 'string');
    if (stringValues.length <= 1) return true;

    // Check if all strings follow similar patterns (basic implementation)
    const firstPattern = stringValues[0].replace(/[^a-zA-Z0-9]/g, '');
    return stringValues.every(s => s.replace(/[^a-zA-Z0-9]/g, '') === firstPattern);
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(item: BacklogItemSchema): string {
    return `${item.id}:${item.tierLevel}:${JSON.stringify(item)}`;
  }

  /**
   * Clear validation cache
   */
  public clearCache(): void {
    this.validationCache.clear();
    this.emit('cacheCleared');
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<ValidationConfig>): void {
    this.config = { ...this.config, ...config };
    this.clearCache(); // Clear cache when config changes
    this.emit('configUpdated', this.config);
  }

  /**
   * Get validation statistics
   */
  public getValidationStatistics(): {
    cacheSize: number;
    validationRules: Record<TierLevel, number>;
    customValidators: number;
  } {
    const validationRules: Record<string, number> = {};
    
    ['high-structure', 'medium-structure', 'flexible'].forEach(tier => {
      const rules = this.tierFramework.getSchemaValidationRules(tier as TierLevel);
      validationRules[tier] = rules ? rules.requiredFields.length : 0;
    });

    return {
      cacheSize: this.validationCache.size,
      validationRules: validationRules as Record<TierLevel, number>,
      customValidators: Object.keys(this.config.customValidators).length
    };
  }
}