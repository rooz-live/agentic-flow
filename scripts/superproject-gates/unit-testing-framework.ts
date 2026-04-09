/**
 * Unit Testing Framework
 * 
 * Specialized framework for unit testing individual components and functions
 * with comprehensive mocking, fixtures, and assertion capabilities
 */

import { EventEmitter } from 'events';
import { 
  TestingFramework, 
  TestSuite, 
  TestCase, 
  TestResult, 
  TestExecutionContext,
  MockConfiguration,
  TestFixture,
  TestLogger,
  TestMetricsCollector
} from '../core/testing-framework';

// Unit testing specific types
export interface UnitTestSuite extends TestSuite {
  targetModule: string;
  testClass?: string;
  testFunction?: string;
  mocks: MockConfiguration[];
  fixtures: TestFixture[];
  isolationLevel: 'function' | 'class' | 'module' | 'package';
  dependencies: string[];
}

export interface UnitTestCase extends Omit<TestCase, 'fixtures'> {
  targetFunction: string;
  targetClass?: string;
  inputParameters: any[];
  expectedOutput: any;
  expectedError?: Error | string;
  mocks: MockConfiguration[];
  testFixtures: TestFixture[];
  isolationLevel: UnitTestSuite['isolationLevel'];
  coverage: UnitTestCoverage;
}

export interface UnitTestCoverage {
  lines: number[];
  branches: number[];
  functions: string[];
  statements: number[];
  complexity: number;
}

export interface MockRegistry {
  mocks: Map<string, MockConfiguration>;
  activeMocks: Set<string>;
  callHistory: MockCallHistory[];
  autoRestore: boolean;
}

export interface MockCallHistory {
  mockId: string;
  timestamp: Date;
  input: any[];
  output: any;
  error?: Error;
  duration: number;
  stackTrace: string[];
}

export interface Assertion {
  type: 'equal' | 'deepEqual' | 'truthy' | 'falsy' | 'throws' | 'resolves' | 'rejects';
  actual: any;
  expected?: any;
  message?: string;
}

export interface AssertionFramework {
  assert: AssertionBuilder;
  expect: AssertionBuilder;
  should: AssertionBuilder;
  assertThrows: (fn: () => any, expectedError?: string | RegExp) => void;
  assertDoesNotThrow: (fn: () => any) => void;
  assertEventually: (fn: () => Promise<any>, timeout?: number) => Promise<void>;
  assertMultiple: (assertions: Assertion[]) => void;
}

export interface AssertionBuilder {
  actual: any;
  to: AssertionChain;
  not: AssertionChain;
  eventually: AssertionChain;
}

export interface AssertionChain {
  be: AssertionMatchers;
  have: AssertionMatchers;
  contain: AssertionMatchers;
  equal: AssertionMatchers;
  match: AssertionMatchers;
  throw: AssertionMatchers;
  resolve: AssertionMatchers;
  reject: AssertionMatchers;
}

export interface AssertionMatchers {
  equal(expected: any): void;
  deepEqual(expected: any): void;
  be(expected: any): void;
  null(): void;
  undefined(): void;
  defined(): void;
  true(): void;
  false(): void;
  empty(): void;
  length(expected: number): void;
  above(expected: number): void;
  below(expected: number): void;
  atLeast(expected: number): void;
  atMost(expected: number): void;
  within(min: number, max: number): void;
  include(expected: any): void;
  contain(expected: any): void;
  match(pattern: RegExp): void;
  startWith(expected: string): void;
  endWith(expected: string): void;
  beInstanceOf(expected: any): void;
  beNull(): void;
  beUndefined(): void;
  beDefined(): void;
  beTrue(): void;
  beFalse(): void;
  beEmpty(): void;
  haveLength(expected: number): void;
  beAbove(expected: number): void;
  beBelow(expected: number): void;
  beAtLeast(expected: number): void;
  beAtMost(expected: number): void;
  beWithin(min: number, max: number): void;
  include(expected: any): void;
  contain(expected: any): void;
  match(pattern: RegExp): void;
  startWith(expected: string): void;
  endWith(expected: string): void;
  beInstanceOf(expected: any): void;
  throw(expected?: string | RegExp | Error): void;
  resolve(expected?: any): Promise<void>;
  reject(expected?: string | RegExp | Error): Promise<void>;
}

export interface TestDouble {
  type: 'mock' | 'stub' | 'spy' | 'fake';
  target: any;
  original: any;
  behavior: TestDoubleBehavior;
}

