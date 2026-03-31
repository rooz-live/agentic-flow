//! Domain Services - Business logic coordination

use super::aggregates::{EmailDocument, ValidationReport};
use super::value_objects::{
    AttachmentCheck, CheckResult, ProSeSignature, Severity,
};
use super::ValidationResult;

/// EmailValidatorService - Coordinates validation checks
#[derive(Debug, Clone)]
pub struct EmailValidatorService;

impl EmailValidatorService {
    pub fn new() -> Self {
        Self
    }

    pub fn validate(&self, document: &EmailDocument) -> ValidationResult<ValidationReport> {
        let start = std::time::Instant::now();
        let mut report = ValidationReport::new(&document.metadata.file_path);

        // Check 1: Placeholders
        let placeholder_result = self.check_placeholders(&document.content);
        report.add_check(placeholder_result);

        // Check 2: Legal citations
        let legal_result = self.check_legal_citations(&document.content);
        report.add_check(legal_result);

        // Check 3: Pro se signature
        let signature_result = self.check_pro_se_signature(&document.content);
        report.add_check(signature_result);

        // Check 4: Attachments
        let attachment_result = self.check_attachments(&document.content);
        report.add_check(attachment_result);

        report.finalize(start.elapsed().as_millis() as u64);
        Ok(report)
    }

    fn check_placeholders(&self, content: &str) -> CheckResult {
        let patterns = ["[TODO]", "[YOUR NAME]", "[DATE]", "[FILL IN]", "PLACEHOLDER"];
        let mut found = Vec::new();

        for pattern in &patterns {
            if content.contains(pattern) {
                found.push(pattern.to_string());
            }
        }

        if found.is_empty() {
            CheckResult::passed("placeholder_check", "No placeholders found")
        } else {
            CheckResult::failed(
                "placeholder_check",
                Severity::Critical,
                format!("Placeholders found: {}", found.join(", ")),
            )
            .with_evidence(found.join(", "))
        }
    }

    fn check_legal_citations(&self, content: &str) -> CheckResult {
        let patterns = ["N.C.G.S.", "§", "statute"];
        let has_citation = patterns.iter().any(|p| content.contains(p));

        if has_citation {
            CheckResult::passed(
                "legal_citation_check",
                "Legal citations present",
            )
        } else {
            CheckResult::failed(
                "legal_citation_check",
                Severity::Warning,
                "No legal citations found",
            )
        }
    }

    fn check_pro_se_signature(&self, content: &str) -> CheckResult {
        let sig = ProSeSignature::validate(content);

        if sig.complete {
            CheckResult::passed("pro_se_signature", "Pro se signature complete")
        } else {
            let missing: Vec<&str> = vec![
                if !sig.has_name { "name" } else { "" },
                if !sig.has_pro_se_label { "pro se label" } else { "" },
            ]
            .into_iter()
            .filter(|s| !s.is_empty())
            .collect();

            CheckResult::failed(
                "pro_se_signature",
                Severity::Critical,
                format!("Incomplete signature. Missing: {}", missing.join(", ")),
            )
        }
    }

    fn check_attachments(&self, content: &str) -> CheckResult {
        let attachment_check = AttachmentCheck::scan(content);

        if attachment_check.attachments_mentioned == 0 {
            CheckResult::passed("attachment_check", "No attachment references")
        } else {
            CheckResult::passed(
                "attachment_check",
                format!(
                    "{} attachment reference(s) found",
                    attachment_check.attachments_mentioned
                ),
            )
            .with_evidence(attachment_check.references_found.join(", "))
        }
    }
}

impl Default for EmailValidatorService {
    fn default() -> Self {
        Self::new()
    }
}
