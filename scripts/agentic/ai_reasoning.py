#!/usr/bin/env python3
"""
AI Reasoning Integration Module
VibeThinker and Harbor framework integration for enhanced WSJF decision making.

References:
- VibeThinker: https://github.com/WeiboAI/VibeThinker (arxiv:2511.06221)
- Harbor Framework: https://harborframework.com/
- Prime Intellect: https://www.primeintellect.ai/blog/environments
"""

import os
import sys
import json
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.join(PROJECT_ROOT, "scripts"))
from agentic.pattern_logger import PatternLogger


class ReasoningMode(Enum):
    VIBETHINKER = "vibethinker"  # Multi-step reasoning with thought chains
    HARBOR = "harbor"            # Agent orchestration framework
    HYBRID = "hybrid"            # Combined approach
    STANDARD = "standard"        # Basic WSJF calculation


class ThinkingDepth(Enum):
    SHALLOW = 1     # Quick decisions
    MODERATE = 2    # Balanced analysis
    DEEP = 3        # Comprehensive reasoning
    EXHAUSTIVE = 4  # Maximum depth


@dataclass
class ThoughtChain:
    """VibeThinker-style thought chain for reasoning."""
    chain_id: str
    question: str
    steps: List[Dict[str, str]] = field(default_factory=list)
    conclusion: str = ""
    confidence: float = 0.0
    tokens_used: int = 0


@dataclass
class WSJFDecision:
    """Enhanced WSJF decision with AI reasoning."""
    item_id: str
    ubv: float  # User Business Value
    tc: float   # Time Criticality
    rr: float   # Risk Reduction / Opportunity Enablement
    size: float
    cod: float  # Cost of Delay
    wsjf_score: float
    reasoning_mode: ReasoningMode
    thought_chain: Optional[ThoughtChain] = None
    ai_adjustments: Dict[str, float] = field(default_factory=dict)
    final_score: float = 0.0


