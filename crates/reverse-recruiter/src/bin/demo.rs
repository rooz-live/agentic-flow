//! Reverse Recruiter CLI Demo
//!
//! Fetches **live** job listings from Adzuna, USAJobs, and Greenhouse APIs,
//! then matches them against a candidate profile using WSJF-weighted scoring.
//!
//! Environment variables (all optional — falls back to sample data):
//!   ADZUNA_APP_ID  / ADZUNA_APP_KEY  — free tier at developer.adzuna.com
//!   USAJOBS_API_KEY / USAJOBS_EMAIL  — optional for higher rate limits
//!   GREENHOUSE_BOARDS                — comma-separated "token:Company Name" pairs
//!   SEARCH_QUERY                     — keyword for Adzuna/USAJobs (default: "rust developer")

use reverse_recruiter::domains::application::ApplicationPlan;
use reverse_recruiter::domains::integration;
use reverse_recruiter::domains::job_matching::{
    CompanySize, JobSpec, WorkArrangement,
};
use reverse_recruiter::domains::profile::Preferences;
use reverse_recruiter::scoring::wsjf_fit::WsjfFitScorer;

/// Sample jobs used when no live API keys are configured.
fn sample_jobs() -> Vec<JobSpec> {
    vec![
        JobSpec {
            id: "J-001".into(),
            title: "Senior Platform Engineer".into(),
            company: "CloudScale Inc".into(),
            industry: "tech".into(),
            required_skills: vec![
                "rust".into(), "kubernetes".into(), "aws".into(), "docker".into(),
            ],
            preferred_skills: vec!["python".into(), "terraform".into()],
            min_years_experience: 5.0,
            salary_min: 160000.0,
            salary_max: 200000.0,
            location: "Remote".into(),
            work_arrangement: WorkArrangement::Remote,
            company_size: CompanySize::Mid,
            visa_sponsorship: false,
            days_until_close: Some(10),
            application_effort_hours: 1.5,
            apply_url: None,
            source: Some("sample".into()),
        },
        JobSpec {
            id: "J-002".into(),
            title: "Staff ML Engineer".into(),
            company: "DataDriven AI".into(),
            industry: "tech".into(),
            required_skills: vec![
                "python".into(), "machine learning".into(), "kubernetes".into(), "sql".into(),
            ],
            preferred_skills: vec!["rust".into(), "distributed systems".into()],
            min_years_experience: 7.0,
            salary_min: 180000.0,
            salary_max: 230000.0,
            location: "San Francisco, CA".into(),
            work_arrangement: WorkArrangement::Hybrid,
            company_size: CompanySize::Large,
            visa_sponsorship: true,
            days_until_close: Some(5),
            application_effort_hours: 2.0,
            apply_url: None,
            source: Some("sample".into()),
        },
        JobSpec {
            id: "J-003".into(),
            title: "Backend Developer".into(),
            company: "FinanceHub".into(),
            industry: "fintech".into(),
            required_skills: vec!["python".into(), "sql".into(), "docker".into()],
            preferred_skills: vec!["aws".into()],
            min_years_experience: 3.0,
            salary_min: 120000.0,
            salary_max: 155000.0,
            location: "Remote".into(),
            work_arrangement: WorkArrangement::Remote,
            company_size: CompanySize::Startup,
            visa_sponsorship: false,
            days_until_close: Some(21),
            application_effort_hours: 0.5,
            apply_url: None,
            source: Some("sample".into()),
        },
        JobSpec {
            id: "J-004".into(),
            title: "Systems Engineer".into(),
            company: "DefenseCorp".into(),
            industry: "defense".into(),
            required_skills: vec!["rust".into(), "c++".into(), "distributed systems".into()],
            preferred_skills: vec![],
            min_years_experience: 4.0,
            salary_min: 130000.0,
            salary_max: 160000.0,
            location: "Arlington, VA".into(),
            work_arrangement: WorkArrangement::Onsite,
            company_size: CompanySize::Enterprise,
            visa_sponsorship: false,
            days_until_close: None,
            application_effort_hours: 3.0,
            apply_url: None,
            source: Some("sample".into()),
        },
        JobSpec {
            id: "J-005".into(),
            title: "DevOps Engineer".into(),
            company: "GreenEnergy".into(),
            industry: "energy".into(),
            required_skills: vec![
                "docker".into(), "kubernetes".into(), "aws".into(), "terraform".into(),
            ],
            preferred_skills: vec!["python".into(), "go".into()],
            min_years_experience: 3.0,
            salary_min: 125000.0,
            salary_max: 160000.0,
            location: "Remote".into(),
            work_arrangement: WorkArrangement::Remote,
            company_size: CompanySize::Mid,
            visa_sponsorship: false,
            days_until_close: Some(14),
            application_effort_hours: 1.0,
            apply_url: None,
            source: Some("sample".into()),
        },
    ]
}

/// Parse GREENHOUSE_BOARDS env var: "token1:Company One,token2:Company Two"
fn parse_greenhouse_boards() -> Vec<(String, String)> {
    std::env::var("GREENHOUSE_BOARDS")
        .unwrap_or_default()
        .split(',')
        .filter_map(|entry| {
            let mut parts = entry.splitn(2, ':');
            let token = parts.next()?.trim().to_string();
            let name = parts.next()?.trim().to_string();
            if token.is_empty() || name.is_empty() {
                None
            } else {
                Some((token, name))
            }
        })
        .collect()
}

