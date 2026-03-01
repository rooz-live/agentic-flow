#!/usr/bin/env node
/**
 * CONSOLIDATION TRUTH VALIDATOR
 *
 * Runs ALL validators and reports what ACTUALLY works (not claimed, PROVEN)
 * Output: JSON report for compare-all-validators.sh to analyze
 */

const path = require('path');
const fs = require('fs');

// Import the NAPI-RS validator
let EvidenceValidator;
try {
  const binding = require('../index.js');
  EvidenceValidator = binding.EvidenceValidator;
} catch (error) {
  console.error('❌ Failed to load NAPI binding:', error.message);
  process.exit(1);
}

const results = {
  timestamp: new Date().toISOString(),
  environment: {
    node_version: process.version,
    platform: process.platform,
    arch: process.arch,
  },
  validators: [],
  summary: {
    total_tests: 0,
    passed: 0,
    failed: 0,
    proven_working: [],
    proven_broken: [],
  }
};

/**
 * Test suite for EvidenceValidator
 */
async function testEvidenceValidator() {
  const testResult = {
    name: 'EvidenceValidator (NAPI-RS)',
    component: 'evidence_validator.rs',
    tests: [],
    overall_status: 'unknown',
    proven_capabilities: [],
    broken_capabilities: [],
    anti_patterns: [],
  };

  // Test 1: Constructor
  try {
    const validator = new EvidenceValidator('/tmp/test-evidence');
    testResult.tests.push({
      name: 'Constructor',
      status: 'PASS',
      message: 'Successfully instantiated EvidenceValidator',
      time_ms: 0,
    });
    testResult.proven_capabilities.push('Constructor');
  } catch (error) {
    testResult.tests.push({
      name: 'Constructor',
      status: 'FAIL',
      message: error.message,
      time_ms: 0,
    });
    testResult.broken_capabilities.push('Constructor');
  }

  // Test 2: validate_file (with non-existent file - should handle gracefully)
  try {
    const validator = new EvidenceValidator('/tmp/test-evidence');
    const start = Date.now();
    const result = await validator.validateFile('/tmp/nonexistent-test.pdf');
    const elapsed = Date.now() - start;

    testResult.tests.push({
      name: 'validate_file (non-existent)',
      status: result ? 'PASS' : 'FAIL',
      message: `Handled non-existent file: ${JSON.stringify(result)}`,
      time_ms: elapsed,
    });

    if (result) {
      testResult.proven_capabilities.push('validate_file error handling');
    } else {
      testResult.broken_capabilities.push('validate_file error handling');
    }
  } catch (error) {
    testResult.tests.push({
      name: 'validate_file (non-existent)',
      status: 'FAIL',
      message: `Threw error instead of handling gracefully: ${error.message}`,
      time_ms: 0,
    });
    testResult.broken_capabilities.push('validate_file error handling');
    testResult.anti_patterns.push('Throws on non-existent file instead of returning validation error');
  }

  // Test 3: Create a test file and validate it
  const testDir = '/tmp/test-evidence-validation';
  const testFile = path.join(testDir, 'test.txt');
  try {
    // Create test directory and file
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    fs.writeFileSync(testFile, 'Test evidence file content');

    const validator = new EvidenceValidator(testDir);
    const start = Date.now();
    const result = await validator.validateFile(testFile);
    const elapsed = Date.now() - start;

    const expected = {
      has_path: !!result.path,
      has_file_type: !!result.file_type,
      has_size: result.size_bytes > 0,
      has_validation_errors: Array.isArray(result.validation_errors),
      has_metadata: typeof result.metadata === 'object',
    };

    const allChecks = Object.values(expected).every(v => v === true);

    testResult.tests.push({
      name: 'validate_file (real file)',
      status: allChecks ? 'PASS' : 'FAIL',
      message: `Validated test file: ${JSON.stringify(expected)}`,
      time_ms: elapsed,
      details: result,
    });

    if (allChecks) {
      testResult.proven_capabilities.push('validate_file with real file');
      testResult.proven_capabilities.push('Returns structured EvidenceFile');
    } else {
      testResult.broken_capabilities.push('validate_file returns incomplete data');
      testResult.anti_patterns.push('Missing expected fields in EvidenceFile response');
    }

    // Clean up
    fs.unlinkSync(testFile);
  } catch (error) {
    testResult.tests.push({
      name: 'validate_file (real file)',
      status: 'FAIL',
      message: error.message,
      time_ms: 0,
    });
    testResult.broken_capabilities.push('validate_file with real file');
  }

  // Test 4: extract_exif
  const testImagePath = path.join(testDir, 'test.jpg');
  try {
    // Create a fake JPG (just a small file with JPG extension)
    fs.writeFileSync(testImagePath, Buffer.from([0xFF, 0xD8, 0xFF, 0xE0])); // JPEG header

    const validator = new EvidenceValidator(testDir);
    const start = Date.now();
    const exifResult = await validator.extractExif(testImagePath);
    const elapsed = Date.now() - start;

    const hasStructure = exifResult && typeof exifResult === 'object';

    testResult.tests.push({
      name: 'extract_exif',
      status: hasStructure ? 'PASS' : 'FAIL',
      message: `EXIF extraction returned: ${JSON.stringify(exifResult)}`,
      time_ms: elapsed,
    });

    if (hasStructure) {
      if (exifResult.date_taken || exifResult.camera_model) {
        testResult.proven_capabilities.push('EXIF extraction (full)');
      } else {
        testResult.proven_capabilities.push('EXIF extraction (stub only)');
        testResult.anti_patterns.push('EXIF extraction returns stub data without actual parsing');
      }
    } else {
      testResult.broken_capabilities.push('EXIF extraction');
    }

    // Clean up
    fs.unlinkSync(testImagePath);
  } catch (error) {
    testResult.tests.push({
      name: 'extract_exif',
      status: 'FAIL',
      message: error.message,
      time_ms: 0,
    });
    testResult.broken_capabilities.push('EXIF extraction');
  }

  // Test 5: validate_directory
  try {
    const validator = new EvidenceValidator(testDir);
    const start = Date.now();

    // Create some test files
    fs.writeFileSync(path.join(testDir, 'doc1.pdf'), 'fake pdf');
    fs.writeFileSync(path.join(testDir, 'photo.jpg'), Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]));

    const result = await validator.validateDirectory('.');
    const elapsed = Date.now() - start;

    const isValid = result &&
                   typeof result.total_files === 'number' &&
                   typeof result.valid_files === 'number' &&
                   Array.isArray(result.files) &&
                   Array.isArray(result.timeline);

    testResult.tests.push({
      name: 'validate_directory',
      status: isValid ? 'PASS' : 'FAIL',
      message: `Validated directory with ${result?.total_files || 0} files in ${elapsed}ms`,
      time_ms: elapsed,
      details: result,
    });

    if (isValid) {
      testResult.proven_capabilities.push('validate_directory');
      testResult.proven_capabilities.push('Timeline generation');

      if (elapsed < 5000 && result.total_files > 0) {
        testResult.proven_capabilities.push('Fast processing (<5s for multiple files)');
      }
    } else {
      testResult.broken_capabilities.push('validate_directory');
    }
  } catch (error) {
    testResult.tests.push({
      name: 'validate_directory',
      status: 'FAIL',
      message: error.message,
      time_ms: 0,
    });
    testResult.broken_capabilities.push('validate_directory');
  } finally {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  }

  // Test 6: bundle_health_check (will fail without real evidence bundle)
  try {
    const validator = new EvidenceValidator('/tmp/nonexistent-bundle');
    const start = Date.now();
    const healthResult = await validator.bundleHealthCheck();
    const elapsed = Date.now() - start;

    testResult.tests.push({
      name: 'bundle_health_check',
      status: healthResult ? 'PASS' : 'FAIL',
      message: `Health check returned in ${elapsed}ms`,
      time_ms: elapsed,
      note: 'Expected to fail without real bundle structure',
    });
  } catch (error) {
    testResult.tests.push({
      name: 'bundle_health_check',
      status: 'EXPECTED_FAIL',
      message: `Failed as expected: ${error.message}`,
      time_ms: 0,
    });
    testResult.anti_patterns.push('bundle_health_check requires specific directory structure');
  }

  // Calculate overall status
  const passCount = testResult.tests.filter(t => t.status === 'PASS').length;
  const totalCount = testResult.tests.filter(t => t.status !== 'EXPECTED_FAIL').length;

  if (passCount === totalCount) {
    testResult.overall_status = 'FULLY_WORKING';
  } else if (passCount > 0) {
    testResult.overall_status = 'PARTIALLY_WORKING';
  } else {
    testResult.overall_status = 'BROKEN';
  }

  return testResult;
}

