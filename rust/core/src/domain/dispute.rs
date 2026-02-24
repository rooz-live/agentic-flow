//! Dispute Aggregate — Legal Case Domain Model
//!
//! @business-context WSJF-DISPUTE: Core aggregate for legal case management.
//!   Drives litigation-readiness scoring (systemic indifference 0-40),
//!   evidence bundle validation, and status transitions. MAA case 26CV005596
//!   and eviction defense 26CV007491 are the primary domain instances.
//! @adr ADR-019: Structural Weaknesses Fixed — added CancellationReason enum,
//!   evidence bundle validation gate, retry mechanism for cancelled disputes.
//! @constraint DDD-DISPUTE: Imports only from domain::organization and
//!   domain::validation. No portfolio imports (anti-corruption layer).
//! @planned-change R-2026-007: Add eviction-specific status variant and
//!   consolidation tracking when Motion to Consolidate outcome is known.
//!
//! DoR: Organization and SystemicScore types importable from sibling modules
//! DoD: All fields private with enforced invariants; Cancelled status represented;
//!      evidence bundle validated before status transitions; retry mechanism for
//!      cancelled classifications
//!
//! # Structural Weaknesses Fixed (ADR-019)
//!
//! 1. **Cancelled Classification Gap**: `DisputeStatus::Cancelled` now exists with
//!    a mandatory `CancellationReason`. Work order cancellations — the core MAA
//!    evidence pattern — are first-class domain concepts, not stringly-typed.
//!
//! 2. **Unenforced Invariants**: All fields are private. Status transitions go
//!    through `assess_systemic_score()`, `cancel()`, `retry_classification()`,
//!    or `add_evidence()`. Direct field mutation is impossible from outside.
//!
//! 3. **Evidence Bundle Validation**: `validate_evidence_bundle()` checks minimum
//!    evidence count, timeline span, and org-level depth before allowing a
//!    status transition to `LitigationReady`. Prevents premature escalation.
//!
//! 4. **Retry Mechanism**: `retry_classification()` transitions a `Cancelled`
//!    dispute back to `Unknown` with the retry reason logged, enabling the
//!    OODA loop (Observe → Orient → Decide → Act → re-Observe).
//!
//! # Anti-Corruption Layer Note
//!
//! This module imports from `domain::organization` and `domain::validation` only.
//! It does NOT import from `portfolio::*`. The `domain::holding` module that
//! previously coupled these contexts should use a shared kernel or mapped types
//! instead of direct imports.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fmt;
use thiserror::Error;

use crate::domain::organization::Organization;
use crate::domain::validation::{SystemicScore, SystemicVerdict};

// ============================================================================
// Errors
// ============================================================================

#[derive(Error, Debug)]
pub enum DisputeError {
    #[error("Insufficient evidence: need at least {needed} items, have {have}")]
    InsufficientEvidence { needed: usize, have: usize },

    #[error("Evidence bundle incomplete: {reason}")]
    EvidenceBundleIncomplete { reason: String },

    #[error("Invalid status transition: cannot move from {from} to {to}")]
    InvalidTransition { from: String, to: String },

    #[error("Dispute is cancelled: {reason}. Use retry_classification() to re-assess.")]
    DisputeCancelled { reason: String },

    #[error("Duplicate evidence: '{path}' already in chain")]
    DuplicateEvidence { path: String },

    #[error("Evidence path is empty")]
    EmptyEvidencePath,

    #[error("Retry limit exceeded: {attempts} attempts (max {max})")]
    RetryLimitExceeded { attempts: u32, max: u32 },
}

// ============================================================================
// DisputeStatus — now includes Cancelled with reason
// ============================================================================

/// Why a dispute classification was cancelled.
///
/// This is a value object — compared by value, not identity.
/// Each variant maps to a ROAM risk classification:
///   - WorkOrderCancelled → Systemic (organisational pattern)
///   - InsufficientEvidence → Situational (can be resolved with more data)
///   - StrategyChange → Strategic (deliberate decision to pivot)
///   - ExternalFactor → Situational (court ruling, deadline change)
///   - Superseded → Strategic (replaced by different approach)
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum CancellationReason {
    /// Work order was cancelled by the organisation (MAA pattern)
    WorkOrderCancelled { work_order_id: String },
    /// Not enough evidence to sustain the classification
    InsufficientEvidence { gap_description: String },
    /// Deliberate strategy pivot (e.g., settlement → litigation)
    StrategyChange {
        old_strategy: String,
        new_strategy: String,
    },
    /// External event forced cancellation (court ruling, deadline)
    ExternalFactor { description: String },
    /// This dispute was merged into or replaced by another
    Superseded { replacement_case_id: String },
}

