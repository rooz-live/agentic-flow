// WSJF Module with Anti-Pattern Detection
// =========================================
// Implements robust WSJF calculation with 6 anti-pattern mitigations
// DoR: Tests written (red state), anti-patterns documented
// DoD: All tests passing (green state), audit trail enforced
//
// @business-context WSJF-CORE: Rust implementation of WSJF calculator mirrors
//   Python src/wsjf/calculator.py. Used for CLI TUI and NAPI-RS FFI bindings.
//   All 6 anti-patterns enforced: bounded inputs, justification for extremes,
//   override audit trail, job-size gaming, staleness, clustering.
// @adr ADR-018: WSJF Anti-Pattern Framework — chose deterministic formula over
//   ML-based prioritization to maintain auditability and examiner defensibility.
// @constraint DDD-WSJF: No IO in this module. Persistence handled by caller.
//   All datetime operations use chrono::Utc (no local time).
// @planned-change R003: time_decay will integrate with ROAM risk multiplier
//   once domain::dispute exposes SystemicScore via a shared kernel.

use chrono::{DateTime, Utc, Duration};
use serde::{Serialize, Deserialize};

/// WSJF Score with anti-pattern protection
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WsjfScore {
    pub user_business_value: f64,  // 1-10
    pub time_criticality: f64,     // 1-10
    pub risk_reduction: f64,       // 1-10
    pub job_size: f64,             // ≥1.0
    pub justification: Option<String>,
    pub override_: Option<WsjfOverride>,
    pub created_at: DateTime<Utc>,
    pub deadline: Option<DateTime<Utc>>,
}

impl WsjfScore {
    pub fn new(ubv: f64, tc: f64, rr: f64, job_size: f64) -> Self {
        Self {
            user_business_value: ubv,
            time_criticality: tc,
            risk_reduction: rr,
            job_size,
            justification: None,
            override_: None,
            created_at: Utc::now(),
            deadline: None,
        }
    }
    
    pub fn set_justification(&mut self, justification: &str) {
        self.justification = Some(justification.to_string());
    }
    
    pub fn set_override(&mut self, override_: WsjfOverride) {
        self.override_ = Some(override_);
    }
    
    pub fn set_created_at(&mut self, created_at: DateTime<Utc>) {
        self.created_at = created_at;
    }
    
    pub fn set_deadline(&mut self, deadline: DateTime<Utc>) {
        self.deadline = Some(deadline);
    }
    
    pub fn calculate(&self) -> f64 {
        let cod = self.user_business_value + self.time_criticality + self.risk_reduction;
        cod / self.job_size
    }
    
    pub fn is_stale(&self) -> bool {
        let age = Utc::now() - self.created_at;
        age > Duration::hours(96) // 4 days
    }
}

/// Override audit trail (HiPPO protection)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WsjfOverride {
    pub who: String,
    pub why: String,
    pub when: DateTime<Utc>,
}

impl WsjfOverride {
    pub fn new(who: &str, why: &str, when: &DateTime<Utc>) -> Self {
        Self {
            who: who.to_string(),
            why: why.to_string(),
            when: *when,
        }
    }
}

/// Validation error types
#[derive(Debug, Clone)]
pub enum ValidationError {
    OutOfRange(String, f64),
    JustificationRequired(String),
    IncompleteOverride,
    InvalidJobSize(String),
    StaleScore(DateTime<Utc>),
    MultipleViolations(Vec<String>),
}

/// Clustering detection result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClusteringResult {
    pub is_clustered: bool,
    pub spread_percent: f64,
}

/// WSJF Validator with anti-pattern detection
#[derive(Serialize, Deserialize)]
pub struct WsjfValidator {
    stale_threshold_hours: i64,
}

impl WsjfValidator {
    pub fn new() -> Self {
        Self {
            stale_threshold_hours: 96, // 4 days
        }
    }
    
