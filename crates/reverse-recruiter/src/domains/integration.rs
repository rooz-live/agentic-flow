//! Integration Domain
//!
//! Data source abstraction layer:
//!  - Manual JSON input (always available)
//!  - Adzuna API (free tier, 12+ countries, salary data)
//!  - USAJobs API (US government jobs, no auth required)
//!  - Greenhouse Boards API (per-company, no auth required)
//!
//! Enable the `live-apis` feature (on by default) for HTTP clients.

use serde::{Deserialize, Serialize};

use super::job_matching::{CompanySize, JobSpec, WorkArrangement};
use super::profile::ProfileAggregate;

/// A batch of job listings from any source.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobBatch {
    pub source: String,
    pub fetched_at: String,
    pub jobs: Vec<JobSpec>,
}

/// A batch of profile data from any source.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfileInput {
    pub source: String,
    pub profile: ProfileAggregate,
    pub raw_resume_text: Option<String>,
}

/// Company research data (future integration).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompanyResearch {
    pub company_name: String,
    pub glassdoor_rating: Option<f32>,
    pub funding_stage: Option<String>,
    pub headcount: Option<u32>,
    pub growth_signal: Option<String>,
}

/// Parse a JobBatch from JSON string (manual input pathway).
pub fn parse_job_batch(json: &str) -> Result<JobBatch, serde_json::Error> {
    serde_json::from_str(json)
}

/// Parse a ProfileInput from JSON string (manual input pathway).
pub fn parse_profile_input(json: &str) -> Result<ProfileInput, serde_json::Error> {
    serde_json::from_str(json)
}

/// Build a ProfileAggregate from raw resume text + minimal metadata.
pub fn profile_from_resume(
    id: &str,
    name: &str,
    resume_text: &str,
) -> ProfileAggregate {
    let skills = ProfileAggregate::extract_skills_from_text(resume_text);
    ProfileAggregate {
        id: id.into(),
        name: name.into(),
        skills,
        experience: Vec::new(),
        preferences: super::profile::Preferences::default(),
        total_years_experience: 0.0,
        education_level: "unknown".into(),
    }
}

// ---------------------------------------------------------------------------
// Live job board API clients (feature = "live-apis")
// ---------------------------------------------------------------------------

#[cfg(feature = "live-apis")]
mod live {
    use super::*;
    use reqwest::Client;

    // ---- Adzuna ---------------------------------------------------------

    /// Client for the Adzuna job search API.
    /// Requires `ADZUNA_APP_ID` and `ADZUNA_APP_KEY` env vars.
    pub struct AdzunaClient {
        client: Client,
        app_id: String,
        app_key: String,
        country: String,
    }

    #[derive(Deserialize)]
    struct AdzunaResponse {
        results: Vec<AdzunaJob>,
    }

    #[derive(Deserialize)]
    struct AdzunaJob {
        id: Option<serde_json::Value>,
        title: Option<String>,
        company: Option<AdzunaCompany>,
        location: Option<AdzunaLocation>,
        salary_min: Option<f64>,
        salary_max: Option<f64>,
        redirect_url: Option<String>,
        category: Option<AdzunaCategory>,
        description: Option<String>,
        #[serde(default)]
        contract_type: Option<String>,
    }

    #[derive(Deserialize)]
    struct AdzunaCompany {
        display_name: Option<String>,
    }

    #[derive(Deserialize)]
    struct AdzunaLocation {
        display_name: Option<String>,
    }

    #[derive(Deserialize)]
    struct AdzunaCategory {
        tag: Option<String>,
    }

    impl AdzunaClient {
        /// Create from environment variables. Returns `None` if keys missing.
        pub fn from_env() -> Option<Self> {
            let app_id = std::env::var("ADZUNA_APP_ID").ok()?;
            let app_key = std::env::var("ADZUNA_APP_KEY").ok()?;
            let country = std::env::var("ADZUNA_COUNTRY").unwrap_or_else(|_| "us".into());
            Some(Self {
                client: Client::new(),
                app_id,
                app_key,
                country,
            })
        }

