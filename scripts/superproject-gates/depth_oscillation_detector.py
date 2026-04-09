#!/usr/bin/env python3
"""
Depth Oscillation Detector
Detects and analyzes production depth oscillation patterns to prevent system instability
"""

import json
import os
import sys
import statistics
from collections import deque, defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple

class DepthOscillationDetector:
    def __init__(self, project_root: Optional[Path] = None):
        self.project_root = project_root or Path(os.environ.get("PROJECT_ROOT", "."))
        self.goalie_dir = self.project_root / ".goalie"
        self.goalie_dir.mkdir(exist_ok=True)
        
        # Configuration
        self.max_history_size = 50  # Keep last 50 depth changes
        self.oscillation_threshold = 3  # Minimum depth changes to consider oscillation
        self.oscillation_window = timedelta(hours=2)  # Time window for oscillation detection
        self.stabilization_cooldown = timedelta(minutes=30)  # Cooldown after depth change
        
        # State tracking
        self.depth_history = deque(maxlen=self.max_history_size)
        self.oscillation_events = []
        self.last_depth_change = None
        self.stabilization_active = False
        self.stabilization_start = None
        
        # Load existing state
        self._load_state()
    
    def _load_state(self):
        """Load existing detector state"""
        state_file = self.goalie_dir / "depth_oscillation_state.json"
        if state_file.exists():
            try:
                with open(state_file, 'r') as f:
                    state = json.load(f)
                
                # Restore depth history
                for depth_change in state.get('depth_history', []):
                    self.depth_history.append(depth_change)
                
                # Restore oscillation events
                self.oscillation_events = state.get('oscillation_events', [])
                self.last_depth_change = state.get('last_depth_change')
                
                # Restore stabilization state
                self.stabilization_active = state.get('stabilization_active', False)
                if state.get('stabilization_start'):
                    self.stabilization_start = datetime.fromisoformat(state['stabilization_start'])
                    
            except Exception as e:
                print(f"Warning: Could not load depth oscillation state: {e}")
    
    def _save_state(self):
        """Save detector state"""
        state_file = self.goalie_dir / "depth_oscillation_state.json"
        state = {
            'depth_history': list(self.depth_history),
            'oscillation_events': self.oscillation_events,
            'last_depth_change': self.last_depth_change,
            'stabilization_active': self.stabilization_active,
            'stabilization_start': self.stabilization_start.isoformat() if self.stabilization_start else None,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        
        with open(state_file, 'w') as f:
            json.dump(state, f, indent=2)
    
    def record_depth_change(self, new_depth: int, trigger_reason: str = "unknown", 
                        metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Record a depth change and analyze for oscillation"""
        timestamp = datetime.now(timezone.utc)
        
        depth_change = {
            'timestamp': timestamp.isoformat(),
            'depth': new_depth,
            'trigger_reason': trigger_reason,
            'metadata': metadata or {}
        }
        
        # Add to history
        self.depth_history.append(depth_change)
        self.last_depth_change = timestamp
        
        # Analyze for oscillation
        oscillation_result = self._analyze_oscillation()
        
        # Save state
        self._save_state()
        
        # Log event
        self._log_depth_change(depth_change, oscillation_result)
        
        return {
            'depth_change': depth_change,
            'oscillation_detected': oscillation_result['detected'],
            'oscillation_severity': oscillation_result['severity'],
            'stabilization_recommended': oscillation_result['stabilization_recommended'],
            'stabilization_active': self.stabilization_active
        }
    
    def _analyze_oscillation(self) -> Dict[str, Any]:
        """Analyze recent depth changes for oscillation patterns"""
        if len(self.depth_history) < self.oscillation_threshold:
            return {
                'detected': False,
                'severity': 'none',
                'stabilization_recommended': False,
                'analysis': 'insufficient_data'
            }
        
        # Get recent changes within oscillation window
        now = datetime.now(timezone.utc)
        recent_changes = [
            change for change in self.depth_history
            if datetime.fromisoformat(change['timestamp']) >= now - self.oscillation_window
        ]
        
        if len(recent_changes) < self.oscillation_threshold:
            return {
                'detected': False,
                'severity': 'none',
                'stabilization_recommended': False,
                'analysis': 'insufficient_recent_changes'
            }
        
        # Analyze oscillation patterns
        depth_sequence = [change['depth'] for change in recent_changes]
        oscillation_score = self._calculate_oscillation_score(depth_sequence)
        
        # Determine severity
        if oscillation_score >= 8:
            severity = 'critical'
            stabilization_recommended = True
        elif oscillation_score >= 5:
            severity = 'high'
            stabilization_recommended = True
        elif oscillation_score >= 3:
            severity = 'medium'
            stabilization_recommended = False
        else:
            severity = 'low'
            stabilization_recommended = False
        
        # Check for specific patterns
        patterns = self._identify_oscillation_patterns(depth_sequence)
        
        return {
            'detected': oscillation_score > 2,
            'severity': severity,
            'stabilization_recommended': stabilization_recommended,
            'oscillation_score': oscillation_score,
            'patterns': patterns,
            'analysis': {
                'recent_changes': len(recent_changes),
                'depth_sequence': depth_sequence,
                'oscillation_window_hours': self.oscillation_window.total_seconds() / 3600
            }
        }
    
    def _calculate_oscillation_score(self, depth_sequence: List[int]) -> float:
        """Calculate oscillation score based on depth changes"""
        if len(depth_sequence) < 2:
            return 0.0
        
        score = 0.0
        
        # Count direction changes
        direction_changes = 0
        for i in range(1, len(depth_sequence)):
            if (depth_sequence[i] - depth_sequence[i-1]) * (depth_sequence[i-1] - depth_sequence[i-2]) < 0:
                direction_changes += 1
        
        score += direction_changes * 2
        
        # Count depth range
        depth_range = max(depth_sequence) - min(depth_sequence)
        score += depth_range * 1.5
        
        # Count repeated depths
        depth_counts = {}
        for depth in depth_sequence:
            depth_counts[depth] = depth_counts.get(depth, 0) + 1
        
        repeated_depths = sum(count - 1 for count in depth_counts.values() if count > 1)
        score += repeated_depths * 1.0
        
        # Penalize rapid changes
        if len(depth_sequence) > 5:
            # Calculate average change magnitude
            changes = [abs(depth_sequence[i] - depth_sequence[i-1]) for i in range(1, len(depth_sequence))]
            avg_change = statistics.mean(changes)
            if avg_change > 2:
                score += avg_change * 0.5
        
        return score
    
    def _identify_oscillation_patterns(self, depth_sequence: List[int]) -> List[str]:
        """Identify specific oscillation patterns"""
        patterns = []
        
        if len(depth_sequence) < 3:
            return patterns
        
        # Pattern 1: Back-and-forth between two depths
        if len(set(depth_sequence[-4:])) == 2:
            patterns.append('binary_oscillation')
        
        # Pattern 2: Gradual increase then sudden drop
        if len(depth_sequence) >= 4:
            recent = depth_sequence[-4:]
            if (recent[0] < recent[1] < recent[2] and recent[3] < recent[0]):
                patterns.append('rise_and_fall')
        
        # Pattern 3: High frequency changes
        if len(depth_sequence) >= 6:
            changes = [abs(depth_sequence[i] - depth_sequence[i-1]) for i in range(1, len(depth_sequence))]
            if sum(1 for change in changes if change > 0) >= 4:
                patterns.append('high_frequency')
        
        # Pattern 4: Depth cycling
        if len(set(depth_sequence[-6:])) >= 4:
            patterns.append('depth_cycling')
        
        return patterns
    
    def _log_depth_change(self, depth_change: Dict[str, Any], oscillation_result: Dict[str, Any]):
        """Log depth change event"""
        event = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'event_type': 'depth_change',
            'depth': depth_change['depth'],
            'trigger_reason': depth_change['trigger_reason'],
            'metadata': depth_change['metadata'],
            'oscillation_detected': oscillation_result['detected'],
            'oscillation_severity': oscillation_result['severity'],
            'oscillation_score': oscillation_result.get('oscillation_score', 0),
            'patterns': oscillation_result.get('patterns', []),
            'stabilization_active': self.stabilization_active
        }
        
        # Log to pattern metrics
        metrics_file = self.goalie_dir / "pattern_metrics.jsonl"
        with open(metrics_file, 'a') as f:
            f.write(json.dumps(event) + '\n')
        
        # Log specific oscillation events
        if oscillation_result['detected']:
            oscillation_event = {
                'timestamp': event['timestamp'],
                'severity': oscillation_result['severity'],
                'score': oscillation_result.get('oscillation_score', 0),
                'patterns': oscillation_result.get('patterns', []),
                'depth_sequence': oscillation_result['analysis'].get('depth_sequence', []),
                'trigger_reason': depth_change['trigger_reason']
            }
            
            self.oscillation_events.append(oscillation_event)
            
            # Log to separate oscillation file
            oscillation_file = self.goalie_dir / "depth_oscillations.jsonl"
            with open(oscillation_file, 'a') as f:
                f.write(json.dumps(oscillation_event) + '\n')
    
    def get_oscillation_summary(self, hours: int = 24) -> Dict[str, Any]:
        """Get summary of oscillation events in the last N hours"""
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        recent_oscillations = [
            event for event in self.oscillation_events
            if datetime.fromisoformat(event['timestamp']) >= cutoff
        ]
        
        if not recent_oscillations:
            return {
                'period_hours': hours,
                'total_oscillations': 0,
                'severity_distribution': {},
                'pattern_frequency': {},
                'recommendation': 'no_oscillation_detected'
            }
        
        # Analyze severity distribution
        severity_counts = defaultdict(int)
        pattern_counts = defaultdict(int)
        
        for event in recent_oscillations:
            severity_counts[event['severity']] += 1
            for pattern in event.get('patterns', []):
                pattern_counts[pattern] += 1
        
        # Generate recommendation
        total_oscillations = len(recent_oscillations)
        critical_count = severity_counts.get('critical', 0)
        high_count = severity_counts.get('high', 0)
        
        if critical_count > 0 or high_count > 2:
            recommendation = 'immediate_stabilization_required'
        elif high_count > 0 or total_oscillations > 5:
            recommendation = 'stabilization_recommended'
        elif total_oscillations > 2:
            recommendation = 'monitor_closely'
        else:
            recommendation = 'stable'
        
        return {
            'period_hours': hours,
            'total_oscillations': total_oscillations,
            'severity_distribution': dict(severity_counts),
            'pattern_frequency': dict(pattern_counts),
            'recommendation': recommendation,
            'critical_oscillations': critical_count,
            'high_oscillations': high_count
        }
    
    def should_stabilize(self) -> Tuple[bool, str]:
        """Determine if stabilization should be activated"""
        if self.stabilization_active:
            # Check if stabilization period should end
            if self.stabilization_start and \
               datetime.now(timezone.utc) - self.stabilization_start > self.stabilization_cooldown:
                return False, "stabilization_period_expired"
            return True, "stabilization_active"
        
        # Check recent oscillations
        summary = self.get_oscillation_summary(hours=2)
        if summary['recommendation'] in ['immediate_stabilization_required', 'stabilization_recommended']:
            return True, f"oscillation_detected: {summary['recommendation']}"
        
        return False, "no_stabilization_needed"
    
    def activate_stabilization(self, reason: str = "manual") -> bool:
        """Activate stabilization mode"""
        if self.stabilization_active:
            return False
        
        self.stabilization_active = True
        self.stabilization_start = datetime.now(timezone.utc)
        self._save_state()
        
        # Log stabilization activation
        event = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'event_type': 'stabilization_activated',
            'reason': reason,
            'cooldown_minutes': self.stabilization_cooldown.total_seconds() / 60
        }
        
        metrics_file = self.goalie_dir / "pattern_metrics.jsonl"
        with open(metrics_file, 'a') as f:
            f.write(json.dumps(event) + '\n')
        
        return True
    
    def deactivate_stabilization(self, reason: str = "manual") -> bool:
        """Deactivate stabilization mode"""
        if not self.stabilization_active:
            return False
        
        self.stabilization_active = False
        self.stabilization_start = None
        self._save_state()
        
        # Log stabilization deactivation
        event = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'event_type': 'stabilization_deactivated',
            'reason': reason
        }
        
        metrics_file = self.goalie_dir / "pattern_metrics.jsonl"
        with open(metrics_file, 'a') as f:
            f.write(json.dumps(event) + '\n')
        
        return True

def main():
    """Main entry point for depth oscillation detector"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Depth Oscillation Detector")
    parser.add_argument("--project-root", help="Project root directory")
    parser.add_argument("--record-depth", type=int, help="Record a depth change")
    parser.add_argument("--trigger-reason", help="Reason for depth change")
    parser.add_argument("--summary", type=int, default=24, help="Summary period in hours")
    parser.add_argument("--should-stabilize", action="store_true", help="Check if stabilization should be active")
    parser.add_argument("--activate-stabilization", action="store_true", help="Activate stabilization mode")
    parser.add_argument("--deactivate-stabilization", action="store_true", help="Deactivate stabilization mode")
    parser.add_argument("--json", action="store_true", help="Output JSON format")
    
    args = parser.parse_args()
    
    # Initialize detector
    project_root = Path(args.project_root) if args.project_root else None
    detector = DepthOscillationDetector(project_root)
    
    # Handle commands
    if args.record_depth is not None:
        result = detector.record_depth_change(
            args.record_depth, 
            args.trigger_reason or "manual"
        )
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            print(f"Depth change recorded: {args.record_depth}")
            if result['oscillation_detected']:
                print(f"⚠️  Oscillation detected: {result['oscillation_severity']}")
    
    elif args.should_stabilize:
        should_stabilize, reason = detector.should_stabilize()
        if args.json:
            print(json.dumps({"should_stabilize": should_stabilize, "reason": reason}, indent=2))
        else:
            print(f"Should stabilize: {should_stabilize} - {reason}")
    
    elif args.activate_stabilization:
        success = detector.activate_stabilization()
        if args.json:
            print(json.dumps({"success": success}, indent=2))
        else:
            print(f"Stabilization activated: {success}")
    
    elif args.deactivate_stabilization:
        success = detector.deactivate_stabilization()
        if args.json:
            print(json.dumps({"success": success}, indent=2))
        else:
            print(f"Stabilization deactivated: {success}")
    
    else:
        # Default: show summary
        summary = detector.get_oscillation_summary(args.summary)
        if args.json:
            print(json.dumps(summary, indent=2))
        else:
            print("=" * 60)
            print("DEPTH OSCILLATION SUMMARY")
            print("=" * 60)
            print(f"Period: Last {summary['period_hours']} hours")
            print(f"Total oscillations: {summary['total_oscillations']}")
            print(f"Recommendation: {summary['recommendation']}")
            
            if summary['severity_distribution']:
                print("\nSeverity distribution:")
                for severity, count in summary['severity_distribution'].items():
                    print(f"  {severity}: {count}")
            
            if summary['pattern_frequency']:
                print("\nPattern frequency:")
                for pattern, count in summary['pattern_frequency'].items():
                    print(f"  {pattern}: {count}")

if __name__ == "__main__":
    main()