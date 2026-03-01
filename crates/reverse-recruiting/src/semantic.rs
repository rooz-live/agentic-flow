//! Skill-overlap strategies: lexical (default) and embedding-based (semantic feature).
//!
//! # Architecture
//!
//! ```text
//! SemanticMatcher (trait)
//!   ├── LexicalMatcher   — bag-of-words intersection / union  (always compiled)
//!   └── EmbeddingMatcher — cosine similarity on 32-dim vectors (feature = "semantic")
//! ```
//!
//! [`JobMatcher`] holds a `Box<dyn SemanticMatcher>` so the strategy is
//! swappable at construction time without changing the scoring formula.

use crate::domain::{JobSeekerProfile, RoleProfile};

// ── Trait ─────────────────────────────────────────────────────────────────────

/// Strategy for computing the skill-overlap component of the WSJF score.
///
/// Returns a value in `[0.0, 1.0]` where `1.0` means perfect overlap.
pub trait SemanticMatcher: Send + Sync {
    fn skill_overlap(&self, seeker: &JobSeekerProfile, role: &RoleProfile) -> f64;
}

// ── LexicalMatcher ────────────────────────────────────────────────────────────

/// Bag-of-words intersection: fraction of the role's required skills that
/// appear (case-insensitive) in the seeker's skill set.
///
/// This is the default strategy — zero dependencies, deterministic, fast.
pub struct LexicalMatcher;

impl SemanticMatcher for LexicalMatcher {
    fn skill_overlap(&self, seeker: &JobSeekerProfile, role: &RoleProfile) -> f64 {
        if role.skills.required.is_empty() {
            return 1.0; // no requirements = open match
        }
        let seeker_skills: std::collections::HashSet<String> = seeker
            .skills
            .required
            .iter()
            .chain(seeker.skills.nice_to_have.iter())
            .map(|s| s.to_lowercase())
            .collect();

        let matched = role
            .skills
            .required
            .iter()
            .filter(|r| seeker_skills.contains(&r.to_lowercase()))
            .count();

        matched as f64 / role.skills.required.len() as f64
    }
}

// ── EmbeddingMatcher ──────────────────────────────────────────────────────────
//
// Gated behind `--features semantic`.
// In production this would call an embedding model (e.g. LLMLingua, OpenAI
// text-embedding-3-small, or a local ONNX model).  Here we expose the pure
// cosine-similarity kernel and a constructor that accepts pre-computed vectors,
// making the unit tests fully deterministic without any network calls.

/// 32-dimensional embedding vector (f32 for WASM-friendliness).
pub type Embedding = [f32; 32];

/// Cosine similarity between two 32-dim vectors.
///
/// Returns `0.0` when either vector is the zero vector (safe fallback).
pub fn cosine_similarity(a: &Embedding, b: &Embedding) -> f64 {
    let dot: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();
    if norm_a == 0.0 || norm_b == 0.0 {
        return 0.0;
    }
    (dot / (norm_a * norm_b)).clamp(-1.0, 1.0) as f64
}

/// Embedding-based skill matcher.
///
/// Accepts a closure that maps a skill-list string to a 32-dim embedding.
/// In tests, pass a deterministic closure; in production, wire in your
/// embedding model (LLMLingua, OpenAI, local ONNX, etc.).
#[cfg(feature = "semantic")]
pub struct EmbeddingMatcher<F>
where
    F: Fn(&str) -> Embedding + Send + Sync,
{
    embed: F,
}

#[cfg(feature = "semantic")]
impl<F> EmbeddingMatcher<F>
where
    F: Fn(&str) -> Embedding + Send + Sync,
{
    /// Create a new `EmbeddingMatcher` with the given embedding function.
    pub fn new(embed: F) -> Self {
        Self { embed }
    }
}

#[cfg(feature = "semantic")]
impl<F> SemanticMatcher for EmbeddingMatcher<F>
where
    F: Fn(&str) -> Embedding + Send + Sync,
{
    fn skill_overlap(&self, seeker: &JobSeekerProfile, role: &RoleProfile) -> f64 {
        if role.skills.required.is_empty() {
            return 1.0;
        }
        // Concatenate skill lists into a single string for embedding.
        let seeker_text = seeker
            .skills
            .required
            .iter()
            .chain(seeker.skills.nice_to_have.iter())
            .cloned()
            .collect::<Vec<_>>()
            .join(", ");
        let role_text = role.skills.required.join(", ");

        let seeker_emb = (self.embed)(&seeker_text);
        let role_emb   = (self.embed)(&role_text);
        cosine_similarity(&seeker_emb, &role_emb)
    }
}

