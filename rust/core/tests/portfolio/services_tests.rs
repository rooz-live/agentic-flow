//! TDD Tests for Portfolio Domain Services
//!
//! Test Coverage: WsjfCalculator, WsjfItem aggregate root, anti-pattern detection
//!
//! DoR: WsjfCalculator, WsjfItem, AggregateRoot trait implemented in services.rs
//! DoD: All service methods tested with assertions, edge cases covered

use rust_core::domain::aggregate_root::AggregateRoot;
use rust_core::portfolio::services::*;
use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use std::str::FromStr;

#[cfg(test)]
mod wsjf_calculator_tests {
    use super::*;

    fn calc() -> WsjfCalculator {
        WsjfCalculator::new()
    }

    // ========================================
    // WsjfCalculator::calculate
    // ========================================

    #[test]
    fn test_calculate_valid_inputs() {
        let c = calc();
        let item = c
            .calculate("task-1", "Fix bug", dec!(5), dec!(5), dec!(5), dec!(3), Some("balanced"))
            .unwrap();

        assert_eq!(item.id, "task-1");
        assert_eq!(item.description, "Fix bug");
        assert_eq!(item.business_value, dec!(5));
        assert_eq!(item.time_criticality, dec!(5));
        assert_eq!(item.risk_reduction, dec!(5));
        assert_eq!(item.job_size, dec!(3));
        // WSJF = (5+5+5)/3 = 5.0
        assert_eq!(item.wsjf_score, dec!(5.0));
        assert!(item.justification.is_some());
    }

    #[test]
    fn test_calculate_rejects_out_of_range() {
        let c = calc();

        // business_value = 0 (below min 1)
        let result = c.calculate("t", "d", dec!(0), dec!(5), dec!(5), dec!(5), Some("j"));
        assert!(result.is_err());

        // time_criticality = 11 (above max 10)
        let result = c.calculate("t", "d", dec!(5), dec!(11), dec!(5), dec!(5), Some("j"));
        assert!(result.is_err());
    }

    #[test]
    fn test_calculate_enforces_job_size_floor() {
        let c = calc();
        // job_size = 1 (minimum), extreme value requires justification
        let item = c
            .calculate("t", "d", dec!(5), dec!(5), dec!(5), dec!(1), Some("tiny task"))
            .unwrap();
        assert_eq!(item.job_size, dec!(1));
        // WSJF = (5+5+5)/1 = 15.0
        assert_eq!(item.wsjf_score, dec!(15.0));
    }

    #[test]
    fn test_calculate_extreme_values_require_justification() {
        let c = calc();

        // business_value = 10 without justification → error
        let result = c.calculate("t", "d", dec!(10), dec!(5), dec!(5), dec!(5), None);
        assert!(result.is_err());

        // business_value = 10 with justification → ok
        let result = c.calculate("t", "d", dec!(10), dec!(5), dec!(5), dec!(5), Some("critical security fix"));
        assert!(result.is_ok());
    }

    // ========================================
    // WsjfCalculator::with_time_decay
    // ========================================

    #[test]
    fn test_time_decay_increases_urgency() {
        let c = calc();
        let item = c
            .calculate("t", "d", dec!(5), dec!(5), dec!(5), dec!(5), Some("justified"))
            .unwrap();

        // 50% elapsed → time_criticality increases from 5 toward 10
        let decayed = c.with_time_decay(&item, dec!(0.5)).unwrap();
        assert!(decayed.time_criticality > item.time_criticality);
        // tc' = 5 + (10-5)*0.5 = 7.5
        assert_eq!(decayed.time_criticality, dec!(7.5));
        // Higher tc → higher WSJF
        assert!(decayed.wsjf_score > item.wsjf_score);
    }

    #[test]
    fn test_time_decay_at_zero_no_change() {
        let c = calc();
        let item = c
            .calculate("t", "d", dec!(5), dec!(5), dec!(5), dec!(5), Some("justified"))
            .unwrap();

        let decayed = c.with_time_decay(&item, dec!(0)).unwrap();
        assert_eq!(decayed.time_criticality, item.time_criticality);
        assert_eq!(decayed.wsjf_score, item.wsjf_score);
    }

    #[test]
    fn test_time_decay_at_one_maxes_urgency() {
        let c = calc();
        let item = c
            .calculate("t", "d", dec!(5), dec!(3), dec!(5), dec!(5), Some("justified"))
            .unwrap();

        let decayed = c.with_time_decay(&item, dec!(1)).unwrap();
        assert_eq!(decayed.time_criticality, dec!(10.0));
    }

    #[test]
    fn test_time_decay_rejects_invalid_fraction() {
        let c = calc();
        let item = c
            .calculate("t", "d", dec!(5), dec!(5), dec!(5), dec!(5), Some("justified"))
            .unwrap();

        assert!(c.with_time_decay(&item, dec!(1.5)).is_err());
        assert!(c.with_time_decay(&item, dec!(-0.1)).is_err());
    }

    // ========================================
    // WsjfCalculator::is_stale
    // ========================================

    #[test]
    fn test_fresh_item_not_stale() {
        let c = calc();
        let item = c
            .calculate("t", "d", dec!(5), dec!(5), dec!(5), dec!(5), Some("justified"))
            .unwrap();

        // Just created → not stale
        assert!(!c.is_stale(&item));
    }

    #[test]
    fn test_old_item_is_stale() {
        let c = calc();
        let mut item = c
            .calculate("t", "d", dec!(5), dec!(5), dec!(5), dec!(5), Some("justified"))
            .unwrap();

        // Fake an old timestamp (5 days ago)
        item.scored_at = (chrono::Utc::now() - chrono::Duration::hours(120)).to_rfc3339();
        assert!(c.is_stale(&item));
    }

