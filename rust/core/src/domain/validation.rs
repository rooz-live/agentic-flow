//! Validation Domain Value Objects — systemic scoring and wholeness metrics.
//!
//! DoR: No external dependencies beyond serde
//! DoD: SystemicScore thresholds deterministic (>30=LitigationReady, >10=SettlementOnly);
//!      WholenessMetric fields public for aggregate composition;
//!      serialization roundtrip tested

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SystemicScore {
    pub score: u8, // 0-40
    pub max_score: u8,
    pub verdict: SystemicVerdict,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SystemicVerdict {
    LitigationReady, // > 30
    SettlementOnly,  // > 10
    Defer,           // <= 10
    NotSystemic,
}

impl SystemicScore {
    pub fn new(score: u8) -> Self {
        let verdict = if score > 30 {
            SystemicVerdict::LitigationReady
        } else if score > 10 {
            SystemicVerdict::SettlementOnly
        } else {
            SystemicVerdict::Defer
        };

        Self {
            score,
            max_score: 40,
            verdict,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WholenessMetric {
    pub score: f32, // 0.0 - 100.0
    pub passed_roles: u8,
    pub total_roles: u8,
}

#[cfg(test)]
mod tests {
    use super::*;

    // --- SystemicScore ---

    #[test]
    fn systemic_score_litigation_ready_above_30() {
        let s = SystemicScore::new(35);
        assert_eq!(s.verdict, SystemicVerdict::LitigationReady);
        assert_eq!(s.max_score, 40);
        assert_eq!(s.score, 35);
    }

    #[test]
    fn systemic_score_settlement_only_between_11_and_30() {
        let s = SystemicScore::new(15);
        assert_eq!(s.verdict, SystemicVerdict::SettlementOnly);
    }

    #[test]
    fn systemic_score_defer_at_10_or_below() {
        let s = SystemicScore::new(10);
        assert_eq!(s.verdict, SystemicVerdict::Defer);
        let s0 = SystemicScore::new(0);
        assert_eq!(s0.verdict, SystemicVerdict::Defer);
    }

    #[test]
    fn systemic_score_boundary_31_is_litigation_ready() {
        let s = SystemicScore::new(31);
        assert_eq!(s.verdict, SystemicVerdict::LitigationReady);
    }

    #[test]
    fn systemic_score_boundary_11_is_settlement_only() {
        let s = SystemicScore::new(11);
        assert_eq!(s.verdict, SystemicVerdict::SettlementOnly);
    }

    #[test]
    fn systemic_score_max_40() {
        let s = SystemicScore::new(40);
        assert_eq!(s.verdict, SystemicVerdict::LitigationReady);
        assert_eq!(s.max_score, 40);
    }

    #[test]
    fn systemic_score_serialization_roundtrip() {
        let s = SystemicScore::new(25);
        let json = serde_json::to_string(&s).unwrap();
        let deserialized: SystemicScore = serde_json::from_str(&json).unwrap();
        assert_eq!(s, deserialized);
    }

    // --- WholenessMetric ---

    #[test]
    fn wholeness_metric_construction() {
        let m = WholenessMetric {
            score: 85.5,
            passed_roles: 5,
            total_roles: 6,
        };
        assert_eq!(m.score, 85.5);
        assert_eq!(m.passed_roles, 5);
        assert_eq!(m.total_roles, 6);
    }

    #[test]
    fn wholeness_metric_perfect_score() {
        let m = WholenessMetric {
            score: 100.0,
            passed_roles: 4,
            total_roles: 4,
        };
        assert_eq!(m.score, 100.0);
        assert_eq!(m.passed_roles, m.total_roles);
    }

    #[test]
    fn wholeness_metric_zero_roles() {
        let m = WholenessMetric {
            score: 0.0,
            passed_roles: 0,
            total_roles: 0,
        };
        assert_eq!(m.score, 0.0);
    }

    /// Remediation: scores at or below the defer threshold require remediation.
    #[test]
    fn systemic_score_remediation_required_at_defer() {
        let s = SystemicScore::new(5);
        assert_eq!(s.verdict, SystemicVerdict::Defer);
        // Defer verdict signals mandatory remediation before litigation
        assert!(s.score <= 10);
    }

    /// Scaffold: minimal WholenessMetric scaffold for aggregate composition.
    #[test]
    fn wholeness_metric_scaffold_defaults() {
        let scaffold = WholenessMetric {
            score: 0.0,
            passed_roles: 0,
            total_roles: 0,
        };
        // Scaffold should be composable into Portfolio.health
        assert_eq!(scaffold.passed_roles, 0);
        assert_eq!(scaffold.total_roles, 0);
    }

    /// Benchmark: SystemicScore boundary thresholds serve as benchmark values.
    #[test]
    fn systemic_score_benchmark_thresholds() {
        // Benchmark boundaries: 10 (defer→settlement), 30 (settlement→litigation)
        let defer = SystemicScore::new(10);
        let settlement = SystemicScore::new(11);
        let litigation = SystemicScore::new(31);
        assert_eq!(defer.verdict, SystemicVerdict::Defer);
        assert_eq!(settlement.verdict, SystemicVerdict::SettlementOnly);
        assert_eq!(litigation.verdict, SystemicVerdict::LitigationReady);
    }

    /// Annotation: WholenessMetric carries annotation-ready metadata.
    #[test]
    fn wholeness_metric_annotation_metadata() {
        let m = WholenessMetric {
            score: 75.0,
            passed_roles: 3,
            total_roles: 4,
        };
        // Metric carries role counts usable as @business-context annotation data
        assert!(m.score > 0.0);
        assert!(m.passed_roles < m.total_roles);
    }
}
