/**
 * Enhanced Error Reporting System
 * Provides detailed error reporting with stack traces and context
 */

export interface ErrorContext {
  timestamp: string;
  errorType: string;
  errorMessage: string;
  stackTrace: string;
  component: string;
  iterationId?: string;
  circle?: string;
  mode?: string;
  userId?: string;
  sessionId: string;
  metadata: Record<string, any>;
}

export interface ErrorReport {
  errorId: string;
  context: ErrorContext;
  severity: 'critical' | 'high' | 'medium' | 'low';
  resolved: boolean;
  resolution?: string;
  resolvedAt?: string;
  assignedTo?: string;
  tags: string[];
  recoverySuggestion?: string;
}

export class EnhancedErrorReporting {
  private reports: Map<string, ErrorReport> = new Map();
  private maxReports = 1000; // Keep last 1000 reports

  /**
   * Capture an error with full context
   */
  captureError(error: Error, context: Partial<ErrorContext> = {}): string {
    const errorId = this.generateErrorId();
    
    const errorContext: ErrorContext = {
      timestamp: new Date().toISOString(),
      errorType: error.name || 'UnknownError',
      errorMessage: error.message || String(error),
      stackTrace: this.formatStackTrace(error.stack || ''),
      component: context.component || 'unknown',
      iterationId: context.iterationId,
      circle: context.circle,
      mode: context.mode,
      userId: context.userId || 'system',
      sessionId: context.sessionId || this.generateSessionId(),
      metadata: context.metadata || {},
    };

    const report: ErrorReport = {
      errorId,
      context: errorContext,
      severity: this.determineSeverity(error, context),
      resolved: false,
      tags: this.generateTags(error, context),
      recoverySuggestion: this.getRecoverySuggestion(error),
    };

    this.reports.set(errorId, report);
    
    // Keep only last maxReports
    if (this.reports.size > this.maxReports) {
      const oldestKey = this.reports.keys().next().value;
      if (oldestKey) {
        this.reports.delete(oldestKey);
      }
    }

    console.error(`[EnhancedErrorReporting] Captured error: ${errorId} (${errorContext.errorType})`);
    this.writeToEvidenceLog(report);
    
    return errorId;
  }

  /**
   * Resolve an error
   */
  resolveError(errorId: string, resolution: string, assignedTo?: string): void {
    const report = this.reports.get(errorId);
    if (!report) {
      console.warn(`[EnhancedErrorReporting] Error ${errorId} not found`);
      return;
    }

    report.resolved = true;
    report.resolution = resolution;
    report.resolvedAt = new Date().toISOString();
    if (assignedTo) {
      report.assignedTo = assignedTo;
    }

    console.log(`[EnhancedErrorReporting] Resolved error: ${errorId}`);
    this.writeToEvidenceLog(report);
  }

  /**
   * Get error report
   */
  getErrorReport(errorId: string): ErrorReport | undefined {
    return this.reports.get(errorId);
  }

  /**
   * Get all error reports
   */
  getAllReports(): ErrorReport[] {
    return Array.from(this.reports.values());
  }

  /**
   * Get reports by severity
   */
  getReportsBySeverity(severity: 'critical' | 'high' | 'medium' | 'low'): ErrorReport[] {
    return Array.from(this.reports.values()).filter(r => r.severity === severity);
  }

