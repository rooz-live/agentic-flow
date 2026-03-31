#!/usr/bin/env tsx
/**
 * Regulatory Compliance Management System
 *
 * Implements comprehensive compliance features:
 * - Trade reporting and audit trails
 * - Position limits and margin requirements
 * - Market manipulation detection and prevention
 * - Best execution practices and compliance monitoring
 * - Data privacy and security standards
 * - Regulatory rule engine and validation
 * - Compliance scoring and risk assessment
 */
import { EventEmitter } from 'events';
import { TradingSignal } from './trading_engine';
export interface ComplianceRule {
    id: string;
    name: string;
    description: string;
    category: 'TRADING' | 'RISK' | 'REPORTING' | 'DATA' | 'SECURITY';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    enabled: boolean;
    parameters: Record<string, any>;
    checkFunction: (context: ComplianceContext) => ComplianceCheckResult;
}
export interface ComplianceContext {
    userId: string;
    accountId: string;
    symbol: string;
    action: 'BUY' | 'SELL' | 'HOLD';
    quantity: number;
    price: number;
    timestamp: string;
    portfolioValue: number;
    currentPosition: number;
    dailyVolume: number;
    accountType: 'MARGIN' | 'CASH' | 'RETIREMENT';
    jurisdiction: string;
    userRole: string;
    permissions: string[];
}
export interface ComplianceCheckResult {
    ruleId: string;
    passed: boolean;
    score: number;
    message: string;
    details: Record<string, any>;
    recommendations: string[];
    blocked: boolean;
}
export interface ComplianceReport {
    id: string;
    timestamp: string;
    userId: string;
    accountId: string;
    period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
    overallScore: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    ruleResults: ComplianceCheckResult[];
    summary: {
        totalChecks: number;
        passedChecks: number;
        failedChecks: number;
        blockedTrades: number;
        alertsGenerated: number;
    };
    recommendations: string[];
    auditTrail: AuditEntry[];
}
export interface AuditEntry {
    id: string;
    timestamp: string;
    userId: string;
    action: string;
    resource: string;
    details: Record<string, any>;
    ipAddress: string;
    userAgent: string;
    outcome: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
    complianceScore: number;
    riskLevel: string;
}
export interface PositionLimit {
    symbol: string;
    maxPosition: number;
    maxNotional: number;
    maxDailyTrades: number;
    maxVolume: number;
    concentrationLimit: number;
    leverageLimit: number;
    marginRequirement: number;
    restricted: boolean;
    restrictions: string[];
}
export interface ComplianceAlert {
    id: string;
    type: 'VIOLATION' | 'SUSPICIOUS' | 'MANIPULATION' | 'LIMIT_EXCEEDED' | 'DATA_BREACH';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    title: string;
    description: string;
    userId: string;
    symbol?: string;
    timestamp: string;
    details: Record<string, any>;
    autoResolved: boolean;
    resolutionRequired: boolean;
    escalationLevel: number;
}
export interface ComplianceConfig {
    jurisdiction: string;
    accountType: 'MARGIN' | 'CASH' | 'RETIREMENT';
    riskTolerance: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
    autoBlockViolations: boolean;
    requireApprovalFor: string[];
    reportingFrequency: 'REAL_TIME' | 'DAILY' | 'WEEKLY';
    auditRetention: number;
    dataEncryption: boolean;
    gdprCompliance: boolean;
    soxCompliance: boolean;
    miFIDCompliance: boolean;
}
export declare class ComplianceManager extends EventEmitter {
    private goalieDir;
    private config;
    private rules;
    private positionLimits;
    private auditTrail;
    private alerts;
    private complianceScores;
    constructor(config?: Partial<ComplianceConfig>);
    /**
     * Validate trading signal for compliance
     */
    validateSignal(signal: TradingSignal): Promise<{
        approved: boolean;
        score: number;
        riskCategory: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
        reason?: string;
        violations: ComplianceCheckResult[];
    }>;
    /**
     * Validate trade execution
     */
    validateExecution(signal: TradingSignal, executionPrice: number, executionQuantity: number): Promise<{
        approved: boolean;
        score: number;
        reason?: string;
        violations: ComplianceCheckResult[];
    }>;
    /**
     * Check position limits
     */
    checkPositionLimits(symbol: string, quantity: number, price: number): ComplianceCheckResult;
    /**
     * Check market manipulation patterns
     */
    checkMarketManipulation(context: ComplianceContext): ComplianceCheckResult;
    /**
     * Check best execution practices
     */
    checkBestExecution(context: ComplianceContext): ComplianceCheckResult;
    /**
     * Check data privacy and security
     */
    checkDataPrivacy(context: ComplianceContext): ComplianceCheckResult;
    /**
     * Generate compliance report
     */
    generateComplianceReport(userId: string, accountId: string, period?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY'): ComplianceReport;
    /**
     * Initialize compliance rules
     */
    private initializeRules;
    /**
     * Check margin requirements
     */
    private checkMarginRequirements;
    /**
     * Check trading hours
     */
    private checkTradingHours;
    /**
     * Create compliance context from signal
     */
    private createComplianceContext;
    /**
     * Check for wash sale
     */
    private isWashSale;
    /**
     * Check for spoofing
     */
    private isSpoofing;
    /**
     * Check for layering
     */
    private isLayering;
    /**
     * Check for excessive trading
     */
    private isExcessiveTrading;
    /**
     * Check if rush hour
     */
    private isRushHour;
    /**
     * Check if EU user
     */
    private isEUUser;
    /**
     * Check for consent
     */
    private hasConsent;
    /**
     * Check for suspicious access
     */
    private isSuspiciousAccess;
    /**
     * Get market price
     */
    private getMarketPrice;
    /**
     * Get average volume
     */
    private getAverageVolume;
    /**
     * Get current position
     */
    private getCurrentPosition;
    /**
     * Get portfolio value
     */
    private getPortfolioValue;
    /**
     * Get daily volume
     */
    private getDailyVolume;
    /**
     * Get available margin
     */
    private getAvailableMargin;
    /**
     * Get recent trades
     */
    private getRecentTrades;
    /**
     * Get recent orders
     */
    private getRecentOrders;
    /**
     * Get daily trades
     */
    private getDailyTrades;
    /**
     * Get average daily trades
     */
    private getAverageDailyTrades;
    /**
     * Get recent access
     */
    private getRecentAccess;
    /**
     * Get trading hours
     */
    private getTradingHours;
    /**
     * Check if within trading hours
     */
    private isWithinTradingHours;
    /**
     * Calculate overall compliance score
     */
    private calculateOverallComplianceScore;
    /**
     * Calculate risk level
     */
    private calculateRiskLevel;
    /**
     * Generate rule results
     */
    private generateRuleResults;
    /**
     * Generate compliance recommendations
     */
    private generateComplianceRecommendations;
    /**
     * Get alerts for period
     */
    private getAlertsForPeriod;
    /**
     * Get audit entries for period
     */
    private getAuditEntriesForPeriod;
    /**
     * Update compliance score
     */
    private updateComplianceScore;
    /**
     * Create compliance alert
     */
    private createComplianceAlert;
    /**
     * Add audit entry
     */
    private addAuditEntry;
    /**
     * Load position limits
     */
    private loadPositionLimits;
    /**
     * Load audit trail
     */
    private loadAuditTrail;
    /**
     * Save compliance report
     */
    private saveComplianceReport;
    /**
     * Log alert
     */
    private logAlert;
    /**
     * Log audit entry
     */
    private logAuditEntry;
}
export default ComplianceManager;
//# sourceMappingURL=compliance_manager.d.ts.map