    pub fn validate(&self, score: &WsjfScore) -> Result<(), ValidationError> {
        let mut errors = Vec::new();
        
        // Anti-pattern 1: Subjective manipulation (out of range)
        if score.user_business_value < 1.0 || score.user_business_value > 10.0 {
            errors.push(format!("user_business_value out of range: {}", score.user_business_value));
        }
        if score.time_criticality < 1.0 || score.time_criticality > 10.0 {
            errors.push(format!("time_criticality out of range: {}", score.time_criticality));
        }
        if score.risk_reduction < 1.0 || score.risk_reduction > 10.0 {
            errors.push(format!("risk_reduction out of range: {}", score.risk_reduction));
        }
        
        // Anti-pattern 2: Estimation bias (extreme values without justification)
        if (score.user_business_value == 1.0 || score.user_business_value == 10.0) && score.justification.is_none() {
            errors.push("Extreme user_business_value requires justification".to_string());
        }
        
        // Anti-pattern 3: HiPPO effect (incomplete override)
        if let Some(override_) = &score.override_ {
            if override_.who.is_empty() || override_.why.is_empty() {
                errors.push("Override requires complete audit trail (who/why)".to_string());
            }
        }
        
        // Anti-pattern 4: Gaming via job size
        if score.job_size < 1.0 {
            errors.push(format!("Job size must be ≥1.0, got {}", score.job_size));
        }
        
        // Anti-pattern 5: Stale scores
        if score.is_stale() {
            errors.push(format!("Score is stale (created {})", score.created_at));
        }
        
        if errors.is_empty() {
            Ok(())
        } else if errors.len() == 1 {
            Err(ValidationError::MultipleViolations(errors))
        } else {
            Err(ValidationError::MultipleViolations(errors))
        }
    }
    
    pub fn apply_time_decay(&self, score: &WsjfScore) -> WsjfScore {
        let mut decayed = score.clone();
        
        if let Some(deadline) = score.deadline {
            // Use fractional weeks (via days) to avoid num_weeks() truncation
            let days_remaining = (deadline - Utc::now()).num_days() as f64;
            let weeks_remaining = days_remaining / 7.0;
            
            // Increase time criticality as deadline approaches
            if weeks_remaining <= 1.0 {
                decayed.time_criticality = 10.0;
            } else if weeks_remaining <= 2.0 {
                decayed.time_criticality = 9.0;
            } else if weeks_remaining <= 4.0 {
                decayed.time_criticality = 7.0;
            } else {
                // Decay: farther deadline = lower criticality
                decayed.time_criticality = (10.0 - (weeks_remaining / 4.0)).max(1.0);
            }
        }
        
        decayed
    }
    
    pub fn detect_clustering(&self, scores: &[WsjfScore]) -> ClusteringResult {
        if scores.len() < 3 {
            return ClusteringResult {
                is_clustered: false,
                spread_percent: 0.0,
            };
        }
        
        // Calculate WSJF for top 3
        let mut wsjf_values: Vec<f64> = scores.iter()
            .map(|s| s.calculate())
            .collect();
        wsjf_values.sort_by(|a, b| b.partial_cmp(a).unwrap());
        
        let top3 = &wsjf_values[0..3];
        let max = top3[0];
        let min = top3[2];
        
        let spread_percent = ((max - min) / max) * 100.0;
        
        ClusteringResult {
            is_clustered: spread_percent < 10.0,
            spread_percent,
        }
    }
}

impl Default for WsjfValidator {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Duration;

    // ── WsjfScore construction ──────────────────────────────────────────

    #[test]
    fn wsjf_score_new_sets_defaults() {
        let s = WsjfScore::new(5.0, 3.0, 2.0, 4.0);
        assert_eq!(s.user_business_value, 5.0);
        assert_eq!(s.time_criticality, 3.0);
        assert_eq!(s.risk_reduction, 2.0);
        assert_eq!(s.job_size, 4.0);
        assert!(s.justification.is_none());
        assert!(s.override_.is_none());
        assert!(s.deadline.is_none());
    }

    #[test]
    fn wsjf_score_setters() {
        let mut s = WsjfScore::new(1.0, 1.0, 1.0, 1.0);
        s.set_justification("Critical path item");
        assert_eq!(s.justification.as_deref(), Some("Critical path item"));

        let deadline = Utc::now() + Duration::days(7);
        s.set_deadline(deadline);
        assert_eq!(s.deadline, Some(deadline));
    }

    // ── calculate() ─────────────────────────────────────────────────────

    #[test]
    fn wsjf_calculate_basic() {
        let s = WsjfScore::new(5.0, 3.0, 2.0, 2.0);
        // CoD = 5+3+2 = 10, WSJF = 10/2 = 5.0
        assert_eq!(s.calculate(), 5.0);
    }

    #[test]
    fn wsjf_calculate_high_priority() {
        let s = WsjfScore::new(10.0, 10.0, 10.0, 1.0);
        // CoD = 30, WSJF = 30/1 = 30.0
        assert_eq!(s.calculate(), 30.0);
    }

    #[test]
    fn wsjf_calculate_low_priority() {
        let s = WsjfScore::new(1.0, 1.0, 1.0, 10.0);
        // CoD = 3, WSJF = 3/10 = 0.3
        assert!((s.calculate() - 0.3).abs() < f64::EPSILON);
    }

    // ── is_stale() ──────────────────────────────────────────────────────

    #[test]
    fn wsjf_not_stale_when_fresh() {
        let s = WsjfScore::new(5.0, 5.0, 5.0, 2.0);
        assert!(!s.is_stale());
    }

