// ============================================================================
// Budget Guardrail (Lean Budgeting)
// DoR: WsjfItem and Horizon types defined in services module
// DoD: Allocation correctness verified by services module tests
// ============================================================================

use super::services::{Horizon, WsjfItem};
use rust_decimal::prelude::*;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};

/// Allocates WSJF items into execution horizons (Now, Next, Later) based on
/// capacity guardrails.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BudgetGuardrail;

impl BudgetGuardrail {
    /// Allocates items to horizons based on WSJF score and capacity buckets.
    ///
    /// # Logic
    /// 1. Sort items by WSJF score (descending).
    /// 2. Allocate top N items to 'Now' until 'now_capacity' is filled.
    /// 3. Allocate next M items to 'Next' until 'next_capacity' is filled.
    /// 4. Allocate remainder to 'Later'.
    ///
    /// Capacity is defined in "points" (sum of job_size).
    pub fn allocate_horizons(
        items: &mut [WsjfItem],
        now_capacity: Decimal,
        next_capacity: Decimal,
    ) {
        // Sort descending by WSJF
        items.sort_by(|a, b| b.wsjf_score.partial_cmp(&a.wsjf_score).unwrap_or(std::cmp::Ordering::Equal));

        let mut current_now = Decimal::ZERO;
        let mut current_next = Decimal::ZERO;

        for item in items.iter_mut() {
            if current_now + item.job_size <= now_capacity {
                item.horizon = Some(Horizon::Now);
                current_now += item.job_size;
            } else if current_next + item.job_size <= next_capacity {
                item.horizon = Some(Horizon::Next);
                current_next += item.job_size;
            } else {
                item.horizon = Some(Horizon::Later);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rust_decimal_macros::dec;

    /// Helper: build a WsjfItem with given score and job_size.
    fn make_item(id: &str, wsjf_score: Decimal, job_size: Decimal) -> WsjfItem {
        WsjfItem {
            id: id.to_string(),
            description: format!("{id} desc"),
            business_value: dec!(5),
            time_criticality: dec!(5),
            risk_reduction: dec!(5),
            job_size,
            wsjf_score,
            scored_at: "2025-01-01T00:00:00Z".to_string(),
            justification: Some("test".to_string()),
            horizon: None,
        }
    }

    #[test]
    fn test_budget_guardrail_all_fit_now() {
        let mut items = vec![
            make_item("A", dec!(20), dec!(3)),
            make_item("B", dec!(15), dec!(2)),
        ];
        BudgetGuardrail::allocate_horizons(&mut items, dec!(10), dec!(10));
        // Both fit in Now (total job_size=5, capacity=10)
        assert_eq!(items[0].horizon, Some(Horizon::Now));
        assert_eq!(items[1].horizon, Some(Horizon::Now));
    }

    #[test]
    fn test_budget_guardrail_overflow_to_next() {
        let mut items = vec![
            make_item("A", dec!(20), dec!(5)),
            make_item("B", dec!(15), dec!(5)),
            make_item("C", dec!(10), dec!(5)),
        ];
        // Now=7, Next=7 — A fits Now, B fits Next, C fits Next? B=5<=7, C=5 > 7-5=2 → Later
        BudgetGuardrail::allocate_horizons(&mut items, dec!(7), dec!(7));
        assert_eq!(items[0].horizon, Some(Horizon::Now));  // A(wsjf=20, size=5) fits Now
        assert_eq!(items[1].horizon, Some(Horizon::Next));  // B(wsjf=15, size=5) fits Next
        assert_eq!(items[2].horizon, Some(Horizon::Later)); // C(wsjf=10, size=5) exceeds Next
    }

    #[test]
    fn test_budget_guardrail_all_overflow_to_later() {
        let mut items = vec![
            make_item("A", dec!(20), dec!(10)),
            make_item("B", dec!(15), dec!(10)),
        ];
        // Both capacities too small for any item
        BudgetGuardrail::allocate_horizons(&mut items, dec!(5), dec!(5));
        assert_eq!(items[0].horizon, Some(Horizon::Later));
        assert_eq!(items[1].horizon, Some(Horizon::Later));
    }

    #[test]
    fn test_budget_guardrail_empty_items() {
        let mut items: Vec<WsjfItem> = vec![];
        BudgetGuardrail::allocate_horizons(&mut items, dec!(10), dec!(10));
        assert!(items.is_empty());
    }

    #[test]
    fn test_budget_guardrail_sorts_by_wsjf_descending() {
        // Items given in ascending order — should be sorted descending
        let mut items = vec![
            make_item("Low", dec!(5), dec!(2)),
            make_item("High", dec!(30), dec!(2)),
            make_item("Mid", dec!(15), dec!(2)),
        ];
        BudgetGuardrail::allocate_horizons(&mut items, dec!(10), dec!(10));
        // After sort: High(30), Mid(15), Low(5) — all fit in Now (total=6, cap=10)
        assert_eq!(items[0].id, "High");
        assert_eq!(items[1].id, "Mid");
        assert_eq!(items[2].id, "Low");
    }

    #[test]
    fn test_budget_guardrail_exact_capacity_boundary() {
        let mut items = vec![
            make_item("A", dec!(20), dec!(5)),
            make_item("B", dec!(15), dec!(5)),
        ];
        // now_capacity exactly equals A's job_size
        BudgetGuardrail::allocate_horizons(&mut items, dec!(5), dec!(5));
        assert_eq!(items[0].horizon, Some(Horizon::Now));  // 5 <= 5
        assert_eq!(items[1].horizon, Some(Horizon::Next)); // 5 <= 5
    }

    #[test]
    fn test_budget_guardrail_single_item_now() {
        let mut items = vec![make_item("Solo", dec!(10), dec!(3))];
        BudgetGuardrail::allocate_horizons(&mut items, dec!(5), dec!(5));
        assert_eq!(items[0].horizon, Some(Horizon::Now));
    }

    #[test]
    fn test_budget_guardrail_single_item_later() {
        let mut items = vec![make_item("BigSolo", dec!(10), dec!(20))];
        BudgetGuardrail::allocate_horizons(&mut items, dec!(5), dec!(5));
        assert_eq!(items[0].horizon, Some(Horizon::Later));
    }

    #[test]
    fn test_budget_guardrail_zero_capacity() {
        let mut items = vec![make_item("A", dec!(10), dec!(1))];
        BudgetGuardrail::allocate_horizons(&mut items, dec!(0), dec!(0));
        assert_eq!(items[0].horizon, Some(Horizon::Later));
    }

    #[test]
    fn test_budget_guardrail_serialization_roundtrip() {
        let guardrail = BudgetGuardrail;
        let json = serde_json::to_string(&guardrail).unwrap();
        let _: BudgetGuardrail = serde_json::from_str(&json).unwrap();
    }
}
