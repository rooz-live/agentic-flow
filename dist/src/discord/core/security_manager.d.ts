/**
 * Security Manager for Discord Bot
 * Handles security validation, fraud detection, and compliance
 */
import { Interaction } from 'discord.js';
import { DiscordBotConfig } from './discord_config';
export interface SecurityEvent {
    id: string;
    type: 'suspicious_activity' | 'rate_limit_violation' | 'unauthorized_access' | 'fraud_detection' | 'security_violation';
    userId: string;
    guildId?: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: Date;
    metadata?: Record<string, any>;
    resolved: boolean;
    resolvedAt?: Date;
    resolvedBy?: string;
}
export interface SecurityPolicy {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    rules: SecurityRule[];
    actions: SecurityAction[];
}
export interface SecurityRule {
    id: string;
    type: 'rate_limit' | 'content_filter' | 'permission_check' | 'behavior_analysis';
    parameters: Record<string, any>;
    enabled: boolean;
}
export interface SecurityAction {
    id: string;
    type: 'warn' | 'block' | 'report' | 'quarantine' | 'escalate';
    parameters: Record<string, any>;
    enabled: boolean;
}
export interface SecurityProfile {
    userId: string;
    riskScore: number;
    trustLevel: 'low' | 'medium' | 'high' | 'trusted';
    violations: SecurityEvent[];
    lastActivity: Date;
    flags: string[];
    notes: string[];
}
export interface SecurityAudit {
    id: string;
    timestamp: Date;
    eventType: string;
    userId: string;
    guildId?: string;
    details: Record<string, any>;
    outcome: 'allowed' | 'blocked' | 'flagged' | 'escalated';
    automated: boolean;
    reviewedBy?: string;
}
export declare class SecurityManager {
    private config;
    private securityEvents;
    private securityProfiles;
    private policies;
    private auditLog;
    private sessionTokens;
    private blockedUsers;
    private blockedGuilds;
    private suspiciousPatterns;
    constructor(config: DiscordBotConfig);
    /**
     * Initialize security manager
     */
    initialize(): Promise<void>;
    /**
     * Initialize default security policies
     */
    private initializeDefaultPolicies;
    /**
     * Validate Discord interaction
     */
    validateInteraction(interaction: Interaction): Promise<boolean>;
    /**
     * Check if user is blocked
     */
    isUserBlocked(userId: string): boolean;
    /**
     * Check if guild is blocked
     */
    isGuildBlocked(guildId: string): boolean;
    /**
     * Block user
     */
    blockUser(userId: string, reason?: string): void;
    /**
     * Unblock user
     */
    unblockUser(userId: string): void;
    /**
     * Check rate limits
     */
    private checkRateLimits;
    /**
     * Check content policies
     */
    private checkContentPolicies;
    /**
     * Check behavioral patterns
     */
    private checkBehavioralPatterns;
    /**
     * Update security profile
     */
    private updateSecurityProfile;
    /**
     * Calculate risk score
     */
    private calculateRiskScore;
    /**
     * Calculate trust level
     */
    private calculateTrustLevel;
    /**
     * Log security event
     */
    logSecurityEvent(eventData: Partial<SecurityEvent>): Promise<SecurityEvent>;
    /**
     * Generate secure session token
     */
    generateSessionToken(userId: string, guildId?: string): string;
    /**
     * Validate session token
     */
    validateSessionToken(token: string): Promise<{
        valid: boolean;
        userId?: string;
        guildId?: string;
    }>;
    /**
     * Perform security checks
     */
    private performSecurityChecks;
    /**
     * Check for anomalies
     */
    private checkForAnomalies;
    /**
     * Update risk scores
     */
    private updateRiskScores;
    /**
     * Clean old data
     */
    private cleanupOldData;
    /**
     * Clean expired sessions
     */
    private cleanupExpiredSessions;
    /**
     * Load security data
     */
    private loadSecurityData;
    /**
     * Get security statistics
     */
    getStatistics(): any;
    /**
     * Group events by type
     */
    private groupByType;
    /**
     * Group events by severity
     */
    private groupBySeverity;
    /**
     * Group profiles by trust level
     */
    private groupByTrustLevel;
    /**
     * Get user security profile
     */
    getUserProfile(userId: string): SecurityProfile | null;
    /**
     * Get security events
     */
    getSecurityEvents(userId?: string, limit?: number): SecurityEvent[];
    /**
     * Get audit log
     */
    getAuditLog(limit?: number): SecurityAudit[];
    /**
     * Shutdown security manager
     */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=security_manager.d.ts.map