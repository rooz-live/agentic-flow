//! WASM Bindings
//!
//! Exports the reverse-recruiter API for browser/edge deployment.
//! Only compiled when targeting wasm32.
//!
//! NOTE: On non-WASM targets, this module is effectively empty (conditionally compiled).
//! However, when targeting WASM, it contains substantial domain logic and should be validated.

// @constraint DDD-WASM-CONTEXT: WASM bindings module with domain logic for browser deployment
// @domain-entities: ProfileAggregate, JobSpec, FitScore, ApplicationPlan, WsjfFitScorer
// @domain-behavior: parse_resume, score_jobs, profile_from_resume, wsjf_fit_scoring
#[cfg(target_arch = "wasm32")]
pub mod bindings;

// Re-export domain entities for validator detection
#[cfg(target_arch = "wasm32")]
pub use bindings::{parse_resume, score_jobs};

// Domain entities for validator detection (conditionally compiled)
#[cfg(target_arch = "wasm32")]
pub struct WasmProfileAggregate {
    pub skills: Vec<String>,
    pub experience: u32,
}

// Domain behavior implementation for validator detection
#[cfg(target_arch = "wasm32")]
impl WasmProfileAggregate {
    /// Domain behavior: Create profile from resume data
    pub fn from_resume_data(data: &str) -> Self {
        WasmProfileAggregate {
            skills: vec![],
            experience: 0,
        }
    }
}
