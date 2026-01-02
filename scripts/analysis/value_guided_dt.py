#!/usr/bin/env python3
"""Value-Guided Decision Transformer Enhancement.

Integrates Value-Guided DT and Elastic DT patterns from research:
- Value-Guided DT: Conditions on value functions for better credit assignment
- Elastic DT: Adaptive context windows based on trajectory importance
- HarmoDT: Harmonized multi-objective reward shaping

Reference: awesome-decision-transformer (846 stars), NeurIPS 2021-2025
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

PROJECT_ROOT = Path(__file__).resolve().parents[2]
GOALIE_DIR = PROJECT_ROOT / ".goalie"


@dataclass
class ValueGuidedConfig:
    """Configuration for Value-Guided DT enhancements."""
    enable_value_conditioning: bool = True
    enable_elastic_context: bool = True
    enable_harmo_objectives: bool = True
    
    # Value function parameters
    value_discount: float = 0.99
    value_weight: float = 0.3
    
    # Elastic context parameters
    min_context_length: int = 5
    max_context_length: int = 40
    importance_threshold: float = 0.7
    
    # HarmoDT multi-objective weights (WSJF-aligned)
    objective_weights: Dict[str, float] = field(default_factory=lambda: {
        "cod_reduction": 0.35,  # Cost of Delay
        "wsjf_improvement": 0.25,  # WSJF score delta
        "risk_mitigation": 0.20,  # ROAM risk reduction
        "cycle_efficiency": 0.20,  # Duration optimization
    })


def compute_value_function(
    rewards: List[float],
    gamma: float = 0.99,
) -> List[float]:
    """Compute discounted value function (returns-to-go).
    
    V(t) = sum_{k=0}^{T-t} gamma^k * r_{t+k}
    """
    if not rewards:
        return []
    
    values = [0.0] * len(rewards)
    running_sum = 0.0
    
    for t in range(len(rewards) - 1, -1, -1):
        running_sum = rewards[t] + gamma * running_sum
        values[t] = running_sum
    
    return values


def compute_elastic_context_length(
    importance_scores: List[float],
    min_len: int = 5,
    max_len: int = 40,
    threshold: float = 0.7,
) -> int:
    """Adaptively determine context length based on trajectory importance.
    
    Elastic DT pattern: Use longer context for important regions.
    """
    if not importance_scores:
        return min_len
    
    # Count steps above importance threshold
    important_steps = sum(1 for s in importance_scores if s >= threshold)
    
    # Scale context length by importance density
    importance_ratio = important_steps / len(importance_scores)
    context_range = max_len - min_len
    
    return min_len + int(context_range * importance_ratio)


def compute_harmo_reward(
    state: Dict[str, Any],
    next_state: Dict[str, Any],
    weights: Dict[str, float],
) -> float:
    """Harmonized multi-objective reward (HarmoDT pattern).
    
    Combines WSJF components into unified reward signal.
    """
    reward = 0.0
    
    # Extract economic metrics
    eco = state.get("economic", {})
    next_eco = next_state.get("economic", {}) if next_state else eco
    
    # COD reduction component
    cod_curr = eco.get("cost_of_delay", eco.get("cod", 0))
    cod_next = next_eco.get("cost_of_delay", next_eco.get("cod", 0))
    cod_delta = (cod_curr - cod_next) / max(cod_curr, 1.0)  # Normalized reduction
    reward += weights.get("cod_reduction", 0.35) * cod_delta
    
    # WSJF improvement component
    wsjf_curr = eco.get("wsjf_score", 0)
    wsjf_next = next_eco.get("wsjf_score", 0)
    wsjf_delta = (wsjf_next - wsjf_curr) / max(wsjf_curr, 1.0)
    reward += weights.get("wsjf_improvement", 0.25) * wsjf_delta
    
    # Risk mitigation component
    risk_curr = state.get("risk_score", 5)
    risk_next = next_state.get("risk_score", 5) if next_state else risk_curr
    risk_reduction = (risk_curr - risk_next) / 10.0  # Normalize to [0,1]
    reward += weights.get("risk_mitigation", 0.20) * risk_reduction
    
    # Cycle efficiency component
    duration_ms = state.get("duration_ms", 60000)
    efficiency = 1.0 - min(duration_ms / 120000.0, 1.0)  # 2min target
    reward += weights.get("cycle_efficiency", 0.20) * efficiency
    
    return reward


def enhance_trajectory_with_values(
    trajectory: List[Dict[str, Any]],
    config: ValueGuidedConfig,
) -> List[Dict[str, Any]]:
    """Enhance trajectory with value functions and elastic context markers."""
    if not trajectory:
        return trajectory
    
    # Extract raw rewards
    rewards = []
    for step in trajectory:
        r = step.get("reward", {})
        if isinstance(r, dict):
            rewards.append(float(r.get("value", r.get("reward", {}).get("value", 0))))
        else:
            rewards.append(float(r) if r else 0.0)
    
    # Compute value function
    values = compute_value_function(rewards, config.value_discount)
    
    # Compute importance scores (based on reward magnitude and value gradient)
    importance_scores = []
    for i, (r, v) in enumerate(zip(rewards, values)):
        grad = abs(values[i] - values[i-1]) if i > 0 else abs(v)
        importance = 0.5 * abs(r) + 0.5 * min(grad, 1.0)
        importance_scores.append(importance)
    
    # Determine elastic context length
    context_len = compute_elastic_context_length(
        importance_scores,
        config.min_context_length,
        config.max_context_length,
        config.importance_threshold,
    )
    
    # Enhance each step
    enhanced = []
    for i, step in enumerate(trajectory):
        enhanced_step = dict(step)
        enhanced_step["value_guided"] = {
            "value": values[i] if i < len(values) else 0.0,
            "importance": importance_scores[i] if i < len(importance_scores) else 0.0,
            "elastic_context_len": context_len,
        }
        enhanced.append(enhanced_step)
    
    return enhanced

