//! Ranked recommendation engine.
//!
//! Takes a JobSeekerProfile + a slice of RoleProfiles, runs them all through
//! JobMatcher, filters by threshold, and returns top-N sorted by composite score.
//!
//! # Planned integrations
//! - simplify.jobs API  → populate `roles` slice from live feed
//! - RAG / LLMLingua   → semantic skill matching (replaces lexical overlap)
//! - wsjf-domain-bridge → transfer risk patterns to seniority risk weighting

use crate::domain::{CareerMatch, JobSeekerProfile, RoleProfile};
use crate::matcher::JobMatcher;

// ── Recommender ───────────────────────────────────────────────────────────────

pub struct RecruitingRecommender {
    matcher: JobMatcher,
    /// Minimum composite score for a match to be surfaced. Default: 0.50.
    pub min_score_threshold: f64,
}

impl Default for RecruitingRecommender {
    fn default() -> Self {
        Self::new()
    }
}

impl RecruitingRecommender {
    pub fn new() -> Self {
        Self {
            matcher: JobMatcher::new(),
            min_score_threshold: 0.50,
        }
    }

    pub fn with_threshold(threshold: f64) -> Self {
        Self {
            matcher: JobMatcher::new(),
            min_score_threshold: threshold.clamp(0.0, 1.0),
        }
    }

    /// Return up to `top_n` matches for `seeker` across all `roles`,
    /// sorted descending by composite score.
    ///
    /// Only matches scoring ≥ `min_score_threshold` are included.
    pub fn recommend(
        &self,
        seeker: &JobSeekerProfile,
        roles: &[RoleProfile],
        top_n: usize,
    ) -> Vec<CareerMatch> {
        let mut matches: Vec<CareerMatch> = roles
            .iter()
            .map(|r| self.matcher.score(seeker, r))
            .filter(|m| m.score >= self.min_score_threshold)
            .collect();

        // Stable descending sort (NaN-safe via unwrap_or)
        matches.sort_by(|a, b| {
            b.score
                .partial_cmp(&a.score)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        matches.truncate(top_n);
        matches
    }

    /// JSON serialisation convenience — returns `serde_json::Value` for agent consumers.
    pub fn recommend_json(
        &self,
        seeker: &JobSeekerProfile,
        roles: &[RoleProfile],
        top_n: usize,
    ) -> serde_json::Value {
        let matches = self.recommend(seeker, roles, top_n);
        serde_json::json!({
            "seeker_id":  seeker.id,
            "seeker_name": seeker.name,
            "top_n":      top_n,
            "threshold":  self.min_score_threshold,
            "matches":    matches,
        })
    }
}

// ── Unit tests ────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::{RoleProfile, SeniorityLevel, SkillSet};

    fn make_seeker() -> JobSeekerProfile {
        let mut s = JobSeekerProfile::new("Bob", SeniorityLevel::Senior);
        s.skills.required = vec!["Rust".into(), "PostgreSQL".into()];
        s.preferred_locations = vec!["remote".into()];
        s.min_compensation = Some(150_000);
        s
    }

    fn make_role(title: &str, comp_max: u64, skills: Vec<String>) -> RoleProfile {
        let mut r = RoleProfile::new("Corp", title, "remote", SeniorityLevel::Senior);
        r.skills.required = skills;
        r.compensation_range = Some((120_000, comp_max));
        r
    }

    #[test]
    fn top_n_is_respected() {
        let seeker = make_seeker();
        let roles = vec![
            make_role("Eng A", 200_000, vec!["Rust".into(), "PostgreSQL".into()]),
            make_role("Eng B", 200_000, vec!["Rust".into(), "PostgreSQL".into()]),
            make_role("Eng C", 200_000, vec!["Rust".into(), "PostgreSQL".into()]),
        ];
        let recs = RecruitingRecommender::new().recommend(&seeker, &roles, 2);
        assert_eq!(recs.len(), 2);
    }

    #[test]
    fn threshold_filters_poor_matches() {
        let seeker = make_seeker();
        let roles = vec![
            make_role("Eng A", 140_000, vec!["Java".into(), "Spring".into()]),
        ];
        // Skill overlap = 0, comp below ask → score should be below 0.5
        let recs = RecruitingRecommender::new().recommend(&seeker, &roles, 10);
        assert!(recs.is_empty(), "poor match should be filtered out");
    }

    #[test]
    fn sorted_descending_by_score() {
        let seeker = make_seeker();
        let roles = vec![
            make_role("Weak", 200_000, vec!["Java".into()]),
            make_role("Strong", 200_000, vec!["Rust".into(), "PostgreSQL".into()]),
        ];
        let recs = RecruitingRecommender::with_threshold(0.0).recommend(&seeker, &roles, 10);
        assert!(recs.len() >= 2);
        assert!(recs[0].score >= recs[1].score);
    }
}

