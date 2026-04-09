/**
 * Test Utilities for Agentic Flow Core
 *
 * Provides mock factories, assertion helpers, and common test utilities
 * for consistent testing across the codebase.
 *
 * @module test-utils
 * @version 1.0.0
 */

// This file contains test utilities only - add a dummy test to satisfy Jest
describe('Test Utilities', () => {
  it('should export utility functions', () => {
    expect(typeof createMockPlan).toBe('function');
    expect(typeof createMockDo).toBe('function');
    expect(typeof createMockAct).toBe('function');
    expect(typeof expectPDAStateTransition).toBe('function');
  });
});

import type {
  Purpose,
  Domain,
  Accountability,
  Plan,
  Do,
  Act,
  Action,
  Outcome,
  MultipassCycle,
} from '../core/orchestration-framework.js';

import type {
  HealthCheck,
  CircleRole,
  SystemHealth,
} from '../core/health-checks.js';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Mock health metrics for testing
 */
export interface MockHealthMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  uptime: number;
}

/**
 * PDA state transition descriptor
 */
export interface PDAStateTransition {
  from: 'pending' | 'in_progress' | 'completed' | 'blocked';
  to: 'pending' | 'in_progress' | 'completed' | 'blocked';
  timestamp: Date;
}

// ============================================================================
// Mock Factories - Governance (Purpose/Domains/Accountability)
// ============================================================================

/**
 * Create a mock Purpose object for testing
 */
export function createMockPurpose(overrides?: Partial<Purpose>): Purpose {
  return {
    id: `purpose-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    name: 'Test Purpose',
    description: 'A purpose created for testing',
    objectives: [
      'Test Objective 1',
      'Test Objective 2',
    ],
    keyResults: [
      'Key Result 1',
      'Key Result 2',
    ],
    ...overrides,
  };
}

/**
 * Create a mock Domain object for testing
 */
export function createMockDomain(overrides?: Partial<Domain>): Domain {
  return {
    id: `domain-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    name: 'Test Domain',
    purpose: 'Testing purposes',
    boundaries: [
      'Boundary 1',
      'Boundary 2',
    ],
    accountabilities: [
      'Accountability 1',
      'Accountability 2',
    ],
    ...overrides,
  };
}

/**
 * Create a mock Accountability object for testing
 */
export function createMockAccountability(overrides?: Partial<Accountability>): Accountability {
  return {
    id: `accountability-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    role: 'Test Role',
    responsibilities: [
      'Responsibility 1',
      'Responsibility 2',
    ],
    metrics: [
      'Metric 1',
      'Metric 2',
    ],
    reportingTo: ['manager-1'],
    ...overrides,
  };
}

// ============================================================================
// Mock Factories - PDA Cycle (Plan/Do/Act)
// ============================================================================

/**
 * Create a mock Plan object for testing
 */
export function createMockPlan(overrides?: Partial<Plan>): Plan {
  return {
    id: `plan-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    name: 'Test Plan',
    description: 'A plan created for testing',
    objectives: [
      'Objective 1',
      'Objective 2',
    ],
    timeline: '4 weeks',
    resources: [
      'Resource 1',
      'Resource 2',
    ],
    ...overrides,
  };
}

/**
 * Create a mock Action object for testing
 */
export function createMockAction(overrides?: Partial<Action>): Action {
  return {
    id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    name: 'Test Action',
    description: 'An action created for testing',
    priority: 1,
    estimatedDuration: 60,
    dependencies: [],
    ...overrides,
  };
}

/**
 * Create a mock Do object for testing
 */
export function createMockDo(planId: string, overrides?: Partial<Do>): Do {
  return {
    id: `do-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    planId,
    actions: [createMockAction()],
    status: 'pending',
    metrics: {},
    ...overrides,
  };
}

/**
 * Create a mock Outcome object for testing
 */
export function createMockOutcome(overrides?: Partial<Outcome>): Outcome {
  return {
    id: `outcome-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    name: 'Test Outcome',
    status: 'success',
    actualValue: 0.85,
    expectedValue: 0.80,
    variance: 0.05,
    lessons: ['Lesson 1'],
    ...overrides,
  };
}

