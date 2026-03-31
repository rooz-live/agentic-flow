//! Portfolio Integration Tests
//!
//! DoR: domain::dispute, domain::organization, domain::holding, domain::portfolio modules compile
//! DoD: All tests exercise real aggregate behaviour through public API only — no direct field mutation
//!
//! # Structural Weaknesses Addressed
//!
//! 1. **Unenforced Invariants**: Tests verify that status transitions ONLY happen through
//!    proper methods (assess_systemic_score, cancel, retry_classification).
//!
//! 2. **Cancelled Classification Gap**: Tests exercise the full Cancelled → Retry → Re-assess
//!    lifecycle, including retry limits and evidence accumulation during cancellation.
//!
//! 3. **Evidence Bundle Validation**: Tests verify that high systemic scores without
//!    sufficient evidence are capped at SettlementOnly (not blindly promoted to LitigationReady).

use rust_core::domain::dispute::{
    CancellationReason, Dispute, DisputeError, DisputeStatus, EvidenceBundleRequirements,
    EvidenceCategory, EvidenceItem,
};
use rust_core::domain::holding::{Holding, HoldingType};
use rust_core::domain::organization::Organization;
use rust_core::domain::portfolio::Portfolio;
use rust_core::domain::validation::SystemicVerdict;
use rust_core::portfolio::value_objects::{Currency, Money};
use rust_decimal::Decimal;
use std::str::FromStr;

// ============================================================================
// Portfolio basics (domain::portfolio layer)
// ============================================================================

#[test]
fn test_portfolio_creation() {
    let p = Portfolio::new("Test User");
    assert_eq!(p.owner, "Test User");
    assert!(p.holdings.is_empty());
}

#[test]
fn test_portfolio_financial_holding() {
    let mut p = Portfolio::new("Investor");
    let money = Money::new(Decimal::from_str("1000.00").unwrap(), Currency::USD);
    let holding = Holding::new_financial("Emergency Fund", money);

    // Portfolio should accept a financial holding
    p.add_holding(holding);
    assert_eq!(p.holdings.len(), 1);
}

#[test]
fn test_portfolio_legal_health_with_evidence() {
    let mut p = Portfolio::new("Advocate");

    // Case 1: High score BUT insufficient evidence → capped at SettlementOnly
    let org1 = Organization::new("Big Bank", 5);
    let mut d1 = Dispute::new("CASE-001", org1);
    d1.assess_systemic_score(35).unwrap(); // Now returns Result
                                           // Without evidence bundle, status caps at SettlementOnly even though score > 30
    assert!(
        !d1.is_litigation_ready(),
        "High score without evidence should NOT be LitigationReady"
    );

    p.add_holding(Holding::new_legal(d1));

    // Case 2: Low score → Defer
    let org2 = Organization::new("Small Shop", 1);
    let mut d2 = Dispute::new("CASE-002", org2);
    d2.assess_systemic_score(5).unwrap();

    p.add_holding(Holding::new_legal(d2));

    p.calculate_health();

    let health = p.health.as_ref().unwrap();
    // Neither dispute is LitigationReady (d1 capped at SettlementOnly, d2 is Defer)
    // So passed_roles = 0 and score = 0.0
    assert_eq!(health.total_roles, 2);
    assert_eq!(
        health.passed_roles, 0,
        "No disputes should be litigation-ready without evidence bundles"
    );
}

// ============================================================================
// Dispute Aggregate — Encapsulation & Invariant Enforcement
// ============================================================================

#[test]
fn test_dispute_starts_unknown() {
    let org = Organization::new("MAA", 4);
    let dispute = Dispute::new("26CV005596-590", org);

    assert_eq!(dispute.case_id(), "26CV005596-590");
    assert_eq!(dispute.organization().name(), "MAA");
    assert_eq!(dispute.organization().hierarchy_depth(), 4);
    assert_eq!(*dispute.status(), DisputeStatus::Unknown);
    assert!(dispute.systemic_score().is_none());
    assert_eq!(dispute.evidence_count(), 0);
    assert_eq!(dispute.retry_count(), 0);
    assert!(!dispute.is_cancelled());
    assert!(!dispute.is_litigation_ready());
    assert!(!dispute.is_actionable());
}