export interface TestDoubleBehavior {
  returnValue?: any;
  throw?: Error;
  resolve?: any;
  reject?: Error;
  callThrough?: boolean;
  implementation?: (...args: any[]) => any;
  times?: number;
  args?: any[][];
}

export interface FixtureLoader {
  loadFixture(name: string): Promise<any>;
  loadFixtures(names: string[]): Promise<any[]>;
  saveFixture(name: string, data: any): Promise<void>;
  clearFixtures(): Promise<void>;
  listFixtures(): Promise<string[]>;
}

export interface DependencyInjector {
  inject(dependency: string, implementation: any): void;
  remove(dependency: string): void;
  get(dependency: string): any;
  has(dependency: string): boolean;
  clear(): void;
  createSandbox(): DependencySandbox;
}

export interface DependencySandbox {
  inject(dependency: string, implementation: any): void;
  get(dependency: string): any;
  restore(): void;
}

// Main unit testing framework class
export class UnitTestingFramework extends EventEmitter {
  private testingFramework: TestingFramework;
  private mockRegistry: MockRegistry;
  private assertionFramework: AssertionFramework;
  private fixtureLoader: FixtureLoader;
  private dependencyInjector: DependencyInjector;
  private testSuites: Map<string, UnitTestSuite> = new Map();
  private currentTest: UnitTestCase | null = null;
  private currentSuite: UnitTestSuite | null = null;

  constructor(testingFramework: TestingFramework) {
    super();
    this.testingFramework = testingFramework;
    this.mockRegistry = new MockRegistryImpl();
    this.assertionFramework = new AssertionFrameworkImpl();
    this.fixtureLoader = new FixtureLoaderImpl();
    this.dependencyInjector = new DependencyInjectorImpl();
    this.initializeFramework();
  }

  private initializeFramework(): void {
    console.log('[UNIT_TESTING] Initializing unit testing framework');
    
    // Set up event listeners
    this.setupEventListeners();
    
    console.log('[UNIT_TESTING] Unit testing framework initialized');
  }

  private setupEventListeners(): void {
    this.testingFramework.on('testStart', (test: TestCase) => {
      if (this.isUnitTest(test)) {
        this.handleTestStart(test as unknown as UnitTestCase);
      }
    });

    this.testingFramework.on('testEnd', (test: TestCase, result: TestResult) => {
      if (this.isUnitTest(test)) {
        this.handleTestEnd(test as unknown as UnitTestCase, result);
      }
    });
  }

  private isUnitTest(test: TestCase): test is TestCase & { category: 'unit' } {
    return test.category === 'unit';
  }

  private handleTestStart(test: UnitTestCase): void {
    this.currentTest = test;
    console.log(`[UNIT_TESTING] Starting unit test: ${test.name}`);
    
    // Set up mocks
    this.setupMocks(test.mocks);
    
    // Load fixtures
    this.loadFixtures(test.fixtures);
    
    // Create dependency sandbox
    const sandbox = this.dependencyInjector.createSandbox();
    
    // Inject test dependencies
    this.injectTestDependencies(test, sandbox);
  }

  private handleTestEnd(test: UnitTestCase, result: TestResult): void {
    console.log(`[UNIT_TESTING] Completed unit test: ${test.name}`);
    
    // Restore mocks
    this.restoreMocks();
    
    // Clear fixtures
    this.clearFixtures();
    
    // Restore dependencies
    this.dependencyInjector.clear();
    
    this.currentTest = null;
  }

  // Test suite management
  public createUnitTestSuite(config: Omit<UnitTestSuite, 'id' | 'tests' | 'tags'>): UnitTestSuite {
    const suite: UnitTestSuite = {
      id: this.generateId('unit-suite'),
      tests: [],
      tags: ['unit'],
      mocks: [],
      fixtures: [],
      isolationLevel: 'function',
      dependencies: [],
      ...config
    };

    this.testSuites.set(suite.id, suite);
    this.testingFramework.addSuite(suite);
    
    console.log(`[UNIT_TESTING] Created unit test suite: ${suite.name}`);
    return suite;
  }

