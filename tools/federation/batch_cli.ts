import * as fs from 'fs';
import * as path from 'path';
import { RiskAwareBatchingSystem } from './risk_aware_batching';
import { WSJFCalculator } from './wsjf_calculator';

async function main() {
    const args = process.argv.slice(2);
    const goalieDir = process.cwd();
    const metricsFile = path.join(goalieDir, 'pattern_metrics.jsonl');

    let policyId = 'moderate';
    const policyIdx = args.indexOf('--policy');
    if (policyIdx !== -1 && args[policyIdx + 1]) {
        policyId = args[policyIdx + 1];
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
        const patterns = content.split('\n').filter(Boolean).map(line => {
            try {
                return JSON.parse(line);
            } catch (e) {
                return null;
            }
        }).filter(Boolean);

        // Calculate WSJF scores
        const wsjfResults = wsjfCalculator.calculateAndRank(patterns);

        if (wsjfResults.length === 0) {
            console.log(JSON.stringify({ items: [] }, null, 2));
            return;
        }

        // Create batching plan
        const plan = await batchingSystem.createBatchingPlan(wsjfResults, policyId);

        console.log(JSON.stringify(plan, null, 2));
    } catch (error: any) {
        console.error(JSON.stringify({ error: error.message, stack: error.stack }));
        process.exit(1);
    }
}

main().catch(error => {
    console.error(JSON.stringify({ error: error.message, stack: error.stack }));
    process.exit(1);
});
