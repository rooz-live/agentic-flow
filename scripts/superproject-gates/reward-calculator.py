#!/usr/bin/env python3
"""
Reward Calculator with WSJF Integration
========================================
Calculates granular rewards (0.60-1.00) based on:
- Success rate (base score)
- WSJF confidence from Phase D
- Execution time (latency penalty)

Usage:
    python reward-calculator.py --success 1 --wsjf-confidence 0.85 --latency-ms 1200
    python reward-calculator.py --json '{"success": 1, "wsjf_confidence": 0.85, "latency_ms": 1200}'
"""

import argparse
import json
import sys
from typing import Dict, Optional


class RewardCalculator:
    """Calculate rewards with WSJF confidence integration"""
    
    # Reward bounds
    MIN_REWARD = 0.60
    MAX_REWARD = 1.00
    
    # Base score weights
    BASE_MIN = 0.60
    BASE_MAX = 1.00
    
    # Latency thresholds (ms)
    LATENCY_FAST = 500     # No penalty
    LATENCY_SLOW = 5000    # Max penalty
    MAX_LATENCY_PENALTY = 0.10
    
    def __init__(self):
        pass
    
    def calculate_base_score(self, success: int) -> float:
        """
        Calculate base score from success/failure.
        
        Args:
            success: 1 for success, 0 for failure
            
        Returns:
            Base score (0.60-1.00)
        """
        if success == 1:
            return self.BASE_MAX
        else:
            # Failure still gets base score for attempting
            return self.BASE_MIN
    
    def calculate_latency_factor(self, latency_ms: float) -> float:
        """
        Calculate latency penalty factor.
        
        Args:
            latency_ms: Execution time in milliseconds
            
        Returns:
            Factor to multiply reward by (0.90-1.00)
        """
        if latency_ms <= self.LATENCY_FAST:
            return 1.0  # No penalty
        
        if latency_ms >= self.LATENCY_SLOW:
            return 1.0 - self.MAX_LATENCY_PENALTY  # Max penalty
        
        # Linear interpolation
        ratio = (latency_ms - self.LATENCY_FAST) / (self.LATENCY_SLOW - self.LATENCY_FAST)
        penalty = ratio * self.MAX_LATENCY_PENALTY
        return 1.0 - penalty
    
    def calculate_reward(
        self,
        success: int,
        wsjf_confidence: float = 0.50,
        latency_ms: float = 1000.0
    ) -> float:
        """
        Calculate final reward with all factors.
        
        Formula:
            reward = base_score * wsjf_confidence * latency_factor
            
        Bounded to [MIN_REWARD, MAX_REWARD]
        
        Args:
            success: 1 for success, 0 for failure
            wsjf_confidence: WSJF confidence from Phase D (0.50-0.90)
            latency_ms: Execution time in milliseconds
            
        Returns:
            Final reward (0.60-1.00)
        """
        base_score = self.calculate_base_score(success)
        latency_factor = self.calculate_latency_factor(latency_ms)
        
        # Calculate raw reward
        raw_reward = base_score * wsjf_confidence * latency_factor
        
        # Bound to valid range
        reward = max(self.MIN_REWARD, min(self.MAX_REWARD, raw_reward))
        
        return round(reward, 2)
    
    def calculate_with_breakdown(
        self,
        success: int,
        wsjf_confidence: float = 0.50,
        latency_ms: float = 1000.0
    ) -> Dict[str, float]:
        """
        Calculate reward with component breakdown.
        
        Returns:
            Dictionary with reward and all components
        """
        base_score = self.calculate_base_score(success)
        latency_factor = self.calculate_latency_factor(latency_ms)
        reward = self.calculate_reward(success, wsjf_confidence, latency_ms)
        
        return {
            "reward": reward,
            "base_score": round(base_score, 2),
            "wsjf_confidence": round(wsjf_confidence, 2),
            "latency_factor": round(latency_factor, 2),
            "latency_ms": latency_ms,
            "success": success
        }


def main():
    """CLI interface for reward calculator"""
    parser = argparse.ArgumentParser(
        description="Calculate reward with WSJF confidence integration"
    )
    
    parser.add_argument(
        "--success",
        type=int,
        choices=[0, 1],
        help="Success flag (1=success, 0=failure)"
    )
    
    parser.add_argument(
        "--wsjf-confidence",
        type=float,
        help="WSJF confidence (0.50-0.90)"
    )
    
    parser.add_argument(
        "--latency-ms",
        type=float,
        help="Execution latency in milliseconds"
    )
    
    parser.add_argument(
        "--json",
        type=str,
        help="JSON input with success, wsjf_confidence, latency_ms"
    )
    
    parser.add_argument(
        "--breakdown",
        action="store_true",
        help="Show component breakdown"
    )
    
    args = parser.parse_args()
    
    # Parse inputs
    if args.json:
        try:
            data = json.loads(args.json)
            success = data.get("success", 1)
            wsjf_confidence = data.get("wsjf_confidence", 0.50)
            latency_ms = data.get("latency_ms", 1000.0)
        except json.JSONDecodeError as e:
            print(f"Error: Invalid JSON: {e}", file=sys.stderr)
            sys.exit(1)
    else:
        success = args.success if args.success is not None else 1
        wsjf_confidence = args.wsjf_confidence if args.wsjf_confidence is not None else 0.50
        latency_ms = args.latency_ms if args.latency_ms is not None else 1000.0
    
    # Validate inputs
    if not (0.0 <= wsjf_confidence <= 1.0):
        print("Error: WSJF confidence must be in range [0.0, 1.0]", file=sys.stderr)
        sys.exit(1)
    
    if latency_ms < 0:
        print("Error: Latency must be non-negative", file=sys.stderr)
        sys.exit(1)
    
    # Calculate reward
    calculator = RewardCalculator()
    
    if args.breakdown:
        result = calculator.calculate_with_breakdown(success, wsjf_confidence, latency_ms)
        print(json.dumps(result, indent=2))
    else:
        reward = calculator.calculate_reward(success, wsjf_confidence, latency_ms)
        print(reward)


if __name__ == "__main__":
    main()
