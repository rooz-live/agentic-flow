import * as fs from 'fs';
import * as path from 'path';
const GOALIE_DIR = '.goalie';
const METRICS_FILE = path.join(GOALIE_DIR, 'pattern_metrics.jsonl');
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
    const degrades = events.filter(e => e.pattern === 'safe_degrade' && e.data.action !== 'none');
    if (degrades.length > 0) {
        insights.push({
            type: "Risk",
            pattern: "safe_degrade",
            message: `System degraded ${degrades.length} times recently.`,
            recommendation: "Investigate 'deploy_fail' root causes in CI logs."
        });
    }
    // 2. Guardrail Lock Analysis
    const locks = events.filter(e => e.pattern === 'guardrail_lock' && e.data.action === 'enforce_test_first');
    if (locks.length > 0) {
        insights.push({
            type: "Process",
            pattern: "guardrail_lock",
            message: "Test-First enforced due to low health score.",
            recommendation: "Prioritize 'governor-health' remediation tasks."
        });
    }
    // 3. Iteration Optimization Analysis
    const budgets = events.filter(e => e.pattern === 'iteration_budget' && e.data.reason === 'stability_threshold');
    if (budgets.length > 0) {
        const saved = budgets.reduce((acc, curr) => acc + curr.data.saved, 0);
        insights.push({
            type: "Optimization",
            pattern: "iteration_budget",
            message: `Optimized cycle detected: Saved ${saved} iterations total.`,
            recommendation: "Consider reducing default --iterations if stability persists."
        });
    }
    const result = {
        total_events: events.length,
        insights: insights,
        generated_at: new Date().toISOString()
    };
    if (jsonOutput) {
        console.log(JSON.stringify(result, null, 2));
    }
    else {
        console.log("=== Retro Coach Insights ===");
        console.log(`Analyzed ${events.length} events.`);
        insights.forEach(i => console.log(`[${i.type}] ${i.message} -> ${i.recommendation}`));
    }
}
main().catch(console.error);
//# sourceMappingURL=retro_coach.js.map