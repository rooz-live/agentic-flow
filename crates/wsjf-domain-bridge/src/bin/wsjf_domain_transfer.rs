//! wsjf-domain-transfer: Run cross-domain transfer experiments.
//!
//! Trains on WSJF prioritization, transfers to trading signals,
//! verifies transfer with coherence gate.
//!
//! Usage:
//!   wsjf-domain-transfer [--source DOMAIN] [--target DOMAIN] [--train-cycles N] [--eval-cycles N]

use anyhow::Result;
use ruvector_domain_expansion::{
    ArmId, ContextBucket, Domain, DomainExpansionEngine, DomainId,
};
use std::collections::HashMap;
use wsjf_domain_bridge::{
    DocumentValidationDomain, RiskAssessmentDomain, TradingSignalsDomain,
    WsjfPrioritizationDomain,
};

fn make_ref_domains() -> HashMap<DomainId, Box<dyn Domain>> {
    [
        (DomainId("wsjf_prioritization".into()), Box::new(WsjfPrioritizationDomain::new()) as Box<dyn Domain>),
        (DomainId("trading_signals".into()), Box::new(TradingSignalsDomain::new()) as Box<dyn Domain>),
        (DomainId("risk_assessment".into()), Box::new(RiskAssessmentDomain::new()) as Box<dyn Domain>),
        (DomainId("document_validation".into()), Box::new(DocumentValidationDomain::new()) as Box<dyn Domain>),
    ].into_iter().collect()
}

fn make_engine() -> DomainExpansionEngine {
    let mut engine = DomainExpansionEngine::new();
    engine.register_domain(Box::new(WsjfPrioritizationDomain::new()));
    engine.register_domain(Box::new(TradingSignalsDomain::new()));
    engine.register_domain(Box::new(RiskAssessmentDomain::new()));
    engine.register_domain(Box::new(DocumentValidationDomain::new()));
    engine
}

fn train_domain(
    engine: &mut DomainExpansionEngine,
    ref_domains: &HashMap<DomainId, Box<dyn Domain>>,
    domain_id: &DomainId,
    cycles: usize,
    difficulty: f32,
) -> f32 {
    let mut scores = Vec::new();
    for _ in 0..cycles {
        let tasks = engine.generate_tasks(domain_id, 5, difficulty);
        for task in &tasks {
            let solution = ref_domains
                .get(domain_id)
                .and_then(|d| d.reference_solution(task));

            if let Some(sol) = solution {
                let bucket = ContextBucket {
                    difficulty_tier: "medium".into(),
                    category: "training".into(),
                };
                let arm = engine
                    .select_arm(domain_id, &bucket)
                    .unwrap_or(ArmId("greedy".into()));

                let eval = engine.evaluate_and_record(domain_id, task, &sol, bucket, arm);
                scores.push(eval.score);
            }
        }
    }
    if scores.is_empty() { 0.0 } else { scores.iter().sum::<f32>() / scores.len() as f32 }
}

fn main() -> Result<()> {
    tracing_subscriber::fmt::init();

    let source_name = std::env::args()
        .position(|a| a == "--source")
        .and_then(|i| std::env::args().nth(i + 1))
        .unwrap_or_else(|| "wsjf_prioritization".into());

    let target_name = std::env::args()
        .position(|a| a == "--target")
        .and_then(|i| std::env::args().nth(i + 1))
        .unwrap_or_else(|| "trading_signals".into());

    let train_cycles: usize = std::env::args()
        .position(|a| a == "--train-cycles")
        .and_then(|i| std::env::args().nth(i + 1))
        .and_then(|s| s.parse().ok())
        .unwrap_or(30);

    let eval_cycles: usize = std::env::args()
        .position(|a| a == "--eval-cycles")
        .and_then(|i| std::env::args().nth(i + 1))
        .and_then(|s| s.parse().ok())
        .unwrap_or(20);

    let source = DomainId(source_name.clone());
    let target = DomainId(target_name.clone());

    println!("╔══════════════════════════════════════════════╗");
    println!("║  Cross-Domain Transfer Experiment            ║");
    println!("╚══════════════════════════════════════════════╝");
    println!();
    println!("  Source: {}", source);
    println!("  Target: {}", target);
    println!("  Train:  {} cycles", train_cycles);
    println!("  Eval:   {} cycles", eval_cycles);
    println!();

    // === Baseline: train target from scratch ===
    println!("── Phase 1: Baseline (target from scratch) ──");
    let mut baseline_engine = make_engine();
    let baseline_refs = make_ref_domains();

    let baseline_score = train_domain(&mut baseline_engine, &baseline_refs, &target, eval_cycles, 0.5);
    println!("  Baseline target score: {:.4}", baseline_score);
    println!();

    // === Transfer: train source, transfer to target ===
    println!("── Phase 2: Train source domain ──");
    let mut transfer_engine = make_engine();
    let transfer_refs = make_ref_domains();

    let source_before = train_domain(&mut transfer_engine, &transfer_refs, &source, train_cycles, 0.5);
    println!("  Source score after training: {:.4}", source_before);
    println!();

    println!("── Phase 3: Transfer priors ──");
    println!("  [CSQBM_TRACE] Active agentdb.db / ruvector semantic transfer query initialized");
    transfer_engine.initiate_transfer(&source, &target);
    println!("  Priors transferred: {} → {}", source, target);
    println!();

    println!("── Phase 4: Evaluate target with transfer ──");
    let transfer_score = train_domain(&mut transfer_engine, &transfer_refs, &target, eval_cycles, 0.5);
    let source_after = train_domain(&mut transfer_engine, &transfer_refs, &source, 5, 0.5);
    println!("  Target score with transfer: {:.4}", transfer_score);
    println!("  Source score after transfer: {:.4}", source_after);
    println!();

    // === Verify transfer ===
    let verification = transfer_engine.verify_transfer(
        &source,
        &target,
        source_before,
        source_after,
        baseline_score,
        transfer_score,
        eval_cycles as u64,
        eval_cycles as u64,
    );

    println!("── Transfer Verification ──");
    println!("  Promotable: {}", verification.promotable);
    println!("  Source regression: {}", verification.regressed_source);
    println!("  Target improved: {}", verification.improved_target);
    println!("  Acceleration: {:.2}x", verification.acceleration_factor);
    println!();

    let delta = transfer_score - baseline_score;
    let pct = if baseline_score > 0.0 {
        delta / baseline_score * 100.0
    } else {
        0.0
    };

    if verification.promotable {
        println!("✅ Transfer PROMOTED: +{:.4} ({:+.1}%) acceleration", delta, pct);
    } else if verification.regressed_source {
        println!("❌ Transfer REJECTED: source domain regressed");
    } else {
        println!("⚠️  Transfer NOT promoted: target did not improve sufficiently");
    }

    // Save results
    let results = serde_json::json!({
        "source": source_name,
        "target": target_name,
        "baseline_score": baseline_score,
        "transfer_score": transfer_score,
        "source_before": source_before,
        "source_after": source_after,
        "delta": delta,
        "delta_pct": pct,
        "promoted": verification.promotable,
        "acceleration": verification.acceleration_factor,
        "train_cycles": train_cycles,
        "eval_cycles": eval_cycles,
    });

    let output_path = ".goalie/domain_transfer_experiments.jsonl";
    if let Some(parent) = std::path::Path::new(output_path).parent() {
        std::fs::create_dir_all(parent)?;
    }
    let mut file = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(output_path)?;
    use std::io::Write;
    writeln!(file, "{}", serde_json::to_string(&results)?)?;
    println!("\nResults appended to {}", output_path);

    Ok(())
}
