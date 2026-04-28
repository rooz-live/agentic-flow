//! Document Validation Domain
//!
//! Generates email/document validation tasks from the validation bounded context.
//! Evaluates on check accuracy, coverage percentage, and verdict correctness.
//! Enables cross-domain transfer: WSJF prioritization → validation coherence.

use rand::Rng;
use ruvector_domain_expansion::{
    Domain, DomainEmbedding, DomainId, Evaluation, Solution, Task,
};
use serde::{Deserialize, Serialize};
use std::sync::OnceLock;

const EMBEDDING_DIM: usize = 32;

/// Severity levels matching rust/core/src/validation/value_objects.rs
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub enum Severity {
    Critical,
    Warning,
    Info,
}

/// Verdict matching the validation domain's Verdict enum.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub enum Verdict {
    Pass,
    Fail,
    Blocked,
    Skip,
}

/// A synthetic validation check for domain tasks.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationCheckSpec {
    pub check_name: String,
    pub severity: Severity,
    pub expected_verdict: Verdict,
    pub has_placeholder: bool,
    pub has_legal_citation: bool,
    pub has_pro_se_signature: bool,
    pub has_attachment_ref: bool,
    pub has_10_day_temporal_compliance: bool,
}

/// A document to validate.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentSpec {
    pub file_path: String,
    pub line_count: usize,
    pub has_subject: bool,
    pub has_from: bool,
    pub has_to: bool,
    pub placeholder_count: usize,
    pub citation_count: usize,
    pub checks: Vec<ValidationCheckSpec>,
}

impl DocumentSpec {
    /// Expected pass rate for the document.
    pub fn expected_pass_rate(&self) -> f32 {
        if self.checks.is_empty() {
            return 0.0;
        }
        let passes = self.checks.iter().filter(|c| c.expected_verdict == Verdict::Pass).count();
        passes as f32 / self.checks.len() as f32
    }

    /// Expected overall verdict.
    pub fn expected_verdict(&self) -> Verdict {
        if self.checks.iter().any(|c| c.expected_verdict == Verdict::Blocked) {
            Verdict::Blocked
        } else if self.checks.iter().any(|c| c.expected_verdict == Verdict::Fail) {
            Verdict::Fail
        } else {
            Verdict::Pass
        }
    }
}

/// Document Validation Domain.
///
/// Transfer from WSJF: risk_reduction maps to validation severity weighting,
/// business_value maps to document criticality, time_criticality maps to
/// validation deadline urgency.
pub struct DocumentValidationDomain {
    id: DomainId,
    /// Lazy loaded inference configuration/schema to support LazyLLM memory efficiency
    lazy_inference_schema: OnceLock<serde_json::Value>,
}

impl DocumentValidationDomain {
    pub fn new() -> Self {
        Self {
            id: DomainId("document_validation".into()),
            lazy_inference_schema: OnceLock::new(),
        }
    }

    /// Retrieve or lazily initialize the heavy inference configuration
    fn get_inference_schema(&self) -> &serde_json::Value {
        self.lazy_inference_schema.get_or_init(|| {
            serde_json::json!({
                "inference_mode": "efficient",
                "pruning_enabled": true,
                "supported_check_types": [
                    "placeholder_scan", "legal_citation_check", "pro_se_signature",
                    "attachment_reference", "format_compliance", "date_consistency",
                    "recipient_validation", "subject_line_check", "de_novo_temporal_boundary",
                    "direct_mail_referral_check"
                ]
            })
        })
    }

