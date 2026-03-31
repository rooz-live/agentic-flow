//! WSJF-inspired seeker ↔ role scorer.
//!
//! Score = (CoD / 3.0) × location_multiplier
//! CoD   = skill_overlap + seniority_component + compensation_component
//! Each component contributes equally (0.0–1.0 normalised to a third).
//!
//! This mirrors the WSJF CoD/job-size formula:
//!   skill_overlap     → business_value (highest weight)
//!   seniority_fit     → time_criticality (mis-level = long ramp = delay cost)
//!   compensation_fit  → risk_reduction (comp mismatch → offer rejection risk)

use crate::domain::{CareerMatch, JobSeekerProfile, RoleProfile};
use crate::semantic::{LexicalMatcher, SemanticMatcher};

/// WSJF-inspired seeker ↔ role scorer.
///
/// Accepts any [`SemanticMatcher`] strategy for the skill-overlap component.
/// Defaults to [`LexicalMatcher`] (bag-of-words, zero dependencies).
///
/// # Example — swap in an embedding-based matcher
/// ```rust,no_run
/// # #[cfg(feature = "semantic")]
/// # {
/// use reverse_recruiting::{JobMatcher, EmbeddingMatcher};
/// let matcher = JobMatcher::with_skill_matcher(
///     Box::new(EmbeddingMatcher::new(|_text| [0.0f32; 32])),
/// );
/// # }
/// ```
pub struct JobMatcher {
    /// Maximum seniority distance still considered a "near fit".
    pub seniority_tolerance: u8,
    /// Pluggable skill-overlap strategy (default: [`LexicalMatcher`]).
    skill_matcher: Box<dyn SemanticMatcher>,
}

impl Default for JobMatcher {
    fn default() -> Self {
        Self::new()
    }
}

impl JobMatcher {
    /// Create a `JobMatcher` with the default [`LexicalMatcher`].
    pub fn new() -> Self {
        Self {
            seniority_tolerance: 1,
            skill_matcher: Box::new(LexicalMatcher),
        }
    }

    /// Create a `JobMatcher` with a custom [`SemanticMatcher`] strategy.
    pub fn with_skill_matcher(skill_matcher: Box<dyn SemanticMatcher>) -> Self {
        Self {
            seniority_tolerance: 1,
            skill_matcher,
        }
    }

    /// Score a single (seeker, role) pair. Always returns a `CareerMatch`.
    pub fn score(&self, seeker: &JobSeekerProfile, role: &RoleProfile) -> CareerMatch {
        let skill_overlap    = self.skill_overlap(seeker, role);
        let seniority_fit    = seeker.seniority_level.distance(&role.seniority_level) <= self.seniority_tolerance;
        let location_fit     = self.location_fit(seeker, role);
        let compensation_fit = self.compensation_fit(seeker, role);

        // CoD components — each worth ⅓ of the composite
        let seniority_component    = if seniority_fit    { 1.0 } else { 0.0 };
        let compensation_component = if compensation_fit { 1.0 } else { 0.0 };
        let cod = skill_overlap + seniority_component + compensation_component;

        // Location is a multiplier, not additive — a non-match halves the score
        let location_multiplier = if location_fit { 1.0 } else { 0.5 };
        let score = ((cod / 3.0) * location_multiplier).clamp(0.0, 1.0);

        let explanation = format!(
            "skill {:.0}% | seniority {} | location {} | comp {}  →  score {:.2}",
            skill_overlap * 100.0,
            if seniority_fit    { "✓" } else { "✗" },
            if location_fit     { "✓" } else { "✗" },
            if compensation_fit { "✓" } else { "✗" },
            score,
        );

        CareerMatch {
            seeker_id: seeker.id,
            role_id: role.id,
            score,
            skill_overlap,
            compensation_fit,
            location_fit,
            seniority_fit,
            explanation,
        }
    }

    // ── private helpers ───────────────────────────────────────────────────

    fn skill_overlap(&self, seeker: &JobSeekerProfile, role: &RoleProfile) -> f64 {
        self.skill_matcher.skill_overlap(seeker, role)
    }

    fn location_fit(&self, seeker: &JobSeekerProfile, role: &RoleProfile) -> bool {
        let role_loc = role.location.to_lowercase();
        // Remote roles always fit; seekers who list "remote" fit any location
        if role_loc == "remote" {
            return true;
        }
        seeker.preferred_locations.iter().any(|l| {
            let l = l.to_lowercase();
            l == "remote" || l == role_loc
        })
    }

    fn compensation_fit(&self, seeker: &JobSeekerProfile, role: &RoleProfile) -> bool {
        match (seeker.min_compensation, &role.compensation_range) {
            (Some(ask), Some((_, max_offer))) => *max_offer >= ask,
            _ => true, // unknown on either side → optimistic
        }
    }
}

// ── Unit tests ────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::{SeniorityLevel, SkillSet};

    fn seeker() -> JobSeekerProfile {
        let mut s = JobSeekerProfile::new("Alice", SeniorityLevel::Senior);
        s.skills = SkillSet {
            required: vec!["Rust".into(), "WASM".into()],
            nice_to_have: vec!["Python".into()],
            years_of_experience: Default::default(),
        };
        s.preferred_locations = vec!["remote".into()];
        s.min_compensation = Some(180_000);
        s
    }

    fn role(comp_max: u64) -> RoleProfile {
        let mut r = RoleProfile::new("Acme", "Staff Eng", "remote", SeniorityLevel::Senior);
        r.skills = SkillSet {
            required: vec!["Rust".into(), "WASM".into()],
            nice_to_have: vec![],
            years_of_experience: Default::default(),
        };
        r.compensation_range = Some((160_000, comp_max));
        r
    }

    #[test]
    fn perfect_match_scores_high() {
        let m = JobMatcher::new().score(&seeker(), &role(200_000));
        assert!(m.score >= 0.9, "expected ≥0.90, got {:.2}", m.score);
        assert!(m.skill_overlap >= 1.0);
        assert!(m.seniority_fit);
        assert!(m.location_fit);
        assert!(m.compensation_fit);
    }

    #[test]
    fn comp_below_ask_still_location_fit() {
        let m = JobMatcher::new().score(&seeker(), &role(150_000));
        assert!(!m.compensation_fit);
        assert!(m.location_fit);
        assert!(m.score < 0.9);
    }
}