#[test]
fn test_assess_mid_score_yields_settlement_only() {
    let mut dispute = Dispute::new("CASE-001", Organization::new("Apex", 3));
    dispute.assess_systemic_score(20).unwrap();

    assert!(!dispute.is_litigation_ready());
    assert!(dispute.is_actionable()); // SettlementOnly is actionable
    assert_eq!(*dispute.status(), DisputeStatus::SettlementOnly);

    // Systemic score should be recorded
    let score = dispute.systemic_score().unwrap();
    assert_eq!(score.score, 20);
    assert_eq!(score.verdict, SystemicVerdict::SettlementOnly);
}

#[test]
fn test_assess_low_score_defers() {
    let mut dispute = Dispute::new("CASE-002", Organization::new("IRS", 1));
    dispute.assess_systemic_score(5).unwrap();

    assert_eq!(*dispute.status(), DisputeStatus::Defer);
    assert!(!dispute.is_actionable());
}

#[test]
fn test_high_score_without_evidence_caps_at_settlement() {
    // This is the KEY invariant: systemic score alone is insufficient for litigation.
    // Evidence bundle must also pass validation.
    let mut dispute = Dispute::new("CASE-003", Organization::new("MAA", 4));
    dispute.assess_systemic_score(40).unwrap();

    // Score > 30 but no evidence → capped at SettlementOnly
    assert_eq!(
        *dispute.status(),
        DisputeStatus::SettlementOnly,
        "High score without evidence must NOT yield LitigationReady"
    );
}

// ============================================================================
// Cancelled Classification — the gap that was missing
// ============================================================================

#[test]
fn test_cancel_with_work_order_reason() {
    let mut dispute = Dispute::new("CASE-004", Organization::new("MAA", 4));
    dispute.assess_systemic_score(20).unwrap();

    dispute
        .cancel(CancellationReason::WorkOrderCancelled {
            work_order_id: "WO-4521".into(),
        })
        .unwrap();

    assert!(dispute.is_cancelled());
    assert!(!dispute.is_actionable());

    // Status includes the reason
    let status_str = dispute.status().to_string();
    assert!(
        status_str.contains("WO-4521"),
        "Cancelled status should include work order ID"
    );
}

#[test]
fn test_cancel_with_strategy_change() {
    let mut dispute = Dispute::new("CASE-005", Organization::new("MAA", 4));
    dispute
        .cancel(CancellationReason::StrategyChange {
            old_strategy: "Settlement".into(),
            new_strategy: "Build litigation evidence".into(),
        })
        .unwrap();

    assert!(dispute.is_cancelled());
}

#[test]
fn test_cancel_with_superseded() {
    let mut dispute = Dispute::new("CASE-006", Organization::new("MAA", 4));
    dispute
        .cancel(CancellationReason::Superseded {
            replacement_case_id: "CASE-007".into(),
        })
        .unwrap();

    assert!(dispute.is_cancelled());
    assert!(dispute.status().to_string().contains("Superseded"));
}

#[test]
fn test_cancelled_dispute_rejects_assessment() {
    let mut dispute = Dispute::new("CASE-008", Organization::new("MAA", 4));
    dispute
        .cancel(CancellationReason::InsufficientEvidence {
            gap_description: "No photos".into(),
        })
        .unwrap();

    let result = dispute.assess_systemic_score(35);
    assert!(result.is_err(), "Cancelled dispute must reject assessment");
    assert!(matches!(
        result.unwrap_err(),
        DisputeError::DisputeCancelled { .. }
    ));
}

// ============================================================================
// Retry Mechanism — Cancelled → Unknown → Re-assess
// ============================================================================

#[test]
fn test_retry_resets_to_unknown() {
    let mut dispute = Dispute::new("CASE-009", Organization::new("MAA", 4));
    dispute
        .cancel(CancellationReason::InsufficientEvidence {
            gap_description: "Need more photos".into(),
        })
        .unwrap();
    assert!(dispute.is_cancelled());

    dispute
        .retry_classification("Gathered 10 new photos")
        .unwrap();

    assert_eq!(*dispute.status(), DisputeStatus::Unknown);
    assert_eq!(dispute.retry_count(), 1);
    assert!(!dispute.is_cancelled());
}

