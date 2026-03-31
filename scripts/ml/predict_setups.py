#!/usr/bin/env python3
"""
ML Setup Predictor Inference (ML-1)

Use trained ML model to predict trading setup validity.

Usage:
    python3 scripts/ml/predict_setups.py --ticker MSFT
    python3 scripts/ml/predict_setups.py --ticker AAPL,TSLA,NVDA --threshold 0.7
    python3 scripts/ml/predict_setups.py --model models/setup_predictor_v20251201.pkl
"""

import argparse
import json
import os
import pickle
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError

import numpy as np


def load_env():
    env_path = Path(__file__).parent.parent.parent / "config" / ".env.production"
    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    if "#" in value:
                        value = value.split("#")[0]
                    os.environ.setdefault(key.strip(), value.strip())


load_env()

POLYGON_API_KEY = os.getenv("DATA_MARKET_API_KEY", "")
MODEL_DIR = Path(__file__).parent.parent.parent / "models"


class FeatureExtractor:
    """Extract features for prediction."""

    def __init__(self, api_key: str = POLYGON_API_KEY):
        self.api_key = api_key
        self.base_url = "https://api.polygon.io"

    def _api_call(self, endpoint: str) -> Optional[Dict]:
        url = f"{self.base_url}{endpoint}"
        url += f"&apiKey={self.api_key}" if "?" in url else f"?apiKey={self.api_key}"
        try:
            req = Request(url, headers={"User-Agent": "MLPredictor/1.0"})
            with urlopen(req, timeout=15) as resp:
                return json.loads(resp.read().decode())
        except (URLError, HTTPError):
            return None

    def get_features(self, ticker: str) -> Optional[List[float]]:
        """Extract current features for a ticker."""
        end = datetime.now().strftime("%Y-%m-%d")
        start = (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d")
        data = self._api_call(f"/v2/aggs/ticker/{ticker}/range/1/day/{start}/{end}")
        if not data or not data.get("results") or len(data["results"]) < 50:
            return None
        bars = data["results"]
        closes = [b["c"] for b in bars]
        volumes = [b["v"] for b in bars]
        # RSI
        deltas = [closes[i] - closes[i-1] for i in range(1, len(closes))]
        gains = [d if d > 0 else 0 for d in deltas[-14:]]
        losses = [-d if d < 0 else 0 for d in deltas[-14:]]
        avg_gain, avg_loss = sum(gains)/14, sum(losses)/14
        rsi = 100 - (100 / (1 + avg_gain/avg_loss)) if avg_loss > 0 else 100
        # MACD
        def ema(data, period):
            mult = 2 / (period + 1)
            e = data[0]
            for p in data[1:]:
                e = (p - e) * mult + e
            return e
        ema12, ema26 = ema(closes, 12), ema(closes, 26)
        macd = ema12 - ema26
        signal = ema(closes[-9:], 9)
        # SMAs
        sma20 = sum(closes[-20:]) / 20
        sma50 = sum(closes[-50:]) / 50
        # Volume ratio
        vol_avg = sum(volumes[-20:]) / 20
        vol_ratio = volumes[-1] / vol_avg if vol_avg > 0 else 1.0
        # ATR
        trs = []
        for i in range(1, len(bars)):
            h, l, pc = bars[i]["h"], bars[i]["l"], bars[i-1]["c"]
            trs.append(max(h - l, abs(h - pc), abs(l - pc)))
        atr = sum(trs[-14:]) / 14
        return [rsi, macd, signal, sma20, sma50, vol_ratio, closes[-1]/sma20, atr, 0.0]


class SetupPredictor:
    """Load and run setup predictions."""

    def __init__(self, model_path: str = None):
        self.model = None
        self.feature_names = []
        self.extractor = FeatureExtractor()
        if model_path:
            self.load(model_path)
        else:
            self._load_latest()

    def _load_latest(self):
        models = sorted(MODEL_DIR.glob("setup_predictor_*.pkl"), reverse=True)
        if models:
            self.load(str(models[0]))
        else:
            print("⚠️  No model found. Train first with train_setup_predictor.py")

    def load(self, path: str):
        with open(path, "rb") as f:
            data = pickle.load(f)
            self.model = data["model"]
            self.feature_names = data["features"]
        print(f"📦 Loaded model: {path}")

    def predict(self, ticker: str) -> Optional[Dict]:
        """Predict setup for ticker."""
        if self.model is None:
            return None
        features = self.extractor.get_features(ticker)
        if features is None:
            return {"ticker": ticker, "error": "Insufficient data"}
        X = np.array([features])
        pred = self.model.predict(X)[0]
        prob = self.model.predict_proba(X)[0][1]
        return {
            "ticker": ticker,
            "prediction": "VALID" if pred == 1 else "INVALID",
            "probability": round(prob * 100, 1),
            "features": dict(zip(self.feature_names, [round(f, 2) for f in features]))
        }


def main():
    parser = argparse.ArgumentParser(description="ML Setup Predictor (ML-1)")
    parser.add_argument("--ticker", required=True, help="Ticker(s) to predict")
    parser.add_argument("--model", help="Model path")
    parser.add_argument("--threshold", type=float, default=0.6, help="Probability threshold")
    parser.add_argument("--json", action="store_true", help="JSON output")
    args = parser.parse_args()

    tickers = [t.strip().upper() for t in args.ticker.split(",")]
    predictor = SetupPredictor(args.model)

    if predictor.model is None:
        print("❌ No model available")
        sys.exit(1)

    results = []
    for ticker in tickers:
        result = predictor.predict(ticker)
        if result:
            results.append(result)

    if args.json:
        print(json.dumps(results, indent=2))
    else:
        print(f"\n{'TICKER':<8} {'PREDICTION':<12} {'PROB':>8}")
        print("-" * 32)
        for r in results:
            if "error" in r:
                print(f"{r['ticker']:<8} {'ERROR':<12} {'-':>8}")
            else:
                emoji = "✅" if r["probability"] >= args.threshold * 100 else "❌"
                print(f"{r['ticker']:<8} {r['prediction']:<12} {r['probability']:>6.1f}% {emoji}")


if __name__ == "__main__":
    main()