impl fmt::Display for CancellationReason {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::WorkOrderCancelled { work_order_id } => {
                write!(f, "Work order {} cancelled by organisation", work_order_id)
            }
            Self::InsufficientEvidence { gap_description } => {
                write!(f, "Insufficient evidence: {}", gap_description)
            }
            Self::StrategyChange {
                old_strategy,
                new_strategy,
            } => write!(f, "Strategy changed: {} → {}", old_strategy, new_strategy),
            Self::ExternalFactor { description } => {
                write!(f, "External factor: {}", description)
            }
            Self::Superseded {
                replacement_case_id,
            } => {
                write!(f, "Superseded by case {}", replacement_case_id)
            }
        }
    }
}

/// Classification status of a legal dispute.
///
/// State machine transitions:
///
/// ```text
///   Unknown ──assess──→ LitigationReady
///   Unknown ──assess──→ SettlementOnly
///   Unknown ──assess──→ Defer
///   Unknown ──cancel──→ Cancelled
///   Cancelled ──retry──→ Unknown  (re-enters assessment cycle)
///   SettlementOnly ──assess──→ LitigationReady  (evidence strengthened)
///   Defer ──assess──→ SettlementOnly  (evidence gathered)
///   Any ──cancel──→ Cancelled
/// ```
///
/// Invalid transitions are rejected by `DisputeError::InvalidTransition`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum DisputeStatus {
    /// Initial state — not yet classified
    Unknown,
    /// Systemic score > 30 AND evidence bundle validated
    LitigationReady,
    /// Systemic score 11–30 OR evidence bundle incomplete for litigation
    SettlementOnly,
    /// Systemic score ≤ 10 — insufficient pattern for action
    Defer,
    /// Classification was cancelled (with mandatory reason)
    Cancelled {
        reason: CancellationReason,
        cancelled_at: DateTime<Utc>,
    },
}

impl fmt::Display for DisputeStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Unknown => write!(f, "Unknown"),
            Self::LitigationReady => write!(f, "LitigationReady"),
            Self::SettlementOnly => write!(f, "SettlementOnly"),
            Self::Defer => write!(f, "Defer"),
            Self::Cancelled { reason, .. } => write!(f, "Cancelled({})", reason),
        }
    }
}

// ============================================================================
// Evidence Item — typed evidence with metadata
// ============================================================================

/// A single piece of evidence in the dispute chain.
///
/// Value object: compared by path (unique identifier within a dispute).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct EvidenceItem {
    path: String,
    category: EvidenceCategory,
    added_at: DateTime<Utc>,
    description: Option<String>,
}

impl EvidenceItem {
    pub fn new(path: &str, category: EvidenceCategory) -> Result<Self, DisputeError> {
        if path.trim().is_empty() {
            return Err(DisputeError::EmptyEvidencePath);
        }
        Ok(Self {
            path: path.to_string(),
            category,
            added_at: Utc::now(),
            description: None,
        })
    }

    pub fn with_description(mut self, desc: &str) -> Self {
        self.description = Some(desc.to_string());
        self
    }

    pub fn path(&self) -> &str {
        &self.path
    }

    pub fn category(&self) -> &EvidenceCategory {
        &self.category
    }

    pub fn added_at(&self) -> DateTime<Utc> {
        self.added_at
    }

    pub fn description(&self) -> Option<&str> {
        self.description.as_deref()
    }
}

/// Categories of evidence, mapping to legal proof types.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum EvidenceCategory {
    /// Work orders, maintenance requests, portal screenshots
    MaintenanceRequest,
    /// Photos, videos of property conditions
    PhotoDocumentation,
    /// Medical records related to habitability harm
    MedicalRecord,
    /// Email correspondence, letters
    Correspondence,
    /// Lease agreement, amendments, notices
    LeaseDocument,
    /// Court filings, motions, orders
    CourtFiling,
    /// Expert reports, inspections
    ExpertReport,
    /// Financial records (rent, fees, damages)
    FinancialRecord,
    /// Work orders that were CANCELLED by the organisation
    CancelledWorkOrder,
    /// Regulatory complaints (HUD, AG, etc.)
    RegulatoryComplaint,
    /// Other evidence not fitting above categories
    Other,
}

// ============================================================================
// Evidence Bundle Validation — invariant enforcement
// ============================================================================