  public addUnitTest(suiteId: string, config: Omit<UnitTestCase, 'id' | 'tags'>): UnitTestCase {
    const suite = this.testSuites.get(suiteId);
    if (!suite) {
      throw new Error(`Unit test suite ${suiteId} not found`);
    }

    const test: UnitTestCase = {
      id: this.generateId('unit-test'),
      category: 'unit',
      tags: ['unit'],
      expected: { status: 'pass', result: undefined },
      testFixtures: [],
      mocks: [],
      dependencies: [],
      coverage: { lines: [], branches: [], functions: [], statements: [], complexity: 0 },
      ...config
    };

    suite.tests.push(test as unknown as TestCase);
    this.testingFramework.addTest(suiteId, test as unknown as TestCase);

    console.log(`[UNIT_TESTING] Added unit test: ${test.name}`);
    return test;
  }

  // Mock management
  public createMock(target: string, method?: string): MockConfiguration {
    const mock: MockConfiguration = {
      id: this.generateId('mock'),
      target,
      method,
      behavior: { type: 'returnValue' },
      responses: [],
      calls: [],
      enabled: true
    };

    this.mockRegistry.mocks.set(mock.id, mock);
    return mock;
  }

  public setupMock(mockId: string, behavior: TestDoubleBehavior): void {
    const mock = this.mockRegistry.mocks.get(mockId);
    if (!mock) {
      throw new Error(`Mock ${mockId} not found`);
    }

    mock.behavior = {
      type: behavior.returnValue !== undefined ? 'returnValue' : 
            behavior.throw !== undefined ? 'throwError' :
            behavior.resolve !== undefined ? 'resolve' :
            behavior.reject !== undefined ? 'reject' : 'returnValue',
      value: behavior.returnValue,
      error: behavior.throw,
      delay: 0
    };

    mock.enabled = true;
    this.mockRegistry.activeMocks.add(mockId);
  }

  public restoreMock(mockId: string): void {
    const mock = this.mockRegistry.mocks.get(mockId);
    if (mock) {
      mock.enabled = false;
      this.mockRegistry.activeMocks.delete(mockId);
    }
  }

  public restoreAllMocks(): void {
    for (const mockId of this.mockRegistry.activeMocks) {
      this.restoreMock(mockId);
    }
  }

  private setupMocks(mocks: MockConfiguration[]): void {
    for (const mock of mocks) {
      this.setupMock(mock.id, mock.behavior as any);
    }
  }

  private restoreMocks(): void {
    if (this.mockRegistry.autoRestore) {
      this.restoreAllMocks();
    }
  }

  // Assertion framework
  public getAssertions(): AssertionFramework {
    return this.assertionFramework;
  }

  // Fixture management
  public async loadFixture(name: string): Promise<any> {
    return this.fixtureLoader.loadFixture(name);
  }

  public async saveFixture(name: string, data: any): Promise<void> {
    return this.fixtureLoader.saveFixture(name, data);
  }

  private async loadFixtures(fixtures: TestFixture[]): Promise<void> {
    for (const fixture of fixtures) {
      await this.fixtureLoader.loadFixture(fixture.id);
    }
  }

  private clearFixtures(): void {
    this.fixtureLoader.clearFixtures();
  }

  // Dependency injection
  public injectDependency(name: string, implementation: any): void {
    this.dependencyInjector.inject(name, implementation);
  }

  public createDependencySandbox(): DependencySandbox {
    return this.dependencyInjector.createSandbox();
  }

  private injectTestDependencies(test: UnitTestCase, sandbox: DependencySandbox): void {
    // Inject test-specific dependencies
    for (const dependency of test.dependencies) {
      // Implementation would go here
    }
  }

  // Test generation utilities
  public generateTestCases(targetModule: string, options: TestGenerationOptions = {}): UnitTestCase[] {
    const testCases: UnitTestCase[] = [];
    
    // Generate test cases based on module analysis
    // This would involve AST analysis and test case generation
    
    return testCases;
  }

  public generateMockData(type: string, count: number = 1): any[] {
    const data: any[] = [];
    
    for (let i = 0; i < count; i++) {
      data.push(this.generateMockDataItem(type, i));
    }
    
    return data;
  }

  private generateMockDataItem(type: string, index: number): any {
    switch (type) {
      case 'user':
        return {
          id: `user-${index}`,
          name: `Test User ${index}`,
          email: `user${index}@test.com`,
          createdAt: new Date()
        };
      case 'plan':
        return {
          id: `plan-${index}`,
          name: `Test Plan ${index}`,
          description: `Description for test plan ${index}`,
          objectives: [`Objective ${index}`],
          timeline: '1 week',
          resources: [`Resource ${index}`]
        };
      case 'todo':
        return {
          id: `todo-${index}`,
          title: `Test TODO ${index}`,
          description: `Description for test TODO ${index}`,
          status: 'not_started',
          priority: 'medium',
          category: 'feature',
          dimension: 'now'
        };
      default:
        return { id: `item-${index}`, type, index };
    }
  }

