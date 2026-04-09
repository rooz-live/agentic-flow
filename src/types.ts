// @business-context WSJF-Cycle-59: Typescript Strict JSON Interfaces
// @constraint R-2026-033: Formats exactly how tracking structures natively bind limits natively without JSON schema drift.

export interface PolymarketOdds {
    timestamp: string;
    target_sector: string;
    prediction_window: string;
    signals: {
        SOXL_3x_Bull: SignalMetrics;
        SOXS_3x_Bear: SignalMetrics;
    };
    moe_coherence_gate_status: string;
}

export interface SignalMetrics {
    probability_score: number;
    action_suggestion: string;
    catalyst_driver: string;
}

export interface HostBillTelemetry {
    node_id: string;
    timestamp: string;
    ipmi_telemetry: {
        pmbus_watts: number;
        power_overload_flag: boolean;
        cpu_thermal_celsius: number;
    };
    hostbill_mapping_usd: number;
    tier_classification: 'ENTERPRISE_TIER_1' | 'ENTERPRISE_TIER_2' | 'STANDARD';
    status: 'GREEN' | 'WARN_THERMAL_LIMIT' | 'FAIL';
}

export interface GraphQLProxyLimits {
    status: "GREEN" | "FAIL" | "FAIL_UNBOUNDED";
    extracted_limit?: number;
    operation_type?: "query" | "mutation";
    metadata_proxy_verified?: boolean;
    reason?: string;
}

export interface TLDProxyResponse {
    status: "SUCCESS" | "FAIL";
    bridge_node?: string;
    simulated_inference?: string;
    error?: string;
}
