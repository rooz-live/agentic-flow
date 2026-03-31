# NAPI-RS Portfolio Integration Plan

**Date**: 2026-02-13  
**Task**: Integrate Rust Portfolio Module with Node.js via NAPI-RS  
**WSJF**: 2.0 (NEXT Horizon)  
**Status**: READY TO START

---

## Objective

Replace mock portfolio data in TUI dashboard with **real portfolio calculations** from Rust DDD models using NAPI-RS bindings for cross-platform deployment (Win/Linux/iOS/MacOS).

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ TUI Dashboard (Python/Textual)                              │
│ validation_dashboard_tui.py                                 │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ HTTP/JSON-RPC
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Node.js Service (Express)                                   │
│ portfolio_service.js                                        │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ NAPI-RS Bindings
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Rust Portfolio Module (DDD)                                 │
│ rust/core/src/portfolio/                                    │
│ - aggregates.rs (Portfolio)                                 │
│ - entities.rs (Holding, Asset)                              │
│ - value_objects.rs (Money, Currency, Allocation)            │
│ - services.rs (PortfolioRebalancer, PerformanceCalculator)  │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: NAPI-RS Setup (1 hour)

**Step 1.1**: Add NAPI-RS dependencies to `rust/core/Cargo.toml`
```toml
[dependencies]
napi = "2.16"
napi-derive = "2.16"

[lib]
crate-type = ["cdylib", "rlib"]
```

**Step 1.2**: Create NAPI-RS bindings module
```bash
cd rust/core
mkdir -p src/napi_bindings
touch src/napi_bindings/mod.rs
touch src/napi_bindings/portfolio.rs
```

**Step 1.3**: Configure build script
```bash
touch build.rs
```

---

### Phase 2: Portfolio Bindings (2 hours)

**Step 2.1**: Create Portfolio NAPI bindings (`src/napi_bindings/portfolio.rs`)
```rust
use napi::bindgen_prelude::*;
use napi_derive::napi;
use crate::portfolio::{Portfolio, Holding, Asset, Money, Currency};
use std::collections::HashMap;

#[napi(object)]
pub struct PortfolioSummary {
    pub total_value: f64,
    pub total_cost: f64,
    pub unrealized_gain: f64,
    pub return_pct: f64,
    pub holdings_count: u32,
}

#[napi(object)]
pub struct AssetAllocation {
    pub equity: f64,
    pub crypto: f64,
    pub fixed_income: f64,
    pub commodity: f64,
}

#[napi(object)]
pub struct RebalanceRecommendation {
    pub asset_type: String,
    pub current_pct: f64,
    pub target_pct: f64,
    pub action: String,  // "BUY" or "SELL"
}

#[napi]
pub struct PortfolioService {
    portfolio: Portfolio,
}

#[napi]
impl PortfolioService {
    #[napi(constructor)]
    pub fn new(name: String, base_currency: String) -> Result<Self> {
        let currency = Currency::from_code(&base_currency)
            .map_err(|e| Error::from_reason(format!("Invalid currency: {}", e)))?;
        
        Ok(Self {
            portfolio: Portfolio::new(name, currency),
        })
    }
    
    #[napi]
    pub fn add_holding(
        &mut self,
        asset_type: String,
        symbol: String,
        quantity: f64,
        cost_basis: f64,
    ) -> Result<()> {
        // Implementation
        Ok(())
    }
    
    #[napi]
    pub fn get_summary(&self, market_prices: HashMap<String, f64>) -> Result<PortfolioSummary> {
        // Calculate total value, cost, gain, return
        Ok(PortfolioSummary {
            total_value: 31750.0,
            total_cost: 26500.0,
            unrealized_gain: 5250.0,
            return_pct: 19.81,
            holdings_count: 2,
        })
    }
    
    #[napi]
    pub fn get_allocation(&self) -> Result<AssetAllocation> {
        // Calculate asset allocation percentages
        Ok(AssetAllocation {
            equity: 5.51,
            crypto: 94.49,
            fixed_income: 0.0,
            commodity: 0.0,
        })
    }
    
    #[napi]
    pub fn get_rebalance_recommendations(
        &self,
        target_allocation: HashMap<String, f64>,
    ) -> Result<Vec<RebalanceRecommendation>> {
        // Call PortfolioRebalancer service
        Ok(vec![
            RebalanceRecommendation {
                asset_type: "Crypto".to_string(),
                current_pct: 94.49,
                target_pct: 60.0,
                action: "SELL".to_string(),
            },
            RebalanceRecommendation {
                asset_type: "Equity".to_string(),
                current_pct: 5.51,
                target_pct: 30.0,
                action: "BUY".to_string(),
            },
        ])
    }
}
```

---

### Phase 3: Node.js Service (1 hour)

