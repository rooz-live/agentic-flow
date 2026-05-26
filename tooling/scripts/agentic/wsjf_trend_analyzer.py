"""
WSJF Trend Analyzer
===================
Time-series CoD trend engine with velocity baselines and anomaly detection.

Input (stdin or --input): JSON array of TrendDataPoint objects
Output (stdout): JSON TrendAnalysis object

Usage:
    python wsjf_trend_analyzer.py --team-id team-1 --tenant-id t1 \
        --input data.json
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from dataclasses import asdict, dataclass, field
from typing import List, Optional


# ─────────────────────────────────────────────────────────────────────────────
# Data models
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class TrendDataPoint:
    date: str
    avgScore: float
    avgCod: float
    itemCount: int
    completedCount: int
    velocityPoints: float


@dataclass
class Anomaly:
    date: str
    score: float
    zScore: float


@dataclass
class TrendAnalysis:
    teamId: str
    tenantId: str
    periodFrom: str
    periodTo: str
    dataPoints: List[TrendDataPoint]
    slope: float
    velocityBaseline: float
    anomalies: List[Anomaly] = field(default_factory=list)


# ─────────────────────────────────────────────────────────────────────────────
# Core analyzer
# ─────────────────────────────────────────────────────────────────────────────

class WSJFTrendAnalyzer:
    """Compute linear regression slope, velocity baseline, and z-score anomalies."""

    ANOMALY_Z_THRESHOLD = 2.0

    def analyze(
        self,
        team_id: str,
        tenant_id: str,
        data_points: List[TrendDataPoint],
    ) -> TrendAnalysis:
        if not data_points:
            return TrendAnalysis(
                teamId=team_id,
                tenantId=tenant_id,
                periodFrom="",
                periodTo="",
                dataPoints=[],
                slope=0.0,
                velocityBaseline=0.0,
                anomalies=[],
            )

        sorted_points = sorted(data_points, key=lambda p: p.date)

        slope          = self._linear_slope([p.avgScore for p in sorted_points])
        velocity_base  = self._mean([p.velocityPoints for p in sorted_points])
        anomalies      = self._detect_anomalies(sorted_points)

        return TrendAnalysis(
            teamId=team_id,
            tenantId=tenant_id,
            periodFrom=sorted_points[0].date,
            periodTo=sorted_points[-1].date,
            dataPoints=sorted_points,
            slope=round(slope, 6),
            velocityBaseline=round(velocity_base, 4),
            anomalies=anomalies,
        )

    # ── Statistics ────────────────────────────────────────────────────────────

    def _linear_slope(self, values: List[float]) -> float:
        """OLS slope for (index, value) pairs."""
        n = len(values)
        if n < 2:
            return 0.0
        xs = list(range(n))
        x_mean = self._mean(xs)
        y_mean = self._mean(values)
        num   = sum((x - x_mean) * (y - y_mean) for x, y in zip(xs, values))
        denom = sum((x - x_mean) ** 2 for x in xs)
        return num / denom if denom != 0 else 0.0

    def _mean(self, values: List[float]) -> float:
        return sum(values) / len(values) if values else 0.0

    def _std(self, values: List[float]) -> float:
        if len(values) < 2:
            return 0.0
        m = self._mean(values)
        variance = sum((v - m) ** 2 for v in values) / len(values)
        return math.sqrt(variance)

    def _detect_anomalies(self, points: List[TrendDataPoint]) -> List[Anomaly]:
        scores = [p.avgScore for p in points]
        mu     = self._mean(scores)
        sigma  = self._std(scores)
        if sigma == 0:
            return []

        anomalies: List[Anomaly] = []
        for p in points:
            z = abs(p.avgScore - mu) / sigma
            if z >= self.ANOMALY_Z_THRESHOLD:
                anomalies.append(Anomaly(
                    date=p.date,
                    score=round(p.avgScore, 4),
                    zScore=round(z, 4),
                ))
        return anomalies


# ─────────────────────────────────────────────────────────────────────────────
# Serialization helpers
# ─────────────────────────────────────────────────────────────────────────────

def _to_dict(analysis: TrendAnalysis) -> dict:
    return {
        "teamId":           analysis.teamId,
        "tenantId":         analysis.tenantId,
        "period":           {"from": analysis.periodFrom, "to": analysis.periodTo},
        "dataPoints":       [asdict(p) for p in analysis.dataPoints],
        "slope":            analysis.slope,
        "velocityBaseline": analysis.velocityBaseline,
        "anomalies":        [asdict(a) for a in analysis.anomalies],
    }


# ─────────────────────────────────────────────────────────────────────────────
# CLI entry point
# ─────────────────────────────────────────────────────────────────────────────

def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="WSJF Trend Analyzer")
    p.add_argument("--team-id",   required=True, help="Team identifier")
    p.add_argument("--tenant-id", required=True, help="Tenant identifier")
    p.add_argument("--input",     default=None,  help="Path to JSON input file (default: stdin)")
    return p.parse_args()


def main() -> None:
    args = _parse_args()

    if args.input:
        with open(args.input, "r", encoding="utf-8") as fh:
            raw = json.load(fh)
    else:
        raw = json.load(sys.stdin)

    data_points = [
        TrendDataPoint(
            date=d["date"],
            avgScore=float(d.get("avgScore", 0)),
            avgCod=float(d.get("avgCod", 0)),
            itemCount=int(d.get("itemCount", 0)),
            completedCount=int(d.get("completedCount", 0)),
            velocityPoints=float(d.get("velocityPoints", 0)),
        )
        for d in raw
    ]

    analyzer = WSJFTrendAnalyzer()
    result   = analyzer.analyze(args.team_id, args.tenant_id, data_points)
    print(json.dumps(_to_dict(result), indent=2))


if __name__ == "__main__":
    main()
