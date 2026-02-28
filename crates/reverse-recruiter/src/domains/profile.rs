//! Profile Domain
//!
//! DDD aggregate for candidate profiles. Handles resume parsing, skill extraction,
//! and experience graph construction. The `ProfileAggregate` is the root entity.

use rand::Rng;
use ruvector_domain_expansion::{
    Domain, DomainEmbedding, DomainId, Evaluation, Solution, Task,
};
use serde::{Deserialize, Serialize};

const EMBEDDING_DIM: usize = 32;

/// Skill level from extracted resume data.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub enum SkillLevel {
    Beginner,
    Intermediate,
    Advanced,
    Expert,
}

impl SkillLevel {
    pub fn weight(&self) -> f32 {
        match self {
            Self::Beginner => 0.25,
            Self::Intermediate => 0.5,
            Self::Advanced => 0.75,
            Self::Expert => 1.0,
        }
    }
}

/// A single skill extracted from a resume.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Skill {
    pub name: String,
    pub level: SkillLevel,
    pub years_experience: f32,
    /// Normalized category: "language", "framework", "tool", "soft_skill", "domain"
    pub category: String,
}

/// Work experience entry.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Experience {
    pub company: String,
    pub title: String,
    pub duration_months: u32,
    pub is_current: bool,
    pub skills_used: Vec<String>,
}

/// Candidate preferences / dealbreakers.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Preferences {
    pub min_salary: Option<f64>,
    pub max_commute_minutes: Option<u32>,
    pub remote_ok: bool,
    pub hybrid_ok: bool,
    pub onsite_ok: bool,
    pub preferred_industries: Vec<String>,
    pub dealbreaker_industries: Vec<String>,
    pub preferred_company_sizes: Vec<String>,
    pub visa_sponsorship_needed: bool,
}

impl Default for Preferences {
    fn default() -> Self {
        Self {
            min_salary: None,
            max_commute_minutes: None,
            remote_ok: true,
            hybrid_ok: true,
            onsite_ok: true,
            preferred_industries: Vec::new(),
            dealbreaker_industries: Vec::new(),
            preferred_company_sizes: Vec::new(),
            visa_sponsorship_needed: false,
        }
    }
}

/// ProfileAggregate — DDD root entity for a candidate's profile.
///
/// Contains skills, experience, preferences, and computes profile embeddings
/// for job matching via ruvector cross-domain transfer.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfileAggregate {
    pub id: String,
    pub name: String,
    pub skills: Vec<Skill>,
    pub experience: Vec<Experience>,
    pub preferences: Preferences,
    pub total_years_experience: f32,
    pub education_level: String,
}

impl ProfileAggregate {
    /// Extract skills from raw resume text (simple keyword-based extraction).
    pub fn extract_skills_from_text(text: &str) -> Vec<Skill> {
        let skill_patterns: Vec<(&str, &str)> = vec![
            ("rust", "language"),
            ("python", "language"),
            ("typescript", "language"),
            ("javascript", "language"),
            ("go", "language"),
            ("java", "language"),
            ("c++", "language"),
            ("sql", "language"),
            ("react", "framework"),
            ("vue", "framework"),
            ("angular", "framework"),
            ("django", "framework"),
            ("fastapi", "framework"),
            ("tokio", "framework"),
            ("docker", "tool"),
            ("kubernetes", "tool"),
            ("terraform", "tool"),
            ("aws", "tool"),
            ("gcp", "tool"),
            ("azure", "tool"),
            ("git", "tool"),
            ("ci/cd", "tool"),
            ("machine learning", "domain"),
            ("data engineering", "domain"),
            ("distributed systems", "domain"),
            ("microservices", "domain"),
            ("devops", "domain"),
            ("leadership", "soft_skill"),
            ("communication", "soft_skill"),
            ("mentoring", "soft_skill"),
        ];

        let lower = text.to_lowercase();
        skill_patterns
            .iter()
            .filter(|(pattern, _)| lower.contains(pattern))
            .map(|(name, category)| {
                // Heuristic: more mentions = higher level
                let count = lower.matches(name).count();
                let level = match count {
                    0 => unreachable!(),
                    1 => SkillLevel::Intermediate,
                    2..=3 => SkillLevel::Advanced,
                    _ => SkillLevel::Expert,
                };
                Skill {
                    name: name.to_string(),
                    level,
                    years_experience: count as f32 * 1.5,
                    category: category.to_string(),
                }
            })
            .collect()
    }

