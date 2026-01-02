#!/usr/bin/env node
/**
 * Pattern Metrics Analyzer for Federation Agents
 *
 * Consumes .goalie/pattern_metrics.jsonl and identifies:
 * - Anomalies in pattern behavior
 * - Governance parameter adjustment recommendations
 * - Auto-generated retro questions based on pattern triggers
 */
import * as fs from 'fs';
import * as path from 'path';
class PatternMetricsAnalyzer {
    goalieDir;
    metrics = [];
    anomalies = [];
    adjustments = [];
    retroQuestions = [];
    jsonMode = false;
    constructor(goalieDir, jsonMode = false) {
        this.goalieDir = goalieDir;
        this.jsonMode = jsonMode;
    }
    async analyze() {
        await this.loadMetrics();
        this.detectAnomalies();
        this.proposeGovernanceAdjustments();
        this.generateRetroQuestions();
    }
    async loadMetrics() {
        if (!this.jsonMode) {
            console.log(`Analyzing pattern metrics in: ${this.goalieDir}`);
        }
        const metricsPath = path.join(this.goalieDir, 'pattern_metrics.jsonl');
        if (!fs.existsSync(metricsPath)) {
            throw new Error(`Pattern metrics file not found: ${metricsPath}`);
        }
        const content = fs.readFileSync(metricsPath, 'utf-8');
        const lines = content.trim().split('\n').filter(line => line.trim());
        let invalidCount = 0;
        this.metrics = lines.map(line => {
            try {
                return JSON.parse(line);
            }
            catch (err) {
                invalidCount++;
                if (process.env.DEBUG && !this.jsonMode) {
                    console.error(`Failed to parse line: ${line.substring(0, 200)}...`);
                }
                return null;
            }
        }).filter(m => m !== null);
        if (!this.jsonMode) {
            if (invalidCount > 0) {
                console.warn(`Skipped ${invalidCount} invalid JSON lines (set DEBUG=1 for details)`);
            }
            console.log(`Loaded ${this.metrics.length} pattern metrics`);
        }
    }
    detectAnomalies() {
        // Detect safe-degrade overuse
        const safeDegradeMetrics = this.metrics.filter(m => m.pattern === 'safe-degrade');
        const recentSafeDegrade = safeDegradeMetrics.slice(-20); // Last 20 events
        if (recentSafeDegrade.length >= 10) {
            const triggers = recentSafeDegrade.reduce((sum, m) => sum + (m.triggers || 0), 0);
            if (triggers >= 5) {
                this.anomalies.push({
                    type: 'pattern_overuse',
                    pattern: 'safe-degrade',
                    severity: 'high',
                    description: `Safe-degrade pattern triggered ${triggers} times in recent cycles`,
                    evidence: { triggers, recent_events: recentSafeDegrade.length },
                    recommendation: 'Investigate root cause of system degradation. Consider increasing resource thresholds or implementing proactive capacity planning.'
                });
            }
        }
        // Detect observability coverage (using behavioral_type, not pattern name)
        // Count events that are observable: have behavioral_type === 'observability' OR have metrics
        const observableEvents = this.metrics.filter(m => m.metadata?.behavioral_type === 'observability' ||
            (m.data && m.data.metrics));
        const totalEvents = this.metrics.length;
        const observabilityCoverage = observableEvents.length / Math.max(totalEvents, 1);
        // Also track the specific "observability-first" pattern for governance context
        const observabilityFirstMetrics = this.metrics.filter(m => m.pattern === 'observability-first');
        const governanceRuns = this.metrics.filter(m => m.run_kind === 'governance-agent').length;
        if (observabilityCoverage < 0.5) {
            this.anomalies.push({
                type: 'observability_gap',
                pattern: 'observability',
                severity: 'high',
                description: `Only ${(observabilityCoverage * 100).toFixed(1)}% of events are observable (have behavioral_type=observability or metrics)`,
                evidence: {
                    coverage: observabilityCoverage,
                    total_events: totalEvents,
                    observable_events: observableEvents.length,
                    governance_runs: governanceRuns,
                    observability_first_count: observabilityFirstMetrics.length
                },
                recommendation: 'Increase observable event coverage by ensuring domain patterns include metrics or behavioral_type classification.'
            });
        }
        // Separate check for governance-specific observability-first pattern
        if (governanceRuns > 0 && observabilityFirstMetrics.length === 0) {
            this.anomalies.push({
                type: 'pattern_underuse',
                pattern: 'observability-first',
                severity: 'medium',
                description: 'Observability-first pattern missing from governance runs',
                evidence: { governance_runs: governanceRuns },
                recommendation: 'Governance agent should emit observability-first pattern to track governance coverage.'
            });
        }
        // Detect mutation spikes
        const mutationMetrics = this.metrics.filter(m => m.mutation === true || m.metadata?.mutation_status === true);
        const recentMutations = mutationMetrics.slice(-10);
        if (recentMutations.length >= 7) {
            this.anomalies.push({
                type: 'mutation_spike',
                pattern: 'multiple',
                severity: 'medium',
                description: `High mutation rate detected: ${recentMutations.length}/10 recent events are mutations`,
                evidence: {
                    mutation_patterns: recentMutations.map(m => m.pattern),
                    behavioral_types: recentMutations.map(m => m.metadata?.behavioral_type)
                },
                recommendation: 'Review mutation events for unintended state changes. Consider enabling shadow mode for high-risk mutations.'
            });
        }
        // Detect behavioral drift (mode changes)
        const patternGroups = this.groupByPattern();
        for (const [pattern, metrics] of Object.entries(patternGroups)) {
            const modes = metrics.map(m => m.mode);
            const uniqueModes = new Set(modes);
            if (uniqueModes.size > 2 && metrics.length >= 5) {
                this.anomalies.push({
                    type: 'behavioral_drift',
                    pattern,
                    severity: 'medium',
                    description: `Pattern ${pattern} shows mode drift across ${uniqueModes.size} different modes`,
                    evidence: { modes: Array.from(uniqueModes), mode_changes: modes.length },
                    recommendation: `Standardize ${pattern} mode behavior. Consider enforcing consistent mode via AF_PROD_${pattern.toUpperCase().replace(/-/g, '_')} environment variable.`
                });
            }
        }
        // Detect economic degradation
        const economicMetrics = this.metrics.filter(m => m.economic && m.economic.cod > 0);
        if (economicMetrics.length >= 3) {
            const recentCOD = economicMetrics.slice(-5).map(m => m.economic.cod);
            const avgCOD = recentCOD.reduce((a, b) => a + b, 0) / recentCOD.length;
            if (avgCOD > 50) {
                this.anomalies.push({
                    type: 'economic_degradation',
                    pattern: 'multiple',
                    severity: 'high',
                    description: `Average Cost of Delay (COD) rising: ${avgCOD.toFixed(1)}`,
                    evidence: { recent_cod: recentCOD, average: avgCOD },
                    recommendation: 'Prioritize high-WSJF items to reduce COD. Consider increasing team capacity or reducing scope.'
                });
            }
        }
        // Detect Security Audit Gaps (SEC-AUDIT-* / CVE-*)
        const securityEvents = this.metrics.filter(m => m.pattern.startsWith('SEC-AUDIT-') || m.pattern.includes('CVE-'));
        const cveEvents = this.metrics.filter(m => m.pattern.includes('CVE-'));
        if (securityEvents.length === 0 && this.metrics.length > 20) {
            this.anomalies.push({
                type: 'pattern_underuse',
                pattern: 'SEC-AUDIT-*',
                severity: 'high',
                description: 'No Security Audit patterns detected in recent activity.',
                evidence: { total_events: this.metrics.length },
                recommendation: 'Ensure security scanning (e.g. npm audit, dependabot) is integrated and emitting patterns.'
            });
        }
        if (cveEvents.length > 0) {
            this.anomalies.push({
                type: 'pattern_overuse', // Using overuse to signal presence of bad things
                pattern: 'CVE-*',
                severity: 'critical',
                description: `Detected ${cveEvents.length} CVE vulnerabilities.`,
                evidence: { cves: cveEvents.map(m => m.pattern) },
                recommendation: 'Immediate patch required for detected vulnerabilities.'
            });
        }
        // Detect Circle Perspective Gaps
        const circleKeywords = {
            'Analyst': ['data', 'lineage', 'standard', 'quality'],
            'Assessor': ['verify', 'assurance', 'audit', 'test'],
            'Innovator': ['federation', 'wiring', 'investment', 'new'],
            'Intuitive': ['observability', 'sensemaking', 'gap', 'monitoring'],
            'Orchestrator': ['cadence', 'ceremony', 'prod-cycle', 'schedule'],
            'Seeker': ['exploration', 'dependency', 'automation', 'research']
        };
        const activePerspectiveTypes = new Set();
        // Naively classify patterns into perspectives
        for (const m of this.metrics) {
            for (const [perspective, keywords] of Object.entries(circleKeywords)) {
                if (keywords.some(k => m.pattern.toLowerCase().includes(k))) {
                    activePerspectiveTypes.add(perspective);
                }
            }
        }
        const missingPerspectives = Object.keys(circleKeywords).filter(p => !activePerspectiveTypes.has(p));
        if (missingPerspectives.length > 2 && this.metrics.length > 50) {
            this.anomalies.push({
                type: 'behavioral_drift',
                pattern: 'circle-perspective',
                severity: 'medium',
                description: `Missing perspectives: ${missingPerspectives.join(', ')}`,
                evidence: { missing: missingPerspectives, active: Array.from(activePerspectiveTypes) },
                recommendation: 'Diversify activity to include missing Circle Perspectives (e.g. run "Analyst" data checks or "Seeker" research).'
            });
        }
        // Detect Depth Ladder Phase Tracking (PHASE-*)
        const phaseEvents = this.metrics.filter(m => m.pattern.startsWith('PHASE-'));
        if (phaseEvents.length > 0) {
            // Just track them for now, maybe warn if out of order in future
            const phases = Array.from(new Set(phaseEvents.map(m => m.pattern)));
            // Example check: warn if PHASE-A-1 missing but PHASE-A-2 present?
            // For now, simple presence check.
        }
        else if (this.metrics.length > 50) {
            this.anomalies.push({
                type: 'pattern_underuse',
                pattern: 'PHASE-*',
                severity: 'low',
                description: 'No explicit Depth Ladder phases tracked.',
                evidence: { total_events: this.metrics.length },
                recommendation: 'Adopt explicit phase markers (e.g. PHASE-A-1) to improve maturity tracking.'
            });
        }
    }
    proposeGovernanceAdjustments() {
        // Adjust based on safe-degrade triggers
        const safeDegradeAnomaly = this.anomalies.find(a => a.pattern === 'safe-degrade' && a.type === 'pattern_overuse');
        if (safeDegradeAnomaly) {
            this.adjustments.push({
                parameter: 'safe_degrade.incident_threshold',
                current_value: 8,
                suggested_value: 10,
                reason: 'Frequent safe-degrade triggers indicate threshold may be too sensitive',
                pattern_trigger: 'safe-degrade overuse detected'
            });
            this.adjustments.push({
                parameter: 'iteration_budget.max_iterations',
                current_value: 100,
                suggested_value: 120,
                reason: 'Increasing budget to accommodate degradation recovery cycles',
                pattern_trigger: 'safe-degrade recovery cycles increasing'
            });
        }
        // Adjust based on mutation spike
        const mutationAnomaly = this.anomalies.find(a => a.type === 'mutation_spike');
        if (mutationAnomaly) {
            this.adjustments.push({
                parameter: 'AF_PROD_CYCLE_MODE',
                current_value: 'advisory',
                suggested_value: 'advisory',
                reason: 'Maintain advisory mode but enable shadow tracking for mutations',
                pattern_trigger: 'mutation spike detected'
            });
            this.adjustments.push({
                parameter: 'AF_GOVERNANCE_EXECUTOR_DRY_RUN',
                current_value: '0',
                suggested_value: '1',
                reason: 'Enable dry-run mode to validate mutations before application',
                pattern_trigger: 'high mutation rate requires validation'
            });
        }
        // Adjust based on observability gaps
        const observabilityAnomaly = this.anomalies.find(a => a.pattern === 'observability-first');
        if (observabilityAnomaly) {
            this.adjustments.push({
                parameter: 'AF_PROD_OBSERVABILITY_FIRST',
                current_value: '0',
                suggested_value: '1',
                reason: 'Force observability-first pattern for all prod-cycle runs',
                pattern_trigger: 'observability coverage below threshold'
            });
        }
    }
    generateRetroQuestions() {
        // Questions based on anomalies
        for (const anomaly of this.anomalies) {
            if (anomaly.pattern === 'safe-degrade') {
                this.retroQuestions.push({
                    category: 'technical',
                    question: `What root causes are triggering safe-degrade pattern ${anomaly.evidence.triggers} times? Are we addressing symptoms rather than causes?`,
                    context: anomaly.description,
                    triggered_by: ['safe-degrade', 'pattern_overuse']
                });
                this.retroQuestions.push({
                    category: 'governance',
                    question: 'Should we increase incident thresholds or improve system capacity to reduce safe-degrade triggers?',
                    context: 'Frequent degradation suggests capacity planning issues',
                    triggered_by: ['safe-degrade', 'governance']
                });
            }
            if (anomaly.pattern === 'observability-first') {
                this.retroQuestions.push({
                    category: 'process',
                    question: `Why is observability-first pattern only ${(anomaly.evidence.coverage * 100).toFixed(0)}% covered? What workflows are missing telemetry?`,
                    context: anomaly.description,
                    triggered_by: ['observability-first', 'pattern_underuse']
                });
            }
            if (anomaly.type === 'mutation_spike') {
                this.retroQuestions.push({
                    category: 'governance',
                    question: 'Are we mutating state too aggressively? Should we enforce shadow mode for high-risk patterns?',
                    context: anomaly.description,
                    triggered_by: ['mutation', 'governance']
                });
            }
        }
        // Standard learning questions
        const patterns = new Set(this.metrics.map(m => m.pattern));
        if (patterns.has('depth-ladder')) {
            this.retroQuestions.push({
                category: 'learning',
                question: 'Are depth-ladder adjustments improving iteration efficiency? What metrics validate depth choices?',
                context: 'Depth-ladder pattern active in recent cycles',
                triggered_by: ['depth-ladder', 'learning']
            });
        }
        if (patterns.has('circle-risk-focus')) {
            this.retroQuestions.push({
                category: 'process',
                question: 'Is circle-risk-focus identifying the correct high-risk areas? Are we distributing workload appropriately across circles?',
                context: 'Circle rotation and risk focus patterns observed',
                triggered_by: ['circle-risk-focus', 'process']
            });
        }
    }
    groupByPattern() {
        return this.metrics.reduce((acc, metric) => {
            if (!acc[metric.pattern]) {
                acc[metric.pattern] = [];
            }
            acc[metric.pattern].push(metric);
            return acc;
        }, {});
    }
    getReport() {
        return {
            summary: {
                total_metrics: this.metrics.length,
                patterns_tracked: new Set(this.metrics.map(m => m.pattern)).size,
                runs_analyzed: new Set(this.metrics.map(m => m.run_id)).size,
                anomalies_detected: this.anomalies.length,
                adjustments_proposed: this.adjustments.length,
                retro_questions_generated: this.retroQuestions.length
            },
            anomalies: this.anomalies,
            governance_adjustments: this.adjustments,
            retro_questions: this.retroQuestions,
            patterns: this.groupByPattern()
        };
    }
    async writeReport(outputPath) {
        const report = this.getReport();
        const output = outputPath || path.join(this.goalieDir, 'pattern_analysis_report.json');
        fs.writeFileSync(output, JSON.stringify(report, null, 2));
        if (!this.jsonMode) {
            console.log(`Analysis report written to: ${output}`);
        }
    }
}
// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const goalieDir = args.find(arg => arg.startsWith('--goalie-dir='))?.split('=')[1]
        || process.env.AF_GOALIE_DIR
        || path.join(process.cwd(), '.goalie');
    const outputPath = args.find(arg => arg.startsWith('--output='))?.split('=')[1];
    const jsonMode = args.includes('--json');
    const analyzer = new PatternMetricsAnalyzer(goalieDir, jsonMode);
    try {
        await analyzer.analyze();
        if (jsonMode) {
            console.log(JSON.stringify(analyzer.getReport(), null, 2));
        }
        else {
            await analyzer.writeReport(outputPath);
            const report = analyzer.getReport();
            console.log('\n=== Pattern Metrics Analysis Summary ===');
            console.log(`Total Metrics: ${report.summary.total_metrics}`);
            console.log(`Patterns Tracked: ${report.summary.patterns_tracked}`);
            console.log(`Runs Analyzed: ${report.summary.runs_analyzed}`);
            console.log(`\nAnomalies Detected: ${report.summary.anomalies_detected}`);
            if (report.anomalies.length > 0) {
                console.log('\n--- Anomalies ---');
                for (const anomaly of report.anomalies) {
                    console.log(`[${anomaly.severity.toUpperCase()}] ${anomaly.pattern}: ${anomaly.description}`);
                    console.log(`  → ${anomaly.recommendation}`);
                }
            }
            if (report.governance_adjustments.length > 0) {
                console.log('\n--- Governance Adjustments ---');
                for (const adj of report.governance_adjustments) {
                    console.log(`${adj.parameter}: ${adj.current_value} → ${adj.suggested_value}`);
                    console.log(`  Reason: ${adj.reason}`);
                }
            }
            if (report.retro_questions.length > 0) {
                console.log('\n--- Retro Questions ---');
                for (const q of report.retro_questions) {
                    console.log(`[${q.category}] ${q.question}`);
                }
            }
        }
    }
    catch (error) {
        console.error('Analysis failed:', error);
        process.exit(1);
    }
}
if (require.main === module) {
    main().catch(console.error);
}
export { PatternMetricsAnalyzer };
//# sourceMappingURL=pattern_metrics_analyzer.js.map