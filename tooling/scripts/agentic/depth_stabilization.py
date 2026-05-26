#!/usr/bin/env python3
"""
Depth Stabilization Strategies
Implements stabilization strategies to prevent excessive depth oscillation
"""

import json
import os
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from enum import Enum

class StabilizationStrategy(Enum):
    """Stabilization strategy types"""
    GRADUAL_PROGRESSION = "gradual_progression"
    COOLDOWN_PERIOD = "cooldown_period"
    THRESHOLD_LIMITING = "threshold_limiting"
    ADAPTIVE_CONTROL = "adaptive_control"

class DepthStabilizer:
    def __init__(self, project_root: Optional[Path] = None):
        self.project_root = project_root or Path(os.environ.get("PROJECT_ROOT", "."))
        self.goalie_dir = self.project_root / ".goalie"
        self.goalie_dir.mkdir(exist_ok=True)
        
        # Configuration
        self.min_cooldown_minutes = 30
        self.max_cooldown_minutes = 120
        self.max_depth_change_per_hour = 2
        self.gradual_progression_steps = [0, 1, 2, 3, 4]  # Allowed progression
        self.max_oscillation_score = 5.0
        
        # State
        self.current_depth = 0
        self.last_depth_change = None
        self.stabilization_active = False
        self.stabilization_strategy = StabilizationStrategy.GRADUAL_PROGRESSION
        self.stabilization_start = None
        self.depth_change_history = []
        
        # Load existing state
        self._load_state()
    
    def _load_state(self):
        """Load existing stabilizer state"""
        state_file = self.goalie_dir / "depth_stabilizer_state.json"
        if state_file.exists():
            try:
                with open(state_file, 'r') as f:
                    state = json.load(f)
                
                self.current_depth = state.get('current_depth', 0)
                self.stabilization_active = state.get('stabilization_active', False)
                self.stabilization_strategy = StabilizationStrategy(
                    state.get('stabilization_strategy', 'gradual_progression')
                )
                
                if state.get('last_depth_change'):
                    self.last_depth_change = datetime.fromisoformat(
                        state['last_depth_change']
                    )
                
                if state.get('stabilization_start'):
                    self.stabilization_start = datetime.fromisoformat(
                        state['stabilization_start']
                    )
                
                self.depth_change_history = state.get('depth_change_history', [])
                    
            except Exception as e:
                print(f"Warning: Could not load stabilizer state: {e}")
    
    def _save_state(self):
        """Save stabilizer state"""
        state_file = self.goalie_dir / "depth_stabilizer_state.json"
        state = {
            'current_depth': self.current_depth,
            'stabilization_active': self.stabilization_active,
            'stabilization_strategy': self.stabilization_strategy.value,
            'last_depth_change': self.last_depth_change.isoformat() if self.last_depth_change else None,
            'stabilization_start': self.stabilization_start.isoformat() if self.stabilization_start else None,
            'depth_change_history': self.depth_change_history[-10:],  # Keep last 10 changes
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        
        with open(state_file, 'w') as f:
            json.dump(state, f, indent=2)
    
    def request_depth_change(self, new_depth: int, trigger_reason: str = "unknown",
                         metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Request a depth change with stabilization checks"""
        timestamp = datetime.now(timezone.utc)
        
        # Check if stabilization is active
        if self.stabilization_active:
            result = self._handle_stabilized_request(new_depth, trigger_reason, metadata)
        else:
            result = self._handle_normal_request(new_depth, trigger_reason, metadata)
        
        # Record the attempt
        attempt = {
            'timestamp': timestamp.isoformat(),
            'requested_depth': new_depth,
            'current_depth': self.current_depth,
            'trigger_reason': trigger_reason,
            'metadata': metadata or {},
            'stabilization_active': self.stabilization_active,
            'strategy': self.stabilization_strategy.value
        }
        
        self.depth_change_history.append(attempt)
        self._save_state()
        
        # Log the attempt
        self._log_depth_change_attempt(attempt, result)
        
        return result
    
    def _handle_normal_request(self, new_depth: int, trigger_reason: str,
                           metadata: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Handle depth change request when stabilization is not active"""
        # Basic validation
        if new_depth < 0 or new_depth > 5:
            return {
                'approved': False,
                'reason': 'invalid_depth_range',
                'message': f'Depth must be between 0 and 5, got {new_depth}',
                'stabilization_activated': False
            }
        
        # Check for rapid changes
        if self.last_depth_change:
            time_since_last = datetime.now(timezone.utc) - self.last_depth_change
            if time_since_last < timedelta(minutes=15):
                return {
                    'approved': False,
                    'reason': 'too_rapid',
                    'message': f'Depth change requested too soon after last change '
                              f'({time_since_last.total_seconds():.0f} seconds)',
                    'stabilization_activated': False
                }
        
        # Apply the change
        old_depth = self.current_depth
        self.current_depth = new_depth
        self.last_depth_change = datetime.now(timezone.utc)
        
        return {
            'approved': True,
            'old_depth': old_depth,
            'new_depth': new_depth,
            'reason': 'approved',
            'message': f'Depth changed from {old_depth} to {new_depth}',
            'stabilization_activated': False
        }
    
    def _handle_stabilized_request(self, new_depth: int, trigger_reason: str,
                               metadata: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Handle depth change request when stabilization is active"""
        if self.stabilization_strategy == StabilizationStrategy.GRADUAL_PROGRESSION:
            return self._apply_gradual_progression(new_depth, trigger_reason, metadata)
        elif self.stabilization_strategy == StabilizationStrategy.COOLDOWN_PERIOD:
            return self._apply_cooldown_period(new_depth, trigger_reason, metadata)
        elif self.stabilization_strategy == StabilizationStrategy.THRESHOLD_LIMITING:
            return self._apply_threshold_limiting(new_depth, trigger_reason, metadata)
        elif self.stabilization_strategy == StabilizationStrategy.ADAPTIVE_CONTROL:
            return self._apply_adaptive_control(new_depth, trigger_reason, metadata)
        else:
            return {
                'approved': False,
                'reason': 'unknown_strategy',
                'message': f'Unknown stabilization strategy: {self.stabilization_strategy}',
                'stabilization_activated': True
            }
    
    def _apply_gradual_progression(self, new_depth: int, trigger_reason: str,
                                 metadata: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Apply gradual progression strategy"""
        old_depth = self.current_depth
        
        # Check if new depth is in allowed progression
        if new_depth not in self.gradual_progression_steps:
            return {
                'approved': False,
                'reason': 'not_in_progression',
                'message': f'Depth {new_depth} not in allowed progression sequence',
                'stabilization_activated': True,
                'allowed_depths': self.gradual_progression_steps
            }
        
        # Check progression order
        current_index = self.gradual_progression_steps.index(old_depth)
        new_index = self.gradual_progression_steps.index(new_depth)
        
        if abs(new_index - current_index) > 1:
            return {
                'approved': False,
                'reason': 'too_large_jump',
                'message': f'Cannot jump from depth {old_depth} to {new_depth}. '
                          f'Maximum jump is 1 step.',
                'stabilization_activated': True
            }
        
        # Apply the change
        self.current_depth = new_depth
        self.last_depth_change = datetime.now(timezone.utc)
        
        return {
            'approved': True,
            'old_depth': old_depth,
            'new_depth': new_depth,
            'reason': 'gradual_progression_approved',
            'message': f'Gradual progression: {old_depth} -> {new_depth}',
            'stabilization_activated': True
        }
    
    def _apply_cooldown_period(self, new_depth: int, trigger_reason: str,
                            metadata: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Apply cooldown period strategy"""
        if not self.stabilization_start:
            self.stabilization_start = datetime.now(timezone.utc)
        
        time_in_stabilization = datetime.now(timezone.utc) - self.stabilization_start
        cooldown_remaining = timedelta(minutes=self.min_cooldown_minutes) - time_in_stabilization
        
        if cooldown_remaining.total_seconds() > 0:
            return {
                'approved': False,
                'reason': 'cooldown_active',
                'message': f'Cooldown active. {cooldown_remaining.total_seconds():.0f} seconds remaining.',
                'stabilization_activated': True,
                'cooldown_remaining_seconds': cooldown_remaining.total_seconds()
            }
        
        # Cooldown expired, allow change
        old_depth = self.current_depth
        self.current_depth = new_depth
        self.last_depth_change = datetime.now(timezone.utc)
        
        return {
            'approved': True,
            'old_depth': old_depth,
            'new_depth': new_depth,
            'reason': 'cooldown_expired',
            'message': f'Cooldown expired. Depth changed: {old_depth} -> {new_depth}',
            'stabilization_activated': True
        }
    
    def _apply_threshold_limiting(self, new_depth: int, trigger_reason: str,
                               metadata: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Apply threshold limiting strategy"""
        old_depth = self.current_depth
        
        # Count recent depth changes
        recent_changes = [
            change for change in self.depth_change_history
            if datetime.fromisoformat(change['timestamp']) >= 
               datetime.now(timezone.utc) - timedelta(hours=1)
        ]
        
        if len(recent_changes) >= self.max_depth_change_per_hour:
            return {
                'approved': False,
                'reason': 'threshold_exceeded',
                'message': f'Maximum depth changes per hour exceeded '
                          f'({len(recent_changes)} >= {self.max_depth_change_per_hour})',
                'stabilization_activated': True,
                'recent_changes': len(recent_changes)
            }
        
        # Allow change
        self.current_depth = new_depth
        self.last_depth_change = datetime.now(timezone.utc)
        
        return {
            'approved': True,
            'old_depth': old_depth,
            'new_depth': new_depth,
            'reason': 'threshold_not_exceeded',
            'message': f'Threshold check passed. Depth changed: {old_depth} -> {new_depth}',
            'stabilization_activated': True
        }
    
    def _apply_adaptive_control(self, new_depth: int, trigger_reason: str,
                            metadata: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Apply adaptive control strategy based on recent patterns"""
        old_depth = self.current_depth
        
        # Analyze recent oscillation patterns
        recent_changes = self.depth_change_history[-10:]  # Last 10 changes
        
        if len(recent_changes) < 3:
            # Not enough history, use basic cooldown
            return self._apply_cooldown_period(new_depth, trigger_reason, metadata)
        
        # Calculate oscillation metrics
        depth_sequence = [change.get('approved_depth', change.get('requested_depth', old_depth)) 
                       for change in recent_changes]
        
        # Detect oscillation
        oscillation_score = self._calculate_oscillation_score(depth_sequence)
        
        if oscillation_score > self.max_oscillation_score:
            return {
                'approved': False,
                'reason': 'high_oscillation_detected',
                'message': f'High oscillation detected (score: {oscillation_score:.1f}). '
                          f'Depth change rejected.',
                'stabilization_activated': True,
                'oscillation_score': oscillation_score
            }
        
        # Adaptive cooldown based on oscillation score
        cooldown_minutes = min(
            self.max_cooldown_minutes,
            int(oscillation_score * 10)  # Scale cooldown with oscillation
        )
        
        if self.stabilization_start:
            time_in_stabilization = datetime.now(timezone.utc) - self.stabilization_start
            cooldown_remaining = timedelta(minutes=cooldown_minutes) - time_in_stabilization
            
            if cooldown_remaining.total_seconds() > 0:
                return {
                    'approved': False,
                    'reason': 'adaptive_cooldown',
                    'message': f'Adaptive cooldown active. '
                              f'{cooldown_remaining.total_seconds():.0f} seconds remaining.',
                    'stabilization_activated': True,
                    'cooldown_remaining_seconds': cooldown_remaining.total_seconds(),
                    'oscillation_score': oscillation_score
                }
        
        # Allow change
        self.current_depth = new_depth
        self.last_depth_change = datetime.now(timezone.utc)
        
        return {
            'approved': True,
            'old_depth': old_depth,
            'new_depth': new_depth,
            'reason': 'adaptive_control_approved',
            'message': f'Adaptive control approved. Depth changed: {old_depth} -> {new_depth}',
            'stabilization_activated': True,
            'oscillation_score': oscillation_score
        }
    
    def _calculate_oscillation_score(self, depth_sequence: List[int]) -> float:
        """Calculate oscillation score for depth sequence"""
        if len(depth_sequence) < 2:
            return 0.0
        
        score = 0.0
        
        # Count direction changes
        direction_changes = 0
        for i in range(1, len(depth_sequence)):
            if i >= 2 and ((depth_sequence[i] - depth_sequence[i-1]) * 
                           (depth_sequence[i-1] - depth_sequence[i-2])) < 0:
                direction_changes += 1
        
        score += direction_changes * 1.5
        
        # Count depth range
        depth_range = max(depth_sequence) - min(depth_sequence)
        score += depth_range * 0.8
        
        # Count repeated depths
        depth_counts = {}
        for depth in depth_sequence:
            depth_counts[depth] = depth_counts.get(depth, 0) + 1
        
        repeated_depths = sum(count - 1 for count in depth_counts.values() if count > 1)
        score += repeated_depths * 1.0
        
        return score
    
    def _log_depth_change_attempt(self, attempt: Dict[str, Any], result: Dict[str, Any]):
        """Log depth change attempt"""
        event = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'event_type': 'depth_change_attempt',
            'requested_depth': attempt['requested_depth'],
            'current_depth': attempt['current_depth'],
            'trigger_reason': attempt['trigger_reason'],
            'metadata': attempt['metadata'],
            'stabilization_active': attempt['stabilization_active'],
            'strategy': attempt['strategy'],
            'approved': result['approved'],
            'reason': result['reason'],
            'message': result['message']
        }
        
        # Log to pattern metrics
        metrics_file = self.goalie_dir / "pattern_metrics.jsonl"
        with open(metrics_file, 'a') as f:
            f.write(json.dumps(event) + '\n')
    
    def activate_stabilization(self, strategy: StabilizationStrategy = StabilizationStrategy.GRADUAL_PROGRESSION,
                           reason: str = "manual") -> bool:
        """Activate stabilization with specified strategy"""
        if self.stabilization_active:
            return False
        
        self.stabilization_active = True
        self.stabilization_strategy = strategy
        self.stabilization_start = datetime.now(timezone.utc)
        self._save_state()
        
        # Log activation
        event = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'event_type': 'stabilization_activated',
            'strategy': strategy.value,
            'reason': reason
        }
        
        metrics_file = self.goalie_dir / "pattern_metrics.jsonl"
        with open(metrics_file, 'a') as f:
            f.write(json.dumps(event) + '\n')
        
        return True
    
    def deactivate_stabilization(self, reason: str = "manual") -> bool:
        """Deactivate stabilization"""
        if not self.stabilization_active:
            return False
        
        self.stabilization_active = False
        self.stabilization_start = None
        self._save_state()
        
        # Log deactivation
        event = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'event_type': 'stabilization_deactivated',
            'reason': reason
        }
        
        metrics_file = self.goalie_dir / "pattern_metrics.jsonl"
        with open(metrics_file, 'a') as f:
            f.write(json.dumps(event) + '\n')
        
        return True
    
    def get_stabilization_status(self) -> Dict[str, Any]:
        """Get current stabilization status"""
        status = {
            'active': self.stabilization_active,
            'current_depth': self.current_depth,
            'strategy': self.stabilization_strategy.value if self.stabilization_active else None,
            'last_depth_change': self.last_depth_change.isoformat() if self.last_depth_change else None
        }
        
        if self.stabilization_active and self.stabilization_start:
            time_in_stabilization = datetime.now(timezone.utc) - self.stabilization_start
            status['time_in_stabilization_minutes'] = time_in_stabilization.total_seconds() / 60
            
            # Add strategy-specific info
            if self.stabilization_strategy == StabilizationStrategy.COOLDOWN_PERIOD:
                cooldown_remaining = timedelta(minutes=self.min_cooldown_minutes) - time_in_stabilization
                status['cooldown_remaining_seconds'] = max(0, cooldown_remaining.total_seconds())
            
            elif self.stabilization_strategy == StabilizationStrategy.ADAPTIVE_CONTROL:
                recent_depths = [change.get('approved_depth', self.current_depth) 
                                for change in self.depth_change_history[-5:]]
                status['oscillation_score'] = self._calculate_oscillation_score(recent_depths)
        
        return status

def main():
    """Main entry point for depth stabilizer"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Depth Stabilizer")
    parser.add_argument("--project-root", help="Project root directory")
    parser.add_argument("--request-depth", type=int, help="Request depth change")
    parser.add_argument("--trigger-reason", help="Reason for depth change")
    parser.add_argument("--activate-stabilization", help="Activate stabilization")
    parser.add_argument("--deactivate-stabilization", action="store_true", help="Deactivate stabilization")
    parser.add_argument("--status", action="store_true", help="Show stabilization status")
    parser.add_argument("--json", action="store_true", help="Output JSON format")
    
    args = parser.parse_args()
    
    # Initialize stabilizer
    project_root = Path(args.project_root) if args.project_root else None
    stabilizer = DepthStabilizer(project_root)
    
    # Handle commands
    if args.request_depth is not None:
        result = stabilizer.request_depth_change(
            args.request_depth,
            args.trigger_reason or "manual"
        )
        
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            if result['approved']:
                print(f"✅ Depth change approved: {result['message']}")
            else:
                print(f"❌ Depth change rejected: {result['message']}")
    
    elif args.activate_stabilization:
        strategy = StabilizationStrategy(args.activate_stabilization)
        success = stabilizer.activate_stabilization(strategy)
        
        if args.json:
            print(json.dumps({"success": success, "strategy": strategy.value}, indent=2))
        else:
            if success:
                print(f"✅ Stabilization activated with strategy: {strategy.value}")
            else:
                print(f"❌ Stabilization activation failed")
    
    elif args.deactivate_stabilization:
        success = stabilizer.deactivate_stabilization()
        
        if args.json:
            print(json.dumps({"success": success}, indent=2))
        else:
            if success:
                print("✅ Stabilization deactivated")
            else:
                print("❌ Stabilization deactivation failed")
    
    elif args.status:
        status = stabilizer.get_stabilization_status()
        
        if args.json:
            print(json.dumps(status, indent=2))
        else:
            print("=" * 50)
            print("STABILIZATION STATUS")
            print("=" * 50)
            print(f"Active: {status['active']}")
            print(f"Current Depth: {status['current_depth']}")
            
            if status['active']:
                print(f"Strategy: {status['strategy']}")
                if status.get('time_in_stabilization_minutes'):
                    print(f"Time in stabilization: {status['time_in_stabilization_minutes']:.1f} minutes")
                
                if status.get('cooldown_remaining_seconds'):
                    print(f"Cooldown remaining: {status['cooldown_remaining_seconds']:.0f} seconds")
                
                if status.get('oscillation_score'):
                    print(f"Oscillation score: {status['oscillation_score']:.1f}")
            
            if status['last_depth_change']:
                print(f"Last depth change: {status['last_depth_change']}")
    
    else:
        print("No action specified. Use --help for options.")

if __name__ == "__main__":
    main()