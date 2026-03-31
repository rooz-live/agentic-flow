"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const fs_1 = require("fs");
const path_1 = require("path");
const health_checks_1 = __importDefault(require("../src/core/health-checks"));
const governance_system_1 = __importDefault(require("../src/governance/core/governance_system"));
const GOALIE_DIR = '.goalie-verification';
const DB_PATH = (0, path_1.join)(GOALIE_DIR, 'governance.db');
async function verifyP0() {
    console.log('--- Starting P0 Verification ---');
    if (!(0, fs_1.existsSync)(GOALIE_DIR)) {
        require('fs').mkdirSync(GOALIE_DIR, { recursive: true });
    }
    // P0-TRUTH: GovernanceSystem
    console.log('\n[P0-TRUTH] Verifying GovernanceSystem...');
    const govSystem = new governance_system_1.default({
        goalieDir: GOALIE_DIR,
        autoLogDecisions: true,
        strictMode: true
    });
    // Mock pattern events for testing
    const patternMetricsPath = (0, path_1.join)(GOALIE_DIR, 'pattern_metrics.jsonl');
    const mockEvent = {
        ts: new Date().toISOString(),
        pattern: 'safe-degrade',
        mode: 'advisory',
        gate: 'health',
        circle: 'planning',
        alignment_score: { overall_drift: 0.05 }
    };
    require('fs').writeFileSync(patternMetricsPath, JSON.stringify(mockEvent) + '\n');
    const compliance = await govSystem.checkCompliance();
    console.log('Compliance Check Result:', compliance.length > 0 ? 'PASS' : 'FAIL');
    if (compliance.length === 0) {
        console.error('Expected compliance checks to return results');
        process.exit(1);
    }
    // P0-TIME: DecisionAudit
    console.log('\n[P0-TIME] Verifying DecisionAudit...');
    // Force a decision to test logging
    const actionValid = await govSystem.validateAction('test-action', { circle: 'verification' });
    console.log('Action Validation:', actionValid);
    // Check DB
    const db = new better_sqlite3_1.default(DB_PATH);
    const row = db.prepare('SELECT * FROM decision_audit ORDER BY id DESC LIMIT 1').get();
    if (row) {
        console.log('Logged Decision:', row.decision_id);
        console.log('Table: decision_audit');
        console.log('Columns:', Object.keys(row).join(', '));
        if (row.evidence_chain === null && row.alternatives === null) {
            console.log('Note: evidence_chain/alternatives are null (expected for this test)');
        }
    }
    else {
        console.error('Failed to log decision to DB');
        process.exit(1);
    }
    db.close();
    // P0-LIVE: HealthCheck
    console.log('\n[P0-LIVE] Verifying HealthCheckSystem...');
    const healthSystem = new health_checks_1.default({
        baseIntervalMs: 1000,
        minIntervalMs: 100,
        maxIntervalMs: 2000
    });
    // Simulate normal
    console.log('Initial Interval:', healthSystem.getAdaptiveInterval());
    // Simulate stress (failures)
    for (let i = 0; i < 10; i++) {
        healthSystem.calculateAnomalyRate([{ success: false, latency: 5000 }]);
    }
    const stressedInterval = healthSystem.getAdaptiveInterval();
    console.log('Stressed Interval:', stressedInterval);
    if (stressedInterval < 1000) {
        console.log('PASS: Interval decreased under stress');
    }
    else {
        console.error('FAIL: Interval did not decrease enough');
        process.exit(1);
    }
    console.log('\n--- P0 Verification Complete ---');
}
verifyP0().catch(console.error);
