#!/usr/bin/env python3
"""
Resume Validator
Runs the 21-Role Governance Council against the Agentic Resume.
"""
import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from vibesthinker.governance_council import GovernanceCouncil

def validate_resume(resume_path):
    print(f"Validating Resume: {resume_path}")

    with open(resume_path, 'r') as f:
        content = f.read()

    council = GovernanceCouncil(resume_path)

    # Run validation (treat as 'settlement' type for rigor, or strictly checking for patterns)
    report = council.run_full_validation(content, doc_type="settlement")

    print("\n--- GOVERNANCE COUNCIL VERDICT ---")
    print(f"Overall Wholeness Score: {report['overall']['wholeness_score']}%")
    print(f"Consensus Rating: {report['overall']['consensus_rating']}/5.0")

    print("\n--- ADVANCED STRATEGY (Layer 5) ---")
    for role, data in report['advanced'].items():
        status = "ACTIVE" if data['passed'] else "INACTIVE"
        print(f"{role}: {status} - {data['message']}")

    print("\n--- SOFTWARE PATTERNS (Layer 4) ---")
    for pattern, data in report['patterns'].items():
        status = "PASS" if data['passed'] else "FAIL"
        print(f"{pattern}: {status} - {data['message']}")

if __name__ == "__main__":
    resume_path = "/Users/shahroozbhopti/.gemini/antigravity/brain/0474f97d-f240-455b-8517-6cc901701b62/RESUME-2026-AGENTIC-LEAD.md"
    validate_resume(resume_path)
