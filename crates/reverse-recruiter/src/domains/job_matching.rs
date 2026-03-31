//! Job Matching Domain
//!
//! Situational recommendations engine. Matches candidate profiles to job specs
//! using WSJF-weighted ranking: CoD = salary delta × urgency, job_size = application effort.
//! Cross-domain transfer from WSJF prioritization and document validation domains.

use rand::Rng;
use ruvector_domain_expansion::{
    Domain, DomainEmbedding, DomainId, Evaluation, Solution, Task,
};
use serde::{Deserialize, Serialize};

use super::profile::{ProfileAggregate, Skill, SkillLevel};
use crate::scoring::wsjf_fit::WsjfFitScorer;

const EMBEDDING_DIM: usize = 32;

/// Work arrangement for a job posting.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub enum WorkArrangement {
    Remote,
    Hybrid,
    Onsite,
}

/// Company size bucket.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub enum CompanySize {
    Startup,   // < 50
    Mid,       // 50-500
    Large,     // 500-5000
    Enterprise, // 5000+
}

/// A job specification value object.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobSpec {
    pub id: String,
    pub title: String,
    pub company: String,
    pub industry: String,
    pub required_skills: Vec<String>,
    pub preferred_skills: Vec<String>,
    pub min_years_experience: f32,
    pub salary_min: f64,
    pub salary_max: f64,
    pub location: String,
    pub work_arrangement: WorkArrangement,
    pub company_size: CompanySize,
    pub visa_sponsorship: bool,
    /// Days until posting expires (urgency signal).
    pub days_until_close: Option<u32>,
    /// Estimated hours to complete application.
    pub application_effort_hours: f32,
    /// Direct link to apply (real URL from live API).
    #[serde(default)]
    pub apply_url: Option<String>,
    /// Data source: "adzuna", "usajobs", "greenhouse", "manual".
    #[serde(default)]
    pub source: Option<String>,
}

/// Result of matching a profile against a job.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FitScore {
    pub job_id: String,
    pub profile_id: String,
    pub skill_match: f32,
    pub experience_match: f32,
    pub preference_match: f32,
    pub wsjf_score: f32,
    pub overall_fit: f32,
    pub keyword_gaps: Vec<String>,
    pub strengths: Vec<String>,
}

impl JobSpec {
    /// Compute skill overlap between this job and a profile.
    pub fn skill_overlap(&self, profile: &ProfileAggregate) -> (f32, Vec<String>, Vec<String>) {
        let profile_skills: Vec<&str> = profile.skills.iter().map(|s| s.name.as_str()).collect();

        let mut matched = Vec::new();
        let mut missing = Vec::new();

        for req in &self.required_skills {
            let req_lower = req.to_lowercase();
            if profile_skills.iter().any(|s| s.to_lowercase() == req_lower) {
                matched.push(req.clone());
            } else {
                missing.push(req.clone());
            }
        }

        let total_required = self.required_skills.len().max(1) as f32;
        let match_score = matched.len() as f32 / total_required;

        // Bonus for preferred skills
        let preferred_matched = self
            .preferred_skills
            .iter()
            .filter(|p| {
                let p_lower = p.to_lowercase();
                profile_skills.iter().any(|s| s.to_lowercase() == p_lower)
            })
            .count() as f32;
        let preferred_total = self.preferred_skills.len().max(1) as f32;
        let bonus = preferred_matched / preferred_total * 0.2;

        ((match_score + bonus).min(1.0), matched, missing)
    }

    /// Check if profile preferences are compatible with this job.
    pub fn preference_compatible(&self, profile: &ProfileAggregate) -> f32 {
        let mut score = 1.0f32;
        let prefs = &profile.preferences;

        // Salary check
        if let Some(min_sal) = prefs.min_salary {
            if self.salary_max < min_sal {
                score -= 0.4;
            } else if self.salary_min < min_sal {
                score -= 0.1;
            }
        }

        // Work arrangement
        let arrangement_ok = match self.work_arrangement {
            WorkArrangement::Remote => prefs.remote_ok,
            WorkArrangement::Hybrid => prefs.hybrid_ok,
            WorkArrangement::Onsite => prefs.onsite_ok,
        };
        if !arrangement_ok {
            score -= 0.3;
        }

        // Dealbreaker industries
        if prefs
            .dealbreaker_industries
            .iter()
            .any(|d| d.to_lowercase() == self.industry.to_lowercase())
        {
            score = 0.0; // hard dealbreaker
        }

        // Visa
        if prefs.visa_sponsorship_needed && !self.visa_sponsorship {
            score -= 0.5;
        }

        score.max(0.0)
    }
}

