import { EventEmitter } from 'events';
import { Metrics } from '../notifications/metrics';
import { CentralizedLogging } from './centralized-logging';
import { SecurityMonitoring } from './security-monitoring';
export interface AutomationRule {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    trigger: TriggerCondition;
    actions: AutomationAction[];
    cooldownPeriod: number;
    maxExecutionsPerHour: number;
    lastExecuted?: number;
    executionCount: number;
}
export interface TriggerCondition {
    metricName: string;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    threshold: number;
    duration: number;
    labels?: Record<string, string>;
}
export interface AutomationAction {
    type: 'restart_service' | 'scale_up' | 'scale_down' | 'clear_cache' | 'block_ip' | 'send_alert' | 'run_script' | 'enable_maintenance_mode';
    parameters: Record<string, any>;
    timeout?: number;
}
export interface HealthCheck {
    id: string;
    name: string;
    endpoint: string;
    method: 'GET' | 'POST' | 'PUT';
    expectedStatus: number;
    timeout: number;
    interval: number;
    retries: number;
}
export interface SelfHealingConfig {
    enableAutomation: boolean;
    enableSelfHealing: boolean;
    healthChecks: HealthCheck[];
    automationRules: AutomationRule[];
    maintenanceWindows: {
        startHour: number;
        endHour: number;
        daysOfWeek: number[];
    };
    escalationPolicies: {
        critical: {
            notifyChannels: string[];
            autoRemediation: boolean;
            escalationDelay: number;
        };
        warning: {
            notifyChannels: string[];
            autoRemediation: boolean;
            escalationDelay: number;
        };
    };
}
export declare class AutomationSelfHealing {
    private config;
    private eventBus;
    private metrics;
    private logger;
    private securityMonitor;
    private activeHealing;
    private healthCheckResults;
    private automationTimers;
    constructor(config: SelfHealingConfig, eventBus: EventEmitter, metrics: Metrics, logger: CentralizedLogging, securityMonitor: SecurityMonitoring);
    private initializeAutomation;
    private setupEventListeners;
    private startHealthChecks;
    private performHealthCheck;
    private triggerHealthCheckAutomation;
    private startAutomationMonitoring;
    private evaluateAutomationRules;
    private evaluateTriggerCondition;
    private getMetricValue;
    private getHealthCheckMetric;
    private executeAutomationRule;
    private executeAutomationAction;
    private restartService;
    private scaleService;
    private clearCache;
    private blockIPAddress;
    private sendAlert;
    private runScript;
    private enableMaintenanceMode;
    private disableMaintenanceMode;
    private handleSecurityEvent;
    private handleMetricAlert;
    private handleServiceFailure;
    private handleSystemEvent;
    private performPeriodicChecks;
    private isInMaintenanceWindow;
    private cleanupAutomationData;
    getActiveHealing(): Array<{
        id: string;
        startTime: number;
        action: string;
    }>;
    getHealthCheckResults(): Map<string, any>;
    getAutomationRules(): AutomationRule[];
    updateAutomationRule(ruleId: string, updates: Partial<AutomationRule>): void;
    addAutomationRule(rule: AutomationRule): void;
    removeAutomationRule(ruleId: string): void;
    destroy(): void;
}
export default AutomationSelfHealing;
//# sourceMappingURL=automation-self-healing.d.ts.map