        /// Search for jobs matching `query`. Returns up to `count` results.
        pub async fn search(&self, query: &str, count: usize) -> anyhow::Result<Vec<JobSpec>> {
            let url = format!(
                "https://api.adzuna.com/v1/api/jobs/{}/search/1",
                self.country
            );
            let resp: AdzunaResponse = self
                .client
                .get(&url)
                .query(&[
                    ("app_id", self.app_id.as_str()),
                    ("app_key", self.app_key.as_str()),
                    ("what", query),
                    ("results_per_page", &count.to_string()),
                    ("content-type", "application/json"),
                ])
                .send()
                .await?
                .error_for_status()?
                .json()
                .await?;

            let jobs = resp
                .results
                .into_iter()
                .enumerate()
                .map(|(i, aj)| {
                    let title = aj.title.unwrap_or_default();
                    let description = aj.description.unwrap_or_default();
                    let required_skills = ProfileAggregate::extract_skills_from_text(&description)
                        .into_iter()
                        .map(|s| s.name)
                        .collect();

                    JobSpec {
                        id: format!("adzuna-{}", aj.id.map(|v| v.to_string()).unwrap_or_else(|| i.to_string())),
                        title,
                        company: aj.company.and_then(|c| c.display_name).unwrap_or_else(|| "Unknown".into()),
                        industry: aj.category.and_then(|c| c.tag).unwrap_or_else(|| "general".into()),
                        required_skills,
                        preferred_skills: vec![],
                        min_years_experience: 0.0,
                        salary_min: aj.salary_min.unwrap_or(0.0),
                        salary_max: aj.salary_max.unwrap_or(0.0),
                        location: aj.location.and_then(|l| l.display_name).unwrap_or_else(|| "Unknown".into()),
                        work_arrangement: if aj.contract_type.as_deref() == Some("contract") {
                            WorkArrangement::Remote
                        } else {
                            WorkArrangement::Hybrid
                        },
                        company_size: CompanySize::Mid,
                        visa_sponsorship: false,
                        days_until_close: None,
                        application_effort_hours: 1.0,
                        apply_url: aj.redirect_url,
                        source: Some("adzuna".into()),
                    }
                })
                .collect();
            Ok(jobs)
        }
    }

    // ---- USAJobs --------------------------------------------------------

    /// Client for the USAJobs search API (US government positions).
    /// Optionally uses `USAJOBS_API_KEY` and `USAJOBS_EMAIL` env vars for
    /// higher rate limits. Works without auth on the historic endpoint.
    pub struct UsajobsClient {
        client: Client,
        api_key: Option<String>,
        email: Option<String>,
    }

    #[derive(Deserialize)]
    struct UsajobsResponse {
        #[serde(rename = "SearchResult")]
        search_result: UsajobsSearchResult,
    }

    #[derive(Deserialize)]
    struct UsajobsSearchResult {
        #[serde(rename = "SearchResultItems")]
        items: Vec<UsajobsItem>,
    }

    #[derive(Deserialize)]
    struct UsajobsItem {
        #[serde(rename = "MatchedObjectDescriptor")]
        descriptor: UsajobsDescriptor,
    }

    #[derive(Deserialize)]
    struct UsajobsDescriptor {
        #[serde(rename = "PositionTitle")]
        title: Option<String>,
        #[serde(rename = "OrganizationName")]
        org: Option<String>,
        #[serde(rename = "PositionLocation")]
        locations: Option<Vec<UsajobsLocation>>,
        #[serde(rename = "PositionRemuneration")]
        remuneration: Option<Vec<UsajobsRemuneration>>,
        #[serde(rename = "QualificationSummary")]
        qualifications: Option<String>,
        #[serde(rename = "PositionURI")]
        uri: Option<String>,
        #[serde(rename = "PositionID")]
        position_id: Option<String>,
        #[serde(rename = "ApplyURI")]
        apply_uri: Option<Vec<String>>,
    }

    #[derive(Deserialize)]
    struct UsajobsLocation {
        #[serde(rename = "LocationName")]
        name: Option<String>,
    }

    #[derive(Deserialize)]
    struct UsajobsRemuneration {
        #[serde(rename = "MinimumRange")]
        min: Option<String>,
        #[serde(rename = "MaximumRange")]
        max: Option<String>,
    }