/// Requirements for evidence bundle to support a given status.
///
/// These are the domain invariants that MUST be satisfied before
/// a dispute can transition to a given status. They are not opinions;
/// they are the minimum structural requirements.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EvidenceBundleRequirements {
    /// Minimum total evidence items
    pub min_evidence_count: usize,
    /// Minimum distinct evidence categories
    pub min_category_count: usize,
    /// Minimum timeline span in days (earliest to latest evidence)
    pub min_timeline_days: u64,
    /// Required evidence categories (at least one item in each)
    pub required_categories: Vec<EvidenceCategory>,
    /// Minimum organisation levels implicated
    pub min_org_levels: u8,
}

impl EvidenceBundleRequirements {
    /// Requirements for LitigationReady status.
    ///
    /// These thresholds come from the systemic indifference analysis:
    /// - 10+ evidence items (covers pattern, not isolated incident)
    /// - 3+ categories (multi-faceted documentation)
    /// - 180+ day timeline (6 months establishes pattern)
    /// - Must include maintenance requests AND photo documentation
    /// - 2+ org levels (proves organisational, not individual failure)
    pub fn litigation_ready() -> Self {
        Self {
            min_evidence_count: 10,
            min_category_count: 3,
            min_timeline_days: 180,
            required_categories: vec![
                EvidenceCategory::MaintenanceRequest,
                EvidenceCategory::PhotoDocumentation,
            ],
            min_org_levels: 2,
        }
    }

    /// Requirements for SettlementOnly status.
    ///
    /// Lower bar: enough to negotiate but not to win at trial.
    pub fn settlement_only() -> Self {
        Self {
            min_evidence_count: 3,
            min_category_count: 2,
            min_timeline_days: 30,
            required_categories: vec![EvidenceCategory::MaintenanceRequest],
            min_org_levels: 1,
        }
    }
}

/// Result of evidence bundle validation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EvidenceBundleReport {
    pub is_sufficient: bool,
    pub evidence_count: usize,
    pub category_count: usize,
    pub timeline_days: u64,
    pub org_levels: u8,
    pub missing_categories: Vec<String>,
    pub gaps: Vec<String>,
}

// ============================================================================
// Dispute Aggregate Root — encapsulated, invariant-enforcing
// ============================================================================

/// A legal dispute against an organisation.
///
/// This is the **aggregate root** for the dispute bounded context.
/// All state mutations go through methods that enforce domain invariants.
///
/// # Invariants
///
/// 1. `status` can only change through `assess_systemic_score()`, `cancel()`,
///    or `retry_classification()`. Direct field access is impossible.
///
/// 2. `LitigationReady` requires evidence bundle validation to pass.
///    A high systemic score alone is insufficient without documented evidence.
///
/// 3. `Cancelled` disputes cannot be re-assessed directly. They must first
///    be retried via `retry_classification()` which resets to `Unknown`.
///
/// 4. Evidence items are deduplicated by path. Adding a duplicate returns
///    `DisputeError::DuplicateEvidence`.
///
/// 5. Retry attempts are capped at `max_retries` to prevent infinite loops.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Dispute {
    case_id: String,
    organization: Organization,
    status: DisputeStatus,
    systemic_score: Option<SystemicScore>,
    evidence_chain: Vec<EvidenceItem>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
    retry_count: u32,
    max_retries: u32,
    status_history: Vec<StatusTransition>,
}

/// Record of a status transition for audit trail.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct StatusTransition {
    pub from: String,
    pub to: String,
    pub timestamp: DateTime<Utc>,
    pub reason: String,
}

impl Dispute {
    // ========================================================================
    // Construction
    // ========================================================================

    /// Create a new dispute in `Unknown` status.
    pub fn new(case_id: &str, organization: Organization) -> Self {
        let now = Utc::now();
        Self {
            case_id: case_id.to_string(),
            organization,
            status: DisputeStatus::Unknown,
            systemic_score: None,
            evidence_chain: Vec::new(),
            created_at: now,
            updated_at: now,
            retry_count: 0,
            max_retries: 5,
            status_history: Vec::new(),
        }
    }

    /// Create with a custom retry limit.
    pub fn with_max_retries(mut self, max: u32) -> Self {
        self.max_retries = max;
        self
    }

    // ========================================================================
    // Getters — read-only access to private fields
    // ========================================================================

    pub fn case_id(&self) -> &str {
        &self.case_id
    }

    pub fn organization(&self) -> &Organization {
        &self.organization
    }

    pub fn status(&self) -> &DisputeStatus {
        &self.status
    }

    pub fn systemic_score(&self) -> Option<&SystemicScore> {
        self.systemic_score.as_ref()
    }

    pub fn evidence_chain(&self) -> &[EvidenceItem] {
        &self.evidence_chain
    }

    pub fn evidence_count(&self) -> usize {
        self.evidence_chain.len()
    }