class AIReasoningEngine:
    """AI-enhanced reasoning for WSJF prioritization."""
    
    def __init__(self, mode: ReasoningMode = ReasoningMode.HYBRID):
        self.mode = mode
        self.logger = PatternLogger(
            mode="advisory", circle="ai-reasoning",
            run_id=f"ai-{int(datetime.now().timestamp())}"
        )
        self.thought_chains: List[ThoughtChain] = []
        self.decisions: List[WSJFDecision] = []
        
        # VibeThinker configuration
        self.vibethinker_config = {
            "model": "WeiboAI/VibeThinker-1.5B",
            "max_thinking_tokens": 2048,
            "temperature": 0.7,
            "thinking_depth": ThinkingDepth.MODERATE
        }
        
        # Harbor configuration
        self.harbor_config = {
            "orchestration_mode": "consensus",
            "agent_count": 3,
            "voting_threshold": 0.66,
            "timeout_seconds": 30
        }
    
    def create_thought_chain(self, question: str, context: Dict[str, Any]) -> ThoughtChain:
        """Create a VibeThinker-style thought chain for complex decisions."""
        chain_id = f"chain-{int(datetime.now().timestamp())}"
        chain = ThoughtChain(chain_id=chain_id, question=question)
        
        # Step 1: Problem decomposition
        chain.steps.append({
            "step": "decomposition",
            "thought": f"Breaking down: {question}",
            "substeps": [
                "Identify key factors",
                "Map dependencies",
                "Assess constraints"
            ]
        })
        
        # Step 2: Factor analysis
        factors = context.get("factors", {})
        chain.steps.append({
            "step": "analysis",
            "thought": f"Analyzing {len(factors)} factors",
            "factors": list(factors.keys())
        })
        
        # Step 3: Synthesis
        chain.steps.append({
            "step": "synthesis",
            "thought": "Combining insights to form conclusion",
            "method": "weighted_consensus"
        })
        
        # Generate conclusion based on context
        chain.confidence = self._calculate_confidence(context)
        chain.conclusion = self._generate_conclusion(question, context, chain.confidence)
        chain.tokens_used = sum(len(str(s)) for s in chain.steps)
        
        self.thought_chains.append(chain)
        return chain
    
    def _calculate_confidence(self, context: Dict[str, Any]) -> float:
        """Calculate confidence score based on available data."""
        base_confidence = 0.5
        
        # Boost confidence based on data completeness
        if context.get("historical_data"):
            base_confidence += 0.15
        if context.get("expert_input"):
            base_confidence += 0.1
        if context.get("metrics"):
            base_confidence += 0.1
        if context.get("dependencies_mapped"):
            base_confidence += 0.1
        
        return min(base_confidence, 0.95)
    
    def _generate_conclusion(self, question: str, context: Dict[str, Any], 
                           confidence: float) -> str:
        """Generate reasoning conclusion."""
        if confidence > 0.8:
            certainty = "High confidence"
        elif confidence > 0.6:
            certainty = "Moderate confidence"
        else:
            certainty = "Low confidence"
        
        factors = context.get("factors", {})
        key_factor = max(factors.items(), key=lambda x: x[1])[0] if factors else "general"
        
        return f"{certainty} recommendation based on {key_factor} analysis"
    
    def enhance_wsjf(self, item: Dict[str, Any]) -> WSJFDecision:
        """Enhance WSJF calculation with AI reasoning."""
        # Extract base values
        ubv = item.get("ubv", 5)
        tc = item.get("tc", 5)
        rr = item.get("rr", 5)
        size = item.get("size", 5)
        
        # Calculate base WSJF
        cod = ubv + tc + rr
        base_wsjf = cod / size if size > 0 else 0
        
        # AI adjustments based on mode
        adjustments = {}
        
        if self.mode in [ReasoningMode.VIBETHINKER, ReasoningMode.HYBRID]:
            # VibeThinker: Deep reasoning for complex items
            context = {
                "factors": {"ubv": ubv, "tc": tc, "rr": rr},
                "historical_data": item.get("historical_data", False),
                "metrics": item.get("metrics"),
                "dependencies_mapped": item.get("dependencies", [])
            }
            
            chain = self.create_thought_chain(
                f"Should we prioritize {item.get('id', 'item')}?",
                context
            )
            
            # Apply confidence-weighted adjustment
            adjustments["vibethinker_boost"] = chain.confidence * 0.2
        
        if self.mode in [ReasoningMode.HARBOR, ReasoningMode.HYBRID]:
            # Harbor: Multi-agent consensus
            harbor_score = self._harbor_consensus(item)
            adjustments["harbor_consensus"] = harbor_score * 0.15
        
        # Calculate final score
        total_adjustment = sum(adjustments.values())
        final_score = base_wsjf * (1 + total_adjustment)
        
        decision = WSJFDecision(
            item_id=item.get("id", "unknown"),
            ubv=ubv,
            tc=tc,
            rr=rr,
            size=size,
            cod=cod,
            wsjf_score=base_wsjf,
            reasoning_mode=self.mode,
            thought_chain=chain if self.mode != ReasoningMode.STANDARD else None,
            ai_adjustments=adjustments,
            final_score=final_score
        )
        
        self.decisions.append(decision)
        
        # Log decision
        self.logger.log("ai_enhanced_wsjf", {
            "item_id": decision.item_id,
            "base_wsjf": base_wsjf,
            "final_score": final_score,
            "mode": self.mode.value,
            "adjustments": adjustments,
            "tags": ["ai-reasoning", "wsjf", self.mode.value]
        }, gate="calibration", behavioral_type="advisory",
        economic={"cod": cod, "wsjf_score": final_score})
        
        return decision
    
    def _harbor_consensus(self, item: Dict[str, Any]) -> float:
        """Simulate Harbor multi-agent consensus."""
        import random
        
        # Simulate agent votes
        votes = []
        for i in range(self.harbor_config["agent_count"]):
            # Each agent scores based on different criteria
            agent_score = random.uniform(0.5, 1.0)
            votes.append(agent_score)
        
        # Calculate consensus
        avg_vote = sum(votes) / len(votes)
        agreement = 1 - (max(votes) - min(votes))  # Higher agreement = higher score
        
        return avg_vote * agreement
    
    def prioritize_backlog(self, items: List[Dict[str, Any]]) -> List[WSJFDecision]:
        """Prioritize entire backlog with AI reasoning."""
        decisions = []
        
        for item in items:
            decision = self.enhance_wsjf(item)
            decisions.append(decision)
        
        # Sort by final score
        decisions.sort(key=lambda d: d.final_score, reverse=True)
        
        self.logger.log("backlog_prioritized", {
            "items_count": len(decisions),
            "top_item": decisions[0].item_id if decisions else None,
            "mode": self.mode.value,
            "tags": ["ai-reasoning", "backlog", "prioritization"]
        }, gate="governance", behavioral_type="advisory")
        
        return decisions
    
    def get_dashboard_data(self) -> Dict[str, Any]:
        """Get data for UI dashboard."""
        return {
            "mode": self.mode.value,
            "vibethinker_config": self.vibethinker_config,
            "harbor_config": self.harbor_config,
            "thought_chains_count": len(self.thought_chains),
            "decisions_count": len(self.decisions),
            "avg_confidence": sum(c.confidence for c in self.thought_chains) / len(self.thought_chains) if self.thought_chains else 0,
            "generated_at": datetime.now().isoformat()
        }


