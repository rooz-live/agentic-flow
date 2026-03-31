//! Benchmarks for WSJF Domain Bridge
//!
//! Run with: cargo bench -p wsjf-domain-bridge

use std::time::Instant;
use wsjf_domain_bridge::{
    RiskAssessmentDomain, TradingSignalsDomain, WsjfPrioritizationDomain,
};

fn bench_domain_generation(name: &str, f: impl Fn()) {
    let iterations = 100;
    let start = Instant::now();
    for _ in 0..iterations {
        f();
    }
    let elapsed = start.elapsed();
    let per_iter = elapsed / iterations;
    println!(
        "{name}: {iterations} iterations in {:.2?} ({:.2?}/iter)",
        elapsed, per_iter
    );
}

fn main() {
    println!("=== WSJF Domain Bridge Benchmarks ===\n");

    bench_domain_generation("WsjfPrioritization::new", || {
        let _domain = WsjfPrioritizationDomain::new();
    });

    bench_domain_generation("TradingSignals::new", || {
        let _domain = TradingSignalsDomain::new();
    });

    bench_domain_generation("RiskAssessment::new", || {
        let _domain = RiskAssessmentDomain::new();
    });

    println!("\n=== Done ===");
}