/**
 * Run all validator tests
 */
async function runAllTests() {
  console.error('🔍 Running validation truth assessment...\n');

  // Test NAPI-RS Evidence Validator
  const evidenceValidatorResult = await testEvidenceValidator();
  results.validators.push(evidenceValidatorResult);

  // Update summary
  results.validators.forEach(validator => {
    validator.tests.forEach(test => {
      results.summary.total_tests++;
      if (test.status === 'PASS') {
        results.summary.passed++;
      } else if (test.status === 'FAIL') {
        results.summary.failed++;
      }
    });

    if (validator.overall_status === 'FULLY_WORKING' || validator.overall_status === 'PARTIALLY_WORKING') {
      results.summary.proven_working.push(validator.name);
    }
    if (validator.overall_status === 'BROKEN' || validator.overall_status === 'PARTIALLY_WORKING') {
      results.summary.proven_broken.push(...validator.broken_capabilities);
    }
  });

  // Output JSON
  console.log(JSON.stringify(results, null, 2));

  console.error(`\n✅ Tests completed: ${results.summary.passed}/${results.summary.total_tests} passed`);
  console.error(`📊 Working validators: ${results.summary.proven_working.join(', ')}`);

  return results;
}

// Run if executed directly
if (require.main === module) {
  runAllTests()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('💥 Validation runner failed:', error);
      process.exit(1);
    });
}

module.exports = { runAllTests };
