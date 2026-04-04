import { SystemHealth } from '../core/health-checks';
import { PreflightAnalytics } from './types';
export declare class AFProdAnalytics {
    static createPreSnapshot(health: SystemHealth): PreflightAnalytics;
    static postIterationAnalysis(iteration: number, convergence: number, stability: number, preSnapshot: SystemHealth): {
        regressionDetected: boolean;
        recommendations: string[];
        riskDelta: number;
    };
    private static calculateRegressionRisk;
    static validateZeroFailure(convergence: number, stability: number, thresholdConfig: {
        convergence: number;
        stability: number;
    }): 'pass' | 'warn' | 'fail';
}
//# sourceMappingURL=analytics.d.ts.map