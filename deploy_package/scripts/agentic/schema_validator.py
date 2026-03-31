#!/usr/bin/env python3
"""
Schema Validation Enforcement at Source
Validates and auto-populates required fields before write
"""

import json
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timezone
from dataclasses import dataclass

@dataclass
class TierRequirements:
    """Schema requirements per tier"""
    tier: int
    circles: List[str]
    required_fields: List[str]
    optional_fields: List[str]

# Tier-based schema requirements
TIER_SCHEMA = {
    1: TierRequirements(
        tier=1,
        circles=['orchestrator', 'assessor'],
        required_fields=[
            'timestamp', 'pattern', 'circle', 'gate',
            'economic.wsjf_score', 'economic.cost_of_delay',
            'economic.job_duration', 'economic.user_business_value'
        ],
        optional_fields=['tags', 'data', 'economic.revenue_impact']
    ),
    2: TierRequirements(
        tier=2,
        circles=['analyst', 'innovator'],
        required_fields=[
            'timestamp', 'pattern', 'circle', 'gate', 'tags',
            'economic.wsjf_score', 'economic.cost_of_delay',
            'economic.job_duration', 'economic.user_business_value'
        ],
        optional_fields=['data', 'economic.revenue_impact', 'innovation_metric', 'analysis_type']
    ),
    3: TierRequirements(
        tier=3,
        circles=['intuitive', 'seeker', 'testing'],
        required_fields=['timestamp', 'pattern', 'gate'],
        optional_fields=['tags', 'circle', 'economic', 'data']
    )
}

class SchemaValidator:
    """Enforces schema validation at source"""
    
    def __init__(self):
        self.tier_schema = TIER_SCHEMA
    
    def get_tier_for_circle(self, circle: str) -> int:
        """Get tier number for a circle"""
        for tier, requirements in self.tier_schema.items():
            if circle in requirements.circles:
                return tier
        return 3  # Default to tier 3 (most lenient)
    
    def validate_and_populate(
        self,
        event: Dict,
        auto_populate: bool = True
    ) -> Tuple[bool, List[str], Dict]:
        """
        Validate event and auto-populate missing fields
        Returns: (is_valid, missing_fields, populated_event)
        """
        circle = event.get('circle', 'unknown')
        tier = self.get_tier_for_circle(circle)
        requirements = self.tier_schema[tier]
        
        # Auto-populate safe defaults
        if auto_populate:
            event = self._auto_populate(event, requirements)
        
        # Validate required fields
        missing = self._check_required_fields(event, requirements.required_fields)
        
        is_valid = len(missing) == 0
        
        return is_valid, missing, event
    
    def _auto_populate(self, event: Dict, requirements: TierRequirements) -> Dict:
        """Auto-populate missing fields with safe defaults"""
        now = datetime.now(timezone.utc).isoformat()
        
        # Always ensure base fields
        if 'timestamp' not in event:
            event['timestamp'] = now
        
        if 'gate' not in event:
            event['gate'] = 'unknown'
        
        if 'pattern' not in event:
            event['pattern'] = 'unnamed_pattern'
        
        # Tier-specific defaults
        if requirements.tier in [1, 2]:
            # Ensure economic fields exist
            if 'economic' not in event:
                event['economic'] = {}
            
            economic = event['economic']
            if 'wsjf_score' not in economic:
                economic['wsjf_score'] = 0.0
            if 'cost_of_delay' not in economic:
                economic['cost_of_delay'] = 0.0
            if 'job_duration' not in economic:
                economic['job_duration'] = 1.0
            if 'user_business_value' not in economic:
                economic['user_business_value'] = 0.0
        
        # Tier 2 requires tags
        if requirements.tier == 2 and ('tags' not in event or not event['tags']):
            event['tags'] = ['auto_generated']
        
        return event
    
    def _check_required_fields(
        self,
        event: Dict,
        required_fields: List[str]
    ) -> List[str]:
        """Check for missing required fields"""
        missing = []
        
        for field in required_fields:
            if '.' in field:
                # Nested field (e.g., 'economic.wsjf_score')
                parts = field.split('.')
                current = event
                field_missing = False
                
                for part in parts:
                    if isinstance(current, dict) and part in current:
                        current = current[part]
                    else:
                        field_missing = True
                        break
                
                if field_missing:
                    missing.append(field)
            else:
                # Top-level field
                if field not in event:
                    missing.append(field)
                elif field == 'tags' and (not event[field] or event[field] == []):
                    # Special case: tags must be non-empty for tier 2
                    missing.append(field)
        
        return missing
    
    def get_schema_report(self) -> Dict:
        """Get schema requirements report"""
        return {
            f"tier_{tier}": {
                'circles': req.circles,
                'required_fields': req.required_fields,
                'optional_fields': req.optional_fields
            }
            for tier, req in self.tier_schema.items()
        }


def main():
    """Test schema validation"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Schema Validator')
    parser.add_argument('--test', action='store_true', help='Run test scenarios')
    parser.add_argument('--report', action='store_true', help='Show schema requirements')
    parser.add_argument('--json', action='store_true', help='JSON output')
    
    args = parser.parse_args()
    
    validator = SchemaValidator()
    
    if args.report:
        report = validator.get_schema_report()
        if args.json:
            print(json.dumps(report, indent=2))
        else:
            print(f"\n{'='*70}")
            print(f"Schema Requirements by Tier")
            print(f"{'='*70}")
            for tier_name, data in report.items():
                print(f"\n{tier_name.upper()}")
                print(f"  Circles: {', '.join(data['circles'])}")
                print(f"  Required: {', '.join(data['required_fields'])}")
                print(f"  Optional: {', '.join(data['optional_fields'][:3])}...")
            print(f"\n{'='*70}\n")
    
    elif args.test:
        print(f"\n{'='*70}")
        print(f"Schema Validation Tests")
        print(f"{'='*70}\n")
        
        test_cases = [
            {
                'name': 'Tier 1 (Orchestrator) - Missing Economic',
                'event': {
                    'pattern': 'test_pattern',
                    'circle': 'orchestrator'
                }
            },
            {
                'name': 'Tier 2 (Analyst) - Missing Tags',
                'event': {
                    'pattern': 'analysis',
                    'circle': 'analyst',
                    'economic': {'wsjf_score': 10.0}
                }
            },
            {
                'name': 'Tier 3 (Testing) - Minimal',
                'event': {
                    'pattern': 'test_run',
                    'circle': 'testing'
                }
            }
        ]
        
        for test in test_cases:
            print(f"{test['name']}")
            print(f"{'-'*70}")
            
            valid, missing, populated = validator.validate_and_populate(
                test['event'].copy(),
                auto_populate=True
            )
            
            status = "✓ VALID" if valid else "✗ INVALID"
            print(f"Status: {status}")
            if missing:
                print(f"Missing: {', '.join(missing)}")
            print(f"Auto-populated fields: {len(populated) - len(test['event'])}")
            print()
        
        print(f"{'='*70}\n")
    
    else:
        parser.print_help()


if __name__ == '__main__':
    main()
