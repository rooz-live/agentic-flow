//! Validation Domain Integration Tests
//!
//! DoR: validation module compiles; AggregateRoot trait defined
//! DoD: ValidationReport lifecycle, EmailDocument parsing, AggregateRoot compliance

use rust_core::domain::aggregate_root::AggregateRoot;
use rust_core::validation::{
    CheckResult, EmailDocument, Severity, ValidationReport, Verdict,
};

// ============================================================================
// ValidationReport Aggregate Root
// ============================================================================

#[test]
fn test_validation_report_new_is_empty() {
    let report = ValidationReport::new("test.eml");
    assert!(report.checks.is_empty());
    assert_eq!(report.overall_verdict, Verdict::Pass);
    assert_eq!(report.pass_count, 0);
    assert_eq!(report.fail_count, 0);
}

#[test]
fn test_validation_report_aggregate_id_is_unique() {
    let r1 = ValidationReport::new("a.eml");
    let r2 = ValidationReport::new("b.eml");
    assert_ne!(r1.aggregate_id(), r2.aggregate_id());
}

#[test]
fn test_validation_report_add_passing_check() {
    let mut report = ValidationReport::new("test.eml");
    report.add_check(CheckResult::passed("no-placeholders", "Clean"));
    assert_eq!(report.pass_count, 1);
    assert_eq!(report.fail_count, 0);
    assert_eq!(report.overall_verdict, Verdict::Pass);
    assert_eq!(report.coverage_percentage(), 100.0);
}

#[test]
fn test_validation_report_add_failing_check_changes_verdict() {
    let mut report = ValidationReport::new("test.eml");
    report.add_check(CheckResult::passed("check-1", "OK"));
    report.add_check(CheckResult::failed("check-2", Severity::Critical, "Placeholder found"));
    assert_eq!(report.overall_verdict, Verdict::Fail);
    assert_eq!(report.fail_count, 1);
    assert_eq!(report.coverage_snapshot(), "1/2");
}

#[test]
fn test_validation_report_finalize_records_elapsed() {
    let mut report = ValidationReport::new("test.eml");
    report.finalize(42);
    assert_eq!(report.metadata.elapsed_ms, 42);
}

#[test]
fn test_validation_report_coverage_empty() {
    let report = ValidationReport::new("test.eml");
    assert_eq!(report.coverage_percentage(), 0.0);
}

// ============================================================================
// EmailDocument Parsing
// ============================================================================

#[test]
fn test_email_document_parses_headers() {
    let content = "Subject: Court Filing\nFrom: sb@example.com\nTo: court@example.com\n\nBody text";
    let doc = EmailDocument::from_content(content.to_string(), "filing.eml");
    assert_eq!(doc.subject, Some("Court Filing".to_string()));
    assert_eq!(doc.from, Some("sb@example.com".to_string()));
    assert_eq!(doc.to, Some("court@example.com".to_string()));
    assert_eq!(doc.metadata.line_count, 5);
}

#[test]
fn test_email_document_no_headers() {
    let doc = EmailDocument::from_content("Just plain text".to_string(), "plain.txt");
    assert_eq!(doc.subject, None);
    assert_eq!(doc.from, None);
    assert_eq!(doc.to, None);
    assert_eq!(doc.metadata.size_bytes, 15);
}

// ============================================================================
// AggregateRoot Trait Compliance
// ============================================================================

#[test]
fn test_validation_report_implements_aggregate_root() {
    let report = ValidationReport::new("test.eml");
    // Trait method works and returns non-nil UUID
    let id = report.aggregate_id();
    assert_ne!(id, uuid::Uuid::nil());
}

#[test]
fn test_validation_report_default_version() {
    let report = ValidationReport::new("test.eml");
    // Default AggregateRoot::version() returns 0
    assert_eq!(report.version(), 0);
}

// ============================================================================
// Blocked Verdict Precedence
// ============================================================================

#[test]
fn test_blocked_verdict_takes_precedence_over_fail() {
    let mut report = ValidationReport::new("test.eml");
    report.add_check(CheckResult::passed("c1", "ok"));
    report.add_check(CheckResult::failed("c2", Severity::Warning, "minor"));
    report.add_check(CheckResult {
        check_name: "c3".into(),
        verdict: Verdict::Blocked,
        severity: Severity::Critical,
        message: "Cannot verify — file missing".into(),
        evidence: None,
    });
    assert_eq!(report.overall_verdict, Verdict::Blocked);
}

// ============================================================================
// Serialize Roundtrip (COH-009)
// ============================================================================

#[test]
fn test_validation_report_serialize_roundtrip() {
    let mut report = ValidationReport::new("roundtrip.eml");
    report.add_check(CheckResult::passed("ser_test", "serialize ok"));
    report.add_check(
        CheckResult::failed("deser_test", Severity::Warning, "minor")
            .with_evidence("line 42: placeholder [TODO]"),
    );
    report.finalize(100);

    let json = serde_json::to_string(&report).expect("serialize");
    let deser: ValidationReport = serde_json::from_str(&json).expect("deserialize");

    assert_eq!(deser.id, report.id);
    assert_eq!(deser.checks.len(), 2);
    assert_eq!(deser.overall_verdict, Verdict::Fail);
    assert_eq!(deser.pass_count, 1);
    assert_eq!(deser.fail_count, 1);
    assert_eq!(deser.metadata.elapsed_ms, 100);
    assert_eq!(deser.checks[1].evidence.as_deref(), Some("line 42: placeholder [TODO]"));
}

// ============================================================================
// Value Objects — PlaceholderCheck, LegalCitation, AttachmentCheck
// ============================================================================

#[test]
fn test_legal_citation_value_object() {
    use rust_core::validation::LegalCitation;
    let cite = LegalCitation::new("§ 42-42");
    assert_eq!(cite.statute_type, "N.C.G.S.");
    assert_eq!(cite.section, "§ 42-42");
}

#[test]
fn test_attachment_check_scan() {
    use rust_core::validation::AttachmentCheck;
    let check = AttachmentCheck::scan("Please see the attached exhibit and enclosed documents.");
    assert!(check.attachments_mentioned >= 2); // attached + enclosed at minimum
    assert!(check.references_found.contains(&"attached".to_string()));
    assert!(check.references_found.contains(&"enclosed".to_string()));
}