    #[test]
    fn wsjf_stale_after_96_hours() {
        let mut s = WsjfScore::new(5.0, 5.0, 5.0, 2.0);
        s.set_created_at(Utc::now() - Duration::hours(97));
        assert!(s.is_stale());
    }

    #[test]
    fn wsjf_not_stale_at_exactly_96_hours() {
        let mut s = WsjfScore::new(5.0, 5.0, 5.0, 2.0);
        s.set_created_at(Utc::now() - Duration::hours(96));
        // Duration::hours(96) == Duration::hours(96), so not > 96h
        assert!(!s.is_stale());
    }

    // ── WsjfOverride ────────────────────────────────────────────────────

    #[test]
    fn wsjf_override_construction() {
        let when = Utc::now();
        let o = WsjfOverride::new("PM", "Stakeholder escalation", &when);
        assert_eq!(o.who, "PM");
        assert_eq!(o.why, "Stakeholder escalation");
        assert_eq!(o.when, when);
    }

    #[test]
    fn wsjf_score_with_override() {
        let mut s = WsjfScore::new(3.0, 3.0, 3.0, 2.0);
        let when = Utc::now();
        s.set_override(WsjfOverride::new("CTO", "Security incident", &when));
        assert!(s.override_.is_some());
        assert_eq!(s.override_.as_ref().unwrap().who, "CTO");
    }

    // ── WsjfValidator::validate() ───────────────────────────────────────

    #[test]
    fn validate_accepts_valid_score() {
        let v = WsjfValidator::new();
        let s = WsjfScore::new(5.0, 5.0, 5.0, 3.0);
        assert!(v.validate(&s).is_ok());
    }

    #[test]
    fn validate_rejects_out_of_range_ubv() {
        let v = WsjfValidator::new();
        let s = WsjfScore::new(11.0, 5.0, 5.0, 3.0);
        assert!(v.validate(&s).is_err());
    }

    #[test]
    fn validate_rejects_below_range_tc() {
        let v = WsjfValidator::new();
        let s = WsjfScore::new(5.0, 0.5, 5.0, 3.0);
        assert!(v.validate(&s).is_err());
    }

    #[test]
    fn validate_rejects_out_of_range_rr() {
        let v = WsjfValidator::new();
        let s = WsjfScore::new(5.0, 5.0, 15.0, 3.0);
        assert!(v.validate(&s).is_err());
    }

    #[test]
    fn validate_rejects_extreme_ubv_without_justification() {
        let v = WsjfValidator::new();
        let s = WsjfScore::new(10.0, 5.0, 5.0, 3.0);
        assert!(v.validate(&s).is_err());
    }

    #[test]
    fn validate_accepts_extreme_ubv_with_justification() {
        let v = WsjfValidator::new();
        let mut s = WsjfScore::new(10.0, 5.0, 5.0, 3.0);
        s.set_justification("Trial deadline in 10 days");
        assert!(v.validate(&s).is_ok());
    }

    #[test]
    fn validate_rejects_extreme_min_ubv_without_justification() {
        let v = WsjfValidator::new();
        let s = WsjfScore::new(1.0, 5.0, 5.0, 3.0);
        assert!(v.validate(&s).is_err());
    }

    #[test]
    fn validate_rejects_incomplete_override() {
        let v = WsjfValidator::new();
        let mut s = WsjfScore::new(5.0, 5.0, 5.0, 3.0);
        let when = Utc::now();
        s.set_override(WsjfOverride::new("", "reason", &when));
        assert!(v.validate(&s).is_err());
    }

    #[test]
    fn validate_rejects_job_size_below_one() {
        let v = WsjfValidator::new();
        let s = WsjfScore::new(5.0, 5.0, 5.0, 0.5);
        assert!(v.validate(&s).is_err());
    }

    #[test]
    fn validate_rejects_stale_score() {
        let v = WsjfValidator::new();
        let mut s = WsjfScore::new(5.0, 5.0, 5.0, 3.0);
        s.set_created_at(Utc::now() - Duration::hours(200));
        assert!(v.validate(&s).is_err());
    }

    #[test]
    fn validate_collects_multiple_errors() {
        let v = WsjfValidator::new();
        // Out of range + job size < 1 + stale
        let mut s = WsjfScore::new(15.0, 0.0, 5.0, 0.1);
        s.set_created_at(Utc::now() - Duration::hours(200));
        match v.validate(&s) {
            Err(ValidationError::MultipleViolations(errs)) => {
                assert!(errs.len() >= 3, "Expected 3+ errors, got {}", errs.len());
            }
            other => panic!("Expected MultipleViolations, got {:?}", other),
        }
    }

    // ── apply_time_decay() ──────────────────────────────────────────────