#[test]
fn test_retry_on_non_cancelled_is_rejected() {
    let mut dispute = Dispute::new("CASE-010", Organization::new("MAA", 4));
    // dispute is Unknown, not Cancelled
    let result = dispute.retry_classification("Invalid retry");
    assert!(result.is_err());
    assert!(matches!(
        result.unwrap_err(),
        DisputeError::InvalidTransition { .. }
    ));
}

#[test]
fn test_retry_limit_enforced() {
    let mut dispute = Dispute::new("CASE-011", Organization::new("MAA", 4)).with_max_retries(2);

    // Exhaust retry budget
    for i in 0..2 {
        dispute
            .cancel(CancellationReason::InsufficientEvidence {
                gap_description: format!("Round {}", i + 1),
            })
            .unwrap();
        dispute
            .retry_classification(&format!("Retry attempt {}", i + 1))
            .unwrap();
    }

    assert_eq!(dispute.retry_count(), 2);

    // Cancel again
    dispute
        .cancel(CancellationReason::InsufficientEvidence {
            gap_description: "Round 3".into(),
        })
        .unwrap();

    // Third retry should fail
    let result = dispute.retry_classification("This should fail");
    assert!(result.is_err());
    assert!(matches!(
        result.unwrap_err(),
        DisputeError::RetryLimitExceeded { .. }
    ));
}

#[test]
fn test_retry_then_reassess_lifecycle() {
    let mut dispute = Dispute::new("CASE-012", Organization::new("MAA", 4));

    // Initial assessment
    dispute.assess_systemic_score(20).unwrap();
    assert_eq!(*dispute.status(), DisputeStatus::SettlementOnly);

    // Strategy pivot: cancel to gather more evidence
    dispute
        .cancel(CancellationReason::StrategyChange {
            old_strategy: "Quick settlement".into(),
            new_strategy: "Build full evidence chain".into(),
        })
        .unwrap();
    assert!(dispute.is_cancelled());

    // Retry
    dispute
        .retry_classification("Evidence chain now complete")
        .unwrap();
    assert_eq!(*dispute.status(), DisputeStatus::Unknown);

    // Re-assess with higher score
    dispute.assess_systemic_score(35).unwrap();
    // Still SettlementOnly because evidence bundle is empty
    assert_eq!(*dispute.status(), DisputeStatus::SettlementOnly);
}

// ============================================================================
// Evidence Management — dedup, typing, bundle validation
// ============================================================================

#[test]
fn test_add_evidence_succeeds() {
    let mut dispute = Dispute::new("CASE-013", Organization::new("MAA", 4));

    let item = EvidenceItem::new(
        "/evidence/mold-photo.jpg",
        EvidenceCategory::PhotoDocumentation,
    )
    .unwrap()
    .with_description("Black mold in bathroom ceiling, Unit 1215");

    dispute.add_evidence(item).unwrap();
    assert_eq!(dispute.evidence_count(), 1);
}

#[test]
fn test_duplicate_evidence_rejected() {
    let mut dispute = Dispute::new("CASE-014", Organization::new("MAA", 4));

    let item1 =
        EvidenceItem::new("/evidence/photo1.jpg", EvidenceCategory::PhotoDocumentation).unwrap();
    let item2 =
        EvidenceItem::new("/evidence/photo1.jpg", EvidenceCategory::PhotoDocumentation).unwrap();

    dispute.add_evidence(item1).unwrap();
    let result = dispute.add_evidence(item2);
    assert!(result.is_err());
    assert!(matches!(
        result.unwrap_err(),
        DisputeError::DuplicateEvidence { .. }
    ));
}

#[test]
fn test_empty_evidence_path_rejected() {
    let result = EvidenceItem::new("", EvidenceCategory::Other);
    assert!(result.is_err());
    assert!(matches!(
        result.unwrap_err(),
        DisputeError::EmptyEvidencePath
    ));
}