  // Coverage analysis
  public analyzeCoverage(testResults: TestResult[]): UnitTestCoverage {
    const coverage: UnitTestCoverage = {
      lines: [],
      branches: [],
      functions: [],
      statements: [],
      complexity: 0
    };

    // Analyze coverage from test results
    // This would integrate with coverage tools like Istanbul
    
    return coverage;
  }

  public generateCoverageReport(coverage: UnitTestCoverage): string {
    return `
Coverage Report:
- Lines: ${coverage.lines.length} covered
- Branches: ${coverage.branches.length} covered
- Functions: ${coverage.functions.length} covered
- Statements: ${coverage.statements.length} covered
- Complexity: ${coverage.complexity}
    `.trim();
  }

  // Utility methods
  private generateId(type: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${type}-${timestamp}-${random}`;
  }

  public getMockRegistry(): MockRegistry {
    return this.mockRegistry;
  }

  public getCurrentTest(): UnitTestCase | null {
    return this.currentTest;
  }

  public getCurrentSuite(): UnitTestSuite | null {
    return this.currentSuite;
  }
}

// Supporting interfaces
export interface TestGenerationOptions {
  includePrivate?: boolean;
  includeEdgeCases?: boolean;
  maxTestCases?: number;
  coverageThreshold?: number;
}

// Implementation classes
class MockRegistryImpl implements MockRegistry {
  mocks: Map<string, MockConfiguration> = new Map();
  activeMocks: Set<string> = new Set();
  callHistory: MockCallHistory[] = [];
  autoRestore: boolean = true;

  constructor() {
    this.autoRestore = true;
  }
}

class AssertionFrameworkImpl implements AssertionFramework {
  assert: AssertionBuilder;
  expect: AssertionBuilder;
  should: AssertionBuilder;

  constructor() {
    this.assert = new AssertionBuilderImpl('assert');
    this.expect = new AssertionBuilderImpl('expect');
    this.should = new AssertionBuilderImpl('should');
  }

  assertThrows(fn: () => any, expectedError?: string | RegExp): void {
    try {
      fn();
      throw new Error('Expected function to throw');
    } catch (error) {
      if (expectedError) {
        if (typeof expectedError === 'string') {
          if (!error.message.includes(expectedError)) {
            throw new Error(`Expected error message to contain "${expectedError}"`);
          }
        } else if (expectedError instanceof RegExp) {
          if (!expectedError.test(error.message)) {
            throw new Error(`Expected error message to match pattern`);
          }
        }
      }
    }
  }

  assertDoesNotThrow(fn: () => any): void {
    try {
      fn();
    } catch (error) {
      throw new Error(`Expected function not to throw, but got: ${error.message}`);
    }
  }

  async assertEventually(fn: () => Promise<any>, timeout: number = 5000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        await fn();
        return;
      } catch (error) {
        // Continue trying
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    throw new Error(`Assertion failed within ${timeout}ms`);
  }

  assertMultiple(assertions: Assertion[]): void {
    const errors: string[] = [];
    
    for (const assertion of assertions) {
      try {
        // Execute assertion
        // Implementation would go here
      } catch (error) {
        errors.push(error.message);
      }
    }
    
    if (errors.length > 0) {
      throw new Error(`Multiple assertions failed: ${errors.join(', ')}`);
    }
  }
}

class AssertionBuilderImpl implements AssertionBuilder {
  actual: any;
  private type: string;

  constructor(type: string) {
    this.type = type;
  }

  setActual(actual: any): AssertionBuilder {
    this.actual = actual;
    return this;
  }

  get to(): AssertionChain {
    return new AssertionChainImpl(this.actual, false);
  }

  get not(): AssertionChain {
    return new AssertionChainImpl(this.actual, true);
  }

  get eventually(): AssertionChain {
    return new AssertionChainImpl(this.actual, false, true);
  }
}

class AssertionChainImpl implements AssertionChain {
  private actual: any;
  private negated: boolean;
  private eventual: boolean;

  constructor(actual: any, negated: boolean = false, eventual: boolean = false) {
    this.actual = actual;
    this.negated = negated;
    this.eventual = eventual;
  }

  get be(): AssertionMatchers {
    return new AssertionMatchersImpl(this.actual, this.negated, this.eventual);
  }

  get have(): AssertionMatchers {
    return new AssertionMatchersImpl(this.actual, this.negated, this.eventual);
  }

  get contain(): AssertionMatchers {
    return new AssertionMatchersImpl(this.actual, this.negated, this.eventual);
  }

  get equal(): AssertionMatchers {
    return new AssertionMatchersImpl(this.actual, this.negated, this.eventual);
  }

  get match(): AssertionMatchers {
    return new AssertionMatchersImpl(this.actual, this.negated, this.eventual);
  }

  get throw(): AssertionMatchers {
    return new AssertionMatchersImpl(this.actual, this.negated, this.eventual);
  }

  get resolve(): AssertionMatchers {
    return new AssertionMatchersImpl(this.actual, this.negated, this.eventual);
  }

  get reject(): AssertionMatchers {
    return new AssertionMatchersImpl(this.actual, this.negated, this.eventual);
  }
}

class AssertionMatchersImpl implements AssertionMatchers {
  private actual: any;
  private negated: boolean;
  private eventual: boolean;

  constructor(actual: any, negated: boolean, eventual: boolean) {
    this.actual = actual;
    this.negated = negated;
    this.eventual = eventual;
  }

  private assert(condition: boolean, message: string): void {
    if (this.negated) {
      if (condition) {
        throw new Error(`Expected not ${message}`);
      }
    } else {
      if (!condition) {
        throw new Error(`Expected ${message}`);
      }
    }
  }

  equal(expected: any): void {
    this.assert(this.actual === expected, `equal ${expected}`);
  }

  deepEqual(expected: any): void {
    this.assert(JSON.stringify(this.actual) === JSON.stringify(expected), `deep equal ${expected}`);
  }

  be(expected: any): void {
    this.equal(expected);
  }

  null(): void {
    this.assert(this.actual === null, 'be null');
  }

  undefined(): void {
    this.assert(this.actual === undefined, 'be undefined');
  }

  defined(): void {
    this.assert(this.actual !== undefined, 'be defined');
  }

  true(): void {
    this.assert(this.actual === true, 'be true');
  }

  false(): void {
    this.assert(this.actual === false, 'be false');
  }

  empty(): void {
    if (Array.isArray(this.actual)) {
      this.assert(this.actual.length === 0, 'be empty array');
    } else if (typeof this.actual === 'object' && this.actual !== null) {
      this.assert(Object.keys(this.actual).length === 0, 'be empty object');
    } else {
      this.assert(!this.actual, 'be empty');
    }
  }

  length(expected: number): void {
    this.assert(this.actual.length === expected, `have length ${expected}`);
  }

  above(expected: number): void {
    this.assert(this.actual > expected, `be above ${expected}`);
  }

  below(expected: number): void {
    this.assert(this.actual < expected, `be below ${expected}`);
  }

  atLeast(expected: number): void {
    this.assert(this.actual >= expected, `be at least ${expected}`);
  }

  atMost(expected: number): void {
    this.assert(this.actual <= expected, `be at most ${expected}`);
  }

  within(min: number, max: number): void {
    this.assert(this.actual >= min && this.actual <= max, `be within ${min} and ${max}`);
  }

  include(expected: any): void {
    if (Array.isArray(this.actual)) {
      this.assert(this.actual.includes(expected), `include ${expected}`);
    } else if (typeof this.actual === 'string') {
      this.assert(this.actual.includes(expected), `include ${expected}`);
    } else {
      throw new Error('include assertion requires array or string');
    }
  }

  contain(expected: any): void {
    this.include(expected);
  }

  match(pattern: RegExp): void {
    this.assert(pattern.test(this.actual), `match ${pattern}`);
  }

  startWith(expected: string): void {
    this.assert(this.actual.startsWith(expected), `start with ${expected}`);
  }

  endWith(expected: string): void {
    this.assert(this.actual.endsWith(expected), `end with ${expected}`);
  }

  beInstanceOf(expected: any): void {
    this.assert(this.actual instanceof expected, `be instance of ${expected.name}`);
  }

  beNull(): void {
    this.null();
  }

  beUndefined(): void {
    this.undefined();
  }

  beDefined(): void {
    this.defined();
  }

  beTrue(): void {
    this.true();
  }

  beFalse(): void {
    this.false();
  }

  beEmpty(): void {
    this.empty();
  }

  haveLength(expected: number): void {
    this.length(expected);
  }

  beAbove(expected: number): void {
    this.above(expected);
  }

  beBelow(expected: number): void {
    this.below(expected);
  }

  beAtLeast(expected: number): void {
    this.atLeast(expected);
  }

  beAtMost(expected: number): void {
    this.atMost(expected);
  }

  beWithin(min: number, max: number): void {
    this.within(min, max);
  }

  throw(expected?: string | RegExp | Error): void {
    try {
      if (typeof this.actual === 'function') {
        this.actual();
      }
      this.assert(false, 'throw');
    } catch (error) {
      if (expected) {
        if (typeof expected === 'string') {
          this.assert(error.message.includes(expected), `throw ${expected}`);
        } else if (expected instanceof RegExp) {
          this.assert(expected.test(error.message), 'throw matching pattern');
        } else if (expected instanceof Error) {
          this.assert(error.message === expected.message, `throw ${expected.message}`);
        }
      } else {
        this.assert(true, 'throw');
      }
    }
  }

  async resolve(expected?: any): Promise<void> {
    try {
      const result = await this.actual;
      if (expected !== undefined) {
        this.assert(result === expected, `resolve to ${expected}`);
      } else {
        this.assert(true, 'resolve');
      }
    } catch (error) {
      this.assert(false, `resolve but got error: ${error.message}`);
    }
  }

  async reject(expected?: string | RegExp | Error): Promise<void> {
    try {
      await this.actual;
      this.assert(false, 'reject');
    } catch (error) {
      if (expected) {
        if (typeof expected === 'string') {
          this.assert(error.message.includes(expected), `reject with ${expected}`);
        } else if (expected instanceof RegExp) {
          this.assert(expected.test(error.message), 'reject with matching pattern');
        } else if (expected instanceof Error) {
          this.assert(error.message === expected.message, `reject with ${expected.message}`);
        }
      } else {
        this.assert(true, 'reject');
      }
    }
  }
}

class FixtureLoaderImpl implements FixtureLoader {
  private fixtures: Map<string, any> = new Map();

  async loadFixture(name: string): Promise<any> {
    const fixture = this.fixtures.get(name);
    if (!fixture) {
      throw new Error(`Fixture ${name} not found`);
    }
    return JSON.parse(JSON.stringify(fixture)); // Deep copy
  }

  async loadFixtures(names: string[]): Promise<any[]> {
    return Promise.all(names.map(name => this.loadFixture(name)));
  }

  async saveFixture(name: string, data: any): Promise<void> {
    this.fixtures.set(name, JSON.parse(JSON.stringify(data))); // Deep copy
  }

  async clearFixtures(): Promise<void> {
    this.fixtures.clear();
  }

  async listFixtures(): Promise<string[]> {
    return Array.from(this.fixtures.keys());
  }
}

class DependencyInjectorImpl implements DependencyInjector {
  private dependencies: Map<string, any> = new Map();
  private originalDependencies: Map<string, any> = new Map();

  inject(dependency: string, implementation: any): void {
    if (!this.originalDependencies.has(dependency)) {
      // Store original if not already stored
      this.originalDependencies.set(dependency, (global as any)[dependency]);
    }
    (global as any)[dependency] = implementation;
    this.dependencies.set(dependency, implementation);
  }

  remove(dependency: string): void {
    const original = this.originalDependencies.get(dependency);
    if (original !== undefined) {
      (global as any)[dependency] = original;
    } else {
      delete (global as any)[dependency];
    }
    this.dependencies.delete(dependency);
  }

  get(dependency: string): any {
    return this.dependencies.get(dependency);
  }

  has(dependency: string): boolean {
    return this.dependencies.has(dependency);
  }

  clear(): void {
    for (const dependency of this.dependencies.keys()) {
      this.remove(dependency);
    }
  }

  createSandbox(): DependencySandbox {
    return new DependencySandboxImpl(this);
  }
}

class DependencySandboxImpl implements DependencySandbox {
  private parent: DependencyInjectorImpl;
  private sandboxDependencies: Map<string, any> = new Map();

  constructor(parent: DependencyInjectorImpl) {
    this.parent = parent;
  }

  inject(dependency: string, implementation: any): void {
    this.sandboxDependencies.set(dependency, implementation);
    (global as any)[dependency] = implementation;
  }

  get(dependency: string): any {
    return this.sandboxDependencies.get(dependency) || this.parent.get(dependency);
  }

  restore(): void {
    for (const dependency of this.sandboxDependencies.keys()) {
      const original = this.parent.get(dependency);
      if (original !== undefined) {
        (global as any)[dependency] = original;
      } else {
        delete (global as any)[dependency];
      }
    }
    this.sandboxDependencies.clear();
  }
}