    #[test]
    fn test_unparseable_timestamp_is_stale() {
        let c = calc();
        let mut item = c
            .calculate("t", "d", dec!(5), dec!(5), dec!(5), dec!(5), Some("justified"))
            .unwrap();

        item.scored_at = "not-a-date".to_string();
        assert!(c.is_stale(&item));
    }

    // ========================================
    // WsjfCalculator::prioritize
    // ========================================

    #[test]
    fn test_prioritize_sorts_descending() {
        let c = calc();

        let mut items = vec![
            c.calculate("low", "low priority", dec!(2), dec!(2), dec!(2), dec!(5), Some("j"))
                .unwrap(),
            c.calculate("high", "high priority", dec!(9), dec!(9), dec!(9), dec!(3), Some("critical"))
                .unwrap(),
            c.calculate("mid", "mid priority", dec!(5), dec!(5), dec!(5), dec!(5), Some("j"))
                .unwrap(),
        ];

        WsjfCalculator::prioritize(&mut items);

        assert_eq!(items[0].id, "high");
        assert_eq!(items[1].id, "mid");
        assert_eq!(items[2].id, "low");
        assert!(items[0].wsjf_score >= items[1].wsjf_score);
        assert!(items[1].wsjf_score >= items[2].wsjf_score);
    }

    // ========================================
    // WsjfCalculator::detect_anti_patterns
    // ========================================

    #[test]
    fn test_detect_identical_scores() {
        let c = calc();
        let items = vec![
            c.calculate("a", "d", dec!(5), dec!(5), dec!(5), dec!(5), Some("j")).unwrap(),
            c.calculate("b", "d", dec!(5), dec!(5), dec!(5), dec!(5), Some("j")).unwrap(),
        ];

        let warnings = WsjfCalculator::detect_anti_patterns(&items);
        assert!(!warnings.is_empty());
        assert!(warnings.iter().any(|w| w.contains("identical")));
    }

    #[test]
    fn test_detect_min_job_size_gaming() {
        let c = calc();
        let items = vec![
            c.calculate("a", "d", dec!(5), dec!(5), dec!(5), dec!(1), Some("j")).unwrap(),
            c.calculate("b", "d", dec!(5), dec!(5), dec!(5), dec!(1), Some("j")).unwrap(),
            c.calculate("c", "d", dec!(5), dec!(5), dec!(5), dec!(1), Some("j")).unwrap(),
        ];

        let warnings = WsjfCalculator::detect_anti_patterns(&items);
        assert!(warnings.iter().any(|w| w.contains("minimum job_size")));
    }

    #[test]
    fn test_detect_max_business_value_anchoring() {
        let c = calc();
        let items = vec![
            c.calculate("a", "d", dec!(10), dec!(5), dec!(5), dec!(5), Some("critical")).unwrap(),
            c.calculate("b", "d", dec!(10), dec!(5), dec!(5), dec!(5), Some("critical")).unwrap(),
            c.calculate("c", "d", dec!(10), dec!(5), dec!(5), dec!(5), Some("critical")).unwrap(),
        ];

        let warnings = WsjfCalculator::detect_anti_patterns(&items);
        assert!(warnings.iter().any(|w| w.contains("anchoring")));
    }

    #[test]
    fn test_clean_backlog_no_warnings() {
        let c = calc();
        let items = vec![
            c.calculate("a", "d", dec!(8), dec!(9), dec!(7), dec!(3), Some("urgent security fix")).unwrap(),
            c.calculate("b", "d", dec!(5), dec!(5), dec!(5), dec!(5), Some("moderate")).unwrap(),
            c.calculate("c", "d", dec!(3), dec!(2), dec!(2), dec!(8), Some("large low-priority")).unwrap(),
        ];

        let warnings = WsjfCalculator::detect_anti_patterns(&items);
        // Should have no clustering/gaming/anchoring warnings
        assert!(
            !warnings.iter().any(|w| w.contains("identical") || w.contains("job_size") || w.contains("anchoring")),
            "Clean backlog should not trigger gaming/anchoring/identical warnings: {:?}",
            warnings
        );
    }

    // ========================================
    // WsjfItem as AggregateRoot
    // ========================================

    #[test]
    fn test_wsjf_item_aggregate_root_trait() {
        let c = calc();
        let item = c
            .calculate("550e8400-e29b-41d4-a716-446655440000", "d", dec!(5), dec!(5), dec!(5), dec!(5), Some("j"))
            .unwrap();

        // WsjfItem implements AggregateRoot
        let agg_id = item.aggregate_id();
        assert_eq!(
            agg_id.to_string(),
            "550e8400-e29b-41d4-a716-446655440000"
        );
    }

    #[test]
    fn test_wsjf_item_non_uuid_id_generates_new() {
        let c = calc();
        let item = c
            .calculate("not-a-uuid", "d", dec!(5), dec!(5), dec!(5), dec!(5), Some("j"))
            .unwrap();

        // Non-UUID string → generates a new UUID (not panic)
        let agg_id = item.aggregate_id();
        assert!(!agg_id.is_nil());
    }

    #[test]
    fn test_wsjf_item_default_version() {
        let c = calc();
        let item = c
            .calculate("t", "d", dec!(5), dec!(5), dec!(5), dec!(5), Some("j"))
            .unwrap();

        // Default AggregateRoot version
        assert_eq!(item.version(), 0);
    }
}
