// @constraint DDD-VALIDATION-CONTEXT: Domain aggregation module for document validation and risk assessment
// @domain-entities: struct Severity, struct Verdict, struct ValidationCheckSpec, struct DocumentSpec, struct RoamStatus, struct RiskItem, struct MarketCondition, struct WsjfItemSpec
// @domain-behavior: impl validation_check_creation, impl risk_reduction_scoring, impl kelly_fraction_calculation, impl wsjf_score_computation
pub mod document_validation;
pub mod risk_assessment;
pub mod trading_signals;
pub mod wsjf_prioritization;

pub use document_validation::{Severity, Verdict, ValidationCheckSpec, DocumentSpec};
pub use risk_assessment::{RoamStatus, RiskItem};
pub use trading_signals::MarketCondition;
pub use wsjf_prioritization::WsjfItemSpec;
