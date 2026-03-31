//! Orchestration Module
//!
//! DoR: Risk profile categories and swarm topologies specified
//! DoD: Agent count, topology selection, and circuit breaker state transitions tested
//!
//! High-performance task orchestration migrated from orchestration-framework.ts

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RiskSeverity {
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RiskCategory {
    Security,
    Performance,
    Compliance,
    BusinessCritical,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskProfile {
    pub category: RiskCategory,
    pub severity: RiskSeverity,
    pub complexity: u8, // 1-10
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SwarmConfig {
    pub agent_count: usize,
    pub topology: SwarmTopology,
    pub max_concurrent: usize,
    pub timeout_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SwarmTopology {
    Mesh,
    Hierarchical,
    Ring,
}

impl RiskProfile {
    /// Calculate optimal agent count based on risk
    pub fn calculate_agent_count(&self) -> usize {
        let baseline = match self.severity {
            RiskSeverity::Low => 1,
            RiskSeverity::Medium => 3,
            RiskSeverity::High => 6,
            RiskSeverity::Critical => 10,
        };

        let multiplier = f64::min(self.complexity as f64 / 5.0, 2.0);
        (baseline as f64 * multiplier).ceil() as usize
    }

    /// Select swarm topology based on complexity
    pub fn select_topology(&self) -> SwarmTopology {
        match self.complexity {
            1..=3 => SwarmTopology::Ring,
            4..=6 => SwarmTopology::Mesh,
            _ => SwarmTopology::Hierarchical,
        }
    }

    /// Generate complete swarm configuration
    pub fn generate_swarm_config(&self) -> SwarmConfig {
        let agent_count = self.calculate_agent_count();
        let topology = self.select_topology();
        let max_concurrent = usize::min(agent_count, 10);
        let timeout_ms = 30000 * u64::max(1, self.complexity as u64 / 3);

        SwarmConfig {
            agent_count,
            topology,
            max_concurrent,
            timeout_ms,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CircuitBreaker {
    pub threshold_ms: u64,
    pub failure_count: usize,
    pub state: CircuitState,
    pub p99_latency_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum CircuitState {
    Closed,
    Open,
    HalfOpen,
}

impl CircuitBreaker {
    pub fn new(initial_threshold_ms: u64) -> Self {
        Self {
            threshold_ms: initial_threshold_ms,
            failure_count: 0,
            state: CircuitState::Closed,
            p99_latency_ms: 0,
        }
    }

    /// P1-LIVE: Update threshold based on learned P99 latency
    pub fn update_threshold(&mut self, new_p99_ms: u64) {
        self.p99_latency_ms = new_p99_ms;
        // Learned threshold is 1.5x P99 latency
        self.threshold_ms = (new_p99_ms as f64 * 1.5) as u64;
    }

    pub fn check_state(&mut self, current_latency_ms: u64) -> CircuitState {
        if current_latency_ms > self.threshold_ms {
            self.failure_count += 1;
            if self.failure_count > 5 {
                self.state = CircuitState::Open;
            }
        } else {
            self.failure_count = 0;
            if self.state == CircuitState::Open {
                self.state = CircuitState::HalfOpen;
            } else {
                self.state = CircuitState::Closed;
            }
        }
        self.state.clone()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── CircuitBreaker ──────────────────────────────────────────────────

    #[test]
    fn test_circuit_breaker_new_defaults() {
        let cb = CircuitBreaker::new(1000);
        assert_eq!(cb.threshold_ms, 1000);
        assert_eq!(cb.failure_count, 0);
        assert_eq!(cb.state, CircuitState::Closed);
        assert_eq!(cb.p99_latency_ms, 0);
    }

    #[test]
    fn test_learned_threshold() {
        let mut cb = CircuitBreaker::new(1000);
        cb.update_threshold(200);
        assert_eq!(cb.threshold_ms, 300); // 200 * 1.5
        assert_eq!(cb.p99_latency_ms, 200);
    }

    #[test]
    fn test_circuit_breaker_stays_closed_on_normal_latency() {
        let mut cb = CircuitBreaker::new(1000);
        let state = cb.check_state(500);
        assert_eq!(state, CircuitState::Closed);
        assert_eq!(cb.failure_count, 0);
    }

    #[test]
    fn test_circuit_breaker_increments_failures_on_high_latency() {
        let mut cb = CircuitBreaker::new(1000);
        cb.check_state(1500);
        assert_eq!(cb.failure_count, 1);
        assert_eq!(cb.state, CircuitState::Closed); // Not open yet
    }

    #[test]
    fn test_circuit_breaker_opens_after_threshold_failures() {
        let mut cb = CircuitBreaker::new(1000);
        // Need > 5 failures to open
        for _ in 0..6 {
            cb.check_state(1500);
        }
        assert_eq!(cb.state, CircuitState::Open);
        assert_eq!(cb.failure_count, 6);
    }

    #[test]
    fn test_circuit_breaker_transitions_open_to_half_open() {
        let mut cb = CircuitBreaker::new(1000);
        // Force open
        for _ in 0..6 {
            cb.check_state(1500);
        }
        assert_eq!(cb.state, CircuitState::Open);

        // Good latency transitions to HalfOpen
        let state = cb.check_state(500);
        assert_eq!(state, CircuitState::HalfOpen);
    }

    #[test]
    fn test_circuit_breaker_full_lifecycle() {
        let mut cb = CircuitBreaker::new(1000);

        // Closed (initial)
        assert_eq!(cb.state, CircuitState::Closed);

        // Closed → Open (6 failures)
        for _ in 0..6 {
            cb.check_state(1500);
        }
        assert_eq!(cb.state, CircuitState::Open);

        // Open → HalfOpen (success)
        cb.check_state(500);
        assert_eq!(cb.state, CircuitState::HalfOpen);

        // HalfOpen → Closed (continued success)
        cb.check_state(500);
        assert_eq!(cb.state, CircuitState::Closed);
        assert_eq!(cb.failure_count, 0);
    }

    #[test]
    fn test_circuit_breaker_resets_failure_count_on_success() {
        let mut cb = CircuitBreaker::new(1000);
        cb.check_state(1500); // +1 failure
        cb.check_state(1500); // +2 failures
        assert_eq!(cb.failure_count, 2);

        cb.check_state(500); // success resets
        assert_eq!(cb.failure_count, 0);
    }

    // ── RiskProfile ─────────────────────────────────────────────────────

    #[test]
    fn test_agent_count_low_risk() {
        let risk = RiskProfile {
            category: RiskCategory::Performance,
            severity: RiskSeverity::Low,
            complexity: 5,
        };
        assert_eq!(risk.calculate_agent_count(), 1);
    }

    #[test]
    fn test_agent_count_medium_risk() {
        let risk = RiskProfile {
            category: RiskCategory::Performance,
            severity: RiskSeverity::Medium,
            complexity: 5,
        };
        assert_eq!(risk.calculate_agent_count(), 3);
    }

    #[test]
    fn test_agent_count_high_risk() {
        let risk = RiskProfile {
            category: RiskCategory::Compliance,
            severity: RiskSeverity::High,
            complexity: 5,
        };
        assert_eq!(risk.calculate_agent_count(), 6);
    }

    #[test]
    fn test_agent_count_critical_risk() {
        let risk = RiskProfile {
            category: RiskCategory::Security,
            severity: RiskSeverity::Critical,
            complexity: 10,
        };
        assert_eq!(risk.calculate_agent_count(), 20);
    }

    #[test]
    fn test_agent_count_complexity_caps_at_2x_multiplier() {
        let risk = RiskProfile {
            category: RiskCategory::Security,
            severity: RiskSeverity::Medium,
            complexity: 10, // 10/5 = 2.0 (max)
        };
        assert_eq!(risk.calculate_agent_count(), 6); // 3 * 2.0
    }

    #[test]
    fn test_agent_count_low_complexity() {
        let risk = RiskProfile {
            category: RiskCategory::BusinessCritical,
            severity: RiskSeverity::Critical,
            complexity: 1,
        };
        // 10 * min(1/5, 2) = 10 * 0.2 = 2
        assert_eq!(risk.calculate_agent_count(), 2);
    }

    // ── Topology selection ─────────────────────────────────────────────

    #[test]
    fn test_topology_ring_low_complexity() {
        let risk = RiskProfile {
            category: RiskCategory::Performance,
            severity: RiskSeverity::Low,
            complexity: 2,
        };
        assert!(matches!(risk.select_topology(), SwarmTopology::Ring));
    }

    #[test]
    fn test_topology_mesh_medium_complexity() {
        let risk = RiskProfile {
            category: RiskCategory::Performance,
            severity: RiskSeverity::Medium,
            complexity: 5,
        };
        assert!(matches!(risk.select_topology(), SwarmTopology::Mesh));
    }

    #[test]
    fn test_topology_hierarchical_high_complexity() {
        let risk = RiskProfile {
            category: RiskCategory::Compliance,
            severity: RiskSeverity::High,
            complexity: 8,
        };
        assert!(matches!(risk.select_topology(), SwarmTopology::Hierarchical));
    }

    // ── SwarmConfig generation ─────────────────────────────────────────

    #[test]
    fn test_generate_swarm_config_critical() {
        let risk = RiskProfile {
            category: RiskCategory::Security,
            severity: RiskSeverity::Critical,
            complexity: 10,
        };
        let config = risk.generate_swarm_config();
        assert_eq!(config.agent_count, 20);
        assert!(matches!(config.topology, SwarmTopology::Hierarchical));
        assert_eq!(config.max_concurrent, 10); // capped at 10
        assert_eq!(config.timeout_ms, 30000 * 3); // 10/3 = 3
    }

    #[test]
    fn test_generate_swarm_config_low() {
        let risk = RiskProfile {
            category: RiskCategory::Performance,
            severity: RiskSeverity::Low,
            complexity: 2,
        };
        let config = risk.generate_swarm_config();
        assert!(config.agent_count <= 10);
        assert!(matches!(config.topology, SwarmTopology::Ring));
        assert!(config.max_concurrent <= config.agent_count);
        assert!(config.timeout_ms >= 30000);
    }

    #[test]
    fn test_swarm_config_max_concurrent_capped() {
        let risk = RiskProfile {
            category: RiskCategory::Security,
            severity: RiskSeverity::Critical,
            complexity: 10,
        };
        let config = risk.generate_swarm_config();
        assert!(config.max_concurrent <= 10);
    }

    // ── Serialization ───────────────────────────────────────────────────

    #[test]
    fn test_circuit_breaker_serialization_roundtrip() {
        let cb = CircuitBreaker::new(500);
        let json = serde_json::to_string(&cb).unwrap();
        let deserialized: CircuitBreaker = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.threshold_ms, 500);
        assert_eq!(deserialized.state, CircuitState::Closed);
    }

    #[test]
    fn test_risk_profile_serialization_roundtrip() {
        let risk = RiskProfile {
            category: RiskCategory::BusinessCritical,
            severity: RiskSeverity::High,
            complexity: 7,
        };
        let json = serde_json::to_string(&risk).unwrap();
        let deserialized: RiskProfile = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.complexity, 7);
    }
}
