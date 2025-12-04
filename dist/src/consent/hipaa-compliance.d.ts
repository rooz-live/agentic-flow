/**
 * HIPAA Compliance Helpers
 * Utilities for HIPAA compliance tracking and enforcement
 */
import { HIPAACompliance, AccessLogEntry } from './types';
export declare class HIPAAComplianceService {
    private complianceRecords;
    private accessLogs;
    constructor();
    /**
     * Initialize HIPAA compliance for patient
     */
    initializeCompliance(patientId: string): Promise<HIPAACompliance>;
    /**
     * Log data access
     */
    logAccess(entry: AccessLogEntry): Promise<void>;
    /**
     * Verify access authorization
     */
    verifyAccess(userId: string, userType: 'provider' | 'admin' | 'patient', patientId: string, action: string, resource: string): Promise<{
        authorized: boolean;
        reason?: string;
    }>;
    /**
     * Acknowledge privacy practices
     */
    acknowledgePrivacyPractices(patientId: string, documentId: string): Promise<boolean>;
    /**
     * Add authorized representative
     */
    addAuthorizedRepresentative(patientId: string, representativeId: string): Promise<boolean>;
    /**
     * Update breach notification method
     */
    updateBreachNotificationMethod(patientId: string, method: 'email' | 'sms' | 'mail'): Promise<boolean>;
    /**
     * Perform compliance audit
     */
    performAudit(patientId: string): Promise<{
        compliant: boolean;
        issues: string[];
        recommendations: string[];
    }>;
    /**
     * Get access logs for patient
     */
    getAccessLogs(patientId: string, filter?: {
        startDate?: Date;
        endDate?: Date;
        userType?: string;
        authorized?: boolean;
    }): AccessLogEntry[];
    /**
     * Generate compliance report
     */
    generateReport(patientId: string): {
        patientId: string;
        complianceStatus: string;
        lastAudit: Date;
        totalAccesses: number;
        unauthorizedAccesses: number;
        uniqueAccessors: number;
        privacyPracticesAcknowledged: boolean;
        consentDocumentsCount: number;
    };
    /**
     * Get statistics
     */
    getStats(): {
        totalPatients: number;
        compliantPatients: number;
        pendingPatients: number;
        nonCompliantPatients: number;
        totalAccessLogs: number;
        unauthorizedAttempts: number;
    };
}
//# sourceMappingURL=hipaa-compliance.d.ts.map