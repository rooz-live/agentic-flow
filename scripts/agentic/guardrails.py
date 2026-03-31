#!/usr/bin/env python3
"""
Guardrail Lock System
- WIP limits prevent unbounded growth
- Advisory mode for non-mutating analysis
- Schema validation per tier
- Sensorimotor offload to specialized agents
- Explicit visibility via pattern metrics
"""

import json
import os
from typing import Dict, Optional, Tuple, Any
from enum import Enum
from dataclasses import dataclass

class OperationMode(Enum):
    MUTATE = "mutate"  # Allow modifications
    ADVISORY = "advisory"  # Read-only analysis
    ENFORCEMENT = "enforcement"  # Strict governance

class Tier(Enum):
    ORCHESTRATOR = "orchestrator"
    ANALYST = "analyst"
    INNOVATOR = "innovator"
    INTUITIVE = "intuitive"
    ASSESSOR = "assessor"
    SEEKER = "seeker"

@dataclass
class WIPLimits:
    """Work-In-Progress limits per tier"""
    orchestrator: int = 3
    analyst: int = 5
    innovator: int = 4
    intuitive: int = 2
    assessor: int = 6
    seeker: int = 8

@dataclass
class SchemaValidation:
    """Required schema fields per tier"""
    orchestrator: list = None
    analyst: list = None
    innovator: list = None
    intuitive: list = None
    assessor: list = None
    seeker: list = None
    
    def __post_init__(self):
        self.orchestrator = ['pattern', 'circle', 'economic', 'data']
        self.analyst = ['pattern', 'circle', 'data', 'analysis_type']
        self.innovator = ['pattern', 'circle', 'innovation_metric']
        self.intuitive = ['pattern', 'data', 'confidence']
        self.assessor = ['pattern', 'circle', 'assessment_result']
        self.seeker = ['pattern', 'search_query', 'results']

