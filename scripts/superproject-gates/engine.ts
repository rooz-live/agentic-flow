import { OrchestrationFramework } from '../core/orchestration-framework';
import { HealthCheckSystem } from '../core/health-checks';
import { AFProdConfig, PreflightAnalytics } from './types';
import { EventEmitter } from 'events';

export class AFProdEngine extends EventEmitter {
  constructor(
    private orchestration: OrchestrationFramework,
    private healthSystem: HealthCheckSystem
  ) {
    super();
  }

  async executeWithZeroFailure(planId: string, config: AFProdConfig = { preflightIters: 5, convergenceThreshold: 0.95, stabilityThreshold: 0.85, zeroFailureMode: true }): Promise<{ success: boolean; finalAnalysis: PreflightAnalytics }> {
    // P0 Fix: Pre-execution MCP health validation
    const mcpHealthy = await this.checkMCPHealth();
    if (!mcpHealthy) {
      this.emit('safe_degrade', { 
        reason: 'MCP unavailable', 
        planId,
        timestamp: new Date()
      });
      
      // Disable zero-failure mode in degraded state
      if (config.zeroFailureMode) {
        console.warn('⚠️  MCP degraded - disabling zero-failure mode');
        config = { ...config, zeroFailureMode: false, preflightIters: Math.min(config.preflightIters, 2) };
      }
    }
    
    const preAnalytics: PreflightAnalytics = {
      preSnapshot: await this.healthSystem.performHealthChecks(),
      regressionRisk: mcpHealthy ? 0.02 : 0.15,  // Higher risk in degraded mode
      lineageTrace: [mcpHealthy ? 'af-prod-engine-init' : 'af-prod-engine-init-degraded']
    };

    let iteration = 0;
    let converged = false;
    const runId = this.orchestration.startMultipassRun(planId);

    while (iteration < config.preflightIters && !converged) {
      iteration++;

      const cycle = this.orchestration.startMultipassCycle(runId);

      // Simulate Do/Act phases with multipass
      // In real impl, integrate PDA cycle here

      // Mock metrics update for demonstration
      this.orchestration.updateMultipassCycleMetrics(runId, cycle.id, { 
        taskSuccess: 0.98 + (iteration * 0.002), 
        errorRate: 0.01 - (iteration * 0.001) 
      }, 0.92 + (iteration * 0.006), 0.88 + (iteration * 0.005));

      this.orchestration.completeMultipassCycle(runId, cycle.id);

      const analysis = this.orchestration.analyzeMultipassConvergence(runId);
      converged = analysis.averageConvergence >= config.convergenceThreshold && analysis.averageStability >= config.stabilityThreshold;

      preAnalytics.lineageTrace.push(`iter${iteration}-conv${analysis.averageConvergence.toFixed(2)}-stab${analysis.averageStability.toFixed(2)}`);

      if (iteration === config.preflightIters && !converged) {
        throw new Error(`Zero-failure enforcer activated: Failed convergence after ${config.preflightIters} iterations (iter5 catch)`);
      }
    }

    this.orchestration.endMultipassRun(runId);

    preAnalytics.regressionRisk = converged ? 0 : 0.15;

    return { success: true, finalAnalysis: preAnalytics };
  }

  /**
   * Check MCP health status
   * Returns true if MCP servers are operational, false if degraded
   */
  private async checkMCPHealth(): Promise<boolean> {
    try {
      const snapshot = await this.healthSystem.performHealthChecks();
      
      // Check MCP component health
      if (snapshot.components?.mcp) {
        const mcpStatus = snapshot.components.mcp.status;
        return mcpStatus === 'healthy' || mcpStatus === 'warning';
      }
      
      // Fallback: Try direct agentdb check
      const { execSync } = require('child_process');
      try {
        execSync('npx agentdb stats', { timeout: 5000, stdio: 'ignore' });
        return true;
      } catch {
        return false;
      }
    } catch (error) {
      console.error('MCP health check failed:', error);
      return false;
    }
  }
}