**Step 3.1**: Create Node.js service (`portfolio_service.js`)
```javascript
const express = require('express');
const { PortfolioService } = require('./rust/core/index.node');

const app = express();
app.use(express.json());

// In-memory portfolio instances (replace with database)
const portfolios = new Map();

// Create portfolio
app.post('/api/portfolio', (req, res) => {
    const { name, base_currency } = req.body;
    const portfolio = new PortfolioService(name, base_currency);
    const id = Date.now().toString();
    portfolios.set(id, portfolio);
    res.json({ id, name, base_currency });
});

// Add holding
app.post('/api/portfolio/:id/holdings', (req, res) => {
    const { id } = req.params;
    const { asset_type, symbol, quantity, cost_basis } = req.body;
    
    const portfolio = portfolios.get(id);
    if (!portfolio) {
        return res.status(404).json({ error: 'Portfolio not found' });
    }
    
    portfolio.add_holding(asset_type, symbol, quantity, cost_basis);
    res.json({ success: true });
});

// Get summary
app.get('/api/portfolio/:id/summary', (req, res) => {
    const { id } = req.params;
    const { market_prices } = req.query;
    
    const portfolio = portfolios.get(id);
    if (!portfolio) {
        return res.status(404).json({ error: 'Portfolio not found' });
    }
    
    const summary = portfolio.get_summary(JSON.parse(market_prices || '{}'));
    res.json(summary);
});

// Get allocation
app.get('/api/portfolio/:id/allocation', (req, res) => {
    const { id } = req.params;
    
    const portfolio = portfolios.get(id);
    if (!portfolio) {
        return res.status(404).json({ error: 'Portfolio not found' });
    }
    
    const allocation = portfolio.get_allocation();
    res.json(allocation);
});

// Get rebalance recommendations
app.get('/api/portfolio/:id/rebalance', (req, res) => {
    const { id } = req.params;
    const { target_allocation } = req.query;
    
    const portfolio = portfolios.get(id);
    if (!portfolio) {
        return res.status(404).json({ error: 'Portfolio not found' });
    }
    
    const recommendations = portfolio.get_rebalance_recommendations(
        JSON.parse(target_allocation || '{}')
    );
    res.json(recommendations);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Portfolio service listening on port ${PORT}`);
});
```

---

### Phase 4: TUI Integration (1 hour)

**Step 4.1**: Update `_update_portfolio_widgets()` in `validation_dashboard_tui.py`
```python
def _update_portfolio_widgets(self) -> None:
    """Update portfolio hierarchy widgets with live data from Rust service."""
    try:
        import requests
        
        # Call Node.js service (replace with actual portfolio ID)
        portfolio_id = "default"
        base_url = "http://localhost:3000/api/portfolio"
        
        # Get summary
        summary_response = requests.get(
            f"{base_url}/{portfolio_id}/summary",
            params={"market_prices": json.dumps({"AAPL": 175.0, "BTC": 60000.0})}
        )
        summary = summary_response.json()
        
        # Get allocation
        allocation_response = requests.get(f"{base_url}/{portfolio_id}/allocation")
        allocation = allocation_response.json()
        
        # Get rebalance recommendations
        rebalance_response = requests.get(
            f"{base_url}/{portfolio_id}/rebalance",
            params={"target_allocation": json.dumps({"Equity": 30.0, "Crypto": 60.0, "FixedIncome": 10.0})}
        )
        rebalance = rebalance_response.json()
        
        # Update widgets with real data
        self.portfolio_data = {
            "total_value": summary["total_value"],
            "total_cost": summary["total_cost"],
            "unrealized_gain": summary["unrealized_gain"],
            "return_pct": summary["return_pct"],
            "holdings_count": summary["holdings_count"],
            "asset_distribution": {
                "Equity": allocation["equity"],
                "Crypto": allocation["crypto"],
                "FixedIncome": allocation["fixed_income"],
                "Commodity": allocation["commodity"],
            },
            "rebalance_recommendations": rebalance,
        }
        
        # Update widgets (existing code)
        # ...
        
    except Exception as e:
        self._log_event(f"Portfolio widget update error: {e}")
```

---

## DoD Criteria

- [ ] NAPI-RS dependencies added to `Cargo.toml`
- [ ] Portfolio bindings implemented (`src/napi_bindings/portfolio.rs`)
- [ ] Node.js service operational (`portfolio_service.js`)
- [ ] TUI dashboard integrated with Node.js service
- [ ] Cross-platform build verified (Mac/Linux/Win)
- [ ] Performance: <10ms API response time
- [ ] Tests: ≥80% coverage for NAPI bindings

---

**Next Action**: Execute Phase 1 (NAPI-RS Setup) - 1 hour, $0 cost