    /// Compute a skill-weighted profile strength score [0, 1].
    pub fn profile_strength(&self) -> f32 {
        if self.skills.is_empty() {
            return 0.0;
        }
        let weighted_sum: f32 = self
            .skills
            .iter()
            .map(|s| s.level.weight() * s.years_experience.min(10.0) / 10.0)
            .sum();
        (weighted_sum / self.skills.len() as f32).min(1.0)
    }

    /// Total months of work experience.
    pub fn total_experience_months(&self) -> u32 {
        self.experience.iter().map(|e| e.duration_months).sum()
    }
}

/// Profile domain for ruvector cross-domain transfer.
///
/// Tasks: given candidate profiles and job requirements, evaluate skill matching,
/// experience relevance, and preference alignment.
pub struct ProfileDomain {
    id: DomainId,
}

impl ProfileDomain {
    pub fn new() -> Self {
        Self {
            id: DomainId("reverse_recruiting_profile".into()),
        }
    }

    fn random_skill(rng: &mut impl Rng) -> Skill {
        let names = [
            "rust", "python", "typescript", "go", "java", "react",
            "docker", "kubernetes", "aws", "sql", "machine learning",
            "distributed systems", "leadership",
        ];
        let categories = [
            "language", "language", "language", "language", "language", "framework",
            "tool", "tool", "tool", "language", "domain",
            "domain", "soft_skill",
        ];
        let idx = rng.gen_range(0..names.len());
        let level = match rng.gen_range(0..4) {
            0 => SkillLevel::Beginner,
            1 => SkillLevel::Intermediate,
            2 => SkillLevel::Advanced,
            _ => SkillLevel::Expert,
        };

        Skill {
            name: names[idx].into(),
            level,
            years_experience: rng.gen_range(0.5..12.0),
            category: categories[idx].into(),
        }
    }

    fn random_profile(rng: &mut impl Rng, difficulty: f32, idx: usize) -> ProfileAggregate {
        let n_skills = rng.gen_range(3..=12);
        let skills: Vec<Skill> = (0..n_skills).map(|_| Self::random_skill(rng)).collect();

        let n_exp = rng.gen_range(1..=5);
        let experience: Vec<Experience> = (0..n_exp)
            .map(|j| Experience {
                company: format!("Company-{}", j),
                title: if rng.gen::<f32>() < 0.3 {
                    "Senior Engineer".into()
                } else {
                    "Software Engineer".into()
                },
                duration_months: rng.gen_range(6..60),
                is_current: j == 0,
                skills_used: skills
                    .iter()
                    .take(rng.gen_range(1..=skills.len()))
                    .map(|s| s.name.clone())
                    .collect(),
            })
            .collect();

        let total_years = experience.iter().map(|e| e.duration_months).sum::<u32>() as f32 / 12.0;

        // Higher difficulty = more conflicting preferences (harder to match)
        let visa = rng.gen::<f32>() < difficulty * 0.4;
        let remote_only = rng.gen::<f32>() < difficulty * 0.3;

        ProfileAggregate {
            id: format!("PROFILE-{:04}", idx),
            name: format!("Candidate {}", idx),
            skills,
            experience,
            preferences: Preferences {
                min_salary: if rng.gen::<f32>() < 0.7 {
                    Some(rng.gen_range(60000.0..250000.0))
                } else {
                    None
                },
                max_commute_minutes: if !remote_only {
                    Some(rng.gen_range(15..90))
                } else {
                    None
                },
                remote_ok: true,
                hybrid_ok: !remote_only,
                onsite_ok: !remote_only,
                preferred_industries: vec!["tech".into(), "fintech".into()],
                dealbreaker_industries: if rng.gen::<f32>() < difficulty * 0.5 {
                    vec!["defense".into()]
                } else {
                    vec![]
                },
                preferred_company_sizes: vec!["startup".into(), "mid".into()],
                visa_sponsorship_needed: visa,
            },
            total_years_experience: total_years,
            education_level: if rng.gen::<f32>() < 0.6 {
                "bachelors".into()
            } else {
                "masters".into()
            },
        }
    }
}