    fn random_check(&self, rng: &mut impl Rng, difficulty: f32, idx: usize) -> ValidationCheckSpec {
        let schema = self.get_inference_schema();
        let supported_checks = schema["supported_check_types"].as_array().expect("Schema must have supported_check_types");
        let check_names: Vec<&str> = supported_checks.iter().filter_map(|v| v.as_str()).collect();

        let severity = match rng.gen_range(0..3) {
            0 => Severity::Critical,
            1 => Severity::Warning,
            _ => Severity::Info,
        };

        // Higher difficulty = more failures
        let fail_prob = 0.1 + difficulty * 0.5;
        let expected_verdict = if rng.gen::<f32>() < fail_prob {
            if rng.gen::<f32>() < 0.1 { Verdict::Blocked } else { Verdict::Fail }
        } else {
            Verdict::Pass
        };

        let has_placeholder = rng.gen::<f32>() < difficulty * 0.4;
        let has_citation = rng.gen::<f32>() > difficulty * 0.3;
        let has_sig = rng.gen::<f32>() > difficulty * 0.2;
        let has_attach = rng.gen::<f32>() < 0.3;

        let check_name = check_names[idx % check_names.len()].into();
        let is_de_novo = check_name == "de_novo_temporal_boundary";
        
        // If it's a De Novo check, enforce temporal compliance strictly. Failure here often results in Blocked or Fail.
        let has_10_day_temporal_compliance = if is_de_novo {
           rng.gen::<f32>() > difficulty * 0.6 // the harder the difficulty, the higher chance they omit it
        } else {
           true // irrelevant for other checks
        };

        let mut final_expected_verdict = expected_verdict;
        if is_de_novo && !has_10_day_temporal_compliance {
            // Strict jurisdictional temporal limit missed! Overrides pass to blocked/fail
            final_expected_verdict = if rng.gen::<f32>() < 0.5 { Verdict::Blocked } else { Verdict::Fail };
        }

        ValidationCheckSpec {
            check_name,
            severity,
            expected_verdict: final_expected_verdict,
            has_placeholder,
            has_legal_citation: has_citation,
            has_pro_se_signature: has_sig,
            has_attachment_ref: has_attach,
            has_10_day_temporal_compliance,
        }
    }

    fn random_document(&self, rng: &mut impl Rng, difficulty: f32, idx: usize) -> DocumentSpec {
        let n_checks = rng.gen_range(4..=10);
        let checks: Vec<ValidationCheckSpec> = (0..n_checks)
            .map(|j| self.random_check(rng, difficulty, idx * 100 + j))
            .collect();

        let placeholder_count = if rng.gen::<f32>() < difficulty * 0.5 {
            rng.gen_range(1..=5)
        } else {
            0
        };

        DocumentSpec {
            file_path: format!("doc-{:04}.eml", idx),
            line_count: rng.gen_range(20..200),
            has_subject: rng.gen::<f32>() > 0.1,
            has_from: rng.gen::<f32>() > 0.05,
            has_to: rng.gen::<f32>() > 0.05,
            placeholder_count,
            citation_count: rng.gen_range(0..=3),
            checks,
        }
    }
}

impl Domain for DocumentValidationDomain {
    fn id(&self) -> &DomainId {
        &self.id
    }

    fn name(&self) -> &str {
        "Document Validation"
    }

    fn generate_tasks(&self, count: usize, difficulty: f32) -> Vec<Task> {
        let mut rng = rand::thread_rng();
        (0..count)
            .map(|i| {
                let n_docs = rng.gen_range(1..=5);
                let documents: Vec<DocumentSpec> = (0..n_docs)
                    .map(|j| self.random_document(&mut rng, difficulty, i * 100 + j))
                    .collect();

                Task {
                    id: format!("val-task-{:04}", i),
                    domain_id: self.id.clone(),
                    difficulty,
                    spec: serde_json::json!({
                        "task_type": "validate_documents",
                        "documents": documents,
                        "required_outputs": [
                            "check_verdicts",
                            "overall_verdicts",
                            "coverage_percentages",
                            "severity_counts"
                        ],
                    }),
                    constraints: vec![
                        "all verdicts must be Pass, Fail, Blocked, or Skip".into(),
                        "critical failures must result in overall Fail or Blocked".into(),
                        "coverage_percentage = pass_count / total_checks * 100".into(),
                    ],
                }
            })
            .collect()
    }

