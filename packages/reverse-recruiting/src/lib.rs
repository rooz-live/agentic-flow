//! Reverse Recruiting - Rust WASM Service
//!
//! Career recommendation system that ties into recruiting platforms
//! Provides situational recommendations and professional guidance

use wasm_bindgen::prelude::*;
use std::collections::HashMap;

mod career;
mod recommendations;
mod platforms;
mod analysis;

use career::{CareerProfile, SkillMatcher};
use recommendations::RecommendationEngine;
use platforms::{PlatformAdapter, JobSource};
use analysis::CareerAnalyzer;

/// Reverse Recruiting main service
#[wasm_bindgen]
pub struct ReverseRecruiting {
    career_analyzer: CareerAnalyzer,
    recommendation_engine: RecommendationEngine,
    platform_adapters: HashMap<String, PlatformAdapter>,
    user_profile: Option<CareerProfile>,
}

/// Career recommendation result
#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct CareerRecommendation {
    pub title: String,
    pub company: String,
    pub platform: String,
    pub match_score: f64,
    pub reasoning: String,
    pub salary_range: Option<String>,
    pub location: Option<String>,
    pub skills_required: Vec<String>,
    pub application_url: Option<String>,
}

/// Professional skill assessment
#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct SkillAssessment {
    pub skill_name: String,
    pub proficiency_level: f64,
    pub demand_score: f64,
    pub growth_potential: f64,
    pub training_recommendations: Vec<String>,
}

/// Market analysis result
#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct MarketAnalysis {
    pub profession_name: String,
    pub market_demand: f64,
    pub average_salary: f64,
    pub growth_rate: f64,
    pub top_companies: Vec<String>,
    pub required_skills: Vec<String>,
    pub market_trends: Vec<String>,
}

#[wasm_bindgen]
impl ReverseRecruiting {
    /// Create new reverse recruiting service
    #[wasm_bindgen(constructor)]
    pub fn new() -> ReverseRecruiting {
        console_error_panic_hook::set_once();

        let career_analyzer = CareerAnalyzer::new();
        let recommendation_engine = RecommendationEngine::new();
        let mut platform_adapters = HashMap::new();

        // Initialize platform adapters with enhanced capabilities
        platform_adapters.insert("simplify.jobs".to_string(), PlatformAdapter::new("simplify.jobs"));
        platform_adapters.insert("linkedin".to_string(), PlatformAdapter::new("linkedin"));
        platform_adapters.insert("indeed".to_string(), PlatformAdapter::new("indeed"));
        platform_adapters.insert("sprout".to_string(), PlatformAdapter::new("sprout"));
        platform_adapters.insert("mypersonalrecruiter".to_string(), PlatformAdapter::new("mypersonalrecruiter"));
        platform_adapters.insert("reverserecruitingagency".to_string(), PlatformAdapter::new("reverserecruitingagency"));
        platform_adapters.insert("wearecareer".to_string(), PlatformAdapter::new("wearecareer"));

        ReverseRecruiting {
            career_analyzer,
            recommendation_engine,
            platform_adapters,
            user_profile: None,
        }
    }

    /// Set user career profile
    #[wasm_bindgen]
    pub fn set_profile(&mut self, profile_data: JsValue) -> Result<(), JsValue> {
        let profile: CareerProfileData = profile_data
            .into_serde()
            .map_err(|e| JsValue::from_str(&format!("Invalid profile data: {}", e)))?;

        self.user_profile = Some(CareerProfile::from(profile));
        Ok(())
    }

    /// Get career recommendations based on profile
    #[wasm_bindgen]
    pub async fn get_recommendations(&self, limit: Option<usize>) -> Result<JsValue, JsValue> {
        let profile = self.user_profile.as_ref()
            .ok_or_else(|| JsValue::from_str("User profile not set"))?;

        let recommendations = self.recommendation_engine
            .generate_recommendations(profile, limit.unwrap_or(10))
            .await;

        let results: Vec<CareerRecommendation> = recommendations
            .into_iter()
            .map(|r| CareerRecommendation {
                title: r.title,
                company: r.company,
                platform: r.platform,
                match_score: r.match_score,
                reasoning: r.reasoning,
                salary_range: r.salary_range,
                location: r.location,
                skills_required: r.skills_required,
                application_url: r.application_url,
            })
            .collect();

        JsValue::from_serde(&results)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }

    /// Analyze market for a specific profession
    #[wasm_bindgen]
    pub async fn analyze_market(&self, profession: String) -> Result<JsValue, JsValue> {
        let analysis = self.career_analyzer
            .analyze_market(&profession)
            .await;

        let result = MarketAnalysis {
            profession_name: analysis.profession_name,
            market_demand: analysis.market_demand,
            average_salary: analysis.average_salary,
            growth_rate: analysis.growth_rate,
            top_companies: analysis.top_companies,
            required_skills: analysis.required_skills,
            market_trends: analysis.market_trends,
        };

        JsValue::from_serde(&result)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }

    /// Assess user skills against market demand
    #[wasm_bindgen]
    pub fn assess_skills(&self, skills: JsValue) -> Result<JsValue, JsValue> {
        let skill_list: Vec<String> = skills
            .into_serde()
            .map_err(|e| JsValue::from_str(&format!("Invalid skills data: {}", e)))?;

        let profile = self.user_profile.as_ref()
            .ok_or_else(|| JsValue::from_str("User profile not set"))?;

        let assessments = profile.assess_skills(&skill_list);

        let results: Vec<SkillAssessment> = assessments
            .into_iter()
            .map(|a| SkillAssessment {
                skill_name: a.skill_name,
                proficiency_level: a.proficiency_level,
                demand_score: a.demand_score,
                growth_potential: a.growth_potential,
                training_recommendations: a.training_recommendations,
            })
            .collect();

        JsValue::from_serde(&results)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }

    /// Get salary insights for profession and experience
    #[wasm_bindgen]
    pub async fn get_salary_insights(&self, profession: String, experience_years: f64) -> Result<JsValue, JsValue> {
        let insights = self.career_analyzer
            .get_salary_insights(&profession, experience_years)
            .await;

        JsValue::from_serde(&insights)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }

    /// Find my profession based on skills and experience
    #[wasm_bindgen]
    pub async fn find_my_profession(&self, skills: JsValue, interests: JsValue) -> Result<JsValue, JsValue> {
        let skill_list: Vec<String> = skills
            .into_serde()
            .map_err(|e| JsValue::from_str(&format!("Invalid skills data: {}", e)))?;

        let interest_list: Vec<String> = interests
            .into_serde()
            .map_err(|e| JsValue::from_str(&format!("Invalid interests data: {}", e)))?;

        let professions = self.career_analyzer
            .find_matching_professions(&skill_list, &interest_list)
            .await;

        JsValue::from_serde(&professions)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }

    /// Get situational recommendations based on current context
    #[wasm_bindgen]
    pub async fn get_situational_recommendations(&self, context: JsValue) -> Result<JsValue, JsValue> {
        let context_data: SituationalContext = context
            .into_serde()
            .map_err(|e| JsValue::from_str(&format!("Invalid context data: {}", e)))?;
        
        let recommendations = self.recommendation_engine
            .generate_situational_recommendations(&context_data)
            .await;
        
        JsValue::from_serde(&recommendations)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }

    /// Analyze career progression path
    #[wasm_bindgen]
    pub async fn analyze_career_progression(&self, target_role: String) -> Result<JsValue, JsValue> {
        let profile = self.user_profile.as_ref()
            .ok_or_else(|| JsValue::from_str("User profile not set"))?;
        
        let progression = self.career_analyzer
            .analyze_progression_to_role(profile, &target_role)
            .await;
        
        JsValue::from_serde(&progression)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }

    /// Get platform-specific recommendations
    #[wasm_bindgen]
    pub async fn get_platform_recommendations(&self, platform: String, limit: Option<usize>) -> Result<JsValue, JsValue> {
        let adapter = self.platform_adapters.get(&platform)
            .ok_or_else(|| JsValue::from_str(&format!("Platform adapter not found: {}", platform)))?;
        
        let profile = self.user_profile.as_ref()
            .ok_or_else(|| JsValue::from_str("User profile not set"))?;
        
        let recommendations = self.recommendation_engine
            .generate_platform_recommendations(adapter, profile, limit.unwrap_or(5))
            .await;
        
        JsValue::from_serde(&recommendations)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }

    /// Sync profile with backend (Mock API)
    #[wasm_bindgen]
    pub async fn sync_profile(&self) -> Result<JsValue, JsValue> {
        let _profile = self.user_profile.as_ref()
            .ok_or_else(|| JsValue::from_str("User profile not set"))?;

        // Mock network delay using Promise and setTimeout
        let promise = js_sys::Promise::new(&mut |resolve, _| {
            if let Some(window) = web_sys::window() {
                let _ = window.set_timeout_with_callback_and_timeout_and_arguments_0(&resolve, 500);
            } else {
                let _ = resolve.call0(&JsValue::UNDEFINED);
            }
        });
        let _ = wasm_bindgen_futures::JsFuture::from(promise).await;

        #[derive(serde::Serialize)]
        struct SyncResult {
            success: bool,
            last_synced: String,
        }

        let result = SyncResult {
            success: true,
            last_synced: chrono::Utc::now().to_rfc3339(),
        };

        JsValue::from_serde(&result)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }

    /// Fetch jobs from a specific platform directly (Mock API)
    #[wasm_bindgen]
    pub async fn fetch_platform_jobs(&self, platform: String, criteria: JsValue) -> Result<JsValue, JsValue> {
        let adapter = self.platform_adapters.get(&platform)
            .ok_or_else(|| JsValue::from_str(&format!("Platform adapter not found: {}", platform)))?;

        let c: platforms::JobCriteria = criteria.into_serde()
            .unwrap_or_else(|_| platforms::JobCriteria {
                skills: vec![],
                location: None,
                salary_min: None,
                remote: false,
            });

        let jobs = adapter.fetch_jobs(&c).await
            .map_err(|e| JsValue::from_str(&e))?;

        JsValue::from_serde(&jobs)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }
}

