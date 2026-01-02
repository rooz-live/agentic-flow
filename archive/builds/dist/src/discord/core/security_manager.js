/**
 * Security Manager for Discord Bot
 * Handles security validation, fraud detection, and compliance
 */
import { createHash, randomBytes } from 'crypto';
import { promisify } from 'util';
const scrypt = promisify(require('crypto').scrypt);
const compare = promisify(require('crypto').compare);
export class SecurityManager {
    config;
    securityEvents = new Map();
    securityProfiles = new Map();
    policies = new Map();
    auditLog = [];
    sessionTokens = new Map();
    blockedUsers = new Set();
    blockedGuilds = new Set();
    suspiciousPatterns = new Map();
    constructor(config) {
        this.config = config;
        this.initializeDefaultPolicies();
        this.loadSecurityData();
    }
    /**
     * Initialize security manager
     */
    async initialize() {
        // Load blocked users and guilds from config
        this.blockedUsers = new Set(this.config.security.blockedUsers);
        this.blockedGuilds = new Set(this.config.security.blockedGuilds);
        // Setup periodic security checks
        setInterval(() => {
            this.performSecurityChecks();
        }, 300000); // Every 5 minutes
        // Cleanup expired sessions
        setInterval(() => {
            this.cleanupExpiredSessions();
        }, 60000); // Every minute
        console.log('✅ Security manager initialized');
    }
    /**
     * Initialize default security policies
     */
    initializeDefaultPolicies() {
        const defaultPolicies = [
            {
                id: 'rate_limit_protection',
                name: 'Rate Limit Protection',
                description: 'Prevents spam and abuse through rate limiting',
                enabled: true,
                rules: [
                    {
                        id: 'user_rate_limit',
                        type: 'rate_limit',
                        parameters: {
                            maxRequests: 30,
                            timeWindow: 60000, // 1 minute
                            scope: 'user'
                        },
                        enabled: true
                    },
                    {
                        id: 'guild_rate_limit',
                        type: 'rate_limit',
                        parameters: {
                            maxRequests: 100,
                            timeWindow: 60000, // 1 minute
                            scope: 'guild'
                        },
                        enabled: true
                    }
                ],
                actions: [
                    {
                        id: 'temp_block',
                        type: 'block',
                        parameters: {
                            duration: 300000, // 5 minutes
                            reason: 'Rate limit exceeded'
                        },
                        enabled: true
                    },
                    {
                        id: 'log_violation',
                        type: 'report',
                        parameters: {
                            severity: 'medium'
                        },
                        enabled: true
                    }
                ]
            },
            {
                id: 'content_filtering',
                name: 'Content Filtering',
                description: 'Filters inappropriate and malicious content',
                enabled: true,
                rules: [
                    {
                        id: 'profanity_filter',
                        type: 'content_filter',
                        parameters: {
                            patterns: ['badword1', 'badword2'], // Would be loaded from config
                            strictness: 'medium'
                        },
                        enabled: true
                    },
                    {
                        id: 'link_filter',
                        type: 'content_filter',
                        parameters: {
                            allowedDomains: this.config.security.allowedDomains,
                            blockSuspicious: true
                        },
                        enabled: true
                    }
                ],
                actions: [
                    {
                        id: 'delete_message',
                        type: 'block',
                        parameters: {
                            notifyUser: true,
                            reason: 'Content policy violation'
                        },
                        enabled: true
                    },
                    {
                        id: 'escalate_violation',
                        type: 'escalate',
                        parameters: {
                            severity: 'high',
                            notifyAdmins: true
                        },
                        enabled: true
                    }
                ]
            },
            {
                id: 'fraud_detection',
                name: 'Fraud Detection',
                description: 'Detects and prevents fraudulent activities',
                enabled: true,
                rules: [
                    {
                        id: 'payment_fraud',
                        type: 'behavior_analysis',
                        parameters: {
                            maxPaymentAttempts: 5,
                            timeWindow: 3600000, // 1 hour
                            suspiciousPatterns: ['rapid_payments', 'amount_anomalies']
                        },
                        enabled: true
                    },
                    {
                        id: 'account_takeover',
                        type: 'behavior_analysis',
                        parameters: {
                            detectLocationChanges: true,
                            detectDeviceChanges: true,
                            suspiciousActivityThreshold: 3
                        },
                        enabled: true
                    }
                ],
                actions: [
                    {
                        id: 'freeze_account',
                        type: 'quarantine',
                        parameters: {
                            duration: 86400000, // 24 hours
                            requireVerification: true
                        },
                        enabled: true
                    },
                    {
                        id: 'report_fraud',
                        type: 'report',
                        parameters: {
                            severity: 'critical',
                            immediateNotification: true
                        },
                        enabled: true
                    }
                ]
            }
        ];
        for (const policy of defaultPolicies) {
            this.policies.set(policy.id, policy);
        }
        console.log(`🛡️ Initialized ${defaultPolicies.length} security policies`);
    }
    /**
     * Validate Discord interaction
     */
    async validateInteraction(interaction) {
        try {
            // Check if user is blocked
            if (this.isUserBlocked(interaction.user.id)) {
                await this.logSecurityEvent({
                    type: 'unauthorized_access',
                    userId: interaction.user.id,
                    guildId: interaction.guild?.id,
                    description: 'Blocked user attempted interaction',
                    severity: 'high',
                    metadata: {
                        interactionType: interaction.type,
                        commandName: interaction.commandName
                    }
                });
                return false;
            }
            // Check if guild is blocked
            if (interaction.guild && this.isGuildBlocked(interaction.guild.id)) {
                await this.logSecurityEvent({
                    type: 'unauthorized_access',
                    userId: interaction.user.id,
                    guildId: interaction.guild.id,
                    description: 'Interaction from blocked guild',
                    severity: 'medium',
                    metadata: {
                        guildName: interaction.guild.name
                    }
                });
                return false;
            }
            // Check message length
            if (this.config.security.maxMessageLength > 0) {
                const content = interaction.content || '';
                if (content.length > this.config.security.maxMessageLength) {
                    await this.logSecurityEvent({
                        type: 'security_violation',
                        userId: interaction.user.id,
                        guildId: interaction.guild?.id,
                        description: 'Message exceeds maximum length',
                        severity: 'low',
                        metadata: {
                            contentLength: content.length,
                            maxLength: this.config.security.maxMessageLength
                        }
                    });
                    return false;
                }
            }
            // Check rate limits
            if (!this.checkRateLimits(interaction.user.id, interaction.guild?.id)) {
                await this.logSecurityEvent({
                    type: 'rate_limit_violation',
                    userId: interaction.user.id,
                    guildId: interaction.guild?.id,
                    description: 'User exceeded rate limits',
                    severity: 'medium',
                    metadata: {
                        interactionType: interaction.type,
                        commandName: interaction.commandName
                    }
                });
                return false;
            }
            // Check content policies
            if (!(await this.checkContentPolicies(interaction))) {
                return false;
            }
            // Check behavioral patterns
            await this.checkBehavioralPatterns(interaction);
            // Update user profile
            await this.updateSecurityProfile(interaction.user.id, interaction);
            return true;
        }
        catch (error) {
            console.error('❌ Error validating interaction:', error);
            return false;
        }
    }
    /**
     * Check if user is blocked
     */
    isUserBlocked(userId) {
        return this.blockedUsers.has(userId);
    }
    /**
     * Check if guild is blocked
     */
    isGuildBlocked(guildId) {
        return this.blockedGuilds.has(guildId);
    }
    /**
     * Block user
     */
    blockUser(userId, reason) {
        this.blockedUsers.add(userId);
        this.logSecurityEvent({
            type: 'security_violation',
            userId,
            description: `User blocked: ${reason || 'No reason provided'}`,
            severity: 'medium',
            metadata: { reason }
        });
    }
    /**
     * Unblock user
     */
    unblockUser(userId) {
        this.blockedUsers.delete(userId);
        console.log(`🔓 Unblocked user: ${userId}`);
    }
    /**
     * Check rate limits
     */
    checkRateLimits(userId, guildId) {
        const now = Date.now();
        const userKey = `user:${userId}`;
        const guildKey = guildId ? `guild:${guildId}` : null;
        // Check user rate limit
        const userRequests = this.suspiciousPatterns.get(userKey) || 0;
        if (userRequests >= this.config.rateLimits.perUser) {
            return false;
        }
        // Check guild rate limit
        if (guildKey) {
            const guildRequests = this.suspiciousPatterns.get(guildKey) || 0;
            if (guildRequests >= this.config.rateLimits.perGuild) {
                return false;
            }
        }
        // Update counters
        this.suspiciousPatterns.set(userKey, userRequests + 1);
        if (guildKey) {
            this.suspiciousPatterns.set(guildKey, guildRequests + 1);
        }
        return true;
    }
    /**
     * Check content policies
     */
    async checkContentPolicies(interaction) {
        const policy = this.policies.get('content_filtering');
        if (!policy || !policy.enabled) {
            return true;
        }
        const content = interaction.content || '';
        for (const rule of policy.rules) {
            if (!rule.enabled)
                continue;
            if (rule.type === 'content_filter') {
                if (rule.id === 'profanity_filter') {
                    // Check for profanity
                    const profanityPatterns = rule.parameters.patterns;
                    const hasProfanity = profanityPatterns.some(pattern => content.toLowerCase().includes(pattern.toLowerCase()));
                    if (hasProfanity) {
                        await this.logSecurityEvent({
                            type: 'security_violation',
                            userId: interaction.user.id,
                            guildId: interaction.guild?.id,
                            description: 'Profanity detected in content',
                            severity: 'medium',
                            metadata: { content: content.substring(0, 100) }
                        });
                        return false;
                    }
                }
                if (rule.id === 'link_filter') {
                    // Check for suspicious links
                    const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
                    const urls = content.match(urlRegex) || [];
                    for (const url of urls) {
                        const domain = new URL(url).hostname;
                        const allowedDomains = rule.parameters.allowedDomains;
                        if (!allowedDomains.some(allowed => domain.includes(allowed))) {
                            await this.logSecurityEvent({
                                type: 'security_violation',
                                userId: interaction.user.id,
                                guildId: interaction.guild?.id,
                                description: 'Suspicious link detected',
                                severity: 'high',
                                metadata: { url, domain }
                            });
                            return false;
                        }
                    }
                }
            }
        }
        return true;
    }
    /**
     * Check behavioral patterns
     */
    async checkBehavioralPatterns(interaction) {
        const policy = this.policies.get('fraud_detection');
        if (!policy || !policy.enabled) {
            return;
        }
        const userId = interaction.user.id;
        const profile = this.securityProfiles.get(userId);
        if (!profile) {
            return;
        }
        // Check for suspicious patterns
        const now = Date.now();
        const recentEvents = profile.violations.filter(event => now - event.timestamp.getTime() < 3600000 // Last hour
        );
        for (const rule of policy.rules) {
            if (!rule.enabled)
                continue;
            if (rule.id === 'payment_fraud') {
                // Check for rapid payment attempts
                const paymentEvents = recentEvents.filter(event => event.type === 'fraud_detection' &&
                    event.description.includes('payment'));
                if (paymentEvents.length >= rule.parameters.maxPaymentAttempts) {
                    await this.logSecurityEvent({
                        type: 'fraud_detection',
                        userId,
                        guildId: interaction.guild?.id,
                        description: 'Suspicious payment activity detected',
                        severity: 'critical',
                        metadata: {
                            paymentAttempts: paymentEvents.length,
                            timeWindow: '1 hour'
                        }
                    });
                }
            }
            if (rule.id === 'account_takeover') {
                // Check for unusual behavior patterns
                const suspiciousEvents = recentEvents.filter(event => event.type === 'suspicious_activity');
                if (suspiciousEvents.length >= rule.parameters.suspiciousActivityThreshold) {
                    await this.logSecurityEvent({
                        type: 'fraud_detection',
                        userId,
                        guildId: interaction.guild?.id,
                        description: 'Potential account takeover detected',
                        severity: 'critical',
                        metadata: {
                            suspiciousEvents: suspiciousEvents.length,
                            timeWindow: '1 hour'
                        }
                    });
                }
            }
        }
    }
    /**
     * Update security profile
     */
    async updateSecurityProfile(userId, interaction) {
        let profile = this.securityProfiles.get(userId);
        if (!profile) {
            profile = {
                userId,
                riskScore: 0,
                trustLevel: 'medium',
                violations: [],
                lastActivity: new Date(),
                flags: [],
                notes: []
            };
            this.securityProfiles.set(userId, profile);
        }
        // Update activity
        profile.lastActivity = new Date();
        // Calculate risk score based on violations
        const recentViolations = profile.violations.filter(violation => Date.now() - violation.timestamp.getTime() < 86400000 // Last 24 hours
        );
        profile.riskScore = this.calculateRiskScore(recentViolations);
        profile.trustLevel = this.calculateTrustLevel(profile.riskScore);
    }
    /**
     * Calculate risk score
     */
    calculateRiskScore(violations) {
        if (violations.length === 0)
            return 0;
        let score = 0;
        const now = Date.now();
        for (const violation of violations) {
            const age = now - violation.timestamp.getTime();
            const ageHours = age / 3600000;
            // Weight by severity and recency
            let severityWeight = 1;
            switch (violation.severity) {
                case 'critical':
                    severityWeight = 10;
                    break;
                case 'high':
                    severityWeight = 7;
                    break;
                case 'medium':
                    severityWeight = 4;
                    break;
                case 'low':
                    severityWeight = 1;
                    break;
            }
            // Decay factor based on age
            const decayFactor = Math.max(0.1, 1 - (ageHours / 24));
            score += severityWeight * decayFactor;
        }
        return Math.min(100, Math.round(score));
    }
    /**
     * Calculate trust level
     */
    calculateTrustLevel(riskScore) {
        if (riskScore >= 80)
            return 'low';
        if (riskScore >= 50)
            return 'medium';
        if (riskScore >= 20)
            return 'high';
        return 'trusted';
    }
    /**
     * Log security event
     */
    async logSecurityEvent(eventData) {
        const event = {
            id: `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: eventData.type,
            userId: eventData.userId,
            guildId: eventData.guildId,
            description: eventData.description,
            severity: eventData.severity,
            timestamp: new Date(),
            metadata: eventData.metadata,
            resolved: false
        };
        this.securityEvents.set(event.id, event);
        // Add to user profile
        const profile = this.securityProfiles.get(eventData.userId);
        if (profile) {
            profile.violations.push(event);
        }
        // Add to audit log
        this.auditLog.push({
            id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: event.timestamp,
            eventType: event.type,
            userId: event.userId,
            guildId: event.guildId,
            details: event.metadata || {},
            outcome: 'flagged',
            automated: true
        });
        // Emit event
        this.emit('security_event', event);
        console.log(`🚨 Security event logged: ${event.type} - ${event.description}`);
        return event;
    }
    /**
     * Generate secure session token
     */
    generateSessionToken(userId, guildId) {
        const tokenData = {
            userId,
            guildId,
            timestamp: Date.now(),
            random: randomBytes(16).toString('hex')
        };
        const token = Buffer.from(JSON.stringify(tokenData)).toString('base64');
        const hashedToken = createHash('sha256').update(token).digest('hex');
        this.sessionTokens.set(hashedToken, {
            userId,
            guildId,
            expires: Date.now() + 3600000 // 1 hour
        });
        return hashedToken;
    }
    /**
     * Validate session token
     */
    async validateSessionToken(token) {
        const sessionData = this.sessionTokens.get(token);
        if (!sessionData) {
            return { valid: false };
        }
        if (Date.now() > sessionData.expires) {
            this.sessionTokens.delete(token);
            return { valid: false };
        }
        return {
            valid: true,
            userId: sessionData.userId,
            guildId: sessionData.guildId
        };
    }
    /**
     * Perform security checks
     */
    performSecurityChecks() {
        // Check for anomalies
        this.checkForAnomalies();
        // Update risk scores
        this.updateRiskScores();
        // Clean old data
        this.cleanupOldData();
    }
    /**
     * Check for anomalies
     */
    checkForAnomalies() {
        // Check for unusual patterns
        const now = Date.now();
        // Check for users with high violation rates
        for (const [userId, profile] of this.securityProfiles.entries()) {
            const recentViolations = profile.violations.filter(v => now - v.timestamp.getTime() < 3600000 // Last hour
            );
            if (recentViolations.length > 10) {
                this.logSecurityEvent({
                    type: 'suspicious_activity',
                    userId,
                    description: 'High rate of security violations',
                    severity: 'high',
                    metadata: {
                        violationsInHour: recentViolations.length
                    }
                });
            }
        }
    }
    /**
     * Update risk scores
     */
    updateRiskScores() {
        for (const [userId, profile] of this.securityProfiles.entries()) {
            const recentViolations = profile.violations.filter(violation => Date.now() - violation.timestamp.getTime() < 86400000 // Last 24 hours
            );
            profile.riskScore = this.calculateRiskScore(recentViolations);
            profile.trustLevel = this.calculateTrustLevel(profile.riskScore);
        }
    }
    /**
     * Clean old data
     */
    cleanupOldData() {
        const cutoff = Date.now() - 86400000 * 30; // 30 days ago
        // Clean old security events
        for (const [id, event] of this.securityEvents.entries()) {
            if (event.timestamp.getTime() < cutoff) {
                this.securityEvents.delete(id);
            }
        }
        // Clean old audit logs
        this.auditLog = this.auditLog.filter(audit => audit.timestamp.getTime() > cutoff);
    }
    /**
     * Clean expired sessions
     */
    cleanupExpiredSessions() {
        const now = Date.now();
        for (const [token, sessionData] of this.sessionTokens.entries()) {
            if (now > sessionData.expires) {
                this.sessionTokens.delete(token);
            }
        }
    }
    /**
     * Load security data
     */
    loadSecurityData() {
        // Implementation would load from database
        console.log('📂 Loaded security data');
    }
    /**
     * Get security statistics
     */
    getStatistics() {
        const events = Array.from(this.securityEvents.values());
        const profiles = Array.from(this.securityProfiles.values());
        return {
            totalEvents: events.length,
            eventsByType: this.groupByType(events),
            eventsBySeverity: this.groupBySeverity(events),
            totalProfiles: profiles.length,
            profilesByTrustLevel: this.groupByTrustLevel(profiles),
            averageRiskScore: profiles.reduce((sum, p) => sum + p.riskScore, 0) / profiles.length,
            blockedUsers: this.blockedUsers.size,
            blockedGuilds: this.blockedGuilds.size,
            activeSessions: this.sessionTokens.size
        };
    }
    /**
     * Group events by type
     */
    groupByType(events) {
        return events.reduce((groups, event) => {
            groups[event.type] = (groups[event.type] || 0) + 1;
            return groups;
        }, {});
    }
    /**
     * Group events by severity
     */
    groupBySeverity(events) {
        return events.reduce((groups, event) => {
            groups[event.severity] = (groups[event.severity] || 0) + 1;
            return groups;
        }, {});
    }
    /**
     * Group profiles by trust level
     */
    groupByTrustLevel(profiles) {
        return profiles.reduce((groups, profile) => {
            groups[profile.trustLevel] = (groups[profile.trustLevel] || 0) + 1;
            return groups;
        }, {});
    }
    /**
     * Get user security profile
     */
    getUserProfile(userId) {
        return this.securityProfiles.get(userId) || null;
    }
    /**
     * Get security events
     */
    getSecurityEvents(userId, limit = 50) {
        let events = Array.from(this.securityEvents.values());
        if (userId) {
            events = events.filter(event => event.userId === userId);
        }
        return events
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, limit);
    }
    /**
     * Get audit log
     */
    getAuditLog(limit = 100) {
        return this.auditLog
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, limit);
    }
    /**
     * Shutdown security manager
     */
    async shutdown() {
        // Save security data
        console.log('🔌 Security manager shutdown complete');
    }
}
//# sourceMappingURL=security_manager.js.map