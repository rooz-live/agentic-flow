import { FullConfig } from '@playwright/test';

/**
 * Global teardown for Playwright tests
 * 
 * Cleans up after test execution and generates summary reports
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up Playwright test environment...');
  
  // Generate test summary
  const fs = require('fs');
  const path = require('path');
  
  const resultsFile = '.goalie/playwright-results.json';
  if (fs.existsSync(resultsFile)) {
    const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
    
    console.log('\n📊 Test Summary:');
    console.log(`  Total tests: ${results.suites?.reduce((acc: number, s: any) => acc + s.specs.length, 0) || 0}`);
    console.log(`  Passed: ${results.suites?.reduce((acc: number, s: any) => 
      acc + s.specs.reduce((specAcc: number, spec: any) => 
        specAcc + spec.tests.filter((t: any) => t.results[0]?.status === 'passed').length, 0), 0) || 0}`);
    console.log(`  Failed: ${results.suites?.reduce((acc: number, s: any) => 
      acc + s.specs.reduce((specAcc: number, spec: any) => 
        specAcc + spec.tests.filter((t: any) => t.results[0]?.status === 'failed').length, 0), 0) || 0}`);
    console.log(`  Flaky: ${results.suites?.reduce((acc: number, s: any) => 
      acc + s.specs.reduce((specAcc: number, spec: any) => 
        specAcc + spec.tests.filter((t: any) => t.results[0]?.status === 'skipped').length, 0), 0) || 0}`);
  }
  
  // Cleanup temporary files older than 24 hours
  const testResultsDir = 'test-results';
  if (fs.existsSync(testResultsDir)) {
    const files = fs.readdirSync(testResultsDir);
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    
    files.forEach(file => {
      const filePath = path.join(testResultsDir, file);
      const stat = fs.statSync(filePath);
      
      if (now - stat.mtime.getTime() > dayMs) {
        if (fs.statSync(filePath).isDirectory()) {
          fs.rmSync(filePath, { recursive: true });
        } else {
          fs.unlinkSync(filePath);
        }
        console.log(`Cleaned old file: ${file}`);
      }
    });
  }
  
  console.log('✅ Playwright teardown complete');
}

export default globalTeardown;
