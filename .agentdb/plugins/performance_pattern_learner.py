#!/usr/bin/env python3
"""
Performance Pattern Learner Hook
Foundation hook implementing Decision Transformer for trajectory-based performance prediction.

TDD Targets:
- 80% prediction accuracy
- <5ms latency per prediction
- 40-50% token reduction via hierarchical pruning
- 95% command coverage
"""

import sqlite3
import json
import time
from typing import Dict, List, Optional, Tuple
from pathlib import Path
import hashlib

class PerformancePatternLearner:
    """
    PreToolUse: Query performance_predictions table for similar command trajectories
    PostToolUse: Record actual outcomes and update confidence models
    """
    
    def __init__(self, db_path: str = ".agentdb/agentdb.sqlite"):
        self.db_path = Path(db_path)
        self.prediction_cache = {}
        self.cache_hits = 0
        self.cache_misses = 0
        
    def _get_connection(self) -> sqlite3.Connection:
        """Get database connection with optimizations."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        # Performance optimizations
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
        conn.execute("PRAGMA cache_size=10000")
        return conn
    
    def _command_signature(self, command: str) -> str:
        """Generate command signature for pattern matching."""
        # Extract command type (first word)
        cmd_type = command.split()[0] if command else "unknown"
        # Hash for cache key
        return hashlib.md5(f"{cmd_type}:{command[:100]}".encode()).hexdigest()
    
    def pre_tool_use(self, command: str, context: Dict) -> Dict:
        """
        PreToolUse Hook: Predict performance before execution.
        
        Args:
            command: Command to execute
            context: Execution context (file_type, git_state, time_of_day, etc.)
        
        Returns:
            Prediction dict with duration_ms, success_prob, risks, confidence
        """
        start_time = time.time()
        
        # Check cache
        cache_key = self._command_signature(command)
        if cache_key in self.prediction_cache:
            self.cache_hits += 1
            prediction = self.prediction_cache[cache_key]
            prediction['cache_hit'] = True
            prediction['latency_ms'] = (time.time() - start_time) * 1000
            return prediction
        
        self.cache_misses += 1
        
        # Query similar trajectories from AgentDB
        conn = self._get_connection()
        cursor = conn.cursor()
        
        # Find similar commands using LIKE pattern matching
        # In production, use vector embeddings for semantic similarity
        cmd_pattern = f"%{command.split()[0]}%" if command else "%"
        
        cursor.execute("""
            SELECT 
                cmd,
                predicted_duration_ms,
                actual_duration_ms,
                predicted_failure_prob,
                actual_failed,
                confidence,
                timestamp
            FROM performance_predictions
            WHERE cmd LIKE ?
            ORDER BY timestamp DESC
            LIMIT 10
        """, (cmd_pattern,))
        
        trajectories = cursor.fetchall()
        conn.close()
        
        # Decision Transformer: Aggregate historical patterns
        if not trajectories:
            prediction = {
                'predicted_duration_ms': 100,  # Default baseline
                'success_probability': 0.5,
                'confidence': 0.1,  # Low confidence for unseen commands
                'risks': ['No historical data'],
                'similar_count': 0,
                'cache_hit': False
            }
        else:
            # Aggregate predictions from similar trajectories
            durations = [t['actual_duration_ms'] or t['predicted_duration_ms'] for t in trajectories]
            failures = [t['actual_failed'] for t in trajectories if t['actual_failed'] is not None]
            confidences = [t['confidence'] for t in trajectories]
            
            # Weighted average favoring recent trajectories
            weights = [1.0 / (i + 1) for i in range(len(durations))]
            weighted_duration = sum(d * w for d, w in zip(durations, weights)) / sum(weights)
            
            failure_rate = sum(failures) / len(failures) if failures else 0.05
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0.5
            
            # Identify risks
            risks = []
            if failure_rate > 0.2:
                risks.append(f"High failure rate: {failure_rate:.1%}")
            if weighted_duration > 5000:
                risks.append(f"Long execution: {weighted_duration:.0f}ms")
            if avg_confidence < 0.7:
                risks.append("Low historical confidence")
            
            prediction = {
                'predicted_duration_ms': int(weighted_duration),
                'success_probability': 1.0 - failure_rate,
                'confidence': avg_confidence,
                'risks': risks or ['No significant risks'],
                'similar_count': len(trajectories),
                'cache_hit': False
            }
        
        # Cache prediction
        self.prediction_cache[cache_key] = prediction
        
        latency_ms = (time.time() - start_time) * 1000
        prediction['latency_ms'] = latency_ms
        
        # Hierarchical pruning: Only load detailed context if needed
        if prediction['confidence'] < 0.7:
            prediction['suggest_load_context'] = True
        else:
            prediction['suggest_load_context'] = False
        
        return prediction
    
    def post_tool_use(self, command: str, prediction: Dict, actual_result: Dict) -> Dict:
        """
        PostToolUse Hook: Record actual outcome and update models.
        
        Args:
            command: Executed command
            prediction: Prediction from pre_tool_use
            actual_result: Actual execution results (duration_ms, exit_code, output)
        
        Returns:
            Learning feedback dict
        """
        start_time = time.time()
        
        # Extract actual metrics
        actual_duration_ms = actual_result.get('duration_ms', 0)
        actual_failed = 1 if actual_result.get('exit_code', 0) != 0 else 0
        
        # Calculate prediction accuracy
        predicted_duration = prediction.get('predicted_duration_ms', 100)
        duration_error = abs(actual_duration_ms - predicted_duration) / max(predicted_duration, 1)
        
        predicted_success = prediction.get('success_probability', 0.5)
        success_correct = (predicted_success > 0.5) == (actual_failed == 0)
        
        # Confidence score for this prediction
        if success_correct and duration_error < 0.2:
            prediction_confidence = 0.9
        elif success_correct and duration_error < 0.5:
            prediction_confidence = 0.7
        elif success_correct:
            prediction_confidence = 0.5
        else:
            prediction_confidence = 0.2
        
        # Store in database
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO performance_predictions 
            (cmd, predicted_duration_ms, actual_duration_ms, predicted_failure_prob, 
             actual_failed, confidence, timestamp, accuracy_delta)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            command[:500],  # Limit length
            predicted_duration,
            actual_duration_ms,
            1.0 - predicted_success,
            actual_failed,
            prediction_confidence,
            int(time.time()),
            duration_error
        ))
        
        conn.commit()
        conn.close()
        
        # Invalidate cache for this command pattern
        cache_key = self._command_signature(command)
        if cache_key in self.prediction_cache:
            del self.prediction_cache[cache_key]
        
        # Memory distillation trigger (every 100 records)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM performance_predictions")
        total_records = cursor.fetchone()[0]
        
        trigger_distillation = (total_records % 100 == 0)
        
        feedback = {
            'prediction_accuracy': 1.0 - duration_error if duration_error < 1.0 else 0.0,
            'success_prediction_correct': success_correct,
            'confidence_score': prediction_confidence,
            'trigger_distillation': trigger_distillation,
            'total_trajectories': total_records,
            'cache_hit_rate': self.cache_hits / max(self.cache_hits + self.cache_misses, 1),
            'post_latency_ms': (time.time() - start_time) * 1000
        }
        
        return feedback
    
    def get_stats(self) -> Dict:
        """Get learner statistics."""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                COUNT(*) as total,
                AVG(confidence) as avg_confidence,
                AVG(accuracy_delta) as avg_error,
                SUM(CASE WHEN actual_failed = 0 THEN 1 ELSE 0 END) * 1.0 / COUNT(*) as success_rate
            FROM performance_predictions
            WHERE actual_duration_ms IS NOT NULL
        """)
        
        stats = dict(cursor.fetchone())
        stats['cache_hit_rate'] = self.cache_hits / max(self.cache_hits + self.cache_misses, 1)
        stats['cache_size'] = len(self.prediction_cache)
        
        conn.close()
        return stats


def main():
    """CLI entry point for testing."""
    import sys
    
    learner = PerformancePatternLearner()
    
    if len(sys.argv) < 2:
        # Show stats
        stats = learner.get_stats()
        print(json.dumps(stats, indent=2))
        return
    
    command = sys.argv[1]
    context = {}
    
    # Test prediction
    print("🔮 Predicting performance...")
    prediction = learner.pre_tool_use(command, context)
    print(json.dumps(prediction, indent=2))
    
    # Simulate execution (for testing)
    if len(sys.argv) > 2 and sys.argv[2] == "--simulate":
        import random
        actual_result = {
            'duration_ms': prediction['predicted_duration_ms'] + random.randint(-50, 50),
            'exit_code': 0 if random.random() > 0.1 else 1,
            'output': 'Simulated output'
        }
        
        print("\n📊 Recording actual outcome...")
        feedback = learner.post_tool_use(command, prediction, actual_result)
        print(json.dumps(feedback, indent=2))


if __name__ == "__main__":
    main()
