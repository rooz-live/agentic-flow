//! simplify.jobs HTTP client — gated behind the `http-client` feature.
//!
//! Fetches live job listings from the simplify.jobs public API and converts
//! them into [`RoleProfile`] structs ready for the [`JobMatcher`].
//!
//! # Feature flag
//! This entire module is compiled only when `--features http-client` is set.
//! It is **not** included in the default build or the WASM target.
//!
//! # Usage
//! ```rust,no_run
//! # #[cfg(feature = "http-client")]
//! # async fn example() -> anyhow::Result<()> {
//! use reverse_recruiting::client::SimplifyJobsClient;
//! let client = SimplifyJobsClient::new("https://api.simplify.jobs/v1");
//! let roles = client.fetch_roles("Rust engineer", 20).await?;
//! # Ok(())
//! # }
//! ```

#![cfg(feature = "http-client")]

use anyhow::{Context, Result};
use reqwest::Client;
use serde::Deserialize;

use crate::domain::{RoleProfile, SeniorityLevel, SkillSet};

// ── Wire-format DTOs (simplify.jobs API shape) ────────────────────────────────

/// Top-level response envelope from `GET /jobs`.
#[derive(Debug, Deserialize)]
struct JobsResponse {
    jobs: Vec<JobDto>,
}

/// Single job listing as returned by the simplify.jobs API.
#[derive(Debug, Deserialize)]
struct JobDto {
    #[serde(default)]
    company_name: String,
    title: String,
    #[serde(default = "default_location")]
    location: String,
    #[serde(default)]
    skills: Vec<String>,
    #[serde(default)]
    salary_min: Option<u64>,
    #[serde(default)]
    salary_max: Option<u64>,
    #[serde(default)]
    seniority: Option<String>,
    #[serde(default)]
    url: Option<String>,
}

fn default_location() -> String {
    "remote".to_string()
}

// ── Domain mapping ────────────────────────────────────────────────────────────

impl From<JobDto> for RoleProfile {
    fn from(dto: JobDto) -> Self {
        let seniority = parse_seniority(dto.seniority.as_deref());
        let comp = match (dto.salary_min, dto.salary_max) {
            (Some(lo), Some(hi)) => Some((lo, hi)),
            (Some(lo), None)     => Some((lo, lo)),
            (None, Some(hi))     => Some((0, hi)),
            _                    => None,
        };

        let mut role = RoleProfile::new(dto.company_name, dto.title, dto.location, seniority);
        role.skills = SkillSet {
            required: dto.skills,
            nice_to_have: vec![],
            years_of_experience: Default::default(),
        };
        role.compensation_range = comp;
        role.source_url = dto.url;
        role
    }
}

fn parse_seniority(raw: Option<&str>) -> SeniorityLevel {
    match raw.map(|s| s.to_lowercase()).as_deref() {
        Some(s) if s.contains("entry") || s.contains("junior") => SeniorityLevel::Entry,
        Some(s) if s.contains("mid")                           => SeniorityLevel::Mid,
        Some(s) if s.contains("staff")                         => SeniorityLevel::Staff,
        Some(s) if s.contains("principal")                     => SeniorityLevel::Principal,
        Some(s) if s.contains("director")                      => SeniorityLevel::Director,
        _                                                       => SeniorityLevel::Senior,
    }
}

// ── Client ────────────────────────────────────────────────────────────────────

/// Async HTTP client for the simplify.jobs job-board API.
pub struct SimplifyJobsClient {
    base_url: String,
    http: Client,
}

impl SimplifyJobsClient {
    /// Create a new client.
    ///
    /// `base_url` — e.g. `"https://api.simplify.jobs/v1"` (no trailing slash).
    pub fn new(base_url: impl Into<String>) -> Self {
        Self {
            base_url: base_url.into(),
            http: Client::new(),
        }
    }

    /// Fetch up to `limit` job listings matching `query` and convert them to
    /// [`RoleProfile`] domain objects.
    pub async fn fetch_roles(&self, query: &str, limit: usize) -> Result<Vec<RoleProfile>> {
        let url = format!("{}/jobs", self.base_url);
        let resp: JobsResponse = self
            .http
            .get(&url)
            .query(&[("q", query), ("limit", &limit.to_string())])
            .send()
            .await
            .context("simplify.jobs HTTP request failed")?
            .error_for_status()
            .context("simplify.jobs returned non-2xx status")?
            .json()
            .await
            .context("simplify.jobs response JSON parse failed")?;

        Ok(resp.jobs.into_iter().map(RoleProfile::from).collect())
    }
}

// ── Unit tests ────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn make_dto(title: &str, skills: Vec<&str>, seniority: Option<&str>) -> JobDto {
        JobDto {
            company_name: "TestCo".into(),
            title: title.into(),
            location: "remote".into(),
            skills: skills.into_iter().map(String::from).collect(),
            salary_min: Some(120_000),
            salary_max: Some(200_000),
            seniority: seniority.map(String::from),
            url: Some("https://simplify.jobs/j/test".into()),
        }
    }

    #[test]
    fn dto_maps_to_role_profile_correctly() {
        let dto = make_dto("Staff Engineer", vec!["Rust", "WASM"], Some("staff"));
        let role = RoleProfile::from(dto);

        assert_eq!(role.company, "TestCo");
        assert_eq!(role.title, "Staff Engineer");
        assert_eq!(role.location, "remote");
        assert_eq!(role.skills.required, vec!["Rust", "WASM"]);
        assert_eq!(role.compensation_range, Some((120_000, 200_000)));
        assert_eq!(role.seniority_level, SeniorityLevel::Staff);
        assert_eq!(
            role.source_url.as_deref(),
            Some("https://simplify.jobs/j/test")
        );
    }

    #[test]
    fn parse_seniority_covers_all_levels() {
        assert_eq!(parse_seniority(Some("entry-level")),  SeniorityLevel::Entry);
        assert_eq!(parse_seniority(Some("junior")),       SeniorityLevel::Entry);
        assert_eq!(parse_seniority(Some("mid")),          SeniorityLevel::Mid);
        assert_eq!(parse_seniority(Some("staff")),        SeniorityLevel::Staff);
        assert_eq!(parse_seniority(Some("principal")),    SeniorityLevel::Principal);
        assert_eq!(parse_seniority(Some("director")),     SeniorityLevel::Director);
        // Unknown / missing → Senior (safe default)
        assert_eq!(parse_seniority(None),                 SeniorityLevel::Senior);
        assert_eq!(parse_seniority(Some("unknown")),      SeniorityLevel::Senior);
    }

    #[test]
    fn partial_salary_range_handled() {
        let mut dto = make_dto("Eng", vec![], None);
        dto.salary_min = Some(100_000);
        dto.salary_max = None;
        let role = RoleProfile::from(dto);
        assert_eq!(role.compensation_range, Some((100_000, 100_000)));

        let mut dto2 = make_dto("Eng2", vec![], None);
        dto2.salary_min = None;
        dto2.salary_max = Some(150_000);
        let role2 = RoleProfile::from(dto2);
        assert_eq!(role2.compensation_range, Some((0, 150_000)));

        let mut dto3 = make_dto("Eng3", vec![], None);
        dto3.salary_min = None;
        dto3.salary_max = None;
        let role3 = RoleProfile::from(dto3);
        assert!(role3.compensation_range.is_none());
    }
}
