//! Application Strategy Domain
//!
//! Reverse recruiting logic: generates application plans with outreach sequences,
//! resume tailoring recommendations, and interview prep suggestions.

use serde::{Deserialize, Serialize};

use super::job_matching::{FitScore, JobSpec};
use super::profile::ProfileAggregate;

/// An outreach step in the application sequence.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OutreachStep {
    pub day: u32,
    pub action: String,
    pub channel: String,
    pub template_key: String,
}

/// Resume tailoring recommendation for a specific job.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResumeTailoring {
    pub job_id: String,
    pub keywords_to_add: Vec<String>,
    pub keywords_to_emphasize: Vec<String>,
    pub sections_to_reorder: Vec<String>,
    pub estimated_ats_improvement: f32,
}

/// Interview preparation suggestion.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InterviewPrep {
    pub topic: String,
    pub difficulty: String,
    pub profile_gap: bool,
    pub suggested_resources: Vec<String>,
}

/// ApplicationPlan — DDD aggregate for a candidate's job application strategy.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApplicationPlan {
    pub profile_id: String,
    pub target_jobs: Vec<String>,
    pub outreach_sequence: Vec<OutreachStep>,
    pub resume_tailoring: Vec<ResumeTailoring>,
    pub interview_prep: Vec<InterviewPrep>,
    pub estimated_total_hours: f32,
    pub priority_tier: String,
}

impl ApplicationPlan {
    /// Generate an application plan from ranked fit scores.
    pub fn generate(
        profile: &ProfileAggregate,
        ranked_fits: &[FitScore],
        jobs: &[JobSpec],
    ) -> Self {
        let top_jobs: Vec<&FitScore> = ranked_fits.iter().take(5).collect();

        let outreach = Self::build_outreach_sequence(&top_jobs);
        let tailoring = Self::build_resume_tailoring(&top_jobs, jobs);
        let prep = Self::build_interview_prep(profile, &top_jobs, jobs);

        let total_hours: f32 = top_jobs
            .iter()
            .filter_map(|f| jobs.iter().find(|j| j.id == f.job_id))
            .map(|j| j.application_effort_hours + 1.0) // +1h for tailoring
            .sum();

        let tier = if top_jobs.first().map(|f| f.overall_fit).unwrap_or(0.0) > 0.7 {
            "A"
        } else if top_jobs.first().map(|f| f.overall_fit).unwrap_or(0.0) > 0.4 {
            "B"
        } else {
            "C"
        };

        ApplicationPlan {
            profile_id: profile.id.clone(),
            target_jobs: top_jobs.iter().map(|f| f.job_id.clone()).collect(),
            outreach_sequence: outreach,
            resume_tailoring: tailoring,
            interview_prep: prep,
            estimated_total_hours: total_hours,
            priority_tier: tier.into(),
        }
    }

    fn build_outreach_sequence(fits: &[&FitScore]) -> Vec<OutreachStep> {
        let mut steps = Vec::new();
        for (i, fit) in fits.iter().enumerate() {
            let day_offset = i as u32;

            steps.push(OutreachStep {
                day: day_offset,
                action: format!("Submit application for {}", fit.job_id),
                channel: "direct_apply".into(),
                template_key: "application_submit".into(),
            });

            steps.push(OutreachStep {
                day: day_offset + 3,
                action: format!("Follow up on {} application", fit.job_id),
                channel: "linkedin".into(),
                template_key: "followup_connect".into(),
            });

            if fit.overall_fit > 0.6 {
                steps.push(OutreachStep {
                    day: day_offset + 7,
                    action: format!("Second follow-up for {}", fit.job_id),
                    channel: "email".into(),
                    template_key: "followup_value_add".into(),
                });
            }
        }
        steps
    }