/// Job Matching Domain for ruvector cross-domain transfer.
///
/// Transfer mappings:
/// - WSJF `business_value` → job `compensation_fit`
/// - WSJF `risk_reduction` → job `career_risk_reduction`
/// - WSJF `time_criticality` → job `application_deadline_urgency`
/// - Validation `severity` → job requirement `importance_weight`
pub struct JobMatchingDomain {
    id: DomainId,
}

impl JobMatchingDomain {
    pub fn new() -> Self {
        Self {
            id: DomainId("reverse_recruiting_matching".into()),
        }
    }

    fn random_job(rng: &mut impl Rng, difficulty: f32, idx: usize) -> JobSpec {
        let titles = [
            "Senior Software Engineer",
            "Staff Engineer",
            "Backend Developer",
            "Full Stack Developer",
            "DevOps Engineer",
            "ML Engineer",
            "Platform Engineer",
        ];
        let companies = [
            "TechCorp", "StartupAI", "FinanceHub", "CloudScale",
            "DataDriven", "SecureNet", "GreenEnergy",
        ];
        let industries = [
            "tech", "fintech", "healthcare", "defense", "energy",
            "education", "ecommerce",
        ];
        let all_skills = [
            "rust", "python", "typescript", "go", "java", "react",
            "docker", "kubernetes", "aws", "sql", "machine learning",
            "distributed systems",
        ];

        let n_required = rng.gen_range(3..=6);
        let n_preferred = rng.gen_range(1..=4);

        let mut skill_pool: Vec<&str> = all_skills.to_vec();
        let required: Vec<String> = (0..n_required)
            .filter_map(|_| {
                if skill_pool.is_empty() {
                    return None;
                }
                let idx = rng.gen_range(0..skill_pool.len());
                Some(skill_pool.remove(idx).into())
            })
            .collect();
        let preferred: Vec<String> = (0..n_preferred)
            .filter_map(|_| {
                if skill_pool.is_empty() {
                    return None;
                }
                let idx = rng.gen_range(0..skill_pool.len());
                Some(skill_pool.remove(idx).into())
            })
            .collect();

        let arrangement = match rng.gen_range(0..3) {
            0 => WorkArrangement::Remote,
            1 => WorkArrangement::Hybrid,
            _ => WorkArrangement::Onsite,
        };

        let company_size = match rng.gen_range(0..4) {
            0 => CompanySize::Startup,
            1 => CompanySize::Mid,
            2 => CompanySize::Large,
            _ => CompanySize::Enterprise,
        };

        // Higher difficulty = tighter salary ranges, more requirements
        let salary_min: f64 = rng.gen_range(80000.0..180000.0);
        let salary_spread: f64 = rng.gen_range(10000.0..50000.0) * (1.0 - difficulty as f64 * 0.5);

        JobSpec {
            id: format!("JOB-{:04}", idx),
            title: titles[rng.gen_range(0..titles.len())].into(),
            company: companies[rng.gen_range(0..companies.len())].into(),
            industry: industries[rng.gen_range(0..industries.len())].into(),
            required_skills: required,
            preferred_skills: preferred,
            min_years_experience: rng.gen_range(1.0..8.0) + difficulty * 3.0,
            salary_min,
            salary_max: salary_min + salary_spread,
            location: "San Francisco, CA".into(),
            work_arrangement: arrangement,
            company_size,
            visa_sponsorship: rng.gen::<f32>() > difficulty * 0.5,
            days_until_close: if rng.gen::<f32>() < 0.6 {
                Some(rng.gen_range(3..60))
            } else {
                None
            },
            application_effort_hours: rng.gen_range(0.5..4.0),
            apply_url: None,
            source: None,
        }
    }
}

impl Domain for JobMatchingDomain {
    fn id(&self) -> &DomainId {
        &self.id
    }

    fn name(&self) -> &str {
        "Reverse Recruiting Job Matching"
    }

