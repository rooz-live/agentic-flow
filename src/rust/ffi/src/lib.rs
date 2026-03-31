use napi_derive::napi;

#[napi]
pub fn health_check() -> String {
    "ok".to_string()
}

#[napi]
pub fn calculate_agent_count(severity: String, complexity: u32) -> u32 {
    let c = if complexity > 255 { 255 } else { complexity as u8 };
    agentic_flow_core::calculate_agent_count(&severity, c)
}
