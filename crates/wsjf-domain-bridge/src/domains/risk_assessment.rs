//! Risk Assessment Domain
//!
//! ROAM (Resolved, Owned, Accepted, Mitigated) framework risk profiles.
//! Evaluates on correct risk classification, mitigation plan quality,
//! and risk-reduction scoring accuracy.

use rand::Rng;
use ruvector_domain_expansion::{
    Domain, DomainEmbedding, DomainId, Evaluation, Solution, Task,
};
use serde::{Deserialize, Serialize};

const EMBEDDING_DIM: usize = 32;

/// ROAM risk classification.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum RoamStatus {
    Resolved,
    Owned,
    Accepted,
    Mitigated,
}

/// A risk item to assess.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskItem {
    pub id: String,
    pub description: String,
    pub probability: f32,       // [0.0, 1.0]
    pub impact_cost: f32,       // dollar impact
    pub current_mitigation: f32, // [0.0, 1.0]
    pub proposed_mitigation: f32,
    pub category: String,       // "technical", "operational", "financial", "compliance"
    /// Ground truth ROAM classification.
    pub roam_status: RoamStatus,
}

impl RiskItem {
    /// Risk reduction score [1-10] based on mitigation delta.
    pub fn risk_reduction_score(&self) -> f32 {
        let current_risk = self.probability * self.impact_cost * (1.0 - self.current_mitigation);
        let future_risk = self.probability * self.impact_cost * (1.0 - self.proposed_mitigation);
        let reduction = current_risk - future_risk;
        (reduction / 10_000.0).max(1.0).min(10.0)
    }

    /// Expected ROAM status based on mitigation levels.
    pub fn expected_roam(&self) -> RoamStatus {
        if self.proposed_mitigation >= 0.95 {
            RoamStatus::Resolved
        } else if self.probability < 0.1 {
            RoamStatus::Accepted
        } else if self.proposed_mitigation > self.current_mitigation + 0.3 {
            RoamStatus::Mitigated
        } else {
            RoamStatus::Owned
        }
    }
}

pub struct RiskAssessmentDomain {
    id: DomainId,
}

impl RiskAssessmentDomain {
    pub fn new() -> Self {
        Self {
            id: DomainId("risk_assessment".into()),
        }
    }

    fn random_risk(rng: &mut impl Rng, difficulty: f32, idx: usize) -> RiskItem {
        let categories = ["technical", "operational", "financial", "compliance"];
        let descriptions = [
            "API rate limit exhaustion under peak load",
            "Database migration rollback failure",
            "Payment gateway credential rotation",
            "GDPR data retention policy violation",
            "Memory leak in long-running agent processes",
            "Cross-region failover latency spike",
            "Stale cache serving incorrect prices",
            "Concurrent write corruption in JSONL logs",
        ];

        let prob = rng.gen_range(0.01..0.9 + difficulty * 0.1);
        let impact = rng.gen_range(1000.0..500_000.0);
        let current_mit = rng.gen_range(0.0..0.7);
        let proposed_mit = rng.gen_range(current_mit..1.0);

        let mut item = RiskItem {
            id: format!("RISK-{:04}", idx),
            description: descriptions[rng.gen_range(0..descriptions.len())].into(),
            probability: prob,
            impact_cost: impact,
            current_mitigation: current_mit,
            proposed_mitigation: proposed_mit,
            category: categories[rng.gen_range(0..categories.len())].into(),
            roam_status: RoamStatus::Owned, // placeholder
        };
        item.roam_status = item.expected_roam();
        item
    }
}

impl Domain for RiskAssessmentDomain {
    fn id(&self) -> &DomainId {
        &self.id
    }

    fn name(&self) -> &str {
        "Risk Assessment"
    }

    fn generate_tasks(&self, count: usize, difficulty: f32) -> Vec<Task> {
        let mut rng = rand::thread_rng();
        (0..count)
            .map(|i| {
                let n_risks = rng.gen_range(4..=12);
                let risks: Vec<RiskItem> = (0..n_risks)
                    .map(|j| Self::random_risk(&mut rng, difficulty, i * 100 + j))
                    .collect();

                Task {
                    id: format!("risk-task-{:04}", i),
                    domain_id: self.id.clone(),
                    difficulty,
                    spec: serde_json::json!({
                        "task_type": "assess_risks",
                        "risks": risks,
                        "required_outputs": [
                            "roam_classifications",
                            "risk_reduction_scores",
                            "priority_ranking",
                            "mitigation_plans"
                        ],
                    }),
                    constraints: vec![
                        "all ROAM statuses must be one of: Resolved, Owned, Accepted, Mitigated".into(),
                        "risk_reduction_scores in [1, 10]".into(),
                    ],
                }
            })
            .collect()
    }

