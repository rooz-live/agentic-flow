#!/usr/bin/env python3
"""
Enhanced Production Orchestrator with Compounding Benefits
Utilizes learning evidence to create economic compounding effects
"""

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Any, Tuple
from datetime import datetime, timedelta, timezone

# Validate critical imports
try:
    from cmd_prod import NeedsAssessor, ProdOrchestrator
except ImportError as e:
    print(f"❌ CRITICAL: Cannot import cmd_prod module")
    print(f"   Error: {e}")
    print(f"   Ensure cmd_prod.py exists in scripts/ directory")
    sys.exit(1)

PROJECT_ROOT = Path(__file__).resolve().parent.parent

# Externalized Maturity Thresholds (configurable via env vars)
MATURITY_THRESHOLDS = {
    "production": (int(os.getenv("AF_MATURITY_THRESHOLD_PRODUCTION", "85")), float(os.getenv("AF_MATURITY_MULT_PRODUCTION", "5.0"))),
    "mature": (int(os.getenv("AF_MATURITY_THRESHOLD_MATURE", "70")), float(os.getenv("AF_MATURITY_MULT_MATURE", "3.0"))),
    "developing": (int(os.getenv("AF_MATURITY_THRESHOLD_DEVELOPING", "40")), float(os.getenv("AF_MATURITY_MULT_DEVELOPING", "1.5"))),
    "immature": (int(os.getenv("AF_MATURITY_THRESHOLD_IMMATURE", "0")), float(os.getenv("AF_MATURITY_MULT_IMMATURE", "0.5")))
}

# Externalized Velocity Thresholds
VELOCITY_THRESHOLDS = {
    "rapid_improvement": (float(os.getenv("AF_VELOCITY_RAPID_THRESHOLD", "2.0")), float(os.getenv("AF_VELOCITY_RAPID_MULT", "2.0"))),
    "steady_improvement": (float(os.getenv("AF_VELOCITY_STEADY_THRESHOLD", "0.5")), float(os.getenv("AF_VELOCITY_STEADY_MULT", "1.5"))),
    "stable": (float(os.getenv("AF_VELOCITY_STABLE_THRESHOLD", "-0.5")), float(os.getenv("AF_VELOCITY_STABLE_MULT", "1.0"))),
    "slight_degradation": (float(os.getenv("AF_VELOCITY_DEGRADE_THRESHOLD", "-2.0")), float(os.getenv("AF_VELOCITY_DEGRADE_MULT", "0.75"))),
    "rapid_degradation": (float("-inf"), float(os.getenv("AF_VELOCITY_RAPID_DEGRADE_MULT", "0.5")))
}

# Externalized Confidence Thresholds
CONFIDENCE_THRESHOLDS = {
    "high": (float(os.getenv("AF_CONFIDENCE_HIGH_THRESHOLD", "90")), float(os.getenv("AF_CONFIDENCE_HIGH_MULT", "1.2"))),
    "normal": (float(os.getenv("AF_CONFIDENCE_NORMAL_THRESHOLD", "70")), float(os.getenv("AF_CONFIDENCE_NORMAL_MULT", "1.0"))),
    "low": (float(os.getenv("AF_CONFIDENCE_LOW_THRESHOLD", "0")), float(os.getenv("AF_CONFIDENCE_LOW_MULT", "0.8")))
}

# Externalized Autocommit Thresholds
AUTOCOMMIT_THRESHOLDS = {
    "low_risk": {
        "maturity": int(os.getenv("AF_AUTOCOMMIT_LOW_MATURITY", "70")),
        "green_streak": int(os.getenv("AF_AUTOCOMMIT_LOW_STREAK", "5")),
        "infra_stability": int(os.getenv("AF_AUTOCOMMIT_LOW_INFRA", "80"))
    },
    "medium_risk": {
        "maturity": int(os.getenv("AF_AUTOCOMMIT_MEDIUM_MATURITY", "85")),
        "green_streak": int(os.getenv("AF_AUTOCOMMIT_MEDIUM_STREAK", "10")),
        "infra_stability": int(os.getenv("AF_AUTOCOMMIT_MEDIUM_INFRA", "90"))
    },
    "high_risk": {
        "maturity": int(os.getenv("AF_AUTOCOMMIT_HIGH_MATURITY", "95")),
        "green_streak": int(os.getenv("AF_AUTOCOMMIT_HIGH_STREAK", "20")),
        "infra_stability": int(os.getenv("AF_AUTOCOMMIT_HIGH_INFRA", "95"))
    }
}


