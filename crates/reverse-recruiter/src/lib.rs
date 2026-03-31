//! # Reverse Recruiter
//!
//! A Rust WASM service for reverse recruiting — flipping the traditional hiring model.
//! Uses WSJF-scored job matching with cross-domain transfer from the ruvector
//! domain expansion ecosystem.
//!
//! ## Domains
//!
//! - **Profile**: Resume parsing, skill extraction, experience graph (DDD aggregate)
//! - **Job Matching**: WSJF-weighted fit scoring with cosine skill overlap
//! - **Application**: Outreach planning, resume tailoring, interview prep
//! - **Integration**: Data source abstraction (manual JSON input → future APIs)
//!
//! ## Cross-Domain Transfer
//!
//! Reuses WSJF prioritization concepts:
//! - `business_value` → `compensation_fit`
//! - `time_criticality` → `application_deadline_urgency`
//! - `risk_reduction` → `career_risk_reduction`
//! - `job_size` → `application_effort`

pub mod domains;
pub mod scoring;
pub mod wasm;

pub use domains::application::ApplicationPlan;
pub use domains::integration;
pub use domains::job_matching::{FitScore, JobMatchingDomain, JobSpec};
pub use domains::profile::{ProfileAggregate, ProfileDomain};
pub use domains::service_directory::{ServiceDirectory, RecruitingService, ExperienceTier, PricingModel};
pub use scoring::wsjf_fit::WsjfFitScorer;
