#!/usr/bin/env python3
"""
ML Setup Predictor Training (ML-1)

Train ML model to identify high-probability trading setups.
Features: technical indicators, volume, sector performance.
Model: RandomForest/XGBoost for binary classification.

Usage:
    python3 scripts/ml/train_setup_predictor.py --lookback 90 --min-samples 100
    python3 scripts/ml/train_setup_predictor.py --model xgboost --output models/setup_v2.pkl
"""

import argparse
import json
import os
import pickle
import sys
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError

import numpy as np

# Optional ML imports
try:
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.model_selection import train_test_split, cross_val_score
    from sklearn.metrics import classification_report, precision_score, recall_score
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    print("⚠️  scikit-learn not installed. Install with: pip3 install scikit-learn")

try:
    import xgboost as xgb
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False


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
MODEL_DIR.mkdir(exist_ok=True)


@dataclass
class SetupFeatures:
    """Features for setup prediction."""
    ticker: str
    date: str
    rsi_14: float
    macd: float
    macd_signal: float
    sma_20: float
    sma_50: float
    volume_ratio: float  # vs 20-day avg
    price_sma20_ratio: float
    atr_14: float
    sector_momentum: float
    label: int = 0  # 1 = profitable setup, 0 = not


class FeatureExtractor:
    """Extract ML features from price data."""

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

    def get_historical_data(self, ticker: str, days: int = 120) -> List[Dict]:
        end = datetime.now().strftime("%Y-%m-%d")
        start = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
        data = self._api_call(f"/v2/aggs/ticker/{ticker}/range/1/day/{start}/{end}")
        if data and data.get("results"):
            return data["results"]
        return []

    def calculate_rsi(self, closes: List[float], period: int = 14) -> float:
        if len(closes) < period + 1:
            return 50.0
        deltas = [closes[i] - closes[i-1] for i in range(1, len(closes))]
        gains = [d if d > 0 else 0 for d in deltas[-period:]]
        losses = [-d if d < 0 else 0 for d in deltas[-period:]]
        avg_gain = sum(gains) / period
        avg_loss = sum(losses) / period
        if avg_loss == 0:
            return 100.0
        return 100 - (100 / (1 + avg_gain / avg_loss))

    def calculate_macd(self, closes: List[float]) -> Tuple[float, float]:
        if len(closes) < 26:
            return 0.0, 0.0
        ema12 = self._ema(closes, 12)
        ema26 = self._ema(closes, 26)
        macd = ema12 - ema26
        signal = self._ema(closes[-9:] if len(closes) >= 9 else closes, 9)
        return macd, signal

    def _ema(self, data: List[float], period: int) -> float:
        if not data:
            return 0.0
        mult = 2 / (period + 1)
        ema = data[0]
        for price in data[1:]:
            ema = (price - ema) * mult + ema
        return ema

    def calculate_atr(self, bars: List[Dict], period: int = 14) -> float:
        if len(bars) < period + 1:
            return 0.0
        trs = []
        for i in range(1, len(bars)):
            h, l, pc = bars[i]["h"], bars[i]["l"], bars[i-1]["c"]
            tr = max(h - l, abs(h - pc), abs(l - pc))
            trs.append(tr)
        return sum(trs[-period:]) / period

    def extract_features(self, ticker: str, bars: List[Dict], idx: int) -> Optional[SetupFeatures]:
        """Extract features for a specific bar index."""
        if idx < 50 or idx >= len(bars) - 5:  # Need history and forward returns
            return None
        closes = [b["c"] for b in bars[:idx+1]]
        volumes = [b["v"] for b in bars[:idx+1]]
        rsi = self.calculate_rsi(closes)
        macd, signal = self.calculate_macd(closes)
        sma20 = sum(closes[-20:]) / 20
        sma50 = sum(closes[-50:]) / 50
        vol_avg = sum(volumes[-20:]) / 20
        vol_ratio = volumes[-1] / vol_avg if vol_avg > 0 else 1.0
        atr = self.calculate_atr(bars[:idx+1])
        # Forward return for label (5-day return > 2%)
        fwd_ret = (bars[idx+5]["c"] - bars[idx]["c"]) / bars[idx]["c"]
        label = 1 if fwd_ret > 0.02 else 0
        return SetupFeatures(
            ticker=ticker, date=datetime.fromtimestamp(bars[idx]["t"]/1000).strftime("%Y-%m-%d"),
            rsi_14=rsi, macd=macd, macd_signal=signal,
            sma_20=sma20, sma_50=sma50, volume_ratio=vol_ratio,
            price_sma20_ratio=closes[-1]/sma20 if sma20 > 0 else 1.0,
            atr_14=atr, sector_momentum=0.0, label=label
        )


