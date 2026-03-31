//! wasm-bindgen exports for the reverse-recruiter service.
//!
//! All profile data stays client-side (privacy-first). The WASM module
//! processes resume text and job listings entirely in the browser.

use wasm_bindgen::prelude::*;

// @constraint DDD-WASM-CONTEXT: WASM bindings module with domain logic for browser deployment
// @domain-entities: struct ProfileAggregate, struct JobSpec, struct FitScore, struct ApplicationPlan, struct WsjfFitScorer
// @domain-behavior: impl parse_resume, impl score_jobs, impl profile_from_resume, impl wsjf_fit_scoring

use crate::domains::application::ApplicationPlan;
use crate::domains::integration;
use crate::domains::job_matching::{FitScore, JobSpec};
use crate::domains::profile::ProfileAggregate;
use crate::scoring::wsjf_fit::WsjfFitScorer;

/// Parse a resume and extract skills (returns JSON).
#[wasm_bindgen]
pub fn parse_resume(id: &str, name: &str, resume_text: &str) -> String {
    let profile = integration::profile_from_resume(id, name, resume_text);
    serde_json::to_string(&profile).unwrap_or_else(|_| "{}".into())
}

/// Score a profile against a batch of jobs (returns JSON array of FitScores).
#[wasm_bindgen]
pub fn score_jobs(profile_json: &str, jobs_json: &str) -> String {
    let profile: ProfileAggregate = match serde_json::from_str(profile_json) {
        Ok(p) => p,
        Err(e) => return format!("{{\"error\": \"{}\"}}", e),
    };

    let jobs: Vec<JobSpec> = match serde_json::from_str(jobs_json) {
        Ok(j) => j,
        Err(e) => return format!("{{\"error\": \"{}\"}}", e),
    };

    let scorer = WsjfFitScorer::default();
    let mut scores: Vec<FitScore> = jobs.iter().map(|j| scorer.score_fit(&profile, j)).collect();
    scores.sort_by(|a, b| b.overall_fit.partial_cmp(&a.overall_fit).unwrap());

    serde_json::to_string(&scores).unwrap_or_else(|_| "[]".into())
}

/// Generate a full application plan (returns JSON).
#[wasm_bindgen]
pub fn generate_plan(profile_json: &str, jobs_json: &str) -> String {
    let profile: ProfileAggregate = match serde_json::from_str(profile_json) {
        Ok(p) => p,
        Err(e) => return format!("{{\"error\": \"{}\"}}", e),
    };

    let jobs: Vec<JobSpec> = match serde_json::from_str(jobs_json) {
        Ok(j) => j,
        Err(e) => return format!("{{\"error\": \"{}\"}}", e),
    };

    let scorer = WsjfFitScorer::default();
    let mut scores: Vec<FitScore> = jobs.iter().map(|j| scorer.score_fit(&profile, j)).collect();
    scores.sort_by(|a, b| b.overall_fit.partial_cmp(&a.overall_fit).unwrap());

    let plan = ApplicationPlan::generate(&profile, &scores, &jobs);
    serde_json::to_string(&plan).unwrap_or_else(|_| "{}".into())
}
