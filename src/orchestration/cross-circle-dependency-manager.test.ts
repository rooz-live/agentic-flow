import { CrossCircleDependencyManager, CircleTask } from './cross-circle-dependency-manager';

async function executeVerification() {
    console.log("=== Initiating WSJF 13.0 Cross-Circle DAG Verification ===");
    
    const manager = new CrossCircleDependencyManager();

    const tasks: CircleTask[] = [
        { id: 'T1_Innovator', circle: 'Innovator', description: 'Exploratory Analytics', severity: 'WARNING', dependencies: [], state: 'PENDING' },
        { id: 'T2_Testing', circle: 'Testing', description: 'Orthogonal Build', severity: 'CRITICAL', dependencies: [], softDependencies: ['T1_Innovator'], state: 'PENDING' },
        { id: 'T3_Analyst', circle: 'Analyst', description: 'Core Feasibility', severity: 'CRITICAL', dependencies: [], state: 'PENDING' },
        { id: 'T4_Orchestrator', circle: 'Orchestrator', description: 'PI Execution Sync', severity: 'CRITICAL', dependencies: ['T3_Analyst'], state: 'PENDING' }
    ];

    console.log("[Verification] Seeding DAG with Holacracy Circle tasks...");
    tasks.forEach(t => manager.registerTask(t));

    console.log("[Verification] Resolving topological deployment tiers...");
    const tiers = manager.resolveTopology();
    
    console.log(`Topology resolved into ${tiers.length} distinct sequential bounds:`);
    tiers.forEach((tier, index) => {
        console.log(`   Tier ${index + 1}: ${tier.join(' -> ')}`);
    });

    console.log("\n[Verification] Test 1: Simulating WARNING friction in T1_Innovator (Does not abort T2_Testing)...");
    manager.resolveTask('T1_Innovator', false); // T1 Fails, but as a WARNING. T2_Testing is a soft dependent and should NOT abort.
    
    let status = manager.getStatus();
    const t2Node = status.find(t => t.id === 'T2_Testing');
    if (t2Node && t2Node.state === 'ABORTED') {
        console.error("FAIL: Sequence starved soft-bound testing node!");
        process.exit(1);
    }
    console.log("-> Success: T2_Testing survived the soft dependency friction.");

    console.log("\n[Verification] Test 2: Simulating CRITICAL failure in T3_Analyst (Aborts downstream Orchestrator)...");
    manager.resolveTask('T3_Analyst', false); // T3 Fails as CRITICAL.

    status = manager.getStatus();
    const t4Node = status.find(t => t.id === 'T4_Orchestrator');
    if (t4Node && t4Node.state !== 'ABORTED') {
        console.error("FAIL: Strict cascade failed to abort Orchestrator node!");
        process.exit(1);
    }
    
    console.log("\nFinal Array State:");
    status.forEach(t => {
        console.log(`[${t.circle}] ${t.id} - ${t.state}`);
    });

    console.log("\n✅ SUCCESS: Dependency Manager perfectly balances risk-banding execution speed and strict frugality!");
}

executeVerification().catch(e => {
    console.error("Verification traces failed critically.", e);
    process.exit(1);
});