fn display_results(jobs: &[JobSpec], profile: &reverse_recruiter::domains::profile::ProfileAggregate) {
    let scorer = WsjfFitScorer::default();
    let mut fit_scores: Vec<_> = jobs.iter().map(|j| scorer.score_fit(profile, j)).collect();
    fit_scores.sort_by(|a, b| b.overall_fit.partial_cmp(&a.overall_fit).unwrap());

    println!("=== WSJF-Ranked Job Matches ({} jobs) ===\n", jobs.len());
    for (i, fit) in fit_scores.iter().enumerate() {
        let job = jobs.iter().find(|j| j.id == fit.job_id).unwrap();
        let source_tag = job.source.as_deref().unwrap_or("unknown");
        println!(
            "#{} {} @ {} ({}) [{}]",
            i + 1,
            job.title,
            job.company,
            job.industry,
            source_tag,
        );
        println!(
            "   Overall: {:.2}  Skill: {:.2}  Exp: {:.2}  Pref: {:.2}  WSJF: {:.1}",
            fit.overall_fit,
            fit.skill_match,
            fit.experience_match,
            fit.preference_match,
            fit.wsjf_score
        );
        if let Some(url) = &job.apply_url {
            println!("   Apply: {}", url);
        }
        if !fit.keyword_gaps.is_empty() {
            println!("   Gaps: {}", fit.keyword_gaps.join(", "));
        }
        if !fit.strengths.is_empty() {
            println!("   Strengths: {}", fit.strengths.join(", "));
        }
        println!();
    }

    // Generate application plan
    let plan = ApplicationPlan::generate(profile, &fit_scores, jobs);
    println!("=== Application Plan (Tier {}) ===\n", plan.priority_tier);
    println!("Target jobs: {}", plan.target_jobs.join(", "));
    println!("Estimated total hours: {:.1}\n", plan.estimated_total_hours);

    println!("Outreach sequence:");
    for step in &plan.outreach_sequence {
        println!("  Day {}: {} [{}]", step.day, step.action, step.channel);
    }
    println!();

    println!("Resume tailoring:");
    for t in &plan.resume_tailoring {
        println!(
            "  {}: +{} keywords, emphasize {}",
            t.job_id,
            t.keywords_to_add.len(),
            t.keywords_to_emphasize.join(", ")
        );
    }
    println!();

    println!("Interview prep:");
    for p in &plan.interview_prep {
        println!(
            "  {} [{}]{}",
            p.topic,
            p.difficulty,
            if p.profile_gap { " (gap)" } else { "" }
        );
    }
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    println!("=== Reverse Recruiter Demo ===\n");

    // Build profile from resume text
    let resume = "Senior Rust and Python developer with 6 years of experience \
                  in distributed systems and cloud infrastructure. \
                  Proficient in Docker, Kubernetes, and AWS. \
                  Experience with machine learning pipelines and data engineering. \
                  Strong leadership and mentoring skills.";

    let mut profile = integration::profile_from_resume("demo-001", "Demo Candidate", resume);
    profile.total_years_experience = 6.0;
    profile.education_level = "bachelors".into();
    profile.preferences = Preferences {
        min_salary: Some(140000.0),
        remote_ok: true,
        hybrid_ok: true,
        onsite_ok: false,
        preferred_industries: vec!["tech".into(), "fintech".into()],
        dealbreaker_industries: vec!["defense".into()],
        preferred_company_sizes: vec!["startup".into(), "mid".into()],
        visa_sponsorship_needed: false,
        ..Preferences::default()
    };

    println!("Profile: {} ({})", profile.name, profile.id);
    println!(
        "Skills: {}",
        profile
            .skills
            .iter()
            .map(|s| format!("{} ({:?})", s.name, s.level))
            .collect::<Vec<_>>()
            .join(", ")
    );
    println!("Strength: {:.2}\n", profile.profile_strength());

    // Attempt to fetch live jobs from configured APIs
    let query = std::env::var("SEARCH_QUERY").unwrap_or_else(|_| "rust developer".into());
    let gh_boards = parse_greenhouse_boards();
    let gh_refs: Vec<(&str, &str)> = gh_boards
        .iter()
        .map(|(t, n)| (t.as_str(), n.as_str()))
        .collect();

    println!("Fetching live jobs (query: \"{}\")...", query);
    let live_jobs = integration::fetch_live_jobs(&query, &gh_refs, 10).await;

    let jobs = if live_jobs.is_empty() {
        println!("No live APIs returned results — using sample job data.\n");
        println!("Tip: set ADZUNA_APP_ID + ADZUNA_APP_KEY for live Adzuna results.");
        println!("     set GREENHOUSE_BOARDS=\"figma:Figma,cloudflare:Cloudflare\" for Greenhouse.\n");
        sample_jobs()
    } else {
        println!("Fetched {} live job listings!\n", live_jobs.len());
        live_jobs
    };

    display_results(&jobs, &profile);
}
