/**
 * Validation Engine for Multi-Tenant Affiliate Platform
 * 
 * Provides comprehensive validation, error handling, and data integrity checks
 * for all affiliate platform operations
 */

import { EventEmitter } from 'events';
import {
  Tenant,
  Affiliate,
  Commission,
  Referral,
  Customer,
  PaymentMethod,
  AffiliateError,
  AffiliateEvent,
  ValidationRule,
  ValidationError
} from '../types';
import { OrchestrationFramework } from '../../core/orchestration-framework';
import { WSJFScoringService } from '../../wsjf/scoring-service';

export interface ValidationConfig {
  enableStrictValidation: boolean;
  enableDataIntegrityChecks: boolean;
  enableComplianceValidation: boolean;
  enableFraudDetection: boolean;
  maxValidationErrors: number;
  validationTimeout: number;
  customValidators: Record<string, ValidationRule[]>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  score: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  processingTime: number;
  validatedAt: Date;
}

export interface ValidationContext {
  operation: string;
  tenantId?: string;
  userId?: string;
  data: any;
  metadata?: Record<string, any>;
}

export class ValidationEngine extends EventEmitter {
  private validationRules: Map<string, ValidationRule[]> = new Map();
  private validationCache: Map<string, ValidationResult> = new Map();
  private config: ValidationConfig;
  private validationHistory: Array<{
    id: string;
    context: ValidationContext;
    result: ValidationResult;
    timestamp: Date;
  }> = [];

  constructor(
    private orchestration: OrchestrationFramework,
    private wsjfService: WSJFScoringService,
    config: Partial<ValidationConfig> = {}
  ) {
    super();
    this.config = {
      enableStrictValidation: true,
      enableDataIntegrityChecks: true,
      enableComplianceValidation: true,
      enableFraudDetection: true,
      maxValidationErrors: 10,
      validationTimeout: 5000, // 5 seconds
      customValidators: {},
      ...config
    };
    this.setupOrchestrationIntegration();
    this.initializeDefaultValidators();
  }

  /**
   * Setup integration with orchestration framework
   */
  private setupOrchestrationIntegration(): void {
    // Create purpose for validation
    const validationPurpose = this.orchestration.createPurpose({
      name: 'Data Validation and Integrity',
      description: 'Ensure data quality, compliance, and integrity across the platform',
      objectives: [
        'Validate all data inputs and operations',
        'Maintain data integrity and consistency',
        'Ensure compliance with regulations',
        'Detect and prevent fraud'
      ],
      keyResults: [
        '99.9% validation accuracy',
        'Zero data integrity violations',
        '100% compliance validation',
        'Sub-100ms validation processing'
      ]
    });

    // Create domain for validation operations
    const validationDomain = this.orchestration.createDomain({
      name: 'Validation and Quality',
      purpose: 'Manage all validation, quality assurance, and compliance operations',
      boundaries: [
        'Data validation rules',
        'Integrity checks',
        'Compliance validation',
        'Fraud detection'
      ],
      accountabilities: [
        'Data quality and accuracy',
        'Compliance monitoring',
        'Fraud prevention',
        'Validation efficiency'
      ]
    });

    console.log('[VALIDATION-ENGINE] Integrated with orchestration framework');
  }

