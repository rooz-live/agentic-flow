//! # reverse-recruiting
//!
//! Career agent recommendation engine — reverse recruiting as a service.
//!
//! Matches passive job seekers against open roles using a WSJF-inspired
//! composite score (skill overlap × seniority × compensation × location).
//!
//! ## Architecture
//!
//! ```text
//! JobSeekerProfile ──┐
//!                    ├─► JobMatcher ──► CareerMatch[]
//! RoleProfile[]  ────┘        │
//!                             ▼
//!                    RecruitingRecommender
//!                    (top-N, threshold-gated, JSON output)
//! ```
//!
//! ## Planned integrations
//! - **simplify.jobs API** — ingest `RoleProfile` from live job board feed
//! - **RAG / LLMLingua**  — semantic skill matching (replaces lexical overlap)
//! - **wsjf-domain-bridge** — transfer risk-assessment patterns to role scoring
//!
//! ## WASM surface
//! Add `wasm-bindgen` under the `wasm` feature and change `crate-type` to
//! `["cdylib","rlib"]` in `Cargo.toml`. All domain logic is already `no_std`-friendly.
//!
//! ## Usage
//! ```rust,no_run
//! use reverse_recruiting::{JobSeekerProfile, RoleProfile, RecruitingRecommender, SeniorityLevel};
//!
//! let seeker = JobSeekerProfile::new("Alice", SeniorityLevel::Senior);
//! let roles: Vec<RoleProfile> = vec![/* ... */];
//! let recs = RecruitingRecommender::new().recommend(&seeker, &roles, 5);
//! ```

pub mod domain;
pub mod matcher;
pub mod recommender;
pub mod semantic;
#[cfg(feature = "http-client")]
pub mod client;

// Flat re-exports — the public API surface
pub use domain::{CareerMatch, JobSeekerProfile, RoleProfile, SeniorityLevel, SkillSet};
pub use matcher::JobMatcher;
pub use recommender::RecruitingRecommender;
pub use semantic::{cosine_similarity, Embedding, LexicalMatcher, SemanticMatcher};
#[cfg(feature = "semantic")]
pub use semantic::EmbeddingMatcher;

// ── WASM surface ──────────────────────────────────────────────────────────────
//
// Enabled with `--features wasm`.  Targets browser and Cloudflare Workers.
//
// JS / TS usage:
//   import init, { recommend_wasm } from "./reverse_recruiting.js";
//   await init();
//   const json = recommend_wasm(seekerJson, rolesJson, 5);
//   const result = JSON.parse(json);
#[cfg(feature = "wasm")]
mod wasm_api {
    use wasm_bindgen::prelude::*;
    use crate::{JobSeekerProfile, RoleProfile, RecruitingRecommender};

    /// Entry point exposed to JavaScript / Cloudflare Workers.
    ///
    /// # Arguments
    /// * `seeker_json` — JSON-serialised `JobSeekerProfile`
    /// * `roles_json`  — JSON-serialised `Vec<RoleProfile>`
    /// * `top_n`       — maximum number of matches to return
    ///
    /// # Returns
    /// JSON string `{ seeker_id, seeker_name, top_n, threshold, matches: [...] }`
    ///
    /// # Errors
    /// Returns a JSON error object `{ "error": "..." }` on parse failure so the
    /// caller never receives an unhandled JS exception.
    #[wasm_bindgen]
    pub fn recommend_wasm(seeker_json: &str, roles_json: &str, top_n: usize) -> String {
        let seeker: JobSeekerProfile = match serde_json::from_str(seeker_json) {
            Ok(s) => s,
            Err(e) => {
                return serde_json::json!({ "error": format!("seeker parse error: {e}") })
                    .to_string()
            }
        };
        let roles: Vec<RoleProfile> = match serde_json::from_str(roles_json) {
            Ok(r) => r,
            Err(e) => {
                return serde_json::json!({ "error": format!("roles parse error: {e}") })
                    .to_string()
            }
        };

        RecruitingRecommender::new()
            .recommend_json(&seeker, &roles, top_n)
            .to_string()
    }
}

#[cfg(feature = "wasm")]
pub use wasm_api::recommend_wasm;
