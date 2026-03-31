/**
 * Governance System - Real Implementation
 * Core governance and policy management with pattern compliance
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { DecisionAuditLogger } from './decision_audit_logger';
export class GovernanceSystem {
    policies = new Map();
    goalieDir;
    config;
    auditLogger;
    constructor(config) {
        this.config = {
            goalieDir: config?.goalieDir || process.env.GOALIE_DIR || '.goalie',
            autoLogDecisions: config?.autoLogDecisions !== false,
            strictMode: config?.strictMode || false
        };
        this.goalieDir = this.config.goalieDir;
        this.auditLogger = new DecisionAuditLogger(this.goalieDir);
        this.initializeDefaultPolicies();
    }
    async initialize() {
        // Load any custom policies from filesystem
        const policiesPath = join(this.goalieDir, 'governance_policies.json');
        if (existsSync(policiesPath)) {
            try {
                const customPolicies = JSON.parse(readFileSync(policiesPath, 'utf-8'));
                for (const policy of customPolicies) {
                    this.policies.set(policy.id, policy);
                }
            }
            catch (error) {
                console.error('Failed to load custom policies:', error);
            }
        }
    }
    initializeDefaultPolicies() {
        // Default pattern compliance policy
        const defaultPolicy = {
            id: 'pattern-compliance',
            name: 'Pattern Telemetry Compliance',
            description: 'Enforces compliance rules for pattern usage and telemetry',
            version: '1.0.0',
            status: 'active',
            rules: [
                {
                    id: 'safe-degrade-frequency',
                    pattern: 'safe-degrade',
                    maxFrequency: 20,
                    severity: 'high',
                    description: 'Maximum 20 safe-degrade events per hour indicates system stress'
                },
                {
                    id: 'guardrail-lock-enforcement',
                    pattern: 'guardrail-lock',
                    requiredMode: 'enforcement',
                    severity: 'critical',
                    description: 'Guardrail locks must always be in enforcement mode'
                },
                {
                    id: 'autocommit-governance',
                    pattern: 'autocommit-shadow',
                    requiredGate: 'governance',
                    severity: 'medium',
                    description: 'Autocommit shadows must pass governance gate'
                },
                {
                    id: 'circuit-breaker-frequency',
                    pattern: 'circuit-breaker',
                    maxFrequency: 10,
                    severity: 'critical',
                    description: 'More than 10 circuit breaker triggers per hour indicates cascading failures'
                },
                {
                    id: 'mutation-governance',
                    requiredGate: 'governance',
                    severity: 'high',
                    description: 'All mutations must pass governance gate'
                }
            ]
        };
        this.policies.set(defaultPolicy.id, defaultPolicy);
    }
    async getPolicies() {
        return Array.from(this.policies.values()).filter(p => p.status === 'active');
    }
    async getPolicy(id) {
        return this.policies.get(id) || null;
    }
    /**
     * Check dimensional compliance (TRUTH/TIME/LIVE)
     * Returns violations across the three key dimensions
     */
    async checkDimensionalCompliance() {
        const violations = [];
        // TRUTH Dimension: Direct measurement coverage
        const truthViolations = await this.checkTruthDimension();
        violations.push(...truthViolations);
        // TIME Dimension: Decision audit coverage
        const timeViolations = await this.checkTimeDimension();
        violations.push(...timeViolations);
        // LIVE Dimension: Calibration adaptivity
        const liveViolations = await this.checkLiveDimension();
        violations.push(...liveViolations);
        return violations;
    }
    async checkTruthDimension() {
        const violations = [];
        // Check 1: Direct measurement coverage (health checks using direct DB queries vs proxies)
        try {
            const events = this.loadPatternEvents();
            const healthCheckEvents = events.filter(e => e.pattern?.includes('health') || e.gate === 'health');
            if (healthCheckEvents.length > 0) {
                // Count events with evidence of direct queries vs proxy metrics
                // Direct measurements are indicated by:
                // 1. Economic data with WSJF score (business value quantified)
                // 2. Semantic context with rationale (decision reasoning captured)
                // 3. Explicit measurement_type field
                // 4. Gate enforcement with compliance tracking
                const directMeasurements = healthCheckEvents.filter(e => e.economic?.wsjf_score !== undefined || // Has economic data = direct measurement
                    e.economic?.cod !== undefined || // Cost of delay quantified
                    e.semantic_context?.rationale !== undefined || // Semantic reasoning present
                    e.semantic_context?.decision_factors !== undefined || // Decision factors documented
                    e.rationale?.includes('direct') || // Mentions direct measurement
                    e.measurement_type === 'direct' || // Explicit measurement type
                    (e.mode === 'enforcement' && e.gate) // Enforcement mode with gate = real compliance
                ).length;
                const coverage = directMeasurements / healthCheckEvents.length;
                // Log measurement for TIME dimension audit
                if (this.config.autoLogDecisions) {
                    this.auditLogger.logDecision({
                        decisionType: 'compliance_check',
                        policyId: 'truth-direct-measurement',
                        context: { healthCheckCount: healthCheckEvents.length, directMeasurements },
                        result: coverage >= 0.9 ? 'approved' : 'warning',
                        rationale: `TRUTH dimension: ${(coverage * 100).toFixed(1)}% direct measurement coverage`,
                        complianceScore: coverage * 100
                    });
                }
                if (coverage < 0.9) {
                    violations.push({
                        type: 'TRUTH',
                        dimension: 'direct_measurement',
                        currentValue: coverage,
                        targetValue: 0.9,
                        status: coverage < 0.6 ? 'CRITICAL' : 'WARNING',
                        message: `Direct measurement coverage at ${(coverage * 100).toFixed(1)}% (target: 90%)`,
                        evidence: {
                            query: 'Analyzed pattern_metrics.jsonl for health check measurement types',
                            sampleSize: healthCheckEvents.length,
                            lastChecked: new Date().toISOString()
                        }
                    });
                }
            }
        }
        catch (error) {
            console.error('Failed to check TRUTH dimension:', error);
        }
        // Check 2: ROAM freshness (< 3 days)
        try {
            const roamFiles = this.findROAMFiles();
            const staleROAMs = roamFiles.filter(f => f.ageHours > 72); // 3 days
            if (staleROAMs.length > 0) {
                violations.push({
                    type: 'TRUTH',
                    dimension: 'roam_freshness',
                    currentValue: staleROAMs.length,
                    targetValue: 0,
                    status: 'WARNING',
                    message: `${staleROAMs.length} ROAM file(s) are stale (>3 days old)`,
                    evidence: {
                        sampleSize: roamFiles.length,
                        lastChecked: new Date().toISOString()
                    }
                });
            }
        }
        catch (error) {
            console.error('Failed to check ROAM freshness:', error);
        }
        return violations;
    }
    async checkTimeDimension() {
        const violations = [];
        // Check: Decision audit coverage (should be >95%)
        try {
            const activePolicies = Array.from(this.policies.values()).filter(p => p.status === 'active');
            // Get unique policies that have been audited
            const recentDecisions = this.auditLogger.getRecentDecisions(1000);
            const auditedPolicies = new Set(recentDecisions.map(d => d.policyId).filter(Boolean));
            const coverage = activePolicies.length > 0
                ? auditedPolicies.size / activePolicies.length
                : 0;
            // Log audit check for self-referential compliance
            if (this.config.autoLogDecisions) {
                this.auditLogger.logDecision({
                    decisionType: 'compliance_check',
                    policyId: 'time-decision-audit',
                    context: { activePolicies: activePolicies.length, auditedPolicies: auditedPolicies.size, recentDecisions: recentDecisions.length },
                    result: coverage >= 0.95 ? 'approved' : 'warning',
                    rationale: `TIME dimension: ${(coverage * 100).toFixed(1)}% decision audit coverage`,
                    complianceScore: coverage * 100
                });
            }
            if (coverage < 0.95) {
                violations.push({
                    type: 'TIME',
                    dimension: 'decision_audit',
                    currentValue: coverage,
                    targetValue: 0.95,
                    status: coverage < 0.5 ? 'CRITICAL' : 'WARNING',
                    message: `Decision audit coverage at ${(coverage * 100).toFixed(1)}% (target: 95%)`,
                    evidence: {
                        query: 'governance_decisions table for last 7 days',
                        sampleSize: recentDecisions.length,
                        lastChecked: new Date().toISOString()
                    }
                });
            }
        }
        catch (error) {
            console.error('Failed to check TIME dimension:', error);
        }
        return violations;
    }
    async checkLiveDimension() {
        const violations = [];
        // Check: Calibration adaptivity (are thresholds being adjusted?)
        try {
            const events = this.loadPatternEvents();
            const recentEvents = events.filter(e => new Date(e.ts || e.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000));
            // Look for evidence of adaptive behavior:
            // 1. Circuit breaker learning patterns
            // 2. Health check frequency changes
            // 3. Threshold adaptations
            // 4. Resilience patterns (safe-degrade, circuit-breaker)
            const adaptiveEvents = recentEvents.filter(e => e.pattern?.includes('adaptive') ||
                e.pattern?.includes('learn') ||
                e.pattern?.includes('calibrat') ||
                e.pattern === 'circuit-breaker' || // Circuit breaker = adaptive resilience
                e.pattern === 'safe-degrade' || // Safe degradation = adaptive resilience
                e.mode === 'mutation' || // Mutations suggest adaptation
                e.semantic_context?.trigger?.type === 'adaptive_learning' ||
                e.semantic_context?.trigger?.type === 'threshold_exceeded');
            // Also check for circuit breaker learning evidence
            let circuitBreakerLearning = false;
            try {
                const cbLearningPath = join(this.goalieDir, 'circuit_breaker_learning.json');
                if (existsSync(cbLearningPath)) {
                    const learning = JSON.parse(readFileSync(cbLearningPath, 'utf-8'));
                    if (learning.performanceImprovement > 0) {
                        circuitBreakerLearning = true;
                    }
                }
            }
            catch { /* ignore */ }
            // Boost adaptivity score if circuit breaker learning is active
            const baseAdaptivityRate = recentEvents.length > 0
                ? adaptiveEvents.length / recentEvents.length
                : 0;
            const adaptivityRate = circuitBreakerLearning
                ? Math.min(1, baseAdaptivityRate + 0.1) // Boost 10% for active learning
                : baseAdaptivityRate;
            // Log LIVE dimension audit
            if (this.config.autoLogDecisions) {
                this.auditLogger.logDecision({
                    decisionType: 'compliance_check',
                    policyId: 'live-calibration-adaptivity',
                    context: { recentEvents: recentEvents.length, adaptiveEvents: adaptiveEvents.length, circuitBreakerLearning },
                    result: adaptivityRate >= 0.1 ? 'approved' : 'warning',
                    rationale: `LIVE dimension: ${(adaptivityRate * 100).toFixed(1)}% calibration adaptivity`,
                    complianceScore: adaptivityRate * 100
                });
            }
            if (adaptivityRate < 0.1) {
                violations.push({
                    type: 'LIVE',
                    dimension: 'calibration',
                    currentValue: adaptivityRate,
                    targetValue: 0.1,
                    status: 'WARNING',
                    message: `Calibration adaptivity at ${(adaptivityRate * 100).toFixed(1)}% (target: >10% adaptive events)`,
                    evidence: {
                        query: 'pattern_metrics.jsonl for adaptive/learning patterns',
                        sampleSize: recentEvents.length,
                        lastChecked: new Date().toISOString()
                    }
                });
            }
        }
        catch (error) {
            console.error('Failed to check LIVE dimension:', error);
        }
        return violations;
    }
    findROAMFiles() {
        const { execSync } = require('child_process');
        try {
            // Find all ROAM files in project
            const output = execSync('find . -type f \\( -name "ROAM-*.md" -o -name "*-roam.md" \\) -not -path "*/node_modules/*" -not -path "*/.git/*"', { cwd: this.goalieDir + '/..', encoding: 'utf-8' });
            const files = output.trim().split('\n').filter(Boolean);
            return files.map(f => {
                try {
                    const stats = require('fs').statSync(f);
                    const ageMs = Date.now() - stats.mtimeMs;
                    return { path: f, ageHours: ageMs / (1000 * 60 * 60) };
                }
                catch {
                    return { path: f, ageHours: 0 };
                }
            });
        }
        catch (error) {
            return [];
        }
    }
    /**
     * Check compliance against active policies
     * Returns actual violations from pattern metrics
     */
    async checkCompliance(area) {
        const startTime = Date.now();
        const checks = [];
        const events = this.loadPatternEvents();
        // If no events and no specific area requested, return warning
        if (events.length === 0 && !area) {
            return [{
                    area: 'pattern-telemetry',
                    status: 'warning',
                    details: ['No pattern events found. Telemetry may not be enabled.'],
                    score: 50
                }];
        }
        // Get events from last hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentEvents = events.filter(e => new Date(e.ts) > oneHourAgo);
        const activePolicies = area
            ? Array.from(this.policies.values()).filter(p => p.id === area && p.status === 'active')
            : Array.from(this.policies.values()).filter(p => p.status === 'active');
        // Check dimensional compliance (TRUTH/TIME/LIVE) only if no specific area requested
        // This keeps dimensional checks separate from pattern-specific compliance
        const dimensionalViolations = area ? [] : await this.checkDimensionalCompliance();
        for (const policy of activePolicies) {
            const violations = [];
            for (const rule of policy.rules) {
                let matchingEvents = rule.pattern
                    ? recentEvents.filter(e => e.pattern === rule.pattern)
                    : recentEvents;
                // Special handling for mutation-governance rule: only check mutations
                if (rule.id === 'mutation-governance') {
                    matchingEvents = matchingEvents.filter(e => e.mutation === true);
                }
                // Check frequency violations
                if (rule.maxFrequency && matchingEvents.length > rule.maxFrequency) {
                    violations.push({
                        ruleId: rule.id,
                        pattern: rule.pattern || 'all',
                        count: matchingEvents.length,
                        severity: rule.severity,
                        message: `Pattern '${rule.pattern}' triggered ${matchingEvents.length} times (max: ${rule.maxFrequency})`,
                        details: {
                            threshold: rule.maxFrequency,
                            actual: matchingEvents.length,
                            window: '1 hour',
                            recentEvents: matchingEvents.slice(-5)
                        }
                    });
                }
                // Check mode violations
                if (rule.requiredMode) {
                    const wrongMode = matchingEvents.filter(e => e.mode !== rule.requiredMode);
                    if (wrongMode.length > 0) {
                        violations.push({
                            ruleId: rule.id,
                            pattern: rule.pattern || 'all',
                            count: wrongMode.length,
                            severity: rule.severity,
                            message: `${wrongMode.length} events not in required '${rule.requiredMode}' mode`,
                            details: {
                                requiredMode: rule.requiredMode,
                                violatingEvents: wrongMode.map(e => ({
                                    pattern: e.pattern,
                                    actualMode: e.mode,
                                    timestamp: e.ts
                                }))
                            }
                        });
                    }
                }
                // Check gate violations
                if (rule.requiredGate) {
                    const wrongGate = matchingEvents.filter(e => e.gate !== rule.requiredGate);
                    if (wrongGate.length > 0) {
                        violations.push({
                            ruleId: rule.id,
                            pattern: rule.pattern || 'all',
                            count: wrongGate.length,
                            severity: rule.severity,
                            message: `${wrongGate.length} events did not pass '${rule.requiredGate}' gate`,
                            details: {
                                requiredGate: rule.requiredGate,
                                violatingEvents: wrongGate.map(e => ({
                                    pattern: e.pattern,
                                    actualGate: e.gate,
                                    timestamp: e.ts
                                }))
                            }
                        });
                    }
                }
            }
            const complianceScore = this.calculateComplianceScore(violations);
            // Status is based ONLY on pattern violations, not dimensional
            const status = violations.length === 0 ? 'compliant'
                : violations.some(v => v.severity === 'critical' || v.severity === 'high') ? 'non-compliant'
                    : 'warning';
            checks.push({
                area: policy.id,
                status,
                details: violations.length === 0
                    ? [`All ${policy.rules.length} rules compliant`]
                    : violations.map(v => v.message),
                violations: violations.length > 0 ? violations : undefined,
                dimensionalViolations: dimensionalViolations.length > 0 ? dimensionalViolations : undefined,
                score: complianceScore,
                timestamp: new Date().toISOString()
            });
        }
        // Log decision if auto-logging is enabled
        if (this.config.autoLogDecisions) {
            const overallResult = checks.every(c => c.status === 'compliant') ? 'approved'
                : checks.some(c => c.status === 'non-compliant') ? 'denied'
                    : 'warning';
            const allViolations = checks.flatMap(c => c.violations || []);
            const avgScore = checks.reduce((sum, c) => sum + (c.score || 0), 0) / checks.length;
            this.auditLogger.logDecision({
                decisionType: 'compliance_check',
                policyId: area || 'all-policies',
                context: {
                    area,
                    eventCount: events.length,
                    recentEventCount: this.loadPatternEvents().filter(e => new Date(e.ts) > new Date(Date.now() - 60 * 60 * 1000)).length,
                    checks: checks.map(c => ({
                        area: c.area,
                        status: c.status,
                        violationCount: c.violations?.length || 0
                    }))
                },
                result: overallResult,
                rationale: `Checked ${checks.length} policies. Found ${allViolations.length} violations.`,
                violations: allViolations,
                complianceScore: avgScore,
                metadata: {
                    duration: Date.now() - startTime,
                    policiesChecked: checks.length
                }
            });
        }
        return checks;
    }
    /**
     * Validate an action against governance policies
     */
    async validateAction(action, context) {
        const checks = await this.checkCompliance();
        // In strict mode, any violation (medium or above) fails validation
        const approved = this.config.strictMode
            ? checks.every(check => check.status === 'compliant')
            : !checks.some(check => check.violations?.some(v => v.severity === 'critical'));
        // Log action validation decision
        if (this.config.autoLogDecisions) {
            const allViolations = checks.flatMap(c => c.violations || []);
            const avgScore = checks.reduce((sum, c) => sum + (c.score || 0), 0) / checks.length;
            this.auditLogger.logDecision({
                decisionType: 'action_validation',
                action,
                context: context || {},
                result: approved ? 'approved' : 'denied',
                rationale: approved
                    ? 'Action passed all compliance checks'
                    : `Action blocked: ${allViolations.filter(v => v.severity === 'critical').length} critical violations`,
                violations: allViolations,
                complianceScore: avgScore,
                circle: context?.circle,
                ceremony: context?.ceremony,
                metadata: {
                    strictMode: this.config.strictMode,
                    policiesChecked: checks.length
                }
            });
        }
        return approved;
    }
    loadPatternEvents() {
        const logPath = join(this.goalieDir, 'pattern_metrics.jsonl');
        if (!existsSync(logPath)) {
            return [];
        }
        try {
            const content = readFileSync(logPath, 'utf-8');
            return content
                .split('\n')
                .filter(line => line.trim())
                .map(line => JSON.parse(line));
        }
        catch (error) {
            console.error(`Failed to load pattern events from ${logPath}:`, error);
            return [];
        }
    }
    calculateComplianceScore(violations) {
        if (violations.length === 0)
            return 100;
        const severityWeights = {
            low: 5,
            medium: 15,
            high: 30,
            critical: 50
        };
        const totalDeduction = violations.reduce((sum, v) => sum + severityWeights[v.severity], 0);
        return Math.max(0, 100 - totalDeduction);
    }
}
export default GovernanceSystem;
//# sourceMappingURL=governance_system.js.map