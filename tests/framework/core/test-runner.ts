/**
 * Core Test Runner
 * Provides unified test execution capabilities across all test types
 * Integrates with pattern metrics and governance systems
 */

import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';

export interface TestContext {
  circle?: string;
  environment?: string;
  parallelExecution?: boolean;
  governanceMode?: boolean;
  testScope?: string;
  changeImpact?: ChangeImpact;
}

export interface ChangeImpact {
  files: string[];
  circles: string[];
  components: string[];
  risk: 'low' | 'medium' | 'high';
}

export interface TestSuite {
  name: string;
  path: string;
  type: 'unit' | 'integration' | 'e2e' | 'performance' | 'security';
  dependencies?: string[];
  timeout?: number;
  retries?: number;
}

export interface TestResult {
  suite: string;
  passed: boolean;
  score: number;
  duration: number;
  details: any;
  coverage?: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
  performance?: {
    latency: number;
    throughput: number;
    memory: number;
    cpu: number;
  };
  errors?: string[];
}

export interface TestRunnerConfig {
  maxConcurrency: number;
  defaultTimeout: number;
  retryAttempts: number;
  coverageThreshold: number;
  performanceThresholds: PerformanceThresholds;
}

export interface PerformanceThresholds {
  latency: number;
  throughput: number;
  memory: number;
  cpu: number;
}

/**
 * Core Test Runner Class
 * Orchestrates test execution with intelligent resource management
 */
export class TestRunner {
  private config: TestRunnerConfig;
  private patternMetrics: PatternMetricsCollector;
  private governanceValidator: GovernanceValidator;

  constructor(config?: Partial<TestRunnerConfig>) {
    this.config = {
      maxConcurrency: 4,
      defaultTimeout: 30000, // 30 seconds
      retryAttempts: 3,
      coverageThreshold: 85,
      performanceThresholds: {
        latency: 1000, // 1 second
        throughput: 100, // 100 ops/sec
        memory: 85, // 85% utilization
        cpu: 80 // 80% utilization
      },
      ...config
    };

    this.patternMetrics = new PatternMetricsCollector();
    this.governanceValidator = new GovernanceValidator();
  }

  /**
   * Run tests with intelligent selection based on context
   */
  async runTests(testSuites: TestSuite[], context: TestContext = {}): Promise<TestResult[]> {
    console.log(`🧪 Running ${testSuites.length} test suites...`);
    
    // Emit test start metric
    await this.patternMetrics.emitMetric({
      timestamp: new Date().toISOString(),
      pattern: 'test-execution',
      tags: ['testing', 'test-start'],
      data: {
        suites: testSuites.map(s => s.name),
        context: context,
        parallel: context.parallelExecution || false
      }
    });

    // Select tests based on context
    const selectedTests = this.selectTests(testSuites, context);
    
    // Execute tests based on parallel execution setting
    const results = context.parallelExecution 
      ? await this.executeParallel(selectedTests, context)
      : await this.executeSequential(selectedTests, context);

    // Emit test completion metric
    await this.patternMetrics.emitMetric({
      timestamp: new Date().toISOString(),
      pattern: 'test-execution',
      tags: ['testing', 'test-complete'],
      data: {
        results: results.map(r => ({
          suite: r.suite,
          passed: r.passed,
          score: r.score,
          duration: r.duration
        })),
        context: context,
        summary: this.generateTestSummary(results)
      }
    });

    return results;
  }

  /**
   * Select tests based on change impact and context
   */
  private selectTests(testSuites: TestSuite[], context: TestContext): TestSuite[] {
    if (context.testScope === 'unit-only') {
      return testSuites.filter(suite => suite.type === 'unit');
    }

    if (context.testScope === 'integration-only') {
      return testSuites.filter(suite => suite.type === 'integration');
    }

    if (context.testScope === 'performance-only') {
      return testSuites.filter(suite => suite.type === 'performance');
    }

    if (context.changeImpact) {
      return this.selectTestsByImpact(testSuites, context.changeImpact);
    }

    return testSuites;
  }

