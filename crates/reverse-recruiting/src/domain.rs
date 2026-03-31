//! Core domain types for the reverse-recruiting bounded context.
//!
//! No IO. No external calls. Pure value objects + entities.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

// ── Skill vocabulary ──────────────────────────────────────────────────────────

/// Skill set: what a seeker has, or what a role demands.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct SkillSet {
    pub required: Vec<String>,
    pub nice_to_have: Vec<String>,
    /// Self-assessed years of experience per skill key (lowercase).
    pub years_of_experience: HashMap<String, u32>,
}

// ── Seniority ladder ──────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SeniorityLevel {
    Entry,
    Mid,
    Senior,
    Staff,
    Principal,
    Director,
}

impl SeniorityLevel {
    /// Adjacent levels are considered a "near fit" (±1 rung).
    pub fn distance(&self, other: &Self) -> u8 {
        let rank = |s: &Self| match s {
            Self::Entry     => 0u8,
            Self::Mid       => 1,
            Self::Senior    => 2,
            Self::Staff     => 3,
            Self::Principal => 4,
            Self::Director  => 5,
        };
        rank(self).abs_diff(rank(other))
    }
}

// ── Job-seeker profile ────────────────────────────────────────────────────────

/// Passive job seeker captured by the reverse-recruiting agent.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobSeekerProfile {
    pub id: Uuid,
    pub name: String,
    pub skills: SkillSet,
    /// Preferred role titles, e.g. ["Staff Engineer", "Principal SWE"]
    pub preferred_roles: Vec<String>,
    /// Preferred locations; use "remote" for remote-only preference.
    pub preferred_locations: Vec<String>,
    /// Minimum acceptable annual compensation in USD (None = undisclosed).
    pub min_compensation: Option<u64>,
    pub max_commute_miles: Option<u32>,
    pub seniority_level: SeniorityLevel,
    pub created_at: DateTime<Utc>,
}

impl JobSeekerProfile {
    pub fn new(name: impl Into<String>, seniority: SeniorityLevel) -> Self {
        Self {
            id: Uuid::new_v4(),
            name: name.into(),
            skills: SkillSet::default(),
            preferred_roles: Vec::new(),
            preferred_locations: Vec::new(),
            min_compensation: None,
            max_commute_miles: None,
            seniority_level: seniority,
            created_at: Utc::now(),
        }
    }
}

// ── Role / job profile ────────────────────────────────────────────────────────

/// Open role ingested from a job board (e.g. simplify.jobs, LinkedIn).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoleProfile {
    pub id: Uuid,
    pub company: String,
    pub title: String,
    pub skills: SkillSet,
    /// "remote", city name, or "hybrid-<city>".
    pub location: String,
    /// Inclusive salary band in USD (min, max).
    pub compensation_range: Option<(u64, u64)>,
    pub seniority_level: SeniorityLevel,
    /// Original job-board URL for sourcing attribution.
    pub source_url: Option<String>,
    pub posted_at: DateTime<Utc>,
}

impl RoleProfile {
    pub fn new(company: impl Into<String>, title: impl Into<String>, location: impl Into<String>, seniority: SeniorityLevel) -> Self {
        Self {
            id: Uuid::new_v4(),
            company: company.into(),
            title: title.into(),
            skills: SkillSet::default(),
            location: location.into(),
            compensation_range: None,
            seniority_level: seniority,
            source_url: None,
            posted_at: Utc::now(),
        }
    }
}

// ── Match result ──────────────────────────────────────────────────────────────

/// Output of the JobMatcher for one (seeker, role) pair.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CareerMatch {
    pub seeker_id: Uuid,
    pub role_id: Uuid,
    /// Composite WSJF-inspired score [0.0, 1.0]. Higher = stronger match.
    pub score: f64,
    /// Fraction of role's required skills present in seeker's skill set.
    pub skill_overlap: f64,
    pub compensation_fit: bool,
    pub location_fit: bool,
    /// `true` if seniority levels are equal or adjacent (±1 rung).
    pub seniority_fit: bool,
    /// Human-readable explanation for transparency / agent reasoning.
    pub explanation: String,
}

