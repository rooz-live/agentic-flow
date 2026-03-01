//! Neural Trader v2.8 — Cross-platform WASM trading engine
//!
//! Real Kelly criterion sizing, Sharpe-based signal quality, and
//! drawdown-aware position management. Ported from wsjf-domain-bridge
//! trading_signals domain into a self-contained WASM module.

use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

const VERSION: &str = "2.8.0";

// ── Market condition input ──────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketCondition {
    pub symbol: String,
    pub volatility: f64,       // annualized vol [0.05, 1.5]
    pub trend_strength: f64,   // [-1.0, 1.0] bearish to bullish
    pub mean_reversion: f64,   // [0.0, 1.0]
    pub volume_ratio: f64,     // relative to 20d avg
    pub risk_budget: f64,      // max risk per trade [0.001, 0.05]
    pub win_probability: f64,  // estimated P(win) [0.3, 0.8]
    pub payoff_ratio: f64,     // expected win/loss ratio [0.5, 4.0]
}

impl MarketCondition {
    /// Kelly fraction = p - (1-p)/b, capped at 10× risk_budget.
    pub fn kelly_fraction(&self) -> f64 {
        let f = self.win_probability
            - (1.0 - self.win_probability) / self.payoff_ratio;
        f.max(0.0).min(self.risk_budget * 10.0)
    }

    /// Expected Sharpe contribution from this asset.
    pub fn expected_sharpe(&self) -> f64 {
        let excess = self.kelly_fraction() * self.payoff_ratio * self.win_probability;
        if self.volatility > 0.0 { excess / self.volatility } else { 0.0 }
    }

    /// Signal action derived from trend strength + Kelly edge.
    fn action(&self) -> (&'static str, f64) {
        let kelly = self.kelly_fraction();
        if kelly < 0.001 {
            ("SKIP", 0.0)
        } else if self.trend_strength > 0.3 {
            ("BUY", (self.trend_strength * kelly * 100.0).min(1.0))
        } else if self.trend_strength < -0.3 {
            ("SELL", (self.trend_strength.abs() * kelly * 100.0).min(1.0))
        } else {
            ("HOLD", kelly.min(1.0))
        }
    }
}

