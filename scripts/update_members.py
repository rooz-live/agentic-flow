#!/usr/bin/env python3
"""
Updates members.json to include all 21 roles + Software Pattern experts
required for the full dashboard visualization.
"""

import json
from pathlib import Path

members = [
    # CIRCLE ROLES (Layer 1)
    {"id": "Analyst", "role": "analyst", "expertise": ["statistical_validity", "evidence_analysis"], "weight": 1.0},
    {"id": "Assessor", "role": "assessor", "expertise": ["risk_assessment", "blockers"], "weight": 1.0},
    {"id": "Innovator", "role": "innovator", "expertise": ["automation", "pattern_matching"], "weight": 1.0},
    {"id": "Intuitive", "role": "intuitive", "expertise": ["holistic_view", "clarity"], "weight": 1.0},
    {"id": "Orchestrator", "role": "orchestrator", "expertise": ["timing", "integration"], "weight": 1.0},
    {"id": "Seeker", "role": "seeker", "expertise": ["dependencies", "legal_precision"], "weight": 1.0},

    # LEGAL ROLES (Layer 2)
    {"id": "Judge", "role": "judge", "expertise": ["legal_precision", "procedural_correctness"], "weight": 1.5},
    {"id": "Prosecutor", "role": "prosecutor", "expertise": ["case_strength", "evidence_analysis"], "weight": 1.2},
    {"id": "Defense", "role": "defense", "expertise": ["counterarguments", "risk_mitigation"], "weight": 1.2},
    {"id": "ExpertWitness", "role": "expert", "expertise": ["statistical_validity", "domain_expertise"], "weight": 1.0},
    {"id": "Jury", "role": "jury", "expertise": ["clarity", "emotional_impact"], "weight": 1.0},
    {"id": "Mediator", "role": "mediator", "expertise": ["conflict_resolution", "settlement_viability"], "weight": 1.0},

    # GOVERNMENT ROLES (Layer 3)
    {"id": "CountyAttorney", "role": "gov_counsel", "expertise": ["local_ordinance", "case_preparation"], "weight": 1.0},
    {"id": "StateAG", "role": "gov_counsel", "expertise": ["consumer_protection", "fraud_detection"], "weight": 1.0},
    {"id": "HUD_Rep", "role": "gov_counsel", "expertise": ["tenant_rights", "federal_compliance"], "weight": 1.0},
    {"id": "LegalAid", "role": "gov_counsel", "expertise": ["tenant_law", "pro_se_assistance"], "weight": 1.0},
    {"id": "Appellate", "role": "gov_counsel", "expertise": ["precedent", "appellate_strategy"], "weight": 1.0},

    # SOFTWARE PATTERNS (Layer 4)
    {"id": "PRD_Analyst", "role": "sw_pattern", "expertise": ["problem_statement", "requirements"], "weight": 0.8},
    {"id": "ADR_Architect", "role": "sw_pattern", "expertise": ["decision_context", "alternatives"], "weight": 0.8},
    {"id": "DDD_Expert", "role": "sw_pattern", "expertise": ["domain_model", "ubiquitous_language"], "weight": 0.8},
    {"id": "TDD_Engineer", "role": "sw_pattern", "expertise": ["test_coverage", "pass_fail_criteria"], "weight": 0.8}
]

data = {
    "formed_at": "2026-02-12T12:00:00-05:00",
    "voting_threshold": "2/3",
    "members": members
}

output_path = Path("/Users/shahroozbhopti/Documents/code/governance/council/members.json")
output_path.parent.mkdir(parents=True, exist_ok=True)
output_path.write_text(json.dumps(data, indent=2))
print(f"Updated {output_path} with {len(members)} members.")