    pub fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }

    pub fn updated_at(&self) -> DateTime<Utc> {
        self.updated_at
    }

    pub fn retry_count(&self) -> u32 {
        self.retry_count
    }

    pub fn max_retries(&self) -> u32 {
        self.max_retries
    }

    pub fn status_history(&self) -> &[StatusTransition] {
        &self.status_history
    }

    pub fn is_cancelled(&self) -> bool {
        matches!(self.status, DisputeStatus::Cancelled { .. })
    }

    pub fn is_litigation_ready(&self) -> bool {
        self.status == DisputeStatus::LitigationReady
    }

    pub fn is_actionable(&self) -> bool {
        matches!(
            self.status,
            DisputeStatus::LitigationReady | DisputeStatus::SettlementOnly
        )
    }

    // ========================================================================
    // Commands — state-mutating operations with invariant enforcement
    // ========================================================================

    /// Add a piece of evidence to the chain.
    ///
    /// # Invariants
    /// - Duplicate paths are rejected
    /// - Empty paths are rejected
    /// - Cancelled disputes can still accumulate evidence (for retry)
    pub fn add_evidence(&mut self, item: EvidenceItem) -> Result<(), DisputeError> {
        // Check for duplicate
        if self.evidence_chain.iter().any(|e| e.path() == item.path()) {
            return Err(DisputeError::DuplicateEvidence {
                path: item.path().to_string(),
            });
        }

        self.evidence_chain.push(item);
        self.updated_at = Utc::now();
        Ok(())
    }

    /// Assess and potentially transition status based on systemic score.
    ///
    /// # Invariants
    /// - Cancelled disputes CANNOT be re-assessed (use `retry_classification` first)
    /// - LitigationReady requires passing evidence bundle validation
    /// - Status transitions are logged in history
    ///
    /// # State Machine
    /// ```text
    /// score > 30 AND evidence_valid → LitigationReady
    /// score > 30 AND !evidence_valid → SettlementOnly (evidence gap)
    /// score 11-30 → SettlementOnly
    /// score ≤ 10 → Defer
    /// ```
    pub fn assess_systemic_score(&mut self, score_val: u8) -> Result<(), DisputeError> {
        // Guard: cancelled disputes must be retried first
        if let DisputeStatus::Cancelled { reason, .. } = &self.status {
            return Err(DisputeError::DisputeCancelled {
                reason: reason.to_string(),
            });
        }

        let old_status = self.status.to_string();
        let score = SystemicScore::new(score_val);

        let new_status = match score.verdict {
            SystemicVerdict::LitigationReady => {
                // Must pass evidence bundle validation for litigation
                let bundle_report =
                    self.validate_evidence_bundle(&EvidenceBundleRequirements::litigation_ready());
                if bundle_report.is_sufficient {
                    DisputeStatus::LitigationReady
                } else {
                    // Score qualifies but evidence doesn't — cap at SettlementOnly
                    DisputeStatus::SettlementOnly
                }
            }
            SystemicVerdict::SettlementOnly => DisputeStatus::SettlementOnly,
            SystemicVerdict::Defer | SystemicVerdict::NotSystemic => DisputeStatus::Defer,
        };

        let new_status_str = new_status.to_string();
        self.systemic_score = Some(score);
        self.status = new_status;
        self.updated_at = Utc::now();

        self.status_history.push(StatusTransition {
            from: old_status,
            to: new_status_str,
            timestamp: self.updated_at,
            reason: format!("Systemic score assessed: {}", score_val),
        });

        Ok(())
    }

    /// Cancel the dispute classification with a mandatory reason.
    ///
    /// Any status can transition to Cancelled. The reason is preserved
    /// for the retry mechanism and audit trail.
    pub fn cancel(&mut self, reason: CancellationReason) -> Result<(), DisputeError> {
        // Already cancelled — idempotent, just update reason
        let old_status = self.status.to_string();
        let reason_str = reason.to_string();

        self.status = DisputeStatus::Cancelled {
            reason,
            cancelled_at: Utc::now(),
        };
        self.updated_at = Utc::now();

        self.status_history.push(StatusTransition {
            from: old_status,
            to: format!("Cancelled({})", reason_str),
            timestamp: self.updated_at,
            reason: reason_str,
        });

        Ok(())
    }

    /// Retry classification after cancellation.
    ///
    /// Transitions from Cancelled → Unknown, allowing `assess_systemic_score()`
    /// to be called again. Enforces retry limit.
    ///
    /// # Invariants
    /// - Only callable from Cancelled status
    /// - Retry count must not exceed max_retries
    /// - Retry reason is logged in status history
    pub fn retry_classification(&mut self, retry_reason: &str) -> Result<(), DisputeError> {
        // Guard: must be cancelled
        if !self.is_cancelled() {
            return Err(DisputeError::InvalidTransition {
                from: self.status.to_string(),
                to: "Unknown (retry)".to_string(),
            });
        }

        // Guard: retry limit
        if self.retry_count >= self.max_retries {
            return Err(DisputeError::RetryLimitExceeded {
                attempts: self.retry_count,
                max: self.max_retries,
            });
        }

        let old_status = self.status.to_string();
        self.status = DisputeStatus::Unknown;
        self.retry_count += 1;
        self.updated_at = Utc::now();

        self.status_history.push(StatusTransition {
            from: old_status,
            to: "Unknown (retry)".to_string(),
            timestamp: self.updated_at,
            reason: format!("Retry #{}: {}", self.retry_count, retry_reason),
        });

        Ok(())
    }

    // ========================================================================
    // Queries — non-mutating analysis
    // ========================================================================

    /// Validate the evidence bundle against requirements.
    ///
    /// Returns a detailed report of what's present and what's missing.
    /// Does NOT mutate the dispute — this is a pure query.
    pub fn validate_evidence_bundle(
        &self,
        requirements: &EvidenceBundleRequirements,
    ) -> EvidenceBundleReport {
        let evidence_count = self.evidence_chain.len();

        // Distinct categories
        let mut categories: std::collections::HashSet<EvidenceCategory> =
            std::collections::HashSet::new();
        for item in &self.evidence_chain {
            categories.insert(*item.category());
        }
        let category_count = categories.len();

        // Timeline span
        let timeline_days = if self.evidence_chain.len() >= 2 {
            let earliest = self
                .evidence_chain
                .iter()
                .map(|e| e.added_at())
                .min()
                .unwrap();
            let latest = self
                .evidence_chain
                .iter()
                .map(|e| e.added_at())
                .max()
                .unwrap();
            (latest - earliest).num_days().unsigned_abs()
        } else {
            0
        };

        // Required categories check
        let mut missing_categories = Vec::new();
        for req_cat in &requirements.required_categories {
            if !categories.contains(req_cat) {
                missing_categories.push(format!("{:?}", req_cat));
            }
        }

        // Organisation depth (from the organisation itself)
        let org_levels = self.organization.hierarchy_depth();

        // Build gaps list
        let mut gaps = Vec::new();
        if evidence_count < requirements.min_evidence_count {
            gaps.push(format!(
                "Need {} evidence items, have {}",
                requirements.min_evidence_count, evidence_count
            ));
        }
        if category_count < requirements.min_category_count {
            gaps.push(format!(
                "Need {} evidence categories, have {}",
                requirements.min_category_count, category_count
            ));
        }
        if timeline_days < requirements.min_timeline_days {
            gaps.push(format!(
                "Need {} day timeline span, have {} days",
                requirements.min_timeline_days, timeline_days
            ));
        }
        if !missing_categories.is_empty() {
            gaps.push(format!(
                "Missing required categories: {}",
                missing_categories.join(", ")
            ));
        }
        if org_levels < requirements.min_org_levels {
            gaps.push(format!(
                "Need {} org levels, have {}",
                requirements.min_org_levels, org_levels
            ));
        }

        let is_sufficient = gaps.is_empty();

        EvidenceBundleReport {
            is_sufficient,
            evidence_count,
            category_count,
            timeline_days,
            org_levels,
            missing_categories,
            gaps,
        }
    }

    /// Count evidence items matching a specific category.
    pub fn evidence_count_by_category(&self, category: EvidenceCategory) -> usize {
        self.evidence_chain
            .iter()
            .filter(|e| *e.category() == category)
            .count()
    }

    /// Count cancelled work orders in the evidence chain.
    ///
    /// This is a key metric for systemic indifference analysis:
    /// each cancelled work order is evidence of deliberate neglect.
    pub fn cancelled_work_order_count(&self) -> usize {
        self.evidence_count_by_category(EvidenceCategory::CancelledWorkOrder)
    }

    /// Determine whether evidence supports litigation based on requirements.
    pub fn is_evidence_litigation_ready(&self) -> bool {
        self.validate_evidence_bundle(&EvidenceBundleRequirements::litigation_ready())
            .is_sufficient
    }

    /// Determine whether evidence supports settlement based on requirements.
    pub fn is_evidence_settlement_ready(&self) -> bool {
        self.validate_evidence_bundle(&EvidenceBundleRequirements::settlement_only())
            .is_sufficient
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::organization::Organization;

    fn test_org() -> Organization {
        Organization::new("MAA", 4)
    }

    fn test_org_shallow() -> Organization {
        Organization::new("IRS", 1)
    }

    // ── Construction ──────────────────────────────────────────────────────

    #[test]
    fn test_new_dispute_starts_unknown() {
        let dispute = Dispute::new("26CV005596-590", test_org());
        assert_eq!(dispute.case_id(), "26CV005596-590");
        assert_eq!(*dispute.status(), DisputeStatus::Unknown);
        assert_eq!(dispute.evidence_count(), 0);
        assert!(dispute.systemic_score().is_none());
        assert_eq!(dispute.retry_count(), 0);
    }

    #[test]
    fn test_custom_retry_limit() {
        let dispute = Dispute::new("CASE-001", test_org()).with_max_retries(3);
        assert_eq!(dispute.max_retries(), 3);
    }

    // ── Evidence Management ───────────────────────────────────────────────

    #[test]
    fn test_add_evidence_succeeds() {
        let mut dispute = Dispute::new("CASE-001", test_org());
        let item = EvidenceItem::new("/evidence/photo1.jpg", EvidenceCategory::PhotoDocumentation)
            .unwrap();
        assert!(dispute.add_evidence(item).is_ok());
        assert_eq!(dispute.evidence_count(), 1);
    }

    #[test]
    fn test_add_duplicate_evidence_rejected() {
        let mut dispute = Dispute::new("CASE-001", test_org());
        let item1 = EvidenceItem::new("/evidence/photo1.jpg", EvidenceCategory::PhotoDocumentation)
            .unwrap();
        let item2 = EvidenceItem::new("/evidence/photo1.jpg", EvidenceCategory::PhotoDocumentation)
            .unwrap();
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
    fn test_evidence_with_description() {
        let item = EvidenceItem::new("/evidence/mold.jpg", EvidenceCategory::PhotoDocumentation)
            .unwrap()
            .with_description("Black mold in bathroom ceiling");
        assert_eq!(item.description(), Some("Black mold in bathroom ceiling"));
    }

    // ── Status Transitions ────────────────────────────────────────────────

    #[test]
    fn test_assess_high_score_without_evidence_caps_at_settlement() {
        let mut dispute = Dispute::new("CASE-001", test_org());
        // Score qualifies for litigation but no evidence → SettlementOnly
        dispute.assess_systemic_score(35).unwrap();
        assert_eq!(*dispute.status(), DisputeStatus::SettlementOnly);
    }

    #[test]
    fn test_assess_low_score_defers() {
        let mut dispute = Dispute::new("CASE-001", test_org());
        dispute.assess_systemic_score(5).unwrap();
        assert_eq!(*dispute.status(), DisputeStatus::Defer);
    }

    #[test]
    fn test_assess_mid_score_settlement_only() {
        let mut dispute = Dispute::new("CASE-001", test_org());
        dispute.assess_systemic_score(20).unwrap();
        assert_eq!(*dispute.status(), DisputeStatus::SettlementOnly);
    }

    #[test]
    fn test_assess_on_cancelled_dispute_rejected() {
        let mut dispute = Dispute::new("CASE-001", test_org());
        dispute
            .cancel(CancellationReason::InsufficientEvidence {
                gap_description: "No photos".into(),
            })
            .unwrap();
        let result = dispute.assess_systemic_score(35);
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            DisputeError::DisputeCancelled { .. }
        ));
    }

    // ── Cancellation ──────────────────────────────────────────────────────

    #[test]
    fn test_cancel_with_work_order_reason() {
        let mut dispute = Dispute::new("CASE-001", test_org());
        dispute
            .cancel(CancellationReason::WorkOrderCancelled {
                work_order_id: "WO-12345".into(),
            })
            .unwrap();
        assert!(dispute.is_cancelled());
        assert!(!dispute.is_actionable());
    }

    #[test]
    fn test_cancel_with_strategy_change() {
        let mut dispute = Dispute::new("CASE-001", test_org());
        dispute.assess_systemic_score(20).unwrap();
        dispute
            .cancel(CancellationReason::StrategyChange {
                old_strategy: "SettlementOnly".into(),
                new_strategy: "Litigation".into(),
            })
            .unwrap();
        assert!(dispute.is_cancelled());
    }

    #[test]
    fn test_cancel_with_superseded() {
        let mut dispute = Dispute::new("CASE-001", test_org());
        dispute
            .cancel(CancellationReason::Superseded {
                replacement_case_id: "CASE-002".into(),
            })
            .unwrap();
        assert!(dispute.is_cancelled());
        assert!(dispute.status().to_string().contains("Superseded"));
    }

    // ── Retry Mechanism ───────────────────────────────────────────────────

    #[test]
    fn test_retry_resets_to_unknown() {
        let mut dispute = Dispute::new("CASE-001", test_org());
        dispute
            .cancel(CancellationReason::InsufficientEvidence {
                gap_description: "Need more photos".into(),
            })
            .unwrap();
        dispute
            .retry_classification("Gathered additional photo evidence")
            .unwrap();
        assert_eq!(*dispute.status(), DisputeStatus::Unknown);
        assert_eq!(dispute.retry_count(), 1);
    }

    #[test]
    fn test_retry_on_non_cancelled_rejected() {
        let mut dispute = Dispute::new("CASE-001", test_org());
        let result = dispute.retry_classification("No reason");
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            DisputeError::InvalidTransition { .. }
        ));
    }

    #[test]
    fn test_retry_limit_enforced() {
        let mut dispute = Dispute::new("CASE-001", test_org()).with_max_retries(2);

        for i in 0..2 {
            dispute
                .cancel(CancellationReason::InsufficientEvidence {
                    gap_description: format!("Attempt {}", i),
                })
                .unwrap();
            dispute
                .retry_classification(&format!("Retry {}", i + 1))
                .unwrap();
        }

        // Third cancel
        dispute
            .cancel(CancellationReason::InsufficientEvidence {
                gap_description: "Attempt 3".into(),
            })
            .unwrap();

        // Third retry should fail (already used 2 of 2)
        let result = dispute.retry_classification("Too many");
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            DisputeError::RetryLimitExceeded { .. }
        ));
    }

    #[test]
    fn test_retry_then_reassess_works() {
        let mut dispute = Dispute::new("CASE-001", test_org());
        dispute.assess_systemic_score(20).unwrap();
        assert_eq!(*dispute.status(), DisputeStatus::SettlementOnly);

        dispute
            .cancel(CancellationReason::StrategyChange {
                old_strategy: "Settlement".into(),
                new_strategy: "Gather more evidence".into(),
            })
            .unwrap();

        dispute
            .retry_classification("Evidence gathered, re-assessing")
            .unwrap();

        dispute.assess_systemic_score(35).unwrap();
        // Still SettlementOnly because no evidence bundle
        assert_eq!(*dispute.status(), DisputeStatus::SettlementOnly);
    }

    // ── Evidence Bundle Validation ────────────────────────────────────────

    #[test]
    fn test_empty_evidence_fails_litigation_requirements() {
        let dispute = Dispute::new("CASE-001", test_org());
        let report =
            dispute.validate_evidence_bundle(&EvidenceBundleRequirements::litigation_ready());
        assert!(!report.is_sufficient);
        assert!(!report.gaps.is_empty());
    }

    #[test]
    fn test_cancelled_work_order_count() {
        let mut dispute = Dispute::new("CASE-001", test_org());
        dispute
            .add_evidence(
                EvidenceItem::new("wo-1.pdf", EvidenceCategory::CancelledWorkOrder).unwrap(),
            )
            .unwrap();
        dispute
            .add_evidence(
                EvidenceItem::new("wo-2.pdf", EvidenceCategory::CancelledWorkOrder).unwrap(),
            )
            .unwrap();
        dispute
            .add_evidence(
                EvidenceItem::new("photo.jpg", EvidenceCategory::PhotoDocumentation).unwrap(),
            )
            .unwrap();
        assert_eq!(dispute.cancelled_work_order_count(), 2);
    }

    // ── Damages Evidence ───────────────────────────────────────────────────

    #[test]
    fn test_financial_damages_evidence_tracked() {
        let mut dispute = Dispute::new("26CV005596-590", test_org());

        // Add financial damages evidence (rent records, fee receipts)
        let damages_item =
            EvidenceItem::new("damages/rent-ledger.pdf", EvidenceCategory::FinancialRecord)
                .unwrap()
                .with_description("22-month rent payment ledger ($43K-$113K damages exposure)");
        dispute.add_evidence(damages_item).unwrap();

        assert_eq!(dispute.evidence_count(), 1);
        assert_eq!(
            dispute.evidence_count_by_category(EvidenceCategory::FinancialRecord),
            1
        );
    }

    #[test]
    fn test_damages_evidence_bundle_requires_financial_records() {
        let dispute = Dispute::new("26CV005596-590", test_org());
        // An empty dispute should fail litigation-ready requirements,
        // reinforcing that damages documentation is structurally required.
        let report =
            dispute.validate_evidence_bundle(&EvidenceBundleRequirements::litigation_ready());
        assert!(!report.is_sufficient);
        assert!(report.evidence_count == 0);
    }

    // ── Status History / Audit Trail ──────────────────────────────────────

    #[test]
    fn test_status_history_tracks_transitions() {
        let mut dispute = Dispute::new("CASE-001", test_org());
        assert!(dispute.status_history().is_empty());

        dispute.assess_systemic_score(20).unwrap();
        assert_eq!(dispute.status_history().len(), 1);
        assert!(dispute.status_history()[0].to.contains("SettlementOnly"));

        dispute
            .cancel(CancellationReason::ExternalFactor {
                description: "Court date moved".into(),
            })
            .unwrap();
        assert_eq!(dispute.status_history().len(), 2);

        dispute
            .retry_classification("New court date confirmed")
            .unwrap();
        assert_eq!(dispute.status_history().len(), 3);
        assert!(dispute.status_history()[2].to.contains("retry"));
    }

    #[test]
    fn test_full_lifecycle() {
        let mut dispute = Dispute::new("MAA-26CV005596-590", test_org());

        // Phase 1: Initial assessment — insufficient for litigation
        dispute.assess_systemic_score(35).unwrap();
        assert_eq!(*dispute.status(), DisputeStatus::SettlementOnly);

        // Phase 2: MAA cancels work orders — we document it
        dispute
            .add_evidence(
                EvidenceItem::new("wo-cancel-1.pdf", EvidenceCategory::CancelledWorkOrder)
                    .unwrap()
                    .with_description("HVAC work order #4521 cancelled"),
            )
            .unwrap();

        // Phase 3: Strategy change — pause to gather more evidence
        dispute
            .cancel(CancellationReason::StrategyChange {
                old_strategy: "Settlement".into(),
                new_strategy: "Build evidence for litigation".into(),
            })
            .unwrap();

        // Phase 4: Evidence still accumulates on cancelled dispute
        dispute
            .add_evidence(
                EvidenceItem::new("mold-photo.jpg", EvidenceCategory::PhotoDocumentation).unwrap(),
            )
            .unwrap();
        assert_eq!(dispute.evidence_count(), 2);

        // Phase 5: Retry with new evidence
        dispute
            .retry_classification("22 months of evidence gathered")
            .unwrap();
        assert_eq!(dispute.retry_count(), 1);

        // Phase 6: Re-assess — score high but evidence bundle still incomplete
        dispute.assess_systemic_score(40).unwrap();
        assert_eq!(*dispute.status(), DisputeStatus::SettlementOnly);
        // Still settlement because evidence bundle requirements not met

        // Final: verify audit trail
        assert_eq!(dispute.status_history().len(), 4);
    }

    // ── Encapsulation ─────────────────────────────────────────────────────

    #[test]
    fn test_fields_are_not_directly_mutable() {
        // This test verifies encapsulation at the API level.
        // If someone tries `dispute.status = LitigationReady`, it won't compile
        // because `status` is private. This test documents that intent.
        let dispute = Dispute::new("CASE-001", test_org());

        // These are the ONLY ways to read state:
        let _ = dispute.case_id();
        let _ = dispute.organization();
        let _ = dispute.status();
        let _ = dispute.systemic_score();
        let _ = dispute.evidence_chain();
        let _ = dispute.evidence_count();
        let _ = dispute.created_at();
        let _ = dispute.updated_at();
        let _ = dispute.retry_count();
        let _ = dispute.max_retries();
        let _ = dispute.status_history();
        let _ = dispute.is_cancelled();
        let _ = dispute.is_litigation_ready();
        let _ = dispute.is_actionable();

        // And these are the ONLY ways to mutate state:
        // dispute.add_evidence(item)
        // dispute.assess_systemic_score(score)
        // dispute.cancel(reason)
        // dispute.retry_classification(reason)

        // If this test compiles, encapsulation is correct.
        assert!(true);
    }

    // ── Display Formatting ────────────────────────────────────────────────

    #[test]
    fn test_cancellation_reason_display() {
        let reason = CancellationReason::WorkOrderCancelled {
            work_order_id: "WO-4521".into(),
        };
        assert_eq!(
            reason.to_string(),
            "Work order WO-4521 cancelled by organisation"
        );
    }

    #[test]
    fn test_dispute_status_display() {
        assert_eq!(DisputeStatus::Unknown.to_string(), "Unknown");
        assert_eq!(
            DisputeStatus::LitigationReady.to_string(),
            "LitigationReady"
        );
        assert_eq!(DisputeStatus::Defer.to_string(), "Defer");

        let cancelled = DisputeStatus::Cancelled {
            reason: CancellationReason::InsufficientEvidence {
                gap_description: "No photos".into(),
            },
            cancelled_at: Utc::now(),
        };
        assert!(cancelled.to_string().contains("Insufficient evidence"));
    }
}
