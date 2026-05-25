//! Monolith Deconstruction Domains
//! 
//! Deconstructs 14 monolith domains:
//! - Controllers, Config, Compilers, Contexts, Embeddings
//! - Harnesses, Support, Proxies, Methods, Migration
//! - Models, Gateways, Patterns, Pipelines, Protocols

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Monolith domain classification
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum MonolithDomain {
    Controllers,
    Config,
    Compilers,
    Contexts,
    Embeddings,
    Harnesses,
    Support,
    Proxies,
    Methods,
    Migration,
    Models,
    Gateways,
    Patterns,
    Pipelines,
    Protocols,
}

impl MonolithDomain {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Controllers => "controllers",
            Self::Config => "config",
            Self::Compilers => "compilers",
            Self::Contexts => "contexts",
            Self::Embeddings => "embeddings",
            Self::Harnesses => "harnesses",
            Self::Support => "support",
            Self::Proxies => "proxies",
            Self::Methods => "methods",
            Self::Migration => "migration",
            Self::Models => "models",
            Self::Gateways => "gateways",
            Self::Patterns => "patterns",
            Self::Pipelines => "pipelines",
            Self::Protocols => "protocols",
        }
    }
    
    pub fn all() -> Vec<Self> {
        vec![
            Self::Controllers,
            Self::Config,
            Self::Compilers,
            Self::Contexts,
            Self::Embeddings,
            Self::Harnesses,
            Self::Support,
            Self::Proxies,
            Self::Methods,
            Self::Migration,
            Self::Models,
            Self::Gateways,
            Self::Patterns,
            Self::Pipelines,
            Self::Protocols,
        ]
    }
}

/// Maturity assessment for a domain
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DomainMaturity {
    pub domain: MonolithDomain,
    pub has_tests: bool,
    pub has_docs: bool,
    pub has_metrics: bool,
    pub lines_of_code: usize,
    pub complexity_score: f32,
    pub test_coverage: f32,
    pub last_updated_days: u32,
}

impl DomainMaturity {
    pub fn maturity_score(&self) -> f32 {
        let mut score = 0.0;
        
        if self.has_tests { score += 1.0; }
        if self.has_docs { score += 1.0; }
        if self.has_metrics { score += 1.0; }
        
        // Size factor (smaller is better for maturity)
        score += (1.0 / (1.0 + self.lines_of_code as f32 / 1000.0)).clamp(0.0, 1.0);
        
        // Complexity penalty
        score -= self.complexity_score * 0.1;
        
        // Test coverage bonus
        score += self.test_coverage * 0.5;
        
        // Recency penalty (older = less mature)
        score -= (self.last_updated_days as f32 / 365.0).clamp(0.0, 1.0);
        
        score.clamp(0.0, 5.0)
    }
    
    pub fn is_mature(&self) -> bool {
        self.maturity_score() >= 3.0 && self.test_coverage >= 0.7
    }
}

