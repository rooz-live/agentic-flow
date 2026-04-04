/**
 * Context Leakage Preventer
 * 
 * Prevents context leakage between tenants through policy-based isolation,
 * response sanitization, and anomaly detection integration.
 * 
 * @module tenant-isolation/leakage-preventer
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import {
  IsolationPolicy,
  IsolationRule,
  TenantContext,
  LeakageDetectionResult,
  LeakageViolation,
  ViolationSeverity,
  AuditLogEntry,
  AuditQueryParams,
  AccessPattern,
  DEFAULT_ISOLATION_POLICY
} from './types.js';

/**
 * SonaAnomalyDetector interface for integration
 * (Matches the interface from ruvector/sona-anomaly-detector.ts)
 */
interface AnomalyDetectorInterface {
  detectAnomaly(point: {
    cpu: number;
    memory: number;
    hitRate: number;
    latency: number;
    timestamp: number;
    custom?: Record<string, number>;
  }): {
    isAnomaly: boolean;
    score: number;
    confidence: number;
    contributingFeatures: string[];
  };
  addDataPoint(point: any): void;
}

/**
 * ContextLeakagePreventer provides policy-based isolation,
 * response sanitization, and anomaly detection for tenant isolation.
 */
export class ContextLeakagePreventer extends EventEmitter {
  /** Registered isolation policies */
  private policies: Map<string, IsolationPolicy>;
  /** Audit log entries */
  private auditLog: AuditLogEntry[];
  /** Maximum audit log size */
  private maxAuditLogSize: number;
  /** Anomaly detector reference */
  private anomalyDetector?: AnomalyDetectorInterface;
  /** Access pattern history per tenant */
  private accessPatternHistory: Map<string, AccessPattern[]>;
  /** Maximum access pattern history per tenant */
  private maxAccessPatternHistory: number;
  /** Violation counters per tenant */
  private violationCounts: Map<string, Map<string, number>>;

  constructor(maxAuditLogSize: number = 10000, maxAccessPatternHistory: number = 1000) {
    super();
    this.policies = new Map();
    this.auditLog = [];
    this.maxAuditLogSize = maxAuditLogSize;
    this.accessPatternHistory = new Map();
    this.maxAccessPatternHistory = maxAccessPatternHistory;
    this.violationCounts = new Map();

    // Register default policy
    this.registerPolicy(DEFAULT_ISOLATION_POLICY);
  }

  // ============================================================================
  // Policy Management
  // ============================================================================

  /**
   * Register an isolation policy
   * @param policy - Policy to register
   */
  registerPolicy(policy: IsolationPolicy): void {
    this.policies.set(policy.name, policy);
    this.emit('policyRegistered', policy);
  }

  /**
   * Get a policy by name
   * @param name - Policy name
   * @returns Policy or null
   */
  getPolicy(name: string): IsolationPolicy | null {
    return this.policies.get(name) ?? null;
  }

  /**
   * Update an existing policy
   * @param name - Policy name
   * @param updates - Partial updates to apply
   */
  updatePolicy(name: string, updates: Partial<IsolationPolicy>): void {
    const policy = this.policies.get(name);
    if (!policy) {
      throw new Error(`Policy ${name} not found`);
    }

    // Prevent changing policy name through update
    const { name: _name, ...allowedUpdates } = updates;
    Object.assign(policy, allowedUpdates);

    this.emit('policyUpdated', policy);
  }

  /**
   * Delete a policy
   * @param name - Policy name
   */
  deletePolicy(name: string): void {
    if (name === 'default') {
      throw new Error('Cannot delete default policy');
    }

    const policy = this.policies.get(name);
    if (policy) {
      this.policies.delete(name);
      this.emit('policyDeleted', { name, policy });
    }
  }

  /**
   * Get all registered policies
   */
  getAllPolicies(): IsolationPolicy[] {
    return Array.from(this.policies.values());
  }

  // ============================================================================
  // Request Isolation
  // ============================================================================

