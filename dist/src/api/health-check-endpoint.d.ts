/**
 * Health Check API Endpoint - Dynamic Threshold Monitoring
 * ==========================================================
 * Provides REST endpoints for monitoring all 6 MPP threshold patterns
 *
 * Endpoints:
 *   GET /api/health - Comprehensive health check
 *   GET /api/health/thresholds - Current dynamic thresholds
 *   GET /api/health/degradation - Degradation status
 *   GET /api/health/cascade - Cascade failure status
 *   GET /api/health/divergence - Divergence rate status
 */
declare const router: import("express-serve-static-core").Router;
declare let governorState: any;
/**
 * Initialize governor state if not exists
 */
declare function ensureState(): any;
export default router;
export { ensureState, governorState };
//# sourceMappingURL=health-check-endpoint.d.ts.map