const { RiskAwareBatchingSystem } = require('./risk_aware_batching');
const { WSJFCalculator } = require('./wsjf_calculator');
const fs = require('fs');
const path = require('path');

async function main() {
    const args = process.argv.slice(2);
    const projectRoot = process.cwd();
    const goalieDir = path.join(projectRoot, '.goalie');
    const metricsFile = path.join(goalieDir, 'pattern_metrics.jsonl');

    let policyId = 'moderate';
    const policyIdx = args.indexOf('--policy');
    if (policyIdx !== -1 && args[policyIdx + 1]) {
        policyId = args[policyIdx + 1];
    }

    let filterCircle = null;
    const circleIdx = args.indexOf('--circle');
    if (circleIdx !== -1 && args[circleIdx + 1]) {
        filterCircle = args[circleIdx + 1];
    }

    if (!fs.existsSync(metricsFile)) {
        console.error(JSON.stringify({ error: 'Metrics file not found', path: metricsFile }));
        process.exit(1);
    }

    try {
        const wsjfCalculator = new WSJFCalculator(goalieDir);
        const batchingSystem = new RiskAwareBatchingSystem(goalieDir);

        // Load pattern metrics
        const content = fs.readFileSync(metricsFile, 'utf8');
        const lines = content.split('\n').filter(Boolean);
        const patterns = [];
        for (const line of lines) {
            try {
                const pattern = JSON.parse(line);
                if (filterCircle && pattern.circle !== filterCircle) {
                    continue;
                }
                patterns.push(pattern);
            } catch (e) {
                // Skip invalid lines
            }
        }

        // Calculate WSJF scores
        const wsjfResults = wsjfCalculator.calculateAndRank(patterns);

        if (wsjfResults.length === 0) {
            console.log(JSON.stringify({ id: null, items: [], status: 'empty' }, null, 2));
            return;
        }

        // Create batching plan
        const plan = await batchingSystem.createBatchingPlan(wsjfResults, policyId);

        console.log(JSON.stringify(plan, null, 2));
    } catch (error) {
        console.error(JSON.stringify({ error: error.message, stack: error.stack }));
        process.exit(1);
    }
}

main().catch(error => {
    console.error(JSON.stringify({ error: error.message, stack: error.stack }));
    process.exit(1);
});