class GuardrailLock:
    """Enforces boundaries and prevents system overload"""
    
    def __init__(self, mode: OperationMode = OperationMode.MUTATE):
        self.mode = mode
        self.wip_limits = WIPLimits()
        self.schema_validation = SchemaValidation()
        self.current_wip = {tier.value: 0 for tier in Tier}
        self.sensorimotor_agents = {}  # Specialized agent registry
    
    def check_wip_limit(self, circle: str) -> Tuple[bool, str]:
        """Check if WIP limit allows new work"""
        if circle not in self.current_wip:
            return True, "circle_not_tracked"
        
        limit = getattr(self.wip_limits, circle, 10)
        current = self.current_wip[circle]
        
        if current >= limit:
            return False, f"wip_limit_reached_{current}/{limit}"
        
        return True, f"wip_ok_{current + 1}/{limit}"
    
    def increment_wip(self, circle: str):
        """Increment WIP counter"""
        if circle in self.current_wip:
            self.current_wip[circle] += 1
    
    def decrement_wip(self, circle: str):
        """Decrement WIP counter"""
        if circle in self.current_wip and self.current_wip[circle] > 0:
            self.current_wip[circle] -= 1
    
    def validate_schema(self, circle: str, data: Dict) -> Tuple[bool, list]:
        """Validate data against tier-specific schema"""
        if circle not in [t.value for t in Tier]:
            return True, []  # Unknown tier, skip validation
        
        required_fields = getattr(self.schema_validation, circle, [])
        missing = [f for f in required_fields if f not in data]
        
        if missing:
            return False, missing
        
        return True, []
    
    def check_mode_permission(self, operation: str) -> Tuple[bool, str]:
        """Check if operation is allowed in current mode"""
        mutating_ops = ['write', 'delete', 'modify', 'update', 'create']
        
        if self.mode == OperationMode.ADVISORY:
            # Advisory mode: only read operations
            if any(op in operation.lower() for op in mutating_ops):
                return False, "advisory_mode_read_only"
            return True, "advisory_allowed"
        
        elif self.mode == OperationMode.ENFORCEMENT:
            # Enforcement: strict governance, no modifications
            if any(op in operation.lower() for op in mutating_ops):
                return False, "enforcement_mode_no_modifications"
            return True, "enforcement_allowed"
        
        else:  # MUTATE mode
            return True, "mutate_mode_all_allowed"
    
    def register_sensorimotor_agent(self, capability: str, agent_endpoint: str):
        """Register specialized agent for offloading sensorimotor tasks"""
        self.sensorimotor_agents[capability] = agent_endpoint
    
    def offload_to_specialist(self, capability: str, task_data: Dict) -> Optional[str]:
        """Offload task to specialized agent"""
        if capability in self.sensorimotor_agents:
            return self.sensorimotor_agents[capability]
        return None
    
    def emit_guardrail_lock(self, circle: str, reason: str, metadata: Dict):
        """Emit guardrail_lock pattern event to metrics"""
        try:
            from datetime import datetime
            import sys
            sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
            from agentic.pattern_logger import PatternLogger
            
            logger = PatternLogger()
            logger.log(
                "guardrail_lock",
                {
                    "reason": reason,
                    "blocked_by": metadata.get('blocked_by', 'unknown'),
                    "operation": metadata.get('operation', 'unknown'),
                    "missing_fields": metadata.get('missing_fields', []),
                    "wip_status": self.current_wip.get(circle, 0),
                    "tags": ["guardrail", "enforcement", "boundary"]
                },
                gate="guardrail",
                behavioral_type="enforcement",
                economic={
                    "cod": 100,  # High cost of delay when guardrails trigger
                    "wsjf_score": 0  # Zero value delivery when blocked
                },
                action_completed=False  # Mark as failure
            )
        except Exception as e:
            # Fail silently - don't break guardrail enforcement
            pass
    
    def emit_wip_violation_and_snooze(self, circle: str, backlog_items: list) -> list:
        """
        Emit wip_violation pattern and auto-snooze lower WSJF items.
        Args:
            circle: Target circle
            backlog_items: List of current WIP items with WSJF scores
        Returns:
            List of snoozed item IDs
        """
        try:
            import sys
            sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
            from agentic.pattern_logger import PatternLogger
            
            # Sort by WSJF (lowest first)
            sorted_items = sorted(backlog_items, key=lambda x: x.get('wsjf', 0))
            
            limit = getattr(self.wip_limits, circle, 10)
            current = len(backlog_items)
            to_snooze = current - limit
            
            if to_snooze <= 0:
                return []
            
            # Snooze bottom N items
            snoozed = sorted_items[:to_snooze]
            snoozed_ids = [item.get('id', f"item_{i}") for i, item in enumerate(snoozed)]
            
            # Emit wip_violation pattern
            logger = PatternLogger()
            logger.log(
                'wip_violation',
                {
                    'circle': circle,
                    'current_wip': current,
                    'limit': limit,
                    'snoozed_count': to_snooze,
                    'snoozed_ids': snoozed_ids,
                    'snoozed_wsjf_range': [snoozed[0].get('wsjf', 0), snoozed[-1].get('wsjf', 0)] if snoozed else [],
                    'tags': ['wip', 'auto-snooze', 'violation']
                },
                gate='guardrail',
                behavioral_type='enforcement',
                economic={
                    'cod': 50,  # Medium CoD for WIP violation
                    'wsjf_score': 0,  # Zero value when overloaded
                    'job_duration': to_snooze,
                    'user_business_value': 0
                },
                action_completed=False
            )
            
            return snoozed_ids
            
        except Exception as e:
            # Fail silently
            return []
    
    def enforce(self, circle: str, operation: str, data: Dict, emit_events: bool = True) -> Tuple[bool, str, Dict]:
        """
        Enforce all guardrails and emit guardrail_lock on violations.
        Args:
            circle: Target circle/tier
            operation: Operation type (read/write/etc)
            data: Data to validate
            emit_events: Whether to emit pattern events (default True)
        Returns: (allowed, reason, metadata)
        """
        metadata = {
            'mode': self.mode.value,
            'circle': circle,
            'operation': operation
        }
        
        # Mode permission check
        mode_allowed, mode_reason = self.check_mode_permission(operation)
        if not mode_allowed:
            metadata['blocked_by'] = 'mode_restriction'
            if emit_events:
                self.emit_guardrail_lock(circle, mode_reason, metadata)
            return False, mode_reason, metadata
        
        # WIP limit check (only for mutating operations)
        if self.mode == OperationMode.MUTATE:
            wip_allowed, wip_reason = self.check_wip_limit(circle)
            if not wip_allowed:
                metadata['blocked_by'] = 'wip_limit'
                if emit_events:
                    self.emit_guardrail_lock(circle, wip_reason, metadata)
                return False, wip_reason, metadata
        
        # Schema validation
        schema_valid, missing_fields = self.validate_schema(circle, data)
        if not schema_valid:
            metadata['blocked_by'] = 'schema_validation'
            metadata['missing_fields'] = missing_fields
            if emit_events:
                self.emit_guardrail_lock(circle, f"schema_validation_failed_{missing_fields}", metadata)
            return False, f"schema_validation_failed_{missing_fields}", metadata
        
        # All checks passed
        if self.mode == OperationMode.MUTATE:
            self.increment_wip(circle)
        
        metadata['status'] = 'allowed'
        return True, "guardrails_passed", metadata
    
    def get_status(self) -> Dict:
        """Get current guardrail status"""
        return {
            'mode': self.mode.value,
            'wip_current': self.current_wip,
            'wip_limits': {
                'orchestrator': self.wip_limits.orchestrator,
                'analyst': self.wip_limits.analyst,
                'innovator': self.wip_limits.innovator,
                'intuitive': self.wip_limits.intuitive,
                'assessor': self.wip_limits.assessor,
                'seeker': self.wip_limits.seeker
            },
            'sensorimotor_agents': list(self.sensorimotor_agents.keys())
        }


