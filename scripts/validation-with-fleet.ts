/**
 * Agentic QE Fleet Orchestration
 * Topology: Hierarchy
 * Agents: qe-quality-gate, qe-security-scanner
 */

import { AQEClient, HierarchyStrategy } from 'agentic-qe';
import * as path from 'path';

async function orchestrateValidation() {
    const aqe = new AQEClient();

    // Configure fleet with a hierarchy topology
    const fleet = aqe.createFleet({
        strategy: HierarchyStrategy.Specialized,
        agents: [
            { role: 'qe-quality-gate', level: 'primary' },
            { role: 'qe-security-scanner', level: 'secondary' }
        ]
    });

    console.log("🚀 Starting Agentic-QE Validation Orchestration...");

    // We target the current high-priority lease negotiation drafts
    const targetDoc = path.join(__dirname, '../docs/110-frazier/EMAIL-TO-LANDLORD-110-FRAZIER.md');

    const results = await fleet.orchestrate({
        task: "email-validation",
        targetPaths: [targetDoc],
        failFast: false
    });

    console.log("📊 Validation Results Output:");
    console.log(JSON.stringify(results, null, 2));

    if (!results.success) {
        console.error("❌ Agentic-QE Validation failed to pass all checks.");
        process.exit(1);
    } else {
        console.log("✅ Agentic-QE Validation confirmed PASS.");
    }
}

orchestrateValidation().catch(err => {
    console.error("AQE Exception:", err);
    process.exit(1);
});
