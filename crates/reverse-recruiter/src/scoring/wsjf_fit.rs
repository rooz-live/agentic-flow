//! WSJF-Based Job Fit Scoring
//!
//! Maps the WSJF formula to job search: CoD = salary_delta × urgency × career_growth,
//! job_size = application_effort. Higher WSJF = apply first.

use crate::domains::job_matching::{FitScore, JobSpec};
use crate::domains::profile::ProfileAggregate;

/// Weights for combining fit dimensions.
#[derive(Debug, Clone)]
pub struct FitWeights {
    pub skill_weight: f32,
    pub experience_weight: f32,
    pub preference_weight: f32,
    pub wsjf_weight: f32,
}

impl Default for FitWeights {
    fn default() -> Self {
        Self {
            skill_weight: 0.35,
            experience_weight: 0.15,
            preference_weight: 0.25,
            wsjf_weight: 0.25,
        }
    }
}

/// WSJF-adapted job fit scorer.
///
/// Maps WSJF concepts to job search:
/// - `business_value` → compensation fit (salary vs. expectations)
/// - `time_criticality` → application urgency (days until close)
/// - `risk_reduction` → career risk reduction (stability, growth)
/// - `job_size` → application effort (hours to apply)
pub struct WsjfFitScorer {
    pub weights: FitWeights,
}

impl Default for WsjfFitScorer {
    fn default() -> Self {
        Self {
            weights: FitWeights::default(),
        }
    }
}

impl WsjfFitScorer {
    pub fn new(weights: FitWeights) -> Self {
        Self { weights }
    }

    /// Compute WSJF score for a job relative to a profile.
    ///
    /// WSJF = (compensation_fit + urgency + career_value) / application_effort
    pub fn compute_wsjf(&self, profile: &ProfileAggregate, job: &JobSpec) -> f32 {
        let compensation_fit = self.compensation_fit(profile, job);
        let urgency = self.urgency(job);
        let career_value = self.career_value(profile, job);
        let effort = self.application_effort(job);

        (compensation_fit + urgency + career_value) / effort
    }

    /// Compensation fit: how well does the salary match expectations?
    /// Maps to WSJF `business_value`.
    fn compensation_fit(&self, profile: &ProfileAggregate, job: &JobSpec) -> f32 {
        match profile.preferences.min_salary {
            Some(min_sal) => {
                let midpoint = (job.salary_min + job.salary_max) / 2.0;
                if midpoint >= min_sal * 1.2 {
                    10.0 // exceeds by 20%+
                } else if midpoint >= min_sal {
                    5.0 + 5.0 * ((midpoint - min_sal) / (min_sal * 0.2)) as f32
                } else {
                    (midpoint / min_sal * 5.0) as f32
                }
            }
            None => 5.0, // neutral if no preference
        }
    }

    /// Urgency: how soon does the posting close?
    /// Maps to WSJF `time_criticality`.
    fn urgency(&self, job: &JobSpec) -> f32 {
        match job.days_until_close {
            Some(days) if days <= 3 => 10.0,
            Some(days) if days <= 7 => 8.0,
            Some(days) if days <= 14 => 6.0,
            Some(days) if days <= 30 => 4.0,
            Some(_) => 2.0,
            None => 3.0, // moderate urgency if unknown
        }
    }

    /// Career value: stability and growth potential.
    /// Maps to WSJF `risk_reduction`.
    fn career_value(&self, profile: &ProfileAggregate, job: &JobSpec) -> f32 {
        let mut value = 5.0f32;

        // Skill growth: jobs requiring skills you don't have = learning opportunity
        let (skill_match, _, missing) = job.skill_overlap(profile);
        if !missing.is_empty() && skill_match > 0.5 {
            // Reachable stretch role
            value += 2.0;
        }

        // Title progression heuristic
        if job.title.contains("Senior") || job.title.contains("Staff") || job.title.contains("Lead")
        {
            if profile.total_years_experience >= 5.0 {
                value += 1.5;
            }
        }

        // Company size diversity
        value += 1.0;

        value.min(10.0)
    }

    /// Application effort: hours required to apply.
    /// Maps to WSJF `job_size`.
    fn application_effort(&self, job: &JobSpec) -> f32 {
        // Normalize to [1, 10] scale
        let hours = job.application_effort_hours;
        (hours * 2.5).clamp(1.0, 10.0)
    }