// Supporting data structures
#[derive(serde::Serialize, serde::Deserialize)]
struct CareerProfileData {
    name: String,
    email: String,
    skills: Vec<String>,
    experience_years: f64,
    current_title: Option<String>,
    desired_roles: Vec<String>,
    preferred_locations: Vec<String>,
    salary_expectation: Option<f64>,
    work_preferences: WorkPreferences,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct WorkPreferences {
    remote_only: bool,
    full_time: bool,
    contract_ok: bool,
    industries: Vec<String>,
    company_sizes: Vec<String>,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct SituationalContext {
    current_situation: String,
    urgency_level: String,
    geographic_constraints: Vec<String>,
    salary_flexibility: f64,
    industry_preferences: Vec<String>,
    timeline_months: u32,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct CareerProgression {
    current_level: String,
    target_level: String,
    gap_analysis: Vec<String>,
    recommended_steps: Vec<ProgressionStep>,
    estimated_timeline_months: u32,
    success_probability: f64,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct ProgressionStep {
    step_number: u32,
    title: String,
    description: String,
    skills_needed: Vec<String>,
    estimated_duration_months: u32,
    resources: Vec<String>,
}

// Internal modules
pub mod career {
    use super::*;

    pub struct CareerProfile {
        name: String,
        email: String,
        skills: Vec<String>,
        experience_years: f64,
        current_title: Option<String>,
        desired_roles: Vec<String>,
        preferred_locations: Vec<String>,
        salary_expectation: Option<f64>,
        work_preferences: WorkPreferences,
        skill_matcher: SkillMatcher,
    }

    impl CareerProfile {
        pub fn from(data: CareerProfileData) -> Self {
            Self {
                name: data.name,
                email: data.email,
                skills: data.skills,
                experience_years: data.experience_years,
                current_title: data.current_title,
                desired_roles: data.desired_roles,
                preferred_locations: data.preferred_locations,
                salary_expectation: data.salary_expectation,
                work_preferences: data.work_preferences,
                skill_matcher: SkillMatcher::new(),
            }
        }

        pub fn assess_skills(&self, skills: &[String]) -> Vec<SkillAssessmentInternal> {
            skills.iter()
                .map(|skill| {
                    let proficiency = self.skill_matcher.assess_proficiency(skill, &self.skills);
                    let demand = self.skill_matcher.get_market_demand(skill);
                    let growth = self.skill_matcher.get_growth_potential(skill);
                    let training = self.skill_matcher.get_training_recommendations(skill, proficiency);

                    SkillAssessmentInternal {
                        skill_name: skill.clone(),
                        proficiency_level: proficiency,
                        demand_score: demand,
                        growth_potential: growth,
                        training_recommendations: training,
                    }
                })
                .collect()
        }
    }

    pub struct SkillMatcher;

    impl SkillMatcher {
        pub fn new() -> Self {
            Self
        }

        pub fn assess_proficiency(&self, skill: &str, user_skills: &[String]) -> f64 {
            if user_skills.contains(&skill.to_string()) {
                0.8 // User has the skill
            } else {
                0.2 // User doesn't have the skill
            }
        }

        pub fn get_market_demand(&self, skill: &str) -> f64 {
            // Mock market demand data
            match skill.to_lowercase().as_str() {
                "javascript" | "python" | "react" => 0.9,
                "rust" | "go" | "typescript" => 0.8,
                "java" | "c++" | "c#" => 0.7,
                _ => 0.5,
            }
        }

        pub fn get_growth_potential(&self, skill: &str) -> f64 {
            match skill.to_lowercase().as_str() {
                "rust" | "go" | "kubernetes" => 0.9,
                "typescript" | "react" => 0.8,
                "python" | "aws" => 0.7,
                _ => 0.5,
            }
        }

        pub fn get_training_recommendations(&self, skill: &str, proficiency: f64) -> Vec<String> {
            if proficiency < 0.5 {
                vec![
                    format!("Complete online course for {}", skill),
                    format!("Build a project with {}", skill),
                    "Get certification".to_string(),
                ]
            } else {
                vec![
                    format!("Advanced {} training", skill),
                    "Mentor others".to_string(),
                    "Contribute to open source".to_string(),
                ]
            }
        }
    }

    #[derive(Debug, Clone)]
    pub struct SkillAssessmentInternal {
        pub skill_name: String,
        pub proficiency_level: f64,
        pub demand_score: f64,
        pub growth_potential: f64,
        pub training_recommendations: Vec<String>,
    }
}

pub mod recommendations {
    use super::*;

    pub struct RecommendationEngine;

    impl RecommendationEngine {
        pub fn new() -> Self {
            Self
        }

        pub async fn generate_situational_recommendations(
            &self,
            context: &SituationalContext,
        ) -> Vec<RecommendationInternal> {
            let mut recommendations = vec![];
            
            match context.current_situation.as_str() {
                "career_transition" => {
                    recommendations.push(RecommendationInternal {
                        title: "Career Transition Specialist".to_string(),
                        company: "Career Catalyst".to_string(),
                        platform: "sprout".to_string(),
                        match_score: 0.92,
                        reasoning: "Specialized in career transitions with 1-on-1 coaching".to_string(),
                        salary_range: Some("$80k-$120k".to_string()),
                        location: Some("Remote".to_string()),
                        skills_required: vec!["Coaching".to_string(), "Career Development".to_string()],
                        application_url: Some("https://sprout.com/apply/transition".to_string()),
                    });
                }
                "layoff_recovery" => {
                    recommendations.push(RecommendationInternal {
                        title: "Layoff Recovery Advocate".to_string(),
                        company: "MyPersonalRecruiter".to_string(),
                        platform: "mypersonalrecruiter".to_string(),
                        match_score: 0.88,
                        reasoning: "Dedicated support for layoff recovery with rapid placement".to_string(),
                        salary_range: Some("$70k-$110k".to_string()),
                        location: Some("Remote".to_string()),
                        skills_required: vec!["Recruiting".to_string(), "Career Counseling".to_string()],
                        application_url: Some("https://mypersonalrecruiter.com/layoff".to_string()),
                    });
                }
                _ => {
                    // Default recommendations
                }
            }
            
            recommendations
        }
        
        pub async fn generate_platform_recommendations(
            &self,
            adapter: &PlatformAdapter,
            profile: &CareerProfile,
            limit: usize,
        ) -> Vec<RecommendationInternal> {
            let mut recommendations = vec![];
            
            match adapter.platform_name.as_str() {
                "sprout" => {
                    recommendations.push(RecommendationInternal {
                        title: "Growth Career Coach".to_string(),
                        company: "Sprout Careers".to_string(),
                        platform: "sprout".to_string(),
                        match_score: 0.85,
                        reasoning: "AI-powered career coaching with personalized growth plans".to_string(),
                        salary_range: Some("$90k-$130k".to_string()),
                        location: Some("Remote".to_string()),
                        skills_required: vec!["AI".to_string(), "Coaching".to_string(), "Data Analysis".to_string()],
                        application_url: Some("https://usesprout.com/apply".to_string()),
                    });
                }
                "mypersonalrecruiter" => {
                    recommendations.push(RecommendationInternal {
                        title: "Personal Talent Scout".to_string(),
                        company: "MyPersonalRecruiter".to_string(),
                        platform: "mypersonalrecruiter".to_string(),
                        match_score: 0.82,
                        reasoning: "Personalized recruiting with dedicated talent scout".to_string(),
                        salary_range: Some("$85k-$125k".to_string()),
                        location: Some("Remote".to_string()),
                        skills_required: vec!["Recruiting".to_string(), "Relationship Management".to_string()],
                        application_url: Some("https://mypersonalrecruiter.com/apply".to_string()),
                    });
                }
                "reverserecruitingagency" => {
                    recommendations.push(RecommendationInternal {
                        title: "Reverse Recruiting Consultant".to_string(),
                        company: "Reverse Recruiting Agency".to_string(),
                        platform: "reverserecruitingagency".to_string(),
                        match_score: 0.79,
                        reasoning: "Full-service reverse recruiting with market analysis".to_string(),
                        salary_range: Some("$75k-$115k".to_string()),
                        location: Some("Remote".to_string()),
                        skills_required: vec!["Market Analysis".to_string(), "Client Management".to_string()],
                        application_url: Some("https://reverserecruitingagency.com/apply".to_string()),
                    });
                }
                "wearecareer" => {
                    recommendations.push(RecommendationInternal {
                        title: "Career Strategy Advisor".to_string(),
                        company: "We Are Career".to_string(),
                        platform: "wearecareer".to_string(),
                        match_score: 0.77,
                        reasoning: "Strategic career planning with industry insights".to_string(),
                        salary_range: Some("$80k-$120k".to_string()),
                        location: Some("Remote".to_string()),
                        skills_required: vec!["Strategy".to_string(), "Industry Knowledge".to_string()],
                        application_url: Some("https://wearecareer.com/apply".to_string()),
                    });
                }
                _ => {}
            }
            
            recommendations.into_iter().take(limit).collect()
        }
    }

    #[derive(Debug, Clone)]
    pub struct RecommendationInternal {
        pub title: String,
        pub company: String,
        pub platform: String,
        pub match_score: f64,
        pub reasoning: String,
        pub salary_range: Option<String>,
        pub location: Option<String>,
        pub skills_required: Vec<String>,
        pub application_url: Option<String>,
    }
}

pub mod platforms {
    use super::*;

    pub struct PlatformAdapter {
        platform_name: String,
    }

    impl PlatformAdapter {
        pub fn new(name: &str) -> Self {
            Self {
                platform_name: name.to_string(),
            }
        }
    }

    pub trait JobSource {
        async fn fetch_jobs(&self, criteria: &JobCriteria) -> Result<Vec<Job>, String>;
    }

    impl JobSource for PlatformAdapter {
        async fn fetch_jobs(&self, criteria: &JobCriteria) -> Result<Vec<Job>, String> {
            // Mock network delay using Promise and setTimeout
            let promise = js_sys::Promise::new(&mut |resolve, _| {
                if let Some(window) = web_sys::window() {
                    let _ = window.set_timeout_with_callback_and_timeout_and_arguments_0(&resolve, 800);
                } else {
                    let _ = resolve.call0(&JsValue::UNDEFINED);
                }
            });
            let _ = wasm_bindgen_futures::JsFuture::from(promise).await;

            // Mock implementation based on platform
            let mut jobs = vec![];

            if self.platform_name == "linkedin" {
                jobs.push(Job {
                    id: "li-101".to_string(),
                    title: "Senior Rust Developer".to_string(),
                    company: "Tech Giant".to_string(),
                    description: "Looking for an experienced Rust developer to join our core systems team.".to_string(),
                    requirements: vec!["Rust".to_string(), "WASM".to_string(), "Distributed Systems".to_string()],
                    salary_range: Some("$150k - $200k".to_string()),
                    location: criteria.location.clone().unwrap_or_else(|| "Remote".to_string()),
                    remote: criteria.remote,
                });
            } else if self.platform_name == "simplify.jobs" {
                jobs.push(Job {
                    id: "simp-202".to_string(),
                    title: "Agentic AI Engineer".to_string(),
                    company: "Startup AI".to_string(),
                    description: "Build the future of autonomous agents using Rust and LLMs.".to_string(),
                    requirements: vec!["Rust".to_string(), "LLMs".to_string(), "Python".to_string()],
                    salary_range: Some("$130k - $180k".to_string()),
                    location: criteria.location.clone().unwrap_or_else(|| "San Francisco".to_string()),
                    remote: true,
                });
            } else {
                jobs.push(Job {
                    id: format!("{}-303", self.platform_name),
                    title: "Software Engineer".to_string(),
                    company: "Generic Corp".to_string(),
                    description: "Standard engineering role.".to_string(),
                    requirements: criteria.skills.clone(),
                    salary_range: criteria.salary_min.map(|s| format!("${}k+", s / 1000.0)),
                    location: criteria.location.clone().unwrap_or_else(|| "Unknown".to_string()),
                    remote: criteria.remote,
                });
            }

            Ok(jobs)
        }
    }

    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct JobCriteria {
        pub skills: Vec<String>,
        pub location: Option<String>,
        pub salary_min: Option<f64>,
        pub remote: bool,
    }

    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct Job {
        pub id: String,
        pub title: String,
        pub company: String,
        pub description: String,
        pub requirements: Vec<String>,
        pub salary_range: Option<String>,
        pub location: String,
        pub remote: bool,
    }
}

pub mod analysis {
    use super::*;

    pub struct CareerAnalyzer;

    impl CareerAnalyzer {
        pub fn new() -> Self {
            Self
        }

        pub async fn analyze_progression_to_role(
            &self,
            profile: &CareerProfile,
            target_role: &str,
        ) -> CareerProgression {
            let current_level = profile.current_title.clone().unwrap_or_else(|| "Entry Level".to_string());
            
            let gap_analysis = self.analyze_skill_gaps(&profile.skills, target_role);
            let recommended_steps = self.create_progression_steps(&current_level, target_role, &gap_analysis);
            let estimated_timeline = self.calculate_timeline(&recommended_steps);
            let success_probability = self.calculate_success_probability(&profile.skills, &gap_analysis);
            
            CareerProgression {
                current_level,
                target_level: target_role.to_string(),
                gap_analysis,
                recommended_steps,
                estimated_timeline_months: estimated_timeline,
                success_probability,
            }
        }
        
        fn analyze_skill_gaps(&self, current_skills: &[String], target_role: &str) -> Vec<String> {
            let required_skills = match target_role {
                "Senior Software Engineer" => vec!["System Design", "Architecture", "Team Leadership"],
                "Product Manager" => vec!["Product Strategy", "User Research", "Stakeholder Management"],
                "Data Scientist" => vec!["Machine Learning", "Statistics", "Data Engineering"],
                _ => vec!["Communication", "Leadership", "Strategic Thinking"],
            };
            
            required_skills
                .into_iter()
                .filter(|skill| !current_skills.contains(&skill.to_string()))
                .map(|s| s.to_string())
                .collect()
        }
        
        fn create_progression_steps(&self, current: &str, target: &str, gaps: &[String]) -> Vec<ProgressionStep> {
            let mut steps = vec![];
            let mut step_number = 1;
            
            // Foundation steps
            for gap in gaps {
                steps.push(ProgressionStep {
                    step_number,
                    title: format!("Master {}", gap),
                    description: format!("Develop proficiency in {}", gap),
                    skills_needed: vec![gap.clone()],
                    estimated_duration_months: 3,
                    resources: vec![format!("{} course", gap), format!("{} projects", gap)],
                });
                step_number += 1;
            }
            
            // Role-specific steps
            if target.contains("Senior") {
                steps.push(ProgressionStep {
                    step_number,
                    title: "Leadership Experience".to_string(),
                    description: "Gain experience leading projects and mentoring others".to_string(),
                    skills_needed: vec!["Leadership".to_string(), "Mentoring".to_string()],
                    estimated_duration_months: 6,
                    resources: vec!["Leadership training".to_string(), "Mentorship program".to_string()],
                });
            }
            
            steps
        }
        
        fn calculate_timeline(&self, steps: &[ProgressionStep]) -> u32 {
            steps.iter().map(|s| s.estimated_duration_months).sum()
        }
        
        fn calculate_success_probability(&self, current_skills: &[String], gaps: &[String]) -> f64 {
            let base_probability = 0.8;
            let gap_penalty = gaps.len() as f64 * 0.05;
            let skill_bonus = current_skills.len() as f64 * 0.01;
            
            (base_probability - gap_penalty + skill_bonus).max(0.3).min(0.95)
        }

        pub async fn get_salary_insights(&self, profession: &str, experience_years: f64) -> SalaryInsights {
            let base_salary = match profession {
                "Software Engineer" => 90000.0,
                "Data Scientist" => 110000.0,
                "Product Manager" => 105000.0,
                _ => 75000.0,
            };

            let experience_multiplier = 1.0 + (experience_years * 0.05);
            let adjusted_salary = base_salary * experience_multiplier;

            SalaryInsights {
                base_salary,
                adjusted_salary,
                percentile_25: adjusted_salary * 0.8,
                percentile_75: adjusted_salary * 1.3,
                percentile_90: adjusted_salary * 1.5,
            }
        }

        pub async fn find_matching_professions(&self, skills: &[String], interests: &[String]) -> Vec<ProfessionMatch> {
            vec![
                ProfessionMatch {
                    name: "Software Engineer".to_string(),
                    match_score: 0.9,
                    description: "Design and develop software systems".to_string(),
                    required_skills: vec!["Programming".to_string(), "Problem Solving".to_string()],
                    growth_potential: 0.85,
                },
                ProfessionMatch {
                    name: "Data Scientist".to_string(),
                    match_score: 0.75,
                    description: "Analyze complex data and build predictive models".to_string(),
                    required_skills: vec!["Statistics".to_string(), "Machine Learning".to_string()],
                    growth_potential: 0.9,
                },
            ]
        }
    }

    #[derive(Debug)]
    pub struct MarketAnalysisInternal {
        pub profession_name: String,
        pub market_demand: f64,
        pub average_salary: f64,
        pub growth_rate: f64,
        pub top_companies: Vec<String>,
        pub required_skills: Vec<String>,
        pub market_trends: Vec<String>,
    }

    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct SalaryInsights {
        pub base_salary: f64,
        pub adjusted_salary: f64,
        pub percentile_25: f64,
        pub percentile_75: f64,
        pub percentile_90: f64,
    }

    #[derive(Debug)]
    pub struct ProfessionMatch {
        pub name: String,
        pub match_score: f64,
        pub description: String,
        pub required_skills: Vec<String>,
        pub growth_potential: f64,
    }
}