  /**
   * Select tests based on change impact analysis
   */
  private selectTestsByImpact(testSuites: TestSuite[], impact: ChangeImpact): TestSuite[] {
    const selectedTests: TestSuite[] = [];

    for (const suite of testSuites) {
      // High impact changes run all related tests
      if (impact.risk === 'high') {
        selectedTests.push(suite);
        continue;
      }

      // Medium impact changes run tests for affected components
      if (impact.risk === 'medium' && this.isSuiteAffected(suite, impact)) {
        selectedTests.push(suite);
        continue;
      }

      // Low impact changes run critical tests only
      if (impact.risk === 'low' && this.isSuiteCritical(suite)) {
        selectedTests.push(suite);
      }
    }

    return selectedTests;
  }

  /**
   * Check if test suite is affected by changes
   */
  private isSuiteAffected(suite: TestSuite, impact: ChangeImpact): boolean {
    return suite.dependencies?.some(dep => 
      impact.components.includes(dep) || 
      impact.files.some(file => file.includes(dep))
    );
  }

  /**
   * Check if test suite is critical
   */
  private isSuiteCritical(suite: TestSuite): boolean {
    const criticalPatterns = [
      'security',
      'compliance',
      'governance',
      'quality-gate'
    ];

    return criticalPatterns.some(pattern => 
      suite.name.toLowerCase().includes(pattern)
    );
  }

  /**
   * Execute tests in parallel with resource management
   */
  private async executeParallel(testSuites: TestSuite[], context: TestContext): Promise<TestResult[]> {
    console.log(`🔄 Executing ${testSuites.length} test suites in parallel...`);
    
    const semaphore = new Semaphore(this.config.maxConcurrency);
    const promises = testSuites.map(suite => 
      semaphore.acquire().then(async () => {
        try {
          return await this.executeTestSuite(suite, context);
        } finally {
          semaphore.release();
        }
      })
    );

    return Promise.all(promises);
  }

  /**
   * Execute tests sequentially
   */
  private async executeSequential(testSuites: TestSuite[], context: TestContext): Promise<TestResult[]> {
    console.log(`📋 Executing ${testSuites.length} test suites sequentially...`);
    
    const results: TestResult[] = [];
    
    for (const suite of testSuites) {
      const result = await this.executeTestSuite(suite, context);
      results.push(result);
      
      // Stop on critical failure
      if (!result.passed && this.isSuiteCritical(suite)) {
        console.error(`❌ Critical test suite ${suite.name} failed, stopping execution`);
        break;
      }
    }

    return results;
  }

