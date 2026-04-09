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
export declare class EnhancedErrorReporting {
    private reports;
    private maxReports;
    /**
     * Capture an error with full context
     */
    captureError(error: Error, context?: Partial<ErrorContext>): string;
    /**
     * Resolve an error
     */
    resolveError(errorId: string, resolution: string, assignedTo?: string): void;
    /**
     * Get error report
     */
    getErrorReport(errorId: string): ErrorReport | undefined;
    /**
     * Get all error reports
     */
    getAllReports(): ErrorReport[];
    /**
     * Get reports by severity
     */
    getReportsBySeverity(severity: 'critical' | 'high' | 'medium' | 'low'): ErrorReport[];
    /**
     * Get reports by component
     */
    getReportsByComponent(component: string): ErrorReport[];
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
    };
    /**
     * Generate unique error ID
     */
    private generateErrorId;
    /**
     * Generate session ID
     */
    private generateSessionId;
    /**
     * Determine error severity
     */
    private determineSeverity;
    /**
     * Format stack trace for readability
     */
    private formatStackTrace;
    /**
     * Generate tags for error categorization
     */
    private generateTags;
    /**
     * Get recovery suggestion based on error type and context
     */
    getRecoverySuggestion(error: Error): string;
    /**
     * Write error to evidence log
     */
    private writeToEvidenceLog;
}
export declare function getEnhancedErrorReporting(): EnhancedErrorReporting;
//# sourceMappingURL=enhanced-error-reporting.d.ts.map