    #[test]
    fn time_decay_within_one_week_sets_tc_10() {
        let v = WsjfValidator::new();
        let mut s = WsjfScore::new(5.0, 3.0, 5.0, 2.0);
        s.set_deadline(Utc::now() + Duration::days(5));
        let decayed = v.apply_time_decay(&s);
        assert_eq!(decayed.time_criticality, 10.0);
    }

    #[test]
    fn time_decay_within_two_weeks_sets_tc_9() {
        let v = WsjfValidator::new();
        let mut s = WsjfScore::new(5.0, 3.0, 5.0, 2.0);
        s.set_deadline(Utc::now() + Duration::days(10));
        let decayed = v.apply_time_decay(&s);
        assert_eq!(decayed.time_criticality, 9.0);
    }

    #[test]
    fn time_decay_within_four_weeks_sets_tc_7() {
        let v = WsjfValidator::new();
        let mut s = WsjfScore::new(5.0, 3.0, 5.0, 2.0);
        s.set_deadline(Utc::now() + Duration::days(21));
        let decayed = v.apply_time_decay(&s);
        assert_eq!(decayed.time_criticality, 7.0);
    }

    #[test]
    fn time_decay_far_deadline_reduces_tc() {
        let v = WsjfValidator::new();
        let mut s = WsjfScore::new(5.0, 8.0, 5.0, 2.0);
        s.set_deadline(Utc::now() + Duration::days(90));
        let decayed = v.apply_time_decay(&s);
        // 90 days / 7 ≈ 12.86 weeks → TC = max(10 - 12.86/4, 1) = max(6.78, 1)
        assert!(decayed.time_criticality >= 1.0);
        assert!(decayed.time_criticality < 8.0);
    }

    #[test]
    fn time_decay_no_deadline_preserves_tc() {
        let v = WsjfValidator::new();
        let s = WsjfScore::new(5.0, 7.0, 5.0, 2.0);
        let decayed = v.apply_time_decay(&s);
        assert_eq!(decayed.time_criticality, 7.0);
    }

    // ── detect_clustering() ─────────────────────────────────────────────

    #[test]
    fn clustering_less_than_3_items_returns_not_clustered() {
        let v = WsjfValidator::new();
        let scores = vec![
            WsjfScore::new(5.0, 5.0, 5.0, 1.0),
            WsjfScore::new(4.0, 4.0, 4.0, 1.0),
        ];
        let result = v.detect_clustering(&scores);
        assert!(!result.is_clustered);
        assert_eq!(result.spread_percent, 0.0);
    }

    #[test]
    fn clustering_detects_identical_scores() {
        let v = WsjfValidator::new();
        let scores = vec![
            WsjfScore::new(5.0, 5.0, 5.0, 1.0),
            WsjfScore::new(5.0, 5.0, 5.0, 1.0),
            WsjfScore::new(5.0, 5.0, 5.0, 1.0),
        ];
        let result = v.detect_clustering(&scores);
        assert!(result.is_clustered);
        assert_eq!(result.spread_percent, 0.0);
    }

    #[test]
    fn clustering_not_detected_with_spread() {
        let v = WsjfValidator::new();
        let scores = vec![
            WsjfScore::new(10.0, 10.0, 10.0, 1.0), // WSJF = 30
            WsjfScore::new(5.0, 5.0, 5.0, 1.0),     // WSJF = 15
            WsjfScore::new(1.0, 1.0, 1.0, 1.0),     // WSJF = 3
        ];
        let result = v.detect_clustering(&scores);
        assert!(!result.is_clustered);
        assert!(result.spread_percent > 10.0);
    }

    // ── WsjfValidator::default() ────────────────────────────────────────

    #[test]
    fn validator_default_threshold_96h() {
        let v = WsjfValidator::default();
        assert_eq!(v.stale_threshold_hours, 96);
    }

    // ── Serialization roundtrip ─────────────────────────────────────────

    #[test]
    fn wsjf_score_serialization_roundtrip() {
        let mut s = WsjfScore::new(7.0, 8.0, 3.0, 2.0);
        s.set_justification("High urgency");
        let json = serde_json::to_string(&s).unwrap();
        let deserialized: WsjfScore = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.user_business_value, 7.0);
        assert_eq!(deserialized.justification.as_deref(), Some("High urgency"));
    }

    #[test]
    fn clustering_result_serialization_roundtrip() {
        let cr = ClusteringResult {
            is_clustered: true,
            spread_percent: 5.2,
        };
        let json = serde_json::to_string(&cr).unwrap();
        let deserialized: ClusteringResult = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.is_clustered, true);
        assert!((deserialized.spread_percent - 5.2).abs() < f64::EPSILON);
    }
}

