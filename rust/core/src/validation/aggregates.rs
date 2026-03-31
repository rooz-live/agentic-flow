//! Aggregates - Domain roots with identity and lifecycle
//!
//! DoR: value_objects module compiled with Verdict/CheckResult/Severity types
//! DoD: ValidationReport implements AggregateRoot trait, EmailDocument parses
//!      headers, all fields Serialize/Deserialize, lifecycle tests pass

use super::value_objects::{CheckResult, Verdict};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// ValidationReport - Aggregate Root
///
/// The root entity for the validation bounded context. Maintains consistency
/// across all validation checks within a single validation run.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationReport {
    pub id: Uuid,
    pub created_at: DateTime<Utc>,
    pub checks: Vec<CheckResult>,
    pub overall_verdict: Verdict,
    pub pass_count: usize,
    pub fail_count: usize,
    pub metadata: ValidationMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationMetadata {
    pub file_path: String,
    pub validator_version: String,
    pub elapsed_ms: u64,
}

impl ValidationReport {
    pub fn new(file_path: impl Into<String>) -> Self {
        Self {
            id: Uuid::new_v4(),
            created_at: Utc::now(),
            checks: Vec::new(),
            overall_verdict: Verdict::Pass,
            pass_count: 0,
            fail_count: 0,
            metadata: ValidationMetadata {
                file_path: file_path.into(),
                validator_version: env!("CARGO_PKG_VERSION").to_string(),
                elapsed_ms: 0,
            },
        }
    }

    pub fn add_check(&mut self, check: CheckResult) {
        match check.verdict {
            Verdict::Pass => self.pass_count += 1,
            Verdict::Fail | Verdict::Blocked => self.fail_count += 1,
            Verdict::Skip => {}
        }
        self.checks.push(check);
        self.recalculate_verdict();
    }

    fn recalculate_verdict(&mut self) {
        if self.checks.iter().any(|c| c.verdict == Verdict::Blocked) {
            self.overall_verdict = Verdict::Blocked;
        } else if self.fail_count > 0 {
            self.overall_verdict = Verdict::Fail;
        } else {
            self.overall_verdict = Verdict::Pass;
        }
    }

    pub fn finalize(&mut self, elapsed_ms: u64) {
        self.metadata.elapsed_ms = elapsed_ms;
    }

    pub fn coverage_snapshot(&self) -> String {
        format!("{}/{}", self.pass_count, self.checks.len())
    }

    pub fn coverage_percentage(&self) -> f64 {
        if self.checks.is_empty() {
            return 0.0;
        }
        (self.pass_count as f64 / self.checks.len() as f64) * 100.0
    }
}

/// DDD Aggregate Root — ValidationReport is the root for the validation bounded context.
///
/// DoR: ValidationReport fields Serialize/Deserialize; AggregateRoot trait importable
/// DoD: aggregate_id() returns report UUID; checks accumulate with verdict recalculation;
///      coverage metrics tested; validation domain exportable for compound intelligence (COH-009)
impl crate::domain::aggregate_root::AggregateRoot for ValidationReport {
    fn aggregate_id(&self) -> Uuid {
        self.id
    }
}

