import { EventEmitter } from 'events';
import { Metrics } from '../notifications/metrics';
import { CentralizedLogging } from './centralized-logging';
export interface SecurityEvent {
    id: string;
    timestamp: string;
    eventType: SecurityEventType;
    severity: SecuritySeverity;
    source: string;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    resource?: string;
    action?: string;
    outcome: 'success' | 'failure' | 'blocked';
    details: Record<string, any>;
    tags?: string[];
}
export declare enum SecurityEventType {
    AUTHENTICATION_FAILURE = "authentication_failure",
    AUTHENTICATION_SUCCESS = "authentication_success",
    UNAUTHORIZED_ACCESS = "unauthorized_access",
    PRIVILEGE_ESCALATION = "privilege_escalation",
    SUSPICIOUS_ACTIVITY = "suspicious_activity",
    MALICIOUS_REQUEST = "malicious_request",
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded",
    BRUTE_FORCE_ATTACK = "brute_force_attack",
    INJECTION_ATTACK = "injection_attack",
    XSS_ATTACK = "xss_attack",
    CSRF_ATTACK = "csrf_attack",
    DATA_BREACH = "data_breach",
    POLICY_VIOLATION = "policy_violation",
    ANOMALOUS_BEHAVIOR = "anomalous_behavior",
    SECURITY_SCAN = "security_scan",
    COMPLIANCE_VIOLATION = "compliance_violation"
}
export declare enum SecuritySeverity {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    CRITICAL = "critical"
}
export interface SecurityConfig {
    enableRealTimeMonitoring: boolean;
    enableAnomalyDetection: boolean;
    enableThreatIntelligence: boolean;
    rateLimitThresholds: Record<string, number>;
    suspiciousPatterns: RegExp[];
    blockedIPs: string[];
    allowedIPs: string[];
    enableGeoBlocking: boolean;
    blockedCountries: string[];
    auditLogRetention: number;
}
export declare class SecurityMonitoring {
    private config;
    private eventBus;
    private metrics;
    private logger;
    private securityEvents;
    private userBehaviorProfiles;
    private rateLimitTracker;
    constructor(config: SecurityConfig, eventBus: EventEmitter, metrics: Metrics, logger: CentralizedLogging);
    private initializeSecurityMonitoring;
    recordSecurityEvent(eventType: SecurityEventType, severity: SecuritySeverity, source: string, details: Record<string, any>, context?: {
        userId?: string;
        ipAddress?: string;
        userAgent?: string;
        resource?: string;
        action?: string;
        outcome?: 'success' | 'failure' | 'blocked';
    }): void;
    monitorAuthentication(userId: string, ipAddress: string, userAgent: string, success: boolean, method: 'password' | 'oauth' | 'mfa' | 'api_key', details?: Record<string, any>): void;
    monitorAccess(userId: string, resource: string, action: string, ipAddress: string, success: boolean, details?: Record<string, any>): void;
    monitorAPIRequest(endpoint: string, method: string, ipAddress: string, userAgent: string, userId?: string, statusCode: number, requestSize: number, responseSize: number, duration: number): void;
    monitorDataAccess(userId: string, dataType: string, action: string, recordId?: string, ipAddress?: string, sensitive?: boolean): void;
    private detectSuspiciousRequest;
    private checkInjectionAttack;
    private checkBruteForceAttack;
    private checkRateLimit;
    private updateUserBehaviorProfile;
    private calculateRiskScore;
    private handleSecurityEvent;
    private automatedResponse;
    private blockIPAddress;
    private notifySecurityTeam;
    private triggerIncidentResponse;
    private getResponsePlan;
    private performSecurityChecks;
    private performAnomalyDetection;
    private getAnomalyReasons;
    private performSystemIntegrityCheck;
    private updateThreatIntelligence;
    private cleanupOldData;
    private generateEventId;
    private generateIncidentId;
    private generateEventTags;
    getSecurityEvents(filters?: {
        eventType?: SecurityEventType;
        severity?: SecuritySeverity;
        startTime?: Date;
        endTime?: Date;
        userId?: string;
    }): SecurityEvent[];
    getUserBehaviorProfile(userId: string): UserBehaviorProfile | undefined;
    getSecurityMetrics(): {
        totalEvents: number;
        eventsByType: Record<string, number>;
        eventsBySeverity: Record<string, number>;
        criticalEvents: SecurityEvent[];
        blockedIPs: string[];
    };
}
interface UserBehaviorProfile {
    userId: string;
    loginAttempts: number;
    failedLogins: number;
    lastLogin: Date | null;
    lastIP: string | null;
    knownIPs: Set<string>;
    usualLoginTimes: number[];
    riskScore: number;
}
export default SecurityMonitoring;
//# sourceMappingURL=security-monitoring.d.ts.map