    fn generate_tasks(&self, count: usize, difficulty: f32) -> Vec<Task> {
        let mut rng = rand::thread_rng();
        (0..count)
            .map(|i| {
                let n_jobs = rng.gen_range(3..=10);
                let jobs: Vec<JobSpec> = (0..n_jobs)
                    .map(|j| Self::random_job(&mut rng, difficulty, i * 100 + j))
                    .collect();

                // Generate a profile to match against
                let profile = ProfileAggregate {
                    id: format!("MATCH-PROFILE-{:04}", i),
                    name: format!("Candidate {}", i),
                    skills: (0..rng.gen_range(4..=8))
                        .map(|_| {
                            let names = [
                                "rust", "python", "typescript", "docker", "aws", "sql",
                            ];
                            let idx = rng.gen_range(0..names.len());
                            Skill {
                                name: names[idx].into(),
                                level: match rng.gen_range(0..4) {
                                    0 => SkillLevel::Beginner,
                                    1 => SkillLevel::Intermediate,
                                    2 => SkillLevel::Advanced,
                                    _ => SkillLevel::Expert,
                                },
                                years_experience: rng.gen_range(1.0..8.0),
                                category: "language".into(),
                            }
                        })
                        .collect(),
                    experience: vec![],
                    preferences: super::profile::Preferences::default(),
                    total_years_experience: rng.gen_range(2.0..15.0),
                    education_level: "bachelors".into(),
                };

                Task {
                    id: format!("match-task-{:04}", i),
                    domain_id: self.id.clone(),
                    difficulty,
                    spec: serde_json::json!({
                        "task_type": "match_jobs",
                        "profile": profile,
                        "jobs": jobs,
                        "required_outputs": [
                            "fit_scores",
                            "ranked_job_ids",
                            "top_recommendations",
                            "keyword_gaps_per_job"
                        ],
                    }),
                    constraints: vec![
                        "fit scores must be in [0, 1]".into(),
                        "ranking must use WSJF-weighted scoring".into(),
                        "keyword gaps must be actual missing skills".into(),
                    ],
                }
            })
            .collect()
    }

    fn evaluate(&self, task: &Task, solution: &Solution) -> Evaluation {
        let jobs: Vec<JobSpec> = task
            .spec
            .get("jobs")
            .and_then(|j| serde_json::from_value(j.clone()).ok())
            .unwrap_or_default();

        let profile: Option<ProfileAggregate> = task
            .spec
            .get("profile")
            .and_then(|p| serde_json::from_value(p.clone()).ok());

        let profile = match profile {
            Some(p) => p,
            None => return Evaluation::composite(0.0, 0.0, 0.0),
        };

        // Check ranking correctness
        let sol_ranking: Vec<String> = solution
            .data
            .get("ranked_job_ids")
            .and_then(|r| serde_json::from_value(r.clone()).ok())
            .unwrap_or_default();

        let scorer = WsjfFitScorer::default();
        let mut expected_scores: Vec<(String, f32)> = jobs
            .iter()
            .map(|j| {
                let fit = scorer.score_fit(&profile, j);
                (j.id.clone(), fit.overall_fit)
            })
            .collect();
        expected_scores.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());

        // Kendall tau concordance
        let mut concordant = 0u32;
        let mut total_pairs = 0u32;
        for i in 0..sol_ranking.len().min(expected_scores.len()) {
            for j in (i + 1)..sol_ranking.len().min(expected_scores.len()) {
                total_pairs += 1;
                let ci = expected_scores.iter().position(|x| x.0 == sol_ranking[i]);
                let cj = expected_scores.iter().position(|x| x.0 == sol_ranking[j]);
                if let (Some(ci), Some(cj)) = (ci, cj) {
                    if ci < cj {
                        concordant += 1;
                    }
                }
            }
        }

        let correctness = if total_pairs > 0 {
            concordant as f32 / total_pairs as f32
        } else {
            0.0
        };

        // Check fit score accuracy
        let sol_scores: Vec<FitScore> = solution
            .data
            .get("fit_scores")
            .and_then(|s| serde_json::from_value(s.clone()).ok())
            .unwrap_or_default();

        let score_errors: f32 = sol_scores
            .iter()
            .filter_map(|sol| {
                expected_scores
                    .iter()
                    .find(|(id, _)| *id == sol.job_id)
                    .map(|(_, expected)| (sol.overall_fit - expected).abs())
            })
            .sum();

        let efficiency = if sol_scores.is_empty() {
            0.0
        } else {
            (1.0 - score_errors / sol_scores.len() as f32).max(0.0)
        };

        let has_recommendations = solution.data.get("top_recommendations").is_some();
        let has_gaps = solution.data.get("keyword_gaps_per_job").is_some();
        let elegance = match (has_recommendations, has_gaps) {
            (true, true) => 0.9,
            (true, false) | (false, true) => 0.5,
            _ => 0.1,
        };

