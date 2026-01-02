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
import * as fs from 'fs';
import * as path from 'path';
export class ComplianceManager extends EventEmitter {
    goalieDir;
    config;
    rules = new Map();
    positionLimits = new Map();
    auditTrail = [];
    alerts = [];
    complianceScores = new Map();
    constructor(config) {
        super();
        this.goalieDir = process.env.GOALIE_DIR || path.join(process.cwd(), '.goalie');
        this.config = {
            jurisdiction: 'US',
            accountType: 'MARGIN',
            riskTolerance: 'MODERATE',
            autoBlockViolations: true,
            requireApprovalFor: ['LARGE_ORDERS', 'MARGIN_TRADES', 'OPTIONS'],
            reportingFrequency: 'REAL_TIME',
            auditRetention: 2555, // 7 years
            dataEncryption: true,
            gdprCompliance: true,
            soxCompliance: true,
            miFIDCompliance: false,
            ...config,
        };
        this.initializeRules();
        this.loadPositionLimits();
        this.loadAuditTrail();
        if (!fs.existsSync(this.goalieDir)) {
            fs.mkdirSync(this.goalieDir, { recursive: true });
        }
    }
    /**
     * Validate trading signal for compliance
     */
    async validateSignal(signal) {
        const context = this.createComplianceContext(signal);
        const results = [];
        let overallScore = 100;
        let approved = true;
        let highestRiskLevel = 'LOW';
        // Run all compliance checks
        for (const [ruleId, rule] of this.rules) {
            if (!rule.enabled)
                continue;
            try {
                const result = rule.checkFunction(context);
                results.push(result);
                if (!result.passed) {
                    approved = false;
                    overallScore = Math.min(overallScore, result.score);
                    // Update risk level based on rule severity
                    if (rule.severity === 'CRITICAL' || highestRiskLevel === 'CRITICAL') {
                        highestRiskLevel = 'CRITICAL';
                    }
                    else if (rule.severity === 'HIGH' && highestRiskLevel !== 'CRITICAL') {
                        highestRiskLevel = 'HIGH';
                    }
                    else if (rule.severity === 'MEDIUM' && highestRiskLevel === 'LOW') {
                        highestRiskLevel = 'MEDIUM';
                    }
                }
            }
            catch (error) {
                console.error(`❌ Compliance rule ${ruleId} check failed:`, error);
            }
        }
        // Create audit entry
        const auditEntry = {
            id: `audit_${Date.now()}_${Math.random()}`,
            timestamp: new Date().toISOString(),
            userId: context.userId,
            action: `SIGNAL_VALIDATION_${signal.action}`,
            resource: signal.symbol,
            details: {
                signalId: signal.id,
                strategy: signal.strategy,
                confidence: signal.confidence,
                complianceResults: results,
            },
            ipAddress: 'SYSTEM',
            userAgent: 'TRADING_ENGINE',
            outcome: approved ? 'SUCCESS' : 'BLOCKED',
            complianceScore: overallScore,
            riskLevel: highestRiskLevel,
        };
        this.addAuditEntry(auditEntry);
        // Generate alerts for violations
        const violations = results.filter(r => !r.passed);
        for (const violation of violations) {
            this.createComplianceAlert('VIOLATION', 'HIGH', `Compliance Violation: ${violation.message}`, context.userId, signal.symbol, violation.details);
        }
        // Update compliance score
        this.updateComplianceScore(context.userId, overallScore);
        return {
            approved,
            score: overallScore,
            riskCategory: highestRiskLevel,
            reason: violations.length > 0 ? violations[0].message : undefined,
            violations,
        };
    }
    /**
     * Validate trade execution
     */
    async validateExecution(signal, executionPrice, executionQuantity) {
        const context = this.createComplianceContext(signal);
        context.price = executionPrice;
        context.quantity = executionQuantity;
        return this.validateSignal(signal);
    }
    /**
     * Check position limits
     */
    checkPositionLimits(symbol, quantity, price) {
        const limit = this.positionLimits.get(symbol);
        if (!limit) {
            return {
                ruleId: 'position_limit',
                passed: true,
                score: 100,
                message: 'No position limits defined',
                details: {},
                recommendations: [],
                blocked: false,
            };
        }
        const notionalValue = quantity * price;
        const currentPosition = this.getCurrentPosition(symbol);
        const newPosition = currentPosition + quantity;
        const violations = [];
        let score = 100;
        // Check maximum position
        if (Math.abs(newPosition) > limit.maxPosition) {
            violations.push(`Position size ${Math.abs(newPosition)} exceeds limit ${limit.maxPosition}`);
            score -= 20;
        }
        // Check notional value
        if (notionalValue > limit.maxNotional) {
            violations.push(`Notional value $${notionalValue.toLocaleString()} exceeds limit $${limit.maxNotional.toLocaleString()}`);
            score -= 25;
        }
        // Check concentration limit
        const portfolioValue = this.getPortfolioValue();
        const concentration = notionalValue / portfolioValue;
        if (concentration > limit.concentrationLimit) {
            violations.push(`Concentration ${(concentration * 100).toFixed(1)}% exceeds limit ${(limit.concentrationLimit * 100).toFixed(1)}%`);
            score -= 15;
        }
        // Check if symbol is restricted
        if (limit.restricted) {
            violations.push(`Symbol ${symbol} is restricted: ${limit.restrictions.join(', ')}`);
            score -= 50;
        }
        return {
            ruleId: 'position_limit',
            passed: violations.length === 0,
            score,
            message: violations.join('; '),
            details: {
                currentPosition,
                newPosition,
                notionalValue,
                concentration,
                limits: limit,
            },
            recommendations: violations.length > 0 ? [
                'Consider reducing position size',
                'Check portfolio concentration',
                'Review symbol restrictions',
            ] : [],
            blocked: violations.length > 0 && this.config.autoBlockViolations,
        };
    }
    /**
     * Check market manipulation patterns
     */
    checkMarketManipulation(context) {
        const violations = [];
        let score = 100;
        // Check for wash sales
        if (this.isWashSale(context)) {
            violations.push('Potential wash sale detected');
            score -= 40;
        }
        // Check for spoofing
        if (this.isSpoofing(context)) {
            violations.push('Potential order spoofing detected');
            score -= 35;
        }
        // Check for layering
        if (this.isLayering(context)) {
            violations.push('Potential layering detected');
            score -= 30;
        }
        // Check for excessive trading
        if (this.isExcessiveTrading(context)) {
            violations.push('Excessive trading pattern detected');
            score -= 25;
        }
        return {
            ruleId: 'market_manipulation',
            passed: violations.length === 0,
            score,
            message: violations.join('; '),
            details: {
                washSale: this.isWashSale(context),
                spoofing: this.isSpoofing(context),
                layering: this.isLayering(context),
                excessiveTrading: this.isExcessiveTrading(context),
            },
            recommendations: violations.length > 0 ? [
                'Review trading patterns',
                'Implement surveillance measures',
                'Consider manual review',
            ] : [],
            blocked: violations.length > 0 && this.config.autoBlockViolations,
        };
    }
    /**
     * Check best execution practices
     */
    checkBestExecution(context) {
        const violations = [];
        let score = 100;
        // Check for reasonable price
        const marketPrice = this.getMarketPrice(context.symbol);
        const priceDeviation = Math.abs(context.price - marketPrice) / marketPrice;
        if (priceDeviation > 0.05) { // 5% deviation
            violations.push(`Price deviation ${(priceDeviation * 100).toFixed(1)}% exceeds acceptable range`);
            score -= 20;
        }
        // Check for reasonable size
        const avgVolume = this.getAverageVolume(context.symbol);
        const volumeRatio = context.quantity / avgVolume;
        if (volumeRatio > 0.1) { // More than 10% of average volume
            violations.push(`Order size ${(volumeRatio * 100).toFixed(1)}% of average volume may impact market`);
            score -= 15;
        }
        // Check for time-based patterns
        if (this.isRushHour(context)) {
            violations.push('Order placed during high-volatility period');
            score -= 10;
        }
        return {
            ruleId: 'best_execution',
            passed: violations.length === 0,
            score,
            message: violations.join('; '),
            details: {
                priceDeviation,
                volumeRatio,
                marketPrice,
                avgVolume,
                rushHour: this.isRushHour(context),
            },
            recommendations: violations.length > 0 ? [
                'Use limit orders for better execution',
                'Consider breaking large orders',
                'Avoid trading during high volatility',
            ] : [],
            blocked: false, // Best execution violations typically don't block
        };
    }
    /**
     * Check data privacy and security
     */
    checkDataPrivacy(context) {
        const violations = [];
        let score = 100;
        // Check for data encryption
        if (!this.config.dataEncryption) {
            violations.push('Data encryption not enabled');
            score -= 30;
        }
        // Check for GDPR compliance if applicable
        if (this.config.gdprCompliance && this.isEUUser(context)) {
            if (!this.hasConsent(context)) {
                violations.push('Missing GDPR consent');
                score -= 25;
            }
        }
        // Check for data access patterns
        if (this.isSuspiciousAccess(context)) {
            violations.push('Suspicious data access pattern detected');
            score -= 20;
        }
        return {
            ruleId: 'data_privacy',
            passed: violations.length === 0,
            score,
            message: violations.join('; '),
            details: {
                encryptionEnabled: this.config.dataEncryption,
                gdprApplicable: this.config.gdprCompliance && this.isEUUser(context),
                hasConsent: this.hasConsent(context),
                suspiciousAccess: this.isSuspiciousAccess(context),
            },
            recommendations: violations.length > 0 ? [
                'Enable data encryption',
                'Update privacy policies',
                'Review access logs',
            ] : [],
            blocked: violations.length > 0,
        };
    }
    /**
     * Generate compliance report
     */
    generateComplianceReport(userId, accountId, period = 'MONTHLY') {
        const reportId = `report_${Date.now()}_${Math.random()}`;
        const timestamp = new Date().toISOString();
        // Get audit entries for period
        const auditEntries = this.getAuditEntriesForPeriod(userId, period);
        // Calculate overall score
        const overallScore = this.calculateOverallComplianceScore(userId);
        const riskLevel = this.calculateRiskLevel(overallScore);
        // Generate rule results
        const ruleResults = this.generateRuleResults(userId, period);
        // Calculate summary
        const totalChecks = ruleResults.length;
        const passedChecks = ruleResults.filter(r => r.passed).length;
        const failedChecks = totalChecks - passedChecks;
        const blockedTrades = auditEntries.filter(e => e.outcome === 'BLOCKED').length;
        const alertsGenerated = this.getAlertsForPeriod(userId, period).length;
        // Generate recommendations
        const recommendations = this.generateComplianceRecommendations(overallScore, riskLevel);
        const report = {
            id: reportId,
            timestamp,
            userId,
            accountId,
            period,
            overallScore,
            riskLevel,
            ruleResults,
            summary: {
                totalChecks,
                passedChecks,
                failedChecks,
                blockedTrades,
                alertsGenerated,
            },
            recommendations,
            auditTrail: auditEntries,
        };
        // Save report
        this.saveComplianceReport(report);
        this.emit('report_generated', report);
        return report;
    }
    /**
     * Initialize compliance rules
     */
    initializeRules() {
        // Position limits rule
        this.rules.set('position_limits', {
            id: 'position_limits',
            name: 'Position Limits',
            description: 'Enforce position size and concentration limits',
            category: 'RISK',
            severity: 'HIGH',
            enabled: true,
            parameters: {},
            checkFunction: (context) => this.checkPositionLimits(context.symbol, context.quantity, context.price),
        });
        // Market manipulation rule
        this.rules.set('market_manipulation', {
            id: 'market_manipulation',
            name: 'Market Manipulation Detection',
            description: 'Detect and prevent market manipulation patterns',
            category: 'TRADING',
            severity: 'CRITICAL',
            enabled: true,
            parameters: {},
            checkFunction: (context) => this.checkMarketManipulation(context),
        });
        // Best execution rule
        this.rules.set('best_execution', {
            id: 'best_execution',
            name: 'Best Execution Practices',
            description: 'Ensure best execution practices are followed',
            category: 'TRADING',
            severity: 'MEDIUM',
            enabled: true,
            parameters: {},
            checkFunction: (context) => this.checkBestExecution(context),
        });
        // Data privacy rule
        this.rules.set('data_privacy', {
            id: 'data_privacy',
            name: 'Data Privacy and Security',
            description: 'Ensure data privacy and security standards',
            category: 'DATA',
            severity: 'HIGH',
            enabled: true,
            parameters: {},
            checkFunction: (context) => this.checkDataPrivacy(context),
        });
        // Margin requirements rule
        this.rules.set('margin_requirements', {
            id: 'margin_requirements',
            name: 'Margin Requirements',
            description: 'Ensure margin requirements are met',
            category: 'RISK',
            severity: 'HIGH',
            enabled: this.config.accountType === 'MARGIN',
            parameters: {},
            checkFunction: (context) => this.checkMarginRequirements(context),
        });
        // Trading hours rule
        this.rules.set('trading_hours', {
            id: 'trading_hours',
            name: 'Trading Hours Compliance',
            description: 'Ensure trades occur during allowed hours',
            category: 'TRADING',
            severity: 'MEDIUM',
            enabled: true,
            parameters: {},
            checkFunction: (context) => this.checkTradingHours(context),
        });
    }
    /**
     * Check margin requirements
     */
    checkMarginRequirements(context) {
        if (this.config.accountType !== 'MARGIN') {
            return {
                ruleId: 'margin_requirements',
                passed: true,
                score: 100,
                message: 'Not a margin account',
                details: {},
                recommendations: [],
                blocked: false,
            };
        }
        const violations = [];
        let score = 100;
        const notionalValue = context.quantity * context.price;
        const marginRequirement = notionalValue * 0.5; // 50% margin requirement
        const availableMargin = this.getAvailableMargin(context.userId);
        if (marginRequirement > availableMargin) {
            violations.push(`Insufficient margin: required $${marginRequirement.toLocaleString()}, available $${availableMargin.toLocaleString()}`);
            score -= 40;
        }
        return {
            ruleId: 'margin_requirements',
            passed: violations.length === 0,
            score,
            message: violations.join('; '),
            details: {
                notionalValue,
                marginRequirement,
                availableMargin,
            },
            recommendations: violations.length > 0 ? [
                'Add funds to account',
                'Reduce position size',
                'Consider cash account',
            ] : [],
            blocked: violations.length > 0 && this.config.autoBlockViolations,
        };
    }
    /**
     * Check trading hours
     */
    checkTradingHours(context) {
        const violations = [];
        let score = 100;
        const tradeTime = new Date(context.timestamp);
        const tradingHours = this.getTradingHours(context.symbol);
        if (!this.isWithinTradingHours(tradeTime, tradingHours)) {
            violations.push('Trade outside allowed trading hours');
            score -= 20;
        }
        return {
            ruleId: 'trading_hours',
            passed: violations.length === 0,
            score,
            message: violations.join('; '),
            details: {
                tradeTime,
                tradingHours,
            },
            recommendations: violations.length > 0 ? [
                'Check market trading hours',
                'Use limit orders for after-hours',
                'Review trading schedule',
            ] : [],
            blocked: false,
        };
    }
    /**
     * Create compliance context from signal
     */
    createComplianceContext(signal) {
        return {
            userId: 'SYSTEM_USER', // Would get from authentication
            accountId: 'MAIN_ACCOUNT',
            symbol: signal.symbol,
            action: signal.action,
            quantity: signal.quantity,
            price: signal.price,
            timestamp: signal.timestamp,
            portfolioValue: this.getPortfolioValue(),
            currentPosition: this.getCurrentPosition(signal.symbol),
            dailyVolume: this.getDailyVolume(signal.symbol),
            accountType: this.config.accountType,
            jurisdiction: this.config.jurisdiction,
            userRole: 'TRADER',
            permissions: ['TRADE', 'ANALYZE'],
        };
    }
    /**
     * Check for wash sale
     */
    isWashSale(context) {
        // Simplified wash sale detection
        const recentTrades = this.getRecentTrades(context.symbol, 30); // Last 30 days
        const sameSymbolTrades = recentTrades.filter(t => t.symbol === context.symbol &&
            t.action === 'SELL' &&
            context.action === 'BUY');
        return sameSymbolTrades.length > 0;
    }
    /**
     * Check for spoofing
     */
    isSpoofing(context) {
        // Simplified spoofing detection
        const recentOrders = this.getRecentOrders(context.symbol, 60); // Last 60 minutes
        const cancelledOrders = recentOrders.filter(o => o.status === 'CANCELLED');
        // High rate of cancelled orders may indicate spoofing
        return cancelledOrders.length > 10;
    }
    /**
     * Check for layering
     */
    isLayering(context) {
        // Simplified layering detection
        const recentOrders = this.getRecentOrders(context.symbol, 30); // Last 30 minutes
        const smallOrders = recentOrders.filter(o => o.quantity < context.quantity * 0.5);
        // Multiple small orders followed by large order may indicate layering
        return smallOrders.length > 5;
    }
    /**
     * Check for excessive trading
     */
    isExcessiveTrading(context) {
        const dailyTrades = this.getDailyTrades(context.userId);
        const avgDailyTrades = this.getAverageDailyTrades(context.userId);
        return dailyTrades > avgDailyTrades * 3; // 3x average
    }
    /**
     * Check if rush hour
     */
    isRushHour(context) {
        const tradeTime = new Date(context.timestamp);
        const hour = tradeTime.getHours();
        // Market open and close hours (simplified)
        return (hour >= 9 && hour <= 10) || (hour >= 15 && hour <= 16);
    }
    /**
     * Check if EU user
     */
    isEUUser(context) {
        // Simplified EU user detection
        return context.jurisdiction === 'EU' || context.jurisdiction === 'UK';
    }
    /**
     * Check for consent
     */
    hasConsent(context) {
        // Simplified consent check
        return true; // Would check actual consent records
    }
    /**
     * Check for suspicious access
     */
    isSuspiciousAccess(context) {
        // Simplified suspicious access detection
        const recentAccess = this.getRecentAccess(context.userId, 60); // Last 60 minutes
        return recentAccess.length > 20; // More than 20 accesses in hour
    }
    /**
     * Get market price
     */
    getMarketPrice(symbol) {
        // Simplified - would get from market data
        return 100; // Default price
    }
    /**
     * Get average volume
     */
    getAverageVolume(symbol) {
        // Simplified - would get from market data
        return 1000000; // Default volume
    }
    /**
     * Get current position
     */
    getCurrentPosition(symbol) {
        // Simplified - would get from portfolio
        return 0;
    }
    /**
     * Get portfolio value
     */
    getPortfolioValue() {
        // Simplified - would get from portfolio
        return 1000000; // $1M default
    }
    /**
     * Get daily volume
     */
    getDailyVolume(symbol) {
        // Simplified - would get from market data
        return 5000000; // Default daily volume
    }
    /**
     * Get available margin
     */
    getAvailableMargin(userId) {
        // Simplified - would get from account
        return 100000; // $100K available margin
    }
    /**
     * Get recent trades
     */
    getRecentTrades(symbol, days) {
        // Simplified - would get from trade history
        return [];
    }
    /**
     * Get recent orders
     */
    getRecentOrders(symbol, minutes) {
        // Simplified - would get from order history
        return [];
    }
    /**
     * Get daily trades
     */
    getDailyTrades(userId) {
        // Simplified - would get from trade history
        return 5; // Default 5 daily trades
    }
    /**
     * Get average daily trades
     */
    getAverageDailyTrades(userId) {
        // Simplified - would calculate from history
        return 3; // Default 3 average daily trades
    }
    /**
     * Get recent access
     */
    getRecentAccess(userId, minutes) {
        // Simplified - would get from access logs
        return [];
    }
    /**
     * Get trading hours
     */
    getTradingHours(symbol) {
        // Simplified trading hours
        return {
            open: '09:30',
            close: '16:00',
        };
    }
    /**
     * Check if within trading hours
     */
    isWithinTradingHours(tradeTime, tradingHours) {
        const [openHour, openMin] = tradingHours.open.split(':').map(Number);
        const [closeHour, closeMin] = tradingHours.close.split(':').map(Number);
        const tradeHour = tradeTime.getHours();
        const tradeMin = tradeTime.getMinutes();
        const tradeMinutes = tradeHour * 60 + tradeMin;
        const openMinutes = openHour * 60 + openMin;
        const closeMinutes = closeHour * 60 + closeMin;
        return tradeMinutes >= openMinutes && tradeMinutes <= closeMinutes;
    }
    /**
     * Calculate overall compliance score
     */
    calculateOverallComplianceScore(userId) {
        const userScores = Array.from(this.complianceScores.entries())
            .filter(([id]) => id.includes(userId))
            .map(([, score]) => score);
        if (userScores.length === 0)
            return 100;
        return userScores.reduce((sum, score) => sum + score, 0) / userScores.length;
    }
    /**
     * Calculate risk level
     */
    calculateRiskLevel(score) {
        if (score >= 90)
            return 'LOW';
        if (score >= 75)
            return 'MEDIUM';
        if (score >= 60)
            return 'HIGH';
        return 'CRITICAL';
    }
    /**
     * Generate rule results
     */
    generateRuleResults(userId, period) {
        // Simplified - would calculate actual rule results
        return [
            {
                ruleId: 'position_limits',
                passed: true,
                score: 95,
                message: 'All position limits within acceptable range',
                details: {},
                recommendations: [],
                blocked: false,
            },
            {
                ruleId: 'market_manipulation',
                passed: true,
                score: 98,
                message: 'No manipulation patterns detected',
                details: {},
                recommendations: [],
                blocked: false,
            },
        ];
    }
    /**
     * Generate compliance recommendations
     */
    generateComplianceRecommendations(score, riskLevel) {
        const recommendations = [];
        if (score < 80) {
            recommendations.push('Review trading practices and policies');
            recommendations.push('Consider additional compliance training');
        }
        if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
            recommendations.push('Immediate review required');
            recommendations.push('Consider reducing trading activity');
        }
        return recommendations;
    }
    /**
     * Get alerts for period
     */
    getAlertsForPeriod(userId, period) {
        const days = period === 'DAILY' ? 1 : period === 'WEEKLY' ? 7 : period === 'MONTHLY' ? 30 : 90;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        return this.alerts.filter(alert => alert.userId === userId &&
            new Date(alert.timestamp) > cutoffDate);
    }
    /**
     * Get audit entries for period
     */
    getAuditEntriesForPeriod(userId, period) {
        const days = period === 'DAILY' ? 1 : period === 'WEEKLY' ? 7 : period === 'MONTHLY' ? 30 : 90;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        return this.auditTrail.filter(entry => entry.userId === userId &&
            new Date(entry.timestamp) > cutoffDate);
    }
    /**
     * Update compliance score
     */
    updateComplianceScore(userId, score) {
        const currentScore = this.complianceScores.get(userId) || 100;
        const newScore = (currentScore * 0.8) + (score * 0.2); // Weighted average
        this.complianceScores.set(userId, newScore);
    }
    /**
     * Create compliance alert
     */
    createComplianceAlert(type, severity, title, userId, symbol, details = {}) {
        const alert = {
            id: `alert_${Date.now()}_${Math.random()}`,
            type,
            severity,
            title,
            description: title,
            userId,
            symbol,
            timestamp: new Date().toISOString(),
            details,
            autoResolved: false,
            resolutionRequired: severity === 'CRITICAL',
            escalationLevel: severity === 'CRITICAL' ? 3 : severity === 'HIGH' ? 2 : 1,
        };
        this.alerts.push(alert);
        this.emit('compliance_alert', alert);
        this.logAlert(alert);
    }
    /**
     * Add audit entry
     */
    addAuditEntry(entry) {
        this.auditTrail.push(entry);
        // Keep only entries within retention period
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.config.auditRetention);
        this.auditTrail = this.auditTrail.filter(e => new Date(e.timestamp) > cutoffDate);
        this.logAuditEntry(entry);
    }
    /**
     * Load position limits
     */
    loadPositionLimits() {
        try {
            const limitsFile = path.join(this.goalieDir, 'position_limits.json');
            if (fs.existsSync(limitsFile)) {
                const limitsData = JSON.parse(fs.readFileSync(limitsFile, 'utf8'));
                for (const [symbol, limit] of Object.entries(limitsData)) {
                    this.positionLimits.set(symbol, limit);
                }
            }
        }
        catch (error) {
            console.error('❌ Error loading position limits:', error);
        }
    }
    /**
     * Load audit trail
     */
    loadAuditTrail() {
        try {
            const auditFile = path.join(this.goalieDir, 'audit_trail.jsonl');
            if (fs.existsSync(auditFile)) {
                const auditData = fs.readFileSync(auditFile, 'utf8');
                const auditLines = auditData.trim().split('\n');
                this.auditTrail = auditLines
                    .filter(line => line.trim())
                    .map(line => JSON.parse(line));
            }
        }
        catch (error) {
            console.error('❌ Error loading audit trail:', error);
        }
    }
    /**
     * Save compliance report
     */
    saveComplianceReport(report) {
        const reportFile = path.join(this.goalieDir, 'compliance_reports.jsonl');
        fs.appendFileSync(reportFile, JSON.stringify(report) + '\n');
    }
    /**
     * Log alert
     */
    logAlert(alert) {
        const alertFile = path.join(this.goalieDir, 'compliance_alerts.jsonl');
        fs.appendFileSync(alertFile, JSON.stringify(alert) + '\n');
    }
    /**
     * Log audit entry
     */
    logAuditEntry(entry) {
        const auditFile = path.join(this.goalieDir, 'audit_trail.jsonl');
        fs.appendFileSync(auditFile, JSON.stringify(entry) + '\n');
    }
}
export default ComplianceManager;
//# sourceMappingURL=compliance_manager.js.map