  /**
   * Isolate a request by applying policies
   * @param request - Incoming request data
   * @param context - Tenant context
   * @returns Isolated request
   */
  isolateRequest(request: any, context: TenantContext): any {
    // Clone request to avoid mutating original
    const isolated = this.deepClone(request);

    // Apply all applicable policies
    for (const policy of this.policies.values()) {
      for (const rule of policy.rules) {
        this.applyRuleToRequest(isolated, rule, context);
      }
    }

    // Track access pattern
    this.trackAccessPattern({
      tenantId: context.tenantId,
      userId: context.userId,
      resource: this.extractResource(request),
      accessType: this.inferAccessType(request),
      timestamp: new Date(),
      frequency: 1
    });

    return isolated;
  }

  // ============================================================================
  // Response Sanitization
  // ============================================================================

  /**
   * Sanitize a response by removing potential tenant data leakage
   * @param response - Response data
   * @param context - Tenant context
   * @returns Sanitized response
   */
  sanitizeResponse(response: any, context: TenantContext): any {
    if (response === null || response === undefined) {
      return response;
    }

    // Clone response to avoid mutating original
    const sanitized = this.deepClone(response);

    // Apply all applicable policies
    for (const policy of this.policies.values()) {
      for (const rule of policy.rules) {
        this.applyRuleToResponse(sanitized, rule, context, policy.enforcementLevel);
      }
    }

    return sanitized;
  }

  // ============================================================================
  // Leakage Detection
  // ============================================================================

  /**
   * Detect potential data leakage in data
   * @param data - Data to check
   * @param context - Tenant context
   * @returns Leakage detection result
   */
  detectLeakage(data: any, context: TenantContext): LeakageDetectionResult {
    const violations: LeakageViolation[] = [];
    let sanitizedResponse = this.deepClone(data);

    // Check all policies
    for (const policy of this.policies.values()) {
      for (const rule of policy.rules) {
        const ruleViolations = this.checkRuleViolation(data, rule, context);
        
        for (const violation of ruleViolations) {
          violations.push(violation);
          
          // Apply remediation based on enforcement level
          if (policy.enforcementLevel === 'strict') {
            sanitizedResponse = this.applyRemediation(sanitizedResponse, violation);
          }
        }
      }
    }

    // Log violations
    for (const violation of violations) {
      this.logViolation(violation);
    }

    return {
      detected: violations.length > 0,
      violations,
      sanitizedResponse: violations.length > 0 ? sanitizedResponse : undefined
    };
  }

  // ============================================================================
  // Field-Level Operations
  // ============================================================================

  /**
   * Redact a field in data
   * @param data - Data object
   * @param path - Field path (dot notation)
   * @param maskPattern - Pattern to replace with
   * @returns Modified data
   */
  redactField(data: any, path: string, maskPattern: string = '****'): any {
    if (data === null || data === undefined) {
      return data;
    }

    const result = this.deepClone(data);
    this.setFieldValue(result, path, maskPattern);
    return result;
  }

  /**
   * Filter entities based on tenant context
   * @param entities - Array of entities
   * @param context - Tenant context
   * @returns Filtered entities
   */
  filterEntities(entities: any[], context: TenantContext): any[] {
    return entities.filter(entity => {
      // Check if entity belongs to tenant
      if (entity.tenantId && entity.tenantId !== context.tenantId) {
        // Check if cross-tenant access is allowed
        if (!context.permissions.includes('cross-tenant:read') &&
            !context.permissions.includes(`tenant:${entity.tenantId}:read`)) {
          return false;
        }
      }
      return true;
    });
  }

  // ============================================================================
  // Audit
  // ============================================================================

  /**
   * Log a violation to the audit log
   * @param violation - Violation to log
   */
  logViolation(violation: LeakageViolation): void {
    const entry: AuditLogEntry = {
      id: this.generateAuditId(),
      timestamp: violation.timestamp,
      tenantId: violation.tenantId,
      eventType: 'leakage_violation',
      action: violation.rule.action,
      resource: violation.path,
      details: {
        rule: violation.rule,
        severity: violation.severity
      },
      severity: violation.severity
    };

    this.addAuditEntry(entry);

    // Update violation counts
    this.incrementViolationCount(violation.tenantId, violation.rule.type);

    this.emit('violationLogged', violation);
  }

