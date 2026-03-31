//! # WSJF Domain Bridge
//!
//! Cross-domain transfer learning between WSJF prioritization, trading signals,
//! and risk assessment. Converts WSJF intelligence into compounding knowledge
//! across domains instead of retraining.
//!
//! ## Domains
//!
//! - **WsjfPrioritization**: Generates prioritization tasks from WSJF items,
//!   evaluates anti-pattern detection accuracy + score defensibility.
//! - **TradingSignals**: Maps risk/reward scoring to Kelly sizing and
//!   Sharpe-based evaluation.
//! - **RiskAssessment**: ROAM framework risk profiles as training tasks.
//!
//! ## Parquet Pipeline
//!
//! JSONL → DuckDB ingest → schema validation → Parquet with gzip compression,
//! partitioned by phase, with column-level cardinality analysis.

pub mod domains;
pub mod parquet_pipeline;

pub use domains::document_validation::DocumentValidationDomain;
pub use domains::risk_assessment::RiskAssessmentDomain;
pub use domains::trading_signals::TradingSignalsDomain;
pub use domains::wsjf_prioritization::WsjfPrioritizationDomain;
pub use parquet_pipeline::WsjfParquetPipeline;
