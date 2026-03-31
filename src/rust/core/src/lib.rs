use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskProfile {
    pub category: String,
    pub severity: String,
    pub complexity: u8,
}

pub fn calculate_agent_count(severity: &str, complexity: u8) -> u32 {
    let baseline: u32 = match severity {
        "low" => 1,
        "medium" => 3,
        "high" => 6,
        "critical" => 10,
        _ => 1,
    };

    let clamped = complexity.clamp(1, 10) as f64;
    let multiplier = (clamped / 5.0).min(2.0);
    let agents = (baseline as f64 * multiplier).ceil() as u32;
    agents.max(1)
}
