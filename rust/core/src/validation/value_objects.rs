//! Value Objects - Immutable domain primitives

use serde::{Deserialize, Serialize};
use std::fmt;

/// Verdict of a validation check
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Verdict {
    Pass,
    Fail,
    Blocked,
    Skip,
}

impl fmt::Display for Verdict {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Verdict::Pass => write!(f, "PASS"),
            Verdict::Fail => write!(f, "FAIL"),
            Verdict::Blocked => write!(f, "BLOCKED"),
            Verdict::Skip => write!(f, "SKIP"),
        }
    }
}

/// Severity level for validation checks
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Severity {
    Critical,
    Warning,
    Info,
}

/// Result of a single validation check
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckResult {
    pub check_name: String,
    pub verdict: Verdict,
    pub severity: Severity,
    pub message: String,
    pub evidence: Option<String>,
}

impl CheckResult {
    pub fn passed(name: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            check_name: name.into(),
            verdict: Verdict::Pass,
            severity: Severity::Info,
            message: message.into(),
            evidence: None,
        }
    }

    pub fn failed(
        name: impl Into<String>,
        severity: Severity,
        message: impl Into<String>,
    ) -> Self {
        Self {
            check_name: name.into(),
            verdict: Verdict::Fail,
            severity,
            message: message.into(),
            evidence: None,
        }
    }

    pub fn with_evidence(mut self, evidence: impl Into<String>) -> Self {
        self.evidence = Some(evidence.into());
        self
    }
}

/// Placeholder check (e.g. [TODO], [YOUR NAME])
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaceholderCheck {
    pub pattern: String,
    pub found: bool,
    pub location: Option<usize>,
}

/// Legal citation (e.g. N.C.G.S. § 42-42)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LegalCitation {
    pub citation: String,
    pub statute_type: String, // e.g. "N.C.G.S."
    pub section: String,
}

impl LegalCitation {
    pub fn new(citation: impl Into<String>) -> Self {
        let citation_str = citation.into();
        Self {
            statute_type: "N.C.G.S.".to_string(),
            section: citation_str.clone(),
            citation: citation_str,
        }
    }
}

/// Pro se signature elements
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProSeSignature {
    pub has_name: bool,
    pub has_pro_se_label: bool,
    pub has_contact: bool,
    pub complete: bool,
}

impl ProSeSignature {
    pub fn validate(content: &str) -> Self {
        let has_name = content.contains("Shahrooz Bhopti");
        let has_pro_se_label = content.to_lowercase().contains("pro se");
        let has_contact = content.contains("@") || content.contains("919-");
        let complete = has_name && has_pro_se_label;

        Self {
            has_name,
            has_pro_se_label,
            has_contact,
            complete,
        }
    }
}

/// Attachment reference check
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AttachmentCheck {
    pub references_found: Vec<String>,
    pub attachments_mentioned: usize,
}

impl AttachmentCheck {
    pub fn scan(content: &str) -> Self {
        let patterns = ["attached", "attachment", "see exhibit", "enclosed"];
        let content_lower = content.to_lowercase();
        let references_found: Vec<String> = patterns
            .iter()
            .filter(|p| content_lower.contains(*p))
            .map(|s| s.to_string())
            .collect();

        Self {
            attachments_mentioned: references_found.len(),
            references_found,
        }
    }
}