  /**
   * Get audit log entries with filtering
   * @param params - Query parameters
   * @returns Filtered audit log entries
   */
  getAuditLog(params: AuditQueryParams): AuditLogEntry[] {
    let filtered = [...this.auditLog];

    if (params.startDate) {
      filtered = filtered.filter(e => e.timestamp >= params.startDate!);
    }

    if (params.endDate) {
      filtered = filtered.filter(e => e.timestamp <= params.endDate!);
    }

    if (params.tenantId) {
      filtered = filtered.filter(e => e.tenantId === params.tenantId);
    }

    if (params.userId) {
      filtered = filtered.filter(e => e.userId === params.userId);
    }

    if (params.eventType) {
      filtered = filtered.filter(e => e.eventType === params.eventType);
    }

    if (params.severity) {
      filtered = filtered.filter(e => e.severity === params.severity);
    }

    // Apply pagination
    const offset = params.offset ?? 0;
    const limit = params.limit ?? 100;

    return filtered.slice(offset, offset + limit);
  }

  /**
   * Get violation statistics
   * @param tenantId - Optional tenant ID filter
   * @returns Violation statistics
   */
  getViolationStats(tenantId?: string): {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  } {
    const entries = tenantId
      ? this.auditLog.filter(e => e.tenantId === tenantId && e.eventType === 'leakage_violation')
      : this.auditLog.filter(e => e.eventType === 'leakage_violation');

    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    for (const entry of entries) {
      const ruleType = (entry.details?.rule as IsolationRule)?.type;
      if (ruleType) {
        byType[ruleType] = (byType[ruleType] ?? 0) + 1;
      }
      bySeverity[entry.severity] = (bySeverity[entry.severity] ?? 0) + 1;
    }

    return {
      total: entries.length,
      byType,
      bySeverity
    };
  }

  // ============================================================================
  // Anomaly Detection Integration
  // ============================================================================

  /**
   * Integrate with SonaAnomalyDetector for anomaly detection
   * @param detector - Anomaly detector instance
   */
  integrateWithAnomalyDetector(detector: AnomalyDetectorInterface): void {
    this.anomalyDetector = detector;
    this.emit('anomalyDetectorIntegrated');
  }