class BudgetReplenishment:
    """CapEx/OpEx budget replenishment with temporal tracking."""
    
    def __init__(self):
        self.logger = PatternLogger(
            mode="advisory", circle="budget",
            run_id=f"budget-{int(datetime.now().timestamp())}"
        )
        
        # Budget pools
        self.capex = {
            "total": 100000,
            "allocated": 0,
            "available": 100000,
            "replenishment_rate": 0,  # CapEx doesn't auto-replenish
            "period": "annual"
        }
        
        self.opex = {
            "total": 50000,
            "allocated": 0,
            "available": 50000,
            "replenishment_rate": 50000,  # Monthly replenishment
            "period": "monthly"
        }
        
        self.allocations: List[Dict] = []
    
    def allocate(self, amount: float, budget_type: str, item_id: str, 
                description: str = "") -> Dict[str, Any]:
        """Allocate budget to an item."""
        budget = self.capex if budget_type == "capex" else self.opex
        
        if amount > budget["available"]:
            return {
                "success": False,
                "error": f"Insufficient {budget_type}: need {amount}, have {budget['available']}"
            }
        
        budget["allocated"] += amount
        budget["available"] -= amount
        
        allocation = {
            "id": f"alloc-{int(datetime.now().timestamp())}",
            "item_id": item_id,
            "budget_type": budget_type,
            "amount": amount,
            "description": description,
            "timestamp": datetime.now().isoformat()
        }
        self.allocations.append(allocation)
        
        self.logger.log("budget_allocated", {
            "allocation_id": allocation["id"],
            "item_id": item_id,
            "budget_type": budget_type,
            "amount": amount,
            "remaining": budget["available"],
            "tags": ["budget", budget_type, "allocation"]
        }, gate="governance", behavioral_type="enforcement",
        economic={"cod": amount * 0.1, "wsjf_score": amount / 1000})
        
        return {"success": True, "allocation": allocation, "remaining": budget["available"]}
    
    def replenish(self, budget_type: str = "opex") -> Dict[str, Any]:
        """Replenish budget (typically OpEx at period start)."""
        budget = self.capex if budget_type == "capex" else self.opex
        
        if budget["replenishment_rate"] == 0:
            return {"success": False, "error": f"{budget_type} does not auto-replenish"}
        
        replenish_amount = budget["replenishment_rate"]
        budget["available"] = min(budget["available"] + replenish_amount, budget["total"])
        
        self.logger.log("budget_replenished", {
            "budget_type": budget_type,
            "amount": replenish_amount,
            "new_available": budget["available"],
            "tags": ["budget", budget_type, "replenishment"]
        }, gate="governance", behavioral_type="enforcement")
        
        return {"success": True, "replenished": replenish_amount, "available": budget["available"]}
    
    def get_status(self) -> Dict[str, Any]:
        """Get current budget status."""
        return {
            "capex": self.capex.copy(),
            "opex": self.opex.copy(),
            "allocations_count": len(self.allocations),
            "total_allocated": sum(a["amount"] for a in self.allocations),
            "generated_at": datetime.now().isoformat()
        }