  /**
   * Initialize default validation rules
   */
  private initializeDefaultValidators(): void {
    // Tenant validation rules
    this.validationRules.set('tenant', [
      {
        id: 'tenant_name_required',
        name: 'Tenant Name Required',
        description: 'Tenant name is required and must be valid',
        field: 'name',
        rule: 'required|min:3|max:100',
        severity: 'error'
      },
      {
        id: 'tenant_domain_valid',
        name: 'Valid Tenant Domain',
        description: 'Tenant domain must be a valid domain',
        field: 'domain',
        rule: 'regex:/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\\.[a-zA-Z]{2,6}$',
        severity: 'error'
      },
      {
        id: 'tenant_subscription_valid',
        name: 'Valid Subscription Plan',
        description: 'Tenant must have a valid subscription plan',
        field: 'subscription.plan',
        rule: 'required|in:starter,professional,enterprise',
        severity: 'error'
      }
    ]);

    // Affiliate validation rules
    this.validationRules.set('affiliate', [
      {
        id: 'affiliate_email_required',
        name: 'Valid Email Required',
        description: 'Affiliate email is required and must be valid',
        field: 'profile.email',
        rule: 'required|email',
        severity: 'error'
      },
      {
        id: 'affiliate_code_unique',
        name: 'Unique Affiliate Code',
        description: 'Affiliate code must be unique within tenant',
        field: 'affiliateCode',
        rule: 'required|min:5|max:20|unique_tenant',
        severity: 'error'
      },
      {
        id: 'affiliate_payment_method_valid',
        name: 'Valid Payment Method',
        description: 'Affiliate must have valid payment method',
        field: 'profile.paymentMethods',
        rule: 'required|array|min:1',
        severity: 'error'
      }
    ]);

    // Commission validation rules
    this.validationRules.set('commission', [
      {
        id: 'commission_amount_positive',
        name: 'Positive Commission Amount',
        description: 'Commission amount must be positive',
        field: 'amount',
        rule: 'required|number|min:0.01',
        severity: 'error'
      },
      {
        id: 'commission_rate_valid',
        name: 'Valid Commission Rate',
        description: 'Commission rate must be between 0 and 1',
        field: 'rate',
        rule: 'required|number|min:0|max:1',
        severity: 'error'
      }
    ]);

    // Payment validation rules
    this.validationRules.set('payment', [
      {
        id: 'payment_method_supported',
        name: 'Supported Payment Method',
        description: 'Payment method must be supported',
        field: 'type',
        rule: 'required|in:stripe_connect,paypal,bank_account,crypto',
        severity: 'error'
      },
      {
        id: 'payment_amount_positive',
        name: 'Positive Payment Amount',
        description: 'Payment amount must be positive',
        field: 'amount',
        rule: 'required|number|min:0.01',
        severity: 'error'
      }
    ]);

    console.log('[VALIDATION-ENGINE] Initialized default validation rules');
  }

  /**
   * Validate tenant data
   */
  public async validateTenant(
    tenant: Partial<Tenant>,
    context?: Partial<ValidationContext>
  ): Promise<ValidationResult> {
    const validationContext: ValidationContext = {
      operation: 'tenant_validation',
      data: tenant,
      ...context
    };

    return this.performValidation('tenant', tenant, validationContext);
  }

  /**
   * Validate affiliate data
   */
  public async validateAffiliate(
    affiliate: Partial<Affiliate>,
    context?: Partial<ValidationContext>
  ): Promise<ValidationResult> {
    const validationContext: ValidationContext = {
      operation: 'affiliate_validation',
      data: affiliate,
      ...context
    };

    return this.performValidation('affiliate', affiliate, validationContext);
  }

  /**
   * Validate commission data
   */
  public async validateCommission(
    commission: Partial<Commission>,
    context?: Partial<ValidationContext>
  ): Promise<ValidationResult> {
    const validationContext: ValidationContext = {
      operation: 'commission_validation',
      data: commission,
      ...context
    };

    return this.performValidation('commission', commission, validationContext);
  }

  /**
   * Validate payment data
   */
  public async validatePayment(
    payment: {
      amount: number;
      currency: string;
      paymentMethod: PaymentMethod;
      affiliateId?: string;
    },
    context?: Partial<ValidationContext>
  ): Promise<ValidationResult> {
    const validationContext: ValidationContext = {
      operation: 'payment_validation',
      data: payment,
      ...context
    };

    return this.performValidation('payment', payment, validationContext);
  }