// ── Unit tests ────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::{RoleProfile, SeniorityLevel, SkillSet};

    // ── cosine_similarity kernel tests ────────────────────────────────────────

    #[test]
    fn cosine_identical_vectors_returns_one() {
        let v: Embedding = {
            let mut a = [0.0f32; 32];
            a[0] = 1.0;
            a[7] = 0.5;
            a[15] = 0.3;
            a
        };
        let sim = cosine_similarity(&v, &v);
        assert!(
            (sim - 1.0).abs() < 1e-6,
            "identical vectors must have cosine = 1.0, got {sim}"
        );
    }

    #[test]
    fn cosine_orthogonal_vectors_returns_zero() {
        let mut a = [0.0f32; 32];
        let mut b = [0.0f32; 32];
        a[0] = 1.0; // axis 0
        b[1] = 1.0; // axis 1 — orthogonal
        let sim = cosine_similarity(&a, &b);
        assert!(
            sim.abs() < 1e-6,
            "orthogonal vectors must have cosine = 0.0, got {sim}"
        );
    }

    #[test]
    fn cosine_zero_vector_returns_zero_safely() {
        let zero = [0.0f32; 32];
        let mut v = [0.0f32; 32];
        v[3] = 1.0;
        assert_eq!(cosine_similarity(&zero, &v), 0.0);
        assert_eq!(cosine_similarity(&v, &zero), 0.0);
        assert_eq!(cosine_similarity(&zero, &zero), 0.0);
    }

    // ── EmbeddingMatcher integration tests ───────────────────────────────────

    #[cfg(feature = "semantic")]
    fn make_seeker(skills: Vec<&str>) -> crate::domain::JobSeekerProfile {
        let mut s = crate::domain::JobSeekerProfile::new("Test", SeniorityLevel::Senior);
        s.skills.required = skills.into_iter().map(String::from).collect();
        s
    }

    #[cfg(feature = "semantic")]
    fn make_role(skills: Vec<&str>) -> RoleProfile {
        let mut r = RoleProfile::new("Co", "Eng", "remote", SeniorityLevel::Senior);
        r.skills = SkillSet {
            required: skills.into_iter().map(String::from).collect(),
            nice_to_have: vec![],
            years_of_experience: Default::default(),
        };
        r
    }

    #[cfg(feature = "semantic")]
    #[test]
    fn embedding_matcher_identical_skills_returns_one() {
        // Embed function: always returns the same fixed vector → cosine = 1.0
        let fixed: Embedding = {
            let mut v = [0.0f32; 32];
            v[0] = 1.0;
            v
        };
        let matcher = EmbeddingMatcher::new(move |_| fixed);
        let seeker = make_seeker(vec!["Rust", "WASM"]);
        let role   = make_role(vec!["Rust", "WASM"]);
        let sim = matcher.skill_overlap(&seeker, &role);
        assert!(
            (sim - 1.0).abs() < 1e-6,
            "same embedding → cosine must be 1.0, got {sim}"
        );
    }

    #[cfg(feature = "semantic")]
    #[test]
    fn embedding_matcher_orthogonal_skills_returns_zero() {
        // Embed function: seeker → axis-0, role → axis-1 (orthogonal)
        let mut call_count = std::sync::atomic::AtomicU32::new(0);
        let matcher = EmbeddingMatcher::new(move |_text: &str| {
            let n = call_count.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
            let mut v = [0.0f32; 32];
            v[n as usize % 2] = 1.0; // alternates axis 0 / axis 1
            v
        });
        let seeker = make_seeker(vec!["Rust"]);
        let role   = make_role(vec!["Java"]);
        let sim = matcher.skill_overlap(&seeker, &role);
        assert!(
            sim.abs() < 1e-6,
            "orthogonal embeddings → cosine must be 0.0, got {sim}"
        );
    }
}
