#!/usr/bin/env python3
"""
Adaptive Workflow Optimization Hook
Enhancement Tier: Learns command sequences and suggests batching/parallelization

Target TDD Metrics:
- 25% sequence reduction
- >90% success rate
- <10ms overhead
"""

import sqlite3
import time
import json
from pathlib import Path
from typing import Dict, List, Optional
from collections import defaultdict, deque


class WorkflowOptimizer:
    def __init__(self, db_path: str = '.agentdb/agentdb.sqlite'):
        self.db_path = db_path
        self.command_history = deque(maxlen=50)  # Recent command buffer
        self.sequence_patterns = defaultdict(int)  # Pattern frequency
        self.batch_suggestions = []
        
    def pre_command(self, command: str, context: Dict) -> Dict:
        """Analyze command and suggest optimizations"""
        start = time.time()
        
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Query historical workflow patterns
            cursor.execute("""
                SELECT metric_name, metric_value, trend
                FROM lao_learning_progress
                WHERE dimension = 'resource'
                AND metric_name LIKE '%workflow%'
                ORDER BY created_at DESC
                LIMIT 20
            """)
            
            workflow_patterns = cursor.fetchall()
            conn.close()
            
            # Analyze current command in context of history
            self.command_history.append(command)
            
            # Detect batchable sequences
            batch_opportunity = self._detect_batch_opportunity()
            
            # Check for parallelizable commands
            parallel_opportunity = self._detect_parallel_opportunity()
            
            query_time = (time.time() - start) * 1000
            
            return {
                'batch_suggestion': batch_opportunity,
                'parallel_suggestion': parallel_opportunity,
                'workflow_patterns': len(workflow_patterns),
                'query_time_ms': query_time,
                'optimization_available': batch_opportunity is not None or parallel_opportunity is not None
            }
            
        except Exception as e:
            return {
                'error': str(e),
                'query_time_ms': (time.time() - start) * 1000
            }
    
    def post_command(self, command: str, success: bool, duration_ms: float, context: Dict) -> Dict:
        """Record workflow execution and update patterns"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Update sequence patterns
            sequence_key = self._get_sequence_key()
            self.sequence_patterns[sequence_key] += 1
            
            # Calculate workflow efficiency
            efficiency_score = self._calculate_efficiency(success, duration_ms)
            
            # Store workflow metrics
            cursor.execute("""
                INSERT INTO lao_learning_progress
                (dimension, metric_name, metric_value, sample_count, trend, created_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'))
            """, (
                'resource',
                f'workflow_efficiency_{sequence_key}',
                efficiency_score,
                1,
                'improving' if success else 'degrading'
            ))
            
            conn.commit()
            conn.close()
            
            return {
                'recorded': True,
                'efficiency_score': efficiency_score,
                'sequence_patterns': len(self.sequence_patterns)
            }
            
        except Exception as e:
            return {'error': str(e), 'recorded': False}
    
    def _detect_batch_opportunity(self) -> Optional[Dict]:
        """Detect if recent commands can be batched"""
        if len(self.command_history) < 3:
            return None
        
        recent = list(self.command_history)[-5:]
        
        # Common batch patterns
        git_commands = [c for c in recent if c.startswith('git ')]
        test_commands = [c for c in recent if 'test' in c.lower()]
        
        if len(git_commands) >= 2:
            return {
                'type': 'git_batch',
                'commands': git_commands,
                'suggestion': f'Batch {len(git_commands)} git commands'
            }
        
        if len(test_commands) >= 2:
            return {
                'type': 'test_batch',
                'commands': test_commands,
                'suggestion': f'Batch {len(test_commands)} test commands'
            }
        
        return None
    
    def _detect_parallel_opportunity(self) -> Optional[Dict]:
        """Detect if commands can run in parallel"""
        if len(self.command_history) < 2:
            return None
        
        recent = list(self.command_history)[-3:]
        
        # Check for independent operations
        independent_ops = []
        for cmd in recent:
            if any(keyword in cmd for keyword in ['lint', 'test', 'build', 'compile']):
                independent_ops.append(cmd)
        
        if len(independent_ops) >= 2:
            return {
                'type': 'parallel_execution',
                'commands': independent_ops,
                'suggestion': f'Run {len(independent_ops)} commands in parallel'
            }
        
        return None
    
    def _get_sequence_key(self) -> str:
        """Generate key for command sequence pattern"""
        if len(self.command_history) < 2:
            return 'single_command'
        
        # Last 3 commands as pattern
        recent = list(self.command_history)[-3:]
        cmd_types = [self._classify_command(c) for c in recent]
        return '_'.join(cmd_types)
    
    def _classify_command(self, command: str) -> str:
        """Classify command into type"""
        cmd_lower = command.lower()
        
        if cmd_lower.startswith('git'):
            return 'git'
        elif 'test' in cmd_lower:
            return 'test'
        elif any(word in cmd_lower for word in ['build', 'compile']):
            return 'build'
        elif cmd_lower.startswith('python') or cmd_lower.startswith('node'):
            return 'script'
        else:
            return 'other'
    
    def _calculate_efficiency(self, success: bool, duration_ms: float) -> float:
        """Calculate workflow efficiency score (0-1)"""
        if not success:
            return 0.2
        
        # Normalize duration (assuming 1s = good, >5s = poor)
        duration_score = min(1.0, 1000.0 / max(duration_ms, 100))
        
        return duration_score * 0.8 + 0.2  # Success bonus


# Singleton instance
optimizer = WorkflowOptimizer()


def pre_command(command: str, context: Dict = None) -> Dict:
    return optimizer.pre_command(command, context or {})


def post_command(command: str, success: bool, duration_ms: float, context: Dict = None) -> Dict:
    return optimizer.post_command(command, success, duration_ms, context or {})
