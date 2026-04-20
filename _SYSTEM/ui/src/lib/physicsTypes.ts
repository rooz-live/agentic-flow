/**
 * Normalized "physics engine" view consumed by MAPEKDashboard and mesh nav.
 * Values are derived from `.goalie/genuine_telemetry.json` (mixed JSON + NDJSON).
 */

export interface TelemetryData {
  timestamp: string;
  monitor: {
    cpu_utilization: number;
    memory_mapped_mb: number;
    active_agents: number;
    api_latency_ms: number;
  };
  analyze: {
    panic_matrix_distance: number;
    anomaly_detected: boolean;
  };
  plan: {
    proposed_action: string;
    wsjf_score: number;
    confidence: number;
  };
  execute: {
    status: "IDLE" | "EXECUTING" | "CIRCUIT_TRIPPED";
    last_action_id: string;
  };
  knowledge: {
    active_context_rings: number;
  };
  /** Optional: economic gate from authorize-testing-opex when present in ledger */
  wsjfQueue?: {
    now: string;
    next: string;
    later: string;
  };
}
