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

export enum SecurityEventType {
  AUTHENTICATION_FAILURE = 'authentication_failure',
  AUTHENTICATION_SUCCESS = 'authentication_success',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  MALICIOUS_REQUEST = 'malicious_request',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  BRUTE_FORCE_ATTACK = 'brute_force_attack',
  INJECTION_ATTACK = 'injection_attack',
  XSS_ATTACK = 'xss_attack',
  CSRF_ATTACK = 'csrf_attack',
  DATA_BREACH = 'data_breach',
  POLICY_VIOLATION = 'policy_violation',
  ANOMALOUS_BEHAVIOR = 'anomalous_behavior',
  SECURITY_SCAN = 'security_scan',
  COMPLIANCE_VIOLATION = 'compliance_violation'
}

export enum SecuritySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
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
  auditLogRetention: number; // days
}

export class SecurityMonitoring {
  private config: SecurityConfig;
  private eventBus: EventEmitter;
  private metrics: Metrics;
  private logger: CentralizedLogging;
  private securityEvents: SecurityEvent[] = [];
  private userBehaviorProfiles: Map<string, UserBehaviorProfile> = new Map();
  private rateLimitTracker: Map<string, RateLimitEntry[]> = new Map();

  constructor(
    config: SecurityConfig,
    eventBus: EventEmitter,
    metrics: Metrics,
    logger: CentralizedLogging
  ) {
    this.config = {
      enableRealTimeMonitoring: true,
      enableAnomalyDetection: true,
      enableThreatIntelligence: true,
      rateLimitThresholds: {
        'login_attempts_per_minute': 5,
        'api_requests_per_minute': 100,
        'failed_auth_per_hour': 10,
        'suspicious_actions_per_hour': 20
      },
      suspiciousPatterns: [
        /\b(select|union|insert|update|delete|drop|create|alter|exec|execute)\b/gi,
        /\b(script|javascript|vbscript|onload|onerror)\b/gi,
        /<[^>]*script[^>]*>/gi,
        /\.\.(\/|\.\.|\.\.\/)/gi
      ],
      blockedIPs: [],
      allowedIPs: [],
      enableGeoBlocking: false,
      blockedCountries: [],
      auditLogRetention: 90,
      ...config
    };
    this.eventBus = eventBus;
    this.metrics = metrics;
    this.logger = logger;
    this.initializeSecurityMonitoring();
  }

  private initializeSecurityMonitoring(): void {
    // Start periodic security checks
    setInterval(() => {
      this.performSecurityChecks();
    }, 60000); // Every minute

    // Clean up old data
    setInterval(() => {
      this.cleanupOldData();
    }, 3600000); // Every hour

    console.log('Security monitoring initialized');
  }

  // Main security event recording
  recordSecurityEvent(
    eventType: SecurityEventType,
    severity: SecuritySeverity,
    source: string,
    details: Record<string, any>,
    context?: {
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
      resource?: string;
      action?: string;
      outcome?: 'success' | 'failure' | 'blocked';
    }
  ): void {
    const event: SecurityEvent = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      eventType,
      severity,
      source,
      userId: context?.userId,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      resource: context?.resource,
      action: context?.action,
      outcome: context?.outcome || 'failure',
      details,
      tags: this.generateEventTags(eventType, severity)
    };

    // Store event
    this.securityEvents.push(event);

    // Log event
    this.logger.logSecurityEvent(eventType, severity, JSON.stringify(details), {
      userId: context?.userId,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      resource: context?.resource,
      action: context?.action,
      outcome: context?.outcome
    });

    // Record metrics
    this.metrics.inc('security_events_total', 1, {
      event_type: eventType,
      severity,
      source,
      outcome: context?.outcome || 'failure'
    });

    // Emit event for real-time monitoring
    this.eventBus.emit('security:event', event);

