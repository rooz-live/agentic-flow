/**
 * Authorization Service
 * Manages provider authorization and access control
 */
export class AuthorizationService {
    authorizations;
    providerAuthorizations; // providerId -> authorizationIds
    constructor() {
        this.authorizations = new Map();
        this.providerAuthorizations = new Map();
    }
    /**
     * Grant authorization to provider
     */
    async grantAuthorization(authorization) {
        const newAuthorization = {
            ...authorization,
            id: `auth-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            auditTrail: [{
                    timestamp: new Date(),
                    action: 'granted',
                    performedBy: authorization.grantedBy,
                    reason: authorization.purpose
                }]
        };
        this.authorizations.set(newAuthorization.id, newAuthorization);
        // Index by provider
        const providerAuthSet = this.providerAuthorizations.get(authorization.providerId) || new Set();
        providerAuthSet.add(newAuthorization.id);
        this.providerAuthorizations.set(authorization.providerId, providerAuthSet);
        console.log(`[AUTHORIZATION] Granted ${authorization.accessLevel} access to provider ${authorization.providerId} for patient ${authorization.patientId}`);
        return newAuthorization;
    }
    /**
     * Revoke authorization
     */
    async revokeAuthorization(authorizationId, revokedBy, reason) {
        const authorization = this.authorizations.get(authorizationId);
        if (!authorization) {
            return false;
        }
        authorization.active = false;
        authorization.auditTrail.push({
            timestamp: new Date(),
            action: 'revoked',
            performedBy: revokedBy,
            reason
        });
        console.log(`[AUTHORIZATION] Revoked authorization ${authorizationId} by ${revokedBy}`);
        return true;
    }
    /**
     * Check if provider is authorized for action
     */
    isAuthorized(providerId, patientId, action, dataScope) {
        const providerAuthIds = this.providerAuthorizations.get(providerId);
        if (!providerAuthIds) {
            return false;
        }
        for (const authId of providerAuthIds) {
            const auth = this.authorizations.get(authId);
            if (!auth || !auth.active)
                continue;
            // Check patient
            if (auth.patientId !== patientId)
                continue;
            // Check validity period
            if (new Date() < auth.validFrom)
                continue;
            if (auth.validUntil && new Date() > auth.validUntil) {
                // Auto-expire
                auth.active = false;
                continue;
            }
            // Check action
            if (!auth.allowedActions.includes(action))
                continue;
            // Check data scope if specified
            if (dataScope && !auth.dataScopes.includes(dataScope))
                continue;
            // Log access
            auth.auditTrail.push({
                timestamp: new Date(),
                action: 'accessed',
                performedBy: providerId,
                metadata: { action, dataScope }
            });
            return true;
        }
        return false;
    }
    /**
     * Get authorizations for provider
     */
    getAuthorizationsForProvider(providerId, activeOnly = true) {
        const providerAuthIds = this.providerAuthorizations.get(providerId);
        if (!providerAuthIds) {
            return [];
        }
        let authorizations = Array.from(providerAuthIds)
            .map(id => this.authorizations.get(id))
            .filter((a) => a !== undefined);
        if (activeOnly) {
            authorizations = authorizations.filter(a => a.active);
        }
        return authorizations;
    }
    /**
     * Get authorizations for patient
     */
    getAuthorizationsForPatient(patientId) {
        const authorizations = [];
        for (const auth of this.authorizations.values()) {
            if (auth.patientId === patientId && auth.active) {
                authorizations.push(auth);
            }
        }
        return authorizations;
    }
    /**
     * Update authorization access level
     */
    async updateAccessLevel(authorizationId, newAccessLevel, updatedBy) {
        const authorization = this.authorizations.get(authorizationId);
        if (!authorization) {
            return false;
        }
        const oldLevel = authorization.accessLevel;
        authorization.accessLevel = newAccessLevel;
        authorization.auditTrail.push({
            timestamp: new Date(),
            action: 'modified',
            performedBy: updatedBy,
            metadata: { oldLevel, newLevel: newAccessLevel }
        });
        console.log(`[AUTHORIZATION] Updated access level for ${authorizationId} from ${oldLevel} to ${newAccessLevel}`);
        return true;
    }
    /**
     * Get audit trail for authorization
     */
    getAuditTrail(authorizationId) {
        const authorization = this.authorizations.get(authorizationId);
        return authorization?.auditTrail || [];
    }
    /**
     * Get comprehensive audit log
     */
    getAuditLog(filter) {
        const events = [];
        for (const auth of this.authorizations.values()) {
            // Filter by provider
            if (filter?.providerId && auth.providerId !== filter.providerId)
                continue;
            // Filter by patient
            if (filter?.patientId && auth.patientId !== filter.patientId)
                continue;
            for (const event of auth.auditTrail) {
                // Filter by date range
                if (filter?.startDate && event.timestamp < filter.startDate)
                    continue;
                if (filter?.endDate && event.timestamp > filter.endDate)
                    continue;
                // Filter by action
                if (filter?.action && event.action !== filter.action)
                    continue;
                events.push(event);
            }
        }
        return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }
    /**
     * Get authorization statistics
     */
    getStats() {
        const byAccessLevel = new Map();
        let activeCount = 0;
        let totalAuditEvents = 0;
        for (const auth of this.authorizations.values()) {
            if (auth.active) {
                activeCount++;
            }
            const count = byAccessLevel.get(auth.accessLevel) || 0;
            byAccessLevel.set(auth.accessLevel, count + 1);
            totalAuditEvents += auth.auditTrail.length;
        }
        return {
            totalAuthorizations: this.authorizations.size,
            activeAuthorizations: activeCount,
            byAccessLevel,
            totalAuditEvents
        };
    }
}
//# sourceMappingURL=authorization-service.js.map