def main():
    """Example usage"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Guardrail Lock System')
    parser.add_argument('--mode', choices=['mutate', 'advisory', 'enforcement'], 
                       default='mutate', help='Operation mode')
    parser.add_argument('--status', action='store_true', help='Show guardrail status')
    parser.add_argument('--test', action='store_true', help='Run test scenarios')
    parser.add_argument('--enforce', action='store_true', help='Run in enforcement mode with event emission')
    parser.add_argument('--json', action='store_true', help='JSON output')
    
    args = parser.parse_args()
    
    # Handle --enforce flag
    if args.enforce:
        args.mode = 'enforcement'
        args.test = True  # Run test scenarios in enforcement mode
    
    guardrails = GuardrailLock(mode=OperationMode(args.mode))
    
    if args.status:
        status = guardrails.get_status()
        if args.json:
            print(json.dumps(status, indent=2))
        else:
            print(f"\nGuardrail Status")
            print(f"{'='*50}")
            print(f"Mode: {status['mode']}")
            print(f"\nWIP Limits:")
            for circle, limit in status['wip_limits'].items():
                current = status['wip_current'].get(circle, 0)
                print(f"  {circle:15} {current:2}/{limit:2}")
            print(f"\nSensorimotor Agents: {len(status['sensorimotor_agents'])}")
            for agent in status['sensorimotor_agents']:
                print(f"  • {agent}")
    
    elif args.test:
        print(f"\nTesting Guardrails in {args.mode.upper()} mode")
        print(f"{'='*50}\n")
        
        test_cases = [
            ('orchestrator', 'read', {'pattern': 'test', 'circle': 'orchestrator', 'economic': {}, 'data': {}}),
            ('orchestrator', 'write', {'pattern': 'test', 'circle': 'orchestrator', 'economic': {}, 'data': {}}),
            ('analyst', 'read', {'pattern': 'test'}),  # Missing required fields
        ]
        
        for circle, op, data in test_cases:
            allowed, reason, metadata = guardrails.enforce(circle, op, data)
            status = "✓" if allowed else "✗"
            print(f"{status} {circle:15} {op:10} - {reason}")
            if not allowed and 'missing_fields' in metadata:
                print(f"  Missing: {metadata['missing_fields']}")
        
        print(f"\n{'='*50}\n")
        print(f"Final WIP Status: {guardrails.current_wip}")
    
    else:
        # Default: show help
        parser.print_help()


if __name__ == '__main__':
    main()