// ── Output structures ───────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TradingSignal {
    pub symbol: String,
    pub action: String,
    pub strength: f64,
    pub kelly_fraction: f64,
    pub position_size: f64,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisResult {
    pub signals: Vec<TradingSignal>,
    pub portfolio_sharpe: f64,
    pub max_drawdown_estimate: f64,
    pub total_allocated: f64,
    pub confidence: f64,
    pub timestamp: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskResult {
    pub risk_score: f64,
    pub kelly_fraction: f64,
    pub max_drawdown: f64,
    pub sharpe_ratio: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthStatus {
    pub status: String,
    pub version: String,
    pub engine: String,
    pub timestamp: f64,
}

// ── JsValue conversions ─────────────────────────────────────────────

macro_rules! impl_into_jsvalue {
    ($t:ty) => {
        impl From<$t> for JsValue {
            fn from(val: $t) -> Self {
                JsValue::from_str(
                    &serde_json::to_string(&val).unwrap_or_default(),
                )
            }
        }
    };
}

impl_into_jsvalue!(AnalysisResult);
impl_into_jsvalue!(RiskResult);
impl_into_jsvalue!(HealthStatus);

// ── Core engine ─────────────────────────────────────────────────────

#[wasm_bindgen]
pub struct NeuralTrader {
    initialized: bool,
    risk_threshold: f64,
    max_position_pct: f64,
    total_budget: f64,
}

#[wasm_bindgen]
impl NeuralTrader {
    /// Create a new NeuralTrader.
    ///
    /// Config JSON (all optional):
    /// ```json
    /// { "riskThreshold": 0.15, "maxPositionPct": 0.25, "totalBudget": 100000 }
    /// ```
    #[wasm_bindgen(constructor)]
    pub fn new(config: JsValue) -> NeuralTrader {
        // Parse optional config fields with sensible defaults
        let (risk_th, max_pos, budget) = config
            .as_string()
            .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
            .or_else(|| serde_json::from_str::<serde_json::Value>(
                &js_sys::JSON::stringify(&config)
                    .ok()?
                    .as_string()?).ok())
            .map(|v| (
                v.get("riskThreshold").and_then(|x| x.as_f64()).unwrap_or(0.15),
                v.get("maxPositionPct").and_then(|x| x.as_f64()).unwrap_or(0.25),
                v.get("totalBudget").and_then(|x| x.as_f64()).unwrap_or(100_000.0),
            ))
            .unwrap_or((0.15, 0.25, 100_000.0));

        NeuralTrader {
            initialized: false,
            risk_threshold: risk_th,
            max_position_pct: max_pos,
            total_budget: budget,
        }
    }

    #[wasm_bindgen]
    pub fn initialize(&mut self) {
        self.initialized = true;
    }

    /// Analyze market conditions array → trading signals with Kelly sizing.
    ///
    /// Input: JSON string of `MarketCondition[]`.
    /// Returns: JSON string of `AnalysisResult`.
    #[wasm_bindgen]
    pub fn analyze(&self, market_data: JsValue) -> JsValue {
        if !self.initialized {
            return JsValue::from_str(
                r#"{"error":"NeuralTrader not initialized"}"#,
            );
        }

        let conditions: Vec<MarketCondition> = market_data
            .as_string()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default();

        if conditions.is_empty() {
            return JsValue::from_str(
                r#"{"error":"No market conditions provided"}"#,
            );
        }

        // Kelly-weighted allocation
        let kellys: Vec<f64> = conditions.iter().map(|c| c.kelly_fraction()).collect();
        let kelly_sum: f64 = kellys.iter().sum();
        let cap = self.total_budget * self.max_position_pct;

        let positions: Vec<f64> = kellys
            .iter()
            .map(|k| {
                let raw = if kelly_sum > 0.0 {
                    k / kelly_sum * self.total_budget
                } else {
                    0.0
                };
                raw.min(cap)
            })
            .collect();

        // Portfolio Sharpe (diversified)
        let sharpe: f64 = conditions
            .iter()
            .map(|c| c.expected_sharpe())
            .sum::<f64>()
            / (conditions.len() as f64).sqrt();

        // Max drawdown estimate
        let max_dd: f64 = conditions
            .iter()
            .map(|c| c.volatility * (1.0 - c.win_probability))
            .fold(0.0f64, f64::max);

        let total_alloc: f64 = positions.iter().sum();

        let signals: Vec<TradingSignal> = conditions
            .iter()
            .zip(kellys.iter())
            .zip(positions.iter())
            .map(|((cond, &kelly), &pos)| {
                let (action, strength) = cond.action();
                TradingSignal {
                    symbol: cond.symbol.clone(),
                    action: action.to_string(),
                    strength,
                    kelly_fraction: kelly,
                    position_size: pos,
                    reason: format!(
                        "Kelly={:.4} Sharpe={:.2} Vol={:.2}",
                        kelly,
                        cond.expected_sharpe(),
                        cond.volatility,
                    ),
                }
            })
            .collect();

        let confidence = if sharpe > 1.0 {
            0.9
        } else if sharpe > 0.5 {
            0.7
        } else {
            0.5
        };

        let result = AnalysisResult {
            signals,
            portfolio_sharpe: sharpe,
            max_drawdown_estimate: max_dd,
            total_allocated: total_alloc,
            confidence,
            timestamp: js_sys::Date::now(),
        };

        result.into()
    }

    /// Calculate risk for a single position.
    ///
    /// Input: JSON string of a single `MarketCondition`.
    /// Returns: JSON string of `RiskResult`.
    #[wasm_bindgen]
    pub fn calculate_risk(&self, position_data: JsValue) -> JsValue {
        let cond: MarketCondition = position_data
            .as_string()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or(MarketCondition {
                symbol: "UNKNOWN".into(),
                volatility: 0.3,
                trend_strength: 0.0,
                mean_reversion: 0.5,
                volume_ratio: 1.0,
                risk_budget: 0.02,
                win_probability: 0.5,
                payoff_ratio: 1.0,
            });

        let kelly = cond.kelly_fraction();
        let sharpe = cond.expected_sharpe();
        let max_dd = cond.volatility * (1.0 - cond.win_probability);

        // Risk score: higher vol + lower win_prob + lower payoff = higher risk
        let risk_score = (cond.volatility * 0.4
            + (1.0 - cond.win_probability) * 0.3
            + (1.0 / cond.payoff_ratio.max(0.01)) * 0.3)
            .min(1.0);

        let result = RiskResult {
            risk_score,
            kelly_fraction: kelly,
            max_drawdown: max_dd,
            sharpe_ratio: sharpe,
        };

        result.into()
    }

    #[wasm_bindgen]
    pub fn get_health(&self) -> JsValue {
        let health = HealthStatus {
            status: if self.initialized { "healthy" } else { "uninitialized" }.to_string(),
            version: VERSION.to_string(),
            engine: "kelly-sharpe-v1".to_string(),
            timestamp: js_sys::Date::now(),
        };

        health.into()
    }
}

// Utility function for console logging
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[wasm_bindgen]
pub fn greet(name: &str) {
    log(&format!("Hello, {}! NeuralTrader WASM v{} loaded.", name, VERSION));
}

#[wasm_bindgen(start)]
pub fn main() {
    log(&format!("NeuralTrader WASM v{} — Kelly/Sharpe engine ready", VERSION));
}

// ── Tests (native only) ─────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn btc_condition() -> MarketCondition {
        MarketCondition {
            symbol: "BTC".into(),
            volatility: 0.5,
            trend_strength: 0.6,
            mean_reversion: 0.2,
            volume_ratio: 1.5,
            risk_budget: 0.02,
            win_probability: 0.6,
            payoff_ratio: 2.0,
        }
    }

    #[test]
    fn kelly_fraction_positive_edge() {
        let c = btc_condition();
        let k = c.kelly_fraction();
        // p=0.6, b=2.0 → f = 0.6 - 0.4/2.0 = 0.4
        // capped at 10×0.02 = 0.2
        assert!((k - 0.2).abs() < 1e-9, "kelly={}", k);
    }

    #[test]
    fn kelly_fraction_no_edge() {
        let c = MarketCondition {
            symbol: "X".into(),
            volatility: 0.3,
            trend_strength: 0.0,
            mean_reversion: 0.5,
            volume_ratio: 1.0,
            risk_budget: 0.02,
            win_probability: 0.3,
            payoff_ratio: 1.0,
        };
        // f = 0.3 - 0.7/1.0 = -0.4 → capped at 0
        assert_eq!(c.kelly_fraction(), 0.0);
    }

    #[test]
    fn sharpe_scales_with_edge() {
        let good = btc_condition();
        let bad = MarketCondition {
            win_probability: 0.35,
            payoff_ratio: 0.8,
            ..good.clone()
        };
        assert!(good.expected_sharpe() > bad.expected_sharpe());
    }

    #[test]
    fn action_buy_on_bullish_with_edge() {
        let c = btc_condition();
        let (action, strength) = c.action();
        assert_eq!(action, "BUY");
        assert!(strength > 0.0);
    }

    #[test]
    fn action_skip_on_no_edge() {
        let c = MarketCondition {
            symbol: "X".into(),
            volatility: 0.3,
            trend_strength: 0.8,
            mean_reversion: 0.5,
            volume_ratio: 1.0,
            risk_budget: 0.02,
            win_probability: 0.3,
            payoff_ratio: 1.0,
        };
        let (action, _) = c.action();
        assert_eq!(action, "SKIP");
    }
}
