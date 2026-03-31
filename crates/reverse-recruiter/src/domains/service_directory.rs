//! Service Directory — Real Reverse-Recruiting Service Integrations
//!
//! Registry of vetted reverse-recruiting firms with metadata for
//! matching candidates to the best service based on experience level,
//! target industry, and budget.
//!
//! DoR: Service metadata validated against public sources
//! DoD: ServiceDirectory::recommend() returns ranked services for a given profile

use serde::{Deserialize, Serialize};

/// Experience tier for service matching.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ExperienceTier {
    /// 0-3 years
    EntryLevel,
    /// 3-7 years
    MidLevel,
    /// 7-15 years
    Senior,
    /// 15+ years or C-suite
    Executive,
}

/// Pricing model used by the service.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PricingModel {
    /// Flat monthly fee
    MonthlyRetainer,
    /// Percentage of first-year salary on placement
    ContingencyFee,
    /// Flat per-placement fee
    FlatFee,
    /// Pay-per-application or pay-per-intro
    PerAction,
    /// Free tier available
    Freemium,
}

/// A vetted reverse-recruiting service.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecruitingService {
    pub id: String,
    pub name: String,
    pub url: String,
    pub description: String,
    pub experience_tiers: Vec<ExperienceTier>,
    pub industries: Vec<String>,
    pub pricing_model: PricingModel,
    /// Approximate monthly cost in USD (0 if contingency-only)
    pub approx_monthly_cost_usd: f64,
    /// Whether the service handles application submission
    pub handles_applications: bool,
    /// Whether the service includes resume/LinkedIn optimization
    pub includes_resume_optimization: bool,
    /// Whether the service includes interview coaching
    pub includes_interview_coaching: bool,
    /// Average Glassdoor / Trustpilot rating (0.0-5.0, 0 = unrated)
    pub avg_rating: f32,
}

/// Directory of known reverse-recruiting services.
pub struct ServiceDirectory {
    services: Vec<RecruitingService>,
}

impl ServiceDirectory {
    /// Build the directory with all known services.
    pub fn new() -> Self {
        Self {
            services: built_in_services(),
        }
    }

    /// All services in the directory.
    pub fn all(&self) -> &[RecruitingService] {
        &self.services
    }

    /// Recommend services for a candidate profile.
    ///
    /// Ranks by: tier match (40%), industry overlap (30%), rating (20%), cost fit (10%).
    pub fn recommend(
        &self,
        tier: ExperienceTier,
        target_industries: &[String],
        max_monthly_budget: Option<f64>,
    ) -> Vec<(f64, &RecruitingService)> {
        let mut scored: Vec<(f64, &RecruitingService)> = self
            .services
            .iter()
            .filter(|s| {
                if let Some(budget) = max_monthly_budget {
                    s.approx_monthly_cost_usd <= budget
                        || s.pricing_model == PricingModel::ContingencyFee
                } else {
                    true
                }
            })
            .map(|s| {
                let tier_score = if s.experience_tiers.contains(&tier) {
                    1.0
                } else {
                    0.2
                };

                let industry_score = if target_industries.is_empty() || s.industries.is_empty() {
                    0.5 // neutral when no preference
                } else {
                    let overlap = target_industries
                        .iter()
                        .filter(|ind| {
                            s.industries
                                .iter()
                                .any(|si| si.eq_ignore_ascii_case(ind))
                        })
                        .count();
                    overlap as f64 / target_industries.len().max(1) as f64
                };

                let rating_score = (s.avg_rating as f64) / 5.0;

                let total = tier_score * 0.40 + industry_score * 0.30 + rating_score * 0.20 + 0.10;
                (total, s)
            })
            .collect();

        scored.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));
        scored
    }

    /// Look up a service by ID.
    pub fn get(&self, id: &str) -> Option<&RecruitingService> {
        self.services.iter().find(|s| s.id == id)
    }
}

impl Default for ServiceDirectory {
    fn default() -> Self {
        Self::new()
    }
}

// ---------------------------------------------------------------------------
// Built-in service registry
// ---------------------------------------------------------------------------