    fn evaluate(&self, task: &Task, solution: &Solution) -> Evaluation {
        let risks: Vec<RiskItem> = task
            .spec
            .get("risks")
            .and_then(|r| serde_json::from_value(r.clone()).ok())
            .unwrap_or_default();

        // ROAM classification accuracy
        let sol_roam: Vec<String> = solution
            .data
            .get("roam_classifications")
            .and_then(|r| serde_json::from_value(r.clone()).ok())
            .unwrap_or_default();

        let roam_correct = risks
            .iter()
            .zip(sol_roam.iter())
            .filter(|(risk, sol)| {
                let expected = match risk.expected_roam() {
                    RoamStatus::Resolved => "Resolved",
                    RoamStatus::Owned => "Owned",
                    RoamStatus::Accepted => "Accepted",
                    RoamStatus::Mitigated => "Mitigated",
                };
                sol.as_str() == expected
            })
            .count();
        let correctness = if risks.is_empty() {
            0.0
        } else {
            roam_correct as f32 / risks.len() as f32
        };

        // Risk reduction score accuracy
        let sol_scores: Vec<f32> = solution
            .data
            .get("risk_reduction_scores")
            .and_then(|s| serde_json::from_value(s.clone()).ok())
            .unwrap_or_default();

        let ref_scores: Vec<f32> = risks.iter().map(|r| r.risk_reduction_score()).collect();
        let score_errors: f32 = sol_scores
            .iter()
            .zip(ref_scores.iter())
            .map(|(s, r)| (s - r).abs() / 10.0)
            .sum();
        let efficiency = if ref_scores.is_empty() {
            0.0
        } else {
            (1.0 - score_errors / ref_scores.len() as f32).max(0.0)
        };

        // Mitigation plans present
        let has_plans = solution.data.get("mitigation_plans").is_some();
        let has_ranking = solution.data.get("priority_ranking").is_some();
        let elegance = match (has_plans, has_ranking) {
            (true, true) => 0.9,
            (true, false) | (false, true) => 0.5,
            _ => 0.1,
        };

        Evaluation::composite(correctness, efficiency, elegance)
    }

    fn embed(&self, solution: &Solution) -> DomainEmbedding {
        let mut vec = vec![0.0f32; EMBEDDING_DIM];

        // Encode ROAM distribution in first 4 dims
        if let Some(roams) = solution.data.get("roam_classifications").and_then(|r| r.as_array()) {
            let total = roams.len().max(1) as f32;
            let resolved = roams.iter().filter(|r| r.as_str() == Some("Resolved")).count() as f32;
            let owned = roams.iter().filter(|r| r.as_str() == Some("Owned")).count() as f32;
            let accepted = roams.iter().filter(|r| r.as_str() == Some("Accepted")).count() as f32;
            let mitigated = roams.iter().filter(|r| r.as_str() == Some("Mitigated")).count() as f32;
            vec[0] = resolved / total;
            vec[1] = owned / total;
            vec[2] = accepted / total;
            vec[3] = mitigated / total;
        }

        // Encode risk reduction scores in dims 4-16
        if let Some(scores) = solution.data.get("risk_reduction_scores").and_then(|s| s.as_array()) {
            for (i, s) in scores.iter().enumerate() {
                if i < 12 {
                    vec[4 + i] = s.as_f64().unwrap_or(0.0) as f32 / 10.0;
                }
            }
        }

        DomainEmbedding::new(vec, self.id.clone())
    }

    fn embedding_dim(&self) -> usize {
        EMBEDDING_DIM
    }

    fn reference_solution(&self, task: &Task) -> Option<Solution> {
        let risks: Vec<RiskItem> = task
            .spec
            .get("risks")
            .and_then(|r| serde_json::from_value(r.clone()).ok())?;

        let roam_classifications: Vec<&str> = risks
            .iter()
            .map(|r| match r.expected_roam() {
                RoamStatus::Resolved => "Resolved",
                RoamStatus::Owned => "Owned",
                RoamStatus::Accepted => "Accepted",
                RoamStatus::Mitigated => "Mitigated",
            })
            .collect();

        let scores: Vec<f32> = risks.iter().map(|r| r.risk_reduction_score()).collect();

        // Rank by risk reduction potential (highest first)
        let mut ranking: Vec<(usize, f32)> = scores.iter().enumerate().map(|(i, s)| (i, *s)).collect();
        ranking.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
        let ranked_ids: Vec<&str> = ranking.iter().map(|(i, _)| risks[*i].id.as_str()).collect();

        let plans: Vec<String> = risks
            .iter()
            .map(|r| format!("Increase mitigation from {:.0}% to {:.0}% for {}",
                r.current_mitigation * 100.0,
                r.proposed_mitigation * 100.0,
                r.description))
            .collect();

        Some(Solution {
            task_id: task.id.clone(),
            content: format!("Assessed {} risks", risks.len()),
            data: serde_json::json!({
                "roam_classifications": roam_classifications,
                "risk_reduction_scores": scores,
                "priority_ranking": ranked_ids,
                "mitigation_plans": plans,
            }),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_risk_generate_and_evaluate() {
        let domain = RiskAssessmentDomain::new();
        let tasks = domain.generate_tasks(3, 0.5);

        for task in &tasks {
            let solution = domain.reference_solution(task).unwrap();
            let eval = domain.evaluate(task, &solution);
            assert!(eval.score > 0.5, "score={}", eval.score);
        }
    }
}
