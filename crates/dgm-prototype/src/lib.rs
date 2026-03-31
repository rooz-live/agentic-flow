use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Candidate {
    pub id: String,
    pub target_path: String,
    pub patch_path: String,
    pub summary: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum RiskLevel {
    Low,
    Medium,
    High,
    Extreme,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct GateInputs {
    pub tests_passed: bool,
    pub shellcheck_passed: bool,
    pub contract_verify_passed: bool,
    pub rollback_ready: bool,
    pub allowlist_prefixes: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Evaluation {
    pub risk_level: RiskLevel,
    pub reasons: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ApplyDecision {
    pub apply: bool,
    pub risk_level: RiskLevel,
    pub reasons: Vec<String>,
}

fn contains_sensitive_target(path: &str) -> bool {
    let p = path.to_lowercase();
    p.contains(".email-hashes.db")
        || p.contains("email-hash-db.sh")
        || p.contains("agentic-email-hashes.log")
}

fn summary_has_high_risk_terms(summary: &str) -> bool {
    let s = summary.to_lowercase();
    let blocked = [
        "docker prune",
        "rm -rf",
        "delete log",
        "cache clear",
        "launchagent",
        "folder watch scope",
    ];
    blocked.iter().any(|term| s.contains(term))
}

pub fn evaluate_candidate(candidate: &Candidate, allowlist_prefixes: &[String]) -> Evaluation {
    let mut reasons = Vec::new();

    if contains_sensitive_target(&candidate.target_path) {
        reasons.push("Retention-sensitive target blocked".to_string());
        return Evaluation {
            risk_level: RiskLevel::Extreme,
            reasons,
        };
    }

    if summary_has_high_risk_terms(&candidate.summary) {
        reasons.push("High-risk operation keyword detected".to_string());
        return Evaluation {
            risk_level: RiskLevel::High,
            reasons,
        };
    }

    let allowlisted = allowlist_prefixes
        .iter()
        .any(|prefix| candidate.target_path.starts_with(prefix));

    if !allowlisted {
        reasons.push("Target path outside allowlist".to_string());
        return Evaluation {
            risk_level: RiskLevel::High,
            reasons,
        };
    }

    reasons.push("Candidate is in allowlist and non-destructive".to_string());
    Evaluation {
        risk_level: RiskLevel::Low,
        reasons,
    }
}

pub fn decide_apply(candidate: &Candidate, inputs: &GateInputs) -> ApplyDecision {
    let eval = evaluate_candidate(candidate, &inputs.allowlist_prefixes);
    let mut reasons = eval.reasons.clone();

    let gate_ok = inputs.tests_passed
        && inputs.shellcheck_passed
        && inputs.contract_verify_passed
        && inputs.rollback_ready;
    if !inputs.tests_passed {
        reasons.push("Targeted tests failed".to_string());
    }
    if !inputs.shellcheck_passed {
        reasons.push("Shellcheck failed".to_string());
    }
    if !inputs.contract_verify_passed {
        reasons.push("Contract verification failed".to_string());
    }
    if !inputs.rollback_ready {
        reasons.push("Rollback path not ready".to_string());
    }

    let apply = matches!(eval.risk_level, RiskLevel::Low) && gate_ok;
    if apply {
        reasons.push("Auto-apply allowed (low risk + gates passed)".to_string());
    } else {
        reasons.push("Auto-apply blocked".to_string());
    }

    ApplyDecision {
        apply,
        risk_level: eval.risk_level,
        reasons,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn base_inputs() -> GateInputs {
        GateInputs {
            tests_passed: true,
            shellcheck_passed: true,
            contract_verify_passed: true,
            rollback_ready: true,
            allowlist_prefixes: vec!["scripts/validators/".to_string()],
        }
    }

    #[test]
    fn allows_low_risk_when_gates_pass() {
        let c = Candidate {
            id: "c1".into(),
            target_path: "scripts/validators/file/validation-runner.sh".into(),
            patch_path: "/tmp/c1.patch".into(),
            summary: "Improve date check branch".into(),
        };
        let d = decide_apply(&c, &base_inputs());
        assert!(d.apply);
        assert_eq!(d.risk_level, RiskLevel::Low);
    }

    #[test]
    fn blocks_retention_sensitive_target() {
        let c = Candidate {
            id: "c2".into(),
            target_path: "_SYSTEM/_AUTOMATION/email-hash-db.sh".into(),
            patch_path: "/tmp/c2.patch".into(),
            summary: "Delete stale hashes".into(),
        };
        let d = decide_apply(&c, &base_inputs());
        assert!(!d.apply);
        assert_eq!(d.risk_level, RiskLevel::Extreme);
    }

    #[test]
    fn blocks_when_any_gate_fails() {
        let c = Candidate {
            id: "c3".into(),
            target_path: "scripts/validators/file/validation-runner.sh".into(),
            patch_path: "/tmp/c3.patch".into(),
            summary: "Refactor".into(),
        };
        let mut inputs = base_inputs();
        inputs.contract_verify_passed = false;
        let d = decide_apply(&c, &inputs);
        assert!(!d.apply);
    }
}

