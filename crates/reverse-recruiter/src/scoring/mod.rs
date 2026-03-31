// @constraint DDD-SCORING-CONTEXT: Scoring domain module for WSJF-based job fit calculation
// @domain-entities: struct FitWeights, struct FitScore, struct WsjfFitScorer
// @domain-behavior: impl wsjf_fit_calculation, impl score_normalization, impl fit_weight_optimization
pub mod wsjf_fit;

pub use wsjf_fit::{FitWeights, WsjfFitScorer};
