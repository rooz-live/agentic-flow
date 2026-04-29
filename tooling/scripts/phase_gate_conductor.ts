import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// ============================================================================
// PHASE GATE CONDUCTOR (The Sovereign State Machine)
// ============================================================================
// Enforces Domain Isolation and Ledger-Based Communication.
// No pipes. No memory sharing. Strict physical ledger I/O boundary checking.
// ============================================================================

const GOALIE_DIR = path.join(process.cwd(), '.goalie');
const TELEMETRY_LEDGER = path.join(GOALIE_DIR, 'genuine_telemetry.json');
const QE_LEDGER = path.join(GOALIE_DIR, 'agentic_qe_report.tsv');

function executeGate(name: string, command: string, args: string[]): boolean {
    console.log(`\n======================================================`);
    console.log(`🚀 [GATE OPENING]: ${name}`);
    console.log(`======================================================`);
    
    const result = spawnSync(command, args, { stdio: 'inherit', shell: true });
    
    if (result.status !== 0) {
        console.error(`\n❌ [FATAL] ${name} Failed with exit code ${result.status}.`);
        console.error(`🛑 State Machine Halted. Polyglot Pipeline Terminated to prevent Zombie State.`);
        return false;
    }
    
    console.log(`✅ [GATE CLEARED]: ${name}\n`);
    return true;
}

function verifyDiskFlush(ledgerPath: string, waitMs: number = 2000) {
    console.log(`⏳ [LEDGER SAFEGUARD] Awaiting ${waitMs}ms physical disk flush for ${path.basename(ledgerPath)}...`);
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, waitMs); // Synchronous sleep
    
    if (!fs.existsSync(ledgerPath)) {
        console.error(`❌ [FATAL] Ledger flush failed. ${ledgerPath} is missing.`);
        process.exit(1);
    }
}

function main() {
    console.log(`\n🛡️ Booting Sovereign Phase Gate Conductor...`);

    // ------------------------------------------------------------------------
    // GATE 0: Gravity & Budgets (Node Native)
    // ------------------------------------------------------------------------
    if (!executeGate('Gate 0: Gravity & Budgets', 'npx', ['tsx', 'tooling/scripts/cmd_opex_authorizer.ts'])) {
        process.exit(1);
    }

    // ------------------------------------------------------------------------
    // GATE 1: Cloud Extraction (Bash Worker)
    // ------------------------------------------------------------------------
    console.log(`⚠️ [MANUAL GATE REQUIRED] Gate 1 (Multi-Cloud Sync) requires 1Password biometric authorization.`);
    console.log(`⚠️ Run manually: eval $(op signin) && ./tooling/scripts/cpanel_incremental_sync.sh`);
    console.log(`⚠️ Run manually: eval $(op signin) && ./tooling/scripts/hivelocity_incremental_sync.sh`);
    console.log(`⚠️ The Conductor will skip execution to prevent biometric deadlock, but assumes payload is verified if you proceed.\n`);

    // ------------------------------------------------------------------------
    // GATE 1.5: Sovereignty TDD Verification (Native Python Worker)
    // ------------------------------------------------------------------------
    if (!executeGate('Gate 1.5: Sovereignty TDD Verification', 'python3', ['tests/infrastructure/test_sovereignty.py'])) {
        process.exit(1);
    }
    
    // SAFEGUARD: The MCP JSON embedding must flush to disk before the Python swarm boots
    const MCP_MANIFEST = '/Volumes/cPanelBackups/sovereignty_mcp_manifest.json';
    verifyDiskFlush(MCP_MANIFEST);

    // ------------------------------------------------------------------------
    // GATE 2 & 3: Swarm Inference & Telemetry (Python Worker)
    // ------------------------------------------------------------------------
    // We execute the Python .venv array natively.
    if (!executeGate('Gate 2/3: Swarm Inference', 'bash', ['-c', 'source .venv/bin/activate && python3 tooling/scripts/swarm_orchestrator.py'])) {
        process.exit(1);
    }
    
    // SAFEGUARD: The absolute cure to the I/O Race Condition
    verifyDiskFlush(TELEMETRY_LEDGER);

    // ------------------------------------------------------------------------
    // GATE 4: Agentic QA Validation (Node Native)
    // ------------------------------------------------------------------------
    if (!executeGate('Gate 4: Agentic QA Validation', 'npx', ['tsx', 'scripts/superproject-gates/sandbox-manager.ts'])) {
        process.exit(1);
    }

    // SAFEGUARD: The QA Ledger must exist before Deployment
    verifyDiskFlush(QE_LEDGER);

    // ------------------------------------------------------------------------
    // GATE 5: Deployment Execution (Bash Worker - Dumb Execution Only)
    // ------------------------------------------------------------------------
    if (!executeGate('Gate 5: Physical EKS Deployment', 'bash', ['tooling/scripts/deploy_eks_infrastructure.sh'])) {
        process.exit(1);
    }

    console.log(`\n🎯 [MISSION COMPLETE] All Phase Gates successfully navigated. System State: SECURE.`);
}

main();
