use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

// Simple WASM-compatible structures
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisResult {
    pub signals: Vec<TradingSignal>,
    pub confidence: f64,
    pub timestamp: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TradingSignal {
    pub action: String,
    pub strength: f64,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthStatus {
    pub status: String,
    pub version: String,
    pub timestamp: f64,
}

// Convert structs to JsValue using From traits
impl From<AnalysisResult> for JsValue {
    fn from(result: AnalysisResult) -> Self {
        let json_str = serde_json::to_string(&result).unwrap_or_default();
        JsValue::from_str(&json_str)
    }
}

impl From<HealthStatus> for JsValue {
    fn from(status: HealthStatus) -> Self {
        let json_str = serde_json::to_string(&status).unwrap_or_default();
        JsValue::from_str(&json_str)
    }
}

#[wasm_bindgen]
pub struct NeuralTrader {
    initialized: bool,
    model: String,
    version: String,
}

#[wasm_bindgen]
impl NeuralTrader {
    #[wasm_bindgen(constructor)]
    pub fn new(_config: JsValue) -> NeuralTrader {
        NeuralTrader {
            initialized: false,
            model: "minimal".to_string(),
            version: "1.0.0".to_string(),
        }
    }

    #[wasm_bindgen]
    pub fn initialize(&mut self) {
        self.initialized = true;
    }

    #[wasm_bindgen]
    pub fn analyze(&self, _market_data: JsValue) -> JsValue {
        if !self.initialized {
            return JsValue::from_str("NeuralTrader not initialized");
        }

        // Simple mock analysis
        let result = AnalysisResult {
            signals: vec![
                TradingSignal {
                    action: "HOLD".to_string(),
                    strength: 0.8,
                    reason: "Market conditions uncertain".to_string(),
                },
            ],
            confidence: 0.75,
            timestamp: js_sys::Date::now(),
        };

        result.into()
    }

    #[wasm_bindgen]
    pub fn get_health(&self) -> JsValue {
        let health = HealthStatus {
            status: if self.initialized { "healthy" } else { "uninitialized" }.to_string(),
            version: self.version.clone(),
            timestamp: js_sys::Date::now(),
        };

        health.into()
    }

    #[wasm_bindgen]
    pub fn calculate_risk(&self, _portfolio_data: JsValue) -> f64 {
        // Simple mock risk calculation
        0.15 // 15% risk
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
    log(&format!("Hello, {}! NeuralTrader WASM is working.", name));
}

// Simple initialization without panic hook
#[wasm_bindgen(start)]
pub fn main() {
    log("NeuralTrader WASM module loaded");
}