#[test]
fn test_cancelled_dispute_still_accumulates_evidence() {
    // Key: evidence can be added to a cancelled dispute (for the retry path)
    let mut dispute = Dispute::new("CASE-015", Organization::new("MAA", 4));
    dispute
        .cancel(CancellationReason::InsufficientEvidence {
            gap_description: "Need photos".into(),
        })
        .unwrap();

    let item = EvidenceItem::new(
        "/new-evidence/photo.jpg",
        EvidenceCategory::PhotoDocumentation,
    )
    .unwrap();
    dispute.add_evidence(item).unwrap();
    assert_eq!(dispute.evidence_count(), 1);
}

#[test]
fn test_cancelled_work_order_count() {
    let mut dispute = Dispute::new("CASE-016", Organization::new("MAA", 4));

    dispute
        .add_evidence(
            EvidenceItem::new("wo-cancel-1.pdf", EvidenceCategory::CancelledWorkOrder).unwrap(),
        )
        .unwrap();
    dispute
        .add_evidence(
            EvidenceItem::new("wo-cancel-2.pdf", EvidenceCategory::CancelledWorkOrder).unwrap(),
        )
        .unwrap();
    dispute
        .add_evidence(
            EvidenceItem::new("mold-photo.jpg", EvidenceCategory::PhotoDocumentation).unwrap(),
        )
        .unwrap();

    assert_eq!(dispute.cancelled_work_order_count(), 2);
    assert_eq!(dispute.evidence_count(), 3);
}

// ============================================================================
// Evidence Bundle Validation — invariant enforcement for LitigationReady
// ============================================================================

#[test]
fn test_empty_evidence_fails_litigation_requirements() {
    let dispute = Dispute::new("CASE-017", Organization::new("MAA", 4));
    let report = dispute.validate_evidence_bundle(&EvidenceBundleRequirements::litigation_ready());

    assert!(!report.is_sufficient);
    assert!(!report.gaps.is_empty());
    assert!(report.evidence_count == 0);
}

#[test]
fn test_empty_evidence_fails_settlement_requirements() {
    let dispute = Dispute::new("CASE-018", Organization::new("MAA", 4));
    let report = dispute.validate_evidence_bundle(&EvidenceBundleRequirements::settlement_only());

    assert!(!report.is_sufficient);
}

#[test]
fn test_partial_evidence_reports_specific_gaps() {
    let mut dispute = Dispute::new("CASE-019", Organization::new("MAA", 4));

    // Add maintenance requests but no photos
    dispute
        .add_evidence(
            EvidenceItem::new("request-1.pdf", EvidenceCategory::MaintenanceRequest).unwrap(),
        )
        .unwrap();
    dispute
        .add_evidence(
            EvidenceItem::new("request-2.pdf", EvidenceCategory::MaintenanceRequest).unwrap(),
        )
        .unwrap();
    dispute
        .add_evidence(
            EvidenceItem::new("request-3.pdf", EvidenceCategory::MaintenanceRequest).unwrap(),
        )
        .unwrap();

    let report = dispute.validate_evidence_bundle(&EvidenceBundleRequirements::settlement_only());

    // Has 3 items and MaintenanceRequest category — but only 1 category, need 2
    assert!(!report.is_sufficient);
    assert_eq!(report.evidence_count, 3);
    assert_eq!(report.category_count, 1);
}

#[test]
fn test_is_evidence_settlement_ready_requires_timeline_span() {
    let mut dispute = Dispute::new("CASE-020", Organization::new("MAA", 4));

    // Add enough items and categories for settlement (3+ items, 2+ categories,
    // MaintenanceRequest required) — BUT all added at the same instant.
    dispute
        .add_evidence(
            EvidenceItem::new("request-1.pdf", EvidenceCategory::MaintenanceRequest).unwrap(),
        )
        .unwrap();
    dispute
        .add_evidence(
            EvidenceItem::new("photo-1.jpg", EvidenceCategory::PhotoDocumentation).unwrap(),
        )
        .unwrap();
    dispute
        .add_evidence(EvidenceItem::new("email-1.eml", EvidenceCategory::Correspondence).unwrap())
        .unwrap();

    // Same-second evidence correctly FAILS the 30-day timeline requirement.
    // This is the validation working as designed: evidence added in a single
    // session does not establish a temporal pattern. The settlement bundle
    // requires min_timeline_days: 30 to prove ongoing neglect, not a one-off.
    assert!(
        !dispute.is_evidence_settlement_ready(),
        "Same-second evidence should fail 30-day timeline requirement for settlement"
    );
    assert!(!dispute.is_evidence_litigation_ready());

    // Verify the specific gap: timeline span is 0 days
    let report = dispute.validate_evidence_bundle(&EvidenceBundleRequirements::settlement_only());
    assert!(!report.is_sufficient);
    assert_eq!(report.evidence_count, 3);
    assert_eq!(report.category_count, 3); // MaintenanceRequest, PhotoDocumentation, Correspondence
    assert_eq!(
        report.timeline_days, 0,
        "All items added at same instant → 0-day span"
    );
    assert!(
        report.gaps.iter().any(|g| g.contains("timeline")),
        "Should report timeline gap: {:?}",
        report.gaps
    );
}

