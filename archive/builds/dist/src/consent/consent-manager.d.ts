/**
 * Consent Manager
 * Manages patient consent lifecycle and validation
 */
import { Consent, ConsentType, ConsentStatus } from './types';
export declare class ConsentManager {
    private consents;
    private patientConsents;
    constructor();
    /**
     * Create new consent
     */
    createConsent(consent: Omit<Consent, 'id' | 'createdAt' | 'updatedAt'>): Promise<Consent>;
    /**
     * Grant consent
     */
    grantConsent(consentId: string, signature: string, witnessSignature?: string): Promise<boolean>;
    /**
     * Revoke consent
     */
    revokeConsent(consentId: string, revokedBy: string, reason?: string): Promise<boolean>;
    /**
     * Check if consent is valid
     */
    isConsentValid(consentId: string): boolean;
    /**
     * Check if provider has consent to access patient data
     */
    hasConsentFor(patientId: string, providerId: string, type: ConsentType, dataCategory?: string): boolean;
    /**
     * Get consents for patient
     */
    getConsentsForPatient(patientId: string, filter?: {
        type?: ConsentType;
        status?: ConsentStatus;
    }): Consent[];
    /**
     * Get consents granted to provider
     */
    getConsentsForProvider(providerId: string): Consent[];
    /**
     * Check expiring consents
     */
    getExpiringConsents(daysBeforeExpiry?: number): Consent[];
    /**
     * Renew consent
     */
    renewConsent(consentId: string, newExpiryDate: Date): Promise<boolean>;
    /**
     * Get consent statistics
     */
    getStats(): {
        totalConsents: number;
        byStatus: Map<ConsentStatus, number>;
        byType: Map<ConsentType, number>;
        expiringCount: number;
    };
}
//# sourceMappingURL=consent-manager.d.ts.map