    /// Compute the full FitScore for a profile-job pair.
    pub fn score_fit(&self, profile: &ProfileAggregate, job: &JobSpec) -> FitScore {
        let (skill_match, matched, missing) = job.skill_overlap(profile);
        let experience_match = self.experience_match(profile, job);
        let preference_match = job.preference_compatible(profile);
        let wsjf_raw = self.compute_wsjf(profile, job);

        // Normalize WSJF to [0, 1] — typical range is 1-30
        let wsjf_normalized = (wsjf_raw / 30.0).min(1.0);

        let w = &self.weights;
        let overall = skill_match * w.skill_weight
            + experience_match * w.experience_weight
            + preference_match * w.preference_weight
            + wsjf_normalized * w.wsjf_weight;

        FitScore {
            job_id: job.id.clone(),
            profile_id: profile.id.clone(),
            skill_match,
            experience_match,
            preference_match,
            wsjf_score: wsjf_raw,
            overall_fit: overall.min(1.0),
            keyword_gaps: missing,
            strengths: matched,
        }
    }

    /// Experience match: does the candidate meet years-of-experience requirements?
    fn experience_match(&self, profile: &ProfileAggregate, job: &JobSpec) -> f32 {
        let ratio = profile.total_years_experience / job.min_years_experience.max(0.5);
        if ratio >= 1.0 {
            1.0
        } else {
            ratio
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domains::job_matching::{CompanySize, WorkArrangement};
    use crate::domains::profile::{Preferences, Skill, SkillLevel};

    fn make_profile() -> ProfileAggregate {
        ProfileAggregate {
            id: "P1".into(),
            name: "Test Candidate".into(),
            skills: vec![
                Skill {
                    name: "rust".into(),
                    level: SkillLevel::Expert,
                    years_experience: 5.0,
                    category: "language".into(),
                },
                Skill {
                    name: "python".into(),
                    level: SkillLevel::Advanced,
                    years_experience: 3.0,
                    category: "language".into(),
                },
                Skill {
                    name: "docker".into(),
                    level: SkillLevel::Intermediate,
                    years_experience: 2.0,
                    category: "tool".into(),
                },
            ],
            experience: vec![],
            preferences: Preferences {
                min_salary: Some(120000.0),
                remote_ok: true,
                hybrid_ok: true,
                onsite_ok: false,
                ..Preferences::default()
            },
            total_years_experience: 5.0,
            education_level: "bachelors".into(),
        }
    }

    fn make_job() -> JobSpec {
        JobSpec {
            id: "J1".into(),
            title: "Senior Software Engineer".into(),
            company: "TechCorp".into(),
            industry: "tech".into(),
            required_skills: vec!["rust".into(), "python".into(), "kubernetes".into()],
            preferred_skills: vec!["docker".into()],
            min_years_experience: 4.0,
            salary_min: 130000.0,
            salary_max: 170000.0,
            location: "Remote".into(),
            work_arrangement: WorkArrangement::Remote,
            company_size: CompanySize::Mid,
            visa_sponsorship: false,
            days_until_close: Some(14),
            application_effort_hours: 1.5,
            apply_url: None,
            source: None,
        }
    }

    #[test]
    fn test_wsjf_scoring() {
        let scorer = WsjfFitScorer::default();
        let profile = make_profile();
        let job = make_job();

        let wsjf = scorer.compute_wsjf(&profile, &job);
        assert!(wsjf > 0.0, "WSJF should be positive: {}", wsjf);
    }

    #[test]
    fn test_fit_score() {
        let scorer = WsjfFitScorer::default();
        let profile = make_profile();
        let job = make_job();

        let fit = scorer.score_fit(&profile, &job);
        assert!(fit.overall_fit > 0.0 && fit.overall_fit <= 1.0);
        assert!(fit.skill_match > 0.0);
        assert!(fit.strengths.contains(&"rust".to_string()));
        assert!(fit.keyword_gaps.contains(&"kubernetes".to_string()));
    }

    #[test]
    fn test_urgency_scaling() {
        let scorer = WsjfFitScorer::default();
        let mut job = make_job();

        job.days_until_close = Some(2);
        let urgent = scorer.urgency(&job);

        job.days_until_close = Some(45);
        let not_urgent = scorer.urgency(&job);

        assert!(urgent > not_urgent, "Closer deadline = higher urgency");
    }

    #[test]
    fn test_dealbreaker_zeroes_preference() {
        let mut profile = make_profile();
        profile.preferences.dealbreaker_industries = vec!["defense".into()];

        let mut job = make_job();
        job.industry = "defense".into();

        let pref = job.preference_compatible(&profile);
        assert_eq!(pref, 0.0, "Dealbreaker industry should zero out preference");
    }
}
