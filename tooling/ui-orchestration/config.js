/* =====================================================
   Agentic Flow - UI Orchestration Config
   Translated from fake UI towards telemetry reality bounds
   ===================================================== */

/**
 * Reality-Mapped Endpoints
 * These routes link directly to the mathematical engine bounds
 */
export const TELEMETRY_CONFIG = {
    // Bridges into the _SYSTEM/_AUTOMATION ETA limits
    etaStreamEndpoint: "../../_SYSTEM/_AUTOMATION/run-bounded-eta.sh",
    
    // Bounds the CSQBM Date Semantic checks
    csqbmGateEndpoint: "../../scripts/validators/project/check-csqbm.sh",
    
    // Bridges into the Bernoulli-based WSJF SQLite bounds
    wsjfBaselineEndpoint: "../../scripts/ay-wsjf-runner.sh"
};

/**
 * Sync Config for hostbill metrics and pipeline checks
 */
export const SYNC_THRESHOLDS = {
    maxStaleHours: 96,
    pingIntervalMs: 3000,
    wsjfThresholdLimit: 80.0
};