class SetupPredictor:
    """Train and predict trading setups."""

    def __init__(self, model_type: str = "rf"):
        self.model_type = model_type
        self.model = None
        self.extractor = FeatureExtractor()
        self.feature_names = ["rsi_14", "macd", "macd_signal", "sma_20", "sma_50",
                              "volume_ratio", "price_sma20_ratio", "atr_14", "sector_momentum"]

    def generate_training_data(self, tickers: List[str], lookback: int = 90) -> Tuple[np.ndarray, np.ndarray]:
        """Generate training data from historical prices."""
        X, y = [], []
        for ticker in tickers:
            print(f"  Extracting features for {ticker}...")
            bars = self.extractor.get_historical_data(ticker, lookback + 60)
            if len(bars) < 60:
                continue
            for i in range(50, len(bars) - 5):
                feat = self.extractor.extract_features(ticker, bars, i)
                if feat:
                    X.append([feat.rsi_14, feat.macd, feat.macd_signal, feat.sma_20,
                              feat.sma_50, feat.volume_ratio, feat.price_sma20_ratio,
                              feat.atr_14, feat.sector_momentum])
                    y.append(feat.label)
        return np.array(X), np.array(y)

    def train(self, X: np.ndarray, y: np.ndarray) -> Dict:
        """Train the model."""
        if len(X) < 50:
            raise ValueError(f"Insufficient samples: {len(X)} (need >= 50)")
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        if self.model_type == "xgboost" and XGBOOST_AVAILABLE:
            self.model = xgb.XGBClassifier(n_estimators=100, max_depth=5, learning_rate=0.1)
        else:
            self.model = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
        self.model.fit(X_train, y_train)
        y_pred = self.model.predict(X_test)
        precision = precision_score(y_test, y_pred, zero_division=0)
        recall = recall_score(y_test, y_pred, zero_division=0)
        cv_scores = cross_val_score(self.model, X, y, cv=5)
        return {
            "samples": len(X), "precision": precision, "recall": recall,
            "cv_mean": cv_scores.mean(), "cv_std": cv_scores.std(),
            "feature_importance": dict(zip(self.feature_names,
                                           self.model.feature_importances_.tolist()))
        }

    def save(self, path: str = None):
        if path is None:
            version = datetime.now().strftime("%Y%m%d")
            path = MODEL_DIR / f"setup_predictor_v{version}.pkl"
        with open(path, "wb") as f:
            pickle.dump({"model": self.model, "features": self.feature_names,
                         "model_type": self.model_type}, f)
        print(f"✅ Model saved to {path}")

    def load(self, path: str):
        with open(path, "rb") as f:
            data = pickle.load(f)
            self.model = data["model"]
            self.feature_names = data["features"]
            self.model_type = data.get("model_type", "rf")

    def predict(self, features: List[float]) -> Tuple[int, float]:
        """Predict setup validity. Returns (prediction, probability)."""
        if self.model is None:
            raise ValueError("Model not loaded")
        X = np.array([features])
        pred = self.model.predict(X)[0]
        prob = self.model.predict_proba(X)[0][1]
        return int(pred), float(prob)


DEFAULT_TICKERS = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "AMD", "META"]


def main():
    parser = argparse.ArgumentParser(description="ML Setup Predictor Training (ML-1)")
    parser.add_argument("--lookback", type=int, default=90, help="Days of history")
    parser.add_argument("--min-samples", type=int, default=50, help="Minimum samples")
    parser.add_argument("--model", choices=["rf", "xgboost"], default="rf")
    parser.add_argument("--output", help="Output model path")
    parser.add_argument("--tickers", help="Comma-separated tickers")
    args = parser.parse_args()

    if not SKLEARN_AVAILABLE:
        print("❌ scikit-learn required. Install: pip3 install scikit-learn")
        sys.exit(1)

    tickers = args.tickers.split(",") if args.tickers else DEFAULT_TICKERS
    predictor = SetupPredictor(model_type=args.model)

    print(f"\n🔬 ML SETUP PREDICTOR TRAINING")
    print(f"  Model: {args.model.upper()}")
    print(f"  Lookback: {args.lookback} days")
    print(f"  Tickers: {', '.join(tickers)}")
    print(f"\n📊 Generating training data...")

    X, y = predictor.generate_training_data(tickers, args.lookback)
    print(f"  Samples: {len(X)} | Positive: {sum(y)} ({sum(y)/len(y)*100:.1f}%)")

    if len(X) < args.min_samples:
        print(f"❌ Insufficient samples ({len(X)} < {args.min_samples})")
        sys.exit(1)

    print(f"\n🎯 Training model...")
    metrics = predictor.train(X, y)
    print(f"  Precision: {metrics['precision']:.2%}")
    print(f"  Recall: {metrics['recall']:.2%}")
    print(f"  CV Score: {metrics['cv_mean']:.2%} ± {metrics['cv_std']:.2%}")
    print(f"\n📈 Feature Importance:")
    for feat, imp in sorted(metrics["feature_importance"].items(), key=lambda x: -x[1]):
        print(f"    {feat:<20} {imp:.3f}")

    if args.output:
        predictor.save(args.output)
    else:
        predictor.save()


if __name__ == "__main__":
    main()