    impl UsajobsClient {
        /// Create from environment variables. Always succeeds (auth is optional).
        pub fn from_env() -> Self {
            Self {
                client: Client::new(),
                api_key: std::env::var("USAJOBS_API_KEY").ok(),
                email: std::env::var("USAJOBS_EMAIL").ok(),
            }
        }

        /// Search for federal jobs matching `keyword`.
        pub async fn search(&self, keyword: &str, count: usize) -> anyhow::Result<Vec<JobSpec>> {
            let url = "https://data.usajobs.gov/api/Search";
            let mut req = self
                .client
                .get(url)
                .query(&[
                    ("Keyword", keyword),
                    ("ResultsPerPage", &count.to_string()),
                ]);

            if let (Some(key), Some(email)) = (&self.api_key, &self.email) {
                req = req
                    .header("Authorization-Key", key.as_str())
                    .header("User-Agent", email.as_str());
            }

            let resp: UsajobsResponse = req.send().await?.error_for_status()?.json().await?;

            let jobs = resp
                .search_result
                .items
                .into_iter()
                .enumerate()
                .map(|(i, item)| {
                    let d = item.descriptor;
                    let title = d.title.unwrap_or_default();
                    let qualifications = d.qualifications.unwrap_or_default();
                    let required_skills = ProfileAggregate::extract_skills_from_text(&qualifications)
                        .into_iter()
                        .map(|s| s.name)
                        .collect();

                    let location = d
                        .locations
                        .and_then(|locs| locs.into_iter().next())
                        .and_then(|l| l.name)
                        .unwrap_or_else(|| "Washington, DC".into());

                    let (salary_min, salary_max) = d
                        .remuneration
                        .and_then(|r| r.into_iter().next())
                        .map(|r| {
                            let min = r.min.and_then(|s| s.parse::<f64>().ok()).unwrap_or(0.0);
                            let max = r.max.and_then(|s| s.parse::<f64>().ok()).unwrap_or(0.0);
                            (min, max)
                        })
                        .unwrap_or((0.0, 0.0));

                    let apply_url = d
                        .apply_uri
                        .and_then(|uris| uris.into_iter().next())
                        .or(d.uri);

                    JobSpec {
                        id: d.position_id.unwrap_or_else(|| format!("usajobs-{}", i)),
                        title,
                        company: d.org.unwrap_or_else(|| "US Government".into()),
                        industry: "government".into(),
                        required_skills,
                        preferred_skills: vec![],
                        min_years_experience: 0.0,
                        salary_min,
                        salary_max,
                        location,
                        work_arrangement: WorkArrangement::Hybrid,
                        company_size: CompanySize::Enterprise,
                        visa_sponsorship: false,
                        days_until_close: None,
                        application_effort_hours: 2.0,
                        apply_url,
                        source: Some("usajobs".into()),
                    }
                })
                .collect();
            Ok(jobs)
        }
    }

    // ---- Greenhouse Boards API ------------------------------------------

    /// Client for the Greenhouse public boards API (per-company, no auth).
    pub struct GreenhouseClient {
        client: Client,
    }

    #[derive(Deserialize)]
    struct GreenhouseResponse {
        jobs: Vec<GreenhouseJob>,
    }

    #[derive(Deserialize)]
    struct GreenhouseJob {
        id: Option<u64>,
        title: Option<String>,
        location: Option<GreenhouseLocation>,
        absolute_url: Option<String>,
        departments: Option<Vec<GreenhouseDept>>,
    }

    #[derive(Deserialize)]
    struct GreenhouseLocation {
        name: Option<String>,
    }

    #[derive(Deserialize)]
    struct GreenhouseDept {
        name: Option<String>,
    }

    impl GreenhouseClient {
        pub fn new() -> Self {
            Self {
                client: Client::new(),
            }
        }

