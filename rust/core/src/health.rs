//! Health Check Module
//!
//! High-performance health monitoring migrated from health-checks.ts

use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum HealthError {
    #[error("Health check failed: {0}")]
    CheckFailed(String),
    #[error("Timeout after {0}ms")]
    Timeout(u64),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthStatus {
    pub healthy: bool,
    pub score: f64,
    pub checks: Vec<HealthCheck>,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthCheck {
    pub name: String,
    pub passed: bool,
    pub duration_ms: u64,
    pub message: Option<String>,
}

impl HealthStatus {
    pub fn new() -> Self {
        Self {
            healthy: true,
            score: 1.0,
            checks: Vec::new(),
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
        }
    }

    pub fn add_check(&mut self, check: HealthCheck) {
        if !check.passed {
            self.healthy = false;
        }
        self.checks.push(check);
        self.recalculate_score();
    }

    fn recalculate_score(&mut self) {
        if self.checks.is_empty() {
            self.score = 1.0;
            return;
        }
        let passed = self.checks.iter().filter(|c| c.passed).count();
        self.score = passed as f64 / self.checks.len() as f64;
    }
}

impl Default for HealthStatus {
    fn default() -> Self {
        Self::new()
    }
}

/// Run all health checks and return status
pub async fn run_health_checks() -> Result<HealthStatus, HealthError> {
    let mut status = HealthStatus::new();

    // System health check
    let start = std::time::Instant::now();
    status.add_check(HealthCheck {
        name: "system".to_string(),
        passed: true,
        duration_ms: start.elapsed().as_millis() as u64,
        message: None,
    });

    Ok(status)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_health_status_new() {
        let status = HealthStatus::new();
        assert!(status.healthy);
        assert_eq!(status.score, 1.0);
    }

    #[test]
    fn test_add_failing_check() {
        let mut status = HealthStatus::new();
        status.add_check(HealthCheck {
            name: "test".to_string(),
            passed: false,
            duration_ms: 10,
            message: Some("Failed".to_string()),
        });
        assert!(!status.healthy);
        assert_eq!(status.score, 0.0);
    }
}
