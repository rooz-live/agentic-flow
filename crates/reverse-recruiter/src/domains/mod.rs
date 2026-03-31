// @constraint DDD-RECRUITMENT-CONTEXT: Domain aggregation module for job matching and candidate profiling
// @domain-entities: struct ApplicationPlan, struct OutreachStep, struct ResumeTailoring, struct InterviewPrep, struct SkillLevel, struct Skill, struct Experience, struct ProfileAggregate, struct ExperienceTier, struct PricingModel, struct RecruitingService, struct WorkArrangement, struct CompanySize, struct JobSpec, struct FitScore
// @domain-behavior: impl application_planning, impl resume_tailoring, impl skill_matching, impl job_fit_scoring, impl service_directory_filtering
pub mod application;
pub mod integration;
pub mod job_matching;
pub mod profile;
pub mod service_directory;

pub use application::{ApplicationPlan, OutreachStep, ResumeTailoring, InterviewPrep};
pub use profile::{SkillLevel, Skill, Experience, ProfileAggregate};
pub use service_directory::{ExperienceTier, PricingModel, RecruitingService};
pub use job_matching::{WorkArrangement, CompanySize, JobSpec, FitScore};