impl Domain for ProfileDomain {
    fn id(&self) -> &DomainId {
        &self.id
    }

    fn name(&self) -> &str {
        "Reverse Recruiting Profile"
    }

    fn generate_tasks(&self, count: usize, difficulty: f32) -> Vec<Task> {
        let mut rng = rand::thread_rng();
        (0..count)
            .map(|i| {
                let n_profiles = rng.gen_range(1..=4);
                let profiles: Vec<ProfileAggregate> = (0..n_profiles)
                    .map(|j| Self::random_profile(&mut rng, difficulty, i * 100 + j))
                    .collect();

                Task {
                    id: format!("profile-task-{:04}", i),
                    domain_id: self.id.clone(),
                    difficulty,
                    spec: serde_json::json!({
                        "task_type": "evaluate_profiles",
                        "profiles": profiles,
                        "required_outputs": [
                            "profile_strengths",
                            "skill_gaps",
                            "experience_relevance_scores",
                            "preference_compatibility"
                        ],
                    }),
                    constraints: vec![
                        "strengths must be in [0, 1]".into(),
                        "skill gaps must reference actual missing skills".into(),
                        "experience scores normalized by total months".into(),
                    ],
                }
            })
            .collect()
    }

    fn evaluate(&self, task: &Task, solution: &Solution) -> Evaluation {
        let profiles: Vec<ProfileAggregate> = task
            .spec
            .get("profiles")
            .and_then(|p| serde_json::from_value(p.clone()).ok())
            .unwrap_or_default();

        // Check profile strength accuracy
        let sol_strengths: Vec<f32> = solution
            .data
            .get("profile_strengths")
            .and_then(|s| serde_json::from_value(s.clone()).ok())
            .unwrap_or_default();

        let strength_errors: f32 = profiles
            .iter()
            .zip(sol_strengths.iter())
            .map(|(p, sol)| (sol - p.profile_strength()).abs())
            .sum();

        let correctness = if profiles.is_empty() {
            0.0
        } else {
            (1.0 - strength_errors / profiles.len() as f32).max(0.0)
        };

        // Check completeness
        let has_gaps = solution.data.get("skill_gaps").is_some();
        let has_relevance = solution.data.get("experience_relevance_scores").is_some();
        let has_compat = solution.data.get("preference_compatibility").is_some();

        let efficiency = match (has_gaps, has_relevance) {
            (true, true) => 0.9,
            (true, false) | (false, true) => 0.5,
            _ => 0.1,
        };

        let elegance = if has_compat { 0.9 } else { 0.3 };

        Evaluation::composite(correctness, efficiency, elegance)
    }

    fn embed(&self, solution: &Solution) -> DomainEmbedding {
        let mut vec = vec![0.0f32; EMBEDDING_DIM];

        // Encode profile strengths in dims 0-7
        if let Some(strengths) = solution
            .data
            .get("profile_strengths")
            .and_then(|s| s.as_array())
        {
            for (i, s) in strengths.iter().enumerate() {
                if i < 8 {
                    vec[i] = s.as_f64().unwrap_or(0.0) as f32;
                }
            }
        }

        // Encode skill gap count in dim 8
        if let Some(gaps) = solution
            .data
            .get("skill_gaps")
            .and_then(|g| g.as_array())
        {
            vec[8] = gaps.len() as f32 / 20.0;
        }

        // Encode experience relevance in dims 10-17
        if let Some(relevance) = solution
            .data
            .get("experience_relevance_scores")
            .and_then(|r| r.as_array())
        {
            for (i, r) in relevance.iter().enumerate() {
                if i < 8 {
                    vec[10 + i] = r.as_f64().unwrap_or(0.0) as f32;
                }
            }
        }

        // Encode preference compatibility in dims 20-27
        if let Some(compat) = solution
            .data
            .get("preference_compatibility")
            .and_then(|c| c.as_array())
        {
            for (i, c) in compat.iter().enumerate() {
                if i < 8 {
                    vec[20 + i] = c.as_f64().unwrap_or(0.0) as f32;
                }
            }
        }

        DomainEmbedding::new(vec, self.id.clone())
    }

