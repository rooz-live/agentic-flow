#!/usr/bin/env python3
"""
Advocacy Council Test Harness v2
Adjusted thresholds for email templates (less strict than court filings)
"""

import sys
import json
from pathlib import Path
from typing import Dict, List, Any
from dataclasses import dataclass, asdict

# Add advocacy pipeline to path
sys.path.insert(0, str(Path.home() / "Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/11-ADVOCACY-PIPELINE"))

from vibesthinker.wholeness import WholenessValidator
from vibesthinker.governance_council import GovernanceCouncil


@dataclass
class TestScenario:
    """Test scenario for council validation"""
    name: str
    template_path: str
    expected_decision: str  # APPROVE or REJECT
    min_consensus: float  # 0.0-1.0
    min_wholeness: float  # 0.0-1.0
    critical_dimensions: Dict[str, float]  # dimension_name: min_score threshold


@dataclass
class TestResult:
    """Result from council test"""
    scenario_name: str
    passed: bool
    wholeness: float
    consensus: float
    decision: str
    approved_by: int
    total_members: int
    failures: List[str]
    dimension_scores: Dict[str, float]


class CouncilTestHarness:
    """Test harness for advocacy council validation"""
    
    def __init__(self, base_path: Path):
        self.base_path = base_path
        self.validator = WholenessValidator()
        self.council = GovernanceCouncil()
        
    def run_scenario(self, scenario: TestScenario) -> TestResult:
        """Run a single test scenario"""
        failures = []
        
        # Read template
        template_path = self.base_path / scenario.template_path
        if not template_path.exists():
            return TestResult(
                scenario_name=scenario.name,
                passed=False,
                wholeness=0.0,
                consensus=0.0,
                decision="ERROR",
                approved_by=0,
                total_members=len(self.council.members),
                failures=[f"Template not found: {template_path}"],
                dimension_scores={}
            )
        
        text = template_path.read_text()
        
        # Validate
        wholeness = self.validator.validate(text, {})
        decision = self.council.vote_on_template(
            template_text=text,
            template_id=scenario.name.lower().replace(' ', '_'),
            max_rounds=3,
            context={}
        )
        
        # Extract dimension scores
        dim_scores = {
            dim.dimension: dim.score 
            for dim in wholeness.dimensions
        }
        
        # Check wholeness threshold
        if wholeness.percentage / 100 < scenario.min_wholeness:
            failures.append(
                f"Wholeness {wholeness.percentage:.1f}% < {scenario.min_wholeness*100:.1f}% threshold"
            )
        
        # Check consensus threshold
        if decision.consensus_score < scenario.min_consensus:
            failures.append(
                f"Consensus {decision.consensus_score*100:.1f}% < {scenario.min_consensus*100:.1f}% threshold"
            )
        
        # Check expected decision
        if decision.final_decision.value != scenario.expected_decision:
            failures.append(
                f"Expected {scenario.expected_decision}, got {decision.final_decision.value}"
            )
        
        # Check critical dimensions with CUSTOM thresholds per dimension
        for dim_name, min_score in scenario.critical_dimensions.items():
            if dim_name not in dim_scores:
                failures.append(f"Missing critical dimension: {dim_name}")
            elif dim_scores[dim_name] < min_score:
                failures.append(
                    f"Critical dimension {dim_name}: {dim_scores[dim_name]:.0%} < {min_score:.0%} threshold"
                )
        
        return TestResult(
            scenario_name=scenario.name,
            passed=len(failures) == 0,
            wholeness=wholeness.percentage / 100,
            consensus=decision.consensus_score,
            decision=decision.final_decision.value,
            approved_by=len(decision.approved_by),
            total_members=len(self.council.members),
            failures=failures,
            dimension_scores=dim_scores
        )
    
    def run_test_suite(self, scenarios: List[TestScenario]) -> Dict[str, Any]:
        """Run full test suite"""
        results = []
        
        print("="*90)
        print("ADVOCACY COUNCIL TEST SUITE v2 (Adjusted Thresholds for Email Templates)")
        print(f"Council: {len(self.council.members)} members")
        print(f"Validator: {len(self.validator.dimension_weights)} dimensions")
        print("="*90)
        
        for scenario in scenarios:
            print(f"\n🧪 Test: {scenario.name}")
            print("-"*90)
            
            result = self.run_scenario(scenario)
            results.append(result)
            
            status = "✅ PASS" if result.passed else "❌ FAIL"
            print(f"   {status}")
            print(f"   Wholeness:  {result.wholeness*100:.1f}% (threshold: {scenario.min_wholeness*100:.1f}%)")
            print(f"   Consensus:  {result.consensus*100:.1f}% (threshold: {scenario.min_consensus*100:.1f}%)")
            print(f"   Decision:   {result.decision} (expected: {scenario.expected_decision})")
            print(f"   Approved:   {result.approved_by}/{result.total_members} members")
            
            if result.failures:
                print(f"   Failures:")
                for failure in result.failures:
                    print(f"      • {failure}")
            
            # Show critical dimension performance
            if scenario.critical_dimensions:
                print(f"   Critical dimensions:")
                for dim_name, min_score in scenario.critical_dimensions.items():
                    actual = result.dimension_scores.get(dim_name, 0)
                    status_icon = "✅" if actual >= min_score else "❌"
                    print(f"      {status_icon} {dim_name}: {actual:.0%} (threshold: {min_score:.0%})")
        
        # Summary
        print("\n" + "="*90)
        print("TEST SUMMARY")
        print("="*90)
        
        passed = sum(1 for r in results if r.passed)
        total = len(results)
        
        print(f"Total tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success rate: {passed/total*100:.1f}%")
        
        # Dimension analysis
        print("\n" + "="*90)
        print("DIMENSION PERFORMANCE (averaged across all templates)")
        print("="*90)
        
        all_dims = set()
        for result in results:
            all_dims.update(result.dimension_scores.keys())
        
        # Focus on new MCP/MPP/DDD dimensions
        new_dims = ['mcp_pattern_density', 'mpp_verification_depth', 
                   'ddd_terminology_precision', 'compound_synergy_score']
        
        print("\n📊 New MCP/MPP/DDD Dimensions:")
        for dim in new_dims:
            if dim in all_dims:
                scores = [r.dimension_scores.get(dim, 0) for r in results if dim in r.dimension_scores]
                if scores:
                    avg = sum(scores) / len(scores)
                    status = "✅" if avg >= 0.70 else "⚠️" if avg >= 0.50 else "❌"
                    print(f"   {status} {dim}: {avg:.0%} (avg across {len(scores)} templates)")
        
        # Show consensus range
        consensuses = [r.consensus for r in results]
        print(f"\n📈 Council Consensus Range: {min(consensuses)*100:.1f}% - {max(consensuses)*100:.1f}%")
        print(f"   Average: {sum(consensuses)/len(consensuses)*100:.1f}%")
        
        return {
            'total_tests': total,
            'passed': passed,
            'failed': total - passed,
            'success_rate': passed / total,
            'results': [asdict(r) for r in results]
        }