  /**
   * Get reports by component
   */
  getReportsByComponent(component: string): ErrorReport[] {
    return Array.from(this.reports.values()).filter(r => r.context.component === component);
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): {
    total: number;
    resolved: number;
    unresolved: number;
    bySeverity: Record<string, number>;
    byComponent: Record<string, number>;
    byType: Record<string, number>;
  } {
    const allReports = this.getAllReports();
    const total = allReports.length;
    const resolved = allReports.filter(r => r.resolved).length;
    const unresolved = total - resolved;

    const bySeverity: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    const byComponent: Record<string, number> = {};
    const byType: Record<string, number> = {};

    for (const report of allReports) {
      bySeverity[report.severity]++;
      byComponent[report.context.component] = (byComponent[report.context.component] || 0) + 1;
      byType[report.context.errorType] = (byType[report.context.errorType] || 0) + 1;
    }

    return { total, resolved, unresolved, bySeverity, byComponent, byType };
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `ERR_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `SES_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Determine error severity
   */
  private determineSeverity(error: Error, context: Partial<ErrorContext>): 'critical' | 'high' | 'medium' | 'low' {
    // Critical errors that stop execution
    if (error.name === 'TypeError' && error.message.includes('Cannot read')) {
      return 'critical';
    }
    
    // High severity errors
    if (error.name === 'ReferenceError' || error.name === 'NetworkError') {
      return 'high';
    }
    
    // Medium severity errors
    if (error.name === 'ValidationError' || error.name === 'TimeoutError') {
      return 'medium';
    }
    
    // Low severity errors
    return 'low';
  }

  /**
   * Format stack trace for readability
   */
  private formatStackTrace(stack: string): string {
    if (!stack) return '';
    
    return stack
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');
  }

  /**
   * Generate tags for error categorization
   */
  private generateTags(error: Error, context: Partial<ErrorContext>): string[] {
    const tags: string[] = [];
    
    // Add severity tag
    tags.push(`severity:${this.determineSeverity(error, context)}`);
    
    // Add component tag
    if (context.component) {
      tags.push(`component:${context.component}`);
    }
    
    // Add circle tag
    if (context.circle) {
      tags.push(`circle:${context.circle}`);
    }
    
    // Add mode tag
    if (context.mode) {
      tags.push(`mode:${context.mode}`);
    }
    
    // Add error type tag
    if (error.name) {
      tags.push(`error_type:${error.name}`);
    }
    
    return tags;
  }

  /**
   * Get recovery suggestion based on error type and context
   */
  getRecoverySuggestion(error: Error): string {
    const errorMessage = error.message.toLowerCase();
    const errorName = error.name.toLowerCase();

    // TypeScript compilation errors
    if (errorName === 'typescripterror' || errorMessage.includes('typescript compilation')) {
      return 'TypeScript Compilation Error: Check for type mismatches, missing imports, or syntax errors. Run `npm run build` for detailed compilation errors. Verify tsconfig.json configuration and ensure all dependencies are installed.';
    }

    // Pattern rationale issues
    if (errorMessage.includes('pattern rationale') || errorMessage.includes('pattern validation') || errorMessage.includes('pattern mismatch')) {
      return 'Pattern Rationale Issue: Review the pattern definition and ensure it matches the expected structure. Check pattern metrics logs in .goalie/pattern_metrics.jsonl. Validate pattern alignment with governance rules and re-run pattern validation.';
    }

    // MYM score calculation issues
    if (errorMessage.includes('mym score') || errorMessage.includes('meet-your-maker') || errorMessage.includes('score calculation')) {
      return 'MYM Score Calculation Issue: Verify the scoring parameters and input data. Check if the scoring model is properly initialized. Review evidence logs for scoring anomalies and ensure all required metrics are available.';
    }

    // QE fleet integration issues
    if (errorMessage.includes('qe fleet') || errorMessage.includes('quality evaluation') || errorMessage.includes('qe integration')) {
      return 'QE Fleet Integration Issue: Check QE fleet connectivity and status. Verify fleet configuration and ensure all QE agents are operational. Review QE gates integration logs and restart fleet services if necessary.';
    }

    // Skill persistence failures
    if (errorMessage.includes('skill persistence') || errorMessage.includes('skill save') || errorMessage.includes('skill storage')) {
      return 'Skill Persistence Failure: Check database connectivity and storage availability. Verify skill data integrity and retry the persistence operation. Review skills-manager logs for detailed failure information.';
    }

    // Stability score drops
    if (errorMessage.includes('stability score') || errorMessage.includes('stability drop') || errorMessage.includes('instability')) {
      return 'Stability Score Drop: Analyze recent changes and rollbacks. Check system metrics and resource utilization. Review governance decisions and consider reverting recent changes. Run health checks to identify contributing factors.';
    }

    // Network connectivity issues
    if (errorName === 'networkerror' || errorMessage.includes('network') || errorMessage.includes('connection') || errorMessage.includes('econnrefused') || errorMessage.includes('timeout')) {
      return 'Network Connectivity Issue: Check network connection and firewall settings. Verify endpoint availability and retry the operation. Consider implementing exponential backoff for retries. Check MCP protocol status and connection health.';
    }

    // Database connection issues
    if (errorMessage.includes('database') || errorMessage.includes('db connection') || errorMessage.includes('mongodb') || errorMessage.includes('postgres') || errorMessage.includes('sqlite')) {
      return 'Database Connection Issue: Verify database server is running and accessible. Check connection string and credentials. Ensure database has available connections. Review connection pool settings and consider increasing timeout values.';
    }

    // Type errors
    if (errorName === 'typeerror') {
      if (errorMessage.includes('cannot read') || errorMessage.includes('cannot access')) {
        return 'Type Error (Null/Undefined): Check for null or undefined values before accessing properties. Add proper null checks and optional chaining. Review object initialization and data flow.';
      }
      return 'Type Error: Verify data types and ensure proper type coercion. Check for type mismatches in function calls and property access.';
    }

    // Reference errors
    if (errorName === 'referenceerror') {
      return 'Reference Error: Verify all variables and functions are defined before use. Check for typos in variable names and ensure proper scoping. Review import statements and module exports.';
    }

    // Validation errors
    if (errorName === 'validationerror' || errorMessage.includes('validation')) {
      return 'Validation Error: Review input data against validation rules. Check for missing required fields or invalid formats. Verify data transformation logic and ensure data sanitization.';
    }

    // Timeout errors
    if (errorName === 'timeouterror' || errorMessage.includes('timeout')) {
      return 'Timeout Error: Increase timeout duration or optimize the operation. Check for resource constraints and system load. Review async operations and ensure proper error handling.';
    }

    // Generic fallback suggestion
    return 'Generic Error: Review the error message and stack trace for context. Check system logs for additional information. Verify recent changes and consider reverting if applicable. Contact support with the error ID for further assistance.';
  }

  /**
   * Write error to evidence log
   */
  private writeToEvidenceLog(report: ErrorReport): void {
    try {
      const fs = require('fs');
      const path = require('path');
      
      const evidenceDir = path.join(process.cwd(), '.goalie');
      const errorLogPath = path.join(evidenceDir, 'error_reports.jsonl');
      
      // Ensure directory exists
      if (!fs.existsSync(evidenceDir)) {
        fs.mkdirSync(evidenceDir, { recursive: true });
      }
      
      const logEntry = {
        timestamp: report.context.timestamp,
        event_type: 'error_report',
        data: {
          error_id: report.errorId,
          error_type: report.context.errorType,
          error_message: report.context.errorMessage,
          stack_trace: report.context.stackTrace,
          component: report.context.component,
          severity: report.severity,
          resolved: report.resolved,
          resolution: report.resolution,
          resolved_at: report.resolvedAt,
          assigned_to: report.assignedTo,
          tags: report.tags,
          recovery_suggestion: report.recoverySuggestion,
          metadata: report.context.metadata,
        },
      };
      
      fs.appendFileSync(errorLogPath, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      console.error('[EnhancedErrorReporting] Failed to write to evidence log:', error);
    }
  }
}

// Singleton instance
let errorReportingInstance: EnhancedErrorReporting | null;

export function getEnhancedErrorReporting(): EnhancedErrorReporting {
  if (!errorReportingInstance) {
    errorReportingInstance = new EnhancedErrorReporting();
  }
  return errorReportingInstance;
}
