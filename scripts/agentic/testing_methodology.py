#!/usr/bin/env python3
"""
SFT (Spectrum Phase) + RL (Signal Phase) Testing Methodology
Implements forward and back testing strategies with MaxEnt-Guided Policy Optimization (MGPO).

Based on:
- SFT ("Spectrum Phase"): Maximize diversity across potential correct answers (Pass@K)
- RL ("Signal Phase"): MaxEnt-Guided Policy Optimization to identify/amplify correct paths
"""

import os
import sys
import json
import math
import random
import hashlib
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field, asdict
from collections import defaultdict

# Add project root to path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.join(PROJECT_ROOT, "scripts"))
from agentic.pattern_logger import PatternLogger

GOALIE_DIR = os.path.join(PROJECT_ROOT, ".goalie")


@dataclass
class SolutionPath:
    """Represents a potential solution path in the Spectrum Phase."""
    path_id: str
    strategy_name: str
    parameters: Dict[str, Any]
    diversity_score: float = 0.0
    correctness_score: float = 0.0
    entropy: float = 0.0
    pass_at_k: float = 0.0
    backtest_results: Dict[str, Any] = field(default_factory=dict)
    forward_test_results: Dict[str, Any] = field(default_factory=dict)


@dataclass
class MGPOState:
    """State for MaxEnt-Guided Policy Optimization."""
    pattern: str
    uncertainty: float
    entropy: float
    action_history: List[str] = field(default_factory=list)
    reward_history: List[float] = field(default_factory=list)
    q_values: Dict[str, float] = field(default_factory=dict)


class SpectrumPhase:
    """
    SFT Spectrum Phase: Maximize diversity across potential solutions.
    Goal: Improve Pass@K score by building a wide range of plausible solution paths.
    """
    
    def __init__(self, logger: PatternLogger):
        self.logger = logger
        self.solution_paths: List[SolutionPath] = []
        self.diversity_threshold = 0.3
        self.k_samples = 10
        
    def generate_diverse_solutions(self, 
                                    base_strategy: str,
                                    parameter_space: Dict[str, List[Any]],
                                    num_samples: int = 10) -> List[SolutionPath]:
        """
        Generate diverse solution paths by sampling from parameter space.
        Uses entropy-based sampling to maximize diversity.
        """
        solutions = []
        seen_hashes = set()
        
        for i in range(num_samples * 2):  # Oversample to ensure diversity
            if len(solutions) >= num_samples:
                break
                
            # Sample parameters with entropy-weighted selection
            params = {}
            for key, values in parameter_space.items():
                # Use entropy-weighted sampling (favor less-explored values)
                weights = self._calculate_entropy_weights(values, solutions, key)
                idx = random.choices(range(len(values)), weights=weights)[0]
                params[key] = values[idx]
            
            # Create hash to check for duplicates
            param_hash = hashlib.md5(json.dumps(params, sort_keys=True).encode()).hexdigest()[:8]
            if param_hash in seen_hashes:
                continue
            seen_hashes.add(param_hash)
            
            path = SolutionPath(
                path_id=f"spectrum-{param_hash}",
                strategy_name=base_strategy,
                parameters=params,
                diversity_score=self._calculate_diversity(params, solutions),
                entropy=self._calculate_entropy(params)
            )
            solutions.append(path)
        
        self.solution_paths.extend(solutions)
        
        # Log spectrum phase generation
        self.logger.log(
            pattern_name="sft_spectrum_generation",
            data={
                "base_strategy": base_strategy,
                "num_solutions": len(solutions),
                "avg_diversity": sum(s.diversity_score for s in solutions) / len(solutions) if solutions else 0,
                "action": "generate-diverse-solutions",
                "tags": ["testing", "spectrum-phase", "sft"]
            },
            gate="calibration",
            behavioral_type="observability"
        )
        
        return solutions
    
    def _calculate_entropy_weights(self, 
                                    values: List[Any], 
                                    existing_solutions: List[SolutionPath],
                                    param_key: str) -> List[float]:
        """Calculate entropy-based weights for value selection."""
        counts = defaultdict(int)
        for sol in existing_solutions:
            if param_key in sol.parameters:
                counts[sol.parameters[param_key]] += 1
        
        total = len(existing_solutions) + 1
        weights = []
        for v in values:
            # Inverse frequency weighting (entropy-based)
            freq = counts.get(v, 0) + 1
            weight = math.log(total / freq + 1)
            weights.append(weight)
        
        # Normalize
        total_weight = sum(weights)
        return [w / total_weight for w in weights] if total_weight > 0 else [1.0 / len(values)] * len(values)
    
    def _calculate_diversity(self, params: Dict, existing: List[SolutionPath]) -> float:
        """Calculate diversity score relative to existing solutions."""
        if not existing:
            return 1.0
            
        min_distance = float('inf')
        for sol in existing:
            distance = self._parameter_distance(params, sol.parameters)
            min_distance = min(min_distance, distance)
        
        return min(1.0, min_distance / len(params))
    
    def _parameter_distance(self, p1: Dict, p2: Dict) -> float:
        """Calculate normalized distance between parameter sets."""
        all_keys = set(p1.keys()) | set(p2.keys())
        if not all_keys:
            return 0.0
            
        diff_count = sum(1 for k in all_keys if p1.get(k) != p2.get(k))
        return diff_count / len(all_keys)
    
    def _calculate_entropy(self, params: Dict) -> float:
        """Calculate entropy of parameter configuration."""
        if not params:
            return 0.0
        # Simple entropy estimate based on parameter value uniqueness
        values = list(params.values())
        unique_ratio = len(set(str(v) for v in values)) / len(values)
        return -unique_ratio * math.log(unique_ratio + 1e-10)
    
    def calculate_pass_at_k(self, solutions: List[SolutionPath], k: int = None) -> float:
        """
        Calculate Pass@K metric: probability that at least one of K samples is correct.
        """
        k = k or self.k_samples
        if not solutions:
            return 0.0
            
        # Sort by correctness score descending
        sorted_sols = sorted(solutions, key=lambda x: x.correctness_score, reverse=True)
        
        # Calculate Pass@K as 1 - P(all K samples incorrect)
        top_k = sorted_sols[:k]
        if not top_k:
            return 0.0
            
        # P(at least one correct) = 1 - P(all incorrect)
        p_all_incorrect = 1.0
        for sol in top_k:
            p_all_incorrect *= (1 - sol.correctness_score)
        
        return 1 - p_all_incorrect


