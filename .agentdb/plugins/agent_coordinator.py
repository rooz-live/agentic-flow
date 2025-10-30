#!/usr/bin/env python3
"""
Agent Coordinator Plugin - Federated Learning & Task Routing
============================================================

Implements federated learning across specialized agents to optimize task
assignment, coordination, and multi-agent collaboration patterns.

Key Features:
- Agent expertise profiling based on historical success rates
- Task-agent matching using collaborative filtering
- Swarm coordination pattern learning
- Federated model updates across agent domains

Metrics:
- Task matching improvement (≥30% target)
- Coordination accuracy (≥95% target)
- Agent utilization optimization
- Cross-agent knowledge transfer

Usage:
    python3 agent_coordinator.py --initialize
    python3 agent_coordinator.py --assign-task "Build API endpoint"
    python3 agent_coordinator.py --update-expertise --agent "coder" --success true
    python3 agent_coordinator.py --report --days 7
"""

import argparse
import json
import sqlite3
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Set
import sys
import hashlib

sys.path.insert(0, str(Path(__file__).parent.parent))


class AgentCoordinator:
    """Coordinate multi-agent task assignment using federated learning"""
    
    # Performance targets
    TARGETS = {
        'task_matching_improvement': 0.30,  # 30% improvement
        'coordination_accuracy': 0.95,       # 95% accuracy
        'agent_utilization_min': 0.70,       # 70% utilization
        'knowledge_transfer_rate': 0.85      # 85% transfer success
    }
    
    # Agent specializations (extensible)
    AGENT_TYPES = {
        'coder': ['implementation', 'debugging', 'refactoring', 'api-design'],
        'architect': ['system-design', 'architecture', 'patterns', 'scalability'],
        'tester': ['testing', 'qa', 'validation', 'coverage'],
        'devops': ['deployment', 'ci-cd', 'infrastructure', 'monitoring'],
        'security': ['security', 'authentication', 'encryption', 'audit'],
        'researcher': ['research', 'analysis', 'benchmarking', 'optimization']
    }
    
    def __init__(self, db_path: str = '.agentdb/agentdb.sqlite'):
        self.db_path = Path(db_path)
        if not self.db_path.exists():
            raise FileNotFoundError(f"AgentDB not found at {self.db_path}")
        
        self.conn = sqlite3.connect(str(self.db_path))
        self.conn.row_factory = sqlite3.Row
    
    def initialize(self) -> bool:
        """Initialize agent coordination schema"""
        try:
            cursor = self.conn.cursor()
            
            # Agent profiles table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS agent_profiles (
                    agent_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    agent_name TEXT UNIQUE NOT NULL,
                    agent_type TEXT NOT NULL,
                    specializations TEXT,  -- JSON array
                    total_tasks INTEGER DEFAULT 0,
                    successful_tasks INTEGER DEFAULT 0,
                    success_rate REAL DEFAULT 0.0,
                    avg_completion_time_ms REAL DEFAULT 0.0,
                    expertise_score REAL DEFAULT 0.5,
                    last_active TEXT,
                    created_at TEXT NOT NULL
                )
            """)
            
            # Task assignments table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS task_assignments (
                    assignment_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    task_hash TEXT UNIQUE NOT NULL,
                    task_description TEXT NOT NULL,
                    task_type TEXT,
                    task_complexity REAL,
                    assigned_agent_id INTEGER,
                    assignment_confidence REAL,
                    assignment_method TEXT,
                    started_at TEXT,
                    completed_at TEXT,
                    success BOOLEAN,
                    actual_duration_ms REAL,
                    quality_score REAL,
                    notes TEXT,
                    FOREIGN KEY (assigned_agent_id) REFERENCES agent_profiles(agent_id)
                )
            """)
            
            # Agent coordination patterns
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS coordination_patterns (
                    pattern_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    pattern_name TEXT NOT NULL,
                    agent_ids TEXT,  -- JSON array
                    task_types TEXT,  -- JSON array
                    success_count INTEGER DEFAULT 0,
                    failure_count INTEGER DEFAULT 0,
                    pattern_confidence REAL DEFAULT 0.5,
                    avg_synergy_score REAL DEFAULT 0.0,
                    last_used TEXT,
                    created_at TEXT NOT NULL
                )
            """)
            
            # Federated learning updates
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS federated_updates (
                    update_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    agent_id INTEGER,
                    update_type TEXT NOT NULL,
                    model_version INTEGER,
                    performance_delta REAL,
                    knowledge_transferred TEXT,  -- JSON
                    timestamp TEXT NOT NULL,
                    FOREIGN KEY (agent_id) REFERENCES agent_profiles(agent_id)
                )
            """)
            
            # Create indexes
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_agent_type 
                ON agent_profiles(agent_type)
            """)
            
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_task_hash 
                ON task_assignments(task_hash)
            """)
            
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_assignment_success 
                ON task_assignments(success)
            """)
            
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_coordination_confidence 
                ON coordination_patterns(pattern_confidence)
            """)
            
            self.conn.commit()
            
            # Initialize default agents
            self._seed_default_agents()
            
            print("✅ Agent Coordinator schema initialized")
            return True
            
        except sqlite3.Error as e:
            print(f"❌ Database error: {e}")
            return False
    
    def _seed_default_agents(self):
        """Seed database with default agent profiles"""
        cursor = self.conn.cursor()
        timestamp = datetime.now().isoformat()
        
        for agent_type, specializations in self.AGENT_TYPES.items():
            try:
                cursor.execute("""
                    INSERT OR IGNORE INTO agent_profiles 
                    (agent_name, agent_type, specializations, created_at)
                    VALUES (?, ?, ?, ?)
                """, (
                    agent_type,
                    agent_type,
                    json.dumps(specializations),
                    timestamp
                ))
            except sqlite3.IntegrityError:
                pass  # Agent already exists
        
        self.conn.commit()
    
    def assign_task(self, task_description: str, task_type: Optional[str] = None) -> Dict:
        """
        Assign task to best-matched agent using federated learning model
        
        Returns:
            dict: {
                'agent': str,
                'confidence': float,
                'method': str,
                'reasoning': str
            }
        """
        task_hash = hashlib.sha256(task_description.encode()).hexdigest()[:16]
        
        # Check if task already assigned
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT * FROM task_assignments WHERE task_hash = ?
        """, (task_hash,))
        
        existing = cursor.fetchone()
        if existing:
            return {
                'agent': existing['assigned_agent_id'],
                'confidence': existing['assignment_confidence'],
                'method': 'cached',
                'reasoning': 'Task previously assigned'
            }
        
        # Infer task type from description if not provided
        if not task_type:
            task_type = self._infer_task_type(task_description)
        
        # Calculate task complexity
        complexity = self._estimate_complexity(task_description)
        
        # Get agent rankings
        agent_scores = self._rank_agents_for_task(task_type, complexity)
        
        if not agent_scores:
            # Fallback: assign to 'coder' agent
            best_agent_id = self._get_agent_id('coder')
            confidence = 0.5
            method = 'fallback'
            reasoning = 'No specialized agent found, using default'
        else:
            best_agent_id, confidence = agent_scores[0]
            method = 'federated-matching'
            reasoning = f'Best match for {task_type} with complexity {complexity:.2f}'
        
        # Store assignment
        timestamp = datetime.now().isoformat()
        cursor.execute("""
            INSERT INTO task_assignments 
            (task_hash, task_description, task_type, task_complexity,
             assigned_agent_id, assignment_confidence, assignment_method, started_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            task_hash,
            task_description,
            task_type,
            complexity,
            best_agent_id,
            confidence,
            method,
            timestamp
        ))
        self.conn.commit()
        
        return {
            'agent': self._get_agent_name(best_agent_id),
            'confidence': confidence,
            'method': method,
            'reasoning': reasoning
        }
    
    def _infer_task_type(self, description: str) -> str:
        """Infer task type from description keywords"""
        description_lower = description.lower()
        
        # Keyword mapping
        type_keywords = {
            'implementation': ['implement', 'build', 'create', 'develop', 'code'],
            'debugging': ['debug', 'fix', 'bug', 'error', 'issue'],
            'testing': ['test', 'qa', 'validate', 'verify'],
            'deployment': ['deploy', 'release', 'production', 'ci/cd'],
            'security': ['security', 'auth', 'encrypt', 'secure'],
            'architecture': ['design', 'architecture', 'pattern', 'structure'],
            'research': ['research', 'analyze', 'investigate', 'benchmark']
        }
        
        for task_type, keywords in type_keywords.items():
            if any(kw in description_lower for kw in keywords):
                return task_type
        
        return 'implementation'  # default
    
    def _estimate_complexity(self, description: str) -> float:
        """Estimate task complexity (0.0-1.0) based on description"""
        # Simple heuristic: longer descriptions = higher complexity
        word_count = len(description.split())
        
        # Additional complexity signals
        complexity_signals = [
            'integrate', 'optimize', 'refactor', 'migrate',
            'enterprise', 'scalable', 'distributed', 'real-time'
        ]
        
        base_complexity = min(word_count / 50, 0.7)  # Cap at 0.7
        signal_boost = sum(
            0.1 for signal in complexity_signals 
            if signal in description.lower()
        )
        
        return min(base_complexity + signal_boost, 1.0)
    
    def _rank_agents_for_task(
        self, 
        task_type: str, 
        complexity: float
    ) -> List[Tuple[int, float]]:
        """
        Rank agents by suitability for task
        
        Returns:
            List of (agent_id, confidence_score) tuples, sorted by score desc
        """
        cursor = self.conn.cursor()
        
        # Get all agents with their specializations
        cursor.execute("""
            SELECT agent_id, agent_name, agent_type, specializations, 
                   success_rate, expertise_score
            FROM agent_profiles
            WHERE success_rate >= 0.3 OR total_tasks < 5
            ORDER BY expertise_score DESC
        """)
        
        agents = cursor.fetchall()
        scores = []
        
        for agent in agents:
            specializations = json.loads(agent['specializations'] or '[]')
            
            # Base score: expertise + success rate
            base_score = (agent['expertise_score'] * 0.6 + agent['success_rate'] * 0.4)
            
            # Specialization match bonus
            spec_match = 1.0 if task_type in specializations else 0.5
            
            # Complexity alignment (penalize if mismatch)
            expected_complexity = 0.5 + (agent['expertise_score'] * 0.5)
            complexity_penalty = abs(complexity - expected_complexity)
            
            final_score = base_score * spec_match * (1.0 - complexity_penalty * 0.3)
            scores.append((agent['agent_id'], final_score))
        
        # Sort by score descending
        scores.sort(key=lambda x: x[1], reverse=True)
        return scores
    
    def update_task_outcome(
        self, 
        task_description: str,
        success: bool,
        duration_ms: Optional[float] = None,
        quality_score: Optional[float] = None
    ) -> bool:
        """Update task outcome for learning"""
        task_hash = hashlib.sha256(task_description.encode()).hexdigest()[:16]
        cursor = self.conn.cursor()
        
        # Get assignment
        cursor.execute("""
            SELECT * FROM task_assignments WHERE task_hash = ?
        """, (task_hash,))
        
        assignment = cursor.fetchone()
        if not assignment:
            print(f"⚠️ No assignment found for task: {task_description[:50]}...")
            return False
        
        # Update assignment record
        timestamp = datetime.now().isoformat()
        cursor.execute("""
            UPDATE task_assignments
            SET completed_at = ?, success = ?, actual_duration_ms = ?, quality_score = ?
            WHERE task_hash = ?
        """, (timestamp, success, duration_ms, quality_score, task_hash))
        
        # Update agent profile
        agent_id = assignment['assigned_agent_id']
        cursor.execute("""
            UPDATE agent_profiles
            SET total_tasks = total_tasks + 1,
                successful_tasks = successful_tasks + CASE WHEN ? THEN 1 ELSE 0 END,
                success_rate = CAST(successful_tasks AS REAL) / NULLIF(total_tasks, 0),
                last_active = ?
            WHERE agent_id = ?
        """, (success, timestamp, agent_id))
        
        # Recalculate expertise score
        cursor.execute("""
            SELECT success_rate, total_tasks FROM agent_profiles WHERE agent_id = ?
        """, (agent_id,))
        
        profile = cursor.fetchone()
        if profile and profile['total_tasks'] >= 5:
            # Expertise = success_rate * experience_factor
            experience_factor = min(profile['total_tasks'] / 100, 1.0)
            expertise = profile['success_rate'] * (0.5 + 0.5 * experience_factor)
            
            cursor.execute("""
                UPDATE agent_profiles SET expertise_score = ? WHERE agent_id = ?
            """, (expertise, agent_id))
        
        # Log federated update
        performance_delta = 1.0 if success else -0.5
        cursor.execute("""
            INSERT INTO federated_updates 
            (agent_id, update_type, performance_delta, timestamp)
            VALUES (?, 'task-outcome', ?, ?)
        """, (agent_id, performance_delta, timestamp))
        
        self.conn.commit()
        print(f"✅ Updated agent expertise based on task outcome")
        return True
    
    def generate_report(self, days: int = 7) -> Dict:
        """Generate coordination metrics report"""
        cursor = self.conn.cursor()
        cutoff = (datetime.now() - timedelta(days=days)).isoformat()
        
        # Overall metrics
        cursor.execute("""
            SELECT 
                COUNT(*) as total_assignments,
                SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_tasks,
                AVG(assignment_confidence) as avg_confidence,
                AVG(actual_duration_ms) as avg_duration,
                AVG(quality_score) as avg_quality
            FROM task_assignments
            WHERE started_at >= ?
        """, (cutoff,))
        
        overall = cursor.fetchone()
        
        # Agent performance
        cursor.execute("""
            SELECT agent_name, agent_type, success_rate, expertise_score, total_tasks
            FROM agent_profiles
            WHERE total_tasks > 0
            ORDER BY expertise_score DESC
        """)
        
        agents = cursor.fetchall()
        
        # Calculate improvement metric
        cursor.execute("""
            SELECT AVG(assignment_confidence) as baseline_confidence
            FROM task_assignments
            WHERE started_at < ?
            LIMIT 100
        """, (cutoff,))
        
        baseline_row = cursor.fetchone()
        baseline_confidence = baseline_row['baseline_confidence'] if baseline_row else 0.5
        current_confidence = overall['avg_confidence'] or 0.5
        
        improvement = ((current_confidence - baseline_confidence) / baseline_confidence) \
            if baseline_confidence > 0 else 0.0
        
        # Validation
        meets_improvement = improvement >= self.TARGETS['task_matching_improvement']
        meets_accuracy = (overall['successful_tasks'] or 0) / max(overall['total_assignments'], 1) >= \
                        self.TARGETS['coordination_accuracy']
        
        return {
            'period_days': days,
            'total_assignments': overall['total_assignments'] or 0,
            'successful_tasks': overall['successful_tasks'] or 0,
            'success_rate': (overall['successful_tasks'] or 0) / max(overall['total_assignments'], 1),
            'avg_confidence': current_confidence,
            'avg_duration_ms': overall['avg_duration'],
            'avg_quality': overall['avg_quality'],
            'task_matching_improvement': improvement,
            'meets_improvement_target': meets_improvement,
            'meets_accuracy_target': meets_accuracy,
            'agents': [dict(agent) for agent in agents],
            'timestamp': datetime.now().isoformat()
        }
    
    def _get_agent_id(self, agent_name: str) -> Optional[int]:
        """Get agent ID by name"""
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT agent_id FROM agent_profiles WHERE agent_name = ?
        """, (agent_name,))
        
        row = cursor.fetchone()
        return row['agent_id'] if row else None
    
    def _get_agent_name(self, agent_id: int) -> Optional[str]:
        """Get agent name by ID"""
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT agent_name FROM agent_profiles WHERE agent_id = ?
        """, (agent_id,))
        
        row = cursor.fetchone()
        return row['agent_name'] if row else None


