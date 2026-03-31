//! WSJF Prioritization Domain
//!
//! Generates prioritization tasks from historical WSJF items.
//! Evaluates on anti-pattern detection accuracy + score defensibility.

use rand::Rng;
use ruvector_domain_expansion::{
    Domain, DomainEmbedding, DomainId, Evaluation, Solution, Task,
};
use serde::{Deserialize, Serialize};

const EMBEDDING_DIM: usize = 32;

/// WSJF item representation for domain tasks.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WsjfItemSpec {
    pub id: String,
    pub business_value: f32,
    pub time_criticality: f32,
    pub risk_reduction: f32,
    pub job_size: f32,
    pub has_deadline: bool,
    pub hours_to_deadline: Option<f32>,
    pub has_justification: bool,
    /// Anti-patterns present (ground truth for evaluation).
    pub anti_patterns: Vec<String>,
}

impl WsjfItemSpec {
    /// WSJF = (BV + TC + RR) / JS
    pub fn wsjf_score(&self) -> f32 {
        (self.business_value + self.time_criticality + self.risk_reduction) / self.job_size
    }
}

/// WSJF Prioritization Domain.
///
/// Tasks: given a portfolio of WSJF items, identify anti-patterns,
/// compute defensible scores, and rank correctly.
pub struct WsjfPrioritizationDomain {
    id: DomainId,
}

impl WsjfPrioritizationDomain {
    pub fn new() -> Self {
        Self {
            id: DomainId("wsjf_prioritization".into()),
        }
    }

    /// Generate a random WSJF item at given difficulty.
    fn random_item(rng: &mut impl Rng, difficulty: f32, idx: usize) -> WsjfItemSpec {
        let extreme_prob = difficulty * 0.5;
        let stale_prob = difficulty * 0.3;

        let bv = if rng.gen::<f32>() < extreme_prob {
            if rng.gen_bool(0.5) { 1.0 } else { 10.0 }
        } else {
            rng.gen_range(2.0..9.0)
        };

        let tc = if rng.gen::<f32>() < extreme_prob {
            if rng.gen_bool(0.5) { 1.0 } else { 10.0 }
        } else {
            rng.gen_range(2.0..9.0)
        };

        let rr = rng.gen_range(1.0..10.0);

        // At higher difficulty, more items get minimum job_size (gaming pattern)
        let js = if rng.gen::<f32>() < difficulty * 0.4 {
            1.0
        } else {
            rng.gen_range(2.0..10.0)
        };

        let has_deadline = rng.gen::<f32>() < 0.4;
        let hours = if has_deadline {
            Some(rng.gen_range(1.0..168.0))
        } else {
            None
        };

        let has_justification = rng.gen::<f32>() > difficulty * 0.5;

        // Determine ground-truth anti-patterns
        let mut anti_patterns = Vec::new();
        if (bv == 1.0 || bv == 10.0 || tc == 1.0 || tc == 10.0) && !has_justification {
            anti_patterns.push("EXTREME_WITHOUT_JUSTIFICATION".into());
        }
        if js == 1.0 {
            anti_patterns.push("GAMING_JOB_SIZE".into());
        }
        if rng.gen::<f32>() < stale_prob {
            anti_patterns.push("STALE_SCORES".into());
        }

        WsjfItemSpec {
            id: format!("WSJF-GEN-{:04}", idx),
            business_value: bv,
            time_criticality: tc,
            risk_reduction: rr,
            job_size: js,
            has_deadline,
            hours_to_deadline: hours,
            has_justification,
            anti_patterns,
        }
    }
}

impl Domain for WsjfPrioritizationDomain {
    fn id(&self) -> &DomainId {
        &self.id
    }

    fn name(&self) -> &str {
        "WSJF Prioritization"
    }