        /// Fetch all open jobs from a company's Greenhouse board.
        /// `board_token` is the URL slug (e.g. "figma" → boards-api.greenhouse.io/v1/boards/figma/jobs).
        pub async fn fetch_board(
            &self,
            board_token: &str,
            company_name: &str,
        ) -> anyhow::Result<Vec<JobSpec>> {
            let url = format!(
                "https://boards-api.greenhouse.io/v1/boards/{}/jobs",
                board_token
            );
            let resp: GreenhouseResponse =
                self.client.get(&url).send().await?.error_for_status()?.json().await?;

            let jobs = resp
                .jobs
                .into_iter()
                .map(|gj| {
                    let title = gj.title.unwrap_or_default();
                    let dept = gj
                        .departments
                        .and_then(|ds| ds.into_iter().next())
                        .and_then(|d| d.name)
                        .unwrap_or_else(|| "general".into());

                    JobSpec {
                        id: format!("gh-{}", gj.id.unwrap_or(0)),
                        title,
                        company: company_name.into(),
                        industry: dept,
                        required_skills: vec![],
                        preferred_skills: vec![],
                        min_years_experience: 0.0,
                        salary_min: 0.0,
                        salary_max: 0.0,
                        location: gj.location.and_then(|l| l.name).unwrap_or_else(|| "Unknown".into()),
                        work_arrangement: WorkArrangement::Hybrid,
                        company_size: CompanySize::Mid,
                        visa_sponsorship: false,
                        days_until_close: None,
                        application_effort_hours: 1.0,
                        apply_url: gj.absolute_url,
                        source: Some("greenhouse".into()),
                    }
                })
                .collect();
            Ok(jobs)
        }
    }

    /// Aggregate jobs from all available live sources in parallel.
    /// Falls back gracefully — returns whatever succeeds.
    pub async fn fetch_live_jobs(
        query: &str,
        greenhouse_boards: &[(&str, &str)],
        count_per_source: usize,
    ) -> Vec<JobSpec> {
        let mut all_jobs = Vec::new();

        // Adzuna
        if let Some(adzuna) = AdzunaClient::from_env() {
            match adzuna.search(query, count_per_source).await {
                Ok(jobs) => {
                    tracing::info!("Adzuna returned {} jobs", jobs.len());
                    all_jobs.extend(jobs);
                }
                Err(e) => tracing::warn!("Adzuna search failed: {}", e),
            }
        } else {
            tracing::info!("Adzuna API keys not set (ADZUNA_APP_ID, ADZUNA_APP_KEY) — skipping");
        }

        // USAJobs (always available, no mandatory auth)
        let usajobs = UsajobsClient::from_env();
        match usajobs.search(query, count_per_source).await {
            Ok(jobs) => {
                tracing::info!("USAJobs returned {} jobs", jobs.len());
                all_jobs.extend(jobs);
            }
            Err(e) => tracing::warn!("USAJobs search failed: {}", e),
        }

        // Greenhouse boards
        let gh = GreenhouseClient::new();
        for (token, company) in greenhouse_boards {
            match gh.fetch_board(token, company).await {
                Ok(jobs) => {
                    tracing::info!("Greenhouse ({}) returned {} jobs", company, jobs.len());
                    all_jobs.extend(jobs);
                }
                Err(e) => tracing::warn!("Greenhouse ({}) failed: {}", company, e),
            }
        }

        all_jobs
    }
}

#[cfg(feature = "live-apis")]
pub use live::{AdzunaClient, GreenhouseClient, UsajobsClient, fetch_live_jobs};

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_profile_from_resume() {
        let profile = profile_from_resume(
            "P1",
            "Test User",
            "Experienced Rust and Python developer with AWS and Docker skills",
        );
        assert_eq!(profile.id, "P1");
        assert!(!profile.skills.is_empty());
        assert!(profile.skills.iter().any(|s| s.name == "rust"));
    }

    #[test]
    fn test_parse_job_batch() {
        let json = r#"{
            "source": "manual",
            "fetched_at": "2026-02-28T00:00:00Z",
            "jobs": [{
                "id": "J1",
                "title": "Engineer",
                "company": "Co",
                "industry": "tech",
                "required_skills": ["rust"],
                "preferred_skills": [],
                "min_years_experience": 2.0,
                "salary_min": 100000.0,
                "salary_max": 150000.0,
                "location": "Remote",
                "work_arrangement": "Remote",
                "company_size": "Startup",
                "visa_sponsorship": false,
                "days_until_close": 30,
                "application_effort_hours": 1.0
            }]
        }"#;

        let batch = parse_job_batch(json).unwrap();
        assert_eq!(batch.jobs.len(), 1);
        assert_eq!(batch.jobs[0].id, "J1");
    }
}
