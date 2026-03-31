/**
 * HIPAA Security Middleware
 * Provides encryption, audit logging, and access control for HIPAA compliance
 */
export declare class HIPAASecurityMiddleware {
    private encryptionKey;
    private auditEnabled;
    constructor(config: {
        encryptionKey: string;
        auditEnabled: boolean;
    });
    /**
     * Encrypt sensitive data (PHI - Protected Health Information)
     */
    encrypt(data: string): string;
    /**
     * Decrypt sensitive data
     */
    decrypt(encryptedData: string): string;
    /**
     * Mask sensitive information for logging
     */
    maskPHI(data: any): any;
    /**
     * Check if field contains sensitive information
     */
    private isSensitiveField;
    /**
     * Validate data access authorization
     */
    validateAccess(request: {
        userId: string;
        userRole: string;
        resourceId: string;
        action: string;
        purpose: string;
    }): {
        authorized: boolean;
        reason?: string;
    };
    /**
     * Check minimum necessary access principle
     */
    private isMinimumNecessary;
    /**
     * Check role-based permissions
     */
    private hasRequiredRole;
    /**
     * Validate access purpose
     */
    private isValidPurpose;
    /**
     * Audit log access
     */
    private auditLog;
    /**
     * Generate compliance report
     */
    generateComplianceReport(period: {
        start: Date;
        end: Date;
    }): {
        totalAccesses: number;
        unauthorizedAttempts: number;
        encryptedDataAccesses: number;
        auditLogEntries: number;
        complianceViolations: string[];
    };
    /**
     * Sanitize data for transmission
     */
    sanitizeForTransmission(data: any): any;
    /**
     * Generate secure token for data access
     */
    generateAccessToken(userId: string, resourceId: string, expiryMinutes?: number): string;
    /**
     * Validate access token
     */
    validateAccessToken(token: string): {
        valid: boolean;
        userId?: string;
        resourceId?: string;
    };
}
//# sourceMappingURL=hipaa-security.d.ts.map