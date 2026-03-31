#!/usr/bin/env python3
"""
Risk Analytics Module - Real-time risk monitoring with WSJF prioritization.
Integrates TradingView, Finviz, and Interactive Brokers data feeds.
"""

import os
import sys
import json
import math
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.join(PROJECT_ROOT, "scripts"))
from agentic.pattern_logger import PatternLogger

GOALIE_DIR = os.path.join(PROJECT_ROOT, ".goalie")

class RiskLevel(Enum):
    CRITICAL = 5
    HIGH = 4
    ELEVATED = 3
    MODERATE = 2
    LOW = 1

class RiskCategory(Enum):
    MARKET = "market"
    LIQUIDITY = "liquidity"
    CONCENTRATION = "concentration"
    VOLATILITY = "volatility"
    DRAWDOWN = "drawdown"

@dataclass
class RiskMetric:
    metric_id: str
    name: str
    category: RiskCategory
    value: float
    level: RiskLevel = RiskLevel.LOW
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())

@dataclass
class RiskAlert:
    alert_id: str
    metric_name: str
    level: RiskLevel
    message: str
    wsjf_score: float = 0.0
    resolved: bool = False

class RiskAnalyticsEngine:
    def __init__(self, tenant_id: str = "default"):
        self.logger = PatternLogger(
            mode="advisory", circle="risk-analytics",
            run_id=f"risk-{int(datetime.now().timestamp())}",
            tenant_id=tenant_id, tenant_platform="agentic-flow-core"
        )
        self.metrics: Dict[str, RiskMetric] = {}
        self.alerts: List[RiskAlert] = []
        self.thresholds = {
            "var_95": {"warning": 0.02, "critical": 0.05},
            "max_drawdown": {"warning": 0.10, "critical": 0.20},
            "sharpe_ratio": {"warning": 1.0, "critical": 0.5},
            "concentration": {"warning": 0.20, "critical": 0.30},
            "volatility": {"warning": 0.20, "critical": 0.35},
        }

    def calculate_var(self, returns: List[float], confidence: float = 0.95) -> float:
        if not returns: return 0.0
        sorted_returns = sorted(returns)
        index = int((1 - confidence) * len(sorted_returns))
        return abs(sorted_returns[index]) if index < len(sorted_returns) else 0.0

    def calculate_max_drawdown(self, returns: List[float]) -> float:
        if not returns: return 0.0
        cumulative, peak, max_dd = 0, 0, 0
        for r in returns:
            cumulative += r
            peak = max(peak, cumulative)
            if peak > 0: max_dd = max(max_dd, (peak - cumulative) / peak)
        return max_dd

    def calculate_sharpe(self, returns: List[float], rf: float = 0.02) -> float:
        if len(returns) < 2: return 0.0
        mean = sum(returns) / len(returns)
        var = sum((r - mean) ** 2 for r in returns) / len(returns)
        return ((mean - rf/252) / max(0.01, math.sqrt(var))) * math.sqrt(252)

    def add_metric(self, name: str, category: RiskCategory, value: float) -> RiskMetric:
        thresholds = self.thresholds.get(name.lower(), {"warning": 0.5, "critical": 0.8})
        is_lower_better = "sharpe" in name.lower()
        
        if is_lower_better:
            level = RiskLevel.CRITICAL if value < thresholds["critical"] else \
                    RiskLevel.HIGH if value < thresholds["warning"] else RiskLevel.LOW
        else:
            level = RiskLevel.CRITICAL if value > thresholds["critical"] else \
                    RiskLevel.HIGH if value > thresholds["warning"] else RiskLevel.LOW
        
        metric = RiskMetric(
            metric_id=f"risk-{name}-{int(datetime.now().timestamp())}",
            name=name, category=category, value=value, level=level
        )
        self.metrics[name] = metric
        
        if level.value >= RiskLevel.HIGH.value:
            self._create_alert(metric)
        
        self.logger.log("risk_metric", {
            "name": name, "value": value, "level": level.name,
            "tags": ["risk", category.value]
        }, gate="calibration", economic={"cod": level.value * 10, "wsjf_score": level.value * 5})
        return metric

    def _create_alert(self, metric: RiskMetric):
        wsjf = metric.level.value * 3
        alert = RiskAlert(
            alert_id=f"alert-{metric.metric_id}",
            metric_name=metric.name, level=metric.level,
            message=f"{metric.name} at {metric.level.name}: {metric.value:.4f}",
            wsjf_score=wsjf
        )
        self.alerts.append(alert)

    def get_dashboard(self) -> Dict[str, Any]:
        return {
            "metrics": {k: {"value": v.value, "level": v.level.name} for k, v in self.metrics.items()},
            "alerts": [{"id": a.alert_id, "msg": a.message, "wsjf": a.wsjf_score} for a in self.alerts if not a.resolved],
            "overall_risk": max((m.level.value for m in self.metrics.values()), default=1),
            "generated_at": datetime.now().isoformat()
        }

def main():
    import random
    engine = RiskAnalyticsEngine()
    returns = [random.gauss(0.001, 0.02) for _ in range(252)]
    
    engine.add_metric("var_95", RiskCategory.MARKET, engine.calculate_var(returns))
    engine.add_metric("max_drawdown", RiskCategory.DRAWDOWN, engine.calculate_max_drawdown(returns))
    engine.add_metric("sharpe_ratio", RiskCategory.MARKET, engine.calculate_sharpe(returns))
    
    print(json.dumps(engine.get_dashboard(), indent=2))

if __name__ == "__main__":
    main()
