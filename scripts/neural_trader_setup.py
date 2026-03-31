#!/usr/bin/env python3
"""
Neural Trader Integration Setup
Scaffolds the environment for Neural Trader:
- Data Pipelines (Market Data, Sentiment)
- Backtesting Framework (Backtrader/Zipline)
- Risk Calculator (APRA - Agentic Prediction Risk Analytics)
"""
import os
import sys
import json
from datetime import datetime

def setup_directories():
    """Create necessary directories"""
    dirs = [
        "data/market",
        "data/sentiment",
        "models/checkpoints",
        "results/backtests",
        "config/strategies"
    ]

    base_dir = "neural_trader"
    if not os.path.exists(base_dir):
        os.makedirs(base_dir)
        print(f"Created base directory: {base_dir}")

    for d in dirs:
        path = os.path.join(base_dir, d)
        if not os.path.exists(path):
            os.makedirs(path)
            print(f"Created directory: {path}")

def create_config_template():
    """Create configuration template"""
    config = {
        "data_sources": {
            "market_data": "alpaca",
            "sentiment_data": "twitter/discord"
        },
        "backtesting": {
            "framework": "backtrader",
            "initial_cash": 100000,
            "commission": 0.001
        },
        "risk_management": {
            "max_drawdown": 0.15,
            "max_leverage": 1.0,
            "stop_loss_pct": 0.02
        },
        "apra": {
            "enabled": True,
            "confidence_threshold": 0.75,
            "model_path": "models/checkpoints/apra_v1.pt"
        }
    }

    path = "neural_trader/config/config.json"
    if not os.path.exists(os.path.dirname(path)):
        os.makedirs(os.path.dirname(path))

    with open(path, 'w') as f:
        json.dump(config, f, indent=2)
    print(f"Created config template: {path}")

def main():
    print("Setting up Neural Trader environment...")
    setup_directories()
    create_config_template()

    print("\nSetup complete. Next steps:")
    print("1. Configure API keys in .env")
    print("2. Implement data ingestors in neural_trader/data/")
    print("3. Develop strategies in neural_trader/config/strategies/")

if __name__ == "__main__":
    main()