  /**
   * Detect anomalous access patterns
   * @param context - Tenant context
   * @param accessPattern - Current access pattern
   * @returns True if access is anomalous
   */
  detectAnomalousAccess(context: TenantContext, accessPattern: AccessPattern): boolean {
    if (!this.anomalyDetector) {
      return false;
    }

    // Track the access pattern
    this.trackAccessPattern(accessPattern);

    // Get historical patterns for comparison
    const history = this.getAccessPatternHistory(context.tenantId);
    
    // Calculate metrics for anomaly detection
    const metrics = this.calculateAccessMetrics(history, accessPattern);

    // Use anomaly detector
    const result = this.anomalyDetector.detectAnomaly({
      cpu: 0, // Not applicable for access patterns
      memory: 0,
      hitRate: metrics.similarityScore,
      latency: metrics.timeSinceLastAccess,
      timestamp: Date.now(),
      custom: {
        accessFrequency: metrics.accessFrequency,
        uniqueResources: metrics.uniqueResourceCount,
        unusualTime: metrics.unusualTimeScore
      }
    });

    if (result.isAnomaly) {
      this.emit('anomalousAccessDetected', {
        context,
        accessPattern,
        anomalyResult: result
      });

      // Log as audit entry
      this.addAuditEntry({
        id: this.generateAuditId(),
        timestamp: new Date(),
        tenantId: context.tenantId,
        userId: context.userId,
        eventType: 'anomalous_access',
        action: 'detected',
        resource: accessPattern.resource,
        details: {
          accessPattern,
          anomalyScore: result.score,
          confidence: result.confidence,
          contributingFeatures: result.contributingFeatures
        },
        severity: result.score > 0.8 ? 'critical' : result.score > 0.6 ? 'high' : 'medium',
        sourceIp: context.sourceIp,
        requestId: context.requestId
      });
    }

    return result.isAnomaly;
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Apply rule to request
   */
  private applyRuleToRequest(request: any, rule: IsolationRule, context: TenantContext): void {
    if (rule.type !== 'field_redaction' && rule.type !== 'response_sanitize') {
      return;
    }

    // Check condition
    if (!this.evaluateCondition(rule.condition, context, request)) {
      return;
    }

    // Apply action
    switch (rule.action) {
      case 'redact':
        this.applyRedaction(request, rule.target, rule.maskPattern ?? '****');
        break;
      case 'mask':
        this.applyMask(request, rule.target, rule.maskPattern ?? '****');
        break;
    }
  }

  /**
   * Apply rule to response
   */
  private applyRuleToResponse(
    response: any,
    rule: IsolationRule,
    context: TenantContext,
    enforcementLevel: IsolationPolicy['enforcementLevel']
  ): void {
    // Check condition
    if (!this.evaluateCondition(rule.condition, context, response)) {
      return;
    }

    // Apply action based on enforcement level
    if (enforcementLevel === 'audit') {
      // Only log, don't modify
      this.addAuditEntry({
        id: this.generateAuditId(),
        timestamp: new Date(),
        tenantId: context.tenantId,
        userId: context.userId,
        eventType: 'rule_matched',
        action: rule.action,
        resource: rule.target,
        details: { rule },
        severity: 'low'
      });
      return;
    }

    switch (rule.action) {
      case 'redact':
        this.applyRedaction(response, rule.target, rule.maskPattern ?? '****');
        break;
      case 'filter':
        if (Array.isArray(response)) {
          const filtered = this.filterEntities(response, context);
          response.length = 0;
          response.push(...filtered);
        }
        break;
      case 'mask':
        this.applyMask(response, rule.target, rule.maskPattern ?? '****');
        break;
      case 'log':
        this.addAuditEntry({
          id: this.generateAuditId(),
          timestamp: new Date(),
          tenantId: context.tenantId,
          userId: context.userId,
          eventType: 'access_logged',
          action: 'log',
          resource: rule.target,
          details: { rule },
          severity: 'low'
        });
        break;
    }
  }

  /**
   * Check if rule is violated
   */
  private checkRuleViolation(
    data: any,
    rule: IsolationRule,
    context: TenantContext
  ): LeakageViolation[] {
    const violations: LeakageViolation[] = [];

    // Check based on rule type
    switch (rule.type) {
      case 'entity_filter':
        if (Array.isArray(data)) {
          for (const item of data) {
            if (item.tenantId && item.tenantId !== context.tenantId) {
              violations.push({
                rule,
                path: rule.target,
                tenantId: item.tenantId,
                severity: this.determineSeverity(rule),
                timestamp: new Date()
              });
            }
          }
        } else if (data?.tenantId && data.tenantId !== context.tenantId) {
          violations.push({
            rule,
            path: rule.target,
            tenantId: data.tenantId,
            severity: this.determineSeverity(rule),
            timestamp: new Date()
          });
        }
        break;

      case 'field_redaction':
        const fieldValue = this.getFieldValue(data, rule.target);
        if (fieldValue !== undefined && rule.condition !== 'always') {
          // Field exists that should have been redacted
          violations.push({
            rule,
            path: rule.target,
            tenantId: context.tenantId,
            severity: this.determineSeverity(rule),
            timestamp: new Date()
          });
        }
        break;
    }

    return violations;
  }

  /**
   * Apply remediation to sanitized response
   */
  private applyRemediation(data: any, violation: LeakageViolation): any {
    switch (violation.rule.action) {
      case 'redact':
        return this.redactField(data, violation.path, violation.rule.maskPattern);
      case 'filter':
        if (Array.isArray(data)) {
          return data.filter(item => item.tenantId === violation.tenantId || !item.tenantId);
        }
        return data;
      case 'mask':
        return this.redactField(data, violation.path, violation.rule.maskPattern);
      default:
        return data;
    }
  }

  /**
   * Evaluate a condition expression
   */
  private evaluateCondition(condition: string, context: TenantContext, data: any): boolean {
    if (condition === 'always') {
      return true;
    }

    // Simple expression evaluation (in production, use a proper expression parser)
    try {
      // Replace context and data references
      let expr = condition
        .replace(/context\.tenantId/g, `"${context.tenantId}"`)
        .replace(/context\.userId/g, `"${context.userId}"`)
        .replace(/tenantId/g, data?.tenantId ? `"${data.tenantId}"` : 'undefined')
        .replace(/accessType/g, `"${this.inferAccessType(data)}"`);

      // eslint-disable-next-line no-eval
      return eval(expr);
    } catch {
      return false;
    }
  }

  /**
   * Apply redaction to target field
   */
  private applyRedaction(data: any, target: string, mask: string): void {
    // Handle wildcard patterns
    if (target.includes('*')) {
      this.applyWildcardRedaction(data, target, mask);
    } else {
      this.setFieldValue(data, target, mask);
    }
  }

  /**
   * Apply wildcard redaction pattern
   */
  private applyWildcardRedaction(data: any, pattern: string, mask: string): void {
    const parts = pattern.split('.');
    this.recursiveRedact(data, parts, 0, mask);
  }

  /**
   * Recursively redact matching fields
   */
  private recursiveRedact(obj: any, parts: string[], index: number, mask: string): void {
    if (obj === null || obj === undefined || typeof obj !== 'object') {
      return;
    }

    if (index >= parts.length) {
      return;
    }

    const part = parts[index];

    if (part === '*') {
      // Apply to all keys at this level
      for (const key of Object.keys(obj)) {
        if (index === parts.length - 1) {
          // Last part - this is the field to redact
          // (only if next part matches)
        } else {
          this.recursiveRedact(obj[key], parts, index + 1, mask);
        }
      }
    } else {
      if (index === parts.length - 1) {
        // This is the field to redact
        if (obj[part] !== undefined) {
          obj[part] = mask;
        }
      } else {
        if (obj[part] !== undefined) {
          this.recursiveRedact(obj[part], parts, index + 1, mask);
        }
      }
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      for (const item of obj) {
        this.recursiveRedact(item, parts, index, mask);
      }
    }
  }

  /**
   * Apply mask to target field
   */
  private applyMask(data: any, target: string, mask: string): void {
    const value = this.getFieldValue(data, target);
    if (typeof value === 'string' && value.length > 0) {
      // Keep first and last character, mask middle
      const maskedValue = value.length > 2
        ? value[0] + mask.repeat(Math.min(value.length - 2, mask.length)) + value[value.length - 1]
        : mask;
      this.setFieldValue(data, target, maskedValue);
    }
  }

  /**
   * Get field value by path
   */
  private getFieldValue(data: any, path: string): any {
    const parts = path.split('.');
    let current = data;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      if (part === '*') {
        // Return array of all values at this level
        if (typeof current === 'object') {
          return Object.values(current);
        }
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * Set field value by path
   */
  private setFieldValue(data: any, path: string, value: any): void {
    const parts = path.split('.');
    let current = data;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (part === '*') {
        // Apply to all keys
        if (typeof current === 'object') {
          for (const key of Object.keys(current)) {
            this.setFieldValue(current[key], parts.slice(i + 1).join('.'), value);
          }
        }
        return;
      }
      if (current[part] === undefined) {
        return;
      }
      current = current[part];
    }

    const lastPart = parts[parts.length - 1];
    if (current !== null && current !== undefined && typeof current === 'object') {
      current[lastPart] = value;
    }
  }

  /**
   * Deep clone an object
   */
  private deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch {
      // Fallback for objects that can't be serialized
      return obj;
    }
  }

  /**
   * Determine severity based on rule
   */
  private determineSeverity(rule: IsolationRule): ViolationSeverity {
    switch (rule.type) {
      case 'entity_filter':
        return 'high';
      case 'field_redaction':
        return rule.target.includes('password') || rule.target.includes('secret')
          ? 'critical'
          : 'medium';
      case 'response_sanitize':
        return 'medium';
      case 'audit_log':
        return 'low';
      default:
        return 'low';
    }
  }

  /**
   * Extract resource from request
   */
  private extractResource(request: any): string {
    return request?.path || request?.url || request?.resource || 'unknown';
  }

  /**
   * Infer access type from request
   */
  private inferAccessType(request: any): AccessPattern['accessType'] {
    const method = request?.method?.toUpperCase();
    switch (method) {
      case 'GET':
        return 'read';
      case 'POST':
      case 'PUT':
      case 'PATCH':
        return 'write';
      case 'DELETE':
        return 'delete';
      default:
        return 'read';
    }
  }

  /**
   * Track access pattern
   */
  private trackAccessPattern(pattern: AccessPattern): void {
    let history = this.accessPatternHistory.get(pattern.tenantId);
    if (!history) {
      history = [];
      this.accessPatternHistory.set(pattern.tenantId, history);
    }

    history.push(pattern);

    // Trim history if too large
    if (history.length > this.maxAccessPatternHistory) {
      history.shift();
    }
  }

  /**
   * Get access pattern history for tenant
   */
  private getAccessPatternHistory(tenantId: string): AccessPattern[] {
    return this.accessPatternHistory.get(tenantId) ?? [];
  }

  /**
   * Calculate access metrics for anomaly detection
   */
  private calculateAccessMetrics(history: AccessPattern[], current: AccessPattern): {
    accessFrequency: number;
    uniqueResourceCount: number;
    unusualTimeScore: number;
    similarityScore: number;
    timeSinceLastAccess: number;
  } {
    const now = Date.now();
    const oneHourAgo = now - 3600000;

    // Recent accesses
    const recentHistory = history.filter(p => p.timestamp.getTime() > oneHourAgo);
    const accessFrequency = recentHistory.length;

    // Unique resources
    const uniqueResources = new Set(recentHistory.map(p => p.resource));
    const uniqueResourceCount = uniqueResources.size;

    // Unusual time (e.g., outside business hours)
    const currentHour = new Date().getHours();
    const unusualTimeScore = (currentHour < 6 || currentHour > 22) ? 1 : 0;

    // Similarity to historical patterns
    const resourceSeen = recentHistory.some(p => p.resource === current.resource);
    const similarityScore = resourceSeen ? 1 : 0;

    // Time since last access
    const lastAccess = history.length > 0
      ? history[history.length - 1].timestamp.getTime()
      : now;
    const timeSinceLastAccess = now - lastAccess;

    return {
      accessFrequency,
      uniqueResourceCount,
      unusualTimeScore,
      similarityScore,
      timeSinceLastAccess
    };
  }

  /**
   * Add audit log entry
   */
  private addAuditEntry(entry: AuditLogEntry): void {
    this.auditLog.push(entry);

    // Trim if too large
    if (this.auditLog.length > this.maxAuditLogSize) {
      this.auditLog.shift();
    }

    this.emit('auditEntryAdded', entry);
  }

  /**
   * Generate audit ID
   */
  private generateAuditId(): string {
    return `audit-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * Increment violation count
   */
  private incrementViolationCount(tenantId: string, ruleType: string): void {
    let tenantCounts = this.violationCounts.get(tenantId);
    if (!tenantCounts) {
      tenantCounts = new Map();
      this.violationCounts.set(tenantId, tenantCounts);
    }

    const current = tenantCounts.get(ruleType) ?? 0;
    tenantCounts.set(ruleType, current + 1);
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Clear all audit log entries (for testing)
   */
  clearAuditLog(): void {
    this.auditLog = [];
  }

  /**
   * Clear access pattern history (for testing)
   */
  clearAccessPatternHistory(): void {
    this.accessPatternHistory.clear();
  }

  /**
   * Get anomaly detector status
   */
  hasAnomalyDetector(): boolean {
    return this.anomalyDetector !== undefined;
  }
}

/**
 * Factory function to create a ContextLeakagePreventer
 */
export function createLeakagePreventer(
  maxAuditLogSize?: number,
  maxAccessPatternHistory?: number
): ContextLeakagePreventer {
  return new ContextLeakagePreventer(maxAuditLogSize, maxAccessPatternHistory);
}
