/**
 * Multi-Tenant Dashboard for Affiliate Affinity Admin
 * 
 * Provides UI/UX for managing multiple tenants, monitoring performance,
 * WSJF prioritization, and circle integration.
 */

import { MultiTenantManager } from '../core/multi-tenant-manager';
import { Tenant } from '../types';
import { WSJFScoringService } from '../../wsjf/scoring-service';
import { HealthCheckSystem } from '../../core/health-checks';
// Temporarily comment out IncrementalExecutionEngine due to rootDir configuration issue
// import { IncrementalExecutionEngine } from '../../../lean-agentic/incremental-execution-engine';

export interface DashboardMetrics {
  totalTenants: number;
  activeTenants: number;
  avgWSJFScore: number;
  circlePerformance: Record<string, number>;
  revenueTrend: number[];
  topTenants: Tenant[];
}

export class MultiTenantDashboard {
  private healthChecker: HealthCheckSystem;
  private executionEngine: IncrementalExecutionEngine;

  constructor(
    private tenantManager: MultiTenantManager,
    private wsjfService: WSJFScoringService
  ) {
    this.healthChecker = new HealthCheckSystem(30000);
    this.healthChecker.start();
    this.executionEngine = new IncrementalExecutionEngine();
  }

  /**
   * Render console dashboard
   */
  renderConsole(): void {
    const tenants = this.tenantManager.getAllTenants();
    const metrics = this.calculateMetrics(tenants);

    console.log('\n=== MULTI-TENANT DASHBOARD ===');
    console.log(`Total Tenants: ${metrics.totalTenants} | Active: ${metrics.activeTenants}`);
    console.log(`Average WSJF Score: ${metrics.avgWSJFScore.toFixed(1)}`);
    console.log('\nCircle Performance:');
    console.table(Object.entries(metrics.circlePerformance).map(([role, perf]) => ({ Role: role, Performance: `${perf.toFixed(1)}%` })));
    console.log('\nTop Tenants by Revenue:');
    console.table(metrics.topTenants.slice(0, 5).map(t => ({
      Name: t.name,
      Plan: t.subscription.plan,
      Status: t.status,
      WSJF: t.metadata.wsjfScore || 0
    })));
    console.log('==============================\n');
  }

  /**
   * Calculate dashboard metrics
   */
  private calculateMetrics(tenants: Tenant[]): DashboardMetrics {
    const snapshot = this.healthChecker.getHealthSnapshot();
    const circles = snapshot?.circles || [];

    const circlePerformance = circles.reduce((acc, circle) => {
      acc[circle.circleId] = circle.performance.successRate;
      return acc;
    }, {} as Record<string, number>);

    const wsjfScores = tenants.map(t => t.metadata.wsjfScore || 50).filter(Boolean);
    const avgWSJFScore = wsjfScores.length > 0 ? wsjfScores.reduce((a, b) => a + b, 0) / wsjfScores.length : 0;

    return {
      totalTenants: tenants.length,
      activeTenants: tenants.filter(t => t.status === 'active').length,
      avgWSJFScore,
      circlePerformance,
      revenueTrend: [100, 120, 115, 130], // mock
      topTenants: tenants.sort((a, b) => (b.metadata.monthlyRevenue || 0) - (a.metadata.monthlyRevenue || 0))
    };
  }

  /**
   * Incremental dashboard refresh
   */
  async refreshDashboardIncrementally() {
    const refreshTasks = ['fetchTenants', 'calculateMetrics', 'updateWSJF', 'checkCircles', 'generateReport'];
    
    for await (const task of this.executionEngine.executeIncrementally(refreshTasks)) {
      console.log(`Dashboard refresh: ${task.name} - ${task.status} (attempt ${task.attempt})`);
    }
  }

  /**
   * WSJF prioritized tenant actions
   */
  getPrioritizedActions(tenantId: string): {action: string; wsjfScore: number}[] {
    const mockActions = [
      {action: 'Upgrade subscription', wsjfScore: 85},
      {action: 'Optimize affiliates', wsjfScore: 72},
      {action: 'Review commissions', wsjfScore: 65},
      {action: 'Update branding', wsjfScore: 58}
    ];
    return mockActions;
  }

  /**
   * Dispose of dashboard resources
   */
  public dispose(): void {
    this.healthChecker.stop();
  }
}