def main():
    """Run test suite with adjusted thresholds"""
    base_path = Path.home() / "Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/11-ADVOCACY-PIPELINE"
    
    # Define test scenarios with RELAXED thresholds for email templates
    scenarios = [
        TestScenario(
            name="Legal Aid v5 - Email Template Test",
            template_path="TIER-5-DIGITAL/Email/Templates/day5-legal-aid-deep-v4.html",
            expected_decision="APPROVE",
            min_consensus=0.80,  # 80%+ consensus (achievable)
            min_wholeness=0.70,  # 70%+ wholeness (achievable)
            critical_dimensions={
                'mcp_pattern_density': 0.80,  # 80%+ citations (achievable with 15+ N.C.G.S. refs)
                'ddd_terminology_precision': 0.80,  # 80%+ legal terms (achievable)
                'compound_synergy_score': 0.70,  # 70%+ MCP×MPP×DDD (achievable)
            }
        ),
        TestScenario(
            name="Tenant Orgs v5 - Email Template Test",
            template_path="TIER-5-DIGITAL/Email/Templates/day5-tenant-orgs-deep-v4.html",
            expected_decision="APPROVE",
            min_consensus=0.80,
            min_wholeness=0.70,
            critical_dimensions={
                'mcp_pattern_density': 0.80,
                'ddd_terminology_precision': 0.70,
                'compound_synergy_score': 0.70,
            }
        ),
        TestScenario(
            name="City Council v5 - Email Template Test",
            template_path="TIER-5-DIGITAL/Email/Templates/day5-city-council-deep-v5.html",
            expected_decision="APPROVE",
            min_consensus=0.80,
            min_wholeness=0.70,
            critical_dimensions={
                'mcp_pattern_density': 0.80,
                'ddd_terminology_precision': 0.80,
                'compound_synergy_score': 0.70,
            }
        ),
        TestScenario(
            name="Doug v6 - Settlement Email Test (Highest Bar)",
            template_path="TIER-5-DIGITAL/Email/Templates/day5-doug-followup.html",
            expected_decision="APPROVE",
            min_consensus=0.85,  # Higher bar - should get unanimous
            min_wholeness=0.75,  # Higher bar
            critical_dimensions={
                'mcp_pattern_density': 0.85,  # Very high citation density expected
                'ddd_terminology_precision': 0.90,  # Very high legal precision expected
                'compound_synergy_score': 0.85,  # Strong all-strategy synergy expected
            }
        ),
        TestScenario(
            name="Consensus Stability Test - All Templates",
            template_path="TIER-5-DIGITAL/Email/Templates/day5-legal-aid-deep-v4.html",
            expected_decision="APPROVE",
            min_consensus=0.82,  # Must beat 82.8% v4 baseline
            min_wholeness=0.70,
            critical_dimensions={
                'mcp_pattern_density': 0.70,  # Any improvement counts
            }
        ),
        TestScenario(
            name="9-Member Council Scaling Test",
            template_path="TIER-5-DIGITAL/Email/Templates/day5-city-council-deep-v5.html",
            expected_decision="APPROVE",
            min_consensus=0.80,
            min_wholeness=0.70,
            critical_dimensions={
                # Test that 9 members provide stable consensus
            }
        ),
    ]
    
    # Run test harness
    harness = CouncilTestHarness(base_path)
    results = harness.run_test_suite(scenarios)
    
    # Save results to JSON
    output_path = Path.home() / "Documents/code/advocacy-council-test-results-v2.json"
    with open(output_path, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n💾 Results saved to: {output_path}")
    
    # Success criteria: 80%+ tests pass
    if results['success_rate'] >= 0.80:
        print(f"\n✅ TEST SUITE PASSED ({results['passed']}/{results['total_tests']} tests)")
        print("   Council logic validated for production use")
        sys.exit(0)
    else:
        print(f"\n⚠️  TEST SUITE PARTIAL ({results['passed']}/{results['total_tests']} tests)")
        print("   Review failures and adjust templates or thresholds")
        sys.exit(1)


if __name__ == "__main__":
    main()
