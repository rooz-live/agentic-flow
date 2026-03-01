//! Neural Trader - Cross-platform neural trading system
//! 
//! Consolidated implementation with WSJF domain transfer learning
//! Supports Rust WASM compilation for cross-platform deployment

use wasm_bindgen::prelude::*;
use std::collections::HashMap;

// Import WSJF domain bridge for transfer learning
use wsjf_domain_bridge::{DomainEmbedding, TransferLearning};

mod trading;
mod risk;
mod analysis;
mod transfer;

use trading::{TradingEngine, Signal};
use risk::{RiskCalculator, RiskScore};
use analysis::MarketAnalyzer;
use transfer::PatternTransfer;

/// Neural Trader main class
#[wasm_bindgen]
pub struct NeuralTrader {
    engine: TradingEngine,
    risk_calculator: RiskCalculator,
    analyzer: MarketAnalyzer,
    pattern_transfer: PatternTransfer,
    config: HashMap<String, String>,
}

/// Trading signal result
#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct TradingSignal {
    pub symbol: String,
    pub action: String,
    pub confidence: f64,
    pub timestamp: u64,
    pub reasoning: String,
}

/// Risk calculation result
#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct RiskResult {
    pub risk_score: f64,
    pub confidence: f64,
    pub factors: RiskFactors,
}

#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct RiskFactors {
    pub position_size: f64,
    pub volatility: f64,
    pub base_risk: f64,
}

/// Market analysis result
#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct AnalysisResult {
    pub signals: Vec<TradingSignal>,
    pub metadata: AnalysisMetadata,
}

#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct AnalysisMetadata {
    pub model: String,
    pub version: String,
    pub processing_time: u64,
    pub data_points: usize,
}

#[wasm_bindgen]
impl NeuralTrader {
    /// Create new Neural Trader instance
    #[wasm_bindgen(constructor)]
    pub fn new(config: JsValue) -> Result<NeuralTrader, JsValue> {
        console_error_panic_hook::set_once();
        
        let config_map: HashMap<String, String> = config
            .into_serde()
            .map_err(|e| JsValue::from_str(&format!("Invalid config: {}", e)))?;
        
        let engine = TradingEngine::new(&config_map);
        let risk_calculator = RiskCalculator::new(&config_map);
        let analyzer = MarketAnalyzer::new(&config_map);
        let pattern_transfer = PatternTransfer::new();
        
        Ok(NeuralTrader {
            engine,
            risk_calculator,
            analyzer,
            pattern_transfer,
            config: config_map,
        })
    }
    
    /// Analyze market data and generate trading signals
    #[wasm_bindgen]
    pub async fn analyze(&self, market_data: JsValue) -> Result<JsValue, JsValue> {
        let data: MarketData = market_data
            .into_serde()
            .map_err(|e| JsValue::from_str(&format!("Invalid market data: {}", e)))?;
        
        let start_time = web_sys::window()
            .and_then(|w| w.performance())
            .map(|p| p.now())
            .unwrap_or(0.0);
        
        let signals = self.analyzer.analyze(&data).await;
        let processing_time = (web_sys::window()
            .and_then(|w| w.performance())
            .map(|p| p.now())
            .unwrap_or(0.0) - start_time) as u64;
        
        let result = AnalysisResult {
            signals: signals.into_iter().map(|s| TradingSignal {
                symbol: s.symbol,
                action: s.action,
                confidence: s.confidence,
                timestamp: s.timestamp,
                reasoning: s.reasoning,
            }).collect(),
            metadata: AnalysisMetadata {
                model: self.config.get("model").cloned().unwrap_or_default(),
                version: "2.8.0".to_string(),
                processing_time,
                data_points: 1,
            },
        };
        
        JsValue::from_serde(&result)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }
    
    /// Calculate risk score for a position
    #[wasm_bindgen]
    pub async fn calculate_risk(&self, position_data: JsValue) -> Result<JsValue, JsValue> {
        let data: PositionData = position_data
            .into_serde()
            .map_err(|e| JsValue::from_str(&format!("Invalid position data: {}", e)))?;
        
        let risk_score = self.risk_calculator.calculate(&data).await;
        
        let result = RiskResult {
            risk_score: risk_score.score,
            confidence: risk_score.confidence,
            factors: RiskFactors {
                position_size: risk_score.factors.position_size,
                volatility: risk_score.factors.volatility,
                base_risk: risk_score.factors.base_risk,
            },
        };
        
        JsValue::from_serde(&result)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }
    
    /// Transfer patterns between domains
    #[wasm_bindgen]
    pub async fn transfer_patterns(
        &self,
        source_domain: String,
        target_domain: String,
        patterns: JsValue,
    ) -> Result<JsValue, JsValue> {
        let pattern_data: Vec<Pattern> = patterns
            .into_serde()
            .map_err(|e| JsValue::from_str(&format!("Invalid patterns: {}", e)))?;
        
        let transferred = self.pattern_transfer
            .transfer(&source_domain, &target_domain, &pattern_data)
            .await;
        
        JsValue::from_serde(&transferred)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }
    
    /// Get system health status
    #[wasm_bindgen]
    pub fn get_health(&self) -> JsValue {
        let health = HealthStatus {
            status: "healthy".to_string(),
            wasm_loaded: true,
            initialized: true,
            config: self.config.clone(),
            version: "2.8.0".to_string(),
        };
        
        JsValue::from_serde(&health).unwrap_or(JsValue::NULL)
    }
}