/// EmailDocument - Entity representing the document being validated
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmailDocument {
    pub id: Uuid,
    pub content: String,
    pub subject: Option<String>,
    pub from: Option<String>,
    pub to: Option<String>,
    pub metadata: DocumentMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentMetadata {
    pub file_path: String,
    pub created_at: DateTime<Utc>,
    pub size_bytes: usize,
    pub line_count: usize,
}

impl EmailDocument {
    pub fn from_content(content: String, file_path: impl Into<String>) -> Self {
        let line_count = content.lines().count();
        let size_bytes = content.len();

        Self {
            id: Uuid::new_v4(),
            subject: Self::extract_subject(&content),
            from: Self::extract_from(&content),
            to: Self::extract_to(&content),
            content,
            metadata: DocumentMetadata {
                file_path: file_path.into(),
                created_at: Utc::now(),
                size_bytes,
                line_count,
            },
        }
    }

    fn extract_subject(content: &str) -> Option<String> {
        content
            .lines()
            .find(|line| line.to_lowercase().starts_with("subject:"))
            .map(|line| line.trim_start_matches("Subject:").trim().to_string())
    }

    fn extract_from(content: &str) -> Option<String> {
        content
            .lines()
            .find(|line| line.to_lowercase().starts_with("from:"))
            .map(|line| line.trim_start_matches("From:").trim().to_string())
    }

    fn extract_to(content: &str) -> Option<String> {
        content
            .lines()
            .find(|line| line.to_lowercase().starts_with("to:"))
            .map(|line| line.trim_start_matches("To:").trim().to_string())
    }
}

/// ValidationSession - Aggregate Root for tracking multiple validation runs
///
/// Manages the lifecycle of a validation session that may involve multiple
/// documents or multiple validation passes over time.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationSession {
    pub id: Uuid,
    pub created_at: DateTime<Utc>,
    pub reports: Vec<Uuid>,  // References to ValidationReport IDs
    pub session_type: SessionType,
    pub status: SessionStatus,
    pub metadata: SessionMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SessionType {
    SingleDocument,
    Batch,
    Continuous,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SessionStatus {
    Active,
    Completed,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionMetadata {
    pub description: String,
    pub started_by: String,
    pub total_documents: usize,
}

impl ValidationSession {
    pub fn new(session_type: SessionType, description: impl Into<String>) -> Self {
        Self {
            id: Uuid::new_v4(),
            created_at: Utc::now(),
            reports: Vec::new(),
            session_type,
            status: SessionStatus::Active,
            metadata: SessionMetadata {
                description: description.into(),
                started_by: "system".to_string(),
                total_documents: 0,
            },
        }
    }

    pub fn add_report(&mut self, report_id: Uuid) {
        self.reports.push(report_id);
        self.metadata.total_documents = self.reports.len();
    }

    pub fn complete(&mut self) {
        self.status = SessionStatus::Completed;
    }

    pub fn fail(&mut self) {
        self.status = SessionStatus::Failed;
    }
}

impl crate::domain::aggregate_root::AggregateRoot for ValidationSession {
    fn aggregate_id(&self) -> Uuid {
        self.id
    }
}

/// ValidationRule - Aggregate Root for configurable validation rules
///
/// Represents a validation rule that can be enabled/disabled and configured
/// with specific thresholds and parameters.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationRule {
    pub id: Uuid,
    pub created_at: DateTime<Utc>,
    pub rule_name: String,
    pub rule_type: RuleType,
    pub enabled: bool,
    pub severity: super::value_objects::Severity,
    pub config: RuleConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RuleType {
    PlaceholderCheck,
    LegalCitation,
    ProSeSignature,
    AttachmentReference,
    Custom(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuleConfig {
    pub patterns: Vec<String>,
    pub threshold: Option<usize>,
    pub is_blocking: bool,
}

impl ValidationRule {
    pub fn new(
        name: impl Into<String>,
        rule_type: RuleType,
        severity: super::value_objects::Severity,
    ) -> Self {
        Self {
            id: Uuid::new_v4(),
            created_at: Utc::now(),
            rule_name: name.into(),
            rule_type,
            enabled: true,
            severity,
            config: RuleConfig {
                patterns: Vec::new(),
                threshold: None,
                is_blocking: false,
            },
        }
    }

    pub fn with_patterns(mut self, patterns: Vec<String>) -> Self {
        self.config.patterns = patterns;
        self
    }

    pub fn with_threshold(mut self, threshold: usize) -> Self {
        self.config.threshold = Some(threshold);
        self
    }

    pub fn set_blocking(mut self, blocking: bool) -> Self {
        self.config.is_blocking = blocking;
        self
    }

    pub fn enable(&mut self) {
        self.enabled = true;
    }

    pub fn disable(&mut self) {
        self.enabled = false;
    }
}

impl crate::domain::aggregate_root::AggregateRoot for ValidationRule {
    fn aggregate_id(&self) -> Uuid {
        self.id
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::validation::value_objects::Severity;

    #[test]
    fn test_validation_report_lifecycle() {
        let mut report = ValidationReport::new("test.eml");
        assert_eq!(report.overall_verdict, Verdict::Pass);
        assert_eq!(report.checks.len(), 0);

        report.add_check(CheckResult::passed("test1", "All good"));
        assert_eq!(report.pass_count, 1);
        assert_eq!(report.overall_verdict, Verdict::Pass);

        report.add_check(CheckResult::failed("test2", Severity::Critical, "Failed"));
        assert_eq!(report.fail_count, 1);
        assert_eq!(report.overall_verdict, Verdict::Fail);

        assert_eq!(report.coverage_snapshot(), "1/2");
        assert_eq!(report.coverage_percentage(), 50.0);
    }

    #[test]
    fn test_email_document_parsing() {
        let content = "Subject: Test Email\nFrom: test@example.com\nTo: recipient@example.com\n\nBody content";
        let doc = EmailDocument::from_content(content.to_string(), "test.eml");

        assert_eq!(doc.subject, Some("Test Email".to_string()));
        assert_eq!(doc.from, Some("test@example.com".to_string()));
        assert_eq!(doc.to, Some("recipient@example.com".to_string()));
        assert_eq!(doc.metadata.line_count, 5);
    }

    #[test]
    fn test_validation_session_lifecycle() {
        let mut session = ValidationSession::new(SessionType::Batch, "Test session");
        assert_eq!(session.status, SessionStatus::Active);
        assert_eq!(session.reports.len(), 0);

        let report_id = Uuid::new_v4();
        session.add_report(report_id);
        assert_eq!(session.reports.len(), 1);
        assert_eq!(session.metadata.total_documents, 1);

        session.complete();
        assert_eq!(session.status, SessionStatus::Completed);
    }

    #[test]
    fn test_validation_rule_configuration() {
        let rule = ValidationRule::new("placeholder_check", RuleType::PlaceholderCheck, Severity::Critical)
            .with_patterns(vec!["TODO".to_string(), "FIXME".to_string()])
            .with_threshold(0)
            .set_blocking(true);

        assert!(rule.enabled);
        assert_eq!(rule.config.patterns.len(), 2);
        assert_eq!(rule.config.threshold, Some(0));
        assert!(rule.config.is_blocking);
    }
}