    fn generate_tasks(&self, count: usize, difficulty: f32) -> Vec<Task> {
        let mut rng = rand::thread_rng();
        (0..count)
            .map(|i| {
                // Each task is a portfolio of 5-15 WSJF items to prioritize
                let portfolio_size = rng.gen_range(5..=15);
                let items: Vec<WsjfItemSpec> = (0..portfolio_size)
                    .map(|j| Self::random_item(&mut rng, difficulty, i * 100 + j))
                    .collect();

                let spec = serde_json::json!({
                    "task_type": "prioritize_portfolio",
                    "portfolio": items,
                    "required_outputs": [
                        "ranked_ids",
                        "detected_anti_patterns",
                        "defensible_scores",
                        "horizon_assignments"
                    ],
                });

                Task {
                    id: format!("wsjf-task-{:04}", i),
                    domain_id: self.id.clone(),
                    difficulty,
                    spec,
                    constraints: vec![
                        "all scores bounded [1,10]".into(),
                        "extreme values require justification".into(),
                        "stale scores flagged".into(),
                    ],
                }
            })
            .collect()
    }

    fn evaluate(&self, task: &Task, solution: &Solution) -> Evaluation {
        // Parse solution data
        let sol_data = &solution.data;

        // Extract ground-truth anti-patterns from task
        let portfolio: Vec<WsjfItemSpec> = task
            .spec
            .get("portfolio")
            .and_then(|p| serde_json::from_value(p.clone()).ok())
            .unwrap_or_default();

        let mut ground_truth_patterns: Vec<String> = Vec::new();
        let min_js_count = portfolio.iter().filter(|i| i.job_size == 1.0).count();
        if portfolio.len() > 0 && (min_js_count as f32 / portfolio.len() as f32) > 0.5 {
            ground_truth_patterns.push("GAMING_JOB_SIZE".into());
        }
        for item in &portfolio {
            for ap in &item.anti_patterns {
                if !ground_truth_patterns.contains(ap) {
                    ground_truth_patterns.push(ap.clone());
                }
            }
        }

        // Evaluate ranking correctness
        let mut correct_scores: Vec<(String, f32)> = portfolio
            .iter()
            .map(|i| (i.id.clone(), i.wsjf_score()))
            .collect();
        correct_scores.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());

        let solution_ranking: Vec<String> = sol_data
            .get("ranked_ids")
            .and_then(|r| serde_json::from_value(r.clone()).ok())
            .unwrap_or_default();

        // Kendall tau-like: fraction of pairs in correct order
        let mut concordant = 0u32;
        let mut total_pairs = 0u32;
        for i in 0..solution_ranking.len().min(correct_scores.len()) {
            for j in (i + 1)..solution_ranking.len().min(correct_scores.len()) {
                total_pairs += 1;
                let correct_i = correct_scores.iter().position(|x| x.0 == solution_ranking[i]);
                let correct_j = correct_scores.iter().position(|x| x.0 == solution_ranking[j]);
                if let (Some(ci), Some(cj)) = (correct_i, correct_j) {
                    if ci < cj {
                        concordant += 1;
                    }
                }
            }
        }
        let correctness = if total_pairs > 0 {
            concordant as f32 / total_pairs as f32
        } else {
            0.0
        };

        // Evaluate anti-pattern detection
        let detected: Vec<String> = sol_data
            .get("detected_anti_patterns")
            .and_then(|d| serde_json::from_value(d.clone()).ok())
            .unwrap_or_default();

        let true_positives = ground_truth_patterns
            .iter()
            .filter(|p| detected.contains(p))
            .count() as f32;
        let precision = if detected.is_empty() {
            0.0
        } else {
            true_positives / detected.len() as f32
        };
        let recall = if ground_truth_patterns.is_empty() {
            1.0
        } else {
            true_positives / ground_truth_patterns.len() as f32
        };
        let efficiency = if precision + recall > 0.0 {
            2.0 * precision * recall / (precision + recall) // F1
        } else {
            0.0
        };

        // Elegance: did solution provide defensible scores with evidence?
        let has_defensible = sol_data.get("defensible_scores").is_some();
        let has_horizons = sol_data.get("horizon_assignments").is_some();
        let elegance = if has_defensible && has_horizons {
            0.9
        } else if has_defensible || has_horizons {
            0.5
        } else {
            0.1
        };

