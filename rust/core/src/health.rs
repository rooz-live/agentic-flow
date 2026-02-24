//! Health Check Module
//!
//! DoR: Health check interfaces defined; all check types enumerated
//! DoD: Health status aggregation tested; score calculation validated
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
        assert!(status.checks.is_empty());
        assert!(status.timestamp > 0);
    }

    #[test]
    fn test_health_status_default_matches_new() {
        let status = HealthStatus::default();
        assert!(status.healthy);
        assert_eq!(status.score, 1.0);
    }

    #[test]
    fn test_add_passing_check() {
        let mut status = HealthStatus::new();
        status.add_check(HealthCheck {
            name: "db".to_string(),
            passed: true,
            duration_ms: 5,
            message: None,
        });
        assert!(status.healthy);
        assert_eq!(status.score, 1.0);
        assert_eq!(status.checks.len(), 1);
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

    #[test]
    fn test_mixed_checks_score_calculation() {
        let mut status = HealthStatus::new();
        status.add_check(HealthCheck {
            name: "db".to_string(),
            passed: true,
            duration_ms: 5,
            message: None,
        });
        status.add_check(HealthCheck {
            name: "cache".to_string(),
            passed: true,
            duration_ms: 3,
            message: None,
        });
        status.add_check(HealthCheck {
            name: "api".to_string(),
            passed: false,
            duration_ms: 100,
            message: Some("Timeout".to_string()),
        });
        // 2 passed / 3 total = 0.666...
        assert!(!status.healthy);
        assert!((status.score - 2.0 / 3.0).abs() < 0.001);
        assert_eq!(status.checks.len(), 3);
    }

    #[test]
    fn test_all_checks_passing_score_is_one() {
        let mut status = HealthStatus::new();
        for name in ["db", "cache", "api", "disk"] {
            status.add_check(HealthCheck {
                name: name.to_string(),
                passed: true,
                duration_ms: 1,
                message: None,
            });
        }
        assert!(status.healthy);
        assert_eq!(status.score, 1.0);
        assert_eq!(status.checks.len(), 4);
    }

    #[test]
    fn test_all_checks_failing_score_is_zero() {
        let mut status = HealthStatus::new();
        for name in ["db", "cache"] {
            status.add_check(HealthCheck {
                name: name.to_string(),
                passed: false,
                duration_ms: 50,
                message: Some("Down".to_string()),
            });
        }
        assert!(!status.healthy);
        assert_eq!(status.score, 0.0);
    }

    #[test]
    fn test_health_once_unhealthy_stays_unhealthy() {
        let mut status = HealthStatus::new();
        status.add_check(HealthCheck {
            name: "bad".to_string(),
            passed: false,
            duration_ms: 1,
            message: None,
        });
        // Adding a passing check doesn't restore healthy flag
        status.add_check(HealthCheck {
            name: "good".to_string(),
            passed: true,
            duration_ms: 1,
            message: None,
        });
        assert!(!status.healthy);
        // But score reflects ratio
        assert_eq!(status.score, 0.5);
    }

    #[test]
    fn test_health_check_serialization_roundtrip() {
        let status = HealthStatus::new();
        let json = serde_json::to_string(&status).unwrap();
        let deserialized: HealthStatus = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.healthy, status.healthy);
        assert_eq!(deserialized.score, status.score);
        assert_eq!(deserialized.timestamp, status.timestamp);
    }

    #[test]
    fn test_health_error_display() {
        let err = HealthError::CheckFailed("db connection".to_string());
        assert_eq!(format!("{}", err), "Health check failed: db connection");

        let timeout = HealthError::Timeout(5000);
        assert_eq!(format!("{}", timeout), "Timeout after 5000ms");
    }
}