        Evaluation::composite(correctness, efficiency, elegance)
    }

    fn embed(&self, solution: &Solution) -> DomainEmbedding {
        let mut vec = vec![0.0f32; EMBEDDING_DIM];

        // Encode fit scores distribution
        if let Some(scores) = solution
            .data
            .get("fit_scores")
            .and_then(|s| s.as_array())
        {
            let n = scores.len().max(1) as f32;

            // Mean fit in dim 0
            let sum: f32 = scores
                .iter()
                .filter_map(|s| s.get("overall_fit").and_then(|f| f.as_f64()))
                .map(|f| f as f32)
                .sum();
            vec[0] = sum / n;

            // Skill match mean in dim 1
            let skill_sum: f32 = scores
                .iter()
                .filter_map(|s| s.get("skill_match").and_then(|f| f.as_f64()))
                .map(|f| f as f32)
                .sum();
            vec[1] = skill_sum / n;

            // Pref match mean in dim 2
            let pref_sum: f32 = scores
                .iter()
                .filter_map(|s| s.get("preference_match").and_then(|f| f.as_f64()))
                .map(|f| f as f32)
                .sum();
            vec[2] = pref_sum / n;

            // WSJF mean in dim 3
            let wsjf_sum: f32 = scores
                .iter()
                .filter_map(|s| s.get("wsjf_score").and_then(|f| f.as_f64()))
                .map(|f| f as f32)
                .sum();
            vec[3] = wsjf_sum / n;

            // Number of good matches (fit > 0.7) in dim 4
            let good = scores
                .iter()
                .filter(|s| {
                    s.get("overall_fit")
                        .and_then(|f| f.as_f64())
                        .unwrap_or(0.0)
                        > 0.7
                })
                .count();
            vec[4] = good as f32 / n;
        }

        // Encode ranking in dims 8-15
        if let Some(ranked) = solution
            .data
            .get("ranked_job_ids")
            .and_then(|r| r.as_array())
        {
            vec[8] = ranked.len() as f32 / 20.0;
        }

        DomainEmbedding::new(vec, self.id.clone())
    }

    fn embedding_dim(&self) -> usize {
        EMBEDDING_DIM
    }

    fn reference_solution(&self, task: &Task) -> Option<Solution> {
        let jobs: Vec<JobSpec> = task
            .spec
            .get("jobs")
            .and_then(|j| serde_json::from_value(j.clone()).ok())?;

        let profile: ProfileAggregate = task
            .spec
            .get("profile")
            .and_then(|p| serde_json::from_value(p.clone()).ok())?;

        let scorer = WsjfFitScorer::default();

        let mut fit_scores: Vec<FitScore> = jobs
            .iter()
            .map(|j| scorer.score_fit(&profile, j))
            .collect();
        fit_scores.sort_by(|a, b| b.overall_fit.partial_cmp(&a.overall_fit).unwrap());

        let ranked_ids: Vec<&str> = fit_scores.iter().map(|f| f.job_id.as_str()).collect();

        let top_recommendations: Vec<&FitScore> = fit_scores.iter().take(3).collect();

        let keyword_gaps: Vec<serde_json::Value> = fit_scores
            .iter()
            .map(|f| {
                serde_json::json!({
                    "job_id": f.job_id,
                    "gaps": f.keyword_gaps,
                })
            })
            .collect();

        Some(Solution {
            task_id: task.id.clone(),
            content: format!(
                "Matched {} jobs, top fit: {:.2}",
                jobs.len(),
                fit_scores.first().map(|f| f.overall_fit).unwrap_or(0.0)
            ),
            data: serde_json::json!({
                "fit_scores": fit_scores,
                "ranked_job_ids": ranked_ids,
                "top_recommendations": top_recommendations,
                "keyword_gaps_per_job": keyword_gaps,
            }),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_skill_overlap() {
        let job = JobSpec {
            id: "J1".into(),
            title: "Engineer".into(),
            company: "Co".into(),
            industry: "tech".into(),
            required_skills: vec!["rust".into(), "python".into(), "docker".into()],
            preferred_skills: vec!["kubernetes".into()],
            min_years_experience: 3.0,
            salary_min: 100000.0,
            salary_max: 150000.0,
            location: "Remote".into(),
            work_arrangement: WorkArrangement::Remote,
            company_size: CompanySize::Startup,
            visa_sponsorship: false,
            days_until_close: Some(30),
            application_effort_hours: 1.0,
            apply_url: None,
            source: None,
        };

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
            preferences: super::super::profile::Preferences::default(),
            total_years_experience: 5.0,
            education_level: "bachelors".into(),
        };

        let (score, matched, missing) = job.skill_overlap(&profile);
        assert!(score > 0.0);
        assert!(matched.contains(&"rust".to_string()));
        assert!(missing.contains(&"docker".to_string()));
    }

    #[test]
    fn test_matching_domain_generate_and_evaluate() {
        let domain = JobMatchingDomain::new();
        let tasks = domain.generate_tasks(3, 0.5);
        assert_eq!(tasks.len(), 3);

        for task in &tasks {
            let solution = domain.reference_solution(task).unwrap();
            let eval = domain.evaluate(task, &solution);
            assert!(
                eval.score > 0.3,
                "Reference solution should score reasonably: {}",
                eval.score
            );
        }
    }

    #[test]
    fn test_matching_embedding_dim() {
        let domain = JobMatchingDomain::new();
        assert_eq!(domain.embedding_dim(), 32);
    }
}