        Evaluation::composite(correctness, efficiency, elegance)
    }

    fn embed(&self, solution: &Solution) -> DomainEmbedding {
        // Project solution into 32-dim space based on score distribution
        let mut vec = vec![0.0f32; EMBEDDING_DIM];

        if let Some(scores) = solution
            .data
            .get("defensible_scores")
            .and_then(|s| s.as_array())
        {
            for (i, s) in scores.iter().enumerate() {
                if i < EMBEDDING_DIM {
                    vec[i] = s.as_f64().unwrap_or(0.0) as f32 / 30.0; // normalize
                }
            }
        }

        // Encode anti-pattern detection in last 6 dims
        let patterns = ["GAMING_JOB_SIZE", "STALE_SCORES", "SCORE_CLUSTERING",
                        "EXTREME_WITHOUT_JUSTIFICATION", "CRITICAL_CONCENTRATION", "HIPPO_OVERRIDE"];
        if let Some(detected) = solution.data.get("detected_anti_patterns").and_then(|d| d.as_array()) {
            for (i, pattern) in patterns.iter().enumerate() {
                if detected.iter().any(|d| d.as_str() == Some(pattern)) {
                    vec[EMBEDDING_DIM - 6 + i] = 1.0;
                }
            }
        }

        DomainEmbedding::new(vec, self.id.clone())
    }

    fn embedding_dim(&self) -> usize {
        EMBEDDING_DIM
    }

    fn reference_solution(&self, task: &Task) -> Option<Solution> {
        let portfolio: Vec<WsjfItemSpec> = task
            .spec
            .get("portfolio")
            .and_then(|p| serde_json::from_value(p.clone()).ok())?;

        // Compute correct ranking
        let mut scored: Vec<(String, f32)> = portfolio
            .iter()
            .map(|i| (i.id.clone(), i.wsjf_score()))
            .collect();
        scored.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());

        let ranked_ids: Vec<&str> = scored.iter().map(|(id, _)| id.as_str()).collect();
        let defensible_scores: Vec<f32> = scored.iter().map(|(_, s)| *s).collect();

        // Detect all anti-patterns
        let mut anti_patterns = Vec::new();
        let min_js = portfolio.iter().filter(|i| i.job_size == 1.0).count();
        if portfolio.len() > 0 && (min_js as f32 / portfolio.len() as f32) > 0.5 {
            anti_patterns.push("GAMING_JOB_SIZE");
        }
        for item in &portfolio {
            for ap in &item.anti_patterns {
                if !anti_patterns.contains(&ap.as_str()) {
                    anti_patterns.push(ap.as_str());
                }
            }
        }

        // Assign horizons
        let horizons: Vec<&str> = scored
            .iter()
            .map(|(_, s)| {
                if *s >= 20.0 { "NOW" }
                else if *s >= 10.0 { "NEXT" }
                else { "LATER" }
            })
            .collect();

        Some(Solution {
            task_id: task.id.clone(),
            content: format!("Ranked {} items, detected {} anti-patterns", portfolio.len(), anti_patterns.len()),
            data: serde_json::json!({
                "ranked_ids": ranked_ids,
                "defensible_scores": defensible_scores,
                "detected_anti_patterns": anti_patterns,
                "horizon_assignments": horizons,
            }),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_and_evaluate() {
        let domain = WsjfPrioritizationDomain::new();
        let tasks = domain.generate_tasks(3, 0.5);
        assert_eq!(tasks.len(), 3);

        for task in &tasks {
            let solution = domain.reference_solution(task).unwrap();
            let eval = domain.evaluate(task, &solution);
            assert!(eval.score > 0.5, "Reference solution should score well: {}", eval.score);
        }
    }

    #[test]
    fn test_embedding_dim() {
        let domain = WsjfPrioritizationDomain::new();
        assert_eq!(domain.embedding_dim(), 32);
    }
}
