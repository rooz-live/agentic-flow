/**
 * Gap Detection and Early Warning System
 *
 * Monitors key metrics and triggers alerts when thresholds are breached.
 * Implements leading indicators for early gap detection.
 */
const DEFAULT_THRESHOLDS = {
    daysSinceCommit: 3,
    buildFailureRate: 0.1, // 10%
    testExecutionFrequency: 10, // per day
    documentationDrift: 7, // days
    coveragePercent: 80,
};
/**
 * Create a gap warning metric.
 */
function createWarning(name, threshold, value, invert = false) {
    const breached = invert ? value < threshold : value > threshold;
    const severity = breached
        ? (invert ? value < threshold * 0.7 : value > threshold * 1.5) ? 'critical' : 'warning'
        : 'info';
    return {
        metricName: name,
        threshold,
        currentValue: value,
        alertTriggered: breached,
        severity,
        lastUpdated: new Date(),
    };
}
/**
 * Calculate days since last commit.
 */
export async function getDaysSinceCommit() {
    try {
        const { execSync } = await import('child_process');
        const result = execSync('git log -1 --format=%ct', { encoding: 'utf-8' });
        const lastCommitTime = parseInt(result.trim(), 10) * 1000;
        const now = Date.now();
        return (now - lastCommitTime) / (1000 * 60 * 60 * 24);
    }
    catch {
        return -1; // Unable to determine
    }
}
/**
 * Calculate build failure rate from recent CI runs.
 */
export async function getBuildFailureRate() {
    // Placeholder - would integrate with GitHub Actions API
    return 0.05; // 5% failure rate
}
/**
 * Get test execution frequency (tests per day).
 */
export async function getTestExecutionFrequency() {
    // Placeholder - would aggregate from test logs
    return 15; // 15 tests/day
}
/**
 * Get documentation drift in days.
 */
export async function getDocumentationDrift() {
    try {
        const { execSync } = await import('child_process');
        const result = execSync('git log -1 --format=%ct -- "*.md"', { encoding: 'utf-8' });
        const lastDocTime = parseInt(result.trim(), 10) * 1000;
        const now = Date.now();
        return (now - lastDocTime) / (1000 * 60 * 60 * 24);
    }
    catch {
        return -1;
    }
}
/**
 * Get current test coverage percentage.
 */
export async function getCoveragePercent() {
    // Would parse from coverage reports
    return 75; // 75% coverage
}
/**
 * Generate comprehensive gap report.
 */
export async function generateGapReport() {
    const [daysSinceCommit, buildFailureRate, testFreq, docDrift, coverage,] = await Promise.all([
        getDaysSinceCommit(),
        getBuildFailureRate(),
        getTestExecutionFrequency(),
        getDocumentationDrift(),
        getCoveragePercent(),
    ]);
    const metrics = {
        daysSinceCommit: createWarning('Days Since Commit', DEFAULT_THRESHOLDS.daysSinceCommit, daysSinceCommit),
        buildFailureRate: createWarning('Build Failure Rate', DEFAULT_THRESHOLDS.buildFailureRate, buildFailureRate),
        testExecutionFrequency: createWarning('Test Frequency', DEFAULT_THRESHOLDS.testExecutionFrequency, testFreq, true),
        documentationDrift: createWarning('Documentation Drift', DEFAULT_THRESHOLDS.documentationDrift, docDrift),
        coveragePercent: createWarning('Test Coverage', DEFAULT_THRESHOLDS.coveragePercent, coverage, true),
    };
    const alerts = Object.values(metrics).filter(m => m.alertTriggered);
    // Calculate health score
    const breachedCount = alerts.length;
    const totalMetrics = Object.keys(metrics).length;
    const overallHealth = Math.round((1 - breachedCount / totalMetrics) * 100);
    // Generate recommendations
    const recommendations = [];
    if (metrics.daysSinceCommit.alertTriggered) {
        recommendations.push('Commit stale - consider pushing pending changes');
    }
    if (metrics.buildFailureRate.alertTriggered) {
        recommendations.push('Build failures elevated - investigate CI failures');
    }
    if (metrics.testExecutionFrequency.alertTriggered) {
        recommendations.push('Test frequency low - run test suite more frequently');
    }
    if (metrics.documentationDrift.alertTriggered) {
        recommendations.push('Documentation outdated - update docs with recent changes');
    }
    if (metrics.coveragePercent.alertTriggered) {
        recommendations.push('Coverage below threshold - add tests for uncovered code');
    }
    return {
        timestamp: new Date(),
        overallHealth,
        metrics,
        alerts,
        recommendations,
    };
}
//# sourceMappingURL=gap_detection.js.map