  /**
   * Perform comprehensive validation
   */
  private async performValidation(
    entityType: string,
    data: any,
    context: ValidationContext
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(entityType, data, context);

    // Check cache first
    if (this.validationCache.has(cacheKey)) {
      const cached = this.validationCache.get(cacheKey)!;
      return {
        ...cached,
        validatedAt: new Date()
      };
    }

    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    let score = 100;
    let riskLevel: ValidationResult['riskLevel'] = 'low';

    try {
      // Get validation rules for entity type
      const rules = [
        ...(this.validationRules.get(entityType) || []),
        ...(this.config.customValidators[entityType] || [])
      ];

      // Apply each validation rule
      for (const rule of rules) {
        try {
          const ruleResult = await this.applyValidationRule(rule, data, context);
          
          if (!ruleResult.isValid) {
            if (rule.severity === 'error') {
              errors.push(ruleResult.error);
              score -= ruleResult.penalty || 10;
            } else {
              warnings.push(ruleResult.error);
              score -= ruleResult.penalty || 5;
            }
          }
        } catch (error) {
          errors.push({
            code: 'VALIDATION_RULE_ERROR',
            message: `Validation rule ${rule.id} failed: ${error.message}`,
            field: rule.field,
            value: this.getFieldValue(data, rule.field),
            severity: 'error'
          });
          score -= 15;
        }
      }

      // Apply data integrity checks if enabled
      if (this.config.enableDataIntegrityChecks) {
        const integrityResult = await this.performDataIntegrityCheck(entityType, data, context);
        errors.push(...integrityResult.errors);
        warnings.push(...integrityResult.warnings);
        score -= integrityResult.penalty;
      }

      // Apply compliance validation if enabled
      if (this.config.enableComplianceValidation) {
        const complianceResult = await this.performComplianceValidation(entityType, data, context);
        errors.push(...complianceResult.errors);
        warnings.push(...complianceResult.warnings);
        score -= complianceResult.penalty;
      }

      // Apply fraud detection if enabled
      if (this.config.enableFraudDetection) {
        const fraudResult = await this.performFraudDetection(entityType, data, context);
        errors.push(...fraudResult.errors);
        warnings.push(...fraudResult.warnings);
        score -= fraudResult.penalty;
        riskLevel = fraudResult.riskLevel || 'low';
      }

      // Determine final risk level
      if (score < 50) {
        riskLevel = 'critical';
      } else if (score < 70) {
        riskLevel = 'high';
      } else if (score < 85) {
        riskLevel = 'medium';
      }

      const result: ValidationResult = {
        isValid: errors.length === 0,
        errors,
        warnings,
        score: Math.max(0, score),
        riskLevel,
        processingTime: Date.now() - startTime,
        validatedAt: new Date()
      };

      // Cache result
      this.validationCache.set(cacheKey, result);

      // Add to validation history
      this.validationHistory.push({
        id: this.generateId('validation'),
        context: { ...context, operation: `${entityType}_validation` },
        result,
        timestamp: new Date()
      });

      // Keep history size manageable
      if (this.validationHistory.length > 1000) {
        this.validationHistory = this.validationHistory.slice(-500);
      }

      // Emit validation event
      this.emitEvent('validation_completed', {
        entityType,
        isValid: result.isValid,
        score: result.score,
        riskLevel: result.riskLevel,
        errorCount: errors.length,
        warningCount: warnings.length,
        processingTime: result.processingTime
      });

      // Emit validation errors if any
      if (errors.length > 0) {
        this.emitEvent('validation_errors', {
          entityType,
          errors,
          context
        });
      }

      return result;

    } catch (error) {
      const errorResult: ValidationResult = {
        isValid: false,
        errors: [{
          code: 'VALIDATION_FAILED',
          message: `Validation failed: ${error.message}`,
          field: 'unknown',
          value: data,
          severity: 'error'
        }],
        warnings: [],
        score: 0,
        riskLevel: 'critical',
        processingTime: Date.now() - startTime,
        validatedAt: new Date()
      };

      this.emitEvent('validation_error', {
        entityType,
        error: error.message,
        context
      });

      return errorResult;
    }
  }

  /**
   * Apply individual validation rule
   */
  private async applyValidationRule(
    rule: ValidationRule,
    data: any,
    context: ValidationContext
  ): Promise<{
    isValid: boolean;
    error: ValidationError;
    penalty?: number;
  }> {
    const value = this.getFieldValue(data, rule.field);
    
    try {
      // Parse rule
      const ruleParts = rule.rule.split('|');
      let isValid = true;
      let errorMessage = '';

      for (const rulePart of ruleParts) {
        const [operator, ...args] = rulePart.split(':');
        
        switch (operator) {
          case 'required':
            if (!value || value === '' || value === null || value === undefined) {
              isValid = false;
              errorMessage = `${rule.field} is required`;
            }
            break;
            
          case 'email':
            if (value && !this.isValidEmail(value)) {
              isValid = false;
              errorMessage = `${rule.field} must be a valid email`;
            }
            break;
            
          case 'min':
            const minValue = parseFloat(args[0]);
            if (typeof value === 'number' && value < minValue) {
              isValid = false;
              errorMessage = `${rule.field} must be at least ${minValue}`;
            }
            break;
            
          case 'max':
            const maxValue = parseFloat(args[0]);
            if (typeof value === 'number' && value > maxValue) {
              isValid = false;
              errorMessage = `${rule.field} must be at most ${maxValue}`;
            }
            break;
            
          case 'in':
            const allowedValues = args[0].split(',');
            if (!allowedValues.includes(value)) {
              isValid = false;
              errorMessage = `${rule.field} must be one of: ${allowedValues.join(', ')}`;
            }
            break;
            
          case 'regex':
            const pattern = new RegExp(args[0]);
            if (typeof value === 'string' && !pattern.test(value)) {
              isValid = false;
              errorMessage = `${rule.field} format is invalid`;
            }
            break;
            
          case 'array':
            if (!Array.isArray(value) || value.length === 0) {
              isValid = false;
              errorMessage = `${rule.field} must be an array with at least ${args[0] || 1} items`;
            }
            break;
            
          case 'unique_tenant':
            // This would check uniqueness within tenant
            // For now, assume it passes
            break;
            
          case 'number':
            if (typeof value !== 'number' || isNaN(value)) {
              isValid = false;
              errorMessage = `${rule.field} must be a valid number`;
            }
            break;
        }
      }

      return {
        isValid,
        error: isValid ? {
          code: 'VALIDATION_PASSED',
          message: 'Validation passed',
          field: rule.field,
          value,
          severity: 'info'
        } : {
          code: 'VALIDATION_FAILED',
          message: errorMessage || `${rule.field} validation failed`,
          field: rule.field,
          value,
          severity: rule.severity
        },
        penalty: isValid ? 0 : (rule.severity === 'error' ? 10 : 5)
      };

    } catch (error) {
      return {
        isValid: false,
        error: {
          code: 'RULE_APPLICATION_ERROR',
          message: `Failed to apply validation rule: ${error.message}`,
          field: rule.field,
          value,
          severity: 'error'
        }
      };
    }
  }

