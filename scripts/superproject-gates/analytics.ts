import { SystemHealth } from '../core/health-checks';
import { PreflightAnalytics } from './types';

export class AFProdAnalytics {
  static createPreSnapshot(health: SystemHealth): PreflightAnalytics {
    return {
      preSnapshot: health,
      regressionRisk: AFProdAnalytics.calculateRegressionRisk(health),
      lineageTrace: []
    };
  }

  static postIterationAnalysis(
    iteration: number,
    convergence: number,
    stability: number,
    preSnapshot: SystemHealth
  ): { regressionDetected: boolean; recommendations: string[]; riskDelta: number } {
    const regressionDetected = convergence < 0.90 || stability < 0.80;
    const riskDelta = Math.abs(convergence - 0.95) + Math.abs(stability - 0.85);
    const recommendations: string[] = [];

    if (regressionDetected) {
      recommendations.push('Parameter tuning required');
      recommendations.push('Data quality check');
      recommendations.push('Model recalibration');
    } else {
      recommendations.push('Continue to convergence');
    }

    return { regressionDetected, recommendations, riskDelta };
  }

  private static calculateRegressionRisk(health: SystemHealth): number {
    // Calculate regression risk based on health metrics
    const cpuRisk = health.metrics.cpu > 80 ? 0.1 : 0;
    const memRisk = health.metrics.memory > 85 ? 0.15 : 0;
    const criticalComponents = Object.values(health.components).filter(c => c.status === 'critical').length;
    const componentRisk = criticalComponents * 0.05;

    return Math.min(0.5, cpuRisk + memRisk + componentRisk);
  }

  static validateZeroFailure(convergence: number, stability: number, thresholdConfig: { convergence: number; stability: number }): 'pass' | 'warn' | 'fail' {
    if (convergence >= thresholdConfig.convergence && stability >= thresholdConfig.stability) return 'pass';
    if (convergence >= thresholdConfig.convergence * 0.9 && stability >= thresholdConfig.stability * 0.9) return 'warn';
    return 'fail';
  }
}