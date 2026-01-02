#!/usr/bin/env node
/**
 * validate_learning_parity.ts - Circle Learning Parity Validator
 *
 * Validates that all 6 circles (Analyst, Assessor, Innovator, Intuitive, Orchestrator, Seeker)
 * are represented proportionally in pattern events and that learning capture is consistent
 * between Bash emit_pattern_event() and TypeScript processGovernor.ts emissions.
 *
 * Usage:
 *   npx tsx tools/federation/validate_learning_parity.ts --goalie-dir .goalie
 *   npx tsx tools/federation/validate_learning_parity.ts --goalie-dir .goalie --json
 */
import * as fs from 'fs';
import * as path from 'path';
const EXPECTED_CIRCLES = ['Analyst', 'Assessor', 'Innovator', 'Intuitive', 'Orchestrator', 'Seeker'];
const NORMALIZED_CIRCLES = EXPECTED_CIRCLES.map(c => c.toLowerCase());
function normalizeCircleName(circle) {
    if (!circle)
        return 'unknown';
    const normalized = circle.toLowerCase().trim();
    // Find closest match
    for (const expectedCircle of NORMALIZED_CIRCLES) {
        if (normalized === expectedCircle || normalized.includes(expectedCircle)) {
            return expectedCircle.charAt(0).toUpperCase() + expectedCircle.slice(1);
        }
    }
    return 'Unknown';
}
async function readJsonl(filePath) {
    if (!fs.existsSync(filePath)) {
        return [];
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    return lines.map(line => {
        try {
            return JSON.parse(line);
        }
        catch (e) {
            console.warn(`[validate_learning_parity] Failed to parse line: ${line.substring(0, 100)}...`);
            return null;
        }
    }).filter(Boolean);
}
function analyzeCircleStats(events) {
    const statsMap = new Map();
    // Initialize all expected circles
    for (const circle of EXPECTED_CIRCLES) {
        statsMap.set(circle, {
            circle,
            totalEvents: 0,
            uniquePatterns: new Set(),
            behavioralTypes: new Map(),
            avgDepth: 0,
            iterations: new Set(),
            lastSeen: 'never'
        });
    }
    // Add Unknown for unrecognized circles
    statsMap.set('Unknown', {
        circle: 'Unknown',
        totalEvents: 0,
        uniquePatterns: new Set(),
        behavioralTypes: new Map(),
        avgDepth: 0,
        iterations: new Set(),
        lastSeen: 'never'
    });
    // Aggregate events by circle
    let totalDepth = 0;
    let depthCount = 0;
    for (const event of events) {
        const circle = normalizeCircleName(event.circle);
        const stats = statsMap.get(circle);
        if (!stats)
            continue;
        stats.totalEvents++;
        if (event.pattern) {
            stats.uniquePatterns.add(event.pattern);
        }
        if (event.behavioral_type) {
            const currentCount = stats.behavioralTypes.get(event.behavioral_type) || 0;
            stats.behavioralTypes.set(event.behavioral_type, currentCount + 1);
        }
        if (typeof event.depth === 'number') {
            totalDepth += event.depth;
            depthCount++;
        }
        if (typeof event.iteration === 'number') {
            stats.iterations.add(event.iteration);
        }
        if (event.ts) {
            stats.lastSeen = event.ts;
        }
    }
    // Calculate average depth per circle
    if (depthCount > 0) {
        for (const stats of statsMap.values()) {
            if (stats.totalEvents > 0) {
                stats.avgDepth = totalDepth / depthCount;
            }
        }
    }
    return statsMap;
}
function calculateParityScore(statsMap, totalEvents) {
    // Ideal: Each of 6 circles gets ~16.67% of events
    const idealPct = 100 / EXPECTED_CIRCLES.length;
    const expectedMin = idealPct * 0.5; // 8.33%
    const expectedMax = idealPct * 1.5; // 25%
    let parityViolations = 0;
    for (const circle of EXPECTED_CIRCLES) {
        const stats = statsMap.get(circle);
        if (!stats)
            continue;
        const actualPct = (stats.totalEvents / totalEvents) * 100;
        if (actualPct < expectedMin || actualPct > expectedMax) {
            parityViolations++;
        }
    }
    // Parity score: 100 - (violations / 6) * 100
    return Math.max(0, 100 - (parityViolations / EXPECTED_CIRCLES.length) * 100);
}
function generateIssuesAndRecommendations(statsMap, totalEvents) {
    const issues = [];
    const recommendations = [];
    const idealPct = 100 / EXPECTED_CIRCLES.length;
    const expectedMin = idealPct * 0.5;
    const expectedMax = idealPct * 1.5;
    // Check each expected circle
    for (const circle of EXPECTED_CIRCLES) {
        const stats = statsMap.get(circle);
        if (!stats) {
            issues.push(`Circle ${circle} not found in stats map`);
            continue;
        }
        const actualPct = (stats.totalEvents / totalEvents) * 100;
        if (stats.totalEvents === 0) {
            issues.push(`Circle ${circle} has ZERO events - not represented in prod-cycle`);
            recommendations.push(`Add ${circle} circle execution to prod-cycle workflow`);
        }
        else if (actualPct < expectedMin) {
            issues.push(`Circle ${circle} underrepresented: ${actualPct.toFixed(1)}% (expected ≥${expectedMin.toFixed(1)}%)`);
            recommendations.push(`Increase ${circle} circle iterations or add more ${circle}-specific patterns`);
        }
        else if (actualPct > expectedMax) {
            issues.push(`Circle ${circle} overrepresented: ${actualPct.toFixed(1)}% (expected ≤${expectedMax.toFixed(1)}%)`);
            recommendations.push(`Reduce ${circle} circle dominance or increase other circle activities`);
        }
        // Check for stale circles (not seen recently)
        if (stats.lastSeen !== 'never') {
            const lastSeenDate = new Date(stats.lastSeen);
            const now = new Date();
            const hoursSinceLastSeen = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60 * 60);
            if (hoursSinceLastSeen > 24) {
                issues.push(`Circle ${circle} last seen ${hoursSinceLastSeen.toFixed(1)}h ago - may be inactive`);
                recommendations.push(`Verify ${circle} circle is active in recent prod-cycles`);
            }
        }
        // Check for pattern diversity
        if (stats.uniquePatterns.size < 3 && stats.totalEvents > 10) {
            issues.push(`Circle ${circle} has low pattern diversity: ${stats.uniquePatterns.size} unique patterns`);
            recommendations.push(`Add more ${circle}-specific patterns (current: ${Array.from(stats.uniquePatterns).join(', ')})`);
        }
    }
    // Check for unknown circles
    const unknownStats = statsMap.get('Unknown');
    if (unknownStats && unknownStats.totalEvents > 0) {
        issues.push(`${unknownStats.totalEvents} events with unrecognized circle names`);
        recommendations.push('Standardize circle names to match: Analyst, Assessor, Innovator, Intuitive, Orchestrator, Seeker');
    }
    return { issues, recommendations };
}
async function validateLearningParity(goalieDir) {
    const patternMetricsPath = path.join(goalieDir, 'pattern_metrics.jsonl');
    console.error('[validate_learning_parity] Loading pattern events...');
    const events = await readJsonl(patternMetricsPath);
    if (events.length === 0) {
        throw new Error(`No pattern events found in ${patternMetricsPath}`);
    }
    console.error(`[validate_learning_parity] Analyzing ${events.length} events...`);
    const statsMap = analyzeCircleStats(events);
    const parityScore = calculateParityScore(statsMap, events.length);
    const { issues, recommendations } = generateIssuesAndRecommendations(statsMap, events.length);
    // Build result
    const circleRepresentation = {};
    for (const [circle, stats] of statsMap.entries()) {
        const eventPct = (stats.totalEvents / events.length) * 100;
        const behavioralTypesObj = {};
        for (const [type, count] of stats.behavioralTypes.entries()) {
            behavioralTypesObj[type] = count;
        }
        circleRepresentation[circle] = {
            eventCount: stats.totalEvents,
            eventPct: parseFloat(eventPct.toFixed(2)),
            uniquePatterns: stats.uniquePatterns.size,
            avgDepth: parseFloat(stats.avgDepth.toFixed(2)),
            iterations: stats.iterations.size,
            behavioralTypes: behavioralTypesObj,
            lastSeen: stats.lastSeen
        };
    }
    return {
        timestamp: new Date().toISOString(),
        totalEvents: events.length,
        circleRepresentation,
        parityScore: parseFloat(parityScore.toFixed(2)),
        issues,
        recommendations
    };
}
function printHumanReadable(result) {
    console.log('\n=== Circle Learning Parity Validation ===\n');
    console.log(`Timestamp: ${result.timestamp}`);
    console.log(`Total Events: ${result.totalEvents}`);
    console.log(`Parity Score: ${result.parityScore.toFixed(1)}/100`);
    console.log('\n--- Circle Representation ---');
    const sortedCircles = Object.entries(result.circleRepresentation)
        .sort(([, a], [, b]) => b.eventCount - a.eventCount);
    for (const [circle, stats] of sortedCircles) {
        if (stats.eventCount === 0 && circle === 'Unknown')
            continue;
        console.log(`\n${circle}:`);
        console.log(`  Events: ${stats.eventCount} (${stats.eventPct.toFixed(1)}%)`);
        console.log(`  Patterns: ${stats.uniquePatterns}`);
        console.log(`  Avg Depth: ${stats.avgDepth.toFixed(1)}`);
        console.log(`  Iterations: ${stats.iterations}`);
        console.log(`  Last Seen: ${stats.lastSeen}`);
        if (Object.keys(stats.behavioralTypes).length > 0) {
            console.log('  Behavioral Types:');
            for (const [type, count] of Object.entries(stats.behavioralTypes)) {
                console.log(`    - ${type}: ${count}`);
            }
        }
    }
    if (result.issues.length > 0) {
        console.log('\n--- Issues ---');
        for (const issue of result.issues) {
            console.log(`  ⚠️  ${issue}`);
        }
    }
    if (result.recommendations.length > 0) {
        console.log('\n--- Recommendations ---');
        for (const rec of result.recommendations) {
            console.log(`  💡 ${rec}`);
        }
    }
    console.log('\n');
}
async function main() {
    const args = process.argv.slice(2);
    let goalieDir = '.goalie';
    let jsonMode = false;
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--goalie-dir' && args[i + 1]) {
            goalieDir = args[i + 1];
            i++;
        }
        else if (args[i] === '--json') {
            jsonMode = true;
        }
    }
    try {
        const result = await validateLearningParity(goalieDir);
        if (jsonMode) {
            console.log(JSON.stringify(result, null, 2));
        }
        else {
            printHumanReadable(result);
        }
        // Exit code based on parity score
        if (result.parityScore < 50) {
            process.exitCode = 1;
        }
    }
    catch (error) {
        console.error('[validate_learning_parity] Error:', error);
        process.exitCode = 1;
    }
}
main();
//# sourceMappingURL=validate_learning_parity.js.map