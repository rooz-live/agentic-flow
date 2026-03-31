#!/usr/bin/env python3
"""
ROAM Auto-Escalation - P1-3 Implementation
Auto-escalates risks based on environment-specific thresholds from bounded_reasoning_audit.yaml.

Features:
- Environment-aware risk thresholds (local=8, dev=6, stg=4, prod=2)
- Auto-flagging of high-WSJF risks
- Escalation policy enforcement per environment
- Integration with alignment_checker for drift-based risks
"""

import os
import json
import datetime
from typing import List, Dict, Any

PROJECT_ROOT = os.environ.get("PROJECT_ROOT", ".")
GOALIE_DIR = os.path.join(PROJECT_ROOT, ".goalie")
ROAM_RISKS_FILE = os.path.join(GOALIE_DIR, "roam_risks.jsonl")
ESCALATION_LOG = os.path.join(GOALIE_DIR, "escalation_log.jsonl")

# Environment-specific thresholds from bounded_reasoning_audit.yaml
ENVIRONMENT_THRESHOLDS = {
    'local': {'risk': 8, 'escalation': 'async', 'auto_escalate': False},
    'dev': {'risk': 6, 'escalation': '24h', 'auto_escalate': True},
    'stg': {'risk': 4, 'escalation': '4h', 'auto_escalate': True},
    'prod': {'risk': 2, 'escalation': 'immediate', 'auto_escalate': True},
    'ci': {'risk': 5, 'escalation': 'none', 'auto_escalate': False},
}


def detect_environment() -> str:
    """Detect current environment."""
    return os.environ.get('AF_ENV', 
           'ci' if os.environ.get('CI') or os.environ.get('GITHUB_ACTIONS') else 'local')


def load_roam_risks() -> List[Dict]:
    """Load all ROAM risks."""
    if not os.path.exists(ROAM_RISKS_FILE):
        return []
    
    risks = []
    with open(ROAM_RISKS_FILE, 'r') as f:
        for line in f:
            try:
                risks.append(json.loads(line.strip()))
            except json.JSONDecodeError:
                continue
    return risks


def should_escalate(risk: Dict, env: str) -> Dict:
    """Determine if a risk should be escalated based on environment."""
    threshold = ENVIRONMENT_THRESHOLDS.get(env, ENVIRONMENT_THRESHOLDS['local'])
    
    wsjf = risk.get('wsjf_score', 0)
    severity = risk.get('severity', 'MEDIUM')
    status = risk.get('status', 'OWNED')
    drift = risk.get('drift_score', 0)
    
    # Calculate effective risk score
    risk_score = 0
    if severity == 'CRITICAL':
        risk_score = 10
    elif severity == 'HIGH':
        risk_score = 7
    elif severity == 'MEDIUM':
        risk_score = 5
    else:
        risk_score = 3
    
    # Boost by WSJF if high
    if wsjf >= 8.0:
        risk_score += 2
    
    # Boost by drift if significant
    if drift > 0.3:
        risk_score += 1
    
    should_esc = risk_score > threshold['risk'] and threshold['auto_escalate']
    
    return {
        'should_escalate': should_esc,
        'risk_score': risk_score,
        'threshold': threshold['risk'],
        'escalation_policy': threshold['escalation'],
        'reason': f"risk_score={risk_score} > threshold={threshold['risk']}" if should_esc else None
    }


def escalate_risk(risk: Dict, env: str, escalation_info: Dict) -> Dict:
    """Create escalation record for a risk."""
    now = datetime.datetime.now(datetime.timezone.utc)
    return {
        'escalation_id': f"ESC-{now.strftime('%Y%m%d%H%M%S')}",
        'timestamp': now.isoformat(),
        'risk_id': risk.get('risk_id') or risk.get('id'),
        'environment': env,
        'risk_score': escalation_info['risk_score'],
        'threshold': escalation_info['threshold'],
        'policy': escalation_info['escalation_policy'],
        'reason': escalation_info['reason'],
        'status': 'ESCALATED',
        'original_severity': risk.get('severity'),
        'wsjf_score': risk.get('wsjf_score', 0)
    }


def process_escalations(dry_run: bool = False) -> Dict:
    """Process all risks and escalate as needed."""
    env = detect_environment()
    risks = load_roam_risks()
    
    escalated = []
    skipped = []
    
    for risk in risks:
        esc_info = should_escalate(risk, env)
        if esc_info['should_escalate']:
            esc_record = escalate_risk(risk, env, esc_info)
            escalated.append(esc_record)
        else:
            skipped.append({
                'risk_id': risk.get('risk_id') or risk.get('id'),
                'risk_score': esc_info['risk_score'],
                'threshold': esc_info['threshold']
            })
    
    # Write escalation log if not dry run
    if not dry_run and escalated:
        os.makedirs(GOALIE_DIR, exist_ok=True)
        with open(ESCALATION_LOG, 'a') as f:
            for esc in escalated:
                f.write(json.dumps(esc) + '\n')
    
    return {
        'environment': env,
        'thresholds': ENVIRONMENT_THRESHOLDS[env],
        'total_risks': len(risks),
        'escalated_count': len(escalated),
        'skipped_count': len(skipped),
        'escalated': escalated,
        'dry_run': dry_run
    }


def main():
    """Main CLI entrypoint."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='ROAM Auto-Escalation - Environment-aware risk escalation')
    parser.add_argument('--dry-run', action='store_true',
                        help='Show what would be escalated without writing')
    parser.add_argument('--json', action='store_true', help='Output as JSON')
    args = parser.parse_args()
    
    result = process_escalations(dry_run=args.dry_run)
    
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print(f"Environment: {result['environment']}")
        print(f"Risk Threshold: {result['thresholds']['risk']}")
        print(f"Escalation Policy: {result['thresholds']['escalation']}")
        print(f"Total Risks: {result['total_risks']}")
        print(f"Escalated: {result['escalated_count']}")
        if result['escalated']:
            for esc in result['escalated'][:5]:
                print(f"  - {esc['risk_id']}: {esc['reason']}")
    
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