    fn build_resume_tailoring(fits: &[&FitScore], jobs: &[JobSpec]) -> Vec<ResumeTailoring> {
        fits.iter()
            .filter_map(|fit| {
                let job = jobs.iter().find(|j| j.id == fit.job_id)?;
                let keywords_to_add = fit.keyword_gaps.clone();
                let keywords_to_emphasize = fit.strengths.clone();

                // Heuristic: reorder sections based on what the job emphasizes
                let mut sections = Vec::new();
                if job.min_years_experience > 5.0 {
                    sections.push("experience".into());
                    sections.push("skills".into());
                } else {
                    sections.push("skills".into());
                    sections.push("experience".into());
                }

                let ats_improvement = if keywords_to_add.is_empty() {
                    0.05
                } else {
                    keywords_to_add.len() as f32 * 0.08
                };

                Some(ResumeTailoring {
                    job_id: fit.job_id.clone(),
                    keywords_to_add,
                    keywords_to_emphasize,
                    sections_to_reorder: sections,
                    estimated_ats_improvement: ats_improvement.min(0.5),
                })
            })
            .collect()
    }

    fn build_interview_prep(
        profile: &ProfileAggregate,
        fits: &[&FitScore],
        jobs: &[JobSpec],
    ) -> Vec<InterviewPrep> {
        let mut prep = Vec::new();

        // Collect all unique skill gaps across top jobs
        let mut all_gaps: Vec<String> = fits
            .iter()
            .flat_map(|f| f.keyword_gaps.iter().cloned())
            .collect();
        all_gaps.sort();
        all_gaps.dedup();

        for gap in &all_gaps {
            prep.push(InterviewPrep {
                topic: gap.clone(),
                difficulty: "medium".into(),
                profile_gap: true,
                suggested_resources: vec![
                    format!("{} documentation", gap),
                    format!("{} practice problems", gap),
                ],
            });
        }

        // System design prep if senior roles
        let has_senior = jobs.iter().any(|j| {
            j.title.contains("Senior") || j.title.contains("Staff")
        });
        if has_senior && profile.total_years_experience >= 3.0 {
            prep.push(InterviewPrep {
                topic: "System Design".into(),
                difficulty: "hard".into(),
                profile_gap: false,
                suggested_resources: vec![
                    "System Design Interview book".into(),
                    "Distributed systems patterns".into(),
                ],
            });
        }

        prep
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domains::job_matching::{CompanySize, WorkArrangement};
    use crate::domains::profile::{Preferences, Skill, SkillLevel};
    use crate::scoring::wsjf_fit::WsjfFitScorer;

    #[test]
    fn test_application_plan_generation() {
        let profile = ProfileAggregate {
            id: "P1".into(),
            name: "Test".into(),
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
            ],
            experience: vec![],
            preferences: Preferences::default(),
            total_years_experience: 5.0,
            education_level: "bachelors".into(),
        };

        let jobs = vec![
            JobSpec {
                id: "J1".into(),
                title: "Senior Software Engineer".into(),
                company: "TechCorp".into(),
                industry: "tech".into(),
                required_skills: vec!["rust".into(), "kubernetes".into()],
                preferred_skills: vec!["python".into()],
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
            },
            JobSpec {
                id: "J2".into(),
                title: "Backend Developer".into(),
                company: "StartupAI".into(),
                industry: "tech".into(),
                required_skills: vec!["python".into(), "docker".into()],
                preferred_skills: vec![],
                min_years_experience: 2.0,
                salary_min: 100000.0,
                salary_max: 140000.0,
                location: "Remote".into(),
                work_arrangement: WorkArrangement::Remote,
                company_size: CompanySize::Startup,
                visa_sponsorship: false,
                days_until_close: Some(7),
                application_effort_hours: 0.5,
            apply_url: None,
            source: None,
            },
        ];

        let scorer = WsjfFitScorer::default();
        let mut fits: Vec<FitScore> = jobs.iter().map(|j| scorer.score_fit(&profile, j)).collect();
        fits.sort_by(|a, b| b.overall_fit.partial_cmp(&a.overall_fit).unwrap());

        let plan = ApplicationPlan::generate(&profile, &fits, &jobs);

        assert_eq!(plan.profile_id, "P1");
        assert!(!plan.target_jobs.is_empty());
        assert!(!plan.outreach_sequence.is_empty());
        assert!(plan.estimated_total_hours > 0.0);
    }
}
