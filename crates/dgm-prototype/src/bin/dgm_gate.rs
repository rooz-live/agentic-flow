use std::{env, fs};

use anyhow::{Context, Result};
use dgm_prototype::{decide_apply, Candidate, GateInputs};

fn parse_bool_arg(name: &str) -> bool {
    matches!(
        env::args()
            .collect::<Vec<_>>()
            .windows(2)
            .find(|w| w[0] == name)
            .map(|w| w[1].as_str()),
        Some("1" | "true" | "TRUE" | "yes" | "YES")
    )
}

fn parse_string_arg(name: &str) -> Option<String> {
    env::args()
        .collect::<Vec<_>>()
        .windows(2)
        .find(|w| w[0] == name)
        .map(|w| w[1].to_string())
}

fn main() -> Result<()> {
    let candidate_json =
        parse_string_arg("--candidate-json").context("missing --candidate-json <path>")?;
    let allowlist = parse_string_arg("--allowlist")
        .unwrap_or_else(|| "scripts/validators/,_SYSTEM/_AUTOMATION/validate-email.sh".to_string());

    let tests_passed = parse_bool_arg("--tests-passed");
    let shellcheck_passed = parse_bool_arg("--shellcheck-passed");
    let contract_verify_passed = parse_bool_arg("--contract-verify-passed");
    let rollback_ready = parse_bool_arg("--rollback-ready");

    let raw = fs::read_to_string(&candidate_json)
        .with_context(|| format!("failed to read {candidate_json}"))?;
    let candidate: Candidate = serde_json::from_str(&raw).context("invalid candidate JSON")?;

    let inputs = GateInputs {
        tests_passed,
        shellcheck_passed,
        contract_verify_passed,
        rollback_ready,
        allowlist_prefixes: allowlist.split(',').map(|s| s.trim().to_string()).collect(),
    };

    let decision = decide_apply(&candidate, &inputs);
    println!("{}", serde_json::to_string_pretty(&decision)?);
    if decision.apply {
        std::process::exit(0);
    }
    std::process::exit(2);
}

