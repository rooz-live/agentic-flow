/**
 * Workload-Specific Cost of Delay (COD) Calculators
 *
 * This module provides workload-specific COD calculation functions that account for
 * domain-specific cost structures (e.g., GPU idle time for HPC, model serving latency for ML).
 */
export interface CODContext {
    pattern: string;
    workloadType: 'ML' | 'HPC' | 'Stats' | 'Device/Web' | 'General';
    framework?: string;
    scheduler?: string;
    [key: string]: any;
}
export interface CODResult {
    cod: number;
    components: {
        baseDelayCost?: number;
        computeCostDuringQueue?: number;
        deploymentDelayCost?: number;
        resourceWasteCost?: number;
        userImpactCost?: number;
    };
    breakdown: string[];
}
/**
 * HPC-specific COD calculator
 * Accounts for:
 * - GPU idle time during queue waits
 * - Cluster fragmentation costs
 * - Network bottleneck impacts
 * - Node failure recovery costs
 */
export declare function calculateHPCCOD(context: CODContext): CODResult;
/**
 * ML-specific COD calculator
 * Accounts for:
 * - Training job delays
 * - Model serving latency
 * - Checkpoint corruption costs
 * - Distributed training failures
 */
export declare function calculateMLCOD(context: CODContext): CODResult;
/**
 * Stats-specific COD calculator
 * Accounts for:
 * - Statistical validity costs
 * - Data quality issues
 * - Analysis delays
 */
export declare function calculateStatsCOD(context: CODContext): CODResult;
/**
 * Device/Web-specific COD calculator
 * Accounts for:
 * - User experience impact
 * - Performance degradation
 * - Cross-platform compatibility issues
 */
export declare function calculateDeviceWebCOD(context: CODContext): CODResult;
/**
 * General COD calculator (fallback)
 */
export declare function calculateGeneralCOD(context: CODContext): CODResult;
/**
 * Main COD calculator that routes to workload-specific calculators
 */
export declare function calculateCOD(context: CODContext): CODResult;
//# sourceMappingURL=cod_calculators.d.ts.map