  /**
   * Execute individual test suite
   */
  private async executeTestSuite(suite: TestSuite, context: TestContext): Promise<TestResult> {
    const startTime = Date.now();
    console.log(`🧪 Executing test suite: ${suite.name}`);

    try {
      // Prepare test environment
      await this.prepareTestEnvironment(suite, context);

      // Execute test based on type
      let result: TestResult;
      switch (suite.type) {
        case 'unit':
          result = await this.executeUnitTests(suite, context);
          break;
        case 'integration':
          result = await this.executeIntegrationTests(suite, context);
          break;
        case 'e2e':
          result = await this.executeE2ETests(suite, context);
          break;
        case 'performance':
          result = await this.executePerformanceTests(suite, context);
          break;
        case 'security':
          result = await this.executeSecurityTests(suite, context);
          break;
        default:
          throw new Error(`Unknown test suite type: ${suite.type}`);
      }

      // Calculate duration
      result.duration = Date.now() - startTime;
      result.suite = suite.name;

      // Validate against thresholds
      result.score = this.calculateTestScore(result, suite);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        suite: suite.name,
        passed: false,
        score: 0,
        duration,
        details: { error: error.message },
        errors: [error.message]
      };
    } finally {
      // Cleanup test environment
      await this.cleanupTestEnvironment(suite, context);
    }
  }

  /**
   * Execute unit tests
   */
  private async executeUnitTests(suite: TestSuite, context: TestContext): Promise<Partial<TestResult>> {
    const testCommand = this.buildTestCommand(suite, 'unit');
    const result = await this.runCommand(testCommand, suite.timeout || this.config.defaultTimeout);

    // Parse coverage if available
    let coverage;
    if (result.stdout && result.stdout.includes('coverage')) {
      coverage = await this.parseCoverage(result.stdout);
    }

    return {
      passed: result.exitCode === 0,
      details: { stdout: result.stdout, stderr: result.stderr },
      coverage
    };
  }

  /**
   * Execute integration tests
   */
  private async executeIntegrationTests(suite: TestSuite, context: TestContext): Promise<Partial<TestResult>> {
    const testCommand = this.buildTestCommand(suite, 'integration');
    const result = await this.runCommand(testCommand, suite.timeout || this.config.defaultTimeout);

    return {
      passed: result.exitCode === 0,
      details: { stdout: result.stdout, stderr: result.stderr }
    };
  }

  /**
   * Execute end-to-end tests
   */
  private async executeE2ETests(suite: TestSuite, context: TestContext): Promise<Partial<TestResult>> {
    const testCommand = this.buildTestCommand(suite, 'e2e');
    const result = await this.runCommand(testCommand, suite.timeout || this.config.defaultTimeout);

    return {
      passed: result.exitCode === 0,
      details: { stdout: result.stdout, stderr: result.stderr }
    };
  }

  /**
   * Execute performance tests
   */
  private async executePerformanceTests(suite: TestSuite, context: TestContext): Promise<Partial<TestResult>> {
    const testCommand = this.buildTestCommand(suite, 'performance');
    const result = await this.runCommand(testCommand, suite.timeout || this.config.defaultTimeout);

    // Parse performance metrics
    const performance = await this.parsePerformanceMetrics(result.stdout);

    return {
      passed: result.exitCode === 0,
      details: { stdout: result.stdout, stderr: result.stderr },
      performance
    };
  }

  /**
   * Execute security tests
   */
  private async executeSecurityTests(suite: TestSuite, context: TestContext): Promise<Partial<TestResult>> {
    const testCommand = this.buildTestCommand(suite, 'security');
    const result = await this.runCommand(testCommand, suite.timeout || this.config.defaultTimeout);

    return {
      passed: result.exitCode === 0,
      details: { stdout: result.stdout, stderr: result.stderr }
    };
  }

  /**
   * Build test command based on suite type
   */
  private buildTestCommand(suite: TestSuite, type: string): string {
    const baseCommand = process.env.NODE_ENV === 'test' ? 'npm test' : 'npx jest';
    
    switch (type) {
      case 'unit':
        return `${baseCommand} --testPathPattern="${suite.path}" --coverage`;
      case 'integration':
        return `${baseCommand} --testPathPattern="${suite.path}" --testNamePattern="integration"`;
      case 'e2e':
        return `${baseCommand} --testPathPattern="${suite.path}" --testNamePattern="e2e"`;
      case 'performance':
        return `${baseCommand} --testPathPattern="${suite.path}" --testNamePattern="performance"`;
      case 'security':
        return `${baseCommand} --testPathPattern="${suite.path}" --testNamePattern="security"`;
      default:
        return baseCommand;
    }
  }

  /**
   * Run command with timeout and retries
   */
  private async runCommand(command: string, timeout: number): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    let attempt = 0;
    const maxAttempts = this.config.retryAttempts;

    while (attempt < maxAttempts) {
      attempt++;
      console.log(`🏃 Running command (attempt ${attempt}/${maxAttempts}): ${command}`);

      try {
        const result = await this.runCommandWithTimeout(command, timeout);
        if (result.exitCode === 0) {
          return result;
        }
        
        console.warn(`⚠️ Command failed with exit code ${result.exitCode}, retrying...`);
      } catch (error) {
        console.error(`❌ Command execution error: ${error.message}`);
        if (attempt === maxAttempts) {
          throw error;
        }
      }
    }

    throw new Error(`Command failed after ${maxAttempts} attempts`);
  }

  /**
   * Run command with timeout
   */
  private async runCommandWithTimeout(command: string, timeout: number): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, { shell: true, stdio: 'pipe' });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      const timeoutId = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Command timed out after ${timeout}ms`));
      }, timeout);

      child.on('close', (code) => {
        clearTimeout(timeoutId);
        resolve({ exitCode: code || 0, stdout, stderr });
      });

      child.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
    });
  }

  /**
   * Parse coverage from test output
   */
  private async parseCoverage(output: string): Promise<any> {
    try {
      // Look for coverage summary in output
      const coverageMatch = output.match(/All files\s+\|\s+(\d+)\s+\|\s+(\d+)\s+\|\s+(\d+)\s+\|\s+(\d+)/);
      
      if (coverageMatch) {
        return {
          lines: parseInt(coverageMatch[1]),
          functions: parseInt(coverageMatch[2]),
          branches: parseInt(coverageMatch[3]),
          statements: parseInt(coverageMatch[4])
        };
      }

      // Try to parse JSON coverage report
      if (output.includes('coverage-final.json')) {
        const coverageData = await fs.readFile('coverage/coverage-final.json', 'utf8');
        return JSON.parse(coverageData);
      }

      return null;
    } catch (error) {
      console.error('Error parsing coverage:', error);
      return null;
    }
  }

  /**
   * Parse performance metrics from test output
   */
  private async parsePerformanceMetrics(output: string): Promise<any> {
    try {
      // Look for performance metrics in output
      const metrics: any = {};

      // Parse latency
      const latencyMatch = output.match(/Latency:\s*(\d+(?:\.\d+)?)\s*ms/);
      if (latencyMatch) {
        metrics.latency = parseFloat(latencyMatch[1]);
      }

      // Parse throughput
      const throughputMatch = output.match(/Throughput:\s*(\d+(?:\.\d+)?)\s*ops\/sec/);
      if (throughputMatch) {
        metrics.throughput = parseFloat(throughputMatch[1]);
      }

      // Parse memory usage
      const memoryMatch = output.match(/Memory:\s*(\d+(?:\.\d+)?)\s*%/);
      if (memoryMatch) {
        metrics.memory = parseFloat(memoryMatch[1]);
      }

      // Parse CPU usage
      const cpuMatch = output.match(/CPU:\s*(\d+(?:\.\d+)?)\s*%/);
      if (cpuMatch) {
        metrics.cpu = parseFloat(cpuMatch[1]);
      }

      return metrics;
    } catch (error) {
      console.error('Error parsing performance metrics:', error);
      return null;
    }
  }

  /**
   * Calculate test score based on results and thresholds
   */
  private calculateTestScore(result: Partial<TestResult>, suite: TestSuite): number {
    let score = 0;

    // Base score for passing
    if (result.passed) {
      score += 50;
    }

    // Coverage bonus
    if (result.coverage) {
      const coverageScore = Math.min(
        (result.coverage.lines / 100) * 20,
        20
      );
      score += coverageScore;
    }

    // Performance bonus
    if (result.performance) {
      const thresholds = this.config.performanceThresholds;
      let performanceScore = 0;

      if (result.performance.latency <= thresholds.latency) {
        performanceScore += 10;
      }
      if (result.performance.throughput >= thresholds.throughput) {
        performanceScore += 10;
      }
      if (result.performance.memory <= thresholds.memory) {
        performanceScore += 10;
      }
      if (result.performance.cpu <= thresholds.cpu) {
        performanceScore += 10;
      }

      score += performanceScore;
    }

    return Math.min(score, 100);
  }

  /**
   * Generate test summary
   */
  private generateTestSummary(results: TestResult[]): any {
    const total = results.length;
    const passed = results.filter(r => r.passed).length;
    const failed = total - passed;
    const averageDuration = results.reduce((sum, r) => sum + r.duration, 0) / total;
    const averageScore = results.reduce((sum, r) => sum + r.score, 0) / total;

    return {
      total,
      passed,
      failed,
      passRate: (passed / total) * 100,
      averageDuration,
      averageScore,
      status: failed === 0 ? 'PASSED' : 'FAILED'
    };
  }

  /**
   * Prepare test environment
   */
  private async prepareTestEnvironment(suite: TestSuite, context: TestContext): Promise<void> {
    console.log(`🔧 Preparing test environment for ${suite.name}...`);
    
    // Create test data directory if needed
    const testDir = path.dirname(suite.path);
    await fs.mkdir(path.join(testDir, 'test-data'), { recursive: true });

    // Setup environment variables
    process.env.TEST_ENVIRONMENT = context.environment || 'test';
    process.env.TEST_CIRCLE = context.circle || 'unknown';
    process.env.TEST_SUITE = suite.name;

    // Additional preparation based on test type
    if (suite.type === 'integration' || suite.type === 'e2e') {
      await this.setupTestServices();
    }

    if (suite.type === 'performance') {
      await this.setupPerformanceMonitoring();
    }
  }

  /**
   * Cleanup test environment
   */
  private async cleanupTestEnvironment(suite: TestSuite, context: TestContext): Promise<void> {
    console.log(`🧹 Cleaning up test environment for ${suite.name}...`);
    
    // Cleanup test data
    const testDir = path.dirname(suite.path);
    try {
      await fs.rm(path.join(testDir, 'test-data'), { recursive: true, force: true });
    } catch (error) {
      console.warn('Warning: Could not cleanup test data directory:', error);
    }

    // Cleanup environment variables
    delete process.env.TEST_ENVIRONMENT;
    delete process.env.TEST_CIRCLE;
    delete process.env.TEST_SUITE;

    // Additional cleanup based on test type
    if (suite.type === 'integration' || suite.type === 'e2e') {
      await this.cleanupTestServices();
    }

    if (suite.type === 'performance') {
      await this.cleanupPerformanceMonitoring();
    }
  }

  /**
   * Setup test services for integration/e2e tests
   */
  private async setupTestServices(): Promise<void> {
    // Implementation would start required services
    console.log('🚀 Setting up test services...');
  }

  /**
   * Cleanup test services
   */
  private async cleanupTestServices(): Promise<void> {
    // Implementation would stop test services
    console.log('🛑 Cleaning up test services...');
  }

  /**
   * Setup performance monitoring
   */
  private async setupPerformanceMonitoring(): Promise<void> {
    // Implementation would start performance monitoring
    console.log('📊 Setting up performance monitoring...');
  }

  /**
   * Cleanup performance monitoring
   */
  private async cleanupPerformanceMonitoring(): Promise<void> {
    // Implementation would stop performance monitoring
    console.log('📊 Cleaning up performance monitoring...');
  }
}

/**
 * Simple semaphore implementation for limiting concurrent operations
 */
class Semaphore {
  private permits: number;
  private waitQueue: (() => void)[] = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (this.permits > 0) {
        this.permits--;
        resolve();
      } else {
        this.waitQueue.push(resolve);
      }
    });
  }

  release(): void {
    this.permits++;
    if (this.waitQueue.length > 0) {
      const resolve = this.waitQueue.shift();
      this.permits--;
      resolve!();
    }
  }
}

// Placeholder imports for dependencies
class PatternMetricsCollector {
  async emitMetric(metric: any): Promise<void> {
    // Implementation would emit metrics to pattern metrics system
    console.log('Emitting metric:', metric);
  }
}

class GovernanceValidator {
  // Implementation would validate governance compliance
}