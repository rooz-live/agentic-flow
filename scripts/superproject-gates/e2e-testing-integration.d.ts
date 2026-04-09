#!/usr/bin/env tsx
/**
 * E2E Testing Integration - Playwright + Vibium
 * TUX GUI UX UI testing with auto/interactivity
 */
export interface E2EConfig {
    framework: 'playwright' | 'vibium';
    vibium: {
        enabled: boolean;
        autoInteractivity: boolean;
    };
    coverage: {
        target: number;
        gui: boolean;
        ux: boolean;
        ui: boolean;
    };
}
export declare class E2ETestingIntegration {
    private projectRoot;
    private config;
    constructor(projectRoot?: string);
    private loadConfig;
    /**
     * Install dependencies
     */
    installDependencies(): Promise<void>;
    /**
     * Run E2E tests
     */
    runTests(): Promise<{
        success: boolean;
        coverage: number;
    }>;
    /**
     * Get coverage percentage
     */
    private getCoverage;
    /**
     * Generate coverage report
     */
    generateCoverageReport(): Promise<void>;
}
//# sourceMappingURL=e2e-testing-integration.d.ts.map