// ============================================================================
// Status History — audit trail for every transition
// ============================================================================

#[test]
fn test_status_history_tracks_all_transitions() {
    let mut dispute = Dispute::new("CASE-021", Organization::new("MAA", 4));
    assert!(dispute.status_history().is_empty());

    // Transition 1: assess
    dispute.assess_systemic_score(20).unwrap();
    assert_eq!(dispute.status_history().len(), 1);
    assert!(dispute.status_history()[0]
        .reason
        .contains("Systemic score assessed"));

    // Transition 2: cancel
    dispute
        .cancel(CancellationReason::ExternalFactor {
            description: "Court date postponed".into(),
        })
        .unwrap();
    assert_eq!(dispute.status_history().len(), 2);
    assert!(dispute.status_history()[1]
        .reason
        .contains("Court date postponed"));

    // Transition 3: retry
    dispute
        .retry_classification("Court date confirmed for March 3")
        .unwrap();
    assert_eq!(dispute.status_history().len(), 3);
    assert!(dispute.status_history()[2].to.contains("retry"));
}

// ============================================================================
// Full MAA Lifecycle — the complete OODA cycle
// ============================================================================

#[test]
fn test_maa_full_lifecycle_ooda_cycle() {
    // OBSERVE: Create dispute with MAA organisation details
    let org = Organization::new("MAA", 4); // 4 levels: maintenance → property → regional → corporate
    let mut dispute = Dispute::new("MAA-26CV005596-590", org);

    // ORIENT: Initial assessment — score high but no evidence yet
    dispute.assess_systemic_score(35).unwrap();
    assert_eq!(
        *dispute.status(),
        DisputeStatus::SettlementOnly,
        "ORIENT: Score without evidence → SettlementOnly"
    );

    // DECIDE: Strategy says gather evidence first, then reassess
    dispute
        .cancel(CancellationReason::StrategyChange {
            old_strategy: "Quick settlement".into(),
            new_strategy: "Build 22-month evidence chain for litigation".into(),
        })
        .unwrap();

    // ACT: Gather evidence while cancelled (still accumulates)
    dispute
        .add_evidence(
            EvidenceItem::new("wo-cancel-1.pdf", EvidenceCategory::CancelledWorkOrder)
                .unwrap()
                .with_description("HVAC work order #4521 cancelled by property manager"),
        )
        .unwrap();
    dispute
        .add_evidence(
            EvidenceItem::new("wo-cancel-2.pdf", EvidenceCategory::CancelledWorkOrder)
                .unwrap()
                .with_description("Mold remediation work order #4602 cancelled"),
        )
        .unwrap();
    dispute
        .add_evidence(
            EvidenceItem::new("mold-photo-1.jpg", EvidenceCategory::PhotoDocumentation)
                .unwrap()
                .with_description("Black mold in bathroom ceiling"),
        )
        .unwrap();
    dispute
        .add_evidence(
            EvidenceItem::new("medical-record.pdf", EvidenceCategory::MedicalRecord)
                .unwrap()
                .with_description("Respiratory symptoms from mold exposure"),
        )
        .unwrap();

    assert_eq!(dispute.evidence_count(), 4);
    assert_eq!(dispute.cancelled_work_order_count(), 2);

    // RE-OBSERVE: Retry classification with new evidence
    dispute
        .retry_classification("22 months of evidence gathered across 4 org levels")
        .unwrap();
    assert_eq!(*dispute.status(), DisputeStatus::Unknown);
    assert_eq!(dispute.retry_count(), 1);

    // RE-ORIENT: Re-assess with full systemic score
    dispute.assess_systemic_score(40).unwrap();

    // Still SettlementOnly because evidence bundle doesn't meet litigation threshold
    // (needs 10+ items, 180+ day span, etc.)
    assert_eq!(*dispute.status(), DisputeStatus::SettlementOnly);

    // Verify the full audit trail
    assert_eq!(
        dispute.status_history().len(),
        4,
        "Should have 4 transitions: assess → cancel → retry → re-assess"
    );

    // Verify actionability
    assert!(
        dispute.is_actionable(),
        "SettlementOnly should be actionable"
    );
    assert!(
        !dispute.is_litigation_ready(),
        "Should not be litigation ready without full evidence bundle"
    );
}