class SignalPhase:
    """
    RL Signal Phase: MaxEnt-Guided Policy Optimization (MGPO).
    Goal: Identify and amplify the most correct paths from diverse solution pool.
    Focus: Problems where the model is most uncertain (entropy-based weighting).
    """
    
    def __init__(self, logger: PatternLogger):
        self.logger = logger
        self.states: Dict[str, MGPOState] = {}
        self.learning_rate = 0.1
        self.discount_factor = 0.95
        self.entropy_coefficient = 0.01
        self.exploration_rate = 0.2
        
    def initialize_state(self, pattern: str) -> MGPOState:
        """Initialize MGPO state for a pattern."""
        state = MGPOState(
            pattern=pattern,
            uncertainty=1.0,
            entropy=1.0,
            q_values={
                "amplify": 0.0,
                "maintain": 0.0,
                "explore": 0.0,
                "prune": 0.0
            }
        )
        self.states[pattern] = state
        return state
    
    def select_action(self, state: MGPOState) -> str:
        """
        Select action using entropy-weighted exploration.
        Prioritizes problems where model is most uncertain.
        """
        # Calculate action probabilities with entropy bonus
        q_values = state.q_values
        entropy_bonus = state.entropy * self.entropy_coefficient
        
        # Softmax with temperature based on uncertainty
        temperature = max(0.1, state.uncertainty)
        exp_q = {a: math.exp((q + entropy_bonus) / temperature) for a, q in q_values.items()}
        total = sum(exp_q.values())
        probs = {a: v / total for a, v in exp_q.items()}
        
        # Epsilon-greedy with entropy-based exploration
        if random.random() < self.exploration_rate * state.entropy:
            action = random.choice(list(q_values.keys()))
        else:
            action = max(probs, key=probs.get)
        
        state.action_history.append(action)
        return action
    
    def update_policy(self, 
                      state: MGPOState, 
                      action: str, 
                      reward: float, 
                      next_uncertainty: float) -> None:
        """
        Update Q-values using MaxEnt-Guided Policy Optimization.
        """
        old_q = state.q_values[action]
        
        # Max Q-value for next state
        max_next_q = max(state.q_values.values())
        
        # TD update with entropy regularization
        entropy_term = self.entropy_coefficient * state.entropy
        td_target = reward + self.discount_factor * max_next_q + entropy_term
        td_error = td_target - old_q
        
        # Update Q-value
        state.q_values[action] = old_q + self.learning_rate * td_error
        
        # Update uncertainty based on reward variance
        state.reward_history.append(reward)
        if len(state.reward_history) > 1:
            variance = sum((r - sum(state.reward_history) / len(state.reward_history)) ** 2 
                          for r in state.reward_history[-10:]) / min(10, len(state.reward_history))
            state.uncertainty = min(1.0, math.sqrt(variance))
        
        # Update entropy
        state.entropy = next_uncertainty
        
        # Log MGPO update
        self.logger.log(
            pattern_name="mgpo_policy_update",
            data={
                "pattern": state.pattern,
                "action": action,
                "reward": reward,
                "td_error": td_error,
                "new_q_value": state.q_values[action],
                "uncertainty": state.uncertainty,
                "entropy": state.entropy,
                "action": "update-policy",
                "tags": ["testing", "signal-phase", "mgpo", "rl"]
            },
            gate="calibration",
            behavioral_type="observability",
            economic={
                "cod": abs(td_error) * 10,  # Cost proportional to error
                "wsjf_score": reward * (1 / max(0.1, state.uncertainty))
            }
        )
    
    def rank_solutions(self, solutions: List[SolutionPath]) -> List[SolutionPath]:
        """
        Rank solutions using MGPO-derived scores.
        Prioritizes high-correctness, low-uncertainty solutions.
        """
        for sol in solutions:
            state = self.states.get(sol.strategy_name) or self.initialize_state(sol.strategy_name)
            
            # Calculate MGPO score combining correctness and confidence
            confidence = 1 - state.uncertainty
            mgpo_score = sol.correctness_score * confidence + sol.diversity_score * state.entropy
            sol.pass_at_k = mgpo_score
        
        return sorted(solutions, key=lambda x: x.pass_at_k, reverse=True)


