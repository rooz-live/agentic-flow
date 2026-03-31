//! Trading Signals Domain
//!
//! Maps WSJF risk/reward scoring patterns to trading signal generation.
//! Evaluates on Kelly criterion sizing, Sharpe-based signal quality,
//! and drawdown-aware position management.

use rand::Rng;
use ruvector_domain_expansion::{
    Domain, DomainEmbedding, DomainId, Evaluation, Solution, Task,
};
use serde::{Deserialize, Serialize};

const EMBEDDING_DIM: usize = 32;

/// A trading signal task: given market conditions, produce position recommendations.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketCondition {
    pub symbol: String,
    pub volatility: f32,        // annualized vol [0.05, 1.5]
    pub trend_strength: f32,    // [-1.0, 1.0] bearish to bullish
    pub mean_reversion: f32,    // [0.0, 1.0] how mean-reverting
    pub volume_ratio: f32,      // relative to 20d avg [0.1, 5.0]
    pub risk_budget: f32,       // max risk per trade [0.001, 0.05]
    pub win_probability: f32,   // estimated P(win) [0.3, 0.8]
    pub payoff_ratio: f32,      // expected win/loss ratio [0.5, 4.0]
}

impl MarketCondition {
    /// Kelly fraction = p - (1-p)/b where p=win_prob, b=payoff_ratio
    pub fn kelly_fraction(&self) -> f32 {
        let f = self.win_probability - (1.0 - self.win_probability) / self.payoff_ratio;
        f.max(0.0).min(self.risk_budget * 10.0) // cap at 10x risk budget
    }

    /// Expected Sharpe contribution
    pub fn expected_sharpe(&self) -> f32 {
        let excess_return = self.kelly_fraction() * self.payoff_ratio * self.win_probability;
        if self.volatility > 0.0 {
            excess_return / self.volatility
        } else {
            0.0
        }
    }
}

/// Trading Signals Domain.
///
/// Transfer from WSJF: risk/reward evaluation maps to Kelly sizing.
/// BV→expected_return, TC→signal_urgency, RR→risk_reduction, JS→position_complexity.
pub struct TradingSignalsDomain {
    id: DomainId,
}

impl TradingSignalsDomain {
    pub fn new() -> Self {
        Self {
            id: DomainId("trading_signals".into()),
        }
    }

    fn random_condition(rng: &mut impl Rng, difficulty: f32) -> MarketCondition {
        let vol = rng.gen_range(0.05..0.5 + difficulty);
        let trend = rng.gen_range(-1.0..1.0);
        let symbols = ["BTC", "ETH", "SOL", "SPY", "QQQ", "AAPL", "TSLA", "NVDA"];
        MarketCondition {
            symbol: symbols[rng.gen_range(0..symbols.len())].into(),
            volatility: vol,
            trend_strength: trend,
            mean_reversion: rng.gen_range(0.0..1.0),
            volume_ratio: rng.gen_range(0.1..3.0 + difficulty * 2.0),
            risk_budget: rng.gen_range(0.001..0.05),
            win_probability: rng.gen_range(0.3..0.8 - difficulty * 0.2),
            payoff_ratio: rng.gen_range(0.5..4.0),
        }
    }
}

impl Domain for TradingSignalsDomain {
    fn id(&self) -> &DomainId {
        &self.id
    }

    fn name(&self) -> &str {
        "Trading Signals"
    }

    fn generate_tasks(&self, count: usize, difficulty: f32) -> Vec<Task> {
        let mut rng = rand::thread_rng();
        (0..count)
            .map(|i| {
                let n_assets = rng.gen_range(3..=8);
                let conditions: Vec<MarketCondition> = (0..n_assets)
                    .map(|_| Self::random_condition(&mut rng, difficulty))
                    .collect();

                let total_budget: f32 = 100_000.0;

                Task {
                    id: format!("trade-task-{:04}", i),
                    domain_id: self.id.clone(),
                    difficulty,
                    spec: serde_json::json!({
                        "task_type": "generate_signals",
                        "conditions": conditions,
                        "total_budget": total_budget,
                        "required_outputs": [
                            "position_sizes",
                            "kelly_fractions",
                            "portfolio_sharpe",
                            "max_drawdown_estimate"
                        ],
                    }),
                    constraints: vec![
                        "sum(position_sizes) <= total_budget".into(),
                        "no single position > 25% of budget".into(),
                        "kelly_fraction >= 0 for all positions".into(),
                    ],
                }
            })
            .collect()
    }

