import { OrchestrationFramework } from '../core/orchestration-framework';
import { HealthCheckSystem } from '../core/health-checks';
import { AFProdConfig, PreflightAnalytics } from './types';
import { EventEmitter } from 'events';
export declare class AFProdEngine extends EventEmitter {
    private orchestration;
    private healthSystem;
    constructor(orchestration: OrchestrationFramework, healthSystem: HealthCheckSystem);
    executeWithZeroFailure(planId: string, config?: AFProdConfig): Promise<{
        success: boolean;
        finalAnalysis: PreflightAnalytics;
    }>;
    /**
     * Check MCP health status
     * Returns true if MCP servers are operational, false if degraded
     */
    private checkMCPHealth;
}
//# sourceMappingURL=engine.d.ts.map