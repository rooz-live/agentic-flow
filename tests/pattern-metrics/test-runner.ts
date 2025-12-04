#!/usr/bin/env node

/**
 * Pattern Metrics Test Runner
 *
 * Comprehensive test execution and reporting system for pattern metrics validation.
 * Provides detailed coverage analysis, performance metrics, and test result summaries.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  tests: number;
  failures: number;
  coverage?: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
  errors?: string[];
}

interface TestReport {
  timestamp: string;
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    totalDuration: number;
    successRate: number;
  };
  suites: TestResult[];
  coverage?: {
    overall: {
      lines: number;
      functions: number;
      branches: number;
      statements: number;
    };
    files: Array<{
      path: string;
      lines: number;
      functions: number;
      branches: number;
      statements: number;
    }>;
  };
  performance: {
    fastestSuite: string;
    slowestSuite: string;
    averageDuration: number;
  };
}

class PatternMetricsTestRunner {
  private testRoot: string;
  private coverageDir: string;
  private reportDir: string;

  constructor() {
    this.testRoot = path.join(__dirname);
    this.coverageDir = path.join(this.testRoot, '..', '..', 'coverage');
    this.reportDir = path.join(this.testRoot, '..', '..', 'test-reports');
  }

  async runAllTests(): Promise<TestReport> {
    console.log('🚀 Running Pattern Metrics Test Suite...\n');

    // Ensure report directory exists
    await this.ensureDirectory(this.reportDir);

    const startTime = Date.now();
    const testSuites = [
      'schema-validation.test.ts',
      'performance-benchmarks.test.ts',
      'integration/pattern-analyzer.test.ts',
      'anomaly-detection.test.ts',
      'schema-compliance.test.ts',
      'regression/regression-suite.test.ts',
      'economic-scoring.test.ts',
      'timeline-verification.test.ts'
    ];

    const results: TestResult[] = [];

    for (const suite of testSuites) {
      const result = await this.runTestSuite(suite);
      results.push(result);
      console.log(`  ${this.getStatusIcon(result.status)} ${suite} (${result.duration}ms, ${result.tests} tests)`);
    }

    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    // Load coverage data if available
    const coverageData = await this.loadCoverageData();

    const report: TestReport = {
      timestamp: new Date().toISOString(),
      summary: this.calculateSummary(results, totalDuration),
      suites: results,
      coverage: coverageData,
      performance: this.calculatePerformanceMetrics(results)
    };

    // Generate report files
    await this.generateReports(report);

    // Print summary
    this.printSummary(report);

    return report;
  }

  private async runTestSuite(suitePath: string): Promise<TestResult> {
    const fullPath = path.join(this.testRoot, suitePath);
    const suiteName = path.basename(suitePath, '.test.ts');

    try {
      const startTime = Date.now();

      // Run Jest for this specific test suite
      const jestOutput = execSync(`npx jest "${fullPath}" --verbose --json`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'inherit'],
        cwd: path.join(this.testRoot, '..', '..')
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Parse Jest JSON output
      const jestResult = this.parseJestOutput(jestOutput);

      return {
        name: suiteName,
        status: jestResult.numFailedTests === 0 ? 'passed' : 'failed',
        duration,
        tests: jestResult.numTotalTests,
        failures: jestResult.numFailedTests,
        coverage: jestResult.coverageMap ? this.extractCoverage(jestResult.coverageMap, suitePath) : undefined,
        errors: jestResult.failureMessages
      };

    } catch (error: any) {
      return {
        name: suiteName,
        status: 'failed',
        duration: 0,
        tests: 0,
        failures: 1,
        errors: [error.message]
      };
    }
  }

  private parseJestOutput(output: string): any {
    try {
      const lines = output.split('\n');
      const jsonLine = lines.find(line => line.trim().startsWith('{') && line.trim().endsWith('}'));
      return jsonLine ? JSON.parse(jsonLine) : { numTotalTests: 0, numFailedTests: 0 };
    } catch {
      return { numTotalTests: 0, numFailedTests: 0 };
    }
  }

  private extractCoverage(coverageMap: any, suitePath: string): TestResult['coverage'] {
    // Simple coverage extraction - would need proper Jest coverage parsing
    return {
      lines: 0,
      functions: 0,
      branches: 0,
      statements: 0
    };
  }

  private calculateSummary(results: TestResult[], totalDuration: number): TestReport['summary'] {
    const totalTests = results.reduce((sum, r) => sum + r.tests, 0);
    const passedTests = results.reduce((sum, r) => sum + (r.status === 'passed' ? r.tests : 0), 0);
    const failedTests = results.reduce((sum, r) => sum + (r.status === 'failed' ? r.failures : 0), 0);
    const skippedTests = results.reduce((sum, r) => sum + (r.status === 'skipped' ? r.tests : 0), 0);

    return {
      totalTests,
      passed: passedTests,
      failed: failedTests,
      skipped: skippedTests,
      totalDuration,
      successRate: totalTests > 0 ? (passedTests / totalTests) * 100 : 0
    };
  }

  private calculatePerformanceMetrics(results: TestResult[]): TestReport['performance'] {
    const durations = results.map(r => r.duration).filter(d => d > 0);

    if (durations.length === 0) {
      return {
        fastestSuite: 'N/A',
        slowestSuite: 'N/A',
        averageDuration: 0
      };
    }

    const sortedDurations = [...results]
      .filter(r => r.duration > 0)
      .sort((a, b) => a.duration - b.duration);

    return {
      fastestSuite: sortedDurations[0]?.name || 'N/A',
      slowestSuite: sortedDurations[sortedDurations.length - 1]?.name || 'N/A',
      averageDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length
    };
  }

  private async loadCoverageData(): Promise<TestReport['coverage']> {
    try {
      const coverageFile = path.join(this.coverageDir, 'coverage-summary.json');
      if (fs.existsSync(coverageFile)) {
        const coverageData = JSON.parse(fs.readFileSync(coverageFile, 'utf-8'));
        return {
          overall: {
            lines: coverageData.total?.lines?.pct || 0,
            functions: coverageData.total?.functions?.pct || 0,
            branches: coverageData.total?.branches?.pct || 0,
            statements: coverageData.total?.statements?.pct || 0
          },
          files: Object.entries(coverageData).map(([file, data]: [string, any]) => ({
            path: file,
            lines: data.lines?.pct || 0,
            functions: data.functions?.pct || 0,
            branches: data.branches?.pct || 0,
            statements: data.statements?.pct || 0
          }))
        };
      }
    } catch (error) {
      console.warn('Could not load coverage data:', error);
    }

    return undefined;
  }

  private async generateReports(report: TestReport): Promise<void> {
    // JSON report
    const jsonReport = JSON.stringify(report, null, 2);
    await fs.promises.writeFile(
      path.join(this.reportDir, 'pattern-metrics-test-report.json'),
      jsonReport
    );

    // HTML report
    const htmlReport = this.generateHTMLReport(report);
    await fs.promises.writeFile(
      path.join(this.reportDir, 'pattern-metrics-test-report.html'),
      htmlReport
    );

    // Markdown report
    const mdReport = this.generateMarkdownReport(report);
    await fs.promises.writeFile(
      path.join(this.reportDir, 'pattern-metrics-test-report.md'),
      mdReport
    );
  }

  private generateHTMLReport(report: TestReport): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Pattern Metrics Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .metric { background: white; padding: 15px; border-radius: 5px; border: 1px solid #ddd; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #333; }
        .metric-label { color: #666; margin-top: 5px; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .skipped { color: #ffc107; }
        .test-suite { background: white; margin-bottom: 10px; padding: 15px; border-radius: 5px; border: 1px solid #ddd; }
        .suite-header { display: flex; justify-content: between; align-items: center; margin-bottom: 10px; }
        .suite-name { font-weight: bold; }
        .suite-status { padding: 5px 10px; border-radius: 3px; color: white; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { text-align: left; padding: 8px; border-bottom: 1px solid #ddd; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Pattern Metrics Test Report</h1>
        <p>Generated: ${new Date(report.timestamp).toLocaleString()}</p>
    </div>

    <div class="summary">
        <div class="metric">
            <div class="metric-value ${report.summary.failed === 0 ? 'passed' : 'failed'}">
                ${report.summary.successRate.toFixed(1)}%
            </div>
            <div class="metric-label">Success Rate</div>
        </div>
        <div class="metric">
            <div class="metric-value">${report.summary.totalTests}</div>
            <div class="metric-label">Total Tests</div>
        </div>
        <div class="metric">
            <div class="metric-value passed">${report.summary.passed}</div>
            <div class="metric-label">Passed</div>
        </div>
        <div class="metric">
            <div class="metric-value failed">${report.summary.failed}</div>
            <div class="metric-label">Failed</div>
        </div>
        <div class="metric">
            <div class="metric-value">${(report.summary.totalDuration / 1000).toFixed(1)}s</div>
            <div class="metric-label">Total Duration</div>
        </div>
    </div>

    <h2>Test Suite Results</h2>
    ${report.suites.map(suite => `
        <div class="test-suite">
            <div class="suite-header">
                <span class="suite-name">${suite.name}</span>
                <span class="suite-status ${suite.status}">${suite.status.toUpperCase()}</span>
                <span>${suite.tests} tests (${suite.duration}ms)</span>
            </div>
            ${suite.failures > 0 ? `<div class="failed">Failures: ${suite.failures}</div>` : ''}
            ${suite.coverage ? `
                <div>Coverage: ${suite.coverage.lines}% lines, ${suite.coverage.functions}% functions</div>
            ` : ''}
        </div>
    `).join('')}

    ${report.coverage ? `
        <h2>Coverage Report</h2>
        <div class="summary">
            <div class="metric">
                <div class="metric-value">${report.coverage.overall.lines.toFixed(1)}%</div>
                <div class="metric-label">Lines</div>
            </div>
            <div class="metric">
                <div class="metric-value">${report.coverage.overall.functions.toFixed(1)}%</div>
                <div class="metric-label">Functions</div>
            </div>
            <div class="metric">
                <div class="metric-value">${report.coverage.overall.branches.toFixed(1)}%</div>
                <div class="metric-label">Branches</div>
            </div>
            <div class="metric">
                <div class="metric-value">${report.coverage.overall.statements.toFixed(1)}%</div>
                <div class="metric-label">Statements</div>
            </div>
        </div>
    ` : ''}

    <h2>Performance Metrics</h2>
    <div class="summary">
        <div class="metric">
            <div class="metric-value">${report.performance.fastestSuite}</div>
            <div class="metric-label">Fastest Suite</div>
        </div>
        <div class="metric">
            <div class="metric-value">${report.performance.slowestSuite}</div>
            <div class="metric-label">Slowest Suite</div>
        </div>
        <div class="metric">
            <div class="metric-value">${report.performance.averageDuration.toFixed(0)}ms</div>
            <div class="metric-label">Average Duration</div>
        </div>
    </div>
</body>
</html>`;
  }

  private generateMarkdownReport(report: TestReport): string {
    return `# Pattern Metrics Test Report

**Generated:** ${new Date(report.timestamp).toLocaleString()}

## Summary

| Metric | Value |
|--------|-------|
| Total Tests | ${report.summary.totalTests} |
| Passed | ${report.summary.passed} |
| Failed | ${report.summary.failed} |
| Skipped | ${report.summary.skipped} |
| Success Rate | ${report.summary.successRate.toFixed(1)}% |
| Total Duration | ${(report.summary.totalDuration / 1000).toFixed(1)}s |

## Test Suite Results

${report.suites.map(suite => `
### ${suite.name}

- **Status:** ${suite.status.toUpperCase()}
- **Tests:** ${suite.tests}
- **Duration:** ${suite.duration}ms
${suite.failures > 0 ? `- **Failures:** ${suite.failures}` : ''}
${suite.coverage ? `- **Coverage:** ${suite.coverage.lines}% lines, ${suite.coverage.functions}% functions` : ''}
`).join('')}

${report.coverage ? `
## Coverage Report

| Metric | Coverage |
|--------|---------|
| Lines | ${report.coverage.overall.lines.toFixed(1)}% |
| Functions | ${report.coverage.overall.functions.toFixed(1)}% |
| Branches | ${report.coverage.overall.branches.toFixed(1)}% |
| Statements | ${report.coverage.overall.statements.toFixed(1)}% |
` : ''}

## Performance Metrics

- **Fastest Suite:** ${report.performance.fastestSuite}
- **Slowest Suite:** ${report.performance.slowestSuite}
- **Average Duration:** ${report.performance.averageDuration.toFixed(0)}ms
`;
  }

  private printSummary(report: TestReport): void {
    console.log('\n📊 Test Summary:');
    console.log(`  Total Tests: ${report.summary.totalTests}`);
    console.log(`  Passed: ${report.summary.passed}`);
    console.log(`  Failed: ${report.summary.failed}`);
    console.log(`  Success Rate: ${report.summary.successRate.toFixed(1)}%`);
    console.log(`  Duration: ${(report.summary.totalDuration / 1000).toFixed(1)}s`);

    if (report.coverage) {
      console.log('\n📈 Coverage:');
      console.log(`  Lines: ${report.coverage.overall.lines.toFixed(1)}%`);
      console.log(`  Functions: ${report.coverage.overall.functions.toFixed(1)}%`);
      console.log(`  Branches: ${report.coverage.overall.branches.toFixed(1)}%`);
      console.log(`  Statements: ${report.coverage.overall.statements.toFixed(1)}%`);
    }

    console.log('\n⚡ Performance:');
    console.log(`  Fastest: ${report.performance.fastestSuite}`);
    console.log(`  Slowest: ${report.performance.slowestSuite}`);
    console.log(`  Average: ${report.performance.averageDuration.toFixed(0)}ms`);

    console.log('\n📁 Reports generated:');
    console.log(`  JSON: ${path.join(this.reportDir, 'pattern-metrics-test-report.json')}`);
    console.log(`  HTML: ${path.join(this.reportDir, 'pattern-metrics-test-report.html')}`);
    console.log(`  Markdown: ${path.join(this.reportDir, 'pattern-metrics-test-report.md')}`);

    if (report.summary.failed > 0) {
      console.log('\n❌ Some tests failed. Check the detailed reports for more information.');
      process.exit(1);
    } else {
      console.log('\n✅ All tests passed!');
    }
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'passed': return '✅';
      case 'failed': return '❌';
      case 'skipped': return '⏭️';
      default: return '❓';
    }
  }

  private async ensureDirectory(dir: string): Promise<void> {
    try {
      await fs.promises.mkdir(dir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const runner = new PatternMetricsTestRunner();
  runner.runAllTests().catch(console.error);
}

export { PatternMetricsTestRunner };