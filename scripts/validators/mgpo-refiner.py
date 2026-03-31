#!/usr/bin/env python3
"""
MGPO Refiner: MaxEnt-Guided Policy Optimization for Trial Arguments

Implements VibeThinker RL phase:
- Entropy-based weighting (high entropy = uncertain = needs focus)
- Prioritizes problems where model confidence is lowest
- Iterative learning amplifies correct paths from diverse SFT solutions

Based on: https://arxiv.org/pdf/2511.06221 (VibeThinker paper)
"""

import argparse
import json
import sys
from pathlib import Path
from typing import List, Dict, Tuple
from dataclasses import dataclass
import math

@dataclass
class ArgumentSolution:
    """Represents a trial argument solution from SFT phase"""
    content: str
    confidence: float  # 0-1
    entropy: float  # Higher = more uncertain
    source_agent: str
    iteration: int

@dataclass
class MGPOWeights:
    """Entropy-based weights for MGPO refinement"""
    problem_id: str
    entropy: float
    weight: float  # Higher weight = more focus needed
    priority: str  # 'critical', 'high', 'medium', 'low'

class MGPORefiner:
    """MaxEnt-Guided Policy Optimization refiner"""
    
    ENTROPY_THRESHOLD_CRITICAL = 0.9
    ENTROPY_THRESHOLD_HIGH = 0.7
    ENTROPY_THRESHOLD_MEDIUM = 0.5
    
    def __init__(self, iteration: int, entropy_threshold: float = 0.7):
        self.iteration = iteration
        self.entropy_threshold = entropy_threshold
        self.solutions: List[ArgumentSolution] = []
    
    def load_sft_solutions(self, solutions_file: Path) -> None:
        """Load diverse solutions from SFT phase"""
        if not solutions_file.exists():
            print(f"⚠️  SFT solutions file not found: {solutions_file}", file=sys.stderr)
            return
        
        with open(solutions_file) as f:
            data = json.load(f)
            for sol in data.get('solutions', []):
                self.solutions.append(ArgumentSolution(
                    content=sol['content'],
                    confidence=sol.get('confidence', 0.5),
                    entropy=sol.get('entropy', 0.0),
                    source_agent=sol['source_agent'],
                    iteration=self.iteration
                ))
    
    def calculate_entropy(self, solution: ArgumentSolution) -> float:
        """
        Calculate solution entropy (uncertainty measure)
        High entropy = model is uncertain = needs more learning
        """
        # If confidence already scored, derive entropy
        if solution.entropy > 0:
            return solution.entropy
        
        # Entropy ≈ -Σ(p * log(p))
        # For binary classification: H = -[p*log(p) + (1-p)*log(1-p)]
        p = solution.confidence
        if p <= 0 or p >= 1:
            return 0.0
        
        entropy = -(p * math.log2(p) + (1-p) * math.log2(1-p))
        return entropy
    
    def compute_mgpo_weights(self) -> List[MGPOWeights]:
        """
        Compute MGPO weights: prioritize high-entropy (uncertain) problems
        """
        weights = []
        
        for sol in self.solutions:
            entropy = self.calculate_entropy(sol)
            
            # MGPO weight: exponential of entropy (amplify uncertain problems)
            weight = math.exp(entropy)
            
            # Priority classification
            if entropy >= self.ENTROPY_THRESHOLD_CRITICAL:
                priority = 'critical'
            elif entropy >= self.ENTROPY_THRESHOLD_HIGH:
                priority = 'high'
            elif entropy >= self.ENTROPY_THRESHOLD_MEDIUM:
                priority = 'medium'
            else:
                priority = 'low'
            
            weights.append(MGPOWeights(
                problem_id=f"{sol.source_agent}-iter{self.iteration}",
                entropy=entropy,
                weight=weight,
                priority=priority
            ))
        
        # Sort by weight descending (highest uncertainty first)
        return sorted(weights, key=lambda w: w.weight, reverse=True)
    
    def focus_uncertain_problems(self, weights: List[MGPOWeights]) -> List[MGPOWeights]:
        """Filter to only uncertain problems above threshold"""
        return [w for w in weights if w.entropy >= self.entropy_threshold]
    
    def amplify_correct_paths(self, weights: List[MGPOWeights]) -> Dict[str, str]:
        """
        Amplify most correct paths from diverse solution pool
        Returns: {problem_id: recommended_action}
        """
        actions = {}
        
        for weight in weights:
            if weight.priority == 'critical':
                actions[weight.problem_id] = "URGENT: Immediate human review + 3 more agent cycles"
            elif weight.priority == 'high':
                actions[weight.problem_id] = "High priority: 2 more agent cycles + precedent search"
            elif weight.priority == 'medium':
                actions[weight.problem_id] = "Medium priority: 1 more agent cycle"
            else:
                actions[weight.problem_id] = "Low priority: Monitor only"
        
        return actions
    
    def generate_report(self, weights: List[MGPOWeights], actions: Dict[str, str], output_path: Path) -> None:
        """Generate MGPO refinement report"""
        report = {
            "iteration": self.iteration,
            "entropy_threshold": self.entropy_threshold,
            "total_problems": len(weights),
            "critical_problems": len([w for w in weights if w.priority == 'critical']),
            "high_priority_problems": len([w for w in weights if w.priority == 'high']),
            "weights": [
                {
                    "problem_id": w.problem_id,
                    "entropy": round(w.entropy, 3),
                    "weight": round(w.weight, 3),
                    "priority": w.priority,
                    "action": actions.get(w.problem_id, "None")
                }
                for w in weights
            ]
        }
        
        with open(output_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"✅ MGPO report saved: {output_path}")
    
    def run(self, solutions_file: Path, output_dir: Path) -> None:
        """Run full MGPO refinement pipeline"""
        print(f"🔬 MGPO Refiner - Iteration {self.iteration}")
        print(f"   Entropy threshold: {self.entropy_threshold}")
        
        # Load SFT solutions
        self.load_sft_solutions(solutions_file)
        print(f"   Loaded {len(self.solutions)} SFT solutions")
        
        # Compute MGPO weights
        weights = self.compute_mgpo_weights()
        print(f"   Computed {len(weights)} MGPO weights")
        
        # Focus on uncertain problems
        uncertain = self.focus_uncertain_problems(weights)
        print(f"   {len(uncertain)} uncertain problems above threshold")
        
        # Amplify correct paths
        actions = self.amplify_correct_paths(uncertain)
        print(f"   Generated {len(actions)} refinement actions")
        
        # Generate report
        output_path = output_dir / f"mgpo-iter{self.iteration}.json"
        self.generate_report(weights, actions, output_path)

def main():
    parser = argparse.ArgumentParser(description="MGPO Refiner: MaxEnt-Guided Policy Optimization")
    parser.add_argument('--iteration', type=int, required=True, help="Current iteration number")
    parser.add_argument('--entropy-threshold', type=float, default=0.7, help="Entropy threshold for focus")
    parser.add_argument('--focus-uncertain', action='store_true', help="Only process uncertain problems")
    parser.add_argument('--solutions-file', type=Path, help="Path to SFT solutions JSON")
    parser.add_argument('--output-dir', type=Path, help="Output directory for reports")
    
    args = parser.parse_args()
    
    # Default paths if not provided
    if not args.solutions_file:
        args.solutions_file = Path(f"/tmp/sft-solutions-iter{args.iteration}.json")
    if not args.output_dir:
        args.output_dir = Path("/tmp/mgpo-reports")
        args.output_dir.mkdir(exist_ok=True)
    
    refiner = MGPORefiner(
        iteration=args.iteration,
        entropy_threshold=args.entropy_threshold
    )
    
    refiner.run(args.solutions_file, args.output_dir)

if __name__ == '__main__':
    main()
