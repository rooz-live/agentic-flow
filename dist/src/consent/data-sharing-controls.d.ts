/**
 * Data Sharing Controls
 * Manages patient data sharing policies and restrictions
 */
import { DataSharingPolicy, DataRestriction } from './types';
export declare class DataSharingControls {
    private policies;
    private patientPolicies;
    constructor();
    /**
     * Create data sharing policy for patient
     */
    createPolicy(policy: Omit<DataSharingPolicy, 'id'>): Promise<DataSharingPolicy>;
    /**
     * Update data sharing policy
     */
    updatePolicy(policyId: string, updates: Partial<DataSharingPolicy>): Promise<boolean>;
    /**
     * Check if data sharing is allowed
     */
    isDataSharingAllowed(patientId: string, providerId: string, dataCategory: string): {
        allowed: boolean;
        reason?: string;
    };
    /**
     * Check if restriction is violated
     */
    private checkRestrictionViolation;
    /**
     * Check time-based restriction
     */
    private checkTimeRestriction;
    /**
     * Add provider to allowed list
     */
    addAllowedProvider(patientId: string, providerId: string): Promise<boolean>;
    /**
     * Remove provider from allowed list
     */
    removeAllowedProvider(patientId: string, providerId: string): Promise<boolean>;
    /**
     * Add data category to policy
     */
    addDataCategory(patientId: string, category: string): Promise<boolean>;
    /**
     * Add restriction to policy
     */
    addRestriction(patientId: string, restriction: DataRestriction): Promise<boolean>;
    /**
     * Get policy for patient
     */
    getPolicyForPatient(patientId: string): DataSharingPolicy | undefined;
    /**
     * Activate/deactivate policy
     */
    setPolicyActiveStatus(patientId: string, active: boolean): Promise<boolean>;
    /**
     * Get statistics
     */
    getStats(): {
        totalPolicies: number;
        activePolicies: number;
        averageAllowedProviders: number;
        averageDataCategories: number;
        totalRestrictions: number;
    };
}
//# sourceMappingURL=data-sharing-controls.d.ts.map