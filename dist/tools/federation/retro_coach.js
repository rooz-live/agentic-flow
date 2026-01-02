import * as fs from 'fs';
import * as path from 'path';
function getGoalieDirFromArgs() {
    const argIndex = process.argv.indexOf('--goalie-dir');
    if (argIndex !== -1 && process.argv[argIndex + 1]) {
        return path.resolve(process.argv[argIndex + 1]);
    }
    return path.resolve(process.cwd(), '.goalie');
}
const GOALIE_DIR = getGoalieDirFromArgs();
const METRICS_FILE = path.join(GOALIE_DIR, 'pattern_metrics.jsonl');
const ENVIRONMENT_CONTEXTS = {
    local: { name: 'local', risk_threshold: 8, escalation_policy: 'async', analysis_depth: 'shallow' },
    dev: { name: 'dev', risk_threshold: 6, escalation_policy: '24h', analysis_depth: 'standard' },
    stg: { name: 'stg', risk_threshold: 4, escalation_policy: '4h', analysis_depth: 'deep' },
    prod: { name: 'prod', risk_threshold: 2, escalation_policy: 'immediate', analysis_depth: 'deep' },
    ci: { name: 'ci', risk_threshold: 5, escalation_policy: 'none', analysis_depth: 'standard' },
};
function detectEnvironment() {
    return process.env.AF_ENV ||
        (process.env.CI ? 'ci' :
            (process.env.GITHUB_ACTIONS ? 'ci' :
                (process.env.NODE_ENV === 'production' ? 'prod' : 'local')));
}
function getEnvironmentContext() {
    const env = detectEnvironment();
    return ENVIRONMENT_CONTEXTS[env] || ENVIRONMENT_CONTEXTS.local;
}
async function main() {
    const flags = process.argv.slice(2);
    const jsonOutput = flags.includes('--json');
    if (!fs.existsSync(METRICS_FILE)) {
        if (jsonOutput)
            console.log(JSON.stringify({ error: "No metrics found" }));
        else
            console.log("No pattern metrics found.");
        return;
    }
    const fileContent = fs.readFileSync(METRICS_FILE, 'utf-8');
    const events = fileContent
        .trim()
        .split('\n')
        .map(line => {
        try {
            return JSON.parse(line);
        }
        catch {
            return null;
        }
    })
        .filter(e => e !== null);
    const insights = [];
    // 1. Safe Degrade Analysis
    const degrades = events.filter(e => e.pattern === 'safe_degrade' && e.data?.action !== 'none');
    if (degrades.length > 0) {
        insights.push({
            type: "Risk",
            pattern: "safe_degrade",
            message: `System degraded ${degrades.length} times recently.`,
            recommendation: "Investigate 'deploy_fail' root causes in CI logs."
        });
    }
    // 2. Guardrail Lock Analysis
    const locks = events.filter(e => e.pattern === 'guardrail_lock' && e.data?.action === 'enforce_test_first');
    if (locks.length > 0) {
        insights.push({
            type: "Process",
            pattern: "guardrail_lock",
            message: "Test-First enforced due to low health score.",
            recommendation: "Prioritize 'governor-health' remediation tasks."
        });
    }
    // 3. Iteration Optimization Analysis
    const budgets = events.filter(e => e.pattern === 'iteration_budget' && e.data?.reason === 'stability_threshold');
    if (budgets.length > 0) {
        const saved = budgets.reduce((acc, curr) => acc + (curr.data?.saved || 0), 0);
        insights.push({
            type: "Optimization",
            pattern: "iteration_budget",
            message: `Optimized cycle detected: Saved ${saved} iterations total.`,
            recommendation: "Consider reducing default --iterations if stability persists."
        });
    }
    // 4. Backtest Strategy Analysis
    const backtests = events.filter(e => e.pattern === 'backtest_result');
    if (backtests.length > 0) {
        const bestStrategy = backtests.reduce((prev, current) => (prev.data?.sharpe || 0) > (current.data?.sharpe || 0) ? prev : current);
        const avgPnl = backtests.reduce((acc, curr) => acc + (curr.data?.pnl || 0), 0) / backtests.length;
        insights.push({
            type: "Strategy",
            pattern: "backtest_result",
            message: `Analyzed ${backtests.length} backtests. Best Sharpe: ${bestStrategy.data?.sharpe} (${bestStrategy.data?.strategy}). Avg PnL: ${avgPnl.toFixed(2)}.`,
            recommendation: "Promote high-Sharpe strategies to 'incubator' circle for forward testing."
        });
    }
    // 5. Integration Health Analysis
    const integrations = events.filter(e => e.pattern?.startsWith('integration_'));
    if (integrations.length > 0) {
        const failures = integrations.filter(e => e.data?.status !== 'success');
        const platforms = [...new Set(integrations.map(e => e.data?.platform))];
        if (failures.length > 0) {
            insights.push({
                type: "Integration",
                pattern: "integration_sync",
                message: `Detected ${failures.length} integration failures across ${platforms.join(', ')}.`,
                recommendation: "Check external system connectivity and API credentials in Admin Panel."
            });
        }
        else {
            insights.push({
                type: "Integration",
                pattern: "integration_sync",
                message: `Healthy syncs active for: ${platforms.join(', ')}.`,
                recommendation: "Maintain monitoring frequency."
            });
        }
    }
    // 6. Economic Context Aggregation (NEW)
    const eventsWithEconomic = events.filter(e => e.economic);
    if (eventsWithEconomic.length > 0) {
        const totalWsjf = eventsWithEconomic.reduce((acc, e) => acc + (e.economic?.wsjf_score || 0), 0);
        const totalCod = eventsWithEconomic.reduce((acc, e) => acc + (e.economic?.cod || e.economic?.cost_of_delay || 0), 0);
        const totalRevenue = eventsWithEconomic.reduce((acc, e) => acc + (e.economic?.revenue_impact || 0), 0);
        const avgWsjf = totalWsjf / eventsWithEconomic.length;
        insights.push({
            type: "Economic",
            pattern: "economic_summary",
            message: `Economic context: Total WSJF=${totalWsjf.toFixed(1)}, Avg WSJF=${avgWsjf.toFixed(2)}, Total CoD=${totalCod.toFixed(1)}, Revenue Impact=$${totalRevenue.toFixed(0)}`,
            recommendation: avgWsjf < 3.0
                ? "Low WSJF average indicates routine work. Consider prioritizing higher-value items."
                : "Good WSJF scores. Continue focusing on high-value deliverables."
        });
    }
    // 7. Duration Analysis (NEW)
    const eventsWithDuration = events.filter(e => e.data?.duration_ms && e.data.duration_ms > 0);
    if (eventsWithDuration.length > 0) {
        const totalDuration = eventsWithDuration.reduce((acc, e) => acc + (e.data?.duration_ms || 0), 0);
        const avgDuration = totalDuration / eventsWithDuration.length;
        const maxDuration = Math.max(...eventsWithDuration.map(e => e.data?.duration_ms || 0));
        insights.push({
            type: "Performance",
            pattern: "duration_analysis",
            message: `Timing: ${eventsWithDuration.length} events tracked, Avg=${(avgDuration / 1000).toFixed(2)}s, Max=${(maxDuration / 1000).toFixed(2)}s, Total=${(totalDuration / 1000).toFixed(1)}s`,
            recommendation: avgDuration > 30000
                ? "Average duration exceeds 30s. Consider optimizing slow patterns."
                : "Good duration metrics. Cycle times are within acceptable range."
        });
    }
    else {
        insights.push({
            type: "Observability",
            pattern: "duration_gap",
            message: "No duration_ms data found in pattern events.",
            recommendation: "Ensure duration_ms is being emitted from pattern_logger and processGovernor."
        });
    }
    // 8. Circle Distribution Analysis (NEW)
    const circleGroups = events.reduce((acc, e) => {
        const circle = e.circle || 'unknown';
        acc[circle] = (acc[circle] || 0) + 1;
        return acc;
    }, {});
    const circleEntries = Object.entries(circleGroups).sort((a, b) => b[1] - a[1]);
    if (circleEntries.length > 0) {
        const topCircles = circleEntries.slice(0, 3).map(([c, n]) => `${c}(${n})`).join(', ');
        insights.push({
            type: "Distribution",
            pattern: "circle_distribution",
            message: `Work distribution: ${topCircles}. Total circles: ${circleEntries.length}`,
            recommendation: circleEntries.length === 1
                ? "All work in single circle. Consider cross-functional collaboration."
                : "Good circle diversity in workflow."
        });
    }
    // 9. P1-3: Environment-Aware Analysis
    const envContext = getEnvironmentContext();
    const envGroups = events.reduce((acc, e) => {
        const env = e.environment || 'unknown';
        acc[env] = (acc[env] || 0) + 1;
        return acc;
    }, {});
    const envEntries = Object.entries(envGroups).sort((a, b) => b[1] - a[1]);
    if (envEntries.length > 0) {
        const topEnvs = envEntries.map(([env, n]) => `${env}(${n})`).join(', ');
        insights.push({
            type: "Environment",
            pattern: "environment_context",
            message: `Environment distribution: ${topEnvs}. Current: ${envContext.name} (risk_threshold=${envContext.risk_threshold})`,
            recommendation: envContext.name === 'prod'
                ? "Production environment. Apply strict governance checks."
                : `${envContext.name} environment. Analysis depth: ${envContext.analysis_depth}.`
        });
    }
    // 10. P2-2: Manthra/Yasna/Mithra Alignment Analysis
    const eventsWithAlignment = events.filter(e => e.alignment_score?.overall_drift !== undefined);
    if (eventsWithAlignment.length > 0) {
        const avgDrift = eventsWithAlignment.reduce((acc, e) => acc + (e.alignment_score?.overall_drift || 0), 0) / eventsWithAlignment.length;
        const driftedCount = eventsWithAlignment.filter(e => (e.alignment_score?.overall_drift || 0) > 0.3).length;
        const avgManthra = eventsWithAlignment.reduce((acc, e) => acc + (e.alignment_score?.manthra_score || 0), 0) / eventsWithAlignment.length;
        const avgYasna = eventsWithAlignment.reduce((acc, e) => acc + (e.alignment_score?.yasna_score || 0), 0) / eventsWithAlignment.length;
        const avgMithra = eventsWithAlignment.reduce((acc, e) => acc + (e.alignment_score?.mithra_score || 0), 0) / eventsWithAlignment.length;
        insights.push({
            type: "Alignment",
            pattern: "manthra_yasna_mithra",
            message: `Alignment: ${eventsWithAlignment.length} events. Avg drift=${avgDrift.toFixed(3)}. Drifted=${driftedCount}. M/Y/M=${avgManthra.toFixed(2)}/${avgYasna.toFixed(2)}/${avgMithra.toFixed(2)}`,
            recommendation: driftedCount > 0
                ? `${driftedCount} patterns show thought-word-action drift. Review intent-policy-evidence alignment.`
                : "Good alignment across Manthra (intent), Yasna (policy), Mithra (evidence)."
        });
    }
    const result = {
        total_events: events.length,
        events_with_economic: eventsWithEconomic.length,
        events_with_duration: eventsWithDuration.length,
        events_with_alignment: eventsWithAlignment.length,
        insights: insights,
        // P1-3: Environment context in output
        environment_context: {
            detected: envContext.name,
            risk_threshold: envContext.risk_threshold,
            escalation_policy: envContext.escalation_policy,
            analysis_depth: envContext.analysis_depth,
            distribution: envGroups,
        },
        economic_summary: eventsWithEconomic.length > 0 ? {
            total_wsjf: eventsWithEconomic.reduce((acc, e) => acc + (e.economic?.wsjf_score || 0), 0),
            total_cod: eventsWithEconomic.reduce((acc, e) => acc + (e.economic?.cod || e.economic?.cost_of_delay || 0), 0),
            total_revenue_impact: eventsWithEconomic.reduce((acc, e) => acc + (e.economic?.revenue_impact || 0), 0),
            avg_wsjf: eventsWithEconomic.reduce((acc, e) => acc + (e.economic?.wsjf_score || 0), 0) / eventsWithEconomic.length,
        } : null,
        duration_summary: eventsWithDuration.length > 0 ? {
            total_duration_ms: eventsWithDuration.reduce((acc, e) => acc + (e.data?.duration_ms || 0), 0),
            avg_duration_ms: eventsWithDuration.reduce((acc, e) => acc + (e.data?.duration_ms || 0), 0) / eventsWithDuration.length,
            max_duration_ms: Math.max(...eventsWithDuration.map(e => e.data?.duration_ms || 0)),
            events_tracked: eventsWithDuration.length,
        } : null,
        // P2-2: Alignment summary for Manthra/Yasna/Mithra framework
        alignment_summary: eventsWithAlignment.length > 0 ? {
            events_analyzed: eventsWithAlignment.length,
            avg_drift: eventsWithAlignment.reduce((acc, e) => acc + (e.alignment_score?.overall_drift || 0), 0) / eventsWithAlignment.length,
            drifted_count: eventsWithAlignment.filter(e => (e.alignment_score?.overall_drift || 0) > 0.3).length,
            avg_manthra: eventsWithAlignment.reduce((acc, e) => acc + (e.alignment_score?.manthra_score || 0), 0) / eventsWithAlignment.length,
            avg_yasna: eventsWithAlignment.reduce((acc, e) => acc + (e.alignment_score?.yasna_score || 0), 0) / eventsWithAlignment.length,
            avg_mithra: eventsWithAlignment.reduce((acc, e) => acc + (e.alignment_score?.mithra_score || 0), 0) / eventsWithAlignment.length,
            alignment_rate_pct: ((eventsWithAlignment.length - eventsWithAlignment.filter(e => (e.alignment_score?.overall_drift || 0) > 0.3).length) / eventsWithAlignment.length * 100).toFixed(1),
        } : null,
        generated_at: new Date().toISOString()
    };
    if (jsonOutput) {
        console.log(JSON.stringify(result, null, 2));
    }
    else {
        console.log("=== Retro Coach Insights ===");
        console.log(`Analyzed ${events.length} events (${eventsWithEconomic.length} with economic data, ${eventsWithDuration.length} with duration).`);
        insights.forEach(i => console.log(`[${i.type}] ${i.message} -> ${i.recommendation}`));
    }
}
main().catch(console.error);
//# sourceMappingURL=retro_coach.js.map