// Supporting data structures
#[derive(serde::Serialize, serde::Deserialize)]
struct MarketData {
    symbol: Option<String>,
    price: Option<PriceData>,
    volume: Option<f64>,
    timestamp: Option<u64>,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct PriceData {
    current: f64,
    change: f64,
    change_percent: f64,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct PositionData {
    symbol: String,
    size: f64,
    volatility: Option<f64>,
    entry_price: Option<f64>,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct Pattern {
    id: String,
    embedding: Vec<f64>,
    confidence: f64,
    metadata: HashMap<String, String>,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct HealthStatus {
    status: String,
    wasm_loaded: bool,
    initialized: bool,
    config: HashMap<String, String>,
    version: String,
}

// Internal modules
pub mod trading {
    use super::*;
    
    pub struct TradingEngine {
        config: HashMap<String, String>,
    }
    
    impl TradingEngine {
        pub fn new(config: &HashMap<String, String>) -> Self {
            Self { config: config.clone() }
        }
    }
    
    #[derive(Debug, Clone)]
    pub struct Signal {
        pub symbol: String,
        pub action: String,
        pub confidence: f64,
        pub timestamp: u64,
        pub reasoning: String,
    }
}

pub mod risk {
    use super::*;
    
    pub struct RiskCalculator {
        config: HashMap<String, String>,
    }
    
    impl RiskCalculator {
        pub fn new(config: &HashMap<String, String>) -> Self {
            Self { config: config.clone() }
        }
        
        pub async fn calculate(&self, data: &PositionData) -> RiskScore {
            let mut score = 0.5; // Base risk
            
            // Adjust based on position size
            let max_size = self.config
                .get("maxPositionSize")
                .and_then(|s| s.parse().ok())
                .unwrap_or(10000.0);
            
            let size_ratio = data.size / max_size;
            score += size_ratio * 0.3;
            
            // Adjust based on volatility
            if let Some(volatility) = data.volatility {
                score += volatility * 0.2;
            }
            
            RiskScore {
                score: score.min(1.0),
                confidence: 0.85,
                factors: RiskFactors {
                    position_size: data.size,
                    volatility: data.volatility.unwrap_or(0.0),
                    base_risk: 0.5,
                },
            }
        }
    }
    
    #[derive(Debug, Clone)]
    pub struct RiskScore {
        pub score: f64,
        pub confidence: f64,
        pub factors: RiskFactors,
    }
    
    #[derive(Debug, Clone)]
    pub struct RiskFactors {
        pub position_size: f64,
        pub volatility: f64,
        pub base_risk: f64,
    }
}

pub mod analysis {
    use super::*;
    
    pub struct MarketAnalyzer {
        config: HashMap<String, String>,
    }
    
    impl MarketAnalyzer {
        pub fn new(config: &HashMap<String, String>) -> Self {
            Self { config: config.clone() }
        }
        
        pub async fn analyze(&self, data: &MarketData) -> Vec<Signal> {
            let mut signals = Vec::new();
            
            if let (Some(price), Some(volume)) = (&data.price, data.volume) {
                let momentum = self.calculate_momentum(price, volume);
                let signal = Signal {
                    symbol: data.symbol.clone().unwrap_or_default(),
                    action: if momentum > 0.0 { "BUY".to_string() } else { "SELL".to_string() },
                    confidence: (momentum.abs() * 0.1).min(0.95),
                    timestamp: data.timestamp.unwrap_or_else(|| {
                        std::time::SystemTime::now()
                            .duration_since(std::time::UNIX_EPOCH)
                            .unwrap_or_default()
                            .as_secs()
                    }),
                    reasoning: format!("Momentum: {:.4}", momentum),
                };
                signals.push(signal);
            }
            
            signals
        }
        
        fn calculate_momentum(&self, price: &PriceData, volume: f64) -> f64 {
            let volume_weight = (volume + 1.0).ln() / 10.0;
            price.change * volume_weight
        }
    }
}

pub mod transfer {
    use super::*;
    use wsjf_domain_bridge::{DomainEmbedding, TransferLearning};
    
    pub struct PatternTransfer {
        transfer_learning: TransferLearning,
    }
    
    impl PatternTransfer {
        pub fn new() -> Self {
            Self {
                transfer_learning: TransferLearning::new(),
            }
        }
        
        pub async fn transfer(
            &self,
            source_domain: &str,
            target_domain: &str,
            patterns: &[Pattern],
        ) -> TransferResult {
            // Convert patterns to domain embeddings
            let embeddings: Vec<DomainEmbedding> = patterns
                .iter()
                .map(|p| DomainEmbedding {
                    id: p.id.clone(),
                    vector: p.embedding.clone(),
                    confidence: p.confidence,
                    metadata: p.metadata.clone(),
                })
                .collect();
            
            // Perform transfer learning
            let transferred = self.transfer_learning
                .transfer_between_domains(source_domain, target_domain, &embeddings)
                .await;
            
            TransferResult {
                transferred_patterns: transferred
                    .into_iter()
                    .map(|e| Pattern {
                        id: e.id,
                        embedding: e.vector,
                        confidence: e.confidence,
                        metadata: e.metadata,
                    })
                    .collect(),
                transfer_success: true,
                confidence: 0.8,
            }
        }
    }
    
    #[derive(serde::Serialize, serde::Deserialize)]
    pub struct TransferResult {
        pub transferred_patterns: Vec<Pattern>,
        pub transfer_success: bool,
        pub confidence: f64,
    }
}
