import {
    ValidationAppService, ValidationCheck, ValidationReport,
    checkBounds, checkPlaceholders, checkContactInfo, checkProSe
} from './domain_model';
import * as assert from 'assert';

async function runTests() {
    console.log("Running DDD Parity Tests (vs email-gate-lean.sh)...\n");
    let passed = 0;
    let failed = 0;

    function test(name: string, fn: () => void) {
        try {
            fn();
            console.log(`✅ ${name}`);
            passed++;
        } catch (e: any) {
            console.error(`❌ ${name}: ${e.message}`);
            failed++;
        }
    }

    // --- Feature flag ---
    test("Feature flag OFF throws blocker", async () => {
        const app = new ValidationAppService(false);
        let threw = false;
        try { await app.validateEmail('test.eml', ''); } catch { threw = true; }
        assert.ok(threw, "Should throw when feature flag is off");
    });

    // --- Check 0: Bounds ---
    test("Bounds: general email under 32KB passes", () => {
        const r = checkBounds('/tmp/test.eml', 'x'.repeat(1000));
        assert.ok(r.passed);
        assert.strictEqual(r.severity, 'INFO');
    });

    test("Bounds: general email over 32KB is BLOCKER", () => {
        const r = checkBounds('/tmp/test.eml', 'x'.repeat(33000));
        assert.ok(!r.passed);
        assert.strictEqual(r.severity, 'BLOCKER');
    });

    test("Bounds: legal email gets 64KB limit", () => {
        const r = checkBounds('/path/BHOPTI-LEGAL/email.eml', 'x'.repeat(50000));
        assert.ok(r.passed, "50KB should be under 64KB legal limit");
    });

    test("Bounds: utilities email gets 16KB limit", () => {
        const r = checkBounds('/path/utilities/duke-energy.eml', 'x'.repeat(20000));
        assert.ok(!r.passed, "20KB should exceed 16KB utilities limit");
    });

    // --- Check 1: Placeholders ---
    test("Placeholders: clean email passes", () => {
        const r = checkPlaceholders('To: shahrooz@bhopti.com\nSubject: Test');
        assert.ok(r.passed);
    });

    test("Placeholders: @example.com is BLOCKER", () => {
        const r = checkPlaceholders('To: test@example.com\nSubject: Test');
        assert.ok(!r.passed);
        assert.strictEqual(r.severity, 'BLOCKER');
    });

    test("Placeholders: [YOUR_EMAIL] is BLOCKER", () => {
        const r = checkPlaceholders('Contact: [YOUR_EMAIL]');
        assert.ok(!r.passed);
        assert.strictEqual(r.severity, 'BLOCKER');
    });

    // --- Check 2: Contact Info ---
    test("Contact: phone number detected", () => {
        const r = checkContactInfo('Call (704) 555-1234', '/tmp/test.eml');
        assert.ok(r.passed);
    });

    test("Contact: s@rooz.live detected", () => {
        const r = checkContactInfo('Email: s@rooz.live', '/tmp/test.eml');
        assert.ok(r.passed);
    });

    test("Contact: missing in legal email is BLOCKER", () => {
        const r = checkContactInfo('Case 26CV005596 filed', '/tmp/legal.eml');
        assert.ok(!r.passed);
        assert.strictEqual(r.severity, 'BLOCKER');
    });

    test("Contact: missing in non-legal is WARNING", () => {
        const r = checkContactInfo('Hello world', '/tmp/casual.eml');
        assert.ok(!r.passed);
        assert.strictEqual(r.severity, 'WARNING');
    });

    // --- Check 3: Pro Se ---
    test("Pro Se: non-legal email skipped (passes)", () => {
        const r = checkProSe('Just a regular email');
        assert.ok(r.passed);
    });

    test("Pro Se: legal email with designation passes", () => {
        const r = checkProSe('Case 26CV005596\nShahrooz Bhopti, Pro Se Plaintiff');
        assert.ok(r.passed);
    });

    test("Pro Se: legal email without designation is BLOCKER", () => {
        const r = checkProSe('Case 26CV005596\nShahrooz Bhopti');
        assert.ok(!r.passed);
        assert.strictEqual(r.severity, 'BLOCKER');
    });

    test("Pro Se: self-represented variant passes", () => {
        const r = checkProSe('Case 26CV005596\nself-represented litigant');
        assert.ok(r.passed);
    });

    // --- Integration: full pipeline ---
    test("Integration: clean legal email with all fields passes", async () => {
        const app = new ValidationAppService(true);
        const content = `To: gary.grimes@maa.com
From: shahrooz@bhopti.com
Subject: Case 26CV005596 - Motion Response

Case 26CV005596

Contact: (704) 555-1234
Shahrooz Bhopti, Pro Se Plaintiff`;
        const report = await app.validateEmail('/path/BHOPTI-LEGAL/motion.eml', content);
        assert.strictEqual(report.verdict, 'PASS');
        assert.strictEqual(report.blockers.length, 0);
    });

    test("Integration: email with placeholder fails", async () => {
        const app = new ValidationAppService(true);
        const content = `To: test@example.com\nSubject: Test\nshahrooz@bhopti.com\nPro Se`;
        const report = await app.validateEmail('/tmp/test.eml', content);
        assert.strictEqual(report.verdict, 'FAIL');
        assert.ok(report.blockers.length > 0);
    });

    // --- Summary ---
    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
}

runTests();
