import { ValidationAppService, ValidationCheck, ValidationReport, ValidationRequested, ValidationCompleted } from './domain_model';
import * as assert from 'assert';

async function runTests() {
    console.log("Running DDD Integration Tests...");
    let passed = 0;
    let failed = 0;

    // Test 1: Feature flag OFF -> returns exit code 1 (blocker) or HTTP 403
    try {
        const appOff = new ValidationAppService(false);
        await appOff.validateEmail('test.eml');
        console.error("❌ Test 1 Failed: Should have thrown an error");
        failed++;
    } catch (e: any) {
        if (e.message.includes('EXIT CODE 1') || e.message.includes('HTTP 403')) {
            console.log("✅ Test 1 Passed: Feature flag OFF throws correct error (Blocker)");
            passed++;
        } else {
            console.error("❌ Test 1 Failed: Wrong error message", e.message);
            failed++;
        }
    }

    // Test 2: Feature flag ON -> returns JSON schema with {score, checks[], verdict} fields
    try {
        const appOn = new ValidationAppService(true);
        const report = await appOn.validateEmail('test.eml');
        const json = report.toJSON();
        
        assert.ok('score' in json);
        assert.ok('checks' in json);
        assert.ok('verdict' in json);
        assert.strictEqual(json.verdict, 'PASS');
        assert.strictEqual(json.score, 100);
        assert.strictEqual(json.checks.length, 3);
        
        console.log("✅ Test 2 Passed: Feature flag ON returns correct JSON schema");
        console.log(JSON.stringify(json, null, 2));
        passed++;
    } catch (e: any) {
        console.error("❌ Test 2 Failed:", e.message);
        failed++;
    }

    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
}

runTests();
