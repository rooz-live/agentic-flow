/**
 * Test Utilities for Agentic Flow Core
 *
 * Provides mock factories, assertion helpers, and common test utilities
 * for consistent testing across the codebase.
 *
 * @module test-utils
 * @version 1.0.0
 */
import type { Purpose, Domain, Accountability, Plan, Do, Act, Action, Outcome, MultipassCycle } from '../core/orchestration-framework.js';
import type { HealthCheck, CircleRole, SystemHealth } from '../core/health-checks.js';
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
/**
 * Create a mock Purpose object for testing
 */
export declare function createMockPurpose(overrides?: Partial<Purpose>): Purpose;
/**
 * Create a mock Domain object for testing
 */
export declare function createMockDomain(overrides?: Partial<Domain>): Domain;
/**
 * Create a mock Accountability object for testing
 */
export declare function createMockAccountability(overrides?: Partial<Accountability>): Accountability;
/**
 * Create a mock Plan object for testing
 */
export declare function createMockPlan(overrides?: Partial<Plan>): Plan;
/**
 * Create a mock Action object for testing
 */
export declare function createMockAction(overrides?: Partial<Action>): Action;
/**
 * Create a mock Do object for testing
 */
export declare function createMockDo(planId: string, overrides?: Partial<Do>): Do;
/**
 * Create a mock Outcome object for testing
 */
export declare function createMockOutcome(overrides?: Partial<Outcome>): Outcome;
/**
 * Create a mock Act object for testing
 */
export declare function createMockAct(doId: string, overrides?: Partial<Act>): Act;
/**
 * Create a mock MultipassCycle for testing
 */
export declare function createMockMultipassCycle(iteration: number, overrides?: Partial<MultipassCycle>): MultipassCycle;
/**
 * Create mock health metrics for testing
 */
export declare function createMockHealthMetrics(overrides?: Partial<MockHealthMetrics>): MockHealthMetrics;
/**
 * Create a mock HealthCheck object for testing
 */
export declare function createMockHealthCheck(id: string, overrides?: Partial<HealthCheck>): HealthCheck;
/**
 * Create a mock CircleRole for testing
 * Valid circle IDs: analyst, assessor, innovator, intuitive, orchestrator, seeker
 */
export declare function createMockCircleRole(circleId: 'analyst' | 'assessor' | 'innovator' | 'intuitive' | 'orchestrator' | 'seeker', overrides?: Partial<CircleRole>): CircleRole;
/**
 * Create a mock SystemHealth snapshot for testing
 */
export declare function createMockSystemHealth(overrides?: Partial<SystemHealth>): SystemHealth;
/**
 * Assert that a PDA state transition is valid
 * Valid transitions:
 * - pending -> in_progress
 * - in_progress -> completed
 * - in_progress -> blocked
 * - blocked -> in_progress
 */
export declare function expectPDAStateTransition(from: 'pending' | 'in_progress' | 'completed' | 'blocked', to: 'pending' | 'in_progress' | 'completed' | 'blocked'): void;
/**
 * Assert that health metrics are within expected ranges
 */
export declare function expectHealthMetricsInRange(metrics: MockHealthMetrics): void;
/**
 * Assert that a health check has required fields
 */
export declare function expectValidHealthCheck(check: HealthCheck): void;
/**
 * Assert that a CircleRole has valid structure
 */
export declare function expectValidCircleRole(role: CircleRole): void;
/**
 * Assert that a Purpose has valid structure
 */
export declare function expectValidPurpose(purpose: Purpose): void;
/**
 * Assert that a Plan has valid structure
 */
export declare function expectValidPlan(plan: Plan): void;
/**
 * Assert that a Do item has valid structure
 */
export declare function expectValidDo(doItem: Do): void;
/**
 * Assert that an Act item has valid structure
 */
export declare function expectValidAct(act: Act): void;
/**
 * Wait for a specified duration (useful for async operations)
 */
export declare function wait(ms: number): Promise<void>;
/**
 * Generate a unique test ID
 */
export declare function generateTestId(prefix?: string): string;
/**
 * Create a spy that tracks calls and can be awaited
 */
export declare function createAsyncSpy<T>(returnValue?: T): jest.Mock<Promise<T>>;
/**
 * Create a spy that rejects with an error
 */
export declare function createRejectingSpy(error: Error | string): jest.Mock<Promise<never>>;
/**
 * Mock console methods for testing
 */
export declare function mockConsole(): {
    log: jest.SpyInstance;
    warn: jest.SpyInstance;
    error: jest.SpyInstance;
    restore: () => void;
};
/**
 * Type guard to check if a value is a valid Do status
 */
export declare function isValidDoStatus(status: unknown): status is Do['status'];
/**
 * Type guard to check if a value is a valid health status
 */
export declare function isValidHealthStatus(status: unknown): status is HealthCheck['status'];
/**
 * Type guard to check if a value is a valid circle role ID
 */
export declare function isValidCircleRoleId(id: unknown): id is string;
/**
 * Type guard to check if an object is a valid Plan
 */
export declare function isPlan(obj: unknown): obj is Plan;
/**
 * Type guard to check if an object is a valid Do item
 */
export declare function isDo(obj: unknown): obj is Do;
/**
 * Type guard to check if an object is a valid Act item
 */
export declare function isAct(obj: unknown): obj is Act;
//# sourceMappingURL=test-utils.d.ts.map