class MethodPatternMatrix:
    """Method pattern availability matrix for governance."""
    
    PATTERNS = {
        "safe_degrade": {
            "description": "Graceful degradation under failure",
            "tiers": [1, 2, 3],
            "gates": ["health", "governance"],
            "required_budget": "opex"
        },
        "guardrail_lock": {
            "description": "Enforce constraints under risk",
            "tiers": [1],
            "gates": ["governance", "guardrail"],
            "required_budget": None
        },
        "iteration_budget": {
            "description": "Track and optimize iteration spending",
            "tiers": [1, 2],
            "gates": ["calibration", "focus"],
            "required_budget": "opex"
        },
        "observability_first": {
            "description": "Prioritize telemetry and monitoring",
            "tiers": [1, 2, 3],
            "gates": ["health"],
            "required_budget": "capex"
        },
        "wsjf_prioritization": {
            "description": "WSJF-based backlog ordering",
            "tiers": [1, 2],
            "gates": ["governance", "calibration"],
            "required_budget": None
        },
        "sft_spectrum": {
            "description": "Spectrum phase - maximize diversity",
            "tiers": [2, 3],
            "gates": ["calibration"],
            "required_budget": "opex"
        },
        "rl_signal": {
            "description": "Signal phase - amplify correct paths",
            "tiers": [2, 3],
            "gates": ["calibration"],
            "required_budget": "opex"
        },
        "goap_planning": {
            "description": "Goal-oriented action planning",
            "tiers": [1, 2],
            "gates": ["governance", "focus"],
            "required_budget": "capex"
        },
        "dream_consolidation": {
            "description": "REM-inspired knowledge consolidation",
            "tiers": [3],
            "gates": ["calibration"],
            "required_budget": "opex"
        },
        "knowledge_transfer": {
            "description": "Cross-agent learning transfer",
            "tiers": [2, 3],
            "gates": ["governance"],
            "required_budget": "opex"
        }
    }
    
    def __init__(self):
        self.availability: Dict[str, bool] = {p: True for p in self.PATTERNS}
    
    def check_availability(self, pattern: str, tier: int, gate: str) -> Dict[str, Any]:
        """Check if a pattern is available for given tier and gate."""
        if pattern not in self.PATTERNS:
            return {"available": False, "reason": "unknown_pattern"}
        
        spec = self.PATTERNS[pattern]
        
        if tier not in spec["tiers"]:
            return {"available": False, "reason": f"not_available_for_tier_{tier}"}
        
        if gate not in spec["gates"]:
            return {"available": False, "reason": f"not_applicable_to_gate_{gate}"}
        
        if not self.availability.get(pattern, False):
            return {"available": False, "reason": "disabled"}
        
        return {
            "available": True,
            "pattern": pattern,
            "description": spec["description"],
            "required_budget": spec["required_budget"]
        }
    
    def get_matrix(self) -> Dict[str, Any]:
        """Get full availability matrix."""
        matrix = {}
        for pattern, spec in self.PATTERNS.items():
            matrix[pattern] = {
                **spec,
                "enabled": self.availability.get(pattern, False)
            }
        return matrix


def main():
    import argparse
    parser = argparse.ArgumentParser(description="AI Reasoning Engine")
    parser.add_argument("command", nargs="?", default="dashboard",
        choices=["dashboard", "enhance", "budget", "matrix", "prioritize"])
    parser.add_argument("--mode", choices=["vibethinker", "harbor", "hybrid", "standard"],
        default="hybrid")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    
    mode = ReasoningMode(args.mode)
    engine = AIReasoningEngine(mode=mode)
    budget = BudgetReplenishment()
    matrix = MethodPatternMatrix()
    
    if args.command == "dashboard":
        result = {
            "ai_reasoning": engine.get_dashboard_data(),
            "budget": budget.get_status(),
            "patterns_enabled": sum(1 for v in matrix.availability.values() if v),
            "patterns_total": len(matrix.PATTERNS)
        }
    elif args.command == "enhance":
        # Demo enhancement
        item = {"id": "DEMO-001", "ubv": 8, "tc": 6, "rr": 7, "size": 3}
        decision = engine.enhance_wsjf(item)
        result = {
            "item_id": decision.item_id,
            "base_wsjf": decision.wsjf_score,
            "final_score": decision.final_score,
            "adjustments": decision.ai_adjustments,
            "mode": decision.reasoning_mode.value
        }
    elif args.command == "budget":
        result = budget.get_status()
    elif args.command == "matrix":
        result = matrix.get_matrix()
    elif args.command == "prioritize":
        # Demo prioritization
        items = [
            {"id": "FEAT-001", "ubv": 8, "tc": 6, "rr": 7, "size": 3},
            {"id": "FEAT-002", "ubv": 5, "tc": 9, "rr": 4, "size": 2},
            {"id": "FEAT-003", "ubv": 9, "tc": 5, "rr": 8, "size": 5},
        ]
        decisions = engine.prioritize_backlog(items)
        result = [{"id": d.item_id, "final_score": d.final_score, "rank": i+1} 
                 for i, d in enumerate(decisions)]
    else:
        result = {"error": "Invalid command"}
    
    print(json.dumps(result, indent=2, default=str))


if __name__ == "__main__":
    main()
