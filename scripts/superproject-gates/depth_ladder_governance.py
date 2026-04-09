#!/usr/bin/env python3
"""
Depth Ladder Governance
Implements governance policies for depth ladder progression and stabilization
"""

import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Any, Optional
from enum import Enum

class GovernancePolicy(Enum):
    """Governance policy types"""
    MANUAL_APPROVAL = "manual_approval"
    AUTOMATIC_WITH_LIMITS = "automatic_with_limits"
    TIME_BASED_RESTRICTION = "time_based_restriction"
    CIRCLE_BASED_AUTHORITY = "circle_based_authority"

class DepthLadderGovernance:
    def __init__(self, project_root: Optional[Path] = None):
        self.project_root = project_root or Path(os.environ.get("PROJECT_ROOT", "."))
        self.goalie_dir = self.project_root / ".goalie"
        self.goalie_dir.mkdir(exist_ok=True)
        
        # Default depth ladder configuration
        self.depth_levels = {
            0: {
                'name': 'safe_mode',
                'description': 'Safe mode with minimal functionality',
                'max_duration_hours': 48,
                'requires_approval': False,
                'allowed_circles': ['all']
            },
            1: {
                'name': 'basic_functionality',
                'description': 'Basic functionality with limited features',
                'max_duration_hours': 24,
                'requires_approval': False,
                'allowed_circles': ['analyst', 'assessor', 'seeker']
            },
            2: {
                'name': 'standard_operation',
                'description': 'Standard operation with full features',
                'max_duration_hours': 12,
                'requires_approval': True,
                'allowed_circles': ['analyst', 'assessor', 'innovator', 'seeker']
            },
            3: {
                'name': 'advanced_features',
                'description': 'Advanced features and experimental capabilities',
                'max_duration_hours': 6,
                'requires_approval': True,
                'allowed_circles': ['analyst', 'assessor', 'innovator', 'intuitive']
            },
            4: {
                'name': 'full_production',
                'description': 'Full production capabilities',
                'max_duration_hours': 4,
                'requires_approval': True,
                'allowed_circles': ['analyst', 'assessor', 'innovator', 'intuitive', 'orchestrator']
            },
            5: {
                'name': 'critical_operations',
                'description': 'Critical operations with system-wide impact',
                'max_duration_hours': 2,
                'requires_approval': True,
                'allowed_circles': ['analyst', 'assessor', 'innovator', 'intuitive', 'orchestrator']
            }
        }
        
        # Governance state
        self.current_policy = GovernancePolicy.AUTOMATIC_WITH_LIMITS
        self.approval_required = False
        self.depth_transitions = []
        self.policy_violations = []
        self.governance_active = True
        
        # Load existing state
        self._load_state()
    
    def _load_state(self):
        """Load existing governance state"""
        state_file = self.goalie_dir / "depth_ladder_governance_state.json"
        if state_file.exists():
            try:
                with open(state_file, 'r') as f:
                    state = json.load(f)
                
                self.current_policy = GovernancePolicy(
                    state.get('current_policy', 'automatic_with_limits')
                )
                self.governance_active = state.get('governance_active', True)
                self.depth_transitions = state.get('depth_transitions', [])
                self.policy_violations = state.get('policy_violations', [])
                
                # Load custom depth levels if provided
                if 'custom_depth_levels' in state:
                    self.depth_levels.update(state['custom_depth_levels'])
                    
            except Exception as e:
                print(f"Warning: Could not load governance state: {e}")
    
    def _save_state(self):
        """Save governance state"""
        state_file = self.goalie_dir / "depth_ladder_governance_state.json"
        state = {
            'current_policy': self.current_policy.value,
            'governance_active': self.governance_active,
            'depth_transitions': self.depth_transitions[-20:],  # Keep last 20
            'policy_violations': self.policy_violations[-50:],  # Keep last 50
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        
        with open(state_file, 'w') as f:
            json.dump(state, f, indent=2)
    
    def request_depth_transition(self, current_depth: int, requested_depth: int,
                             requesting_circle: str, reason: str = "unknown",
                             metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Request a depth transition with governance checks"""
        timestamp = datetime.now(timezone.utc)
        
        # Validate depth levels
        if requested_depth not in self.depth_levels:
            return {
                'approved': False,
                'reason': 'invalid_depth_level',
                'message': f'Invalid depth level: {requested_depth}',
                'requires_approval': False
            }
        
        # Check if governance is active
        if not self.governance_active:
            return {
                'approved': True,
                'reason': 'governance_disabled',
                'message': 'Governance is disabled, transition approved',
                'requires_approval': False
            }
        
        # Apply policy-based checks
        if self.current_policy == GovernancePolicy.MANUAL_APPROVAL:
            result = self._apply_manual_approval_policy(
                current_depth, requested_depth, requesting_circle, reason, metadata
            )
        elif self.current_policy == GovernancePolicy.AUTOMATIC_WITH_LIMITS:
            result = self._apply_automatic_limits_policy(
                current_depth, requested_depth, requesting_circle, reason, metadata
            )
        elif self.current_policy == GovernancePolicy.TIME_BASED_RESTRICTION:
            result = self._apply_time_based_policy(
                current_depth, requested_depth, requesting_circle, reason, metadata
            )
        elif self.current_policy == GovernancePolicy.CIRCLE_BASED_AUTHORITY:
            result = self._apply_circle_based_policy(
                current_depth, requested_depth, requesting_circle, reason, metadata
            )
        else:
            result = {
                'approved': False,
                'reason': 'unknown_policy',
                'message': f'Unknown governance policy: {self.current_policy}',
                'requires_approval': False
            }
        
        # Record transition attempt
        transition = {
            'timestamp': timestamp.isoformat(),
            'current_depth': current_depth,
            'requested_depth': requested_depth,
            'requesting_circle': requesting_circle,
            'reason': reason,
            'metadata': metadata or {},
            'policy': self.current_policy.value,
            'approved': result['approved'],
            'governance_reason': result['reason']
        }
        
        self.depth_transitions.append(transition)
        self._save_state()
        
        # Log transition
        self._log_depth_transition(transition, result)
        
        return result
    
    def _apply_manual_approval_policy(self, current_depth: int, requested_depth: int,
                                  requesting_circle: str, reason: str,
                                  metadata: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Apply manual approval policy"""
        depth_config = self.depth_levels[requested_depth]
        
        # All depth changes require manual approval
        return {
            'approved': False,
            'reason': 'manual_approval_required',
            'message': f'Manual approval required for depth {requested_depth} '
                      f'({depth_config["description"]})',
            'requires_approval': True,
            'approval_authority': 'governance_council',
            'depth_config': depth_config
        }
    
    def _apply_automatic_limits_policy(self, current_depth: int, requested_depth: int,
                                   requesting_circle: str, reason: str,
                                   metadata: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Apply automatic limits policy"""
        depth_config = self.depth_levels[requested_depth]
        
        # Check circle authority
        if requesting_circle not in depth_config['allowed_circles'] and \
           'all' not in depth_config['allowed_circles']:
            return {
                'approved': False,
                'reason': 'unauthorized_circle',
                'message': f'Circle {requesting_circle} not authorized for depth {requested_depth}',
                'requires_approval': True,
                'authorized_circles': depth_config['allowed_circles']
            }
        
        # Check if approval is required
        if depth_config['requires_approval']:
            return {
                'approved': False,
                'reason': 'approval_required',
                'message': f'Depth {requested_depth} requires approval',
                'requires_approval': True,
                'approval_authority': 'system_admin',
                'depth_config': depth_config
            }
        
        # Check for upward transition limits
        if requested_depth > current_depth:
            max_jump = 2  # Maximum upward jump
            if requested_depth - current_depth > max_jump:
                return {
                    'approved': False,
                    'reason': 'excessive_jump',
                    'message': f'Maximum upward jump is {max_jump}, '
                              f'requested {requested_depth - current_depth}',
                    'requires_approval': True,
                    'max_allowed_jump': max_jump
                }
        
        # Automatic approval
        return {
            'approved': True,
            'reason': 'automatic_approval',
            'message': f'Automatic approval for depth {requested_depth}',
            'requires_approval': False,
            'depth_config': depth_config
        }
    
    def _apply_time_based_policy(self, current_depth: int, requested_depth: int,
                                requesting_circle: str, reason: str,
                                metadata: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Apply time-based restriction policy"""
        depth_config = self.depth_levels[requested_depth]
        
        # Check time-based restrictions
        current_time = datetime.now(timezone.utc)
        current_hour = current_time.hour
        
        # Restrict high-depth operations during certain hours
        if requested_depth >= 4 and (current_hour < 9 or current_hour > 17):
            return {
                'approved': False,
                'reason': 'time_restriction',
                'message': f'Depth {requested_depth} only allowed during business hours (9:00-17:00)',
                'requires_approval': True,
                'current_hour': current_hour,
                'allowed_hours': '9:00-17:00'
            }
        
        # Check circle authority
        if requesting_circle not in depth_config['allowed_circles'] and \
           'all' not in depth_config['allowed_circles']:
            return {
                'approved': False,
                'reason': 'unauthorized_circle',
                'message': f'Circle {requesting_circle} not authorized for depth {requested_depth}',
                'requires_approval': True,
                'authorized_circles': depth_config['allowed_circles']
            }
        
        # Check duration limits
        if requested_depth > current_depth:
            max_duration = depth_config['max_duration_hours']
            # Check recent time at this depth
            recent_time_at_depth = self._get_recent_time_at_depth(requested_depth, hours=24)
            
            if recent_time_at_depth and recent_time_at_depth > max_duration:
                return {
                    'approved': False,
                    'reason': 'duration_limit_exceeded',
                    'message': f'Maximum duration at depth {requested_depth} is {max_duration}h, '
                              f'already spent {recent_time_at_depth:.1f}h',
                    'requires_approval': True,
                    'max_duration_hours': max_duration,
                    'recent_duration_hours': recent_time_at_depth
                }
        
        # Approve with time tracking
        return {
            'approved': True,
            'reason': 'time_based_approval',
            'message': f'Time-based approval for depth {requested_depth}',
            'requires_approval': False,
            'depth_config': depth_config,
            'max_duration_hours': max_duration
        }
    
    def _apply_circle_based_policy(self, current_depth: int, requested_depth: int,
                                requesting_circle: str, reason: str,
                                metadata: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Apply circle-based authority policy"""
        depth_config = self.depth_levels[requested_depth]
        
        # Check circle authority matrix
        authority_matrix = {
            'seeker': [0, 1],
            'assessor': [0, 1, 2],
            'analyst': [0, 1, 2, 3],
            'innovator': [0, 1, 2, 3, 4],
            'intuitive': [0, 1, 2, 3, 4],
            'orchestrator': [0, 1, 2, 3, 4, 5]
        }
        
        authorized_depths = authority_matrix.get(requesting_circle, [])
        
        if requested_depth not in authorized_depths:
            return {
                'approved': False,
                'reason': 'insufficient_authority',
                'message': f'Circle {requesting_circle} not authorized for depth {requested_depth}',
                'requires_approval': True,
                'authorized_depths': authorized_depths
            }
        
        # Check for escalation requirements
        if requested_depth > current_depth and requested_depth >= 3:
            return {
                'approved': False,
                'reason': 'escalation_required',
                'message': f'Depth {requested_depth} requires escalation approval',
                'requires_approval': True,
                'escalation_authority': 'senior_orchestrator',
                'depth_config': depth_config
            }
        
        # Approve
        return {
            'approved': True,
            'reason': 'circle_authority_approved',
            'message': f'Circle {requesting_circle} authorized for depth {requested_depth}',
            'requires_approval': False,
            'depth_config': depth_config
        }
    
    def _get_recent_time_at_depth(self, depth: int, hours: int = 24) -> Optional[float]:
        """Get recent time spent at specific depth"""
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        total_time = 0.0
        depth_start = None
        
        for transition in reversed(self.depth_transitions):
            transition_time = datetime.fromisoformat(transition['timestamp'])
            
            if transition_time < cutoff_time:
                break
            
            if transition['approved'] and transition['requested_depth'] == depth:
                if depth_start is None:
                    depth_start = transition_time
                else:
                    # Calculate duration and reset
                    duration = (transition_time - depth_start).total_seconds() / 3600
                    total_time += duration
                    depth_start = transition_time
            elif depth_start and transition['current_depth'] != depth:
                # Depth changed away, calculate duration
                duration = (transition_time - depth_start).total_seconds() / 3600
                total_time += duration
                depth_start = None
        
        return total_time if total_time > 0 else None
    
    def _log_depth_transition(self, transition: Dict[str, Any], result: Dict[str, Any]):
        """Log depth transition event"""
        event = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'event_type': 'depth_transition_governance',
            'current_depth': transition['current_depth'],
            'requested_depth': transition['requested_depth'],
            'requesting_circle': transition['requesting_circle'],
            'reason': transition['reason'],
            'metadata': transition['metadata'],
            'policy': transition['policy'],
            'approved': result['approved'],
            'governance_reason': result['reason'],
            'requires_approval': result['requires_approval']
        }
        
        # Log to pattern metrics
        metrics_file = self.goalie_dir / "pattern_metrics.jsonl"
        with open(metrics_file, 'a') as f:
            f.write(json.dumps(event) + '\n')
        
        # Log policy violations
        if not result['approved']:
            violation = {
                'timestamp': transition['timestamp'],
                'type': 'depth_transition_violation',
                'requested_depth': transition['requested_depth'],
                'requesting_circle': transition['requesting_circle'],
                'violation_reason': result['reason'],
                'policy': transition['policy']
            }
            
            self.policy_violations.append(violation)
            
            # Log to separate violations file
            violations_file = self.goalie_dir / "governance_violations.jsonl"
            with open(violations_file, 'a') as f:
                f.write(json.dumps(violation) + '\n')
    
    def set_policy(self, policy: GovernancePolicy, reason: str = "manual") -> bool:
        """Set governance policy"""
        if self.current_policy == policy:
            return False
        
        old_policy = self.current_policy
        self.current_policy = policy
        self._save_state()
        
        # Log policy change
        event = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'event_type': 'governance_policy_change',
            'old_policy': old_policy.value,
            'new_policy': policy.value,
            'reason': reason
        }
        
        metrics_file = self.goalie_dir / "pattern_metrics.jsonl"
        with open(metrics_file, 'a') as f:
            f.write(json.dumps(event) + '\n')
        
        return True
    
    def get_governance_status(self) -> Dict[str, Any]:
        """Get current governance status"""
        return {
            'active': self.governance_active,
            'current_policy': self.current_policy.value,
            'depth_levels': self.depth_levels,
            'recent_transitions': len(self.depth_transitions),
            'recent_violations': len(self.policy_violations),
            'last_transition': self.depth_transitions[-1] if self.depth_transitions else None
        }
    
    def get_depth_summary(self, depth: int) -> Dict[str, Any]:
        """Get summary of a specific depth level"""
        if depth not in self.depth_levels:
            return {'error': f'Invalid depth level: {depth}'}
        
        config = self.depth_levels[depth]
        
        # Calculate recent usage statistics
        recent_transitions = [
            t for t in self.depth_transitions
            if t['requested_depth'] == depth and t['approved']
        ]
        
        recent_violations = [
            v for v in self.policy_violations
            if v['requested_depth'] == depth
        ]
        
        return {
            'depth': depth,
            'config': config,
            'recent_usage_count': len(recent_transitions),
            'recent_violation_count': len(recent_violations),
            'success_rate': (
                (len(recent_transitions) / (len(recent_transitions) + len(recent_violations))
                if (len(recent_transitions) + len(recent_violations)) > 0 else 0
            ) * 100
        }

def main():
    """Main entry point for depth ladder governance"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Depth Ladder Governance")
    parser.add_argument("--project-root", help="Project root directory")
    parser.add_argument("--request-transition", nargs=3, 
                       metavar=('CURRENT', 'REQUESTED', 'CIRCLE'),
                       help="Request depth transition")
    parser.add_argument("--reason", help="Reason for transition")
    parser.add_argument("--set-policy", help="Set governance policy")
    parser.add_argument("--status", action="store_true", help="Show governance status")
    parser.add_argument("--depth-summary", type=int, help="Show depth level summary")
    parser.add_argument("--json", action="store_true", help="Output JSON format")
    
    args = parser.parse_args()
    
    # Initialize governance
    project_root = Path(args.project_root) if args.project_root else None
    governance = DepthLadderGovernance(project_root)
    
    # Handle commands
    if args.request_transition:
        current_depth, requested_depth, circle = args.request_transition
        result = governance.request_depth_transition(
            int(current_depth), int(requested_depth), circle, args.reason
        )
        
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            if result['approved']:
                print(f"✅ Transition approved: {result['message']}")
            else:
                print(f"❌ Transition rejected: {result['message']}")
                if result['requires_approval']:
                    print(f"   Approval required from: {result.get('approval_authority', 'unknown')}")
    
    elif args.set_policy:
        policy = GovernancePolicy(args.set_policy)
        success = governance.set_policy(policy, args.reason or "manual")
        
        if args.json:
            print(json.dumps({"success": success, "policy": policy.value}, indent=2))
        else:
            if success:
                print(f"✅ Policy set to: {policy.value}")
            else:
                print(f"❌ Policy change failed")
    
    elif args.depth_summary is not None:
        summary = governance.get_depth_summary(args.depth_summary)
        
        if args.json:
            print(json.dumps(summary, indent=2))
        else:
            if 'error' in summary:
                print(f"❌ {summary['error']}")
            else:
                print("=" * 60)
                print(f"DEPTH {summary['depth']} SUMMARY")
                print("=" * 60)
                print(f"Name: {summary['config']['name']}")
                print(f"Description: {summary['config']['description']}")
                print(f"Requires approval: {summary['config']['requires_approval']}")
                print(f"Recent usage: {summary['recent_usage_count']}")
                print(f"Success rate: {summary['success_rate']:.1f}%")
    
    elif args.status:
        status = governance.get_governance_status()
        
        if args.json:
            print(json.dumps(status, indent=2))
        else:
            print("=" * 50)
            print("GOVERNANCE STATUS")
            print("=" * 50)
            print(f"Active: {status['active']}")
            print(f"Current policy: {status['current_policy']}")
            print(f"Recent transitions: {status['recent_transitions']}")
            print(f"Recent violations: {status['recent_violations']}")
    
    else:
        print("No action specified. Use --help for options.")

if __name__ == "__main__":
    main()