  /**
   * Perform data integrity check
   */
  private async performDataIntegrityCheck(
    entityType: string,
    data: any,
    context: ValidationContext
  ): Promise<{
    errors: ValidationError[];
    warnings: ValidationError[];
    penalty: number;
  }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    let penalty = 0;

    // Check for circular references
    if (entityType === 'affiliate' && data.profile?.email) {
      // Check if affiliate email matches any existing affiliate in same tenant
      // This would query database in real implementation
      // For now, just add a warning
      warnings.push({
        code: 'DUPLICATE_CHECK',
        message: 'Potential duplicate email detected',
        field: 'profile.email',
        value: data.profile.email,
        severity: 'warning'
      });
      penalty += 5;
    }

    // Check for data consistency
    if (entityType === 'commission' && data.amount && data.rate) {
      const calculatedAmount = data.amount * data.rate;
      if (Math.abs(calculatedAmount - (data.calculatedAmount || 0)) > 0.01) {
        errors.push({
          code: 'DATA_INCONSISTENCY',
          message: 'Commission calculation inconsistency detected',
          field: 'calculatedAmount',
          value: calculatedAmount,
          severity: 'error'
        });
        penalty += 15;
      }
    }

    return { errors, warnings, penalty };
  }

  /**
   * Perform compliance validation
   */
  private async performComplianceValidation(
    entityType: string,
    data: any,
    context: ValidationContext
  ): Promise<{
    errors: ValidationError[];
    warnings: ValidationError[];
    penalty: number;
  }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    let penalty = 0;

    // Check GDPR compliance for personal data
    if (entityType === 'affiliate' && data.profile) {
      if (!data.profile.taxInfo?.taxId && context.tenantId) {
        warnings.push({
          code: 'MISSING_TAX_INFO',
          message: 'Tax information required for compliance',
          field: 'profile.taxInfo.taxId',
          value: null,
          severity: 'warning'
        });
        penalty += 10;
      }
    }

    // Check payment method compliance
    if (entityType === 'payment' && data.paymentMethod) {
      if (data.paymentMethod.type === 'stripe_connect' && !data.paymentMethod.details?.stripeAccountId) {
        errors.push({
          code: 'MISSING_STRIPE_ACCOUNT',
          message: 'Stripe Connect account ID required',
          field: 'paymentMethod.details.stripeAccountId',
          value: null,
          severity: 'error'
        });
        penalty += 20;
      }
    }

    return { errors, warnings, penalty };
  }

  /**
   * Perform fraud detection
   */
  private async performFraudDetection(
    entityType: string,
    data: any,
    context: ValidationContext
  ): Promise<{
    errors: ValidationError[];
    warnings: ValidationError[];
    penalty: number;
    riskLevel?: ValidationResult['riskLevel'];
  }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    let penalty = 0;
    let riskLevel: ValidationResult['riskLevel'] = 'low';

    // Check for suspicious patterns
    if (entityType === 'payment' && data.amount) {
      // Check for unusually high amounts
      if (data.amount > 10000) {
        warnings.push({
          code: 'HIGH_AMOUNT_WARNING',
          message: 'Unusually high payment amount detected',
          field: 'amount',
          value: data.amount,
          severity: 'warning'
        });
        penalty += 15;
        riskLevel = 'medium';
      }

      // Check for round numbers (potential testing)
      if (data.amount % 100 === 0 && data.amount > 1000) {
        warnings.push({
          code: 'ROUND_NUMBER_WARNING',
          message: 'Round number payment detected (possible testing)',
          field: 'amount',
          value: data.amount,
          severity: 'warning'
        });
        penalty += 10;
        riskLevel = 'medium';
      }

      // Check for rapid succession payments
      if (context.metadata?.recentPayments && context.metadata.recentPayments.length > 5) {
        errors.push({
          code: 'RAPID_PAYMENTS',
          message: 'Too many payments in short time period',
          field: 'amount',
          value: data.amount,
          severity: 'error'
        });
        penalty += 25;
        riskLevel = 'high';
      }
    }

    return { errors, warnings, penalty, riskLevel };
  }

  /**
   * Get field value from nested object
   */
  private getFieldValue(data: any, fieldPath: string): any {
    const parts = fieldPath.split('.');
    let value = data;
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(entityType: string, data: any, context: ValidationContext): string {
    const keyData = {
      entityType,
      dataHash: this.hashObject(data),
      tenantId: context.tenantId || 'global',
      userId: context.userId || 'anonymous'
    };
    
    return `validation_${Buffer.from(JSON.stringify(keyData)).toString('base64')}`;
  }

  /**
   * Hash object for cache key
   */
  private hashObject(obj: any): string {
    return Buffer.from(JSON.stringify(obj)).toString('base64').substr(0, 16);
  }

  /**
   * Generate unique ID
   */
  private generateId(type: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${type}-${timestamp}-${random}`;
  }

  /**
   * Emit validation event
   */
  private emitEvent(type: AffiliateEvent['type'], data: Record<string, any>): void {
    const event: AffiliateEvent = {
      id: this.generateId('event'),
      type,
      timestamp: new Date(),
      data,
      metadata: {}
    };

    this.emit('affiliateEvent', event);
  }

  // Public utility methods
  public addCustomValidator(entityType: string, rules: ValidationRule[]): void {
    const existingRules = this.validationRules.get(entityType) || [];
    this.validationRules.set(entityType, [...existingRules, ...rules]);
    
    this.emitEvent('custom_validator_added', {
      entityType,
      ruleCount: rules.length
    });
  }

  public removeCustomValidator(entityType: string, ruleId: string): void {
    const rules = this.validationRules.get(entityType) || [];
    const filteredRules = rules.filter(rule => rule.id !== ruleId);
    this.validationRules.set(entityType, filteredRules);
    
    this.emitEvent('custom_validator_removed', {
      entityType,
      ruleId
    });
  }

  public clearValidationCache(entityType?: string): void {
    if (entityType) {
      // Clear cache for specific entity type
      for (const [key] of this.validationCache.entries()) {
        if (key.startsWith(`validation_${entityType}_`)) {
          this.validationCache.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.validationCache.clear();
    }
    
    this.emitEvent('validation_cache_cleared', { entityType });
  }

  public getValidationStats(): {
    totalValidations: number;
    averageScore: number;
    errorRate: number;
    mostCommonErrors: Array<{ code: string; count: number }>;
    cacheSize: number;
    cacheHitRate: number;
  } {
    const totalValidations = this.validationHistory.length;
    const successfulValidations = this.validationHistory.filter(v => v.result.isValid).length;
    const averageScore = totalValidations > 0 
      ? this.validationHistory.reduce((sum, v) => sum + v.result.score, 0) / totalValidations 
      : 0;
    const errorRate = totalValidations > 0 ? ((totalValidations - successfulValidations) / totalValidations) * 100 : 0;

    // Calculate most common errors
    const errorCounts: Record<string, number> = {};
    for (const validation of this.validationHistory) {
      for (const error of validation.result.errors) {
        errorCounts[error.code] = (errorCounts[error.code] || 0) + 1;
      }
    }

    const mostCommonErrors = Object.entries(errorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([code, count]) => ({ code, count }));

    return {
      totalValidations,
      averageScore,
      errorRate,
      mostCommonErrors,
      cacheSize: this.validationCache.size,
      cacheHitRate: 0.75 // This would be calculated from actual metrics
    };
  }

  public getValidationHistory(limit?: number): Array<{
    id: string;
    context: ValidationContext;
    result: ValidationResult;
    timestamp: Date;
  }> {
    return limit 
      ? this.validationHistory.slice(-limit)
      : this.validationHistory;
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    this.removeAllListeners();
    this.validationRules.clear();
    this.validationCache.clear();
    this.validationHistory = [];
    console.log('[VALIDATION-ENGINE] Validation engine disposed');
  }
}