/**
 * Create a mock Act object for testing
 */
export function createMockAct(doId: string, overrides?: Partial<Act>): Act {
  return {
    id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    doId,
    outcomes: [createMockOutcome()],
    learnings: ['Learning 1'],
    improvements: ['Improvement 1'],
    metrics: {},
    ...overrides,
  };
}

/**
 * Create a mock MultipassCycle for testing
 */
export function createMockMultipassCycle(iteration: number, overrides?: Partial<MultipassCycle>): MultipassCycle {
  return {
    id: `cycle-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    iteration,
    startTime: new Date(),
    status: 'running',
    metrics: {},
    convergence: 0.5,
    stability: 0.7,
    ...overrides,
  };
}

// ============================================================================
// Mock Factories - Health Check System
// ============================================================================

/**
 * Create mock health metrics for testing
 */
export function createMockHealthMetrics(overrides?: Partial<MockHealthMetrics>): MockHealthMetrics {
  return {
    cpu: 45.5,
    memory: 62.3,
    disk: 55.0,
    network: 1000,
    uptime: 3600000,
    ...overrides,
  };
}

/**
 * Create a mock HealthCheck object for testing
 */
export function createMockHealthCheck(id: string, overrides?: Partial<HealthCheck>): HealthCheck {
  return {
    id,
    name: `Test Health Check ${id}`,
    description: 'A health check for testing',
    status: 'healthy',
    lastChecked: new Date(),
    metrics: {
      responseTime: 100,
      successRate: 99.5,
    },
    dependencies: [],
    ...overrides,
  };
}

/**
 * Create a mock CircleRole for testing
 * Valid circle IDs: analyst, assessor, innovator, intuitive, orchestrator, seeker
 */
export function createMockCircleRole(
  circleId: 'analyst' | 'assessor' | 'innovator' | 'intuitive' | 'orchestrator' | 'seeker',
  overrides?: Partial<CircleRole>
): CircleRole {
  const responsibilities: Record<string, string[]> = {
    analyst: ['Data analysis and insights generation', 'Pattern recognition'],
    assessor: ['Risk assessment and quality assurance', 'Compliance monitoring'],
    innovator: ['Research and development initiatives', 'Prototype development'],
    intuitive: ['User experience and interface design', 'Usability testing'],
    orchestrator: ['System coordination and workflow management', 'Resource allocation'],
    seeker: ['Market research and opportunity identification', 'Competitive analysis'],
  };

  return {
    id: `circle-${circleId}`,
    name: `${circleId.charAt(0).toUpperCase() + circleId.slice(1)} Circle`,
    circleId,
    responsibilities: responsibilities[circleId] || [],
    status: 'active',
    currentTasks: [`Task 1 for ${circleId}`, `Task 2 for ${circleId}`],
    performance: {
      tasksCompleted: 10,
      tasksBlocked: 0,
      averageTaskDuration: 7.5,
      successRate: 95.0,
    },
    lastUpdate: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock SystemHealth snapshot for testing
 */
export function createMockSystemHealth(overrides?: Partial<SystemHealth>): SystemHealth {
  return {
    timestamp: new Date(),
    overall: 'healthy',
    components: {
      orchestration: createMockHealthCheck('orchestration-framework'),
      agentdb: createMockHealthCheck('agentdb-memory'),
      mcp: createMockHealthCheck('mcp-protocol'),
      governance: createMockHealthCheck('governance-system'),
      monitoring: createMockHealthCheck('monitoring-stack'),
    },
    circles: [
      createMockCircleRole('analyst'),
      createMockCircleRole('orchestrator'),
    ],
    metrics: createMockHealthMetrics(),
    incidents: [],
    ...overrides,
  };
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Assert that a PDA state transition is valid
 * Valid transitions:
 * - pending -> in_progress
 * - in_progress -> completed
 * - in_progress -> blocked
 * - blocked -> in_progress
 */
export function expectPDAStateTransition(
  from: 'pending' | 'in_progress' | 'completed' | 'blocked',
  to: 'pending' | 'in_progress' | 'completed' | 'blocked'
): void {
  const validTransitions: Record<string, string[]> = {
    pending: ['in_progress'],
    in_progress: ['completed', 'blocked'],
    blocked: ['in_progress'],
    completed: [], // Terminal state
  };

  const isValid = validTransitions[from]?.includes(to) ?? false;
  
  if (!isValid) {
    throw new Error(
      `Invalid PDA state transition: ${from} -> ${to}. Valid transitions from '${from}': [${validTransitions[from]?.join(', ') || 'none'}]`
    );
  }
}

/**
 * Assert that health metrics are within expected ranges
 */
export function expectHealthMetricsInRange(metrics: MockHealthMetrics): void {
  expect(metrics.cpu).toBeGreaterThanOrEqual(0);
  expect(metrics.cpu).toBeLessThanOrEqual(100);
  expect(metrics.memory).toBeGreaterThanOrEqual(0);
  expect(metrics.memory).toBeLessThanOrEqual(100);
  expect(metrics.disk).toBeGreaterThanOrEqual(0);
  expect(metrics.disk).toBeLessThanOrEqual(100);
  expect(metrics.network).toBeGreaterThan(0);
  expect(metrics.uptime).toBeGreaterThan(0);
}

/**
 * Assert that a health check has required fields
 */
export function expectValidHealthCheck(check: HealthCheck): void {
  expect(check.id).toBeDefined();
  expect(check.name).toBeDefined();
  expect(check.description).toBeDefined();
  expect(['healthy', 'warning', 'critical', 'unknown']).toContain(check.status);
  expect(check.lastChecked).toBeInstanceOf(Date);
  expect(check.metrics).toBeDefined();
  expect(Array.isArray(check.dependencies)).toBe(true);
}

/**
 * Assert that a CircleRole has valid structure
 */
export function expectValidCircleRole(role: CircleRole): void {
  const validCircleIds = ['analyst', 'assessor', 'innovator', 'intuitive', 'orchestrator', 'seeker'];
  
  expect(role.id).toBeDefined();
  expect(role.name).toBeDefined();
  expect(validCircleIds).toContain(role.circleId);
  expect(['active', 'inactive', 'overloaded']).toContain(role.status);
  expect(Array.isArray(role.responsibilities)).toBe(true);
  expect(Array.isArray(role.currentTasks)).toBe(true);
  expect(role.performance).toBeDefined();
  expect(role.performance.tasksCompleted).toBeGreaterThanOrEqual(0);
  expect(role.performance.successRate).toBeGreaterThanOrEqual(0);
  expect(role.performance.successRate).toBeLessThanOrEqual(100);
}

/**
 * Assert that a Purpose has valid structure
 */
export function expectValidPurpose(purpose: Purpose): void {
  expect(purpose.id).toBeDefined();
  expect(purpose.name).toBeDefined();
  expect(purpose.description).toBeDefined();
  expect(Array.isArray(purpose.objectives)).toBe(true);
  expect(Array.isArray(purpose.keyResults)).toBe(true);
}

/**
 * Assert that a Plan has valid structure
 */
export function expectValidPlan(plan: Plan): void {
  expect(plan.id).toBeDefined();
  expect(plan.name).toBeDefined();
  expect(plan.description).toBeDefined();
  expect(Array.isArray(plan.objectives)).toBe(true);
  expect(plan.timeline).toBeDefined();
  expect(Array.isArray(plan.resources)).toBe(true);
}

/**
 * Assert that a Do item has valid structure
 */
export function expectValidDo(doItem: Do): void {
  expect(doItem.id).toBeDefined();
  expect(doItem.planId).toBeDefined();
  expect(Array.isArray(doItem.actions)).toBe(true);
  expect(['pending', 'in_progress', 'completed', 'blocked']).toContain(doItem.status);
  expect(doItem.metrics).toBeDefined();
}

/**
 * Assert that an Act item has valid structure
 */
export function expectValidAct(act: Act): void {
  expect(act.id).toBeDefined();
  expect(act.doId).toBeDefined();
  expect(Array.isArray(act.outcomes)).toBe(true);
  expect(Array.isArray(act.learnings)).toBe(true);
  expect(Array.isArray(act.improvements)).toBe(true);
  expect(act.metrics).toBeDefined();
}

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Wait for a specified duration (useful for async operations)
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate a unique test ID
 */
export function generateTestId(prefix: string = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a spy that tracks calls and can be awaited
 */
export function createAsyncSpy<T>(returnValue?: T): jest.Mock<Promise<T>> {
  return jest.fn().mockResolvedValue(returnValue as T);
}

/**
 * Create a spy that rejects with an error
 */
export function createRejectingSpy(error: Error | string): jest.Mock<Promise<never>> {
  const err = typeof error === 'string' ? new Error(error) : error;
  return jest.fn().mockRejectedValue(err);
}

/**
 * Mock console methods for testing
 */
export function mockConsole(): {
  log: jest.SpyInstance;
  warn: jest.SpyInstance;
  error: jest.SpyInstance;
  restore: () => void;
} {
  const log = jest.spyOn(console, 'log').mockImplementation();
  const warn = jest.spyOn(console, 'warn').mockImplementation();
  const error = jest.spyOn(console, 'error').mockImplementation();
  
  return {
    log,
    warn,
    error,
    restore: () => {
      log.mockRestore();
      warn.mockRestore();
      error.mockRestore();
    },
  };
}

// ============================================================================
// Type Guards for Runtime Type Checking
// ============================================================================

/**
 * Type guard to check if a value is a valid Do status
 */
export function isValidDoStatus(status: unknown): status is Do['status'] {
  return typeof status === 'string' &&
    ['pending', 'in_progress', 'completed', 'blocked'].includes(status);
}

/**
 * Type guard to check if a value is a valid health status
 */
export function isValidHealthStatus(status: unknown): status is HealthCheck['status'] {
  return typeof status === 'string' &&
    ['healthy', 'warning', 'critical', 'unknown'].includes(status);
}

/**
 * Type guard to check if a value is a valid circle role ID
 */
export function isValidCircleRoleId(id: unknown): id is string {
  return typeof id === 'string' &&
    ['analyst', 'assessor', 'innovator', 'intuitive', 'orchestrator', 'seeker'].includes(id);
}

/**
 * Type guard to check if an object is a valid Plan
 */
export function isPlan(obj: unknown): obj is Plan {
  if (!obj || typeof obj !== 'object') return false;
  const plan = obj as Record<string, unknown>;
  return (
    typeof plan.id === 'string' &&
    typeof plan.name === 'string' &&
    typeof plan.description === 'string' &&
    Array.isArray(plan.objectives) &&
    typeof plan.timeline === 'string' &&
    Array.isArray(plan.resources)
  );
}

/**
 * Type guard to check if an object is a valid Do item
 */
export function isDo(obj: unknown): obj is Do {
  if (!obj || typeof obj !== 'object') return false;
  const doItem = obj as Record<string, unknown>;
  return (
    typeof doItem.id === 'string' &&
    typeof doItem.planId === 'string' &&
    Array.isArray(doItem.actions) &&
    isValidDoStatus(doItem.status) &&
    typeof doItem.metrics === 'object'
  );
}

/**
 * Type guard to check if an object is a valid Act item
 */
export function isAct(obj: unknown): obj is Act {
  if (!obj || typeof obj !== 'object') return false;
  const act = obj as Record<string, unknown>;
  return (
    typeof act.id === 'string' &&
    typeof act.doId === 'string' &&
    Array.isArray(act.outcomes) &&
    Array.isArray(act.learnings) &&
    Array.isArray(act.improvements) &&
    typeof act.metrics === 'object'
  );
}
