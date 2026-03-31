// TDD Tests for WSJF Anti-Pattern Detection (Write FIRST - Red State)
// =====================================================================
// DoR: WSJF anti-patterns documented, validation rules defined
// DoD: All 6 anti-patterns detected, justification enforced, audit trail complete

#[cfg(test)]
mod wsjf_anti_pattern_tests {
    use rust_core::wsjf::{WsjfScore, WsjfValidator, WsjfOverride};
    use chrono::{Utc, Duration};

    // ========================================
    // Anti-Pattern 1: Subjective Manipulation
    // ========================================
    #[test]
    fn test_out_of_range_values_rejected() {
        let validator = WsjfValidator::new();
        
        // Value < 1.0 rejected
        let score = WsjfScore::new(0.5, 5.0, 3.0, 10.0);
        assert!(validator.validate(&score).is_err());
        
        // Value > 10.0 rejected
        let score = WsjfScore::new(11.0, 5.0, 3.0, 10.0);
        assert!(validator.validate(&score).is_err());
        
        // Valid range [1.0, 10.0] accepted
        let score = WsjfScore::new(5.0, 5.0, 3.0, 10.0);
        assert!(validator.validate(&score).is_ok());
    }

    // ========================================
    // Anti-Pattern 2: Estimation Bias (Anchoring)
    // ========================================
    #[test]
    fn test_extreme_values_require_justification() {
        let validator = WsjfValidator::new();
        
        // Extreme value (1.0) without justification rejected
        let score = WsjfScore::new(1.0, 5.0, 3.0, 10.0);
        assert!(validator.validate(&score).is_err());
        
        // Extreme value (10.0) without justification rejected
        let score = WsjfScore::new(10.0, 5.0, 3.0, 10.0);
        assert!(validator.validate(&score).is_err());
        
        // Extreme value with justification accepted
        let mut score = WsjfScore::new(10.0, 5.0, 3.0, 10.0);
        score.set_justification("Critical security vulnerability affecting all users");
        assert!(validator.validate(&score).is_ok());
    }

    // ========================================
    // Anti-Pattern 3: HiPPO Effect (Override Audit Trail)
    // ========================================
    #[test]
    fn test_override_requires_audit_trail() {
        let validator = WsjfValidator::new();
        
        // Override without who/when/why rejected
        let mut score = WsjfScore::new(5.0, 5.0, 3.0, 10.0);
        score.set_override(WsjfOverride::new("", "", &Utc::now()));
        assert!(validator.validate(&score).is_err());
        
        // Override with complete audit trail accepted
        let mut score = WsjfScore::new(5.0, 5.0, 3.0, 10.0);
        score.set_override(WsjfOverride::new(
            "john.doe@example.com",
            "CEO directive: prioritize for Q1 launch",
            &Utc::now()
        ));
        assert!(validator.validate(&score).is_ok());
    }

    // ========================================
    // Anti-Pattern 4: Gaming via Job Size
    // ========================================
    #[test]
    fn test_job_size_floor_enforced() {
        let validator = WsjfValidator::new();
        
        // Job size < 1.0 rejected (prevents gaming)
        let score = WsjfScore::new(5.0, 5.0, 3.0, 0.5);
        assert!(validator.validate(&score).is_err());
        
        // Job size = 1.0 accepted (minimum)
        let score = WsjfScore::new(5.0, 5.0, 3.0, 1.0);
        assert!(validator.validate(&score).is_ok());
        
        // Job size > 1.0 accepted
        let score = WsjfScore::new(5.0, 5.0, 3.0, 10.0);
        assert!(validator.validate(&score).is_ok());
    }

    // ========================================
    // Anti-Pattern 5: Recency Bias / Stale Scores
    // ========================================
    #[test]
    fn test_stale_scores_rejected() {
        let validator = WsjfValidator::new();
        
        // Score created 5 days ago (stale)
        let mut score = WsjfScore::new(5.0, 5.0, 3.0, 10.0);
        score.set_created_at(Utc::now() - Duration::days(5));
        assert!(validator.validate(&score).is_err());
        
        // Score created 3 days ago (fresh)
        let mut score = WsjfScore::new(5.0, 5.0, 3.0, 10.0);
        score.set_created_at(Utc::now() - Duration::days(3));
        assert!(validator.validate(&score).is_ok());
    }

    #[test]
    fn test_time_decay_for_approaching_deadlines() {
        let validator = WsjfValidator::new();

        // Deadline in 1 week (high time criticality = 10.0)
        let mut score = WsjfScore::new(5.0, 5.0, 3.0, 10.0);
        score.set_deadline(Utc::now() + Duration::weeks(1));
        let decayed = validator.apply_time_decay(&score);
        assert_eq!(decayed.time_criticality, 10.0); // Max urgency

        // Deadline in 16 weeks (low time criticality, decayed)
        // Use 16 weeks (not 12) to avoid boundary flakiness from Utc::now() drift
        let mut score = WsjfScore::new(5.0, 5.0, 3.0, 10.0);
        score.set_deadline(Utc::now() + Duration::weeks(16));
        let decayed = validator.apply_time_decay(&score);
        assert!(decayed.time_criticality <= 7.0); // Decayed from original
    }

    // ========================================
    // Anti-Pattern 6: Score Clustering
    // ========================================
    #[test]
    fn test_score_clustering_detected() {
        let validator = WsjfValidator::new();
        
        // Top 3 scores with <10% spread (clustering)
        let scores = vec![
            WsjfScore::new(5.0, 5.0, 3.0, 10.0), // WSJF = 1.3
            WsjfScore::new(5.1, 5.0, 3.0, 10.0), // WSJF = 1.31
            WsjfScore::new(5.2, 5.0, 3.0, 10.0), // WSJF = 1.32
        ];
        
        let result = validator.detect_clustering(&scores);
        assert!(result.is_clustered);
        assert!(result.spread_percent < 10.0);
        
        // Top 3 scores with >10% spread (no clustering)
        let scores = vec![
            WsjfScore::new(10.0, 5.0, 3.0, 10.0), // WSJF = 1.8
            WsjfScore::new(5.0, 5.0, 3.0, 10.0),  // WSJF = 1.3
            WsjfScore::new(3.0, 5.0, 3.0, 10.0),  // WSJF = 1.1
        ];
        
        let result = validator.detect_clustering(&scores);
        assert!(!result.is_clustered);
        assert!(result.spread_percent > 10.0);
    }

    // ========================================
    // Integration Test: All Anti-Patterns
    // ========================================
    #[test]
    fn test_comprehensive_validation() {
        let validator = WsjfValidator::new();
        
        // Valid score passes all checks
        let mut score = WsjfScore::new(5.0, 5.0, 3.0, 10.0);
        score.set_justification("Well-reasoned estimate");
        score.set_created_at(Utc::now());
        score.set_deadline(Utc::now() + Duration::weeks(4));
        
        assert!(validator.validate(&score).is_ok());
        
        // Invalid score fails multiple checks
        let mut score = WsjfScore::new(10.0, 5.0, 3.0, 0.5); // Extreme value + low job size
        score.set_created_at(Utc::now() - Duration::days(5)); // Stale
        
        let result = validator.validate(&score);
        assert!(result.is_err());

        // Multiple violations detected
        match result.unwrap_err() {
            rust_core::wsjf::ValidationError::MultipleViolations(errors) => {
                assert!(errors.len() >= 3);
            },
            _ => panic!("Expected MultipleViolations error"),
        }
    }
}

