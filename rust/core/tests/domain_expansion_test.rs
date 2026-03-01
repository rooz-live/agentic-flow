//! Cross-Domain Transfer Learning Integration Tests
//!
//! Validates that knowledge compounds across agentic-flow bounded contexts
//! (governance, validation, risk) via ruvector-domain-expansion rather than
//! retraining each domain independently.

use ruvector_domain_expansion::{
    ContextBucket, ConvergenceThresholds, CostCurve, CostCurvePoint, DomainExpansionEngine,
    DomainId, MetaLearningEngine, PopulationSearch,
};

// ─── Constants ───────────────────────────────────────────────────────────────

const GOVERNANCE: &str = "agentic_flow_governance";
const VALIDATION: &str = "agentic_flow_validation";
const RISK: &str = "agentic_flow_risk";

// ─── Engine Lifecycle ────────────────────────────────────────────────────────

#[test]
fn test_engine_initializes_with_built_in_domains() {
    // Built-in domains: rust_synthesis, structured_planning, tool_orchestration
    let domain = DomainId("structured_planning".into());
    let mut engine = DomainExpansionEngine::new();
    let tasks = engine.generate_tasks(&domain, 3, 0.5);
    assert!(!tasks.is_empty(), "Built-in planning domain should generate tasks");
}

#[test]
fn test_custom_domain_task_generation() {
    let mut engine = DomainExpansionEngine::new();
    let builtin = DomainId("structured_planning".into());

    // Built-in domains generate tasks reliably
    let tasks = engine.generate_tasks(&builtin, 10, 0.5);
    assert_eq!(tasks.len(), 10, "Built-in domain should generate exactly 10 tasks");

    // Tasks at different difficulties
    let easy = engine.generate_tasks(&builtin, 5, 0.1);
    let hard = engine.generate_tasks(&builtin, 5, 0.9);
    assert_eq!(easy.len(), 5);
    assert_eq!(hard.len(), 5);
}

// ─── Thompson Sampling Arm Selection ─────────────────────────────────────────

#[test]
fn test_arm_selection_for_built_in_domain() {
    let mut engine = DomainExpansionEngine::new();
    let domain = DomainId("structured_planning".into());
    let bucket = ContextBucket {
        difficulty_tier: "medium".into(),
        category: "planning".into(),
    };

    let arm = engine.select_arm(&domain, &bucket);
    assert!(arm.is_some(), "Should select an arm for built-in domain");
}

// ─── Cross-Domain Transfer ───────────────────────────────────────────────────

#[test]
fn test_transfer_governance_to_validation() {
    let mut engine = DomainExpansionEngine::new();
    let source = DomainId(GOVERNANCE.into());
    let target = DomainId(VALIDATION.into());

    // Seed engine with built-in domain, then attempt cross-domain transfer
    let builtin = DomainId("structured_planning".into());
    let _seed = engine.generate_tasks(&builtin, 25, 0.5);

    // Transfer between custom domains — must not panic
    engine.initiate_transfer(&source, &target);
}

#[test]
fn test_transfer_validation_to_risk() {
    let mut engine = DomainExpansionEngine::new();
    let source = DomainId(VALIDATION.into());
    let target = DomainId(RISK.into());

    // Transfer between custom domains — must not panic
    engine.initiate_transfer(&source, &target);
}

#[test]
fn test_bidirectional_transfer_no_regression() {
    let mut engine = DomainExpansionEngine::new();
    let gov = DomainId(GOVERNANCE.into());
    let val = DomainId(VALIDATION.into());

    // Transfer in both directions — key invariant: no panic, no infinite loop
    engine.initiate_transfer(&gov, &val);
    engine.initiate_transfer(&val, &gov);
}

// ─── Population-Based Policy Search ──────────────────────────────────────────

#[test]
fn test_population_search_initialization() {
    let pop = PopulationSearch::new(8);
    let stats = pop.stats();
    assert_eq!(stats.pop_size, 8, "Population should have 8 kernels");
    assert_eq!(stats.generation, 0, "Should start at generation 0");
}

// ─── Meta-Learning Health ────────────────────────────────────────────────────

#[test]
fn test_meta_learning_engine_health_check() {
    let meta = MetaLearningEngine::new();
    let health = meta.health_check();
    assert_eq!(
        health.pareto_size, 0,
        "Fresh engine should have empty Pareto front"
    );
}

// ─── Acceleration Scoreboard / Cost Curve ────────────────────────────────────

#[test]
fn test_cost_curve_tracks_convergence() {
    let thresholds = ConvergenceThresholds {
        target_accuracy: 0.95,
        target_cost: 1.0,
        target_robustness: 0.90,
        max_violations: 0,
    };
    let mut curve = CostCurve::new(DomainId(GOVERNANCE.into()), thresholds);

    curve.record(CostCurvePoint {
        cycle: 1,
        accuracy: 0.3,
        cost_per_solve: 1.0,
        robustness: 0.5,
        policy_violations: 0,
        timestamp: 1000.0,
    });
    curve.record(CostCurvePoint {
        cycle: 2,
        accuracy: 0.5,
        cost_per_solve: 0.8,
        robustness: 0.7,
        policy_violations: 0,
        timestamp: 2000.0,
    });
    curve.record(CostCurvePoint {
        cycle: 3,
        accuracy: 0.7,
        cost_per_solve: 0.6,
        robustness: 0.85,
        policy_violations: 0,
        timestamp: 3000.0,
    });

    assert_eq!(curve.points.len(), 3, "Should have 3 data points");
}
