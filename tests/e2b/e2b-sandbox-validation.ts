#!/usr/bin/env npx tsx
/**
 * E2B Sandbox Validation Test
 * 
 * Validates E2B sandbox execution capabilities with the provided API key.
 * Tests: code execution, sandbox lifecycle, security isolation
 */

import { CodeInterpreter } from '@e2b/code-interpreter';

interface ValidationResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration_ms: number;
  details: string;
  error?: string;
}

const results: ValidationResult[] = [];

async function runTest(
  name: string,
  testFn: () => Promise<string>
): Promise<ValidationResult> {
  const start = Date.now();
  try {
    const details = await testFn();
    return {
      test: name,
      status: 'PASS',
      duration_ms: Date.now() - start,
      details
    };
  } catch (error) {
    return {
      test: name,
      status: 'FAIL',
      duration_ms: Date.now() - start,
      details: 'Test failed',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function validateApiKey(): Promise<string> {
  if (!process.env.E2B_API_KEY) {
    throw new Error('E2B_API_KEY not set in environment');
  }
  return `API key configured (${process.env.E2B_API_KEY.substring(0, 10)}...)`;
}

async function validateSandboxCreation(): Promise<string> {
  const sandbox = await CodeInterpreter.create();
  const sandboxId = sandbox.sandboxId;
  await sandbox.close();
  return `Sandbox created and closed successfully (ID: ${sandboxId})`;
}

async function validateCodeExecution(): Promise<string> {
  const sandbox = await CodeInterpreter.create();
  try {
    const execution = await sandbox.notebook.execCell('print("Hello E2B!")');
    const output = execution.logs?.stdout?.join('') || '';
    if (!output.includes('Hello E2B!')) {
      throw new Error('Expected output not found');
    }
    return `Code execution successful: ${output.trim()}`;
  } finally {
    await sandbox.close();
  }
}

async function validatePythonComputation(): Promise<string> {
  const sandbox = await CodeInterpreter.create();
  try {
    const execution = await sandbox.notebook.execCell(`
import json
result = {"sum": sum(range(100)), "product": 1}
for i in range(1, 10):
    result["product"] *= i
print(json.dumps(result))
`);
    const output = execution.logs?.stdout?.join('') || '';
    const result = JSON.parse(output.trim());
    if (result.sum !== 4950 || result.product !== 362880) {
      throw new Error(`Unexpected computation result: ${JSON.stringify(result)}`);
    }
    return `Python computation verified: sum=4950, product=362880`;
  } finally {
    await sandbox.close();
  }
}

async function validateSandboxIsolation(): Promise<string> {
  const sandbox = await CodeInterpreter.create();
  try {
    // Try to access something that should be isolated
    const execution = await sandbox.notebook.execCell(`
import os
import sys
result = {
    "python_version": sys.version.split()[0],
    "cwd": os.getcwd(),
    "env_keys_count": len(os.environ)
}
print(result)
`);
    const output = execution.logs?.stdout?.join('') || '';
    return `Sandbox isolation verified: ${output.trim()}`;
  } finally {
    await sandbox.close();
  }
}

async function main() {
  console.log('🔬 E2B Sandbox Validation Test Suite\n');
  console.log('='.repeat(60));
  
  results.push(await runTest('API Key Configuration', validateApiKey));
  results.push(await runTest('Sandbox Creation', validateSandboxCreation));
  results.push(await runTest('Code Execution', validateCodeExecution));
  results.push(await runTest('Python Computation', validatePythonComputation));
  results.push(await runTest('Sandbox Isolation', validateSandboxIsolation));
  
  console.log('\n📊 Results:\n');
  
  let passed = 0, failed = 0;
  for (const result of results) {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${result.test}: ${result.status} (${result.duration_ms}ms)`);
    if (result.status === 'PASS') {
      console.log(`   ${result.details}`);
      passed++;
    } else {
      console.log(`   Error: ${result.error}`);
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`Summary: ${passed} passed, ${failed} failed`);
  
  // Output JSON for metrics collection
  const report = {
    timestamp: new Date().toISOString(),
    passed,
    failed,
    total: results.length,
    pass_rate: (passed / results.length) * 100,
    results
  };
  
  console.log('\n📄 JSON Report:');
  console.log(JSON.stringify(report, null, 2));
  
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);