    fn evaluate(&self, task: &Task, solution: &Solution) -> Evaluation {
        let conditions: Vec<MarketCondition> = task
            .spec
            .get("conditions")
            .and_then(|c| serde_json::from_value(c.clone()).ok())
            .unwrap_or_default();
        let total_budget = task.spec.get("total_budget")
            .and_then(|b| b.as_f64())
            .unwrap_or(100_000.0) as f32;

        // Check Kelly fractions
        let sol_kellys: Vec<f32> = solution
            .data
            .get("kelly_fractions")
            .and_then(|k| serde_json::from_value(k.clone()).ok())
            .unwrap_or_default();

        let reference_kellys: Vec<f32> = conditions.iter().map(|c| c.kelly_fraction()).collect();

        // Correctness: how close are Kelly fractions to optimal?
        let kelly_errors: Vec<f32> = sol_kellys
            .iter()
            .zip(reference_kellys.iter())
            .map(|(s, r)| (s - r).abs())
            .collect();
        let avg_error = if kelly_errors.is_empty() {
            1.0
        } else {
            kelly_errors.iter().sum::<f32>() / kelly_errors.len() as f32
        };
        let correctness = (1.0 - avg_error * 10.0).max(0.0);

        // Efficiency: position sizing within constraints
        let positions: Vec<f32> = solution
            .data
            .get("position_sizes")
            .and_then(|p| serde_json::from_value(p.clone()).ok())
            .unwrap_or_default();
        let total_allocated: f32 = positions.iter().sum();
        let max_single = positions.iter().cloned().fold(0.0f32, f32::max);
        let budget_ok = total_allocated <= total_budget;
        let concentration_ok = max_single <= total_budget * 0.25;
        let efficiency = if budget_ok && concentration_ok {
            0.9
        } else if budget_ok || concentration_ok {
            0.5
        } else {
            0.1
        };

        // Elegance: Sharpe and drawdown estimates present
        let has_sharpe = solution.data.get("portfolio_sharpe").is_some();
        let has_drawdown = solution.data.get("max_drawdown_estimate").is_some();
        let elegance = match (has_sharpe, has_drawdown) {
            (true, true) => 0.9,
            (true, false) | (false, true) => 0.5,
            _ => 0.1,
        };

        Evaluation::composite(correctness, efficiency, elegance)
    }

    fn embed(&self, solution: &Solution) -> DomainEmbedding {
        let mut vec = vec![0.0f32; EMBEDDING_DIM];

        // Encode Kelly fractions in first 8 dims
        if let Some(kellys) = solution.data.get("kelly_fractions").and_then(|k| k.as_array()) {
            for (i, k) in kellys.iter().enumerate() {
                if i < 8 {
                    vec[i] = k.as_f64().unwrap_or(0.0) as f32;
                }
            }
        }

        // Encode position sizes normalized by budget in dims 8-16
        if let Some(sizes) = solution.data.get("position_sizes").and_then(|p| p.as_array()) {
            let total: f64 = sizes.iter().filter_map(|s| s.as_f64()).sum();
            for (i, s) in sizes.iter().enumerate() {
                if i < 8 {
                    vec[8 + i] = if total > 0.0 {
                        s.as_f64().unwrap_or(0.0) as f32 / total as f32
                    } else {
                        0.0
                    };
                }
            }
        }

        // Sharpe in dim 24, drawdown in dim 25
        if let Some(sharpe) = solution.data.get("portfolio_sharpe").and_then(|s| s.as_f64()) {
            vec[24] = sharpe as f32 / 3.0; // normalize
        }
        if let Some(dd) = solution.data.get("max_drawdown_estimate").and_then(|d| d.as_f64()) {
            vec[25] = dd as f32; // already [0,1]
        }

        DomainEmbedding::new(vec, self.id.clone())
    }

    fn embedding_dim(&self) -> usize {
        EMBEDDING_DIM
    }

    fn reference_solution(&self, task: &Task) -> Option<Solution> {
        let conditions: Vec<MarketCondition> = task
            .spec
            .get("conditions")
            .and_then(|c| serde_json::from_value(c.clone()).ok())?;
        let total_budget = task.spec.get("total_budget")
            .and_then(|b| b.as_f64())
            .unwrap_or(100_000.0) as f32;

        let kellys: Vec<f32> = conditions.iter().map(|c| c.kelly_fraction()).collect();
        let kelly_sum: f32 = kellys.iter().sum();

        // Allocate proportional to Kelly, capped at 25%
        let positions: Vec<f32> = kellys
            .iter()
            .map(|k| {
                let raw = if kelly_sum > 0.0 {
                    k / kelly_sum * total_budget
                } else {
                    0.0
                };
                raw.min(total_budget * 0.25)
            })
            .collect();

        // Portfolio Sharpe estimate
        let sharpe: f32 = conditions
            .iter()
            .map(|c| c.expected_sharpe())
            .sum::<f32>()
            / (conditions.len() as f32).sqrt();

        // Max drawdown estimate (simplified)
        let max_dd: f32 = conditions
            .iter()
            .map(|c| c.volatility * (1.0 - c.win_probability))
            .fold(0.0f32, f32::max);

        Some(Solution {
            task_id: task.id.clone(),
            content: format!("Generated signals for {} assets", conditions.len()),
            data: serde_json::json!({
                "kelly_fractions": kellys,
                "position_sizes": positions,
                "portfolio_sharpe": sharpe,
                "max_drawdown_estimate": max_dd,
            }),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_trading_generate_and_evaluate() {
        let domain = TradingSignalsDomain::new();
        let tasks = domain.generate_tasks(3, 0.5);

        for task in &tasks {
            let solution = domain.reference_solution(task).unwrap();
            let eval = domain.evaluate(task, &solution);
            assert!(eval.score > 0.3, "score={}", eval.score);
        }
    }

    #[test]
    fn test_kelly_fraction_positive() {
        let cond = MarketCondition {
            symbol: "BTC".into(),
            volatility: 0.5,
            trend_strength: 0.3,
            mean_reversion: 0.2,
            volume_ratio: 1.0,
            risk_budget: 0.02,
            win_probability: 0.6,
            payoff_ratio: 2.0,
        };
        assert!(cond.kelly_fraction() > 0.0);
    }
}