// ============================================================================
// Organisation Encapsulation
// ============================================================================

#[test]
fn test_organization_hierarchy_depth_floor() {
    let org = Organization::new("Flat Corp", 0);
    assert_eq!(
        org.hierarchy_depth(),
        1,
        "Hierarchy depth should floor at 1"
    );
}

#[test]
fn test_organization_indifference_pattern() {
    let mut org = Organization::new("MAA", 4);
    assert!(org.indifference_pattern().is_none());

    org.set_indifference_pattern("22-month neglect: maintenance → property → regional → corporate");
    assert_eq!(
        org.indifference_pattern(),
        Some("22-month neglect: maintenance → property → regional → corporate")
    );
}

// ============================================================================
// Anti-Corruption Layer verification
// ============================================================================

#[test]
fn test_dispute_does_not_expose_mutable_evidence_chain() {
    let dispute = Dispute::new("CASE-ACL", Organization::new("MAA", 4));

    // evidence_chain() returns a slice reference, not a mutable Vec.
    // This means external code cannot push/remove evidence without going
    // through add_evidence() which enforces dedup and validation.
    let chain: &[EvidenceItem] = dispute.evidence_chain();
    assert!(chain.is_empty());

    // If someone tries `dispute.evidence_chain.push(...)` it won't compile
    // because evidence_chain is a private field.
    // This test documents that invariant.
}

#[test]
fn test_dispute_status_cannot_be_set_directly() {
    let dispute = Dispute::new("CASE-ENCAP", Organization::new("MAA", 4));

    // These are the ONLY ways to observe status:
    let _ = dispute.status();
    let _ = dispute.is_cancelled();
    let _ = dispute.is_litigation_ready();
    let _ = dispute.is_actionable();

    // And these are the ONLY ways to change status:
    // dispute.assess_systemic_score(score) → Result
    // dispute.cancel(reason)               → Result
    // dispute.retry_classification(reason)  → Result

    // Direct assignment like `dispute.status = LitigationReady` does not compile.
    // This test verifies the design intent at the API level.
    assert_eq!(*dispute.status(), DisputeStatus::Unknown);
}

// ============================================================================
// CancellationReason Display — for audit readability
// ============================================================================

#[test]
fn test_cancellation_reason_display_formats() {
    let r1 = CancellationReason::WorkOrderCancelled {
        work_order_id: "WO-4521".into(),
    };
    assert!(r1.to_string().contains("WO-4521"));

    let r2 = CancellationReason::InsufficientEvidence {
        gap_description: "No mold photos".into(),
    };
    assert!(r2.to_string().contains("No mold photos"));

    let r3 = CancellationReason::StrategyChange {
        old_strategy: "Settlement".into(),
        new_strategy: "Litigation".into(),
    };
    let display = r3.to_string();
    assert!(display.contains("Settlement"));
    assert!(display.contains("Litigation"));

    let r4 = CancellationReason::ExternalFactor {
        description: "Court date moved to April".into(),
    };
    assert!(r4.to_string().contains("Court date moved"));

    let r5 = CancellationReason::Superseded {
        replacement_case_id: "CASE-NEW".into(),
    };
    assert!(r5.to_string().contains("CASE-NEW"));
}
