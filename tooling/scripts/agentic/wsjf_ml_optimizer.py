"""
WSJF ML Weight Optimizer
========================
Online SGD-based weight optimizer that learns from historical WSJF outcomes
to auto-tune BV/TC/RROE coefficients (w1, w2, w3).

Training signal: items that completed successfully (high outcome) with given
weights should score higher than items that were deferred or failed.

Persists learned weights to .goalie/wsjf-ml-weights.json.

Usage:
    python wsjf_ml_optimizer.py --tenant-id t1 --fit training.json
    python wsjf_ml_optimizer.py --tenant-id t1 --predict
"""

from __future__ import annotations

import argparse
import json
import math
import os
import sys
from dataclasses import asdict, dataclass
from typing import List, Optional


# ─────────────────────────────────────────────────────────────────────────────
# Data models
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class TrainingExample:
    """One completed WSJF item with its actual outcome."""
    userBusinessValue: float
    timeCriticality:   float
    riskReduction:     float
    jobSize:           float
    actualOutcome:     float   # 0-1 (1 = fully successful, 0 = failed/deferred)


@dataclass
class WeightModel:
    w1: float = 1.0
    w2: float = 1.0
    w3: float = 1.0
    confidence: float = 0.0
    trainingExamples: int = 0
    lastTrainedAt: str = ""
    modelVersion: str = "1.0.0"


# ─────────────────────────────────────────────────────────────────────────────
# Optimizer
# ─────────────────────────────────────────────────────────────────────────────

