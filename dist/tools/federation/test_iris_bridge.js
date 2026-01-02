import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as os from 'os';
// Test Setup
const TEST_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-test-'));
const MOCK_PROJECT_ROOT = TEST_DIR;
const CONFIG_DIR = path.join(MOCK_PROJECT_ROOT, 'config/iris');
const GOALIE_DIR = path.join(MOCK_PROJECT_ROOT, '.goalie');
const MOCK_CONFIG = `
environments:
  infrastructure:
    - test_infra
  cms_interfaces:
    - test_cms
  communication_stack:
    - test_comm
  messaging_protocols:
    - test_proto

monitoring:
  critical_components:
    - test_infra
  urgent_components:
    - test_comm
  important_components:
    - test_cms
`;
// Helper to set up environment
function setup() {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    fs.mkdirSync(GOALIE_DIR, { recursive: true });
    fs.writeFileSync(path.join(CONFIG_DIR, 'production_environments.yaml'), MOCK_CONFIG);
}
// Helper to cleanup
function cleanup() {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
}
async function runTest() {
    console.log("🧪 Starting IRIS Bridge Unit Test...");
    setup();
    try {
        const bridgeScript = path.resolve(__dirname, 'iris_bridge.ts');
        // Execute the bridge script with MOCK_PROJECT_ROOT env var
        // We use 'node' to run 'npx tsx' or directly 'npx tsx' if available. 
        // Assuming npx is in path.
        const command = `PROJECT_ROOT=${MOCK_PROJECT_ROOT} npx tsx ${bridgeScript} evaluate --context test_run`;
        console.log(`   Running: ${command}`);
        execSync(command, { stdio: 'inherit' });
        // Verify Output
        const metricsPath = path.join(GOALIE_DIR, 'metrics_log.jsonl');
        if (!fs.existsSync(metricsPath)) {
            throw new Error("Metrics log file was not created.");
        }
        const logContent = fs.readFileSync(metricsPath, 'utf8');
        const metrics = JSON.parse(logContent);
        // Assertions
        if (metrics.type !== 'iris_evaluation')
            throw new Error(`Expected type 'iris_evaluation', got '${metrics.type}'`);
        if (metrics.iris_command !== 'evaluate')
            throw new Error(`Expected command 'evaluate', got '${metrics.iris_command}'`);
        if (metrics.execution_context.environment !== 'production_simulation')
            throw new Error(`Unexpected environment: ${metrics.execution_context.environment}`);
        console.log("✅ Test Passed: Metrics logged correctly.");
    }
    catch (error) {
        console.error("❌ Test Failed:", error);
        process.exit(1);
    }
    finally {
        cleanup();
    }
}
runTest();
//# sourceMappingURL=test_iris_bridge.js.map