    // Check for immediate actions
    this.handleSecurityEvent(event);
  }

  // Authentication monitoring
  monitorAuthentication(
    userId: string,
    ipAddress: string,
    userAgent: string,
    success: boolean,
    method: 'password' | 'oauth' | 'mfa' | 'api_key',
    details?: Record<string, any>
  ): void {
    const eventType = success ? SecurityEventType.AUTHENTICATION_SUCCESS : SecurityEventType.AUTHENTICATION_FAILURE;
    const severity = success ? SecuritySeverity.LOW : SecuritySeverity.MEDIUM;

    this.recordSecurityEvent(
      eventType,
      severity,
      'authentication',
      {
        method,
        ...details
      },
      {
        userId,
        ipAddress,
        userAgent,
        outcome: success ? 'success' : 'failure'
      }
    );

    // Update user behavior profile
    this.updateUserBehaviorProfile(userId, {
      lastLogin: new Date(),
      lastIP: ipAddress,
      loginAttempts: success ? 0 : 1,
      failedLogins: success ? 0 : 1
    });

    // Check for brute force attack
    if (!success) {
      this.checkBruteForceAttack(userId, ipAddress);
    }
  }

  // Access control monitoring
  monitorAccess(
    userId: string,
    resource: string,
    action: string,
    ipAddress: string,
    success: boolean,
    details?: Record<string, any>
  ): void {
    const eventType = success ? 'access_granted' : SecurityEventType.UNAUTHORIZED_ACCESS;
    const severity = success ? SecuritySeverity.LOW : SecuritySeverity.HIGH;

    this.recordSecurityEvent(
      eventType,
      severity,
      'access_control',
      {
        action,
        ...details
      },
      {
        userId,
        resource,
        action,
        ipAddress,
        outcome: success ? 'success' : 'failure'
      }
    );
  }

  // API request monitoring
  monitorAPIRequest(
    endpoint: string,
    method: string,
    ipAddress: string,
    userAgent: string,
    userId?: string,
    statusCode: number,
    requestSize: number,
    responseSize: number,
    duration: number
  ): void {
    // Check for suspicious patterns
    const isSuspicious = this.detectSuspiciousRequest(endpoint, method, userAgent, requestSize);

    if (isSuspicious) {
      this.recordSecurityEvent(
        SecurityEventType.SUSPICIOUS_ACTIVITY,
        SecuritySeverity.MEDIUM,
        'api_request',
        {
          endpoint,
          method,
          requestSize,
          responseSize,
          duration,
          suspiciousReason: isSuspicious.reason
        },
        {
          userId,
          ipAddress,
          userAgent,
          action: method,
          resource: endpoint,
          outcome: 'blocked'
        }
      );
    }

    // Check rate limiting
    this.checkRateLimit('api_requests_per_minute', `${ipAddress}:${endpoint}`, method);

    // Monitor for injection attacks
    this.checkInjectionAttack(endpoint, method, userAgent);
  }

  // Data access monitoring
  monitorDataAccess(
    userId: string,
    dataType: string,
    action: string,
    recordId?: string,
    ipAddress?: string,
    sensitive: boolean = false
  ): void {
    if (sensitive) {
      this.recordSecurityEvent(
        SecurityEventType.PRIVILEGE_ESCALATION,
        SecuritySeverity.HIGH,
        'data_access',
        {
          dataType,
          recordId,
          sensitive
        },
        {
          userId,
          resource: `${dataType}:${recordId}`,
          action,
          ipAddress
        }
      );
    }

    // Log all data access for audit
    this.logger.logAuditEvent(action, `${dataType}:${recordId || 'unknown'}`, userId, 'success', {
      sensitive,
      ipAddress
    });
  }

  // Anomaly detection
  private detectSuspiciousRequest(
    endpoint: string,
    method: string,
    userAgent: string,
    requestSize: number
  ): { suspicious: boolean; reason?: string } {
    // Check against suspicious patterns
    for (const pattern of this.config.suspiciousPatterns) {
      if (pattern.test(endpoint) || pattern.test(method) || pattern.test(userAgent)) {
        return { suspicious: true, reason: 'Pattern match detected' };
      }
    }

    // Check for unusual request size
    if (requestSize > 10 * 1024 * 1024) { // 10MB
      return { suspicious: true, reason: 'Unusually large request' };
    }

    // Check for missing user agent
    if (!userAgent || userAgent.length < 10) {
      return { suspicious: true, reason: 'Missing or suspicious user agent' };
    }

    return { suspicious: false };
  }

  private checkInjectionAttack(endpoint: string, method: string, userAgent: string): void {
    const suspiciousStrings = ['<script', 'javascript:', 'vbscript:', 'onload=', 'onerror=', 'select ', 'union ', 'insert ', 'update ', 'delete ', 'drop '];
    const combinedString = `${endpoint} ${method} ${userAgent}`.toLowerCase();

    for (const suspicious of suspiciousStrings) {
      if (combinedString.includes(suspicious)) {
        this.recordSecurityEvent(
          SecurityEventType.INJECTION_ATTACK,
          SecuritySeverity.HIGH,
          'injection_detection',
          {
            suspiciousString: suspicious,
            endpoint,
            method
          },
          {
            userAgent,
            resource: endpoint,
            action: method,
            outcome: 'blocked'
          }
        );
        break;
      }
    }
  }

  private checkBruteForceAttack(userId: string, ipAddress: string): void {
    const key = `failed_auth:${ipAddress}`;
    const now = Date.now();
    const attempts = this.rateLimitTracker.get(key) || [];

    // Add current attempt
    attempts.push({ timestamp: now });

    // Remove old attempts (last hour)
    const oneHourAgo = now - (60 * 60 * 1000);
    const recentAttempts = attempts.filter(attempt => attempt.timestamp > oneHourAgo);
    this.rateLimitTracker.set(key, recentAttempts);

    // Check threshold
    if (recentAttempts.length >= this.config.rateLimitThresholds.failed_auth_per_hour) {
      this.recordSecurityEvent(
        SecurityEventType.BRUTE_FORCE_ATTACK,
        SecuritySeverity.CRITICAL,
        'brute_force_detection',
        {
          attempts: recentAttempts.length,
          timeWindow: '1 hour'
        },
        {
          userId,
          ipAddress,
          outcome: 'blocked'
        }
      );
    }
  }

  private checkRateLimit(thresholdKey: string, identifier: string, action?: string): void {
    const key = `${thresholdKey}:${identifier}`;
    const now = Date.now();
    const requests = this.rateLimitTracker.get(key) || [];

    // Add current request
    requests.push({ timestamp: now, action });

    // Remove old requests (last minute)
    const oneMinuteAgo = now - (60 * 1000);
    const recentRequests = requests.filter(req => req.timestamp > oneMinuteAgo);
    this.rateLimitTracker.set(key, recentRequests);

    // Check threshold
    const threshold = this.config.rateLimitThresholds[thresholdKey];
    if (recentRequests.length >= threshold) {
      this.recordSecurityEvent(
        SecurityEventType.RATE_LIMIT_EXCEEDED,
        SecuritySeverity.MEDIUM,
        'rate_limit',
        {
          requests: recentRequests.length,
          threshold,
          timeWindow: '1 minute'
        },
        {
          resource: identifier,
          action,
          outcome: 'blocked'
        }
      );
    }
  }

  private updateUserBehaviorProfile(userId: string, behavior: Partial<UserBehaviorProfile>): void {
    const existing = this.userBehaviorProfiles.get(userId) || {
      userId,
      loginAttempts: 0,
      failedLogins: 0,
      lastLogin: null,
      lastIP: null,
      knownIPs: new Set(),
      usualLoginTimes: [],
      riskScore: 0
    };

    // Update profile
    Object.assign(existing, behavior);

    // Track known IPs
    if (behavior.lastIP) {
      existing.knownIPs.add(behavior.lastIP);
    }

    // Update risk score
    existing.riskScore = this.calculateRiskScore(existing);

    this.userBehaviorProfiles.set(userId, existing);
  }

  private calculateRiskScore(profile: UserBehaviorProfile): number {
    let score = 0;

    // Failed login attempts increase risk
    score += profile.failedLogins * 10;

    // Multiple IPs increase risk
    if (profile.knownIPs.size > 3) {
      score += (profile.knownIPs.size - 3) * 5;
    }

    // Unusual login times
    if (profile.lastLogin) {
      const hour = profile.lastLogin.getHours();
      if (hour < 6 || hour > 22) {
        score += 15; // Unusual hours
      }
    }

    return Math.min(score, 100);
  }

  private handleSecurityEvent(event: SecurityEvent): void {
    // Critical events require immediate action
    if (event.severity === SecuritySeverity.CRITICAL) {
      this.eventBus.emit('security:critical', event);
    }

    // Check for automated responses
    if (this.config.enableRealTimeMonitoring) {
      this.automatedResponse(event);
    }
  }

  private automatedResponse(event: SecurityEvent): void {
    switch (event.eventType) {
      case SecurityEventType.BRUTE_FORCE_ATTACK:
        this.blockIPAddress(event.ipAddress!, 'Brute force attack detected');
        break;
      case SecurityEventType.RATE_LIMIT_EXCEEDED:
        this.blockIPAddress(event.ipAddress!, 'Rate limit exceeded');
        break;
      case SecurityEventType.INJECTION_ATTACK:
        this.blockIPAddress(event.ipAddress!, 'Injection attack detected');
        break;
      case SecurityEventType.UNAUTHORIZED_ACCESS:
        this.notifySecurityTeam(event);
        break;
      case SecurityEventType.DATA_BREACH:
        this.triggerIncidentResponse(event);
        break;
    }
  }

  private blockIPAddress(ipAddress: string, reason: string): void {
    this.config.blockedIPs.push(ipAddress);
    
    this.recordSecurityEvent(
      SecurityEventType.SUSPICIOUS_ACTIVITY,
      SecuritySeverity.MEDIUM,
      'ip_blocking',
      {
        blockedIP: ipAddress,
        reason
      },
      {
        ipAddress,
        action: 'block',
        outcome: 'success'
      }
    );
  }

  private notifySecurityTeam(event: SecurityEvent): void {
    this.eventBus.emit('security:team_notification', {
      event,
      message: `Security alert: ${event.eventType} - ${event.severity}`,
      requiresImmediateAction: event.severity === SecuritySeverity.CRITICAL
    });
  }

  private triggerIncidentResponse(event: SecurityEvent): void {
    this.eventBus.emit('security:incident', {
      event,
      incidentId: this.generateIncidentId(),
      severity: event.severity,
      requiresImmediateAction: true,
      responsePlan: this.getResponsePlan(event.eventType)
    });
  }

  private getResponsePlan(eventType: SecurityEventType): string {
    const plans = {
      [SecurityEventType.DATA_BREACH]: 'immediate_isolation_and_forensics',
      [SecurityEventType.PRIVILEGE_ESCALATION]: 'immediate_revocation_and_investigation',
      [SecurityEventType.MALICIOUS_REQUEST]: 'block_and_scan',
      [SecurityEventType.BRUTE_FORCE_ATTACK]: 'block_ip_and_enhance_monitoring',
      [SecurityEventType.UNAUTHORIZED_ACCESS]: 'enhanced_monitoring_and_potential_block'
    };

    return plans[eventType] || 'investigate_and_monitor';
  }

  private performSecurityChecks(): void {
    // Check for anomalies in user behavior
    this.performAnomalyDetection();

    // Check system integrity
    this.performSystemIntegrityCheck();

    // Update threat intelligence
    if (this.config.enableThreatIntelligence) {
      this.updateThreatIntelligence();
    }
  }

  private performAnomalyDetection(): void {
    for (const [userId, profile] of this.userBehaviorProfiles) {
      if (profile.riskScore > 50) {
        this.recordSecurityEvent(
          SecurityEventType.ANOMALOUS_BEHAVIOR,
          SecuritySeverity.MEDIUM,
          'anomaly_detection',
          {
            riskScore: profile.riskScore,
            userId,
            reasons: this.getAnomalyReasons(profile)
          },
          {
            userId
          }
        );
      }
    }
  }

  private getAnomalyReasons(profile: UserBehaviorProfile): string[] {
    const reasons = [];

    if (profile.failedLogins > 5) {
      reasons.push('High failed login attempts');
    }

    if (profile.knownIPs.size > 5) {
      reasons.push('Multiple IP addresses used');
    }

    if (profile.riskScore > 70) {
      reasons.push('High risk score calculated');
    }

    return reasons;
  }

  private performSystemIntegrityCheck(): void {
    // This would check file integrity, configuration changes, etc.
    // For now, just log that check was performed
    this.logger.info('System integrity check completed', {
      component: 'security-monitoring',
      checkType: 'integrity'
    });
  }

  private updateThreatIntelligence(): void {
    // This would integrate with external threat intelligence feeds
    // For now, just log that update was performed
    this.logger.info('Threat intelligence update completed', {
      component: 'security-monitoring',
      checkType: 'threat_intelligence'
    });
  }

  private cleanupOldData(): void {
    const cutoffTime = Date.now() - (this.config.auditLogRetention * 24 * 60 * 60 * 1000);

    // Clean old security events
    this.securityEvents = this.securityEvents.filter(event => 
      new Date(event.timestamp).getTime() > cutoffTime
    );

    // Clean old rate limit data
    for (const [key, entries] of this.rateLimitTracker) {
      const recentEntries = entries.filter(entry => entry.timestamp > cutoffTime);
      if (recentEntries.length > 0) {
        this.rateLimitTracker.set(key, recentEntries);
      } else {
        this.rateLimitTracker.delete(key);
      }
    }
  }

  // Utility methods
  private generateEventId(): string {
    return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateIncidentId(): string {
    return `inc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventTags(eventType: SecurityEventType, severity: SecuritySeverity): string[] {
    const tags = [eventType, severity];

    // Add additional tags based on event type
    if (eventType.includes('attack')) {
      tags.push('attack');
    }

    if (eventType.includes('failure')) {
      tags.push('failure');
    }

    if (severity === SecuritySeverity.CRITICAL) {
      tags.push('critical');
    }

    return tags;
  }

  // Public API methods
  getSecurityEvents(filters?: {
    eventType?: SecurityEventType;
    severity?: SecuritySeverity;
    startTime?: Date;
    endTime?: Date;
    userId?: string;
  }): SecurityEvent[] {
    let events = [...this.securityEvents];

    if (filters) {
      if (filters.eventType) {
        events = events.filter(event => event.eventType === filters.eventType);
      }

      if (filters.severity) {
        events = events.filter(event => event.severity === filters.severity);
      }

      if (filters.startTime) {
        events = events.filter(event => new Date(event.timestamp) >= filters.startTime);
      }

      if (filters.endTime) {
        events = events.filter(event => new Date(event.timestamp) <= filters.endTime);
      }

      if (filters.userId) {
        events = events.filter(event => event.userId === filters.userId);
      }
    }

    return events.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  getUserBehaviorProfile(userId: string): UserBehaviorProfile | undefined {
    return this.userBehaviorProfiles.get(userId);
  }

  getSecurityMetrics(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    criticalEvents: SecurityEvent[];
    blockedIPs: string[];
  } {
    const eventsByType: Record<string, number> = {};
    const eventsBySeverity: Record<string, number> = {};

    for (const event of this.securityEvents) {
      eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;
    }

    return {
      totalEvents: this.securityEvents.length,
      eventsByType,
      eventsBySeverity,
      criticalEvents: this.securityEvents.filter(event => event.severity === SecuritySeverity.CRITICAL),
      blockedIPs: this.config.blockedIPs
    };
  }
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

interface RateLimitEntry {
  timestamp: number;
  action?: string;
}

export default SecurityMonitoring;