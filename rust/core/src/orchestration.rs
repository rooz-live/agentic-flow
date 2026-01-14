//! Orchestration Module
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

    #[test]
    fn test_learned_threshold() {
        let mut cb = CircuitBreaker::new(1000);
        cb.update_threshold(200);
        assert_eq!(cb.threshold_ms, 300);
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
    fn test_topology_selection() {
        let risk = RiskProfile {
            category: RiskCategory::Compliance,
            severity: RiskSeverity::High,
            complexity: 8,
        };
        assert!(matches!(risk.select_topology(), SwarmTopology::Hierarchical));
    }
}
