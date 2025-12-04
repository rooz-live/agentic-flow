/**
 * Affiliate Affinity System - Type Definitions
 * @module affiliate/types
 */
export const STATE_TRANSITIONS = [
    { from: 'pending', to: 'active', allowed: true, requiresApproval: false },
    { from: 'pending', to: 'archived', allowed: true, requiresApproval: true, reason: 'rejected' },
    { from: 'active', to: 'suspended', allowed: true, requiresApproval: false },
    { from: 'active', to: 'archived', allowed: true, requiresApproval: true },
    { from: 'suspended', to: 'active', allowed: true, requiresApproval: true, reason: 'reactivation' },
    { from: 'suspended', to: 'archived', allowed: true, requiresApproval: false },
    { from: 'archived', to: 'pending', allowed: false, requiresApproval: true, reason: 'reinstatement' },
];
//# sourceMappingURL=types.js.map