class WSJFMLOptimizer:
    """
    Gradient descent optimizer for WSJF weight coefficients.

    Objective: maximize correlation between WSJF score and actual outcome.
    Loss:      MSE between predicted outcome (sigmoid of WSJF) and actual outcome.
    """

    LEARNING_RATE   = 0.01
    MIN_WEIGHT      = 0.1
    MAX_WEIGHT      = 3.0
    EPOCHS          = 50
    WEIGHT_FILE_ENV = "WSJF_ML_WEIGHTS_PATH"
    DEFAULT_PATH    = os.path.join(".goalie", "wsjf-ml-weights.json")

    def __init__(self, tenant_id: str, weights_path: Optional[str] = None) -> None:
        self.tenant_id    = tenant_id
        self.weights_path = weights_path or os.environ.get(
            self.WEIGHT_FILE_ENV, self.DEFAULT_PATH
        )
        self.model        = self._load_model()

    # ── Public API ────────────────────────────────────────────────────────────

    def fit(self, examples: List[TrainingExample]) -> WeightModel:
        """Train weights on examples using SGD."""
        if not examples:
            return self.model

        w1, w2, w3 = self.model.w1, self.model.w2, self.model.w3

        for _ in range(self.EPOCHS):
            for ex in examples:
                cod   = w1 * ex.userBusinessValue + w2 * ex.timeCriticality + w3 * ex.riskReduction
                score = cod / max(ex.jobSize, 0.1)
                pred  = self._sigmoid(score)
                error = pred - ex.actualOutcome

                grad_common = error * pred * (1 - pred) / max(ex.jobSize, 0.1)
                w1 -= self.LEARNING_RATE * grad_common * ex.userBusinessValue
                w2 -= self.LEARNING_RATE * grad_common * ex.timeCriticality
                w3 -= self.LEARNING_RATE * grad_common * ex.riskReduction

                w1 = self._clip(w1)
                w2 = self._clip(w2)
                w3 = self._clip(w3)

        self.model.w1 = round(w1, 6)
        self.model.w2 = round(w2, 6)
        self.model.w3 = round(w3, 6)
        self.model.trainingExamples += len(examples)
        self.model.confidence        = self._compute_confidence(examples, w1, w2, w3)
        self.model.lastTrainedAt     = self._iso_now()

        self._save_model()
        return self.model

    def predict_weights(self) -> WeightModel:
        """Return current learned weights with confidence."""
        return self.model

    def save_model(self) -> None:
        self._save_model()

    # ── Private helpers ───────────────────────────────────────────────────────

    def _sigmoid(self, x: float) -> float:
        return 1.0 / (1.0 + math.exp(-x / 10.0))   # scale by 10 to normalize WSJF range

    def _clip(self, w: float) -> float:
        return max(self.MIN_WEIGHT, min(self.MAX_WEIGHT, w))

    def _compute_confidence(
        self,
        examples: List[TrainingExample],
        w1: float, w2: float, w3: float,
    ) -> float:
        """R² correlation between predicted and actual outcomes (0-1)."""
        if len(examples) < 2:
            return 0.0
        actuals   = [e.actualOutcome for e in examples]
        predicted = [
            self._sigmoid(
                (w1 * e.userBusinessValue + w2 * e.timeCriticality + w3 * e.riskReduction)
                / max(e.jobSize, 0.1)
            )
            for e in examples
        ]
        mean_a  = sum(actuals) / len(actuals)
        ss_tot  = sum((a - mean_a) ** 2 for a in actuals)
        ss_res  = sum((a - p) ** 2 for a, p in zip(actuals, predicted))
        r2      = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0.0
        return round(max(0.0, min(1.0, r2)), 4)

    def _load_model(self) -> WeightModel:
        """Load persisted weights from disk, keyed by tenant."""
        if not os.path.exists(self.weights_path):
            return WeightModel()
        try:
            with open(self.weights_path, "r", encoding="utf-8") as fh:
                data = json.load(fh)
            tenant_data = data.get(self.tenant_id, {})
            return WeightModel(
                w1=float(tenant_data.get("w1", 1.0)),
                w2=float(tenant_data.get("w2", 1.0)),
                w3=float(tenant_data.get("w3", 1.0)),
                confidence=float(tenant_data.get("confidence", 0.0)),
                trainingExamples=int(tenant_data.get("trainingExamples", 0)),
                lastTrainedAt=tenant_data.get("lastTrainedAt", ""),
                modelVersion=tenant_data.get("modelVersion", "1.0.0"),
            )
        except (json.JSONDecodeError, KeyError, TypeError):
            return WeightModel()

    def _save_model(self) -> None:
        """Persist weights to disk, merging with other tenants."""
        os.makedirs(os.path.dirname(os.path.abspath(self.weights_path)), exist_ok=True)

        existing: dict = {}
        if os.path.exists(self.weights_path):
            try:
                with open(self.weights_path, "r", encoding="utf-8") as fh:
                    existing = json.load(fh)
            except (json.JSONDecodeError, OSError):
                existing = {}

        existing[self.tenant_id] = asdict(self.model)

        with open(self.weights_path, "w", encoding="utf-8") as fh:
            json.dump(existing, fh, indent=2)

    @staticmethod
    def _iso_now() -> str:
        from datetime import datetime, timezone
        return datetime.now(timezone.utc).isoformat()


# ─────────────────────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────────────────────

def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="WSJF ML Weight Optimizer")
    p.add_argument("--tenant-id", required=True)
    p.add_argument("--fit",     default=None, help="Path to training JSON (array of TrainingExample)")
    p.add_argument("--predict", action="store_true", help="Output current weights as JSON")
    p.add_argument("--weights-path", default=None, help="Override weights file path")
    return p.parse_args()


def main() -> None:
    args      = _parse_args()
    optimizer = WSJFMLOptimizer(args.tenant_id, args.weights_path)

    if args.fit:
        with open(args.fit, "r", encoding="utf-8") as fh:
            raw = json.load(fh)
        examples = [
            TrainingExample(
                userBusinessValue=float(e["userBusinessValue"]),
                timeCriticality=float(e["timeCriticality"]),
                riskReduction=float(e["riskReduction"]),
                jobSize=float(e["jobSize"]),
                actualOutcome=float(e["actualOutcome"]),
            )
            for e in raw
        ]
        model = optimizer.fit(examples)
        print(json.dumps(asdict(model), indent=2))
    elif args.predict:
        print(json.dumps(asdict(optimizer.predict_weights()), indent=2))
    else:
        print("Specify --fit <file> or --predict", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
