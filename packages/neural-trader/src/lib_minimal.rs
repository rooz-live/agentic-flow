use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

// Simple WASM-compatible structures
#[derive(Debug, Clone, Serialize, Deserialize)]
#[wasm_bindgen]
pub struct AnalysisResult {
    pub signals: Vec<TradingSignal>,
    pub confidence: f64,
    pub timestamp: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[wasm_bindgen]
pub struct TradingSignal {
    pub action: String,
    pub strength: f64,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[wasm_bindgen]
pub struct HealthStatus {
    pub status: String,
    pub version: String,
    pub timestamp: f64,
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
    pub fn new(config: JsValue) -> Result<NeuralTrader, JsValue> {
        let trader = NeuralTrader {
            initialized: false,
            model: "minimal".to_string(),
            version: "1.0.0".to_string(),
        };
        Ok(trader)
    }

    #[wasm_bindgen]
    pub fn initialize(&mut self) -> Result<(), JsValue> {
        self.initialized = true;
        Ok(())
    }

    #[wasm_bindgen]
    pub fn analyze(&self, market_data: JsValue) -> Result<JsValue, Result<AnalysisResult, String>> {
        if !self.initialized {
            return Ok(JsValue::from_str("NeuralTrader not initialized"));
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

        // Convert to JSON string then to JsValue
        let json_str = serde_json::to_string(&result)
            .map_err(|e| format!("Serialization error: {}", e))?;
        
        Ok(JsValue::from_str(&json_str))
    }

    #[wasm_bindgen]
    pub fn get_health(&self) -> Result<JsValue, Result<HealthStatus, String>> {
        let health = HealthStatus {
            status: if self.initialized { "healthy" } else { "uninitialized" }.to_string(),
            version: self.version.clone(),
            timestamp: js_sys::Date::now(),
        };

        let json_str = serde_json::to_string(&health)
            .map_err(|e| format!("Serialization error: {}", e))?;
        
        Ok(JsValue::from_str(&json_str))
    }

    #[wasm_bindgen]
    pub fn calculate_risk(&self, portfolio_data: JsValue) -> Result<f64, JsValue> {
        // Simple mock risk calculation
        Ok(0.15) // 15% risk
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

// Initialize panic hook for better error messages
#[cfg(feature = "console_error_panic_hook")]
pub fn set_panic_hook() {
    console_error_panic_hook::set_once();
}

#[wasm_bindgen(start)]
pub fn main() {
    console_error_panic_hook::set_once();
    log("NeuralTrader WASM module loaded");
}