    fn evaluate(&self, task: &Task, solution: &Solution) -> Evaluation {
        let documents: Vec<DocumentSpec> = task
            .spec
            .get("documents")
            .and_then(|d| serde_json::from_value(d.clone()).ok())
            .unwrap_or_default();

        // Check overall verdict accuracy
        let sol_verdicts: Vec<String> = solution
            .data
            .get("overall_verdicts")
            .and_then(|v| serde_json::from_value(v.clone()).ok())
            .unwrap_or_default();

        let verdict_correct = documents
            .iter()
            .zip(sol_verdicts.iter())
            .filter(|(doc, sol)| {
                let expected = match doc.expected_verdict() {
                    Verdict::Pass => "Pass",
                    Verdict::Fail => "Fail",
                    Verdict::Blocked => "Blocked",
                    Verdict::Skip => "Skip",
                };
                sol.as_str() == expected
            })
            .count();

        let correctness = if documents.is_empty() {
            0.0
        } else {
            verdict_correct as f32 / documents.len() as f32
        };

        // Check coverage accuracy
        let sol_coverages: Vec<f32> = solution
            .data
            .get("coverage_percentages")
            .and_then(|c| serde_json::from_value(c.clone()).ok())
            .unwrap_or_default();

        let coverage_errors: f32 = documents
            .iter()
            .zip(sol_coverages.iter())
            .map(|(doc, sol_cov)| {
                let expected = doc.expected_pass_rate() * 100.0;
                (sol_cov - expected).abs() / 100.0
            })
            .sum();
        let efficiency = if documents.is_empty() {
            0.0
        } else {
            (1.0 - coverage_errors / documents.len() as f32).max(0.0)
        };

        // Severity counts present
        let has_severity = solution.data.get("severity_counts").is_some();
        let has_check_verdicts = solution.data.get("check_verdicts").is_some();
        let elegance = match (has_severity, has_check_verdicts) {
            (true, true) => 0.9,
            (true, false) | (false, true) => 0.5,
            _ => 0.1,
        };

        Evaluation::composite(correctness, efficiency, elegance)
    }

    fn embed(&self, solution: &Solution) -> DomainEmbedding {
        let mut vec = vec![0.0f32; EMBEDDING_DIM];

        // Encode verdict distribution in first 4 dims
        if let Some(verdicts) = solution.data.get("overall_verdicts").and_then(|v| v.as_array()) {
            let total = verdicts.len().max(1) as f32;
            let pass = verdicts.iter().filter(|v| v.as_str() == Some("Pass")).count() as f32;
            let fail = verdicts.iter().filter(|v| v.as_str() == Some("Fail")).count() as f32;
            let blocked = verdicts.iter().filter(|v| v.as_str() == Some("Blocked")).count() as f32;
            let skip = verdicts.iter().filter(|v| v.as_str() == Some("Skip")).count() as f32;
            vec[0] = pass / total;
            vec[1] = fail / total;
            vec[2] = blocked / total;
            vec[3] = skip / total;
        }

        // Encode coverage percentages in dims 4-12
        if let Some(coverages) = solution.data.get("coverage_percentages").and_then(|c| c.as_array()) {
            for (i, c) in coverages.iter().enumerate() {
                if i < 8 {
                    vec[4 + i] = c.as_f64().unwrap_or(0.0) as f32 / 100.0;
                }
            }
        }

        // Encode severity counts in dims 16-18
        if let Some(severity) = solution.data.get("severity_counts").and_then(|s| s.as_object()) {
            if let Some(c) = severity.get("critical").and_then(|v| v.as_f64()) {
                vec[16] = c as f32 / 10.0;
            }
            if let Some(w) = severity.get("warning").and_then(|v| v.as_f64()) {
                vec[17] = w as f32 / 10.0;
            }
            if let Some(i) = severity.get("info").and_then(|v| v.as_f64()) {
                vec[18] = i as f32 / 10.0;
            }
        }

        DomainEmbedding::new(vec, self.id.clone())
    }

    fn embedding_dim(&self) -> usize {
        EMBEDDING_DIM
    }

