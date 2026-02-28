//! wsjf-domain-train: Train domain expansion engine on WSJF historical data.
//!
//! Usage:
//!   wsjf-domain-train [--cycles N] [--difficulty D] [--output FILE]

use anyhow::Result;
use ruvector_domain_expansion::{
    ArmId, ContextBucket, Domain, DomainExpansionEngine, DomainId,
};
use std::collections::HashMap;
use wsjf_domain_bridge::{
    DocumentValidationDomain, RiskAssessmentDomain, TradingSignalsDomain,
    WsjfPrioritizationDomain,
};

fn main() -> Result<()> {
    tracing_subscriber::fmt::init();

    let cycles: usize = std::env::args()
        .position(|a| a == "--cycles")
        .and_then(|i| std::env::args().nth(i + 1))
        .and_then(|s| s.parse().ok())
        .unwrap_or(50);

    let difficulty: f32 = std::env::args()
        .position(|a| a == "--difficulty")
        .and_then(|i| std::env::args().nth(i + 1))
        .and_then(|s| s.parse().ok())
        .unwrap_or(0.5);

    let output = std::env::args()
        .position(|a| a == "--output")
        .and_then(|i| std::env::args().nth(i + 1))
        .unwrap_or_else(|| ".goalie/domain_training_results.json".into());

    println!("╔══════════════════════════════════════════╗");
    println!("║  WSJF Domain Expansion Training Engine   ║");
    println!("╚══════════════════════════════════════════╝");
    println!();
    println!("  Cycles:     {}", cycles);
    println!("  Difficulty: {}", difficulty);
    println!("  Output:     {}", output);
    println!();

    // Initialize engine with custom domains
    let mut engine = DomainExpansionEngine::new();
    engine.register_domain(Box::new(WsjfPrioritizationDomain::new()));
    engine.register_domain(Box::new(TradingSignalsDomain::new()));
    engine.register_domain(Box::new(RiskAssessmentDomain::new()));
    engine.register_domain(Box::new(DocumentValidationDomain::new()));

    // Separate domain instances for reference solutions (engine.domains is private)
    let ref_domains: HashMap<DomainId, Box<dyn Domain>> = [
        (DomainId("wsjf_prioritization".into()), Box::new(WsjfPrioritizationDomain::new()) as Box<dyn Domain>),
        (DomainId("trading_signals".into()), Box::new(TradingSignalsDomain::new()) as Box<dyn Domain>),
        (DomainId("risk_assessment".into()), Box::new(RiskAssessmentDomain::new()) as Box<dyn Domain>),
        (DomainId("document_validation".into()), Box::new(DocumentValidationDomain::new()) as Box<dyn Domain>),
    ].into_iter().collect();

    // Generate holdouts for verification
    engine.generate_holdouts(5, difficulty);

    let domain_ids = [
        DomainId("wsjf_prioritization".into()),
        DomainId("trading_signals".into()),
        DomainId("risk_assessment".into()),
        DomainId("document_validation".into()),
    ];

    let mut results = serde_json::Map::new();

    for domain_id in &domain_ids {
        println!("▶ Training domain: {}", domain_id);
        let mut domain_scores = Vec::new();

        for cycle in 0..cycles {
            let tasks = engine.generate_tasks(domain_id, 5, difficulty);

            for task in &tasks {
                // Use reference solution as training signal
                let solution = ref_domains
                    .get(domain_id)
                    .and_then(|d| d.reference_solution(task));

                if let Some(sol) = solution {
                    let difficulty_tier = if difficulty < 0.3 {
                        "easy"
                    } else if difficulty < 0.7 {
                        "medium"
                    } else {
                        "hard"
                    };

                    let bucket = ContextBucket {
                        difficulty_tier: difficulty_tier.into(),
                        category: "prioritization".into(),
                    };

                    // Select arm via Thompson Sampling
                    let arm = engine
                        .select_arm(domain_id, &bucket)
                        .unwrap_or(ArmId("greedy".into()));

                    let eval = engine.evaluate_and_record(
                        domain_id, task, &sol, bucket, arm,
                    );

                    domain_scores.push(eval.score);
                }
            }

            if (cycle + 1) % 10 == 0 {
                let avg: f32 = domain_scores.iter().sum::<f32>() / domain_scores.len() as f32;
                println!("  Cycle {}/{}: avg_score={:.3} ({} samples)",
                    cycle + 1, cycles, avg, domain_scores.len());
            }
        }

        let final_avg: f32 = if domain_scores.is_empty() {
            0.0
        } else {
            domain_scores.iter().sum::<f32>() / domain_scores.len() as f32
        };

        println!("  ✓ {} final avg: {:.4} over {} samples",
            domain_id, final_avg, domain_scores.len());
        println!();

        results.insert(domain_id.0.clone(), serde_json::json!({
            "avg_score": final_avg,
            "samples": domain_scores.len(),
            "cycles": cycles,
            "difficulty": difficulty,
        }));
    }

    // Evaluate population on holdouts
    engine.evaluate_population();

    // Save results
    let output_path = std::path::Path::new(&output);
    if let Some(parent) = output_path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let json = serde_json::to_string_pretty(&serde_json::Value::Object(results))?;
    std::fs::write(&output, &json)?;
    println!("Results saved to {}", output);

    Ok(())
}