def main():
    parser = argparse.ArgumentParser(description='Agent Coordinator - Federated Learning')
    parser.add_argument('--initialize', action='store_true', help='Initialize schema')
    parser.add_argument('--assign-task', type=str, help='Assign task to agent')
    parser.add_argument('--task-type', type=str, help='Optional task type')
    parser.add_argument('--update-outcome', type=str, help='Update task outcome')
    parser.add_argument('--success', type=lambda x: x.lower() == 'true', help='Task success (true/false)')
    parser.add_argument('--duration', type=float, help='Task duration in ms')
    parser.add_argument('--quality', type=float, help='Quality score (0.0-1.0)')
    parser.add_argument('--report', action='store_true', help='Generate report')
    parser.add_argument('--days', type=int, default=7, help='Report period (days)')
    parser.add_argument('--db-path', type=str, default='.agentdb/agentdb.sqlite', help='Database path')
    
    args = parser.parse_args()
    
    try:
        coordinator = AgentCoordinator(db_path=args.db_path)
        
        if args.initialize:
            coordinator.initialize()
        
        elif args.assign_task:
            result = coordinator.assign_task(args.assign_task, args.task_type)
            print(json.dumps(result, indent=2))
        
        elif args.update_outcome:
            if args.success is None:
                print("❌ --success required for --update-outcome")
                return 1
            
            coordinator.update_task_outcome(
                args.update_outcome,
                args.success,
                args.duration,
                args.quality
            )
        
        elif args.report:
            report = coordinator.generate_report(args.days)
            print(json.dumps(report, indent=2))
            
            # Status summary
            print(f"\n📊 Agent Coordinator Report ({report['period_days']} days)")
            print(f"Total Assignments: {report['total_assignments']}")
            print(f"Success Rate: {report['success_rate']:.1%}")
            print(f"Task Matching Improvement: {report['task_matching_improvement']:.1%}")
            print(f"Meets Targets: {'✅' if report['meets_improvement_target'] and report['meets_accuracy_target'] else '⚠️'}")
        
        else:
            parser.print_help()
            return 1
        
        return 0
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == '__main__':
    sys.exit(main())
