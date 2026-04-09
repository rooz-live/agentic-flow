#!/usr/bin/env python3
"""
Evidence DB Integration Test Harness
Tests cross-reference validation between templates and Evidence DB
"""

import sys
from pathlib import Path

# Add advocacy pipeline to path
sys.path.insert(0, str(Path.home() / "Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/11-ADVOCACY-PIPELINE"))

from vibesthinker.wholeness import WholenessValidator


def test_evidence_db_integration():
    """Test Evidence DB cross-reference validation"""
    
    print("="*90)
    print("EVIDENCE DB INTEGRATION TEST")
    print("="*90)
    
    # Template paths
    templates = {
        'Legal Aid v5': 'TIER-5-DIGITAL/Email/Templates/day5-legal-aid-deep-v4.html',
        'Tenant Orgs v5': 'TIER-5-DIGITAL/Email/Templates/day5-tenant-orgs-deep-v4.html',
        'City Council v5': 'TIER-5-DIGITAL/Email/Templates/day5-city-council-deep-v5.html',
        'Doug v6': 'TIER-5-DIGITAL/Email/Templates/day5-doug-followup.html',
    }
    
    # Base path
    base_path = Path.home() / "Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/11-ADVOCACY-PIPELINE"
    
    validator = WholenessValidator()
    
    results = []
    
    for name, rel_path in templates.items():
        print(f"\n📧 Testing: {name}")
        print("-"*90)
        
        template_path = base_path / rel_path
        if not template_path.exists():
            print(f"   ❌ Template not found: {template_path}")
            continue
        
        text = template_path.read_text()
        
        # Test WITHOUT Evidence DB (heuristic mode)
        wholeness_no_db = validator.validate(text, {})
        evidence_dim_no_db = next(
            (d for d in wholeness_no_db.dimensions if d.dimension == 'evidence_alignment'),
            None
        )
        
        # Test WITH Evidence DB (cross-reference mode)
        wholeness_with_db = validator.validate(text, {
            'evidence_db_path': 'tracking/advocacy-evidence.db'
        })
        evidence_dim_with_db = next(
            (d for d in wholeness_with_db.dimensions if d.dimension == 'evidence_alignment'),
            None
        )
        
        if not evidence_dim_no_db or not evidence_dim_with_db:
            print(f"   ⚠️  evidence_alignment dimension not found")
            continue
        
        # Compare scores
        score_no_db = evidence_dim_no_db.score
        score_with_db = evidence_dim_with_db.score
        improvement = score_with_db - score_no_db
        
        status = "✅" if score_with_db >= 0.70 else "⚠️"
        
        print(f"   {status} Evidence Alignment Scores:")
        print(f"      Without DB (heuristic): {score_no_db:.0%}")
        print(f"      With DB (cross-ref):    {score_with_db:.0%}")
        print(f"      Improvement:            {improvement:+.0%}")
        
        # Show DB cross-reference details
        if evidence_dim_with_db.details.get('db_available'):
            print(f"\n   📊 Cross-Reference Details:")
            details = evidence_dim_with_db.details
            print(f"      Dates checked:   {details.get('dates_checked', 0)}")
            print(f"      Dates matched:   {details.get('dates_matched', 0)}")
            print(f"      Amounts checked: {details.get('amounts_checked', 0)}")
            print(f"      Amounts matched: {details.get('amounts_matched', 0)}")
            print(f"      Match rate:      {details.get('match_rate', 0):.0%}")
        
        # Check overall wholeness impact
        wholeness_improvement = wholeness_with_db.percentage - wholeness_no_db.percentage
        print(f"\n   📈 Overall Wholeness Impact:")
        print(f"      Without DB: {wholeness_no_db.percentage:.1f}%")
        print(f"      With DB:    {wholeness_with_db.percentage:.1f}%")
        print(f"      Change:     {wholeness_improvement:+.1f}%")
        
        results.append({
            'name': name,
            'score_no_db': score_no_db,
            'score_with_db': score_with_db,
            'improvement': improvement,
            'wholeness_no_db': wholeness_no_db.percentage,
            'wholeness_with_db': wholeness_with_db.percentage,
            'passed': score_with_db >= 0.70
        })
    
    # Summary
    print("\n" + "="*90)
    print("TEST SUMMARY")
    print("="*90)
    
    if not results:
        print("❌ No templates tested")
        return False
    
    avg_improvement = sum(r['improvement'] for r in results) / len(results)
    avg_wholeness_improvement = sum(r['wholeness_with_db'] - r['wholeness_no_db'] for r in results) / len(results)
    passed_count = sum(1 for r in results if r['passed'])
    
    print(f"\nTemplates tested: {len(results)}")
    print(f"Passed (≥70% evidence_alignment): {passed_count}/{len(results)}")
    print(f"\nAverage evidence_alignment improvement: {avg_improvement:+.1f}%")
    print(f"Average wholeness improvement: {avg_wholeness_improvement:+.1f}%")
    
    # Detailed results table
    print(f"\n{'Template':<20} {'Without DB':<12} {'With DB':<12} {'Change':<12} {'Passed'}")
    print("-"*90)
    for r in results:
        status = "✅" if r['passed'] else "❌"
        print(f"{r['name']:<20} {r['score_no_db']:.0%} {'':<7} {r['score_with_db']:.0%} {'':<7} {r['improvement']:+.0%} {'':<7} {status}")
    
    # Success criteria
    print("\n" + "="*90)
    print("SUCCESS CRITERIA")
    print("="*90)
    
    success_criteria = [
        ("All templates show improvement", all(r['improvement'] > 0 for r in results)),
        ("Average improvement ≥ +15%", avg_improvement >= 0.15),
        ("At least 2 templates pass 70% threshold", passed_count >= 2),
        ("No DB errors", all('error' not in str(r) for r in results)),
    ]
    
    all_passed = True
    for criterion, passed in success_criteria:
        status = "✅" if passed else "❌"
        print(f"{status} {criterion}")
        if not passed:
            all_passed = False
    
    if all_passed:
        print("\n🎉 ALL SUCCESS CRITERIA MET")
        print("   Evidence DB integration working correctly")
        return True
    else:
        print("\n⚠️  SOME CRITERIA NOT MET")
        print("   Review integration logic or DB content")
        return False


if __name__ == "__main__":
    success = test_evidence_db_integration()
    sys.exit(0 if success else 1)