/// Deconstruction strategy for a domain
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeconstructionPlan {
    pub domain: MonolithDomain,
    pub current_maturity: f32,
    pub target_state: String,
    pub phases: Vec<DeconstructionPhase>,
    pub estimated_effort_hours: u32,
    pub risk_level: RiskLevel,
    pub dependencies: Vec<MonolithDomain>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum RiskLevel {
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeconstructionPhase {
    pub name: String,
    pub duration_weeks: u32,
    pub deliverables: Vec<String>,
    pub exit_criteria: Vec<String>,
}

/// WSJF-calculated priority for deconstruction
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DomainPriority {
    pub domain: MonolithDomain,
    pub maturity_score: f32,
    pub business_value: f32,
    pub time_criticality: f32,
    pub risk_reduction: f32,
    pub job_size: f32,
    pub wsjf_score: f32,
    pub cod: f32,
    pub rank: usize,
}

/// Monolith deconstructor with WSJF prioritization
pub struct MonolithDeconstructor {
    domains: HashMap<MonolithDomain, DomainMaturity>,
}

impl MonolithDeconstructor {
    pub fn new() -> Self {
        Self {
            domains: HashMap::new(),
        }
    }
    
    pub fn assess_domain(&mut self, maturity: DomainMaturity) {
        self.domains.insert(maturity.domain, maturity);
    }
    
    /// Calculate WSJF priority for all domains
    /// Lower maturity = higher cost of delay = higher priority
    pub fn calculate_priorities(&self) -> Vec<DomainPriority> {
        let mut priorities = Vec::new();
        
        for (domain, maturity) in &self.domains {
            let maturity_score = maturity.maturity_score();
            
            // Inverse maturity for CoD calculation
            // Least mature = highest CoD
            let inverse_maturity = 5.0 - maturity_score;
            
            // Business value based on domain criticality
            let business_value = match domain {
                MonolithDomain::Controllers => 9.0,
                MonolithDomain::Gateways => 8.0,
                MonolithDomain::Models => 8.0,
                MonolithDomain::Protocols => 7.0,
                MonolithDomain::Config => 7.0,
                MonolithDomain::Proxies => 7.0,
                MonolithDomain::Support => 6.0,
                MonolithDomain::Migration => 6.0,
                MonolithDomain::Pipelines => 6.0,
                MonolithDomain::Embeddings => 5.0,
                MonolithDomain::Compilers => 5.0,
                MonolithDomain::Harnesses => 5.0,
                MonolithDomain::Patterns => 4.0,
                MonolithDomain::Methods => 4.0,
                MonolithDomain::Contexts => 4.0,
            };
            
            // Time criticality based on age
            let time_criticality = (maturity.last_updated_days as f32 / 90.0).clamp(1.0, 10.0);
            
            // Risk reduction from complexity
            let risk_reduction = maturity.complexity_score.clamp(1.0, 10.0);
            
            // Job size based on LOC
            let job_size = (maturity.lines_of_code as f32 / 500.0).clamp(1.0, 20.0);
            
            // Cost of Delay
            let cod = business_value + time_criticality + risk_reduction + inverse_maturity;
            
            // WSJF score
            let wsjf = cod / job_size;
            
            priorities.push(DomainPriority {
                domain: *domain,
                maturity_score,
                business_value,
                time_criticality,
                risk_reduction,
                job_size,
                wsjf_score: wsjf,
                cod,
                rank: 0,
            });
        }
        
        // Sort by WSJF score descending
        priorities.sort_by(|a, b| {
            b.wsjf_score.partial_cmp(&a.wsjf_score).unwrap()
        });
        
        // Assign ranks
        for (i, priority) in priorities.iter_mut().enumerate() {
            priority.rank = i + 1;
        }
        
        priorities
    }
    
    /// Get least mature domains (candidates for deconstruction)
    pub fn get_least_mature(&self, limit: usize) -> Vec<&DomainMaturity> {
        let mut domains: Vec<&DomainMaturity> = self.domains.values().collect();
        domains.sort_by(|a, b| {
            a.maturity_score().partial_cmp(&b.maturity_score()).unwrap()
        });
        domains.into_iter().take(limit).collect()
    }
    
    /// Generate deconstruction plans for prioritized domains
    pub fn generate_plans(&self, priorities: &[DomainPriority]) -> Vec<DeconstructionPlan> {
        priorities.iter().map(|p| {
            let target_state = match p.domain {
                MonolithDomain::Controllers => "Microservices with DDD bounded contexts",
                MonolithDomain::Config => "Semantic configuration with vector embeddings",
                MonolithDomain::Compilers => "Incremental compilation with telemetry",
                MonolithDomain::Contexts => "Explicit context boundaries",
                MonolithDomain::Embeddings => "Multi-modal embedding pipeline",
                MonolithDomain::Harnesses => "Pattern-matching test harness",
                MonolithDomain::Support => "Intelligent triage with semantic routing",
                MonolithDomain::Proxies => "Intent-based traffic routing",
                MonolithDomain::Methods => "MPP (Method Pattern Protocol) definitions",
                MonolithDomain::Migration => "Delta embedding with risk prediction",
                MonolithDomain::Models => "Agent contract bundles",
                MonolithDomain::Gateways => "Semantic API discovery",
                MonolithDomain::Patterns => "Primitive code layer library",
                MonolithDomain::Pipelines => "Vectorized CI/CD with rollback prediction",
                MonolithDomain::Protocols => "MCP tool registry with semantic matching",
            };
            
            let risk_level = if p.wsjf_score > 8.0 {
                RiskLevel::Critical
            } else if p.wsjf_score > 5.0 {
                RiskLevel::High
            } else if p.wsjf_score > 3.0 {
                RiskLevel::Medium
            } else {
                RiskLevel::Low
            };
            
            DeconstructionPlan {
                domain: p.domain,
                current_maturity: p.maturity_score,
                target_state: target_state.to_string(),
                phases: self.generate_phases(p),
                estimated_effort_hours: (p.job_size * 8.0) as u32,
                risk_level,
                dependencies: self.get_dependencies(p.domain),
            }
        }).collect()
    }
    
    fn generate_phases(&self, priority: &DomainPriority) -> Vec<DeconstructionPhase> {
        vec![
            DeconstructionPhase {
                name: format!("NOW: Foundation - {}", priority.domain.as_str()),
                duration_weeks: 1,
                deliverables: vec![
                    "Core types and interfaces".to_string(),
                    "Basic unit tests".to_string(),
                    "Documentation".to_string(),
                ],
                exit_criteria: vec![
                    "Tests passing".to_string(),
                    "Type checking complete".to_string(),
                ],
            },
            DeconstructionPhase {
                name: format!("NEXT: Integration - {}", priority.domain.as_str()),
                duration_weeks: 2,
                deliverables: vec![
                    "Integration with vector search".to_string(),
                    "Circuit breaker protection".to_string(),
                    "Metrics and telemetry".to_string(),
                ],
                exit_criteria: vec![
                    "E2E tests passing".to_string(),
                    "Performance benchmarks met".to_string(),
                ],
            },
            DeconstructionPhase {
                name: format!("LATER: Optimization - {}", priority.domain.as_str()),
                duration_weeks: 1,
                deliverables: vec![
                    "Performance optimization".to_string(),
                    "Load testing".to_string(),
                    "Production readiness".to_string(),
                ],
                exit_criteria: vec![
                    "Load tests passing".to_string(),
                    "Monitoring in place".to_string(),
                ],
            },
        ]
    }
    
    fn get_dependencies(&self, domain: MonolithDomain) -> Vec<MonolithDomain> {
        match domain {
            MonolithDomain::Controllers => vec![MonolithDomain::Models, MonolithDomain::Contexts],
            MonolithDomain::Proxies => vec![MonolithDomain::Protocols, MonolithDomain::Gateways],
            MonolithDomain::Migration => vec![MonolithDomain::Embeddings, MonolithDomain::Pipelines],
            MonolithDomain::Support => vec![MonolithDomain::Patterns, MonolithDomain::Methods],
            _ => vec![],
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_domain_maturity() {
        let maturity = DomainMaturity {
            domain: MonolithDomain::Proxies,
            has_tests: false,
            has_docs: false,
            has_metrics: false,
            lines_of_code: 47,
            complexity_score: 2.0,
            test_coverage: 0.0,
            last_updated_days: 180,
        };
        
        assert!(maturity.maturity_score() < 2.0);
        assert!(!maturity.is_mature());
    }
    
    #[test]
    fn test_priority_calculation() {
        let mut deconstructor = MonolithDeconstructor::new();
        
        // Low maturity proxy domain
        deconstructor.assess_domain(DomainMaturity {
            domain: MonolithDomain::Proxies,
            has_tests: false,
            has_docs: false,
            has_metrics: false,
            lines_of_code: 47,
            complexity_score: 2.0,
            test_coverage: 0.0,
            last_updated_days: 180,
        });
        
        // High maturity config domain
        deconstructor.assess_domain(DomainMaturity {
            domain: MonolithDomain::Config,
            has_tests: true,
            has_docs: true,
            has_metrics: true,
            lines_of_code: 500,
            complexity_score: 4.0,
            test_coverage: 0.8,
            last_updated_days: 30,
        });
        
        let priorities = deconstructor.calculate_priorities();
        
        // Proxy should have higher priority (lower maturity)
        assert_eq!(priorities[0].domain, MonolithDomain::Proxies);
        assert!(priorities[0].wsjf_score > priorities[1].wsjf_score);
    }
    
    #[test]
    fn test_all_domains() {
        let domains = MonolithDomain::all();
        assert_eq!(domains.len(), 15);
        
        for domain in domains {
            assert!(!domain.as_str().is_empty());
        }
    }
}