    fn embedding_dim(&self) -> usize {
        EMBEDDING_DIM
    }

    fn reference_solution(&self, task: &Task) -> Option<Solution> {
        let profiles: Vec<ProfileAggregate> = task
            .spec
            .get("profiles")
            .and_then(|p| serde_json::from_value(p.clone()).ok())?;

        let strengths: Vec<f32> = profiles.iter().map(|p| p.profile_strength()).collect();

        // Identify common skill gaps relative to a "senior full-stack" target
        let target_skills = ["rust", "python", "typescript", "docker", "kubernetes", "aws", "sql"];
        let skill_gaps: Vec<Vec<&str>> = profiles
            .iter()
            .map(|p| {
                let has: Vec<&str> = p.skills.iter().map(|s| s.name.as_str()).collect();
                target_skills
                    .iter()
                    .filter(|t| !has.contains(t))
                    .copied()
                    .collect()
            })
            .collect();

        let relevance: Vec<f32> = profiles
            .iter()
            .map(|p| {
                let months = p.total_experience_months() as f32;
                (months / 60.0).min(1.0) // normalize against 5 years
            })
            .collect();

        let compatibility: Vec<f32> = profiles
            .iter()
            .map(|p| {
                let mut score = 0.5f32;
                if p.preferences.remote_ok {
                    score += 0.2;
                }
                if !p.preferences.visa_sponsorship_needed {
                    score += 0.1;
                }
                if p.preferences.dealbreaker_industries.is_empty() {
                    score += 0.1;
                }
                score.min(1.0)
            })
            .collect();

        Some(Solution {
            task_id: task.id.clone(),
            content: format!("Evaluated {} profiles", profiles.len()),
            data: serde_json::json!({
                "profile_strengths": strengths,
                "skill_gaps": skill_gaps,
                "experience_relevance_scores": relevance,
                "preference_compatibility": compatibility,
            }),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_skill_extraction() {
        let resume = "Senior Rust and Python developer with 5 years of experience \
                       in distributed systems. Proficient in Docker, Kubernetes, and AWS. \
                       Strong leadership and communication skills.";
        let skills = ProfileAggregate::extract_skills_from_text(resume);
        assert!(!skills.is_empty());
        assert!(skills.iter().any(|s| s.name == "rust"));
        assert!(skills.iter().any(|s| s.name == "python"));
        assert!(skills.iter().any(|s| s.name == "docker"));
    }

    #[test]
    fn test_profile_strength() {
        let profile = ProfileAggregate {
            id: "test".into(),
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
        let strength = profile.profile_strength();
        assert!(strength > 0.0 && strength <= 1.0);
    }

    #[test]
    fn test_profile_domain_generate_and_evaluate() {
        let domain = ProfileDomain::new();
        let tasks = domain.generate_tasks(3, 0.5);
        assert_eq!(tasks.len(), 3);

        for task in &tasks {
            let solution = domain.reference_solution(task).unwrap();
            let eval = domain.evaluate(task, &solution);
            assert!(
                eval.score > 0.5,
                "Reference solution should score well: {}",
                eval.score
            );
        }
    }

    #[test]
    fn test_profile_embedding_dim() {
        let domain = ProfileDomain::new();
        assert_eq!(domain.embedding_dim(), 32);
    }
}