    fn reference_solution(&self, task: &Task) -> Option<Solution> {
        let documents: Vec<DocumentSpec> = task
            .spec
            .get("documents")
            .and_then(|d| serde_json::from_value(d.clone()).ok())?;

        let overall_verdicts: Vec<&str> = documents
            .iter()
            .map(|doc| match doc.expected_verdict() {
                Verdict::Pass => "Pass",
                Verdict::Fail => "Fail",
                Verdict::Blocked => "Blocked",
                Verdict::Skip => "Skip",
            })
            .collect();

        let coverage_percentages: Vec<f32> = documents
            .iter()
            .map(|doc| doc.expected_pass_rate() * 100.0)
            .collect();

        // Per-document check verdicts
        let check_verdicts: Vec<Vec<&str>> = documents
            .iter()
            .map(|doc| {
                doc.checks
                    .iter()
                    .map(|c| match c.expected_verdict {
                        Verdict::Pass => "Pass",
                        Verdict::Fail => "Fail",
                        Verdict::Blocked => "Blocked",
                        Verdict::Skip => "Skip",
                    })
                    .collect()
            })
            .collect();

        // Severity counts
        let mut critical = 0u32;
        let mut warning = 0u32;
        let mut info = 0u32;
        for doc in &documents {
            for check in &doc.checks {
                if check.expected_verdict == Verdict::Fail || check.expected_verdict == Verdict::Blocked {
                    match check.severity {
                        Severity::Critical => critical += 1,
                        Severity::Warning => warning += 1,
                        Severity::Info => info += 1,
                    }
                }
            }
        }

        Some(Solution {
            task_id: task.id.clone(),
            content: format!("Validated {} documents", documents.len()),
            data: serde_json::json!({
                "overall_verdicts": overall_verdicts,
                "coverage_percentages": coverage_percentages,
                "check_verdicts": check_verdicts,
                "severity_counts": {
                    "critical": critical,
                    "warning": warning,
                    "info": info,
                },
            }),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validation_generate_and_evaluate() {
        let domain = DocumentValidationDomain::new();
        let tasks = domain.generate_tasks(5, 0.5);
        assert_eq!(tasks.len(), 5);

        for task in &tasks {
            let solution = domain.reference_solution(task).unwrap();
            let eval = domain.evaluate(task, &solution);
            assert!(eval.score > 0.5, "Reference solution should score well: {}", eval.score);
        }
    }

    #[test]
    fn test_validation_embedding_dim() {
        let domain = DocumentValidationDomain::new();
        assert_eq!(domain.embedding_dim(), 32);
    }

    #[test]
    fn test_document_spec_expected_verdict() {
        let doc = DocumentSpec {
            file_path: "test.eml".into(),
            line_count: 50,
            has_subject: true,
            has_from: true,
            has_to: true,
            placeholder_count: 0,
            citation_count: 1,
            checks: vec![
                ValidationCheckSpec {
                    check_name: "format".into(),
                    severity: Severity::Info,
                    expected_verdict: Verdict::Pass,
                    has_placeholder: false,
                    has_legal_citation: true,
                    has_pro_se_signature: true,
                    has_attachment_ref: false,
                    has_10_day_temporal_compliance: true,
                },
                ValidationCheckSpec {
                    check_name: "placeholder".into(),
                    severity: Severity::Critical,
                    expected_verdict: Verdict::Fail,
                    has_placeholder: true,
                    has_legal_citation: false,
                    has_pro_se_signature: false,
                    has_attachment_ref: false,
                    has_10_day_temporal_compliance: true,
                },
            ],
        };
        assert_eq!(doc.expected_verdict(), Verdict::Fail);
        assert_eq!(doc.expected_pass_rate(), 0.5);
    }
    
    #[test]
    fn test_direct_mail_inference_schema() {
        let domain = DocumentValidationDomain::new();
        let schema = domain.get_inference_schema();
        let supported_checks = schema["supported_check_types"].as_array().expect("Should be an array");
        
        let has_direct_mail = supported_checks.iter()
            .any(|v| v.as_str() == Some("direct_mail_referral_check"));
            
        assert!(has_direct_mail, "Inference schema must support 'direct_mail_referral_check' for Daylite capabilities.");
    }
}