class CompoundingBenefitsEngine:
    """
    Applies compounding benefits from production learning evidence
    Transforms static orchestration into adaptive, self-improving system
    """
    
    def __init__(self):
        self.goalie_path = PROJECT_ROOT / ".goalie"
        self.learning_evidence_path = self.goalie_path / "prod_learning_evidence.jsonl"
        self.compound_history_path = self.goalie_path / "compound_history.jsonl"
        
    def load_latest_learning_evidence(self) -> Dict[str, Any]:
        """Load most recent learning evidence"""
        if not self.learning_evidence_path.exists():
            return {}
        
        with open(self.learning_evidence_path) as f:
            lines = f.readlines()
            if not lines:
                return {}
            try:
                return json.loads(lines[-1])
            except:
                return {}
    
    def load_learning_history(self, days: int = 7) -> List[Dict[str, Any]]:
        """Load historical learning evidence for trend analysis"""
        if not self.learning_evidence_path.exists():
            return []
        
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        history = []
        
        with open(self.learning_evidence_path) as f:
            for line in f:
                try:
                    evidence = json.loads(line)
                    timestamp = datetime.fromisoformat(evidence["timestamp"].replace("Z", ""))
                    if timestamp >= cutoff:
                        history.append(evidence)
                except:
                    continue
        
        return history
    
    def calculate_maturity_velocity(self, history: List[Dict]) -> float:
        """
        Calculate rate of maturity improvement
        Positive velocity = System learning
        Negative velocity = System degrading
        """
        if len(history) < 2:
            return 0.0
        
        scores = [h.get("maturity_score", 50) for h in history]
        # Simple linear regression slope
        n = len(scores)
        x_mean = n / 2
        y_mean = sum(scores) / n
        
        numerator = sum((i - x_mean) * (scores[i] - y_mean) for i in range(n))
        denominator = sum((i - x_mean) ** 2 for i in range(n))
        
        if denominator == 0:
            return 0.0
        
        velocity = numerator / denominator
        return round(velocity, 3)
    
    def apply_compounding_multipliers(self, 
                                     base_params: Dict[str, Any],
                                     learning: Dict[str, Any],
                                     history: List[Dict]) -> Dict[str, Any]:
        """
        Apply compounding multipliers based on maturity and velocity
        
        Compounding Formula:
        adjusted_iters = base_iters * maturity_multiplier * velocity_multiplier * confidence_multiplier
        
        Key Insight: Mature, improving systems can handle exponentially more load
        """
        maturity_score = learning.get("maturity_score", 50)
        velocity = self.calculate_maturity_velocity(history)
        
        # 1. MATURITY MULTIPLIER (configurable via AF_MATURITY_* env vars)
        # Higher maturity = Can handle more iterations
        maturity_mult = MATURITY_THRESHOLDS["immature"][1]  # Default
        for level in ["production", "mature", "developing", "immature"]:
            threshold, mult = MATURITY_THRESHOLDS[level]
            if maturity_score >= threshold:
                maturity_mult = mult
                break
        
        # 2. VELOCITY MULTIPLIER (configurable via AF_VELOCITY_* env vars)
        # Positive velocity = System improving, increase aggressiveness
        # Negative velocity = System degrading, decrease aggressiveness
        velocity_mult = VELOCITY_THRESHOLDS["rapid_degradation"][1]  # Default
        for level in ["rapid_improvement", "steady_improvement", "stable", "slight_degradation", "rapid_degradation"]:
            threshold, mult = VELOCITY_THRESHOLDS[level]
            if velocity > threshold:
                velocity_mult = mult
                break
        
        # 3. CONFIDENCE MULTIPLIER (configurable via AF_CONFIDENCE_* env vars)
        # Based on infrastructure stability and deployment health
        infra_stability = learning.get("infrastructure_stability", 50)
        deploy_health = learning.get("deployment_health_score", 50)
        confidence = (infra_stability + deploy_health) / 2
        
        confidence_mult = CONFIDENCE_THRESHOLDS["low"][1]  # Default
        for level in ["high", "normal", "low"]:
            threshold, mult = CONFIDENCE_THRESHOLDS[level]
            if confidence > threshold:
                confidence_mult = mult
                break
        
        # 4. REVENUE DIVERSIFICATION MULTIPLIER (0.8x - 1.3x)
        # Low concentration = Sustainable, can scale up
        risk_level = learning.get("revenue_concentration_risk", "unknown")
        if risk_level == "LOW":
            revenue_mult = 1.3  # Well-diversified
        elif risk_level == "MEDIUM":
            revenue_mult = 1.0  # Moderate concentration
        else:
            revenue_mult = 0.8  # High concentration, reduce risk
        
        # Apply compound multipliers
        compound_mult = maturity_mult * velocity_mult * confidence_mult * revenue_mult
        
        # Adjust parameters
        enhanced_params = base_params.copy()
        enhanced_params["recommended_cycle_iters"] = max(1, int(
            base_params.get("recommended_cycle_iters", 5) * compound_mult
        ))
        enhanced_params["recommended_swarm_iters"] = max(5, int(
            base_params.get("recommended_swarm_iters", 10) * compound_mult
        ))
        
        # Mode selection based on maturity
        if maturity_score >= 85 and infra_stability >= 95:
            enhanced_params["recommended_mode"] = "enforcement"
        elif maturity_score >= 70 and infra_stability >= 80:
            enhanced_params["recommended_mode"] = "mutate"
        else:
            enhanced_params["recommended_mode"] = "advisory"
        
        # Add compounding metadata
        enhanced_params["compounding"] = {
            "maturity_multiplier": maturity_mult,
            "velocity_multiplier": velocity_mult,
            "confidence_multiplier": confidence_mult,
            "revenue_multiplier": revenue_mult,
            "total_multiplier": round(compound_mult, 2),
            "maturity_score": maturity_score,
            "velocity": velocity,
            "confidence": confidence
        }
        
        return enhanced_params
    
    def apply_graduated_autocommit(self, 
                                   learning: Dict[str, Any],
                                   history: List[Dict]) -> Dict[str, bool]:
        """
        Determine graduated autocommit eligibility
        Returns dict of autocommit permissions by risk level
        """
        maturity = learning.get("maturity_score", 0)
        infra_stability = learning.get("infrastructure_stability", 0)
        revenue_risk = learning.get("revenue_concentration_risk", "HIGH")
        
        # Count green streak (consecutive high-maturity cycles)
        green_streak = 0
        for h in reversed(history[-20:]):  # Last 20 cycles
            if h.get("maturity_score", 0) >= 85:
                green_streak += 1
            else:
                break
        
        # Graduated autocommit levels
        autocommit = {
            "low_risk": False,      # Simple, low-impact changes
            "medium_risk": False,   # Standard changes
            "high_risk": False      # Complex, high-impact changes
        }
        
        # LOW RISK: Configurable via AF_AUTOCOMMIT_LOW_* env vars
        low_cfg = AUTOCOMMIT_THRESHOLDS["low_risk"]
        if maturity >= low_cfg["maturity"] and green_streak >= low_cfg["green_streak"] and infra_stability >= low_cfg["infra_stability"]:
            autocommit["low_risk"] = True
        
        # MEDIUM RISK: Configurable via AF_AUTOCOMMIT_MEDIUM_* env vars
        med_cfg = AUTOCOMMIT_THRESHOLDS["medium_risk"]
        if maturity >= med_cfg["maturity"] and green_streak >= med_cfg["green_streak"] and infra_stability >= med_cfg["infra_stability"] and revenue_risk == "LOW":
            autocommit["medium_risk"] = True
        
        # HIGH RISK: Configurable via AF_AUTOCOMMIT_HIGH_* env vars
        high_cfg = AUTOCOMMIT_THRESHOLDS["high_risk"]
        if maturity >= high_cfg["maturity"] and green_streak >= high_cfg["green_streak"] and infra_stability >= high_cfg["infra_stability"] and revenue_risk == "LOW":
            autocommit["high_risk"] = True
        
        return {
            "autocommit_permissions": autocommit,
            "green_streak": green_streak,
            "explanation": self._explain_autocommit(autocommit, maturity, green_streak)
        }
    
    def _explain_autocommit(self, permissions: Dict, maturity: float, streak: int) -> str:
        """Explain autocommit decision"""
        enabled = [k for k, v in permissions.items() if v]
        if not enabled:
            return f"Autocommit NOT READY (maturity={maturity}, streak={streak})"
        return f"Autocommit ENABLED for {', '.join(enabled)} (maturity={maturity}, streak={streak})"
    
    def calculate_economic_compounding(self, 
                                      enhanced_params: Dict,
                                      base_params: Dict) -> Dict[str, Any]:
        """
        Calculate economic value from compounding benefits
        
        Economic Compounding:
        - Throughput multiplier → More work completed per hour
        - Cost reduction → Fewer human interventions needed
        - Velocity increase → Faster time to value
        """
        compound = enhanced_params.get("compounding", {})
        total_mult = compound.get("total_multiplier", 1.0)
        
        base_cycle_iters = base_params.get("recommended_cycle_iters", 5)
        enhanced_cycle_iters = enhanced_params.get("recommended_cycle_iters", 5)
        
        # Throughput gain (iterations per hour)
        base_throughput = base_cycle_iters * 60  # Assume 1 iter/min baseline
        enhanced_throughput = enhanced_cycle_iters * 60
        throughput_gain = enhanced_throughput - base_throughput
        throughput_gain_pct = (throughput_gain / base_throughput * 100) if base_throughput > 0 else 0
        
        # Cost reduction (fewer manual interventions)
        autocommit = enhanced_params.get("autocommit_graduation", {})
        permissions = autocommit.get("autocommit_permissions", {})
        enabled_count = sum(1 for v in permissions.values() if v)
        cost_reduction_pct = enabled_count * 30  # 30% per level (up to 90% total)
        
        # Velocity increase (time to production)
        maturity = compound.get("maturity_score", 50)
        if maturity >= 85:
            velocity_mult = 10.0  # 10x faster deployments
        elif maturity >= 70:
            velocity_mult = 5.0
        elif maturity >= 40:
            velocity_mult = 2.0
        else:
            velocity_mult = 1.0
        
        # Economic value estimation
        # Assume baseline cost: $100/hour for manual operations
        base_hourly_cost = 100
        enhanced_hourly_cost = base_hourly_cost * (1 - cost_reduction_pct / 100)
        hourly_savings = base_hourly_cost - enhanced_hourly_cost
        
        # Assume baseline value: $500/deployment
        base_deploy_value = 500
        enhanced_deploy_value = base_deploy_value * velocity_mult
        value_gain = enhanced_deploy_value - base_deploy_value
        
        return {
            "throughput_gain_pct": round(throughput_gain_pct, 1),
            "cost_reduction_pct": round(cost_reduction_pct, 1),
            "velocity_multiplier": velocity_mult,
            "hourly_savings_usd": round(hourly_savings, 2),
            "value_gain_per_deploy_usd": round(value_gain, 2),
            "annual_savings_projection_usd": round(hourly_savings * 2080, 2),  # 2080 work hours/year
            "roi_multiplier": round(total_mult, 2)
        }
    
    def save_compound_history(self, enhanced_params: Dict):
        """Save compounding history for trend analysis"""
        record = {
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "compounding": enhanced_params.get("compounding", {}),
            "economic": enhanced_params.get("economic_compounding", {}),
            "autocommit": enhanced_params.get("autocommit_graduation", {}),
            "cycle_iters": enhanced_params.get("recommended_cycle_iters"),
            "swarm_iters": enhanced_params.get("recommended_swarm_iters"),
            "mode": enhanced_params.get("recommended_mode")
        }
        
        with open(self.compound_history_path, "a") as f:
            f.write(json.dumps(record) + "\n")
    
    def enhance_needs_assessment(self, base_params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main entry point: Enhance base assessment with compounding benefits
        """
        # Load learning evidence
        learning = self.load_latest_learning_evidence()
        history = self.load_learning_history(days=14)  # 2 weeks
        
        if not learning:
            # No learning data yet, return base params
            base_params["compounding_status"] = "NO_LEARNING_DATA"
            return base_params
        
        # Apply compounding multipliers
        enhanced_params = self.apply_compounding_multipliers(base_params, learning, history)
        
        # Apply graduated autocommit
        autocommit = self.apply_graduated_autocommit(learning, history)
        enhanced_params["autocommit_graduation"] = autocommit
        
        # Calculate economic benefits
        economic = self.calculate_economic_compounding(enhanced_params, base_params)
        enhanced_params["economic_compounding"] = economic
        
        # Save for historical analysis
        self.save_compound_history(enhanced_params)
        
        enhanced_params["compounding_status"] = "ACTIVE"
        enhanced_params["compounding_enabled"] = True
        
        return enhanced_params


class EnhancedProdOrchestrator:
    """Production orchestrator with compounding benefits integration"""
    
    def __init__(self):
        # cmd_prod imports validated at module import time
        self.base_orchestrator = ProdOrchestrator()
        self.needs_assessor = NeedsAssessor()
        self.compounding_engine = CompoundingBenefitsEngine()
    
    def _run_command(self, cmd: List[str], env: Dict[str, str] = None, timeout: int = 300) -> Tuple[int, str]:
        """Run a shell command with timeout guard"""
        import os
        cmd_env = os.environ.copy()
        if env:
            cmd_env.update(env)
        
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=timeout,
                env=cmd_env
            )
            return result.returncode, result.stdout + result.stderr
        except subprocess.TimeoutExpired:
            return 124, f"Command timed out after {timeout}s: {' '.join(cmd)}"
        except Exception as e:
            return 1, str(e)
    
    def run(self, rotations: int = 3, mode: str = "advisory", 
            assess_only: bool = False, json_output: bool = False):
        """
        Enhanced orchestration with compounding benefits
        """
        # Get base needs assessment
        base_assessment = self.needs_assessor.assess_needs()
        
        # Enhance with compounding benefits
        enhanced_assessment = self.compounding_engine.enhance_needs_assessment(base_assessment)
        
        if json_output:
            print(json.dumps(enhanced_assessment, indent=2))
            return
        
        # Print enhanced assessment
        self._print_assessment(base_assessment, enhanced_assessment)
        
        if assess_only:
            return
        
        # Execute with enhanced parameters
        cycle_iters = enhanced_assessment["recommended_cycle_iters"]
        swarm_iters = enhanced_assessment["recommended_swarm_iters"]
        exec_mode = enhanced_assessment.get("recommended_mode", mode)
        
        for rotation in range(1, rotations + 1):
            print(f"\n{'='*70}")
            print(f"🔄 ROTATION {rotation}/{rotations}")
            print(f"{'='*70}\n")
            
            # Run prod-cycle
            success = self.base_orchestrator.run_prod_cycle(
                cycle_iters, 
                exec_mode,
                with_health=True,
                with_evidence=True
            )
            
            if not success:
                print("\n⚠️  Cycle failed, stopping rotation")
                break
            
            # Run prod-swarm
            self.base_orchestrator.run_prod_swarm(
                swarm_iters,
                with_health=True,
                with_evidence=True
            )
    
    def _print_assessment(self, base: Dict, enhanced: Dict):
        """Print comparison of base vs enhanced assessment"""
        print("\n" + "="*70)
        print("📊 PRODUCTION MATURITY ASSESSMENT")
        print("="*70)
        
        if enhanced.get("compounding_status") == "NO_LEARNING_DATA":
            print("\n⚠️  No learning data available yet. Run `./run_production_cycle.sh` first.")
            print("Using baseline heuristics...\n")
            return
        
        compound = enhanced.get("compounding", {})
        economic = enhanced.get("economic_compounding", {})
        autocommit = enhanced.get("autocommit_graduation", {})
        
        print(f"\n🎯 Maturity Score: {compound.get('maturity_score', 0)}/100")
        print(f"📈 Velocity: {compound.get('velocity', 0):.2f} points/day")
        print(f"💪 Confidence: {compound.get('confidence', 0):.1f}%")
        
        print(f"\n🔢 COMPOUNDING MULTIPLIERS:")
        print(f"   Maturity:    {compound.get('maturity_multiplier', 1.0):.1f}x")
        print(f"   Velocity:    {compound.get('velocity_multiplier', 1.0):.1f}x")
        print(f"   Confidence:  {compound.get('confidence_multiplier', 1.0):.1f}x")
        print(f"   Revenue:     {compound.get('revenue_multiplier', 1.0):.1f}x")
        print(f"   ─────────────────────────")
        print(f"   TOTAL:       {compound.get('total_multiplier', 1.0):.2f}x")
        
        print(f"\n📊 RECOMMENDED PARAMETERS:")
        print(f"   Base → Enhanced")
        print(f"   Cycle Iters:  {base['recommended_cycle_iters']:2d} → {enhanced['recommended_cycle_iters']:2d}")
        print(f"   Swarm Iters:  {base['recommended_swarm_iters']:2d} → {enhanced['recommended_swarm_iters']:2d}")
        print(f"   Mode:         {base.get('recommended_mode', 'advisory'):12s} → {enhanced.get('recommended_mode', 'advisory')}")
        
        print(f"\n🎓 GRADUATED AUTOCOMMIT:")
        permissions = autocommit.get("autocommit_permissions", {})
        print(f"   Low Risk:    {'✅ ENABLED' if permissions.get('low_risk') else '❌ Disabled'}")
        print(f"   Medium Risk: {'✅ ENABLED' if permissions.get('medium_risk') else '❌ Disabled'}")
        print(f"   High Risk:   {'✅ ENABLED' if permissions.get('high_risk') else '❌ Disabled'}")
        print(f"   Green Streak: {autocommit.get('green_streak', 0)} cycles")
        print(f"   {autocommit.get('explanation', '')}")
        
        print(f"\n💰 ECONOMIC COMPOUNDING:")
        print(f"   Throughput Gain:  +{economic.get('throughput_gain_pct', 0):.1f}%")
        print(f"   Cost Reduction:   -{economic.get('cost_reduction_pct', 0):.1f}%")
        print(f"   Velocity:         {economic.get('velocity_multiplier', 1.0):.1f}x faster")
        print(f"   Hourly Savings:   ${economic.get('hourly_savings_usd', 0):.2f}")
        print(f"   Annual Savings:   ${economic.get('annual_savings_projection_usd', 0):,.2f}")
        print(f"   ROI Multiplier:   {economic.get('roi_multiplier', 1.0):.2f}x")
        
        print("\n" + "="*70 + "\n")


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Enhanced Production Orchestrator with Compounding Benefits")
    parser.add_argument("--rotations", type=int, default=3, help="Number of cycle→swarm rotations")
    parser.add_argument("--mode", choices=["advisory", "mutate", "enforcement"], default="advisory")
    parser.add_argument("--assess-only", action="store_true", help="Only assess, don't execute")
    parser.add_argument("--json", action="store_true", help="Output JSON format")
    
    args = parser.parse_args()
    
    orchestrator = EnhancedProdOrchestrator()
    orchestrator.run(
        rotations=args.rotations,
        mode=args.mode,
        assess_only=args.assess_only,
        json_output=args.json
    )


if __name__ == "__main__":
    main()
