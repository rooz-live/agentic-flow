/**
 * Guest Pass Manager
 * Phase B: OAuth & Multi-Tenant Platform
 *
 * Role-based guest access with admin controls
 * Roles: analyst, assessor, innovator, intuitive, orchestrator, seeker
 */
import Database from 'better-sqlite3';
export type CircleRole = 'analyst' | 'assessor' | 'innovator' | 'intuitive' | 'orchestrator' | 'seeker';
export interface GuestPass {
    id: number;
    token: string;
    role: CircleRole;
    tenantId: string;
    expiresAt: number;
    createdBy?: string;
    createdAt: number;
    revokedAt?: number;
}
export interface GuestPassValidation {
    valid: boolean;
    pass?: GuestPass;
    error?: string;
}
export declare class GuestPassManager {
    private dbPath;
    private db;
    constructor(dbPath?: string);
    /**
     * Initialize database and create guest_passes table
     */
    initialize(db?: InstanceType<typeof Database>): Promise<void>;
    /**
     * Generate a new guest pass
     * @param role - Circle role for guest
     * @param durationSeconds - Pass validity duration (default: 24 hours)
     * @param tenantId - Tenant ID for isolation
     * @param createdBy - Admin user who created pass
     */
    generateGuestPass(role: CircleRole, tenantId: string, durationSeconds?: number, createdBy?: string): Promise<GuestPass>;
    /**
     * Validate a guest pass token
     */
    validateGuestPass(token: string): Promise<GuestPassValidation>;
    /**
     * Revoke a guest pass
     */
    revokeGuestPass(token: string): Promise<boolean>;
    /**
     * Revoke guest pass by ID
     */
    revokeGuestPassById(passId: number): Promise<boolean>;
    /**
     * List guest passes for a tenant
     */
    listGuestPasses(tenantId: string, includeRevoked?: boolean): Promise<GuestPass[]>;
    /**
     * Clean up expired guest passes
     */
    cleanupExpiredPasses(): Promise<number>;
    /**
     * Get pass statistics for a tenant
     */
    getPassStatistics(tenantId: string): Promise<{
        total: number;
        active: number;
        expired: number;
        revoked: number;
    }>;
    private generateToken;
    private validateRole;
}
//# sourceMappingURL=guest-pass-manager.d.ts.map