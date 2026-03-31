#!/usr/bin/env python3
"""
Cross-perspective evaluation scorer for VibeThinker trial argument refinement.

Evaluates trial arguments across multiple dimensions:
- Evidence strength (1-10 scale)
- Perjury risk (0-1 probability)
- Confidence score (0-1)
- Coherence score (0-1)

Input: --iteration N (reads from VibeThinker logs and MGPO output)
Output: JSON scores to stdout, detailed analysis to log
"""

import argparse
import json
import sys
import re
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SWARM_LOG = Path.home() / "Library/Logs/vibethinker-trial-swarm.log"
MGPO_LOG = Path.home() / "Library/Logs/vibethinker-mgpo.log"

class TrialArgumentScorer:
    """Cross-perspective scorer for trial arguments using evidence-based metrics."""
    
    def __init__(self, iteration: int):
        self.iteration = iteration
        self.timestamp = datetime.now().isoformat()
        
    def extract_iteration_content(self) -> Optional[str]:
        """Extract content from the specified iteration in logs."""
        try:
            if SWARM_LOG.exists():
                content = SWARM_LOG.read_text()
                # Find iteration-specific content
                pattern = rf"\[(?:SFT|RL|EVAL)-{self.iteration}\].*?(?=\[(?:SFT|RL|EVAL)-{self.iteration + 1}\]|$)"
                match = re.search(pattern, content, re.DOTALL)
                if match:
                    return match.group(0)
            return None
        except Exception as e:
            print(f"Error reading logs: {e}", file=sys.stderr)
            return None
    
    def calculate_evidence_strength(self, content: str) -> float:
        """Calculate evidence strength score (1-10 scale)."""
        if not content:
            return 1.0
            
        # Evidence indicators
        evidence_patterns = [
            r'evidence',
            r'citation',
            r'case law',
            r'precedent',
            r'documentation',
            r'witness',
            r'exhibit'
        ]
        
        strength = 1.0
        for pattern in evidence_patterns:
            matches = len(re.findall(pattern, content, re.IGNORECASE))
            strength += min(matches * 0.5, 2.0)  # Cap contribution per pattern
            
        return min(strength, 10.0)
    
    def calculate_perjury_risk(self, content: str) -> float:
        """Calculate perjury risk probability (0-1 scale)."""
        if not content:
            return 0.5
            
        # Risk indicators
        risk_patterns = [
            r'contradict',
            r'inconsistent',
            r'unclear',
            r'uncertain',
            r'missing',
            r'incomplete'
        ]
        
        risk = 0.1  # Base risk
        for pattern in risk_patterns:
            matches = len(re.findall(pattern, content, re.IGNORECASE))
            risk += matches * 0.05
            
        return min(risk, 1.0)
    
    def calculate_confidence_score(self, content: str) -> float:
        """Calculate confidence score (0-1 scale)."""
        if not content:
            return 0.3
            
        # Confidence indicators
        positive_patterns = [
            r'strong',
            r'clear',
            r'definitive',
            r'conclusive',
            r'established',
            r'proven'
        ]
        
        negative_patterns = [
            r'weak',
            r'unclear',
            r'questionable',
            r'uncertain',
            r'incomplete'
        ]
        
        confidence = 0.5  # Neutral baseline
        
        for pattern in positive_patterns:
            matches = len(re.findall(pattern, content, re.IGNORECASE))
            confidence += matches * 0.05
            
        for pattern in negative_patterns:
            matches = len(re.findall(pattern, content, re.IGNORECASE))
            confidence -= matches * 0.05
            
        return max(0.0, min(confidence, 1.0))
    
    def calculate_coherence_score(self, content: str) -> float:
        """Calculate coherence score (0-1 scale)."""
        if not content:
            return 0.3
            
        # Coherence indicators
        coherence_patterns = [
            r'therefore',
            r'because',
            r'consequently',
            r'furthermore',
            r'moreover',
            r'in conclusion'
        ]
        
        lines = content.split('\n')
        non_empty_lines = [line.strip() for line in lines if line.strip()]
        
        if not non_empty_lines:
            return 0.3
            
        # Base coherence from logical connectors
        coherence = 0.4
        for pattern in coherence_patterns:
            matches = len(re.findall(pattern, content, re.IGNORECASE))
            coherence += matches * 0.03
            
        # Bonus for structured content
        if len(non_empty_lines) > 5:
            coherence += 0.1
            
        return min(coherence, 1.0)
    
    def score_iteration(self) -> Dict:
        """Score the specified iteration and return results."""
        content = self.extract_iteration_content()
        
        if not content:
            # Return default scores for missing content
            return {
                "iteration": self.iteration,
                "timestamp": self.timestamp,
                "evidence_strength": 3.0,
                "perjury_risk": 0.5,
                "confidence_score": 0.3,
                "coherence_score": 0.3,
                "status": "no_content",
                "content_length": 0
            }
        
        scores = {
            "iteration": self.iteration,
            "timestamp": self.timestamp,
            "evidence_strength": self.calculate_evidence_strength(content),
            "perjury_risk": self.calculate_perjury_risk(content),
            "confidence_score": self.calculate_confidence_score(content),
            "coherence_score": self.calculate_coherence_score(content),
            "status": "scored",
            "content_length": len(content)
        }
        
        return scores

def main():
    parser = argparse.ArgumentParser(description="Cross-perspective evaluation scorer for VibeThinker")
    parser.add_argument("--iteration", type=int, required=True, help="Iteration number to score")
    parser.add_argument("--output-json", help="Output JSON file path (default: stdout)")
    
    args = parser.parse_args()
    
    try:
        scorer = TrialArgumentScorer(args.iteration)
        results = scorer.score_iteration()
        
        if args.output_json:
            with open(args.output_json, 'w') as f:
                json.dump(results, f, indent=2)
        else:
            print(json.dumps(results, indent=2))
            
        # Log summary to stderr for VibeThinker logs
        print(f"[SCORER] Iteration {args.iteration}: "
              f"Evidence={results['evidence_strength']:.1f}/10, "
              f"Risk={results['perjury_risk']:.2f}, "
              f"Confidence={results['confidence_score']:.2f}, "
              f"Coherence={results['coherence_score']:.2f}", 
              file=sys.stderr)
        
        return 0
        
    except Exception as e:
        print(f"Error scoring iteration {args.iteration}: {e}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    sys.exit(main())
