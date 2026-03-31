/**
 * Authorization Service
 * Manages provider authorization and access control
 */
import { Authorization, AuthorizationEvent, DataAccessLevel } from './types';
export declare class AuthorizationService {
    private authorizations;
    private providerAuthorizations;
    constructor();
    /**
     * Grant authorization to provider
     */
    grantAuthorization(authorization: Omit<Authorization, 'id' | 'auditTrail'>): Promise<Authorization>;
    /**
     * Revoke authorization
     */
    revokeAuthorization(authorizationId: string, revokedBy: string, reason: string): Promise<boolean>;
    /**
     * Check if provider is authorized for action
     */
    isAuthorized(providerId: string, patientId: string, action: string, dataScope?: string): boolean;
    /**
     * Get authorizations for provider
     */
    getAuthorizationsForProvider(providerId: string, activeOnly?: boolean): Authorization[];
    /**
     * Get authorizations for patient
     */
    getAuthorizationsForPatient(patientId: string): Authorization[];
    /**
     * Update authorization access level
     */
    updateAccessLevel(authorizationId: string, newAccessLevel: DataAccessLevel, updatedBy: string): Promise<boolean>;
    /**
     * Get audit trail for authorization
     */
    getAuditTrail(authorizationId: string): AuthorizationEvent[];
    /**
     * Get comprehensive audit log
     */
    getAuditLog(filter?: {
        providerId?: string;
        patientId?: string;
        startDate?: Date;
        endDate?: Date;
        action?: string;
    }): AuthorizationEvent[];
    /**
     * Get authorization statistics
     */
    getStats(): {
        totalAuthorizations: number;
        activeAuthorizations: number;
        byAccessLevel: Map<DataAccessLevel, number>;
        totalAuditEvents: number;
    };
}
//# sourceMappingURL=authorization-service.d.ts.map