class TestingOrchestrator:
    """
    Orchestrates the full SFT + RL testing methodology.
    Combines Spectrum Phase (diversity) with Signal Phase (amplification).
    """
    
    def __init__(self, tenant_id: str = "default"):
        self.logger = PatternLogger(
            mode="advisory",
            circle="testing",
            run_id=f"testing-{int(datetime.now().timestamp())}",
            tenant_id=tenant_id,
            tenant_platform="agentic-flow-core"
        )
        self.spectrum = SpectrumPhase(self.logger)
        self.signal = SignalPhase(self.logger)
        
    def run_backtest(self, 
                     strategy_name: str,
                     solution: SolutionPath,
                     historical_data: List[Dict],
                     start_date: str,
                     end_date: str) -> Dict[str, Any]:
        """
        Run backtest on historical data for a solution path.
        """
        # Simulate backtest results
        pnl = sum(d.get('return', 0) for d in historical_data)
        sharpe = pnl / (max(0.01, self._calculate_volatility(historical_data)) * math.sqrt(252))
        max_dd = self._calculate_max_drawdown(historical_data)
        
        results = {
            "strategy": strategy_name,
            "path_id": solution.path_id,
            "start_date": start_date,
            "end_date": end_date,
            "pnl": pnl,
            "sharpe_ratio": sharpe,
            "max_drawdown": max_dd,
            "win_rate": self._calculate_win_rate(historical_data),
            "profit_factor": self._calculate_profit_factor(historical_data)
        }
        
        solution.backtest_results = results
        solution.correctness_score = min(1.0, max(0.0, (sharpe + 1) / 4))  # Normalize Sharpe to [0,1]
        
        # Log backtest
        self.logger.log_backtest_result(
            strategy_name=strategy_name,
            start_date=start_date,
            end_date=end_date,
            pnl=pnl,
            sharpe_ratio=sharpe,
            max_drawdown=max_dd
        )
        
        return results
    
    def run_forward_test(self,
                         solution: SolutionPath,
                         live_data: List[Dict],
                         duration_days: int = 30) -> Dict[str, Any]:
        """
        Run forward test on live/recent data.
        """
        pnl = sum(d.get('return', 0) for d in live_data)
        
        results = {
            "path_id": solution.path_id,
            "duration_days": duration_days,
            "pnl": pnl,
            "consistency_score": self._calculate_consistency(live_data),
            "regime_adaptability": self._calculate_regime_score(live_data)
        }
        
        solution.forward_test_results = results
        
        # Log forward test
        self.logger.log(
            pattern_name="forward_test_result",
            data={
                "path_id": solution.path_id,
                "strategy": solution.strategy_name,
                "duration_days": duration_days,
                "pnl": pnl,
                "action": "forward-test",
                "tags": ["testing", "forward-test", "validation"]
            },
            gate="calibration",
            behavioral_type="observability",
            economic={"cod": abs(pnl) * 0.1, "wsjf_score": pnl / max(1, duration_days)}
        )
        
        return results
    
    def execute_full_cycle(self,
                           strategy_name: str,
                           parameter_space: Dict[str, List[Any]],
                           historical_data: List[Dict],
                           live_data: List[Dict],
                           start_date: str = "2024-01-01",
                           end_date: str = "2024-12-01") -> Dict[str, Any]:
        """
        Execute full SFT + RL testing cycle.
        
        1. Spectrum Phase: Generate diverse solutions
        2. Backtest all solutions
        3. Signal Phase: Apply MGPO to rank and amplify
        4. Forward test top solutions
        5. Return final recommendations
        """
        # Phase 1: Spectrum - Generate diverse solutions
        solutions = self.spectrum.generate_diverse_solutions(
            base_strategy=strategy_name,
            parameter_space=parameter_space,
            num_samples=10
        )
        
        # Phase 2: Backtest all solutions
        for sol in solutions:
            self.run_backtest(strategy_name, sol, historical_data, start_date, end_date)
        
        # Phase 3: Signal - Rank using MGPO
        ranked_solutions = self.signal.rank_solutions(solutions)
        
        # Apply MGPO learning
        for i, sol in enumerate(ranked_solutions):
            state = self.signal.states.get(sol.strategy_name) or self.signal.initialize_state(sol.strategy_name)
            action = self.signal.select_action(state)
            
            # Calculate reward based on backtest performance
            reward = sol.correctness_score * 2 - 1  # Scale to [-1, 1]
            next_uncertainty = 1 - sol.correctness_score
            
            self.signal.update_policy(state, action, reward, next_uncertainty)
        
        # Phase 4: Forward test top 3 solutions
        top_solutions = ranked_solutions[:3]
        for sol in top_solutions:
            self.run_forward_test(sol, live_data)
        
        # Phase 5: Calculate Pass@K and prepare results
        pass_at_k = self.spectrum.calculate_pass_at_k(solutions, k=5)
        
        results = {
            "strategy_name": strategy_name,
            "total_solutions_tested": len(solutions),
            "pass_at_k": pass_at_k,
            "top_solutions": [
                {
                    "path_id": sol.path_id,
                    "parameters": sol.parameters,
                    "backtest_sharpe": sol.backtest_results.get("sharpe_ratio", 0),
                    "forward_pnl": sol.forward_test_results.get("pnl", 0),
                    "mgpo_score": sol.pass_at_k
                }
                for sol in top_solutions
            ],
            "recommendation": top_solutions[0].path_id if top_solutions else None,
            "generated_at": datetime.now().isoformat()
        }
        
        # Log full cycle completion
        self.logger.log(
            pattern_name="testing_cycle_complete",
            data={
                "strategy": strategy_name,
                "solutions_tested": len(solutions),
                "pass_at_k": pass_at_k,
                "top_recommendation": results["recommendation"],
                "action": "cycle-complete",
                "tags": ["testing", "sft", "rl", "mgpo", "complete"]
            },
            gate="calibration",
            behavioral_type="advisory",
            economic={
                "cod": sum(sol.backtest_results.get("pnl", 0) for sol in solutions),
                "wsjf_score": pass_at_k * 100
            }
        )
        
        return results
    
    # Helper methods for metrics calculation
    def _calculate_volatility(self, data: List[Dict]) -> float:
        returns = [d.get('return', 0) for d in data]
        if len(returns) < 2:
            return 0.01
        mean = sum(returns) / len(returns)
        variance = sum((r - mean) ** 2 for r in returns) / len(returns)
        return math.sqrt(variance) or 0.01
    
    def _calculate_max_drawdown(self, data: List[Dict]) -> float:
        cumulative = 0
        peak = 0
        max_dd = 0
        for d in data:
            cumulative += d.get('return', 0)
            peak = max(peak, cumulative)
            dd = (peak - cumulative) / max(peak, 1) if peak > 0 else 0
            max_dd = max(max_dd, dd)
        return max_dd
    
    def _calculate_win_rate(self, data: List[Dict]) -> float:
        wins = sum(1 for d in data if d.get('return', 0) > 0)
        return wins / len(data) if data else 0
    
    def _calculate_profit_factor(self, data: List[Dict]) -> float:
        gross_profit = sum(d.get('return', 0) for d in data if d.get('return', 0) > 0)
        gross_loss = abs(sum(d.get('return', 0) for d in data if d.get('return', 0) < 0))
        return gross_profit / max(gross_loss, 0.01)
    
    def _calculate_consistency(self, data: List[Dict]) -> float:
        if len(data) < 2:
            return 0.5
        returns = [d.get('return', 0) for d in data]
        positive_periods = sum(1 for r in returns if r > 0)
        return positive_periods / len(returns)
    
    def _calculate_regime_score(self, data: List[Dict]) -> float:
        # Simplified regime adaptability score
        if len(data) < 10:
            return 0.5
        first_half = data[:len(data)//2]
        second_half = data[len(data)//2:]
        perf_1 = sum(d.get('return', 0) for d in first_half)
        perf_2 = sum(d.get('return', 0) for d in second_half)
        # Score based on consistent performance across "regimes"
        if perf_1 > 0 and perf_2 > 0:
            return 0.8
        elif perf_1 * perf_2 > 0:
            return 0.6
        else:
            return 0.4


def main():
    """Demo the testing methodology."""
    import argparse
    
    parser = argparse.ArgumentParser(description="SFT + RL Testing Methodology")
    parser.add_argument("--strategy", default="momentum", help="Strategy name")
    parser.add_argument("--samples", type=int, default=10, help="Number of solution samples")
    parser.add_argument("--tenant-id", default="default", help="Tenant ID")
    parser.add_argument("--json", action="store_true", help="JSON output")
    args = parser.parse_args()
    
    # Initialize orchestrator
    orchestrator = TestingOrchestrator(tenant_id=args.tenant_id)
    
    # Define parameter space for strategy
    parameter_space = {
        "lookback_period": [5, 10, 20, 50, 100],
        "entry_threshold": [0.5, 1.0, 1.5, 2.0],
        "exit_threshold": [0.25, 0.5, 0.75, 1.0],
        "position_sizing": ["fixed", "volatility_scaled", "kelly"],
        "stop_loss_pct": [0.01, 0.02, 0.05, 0.10]
    }
    
    # Generate synthetic historical data
    import random
    random.seed(42)
    historical_data = [{"return": random.gauss(0.001, 0.02)} for _ in range(252)]
    live_data = [{"return": random.gauss(0.0015, 0.018)} for _ in range(30)]
    
    # Execute full testing cycle
    results = orchestrator.execute_full_cycle(
        strategy_name=args.strategy,
        parameter_space=parameter_space,
        historical_data=historical_data,
        live_data=live_data
    )
    
    if args.json:
        print(json.dumps(results, indent=2))
    else:
        print(f"\n=== Testing Cycle Results: {args.strategy} ===")
        print(f"Solutions Tested: {results['total_solutions_tested']}")
        print(f"Pass@K Score: {results['pass_at_k']:.4f}")
        print(f"\nTop Recommendations:")
        for i, sol in enumerate(results['top_solutions'], 1):
            print(f"  {i}. {sol['path_id']}")
            print(f"     Backtest Sharpe: {sol['backtest_sharpe']:.2f}")
            print(f"     Forward PnL: {sol['forward_pnl']:.4f}")
            print(f"     MGPO Score: {sol['mgpo_score']:.4f}")


if __name__ == "__main__":
    main()