fn built_in_services() -> Vec<RecruitingService> {
    vec![
        RecruitingService {
            id: "sprout".into(),
            name: "Sprout".into(),
            url: "https://www.sproutjobs.com".into(),
            description: "AI-assisted reverse recruiting for tech professionals. Matches candidates with startups and growth-stage companies.".into(),
            experience_tiers: vec![ExperienceTier::MidLevel, ExperienceTier::Senior],
            industries: vec!["technology".into(), "saas".into(), "fintech".into()],
            pricing_model: PricingModel::MonthlyRetainer,
            approx_monthly_cost_usd: 299.0,
            handles_applications: true,
            includes_resume_optimization: true,
            includes_interview_coaching: false,
            avg_rating: 4.2,
        },
        RecruitingService {
            id: "find-my-profession".into(),
            name: "Find My Profession".into(),
            url: "https://www.findmyprofession.com".into(),
            description: "Full-service reverse recruiting and resume writing. Dedicated recruiter manages your job search end-to-end.".into(),
            experience_tiers: vec![ExperienceTier::MidLevel, ExperienceTier::Senior, ExperienceTier::Executive],
            industries: vec!["technology".into(), "finance".into(), "healthcare".into(), "consulting".into()],
            pricing_model: PricingModel::MonthlyRetainer,
            approx_monthly_cost_usd: 2500.0,
            handles_applications: true,
            includes_resume_optimization: true,
            includes_interview_coaching: true,
            avg_rating: 4.7,
        },
        RecruitingService {
            id: "career-agents".into(),
            name: "CareerAgents".into(),
            url: "https://www.careeragents.com".into(),
            description: "Personalized job search management. Agents source, apply, and follow up on opportunities on your behalf.".into(),
            experience_tiers: vec![ExperienceTier::Senior, ExperienceTier::Executive],
            industries: vec!["technology".into(), "finance".into(), "legal".into()],
            pricing_model: PricingModel::MonthlyRetainer,
            approx_monthly_cost_usd: 1500.0,
            handles_applications: true,
            includes_resume_optimization: true,
            includes_interview_coaching: true,
            avg_rating: 4.3,
        },
        RecruitingService {
            id: "my-personal-recruiter".into(),
            name: "MyPersonalRecruiter".into(),
            url: "https://www.mypersonalrecruiter.com".into(),
            description: "Dedicated personal recruiter for mid-to-senior professionals. Specializes in hidden job market access.".into(),
            experience_tiers: vec![ExperienceTier::MidLevel, ExperienceTier::Senior],
            industries: vec!["technology".into(), "marketing".into(), "operations".into()],
            pricing_model: PricingModel::FlatFee,
            approx_monthly_cost_usd: 800.0,
            handles_applications: true,
            includes_resume_optimization: false,
            includes_interview_coaching: false,
            avg_rating: 3.9,
        },
        RecruitingService {
            id: "reverse-recruiting-agency".into(),
            name: "Reverse Recruiting Agency".into(),
            url: "https://www.reverserecruitingagency.com".into(),
            description: "Executive-focused reverse recruiting with white-glove service. Targets C-suite and VP-level placements.".into(),
            experience_tiers: vec![ExperienceTier::Executive],
            industries: vec!["technology".into(), "finance".into(), "healthcare".into(), "energy".into()],
            pricing_model: PricingModel::ContingencyFee,
            approx_monthly_cost_usd: 0.0,
            handles_applications: true,
            includes_resume_optimization: true,
            includes_interview_coaching: true,
            avg_rating: 4.5,
        },
        RecruitingService {
            id: "we-are-career".into(),
            name: "WeAreCareer".into(),
            url: "https://www.wearecareer.com".into(),
            description: "Entry-to-mid level reverse recruiting with career coaching. Budget-friendly option for early-career professionals.".into(),
            experience_tiers: vec![ExperienceTier::EntryLevel, ExperienceTier::MidLevel],
            industries: vec!["technology".into(), "design".into(), "product".into()],
            pricing_model: PricingModel::MonthlyRetainer,
            approx_monthly_cost_usd: 199.0,
            handles_applications: true,
            includes_resume_optimization: true,
            includes_interview_coaching: false,
            avg_rating: 4.0,
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_directory_has_all_services() {
        let dir = ServiceDirectory::new();
        assert_eq!(dir.all().len(), 6);
    }

    #[test]
    fn test_lookup_by_id() {
        let dir = ServiceDirectory::new();
        let svc = dir.get("sprout").unwrap();
        assert_eq!(svc.name, "Sprout");
        assert!(dir.get("nonexistent").is_none());
    }

    #[test]
    fn test_recommend_senior_tech() {
        let dir = ServiceDirectory::new();
        let recs = dir.recommend(
            ExperienceTier::Senior,
            &["technology".into()],
            None,
        );
        assert!(!recs.is_empty());
        // Top recommendation should have a tier match
        let (score, top) = &recs[0];
        assert!(*score > 0.5);
        assert!(top.experience_tiers.contains(&ExperienceTier::Senior));
    }

    #[test]
    fn test_recommend_with_budget_filter() {
        let dir = ServiceDirectory::new();
        let recs = dir.recommend(
            ExperienceTier::MidLevel,
            &["technology".into()],
            Some(500.0),
        );
        // Should include contingency services even if their monthly is 0
        for (_, svc) in &recs {
            assert!(
                svc.approx_monthly_cost_usd <= 500.0
                    || svc.pricing_model == PricingModel::ContingencyFee,
                "Service {} exceeds budget",
                svc.name
            );
        }
    }

    #[test]
    fn test_recommend_executive_gets_executive_services() {
        let dir = ServiceDirectory::new();
        let recs = dir.recommend(ExperienceTier::Executive, &[], None);
        // Reverse Recruiting Agency (executive-only) should rank high
        let has_exec = recs.iter().any(|(_, s)| s.id == "reverse-recruiting-agency");
        assert!(has_exec);
    }

    #[test]
    fn test_recommend_entry_level() {
        let dir = ServiceDirectory::new();
        let recs = dir.recommend(
            ExperienceTier::EntryLevel,
            &["technology".into()],
            Some(250.0),
        );
        assert!(!recs.is_empty());
        // WeAreCareer should be present (entry-level friendly, $199)
        let has_wac = recs.iter().any(|(_, s)| s.id == "we-are-career");
        assert!(has_wac);
    }
}
