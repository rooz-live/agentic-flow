#!/usr/bin/env python3
"""
Dynamic Queue Management
Manages dynamic work queue with WSJF-based prioritization
"""

import os
import sys
import json
import argparse
import logging
import sqlite3
import heapq
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path
from datetime import datetime, timedelta

class DynamicQueue:
    def __init__(self, config_file: str = None):
        self.script_dir = Path(__file__).parent
        self.project_root = self.script_dir.parent.parent
        self.config_file = config_file or (self.script_dir / 'config' / 'dynamic_queue.json')
        self.db_file = self.project_root / '.agentdb' / 'dynamic_queue.sqlite'
        
        # Setup logging
        self.setup_logging()
        
        # Load configuration
        self.config = self.load_config()
        
        # Initialize database
        self.init_database()
        
    def setup_logging(self):
        """Setup logging for dynamic queue"""
        log_dir = self.project_root / 'logs'
        log_dir.mkdir(exist_ok=True)
        
        log_file = log_dir / 'dynamic_queue.log'
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler(sys.stdout)
            ]
        )
        
        self.logger = logging.getLogger('DynamicQueue')
        self.logger.info("Dynamic Queue initialized")
    
    def load_config(self) -> Dict[str, Any]:
        """Load dynamic queue configuration"""
        try:
            if self.config_file.exists():
                with open(self.config_file, 'r') as f:
                    return json.load(f)
            else:
                # Default configuration
                return self.get_default_config()
        except Exception as e:
            self.logger.error(f"Failed to load config: {e}")
            return self.get_default_config()
    
    def get_default_config(self) -> Dict[str, Any]:
        """Get default dynamic queue configuration"""
        return {
            "queue_management": {
                "max_queue_size": 100,
                "priority_threshold": 0.8,  # WSJF score threshold for high priority
                "aging_factor": 0.1,  # Priority boost per day of age
                "max_age_days": 30
            },
            "wsjf_integration": {
                "enabled": True,
                "real_time_updates": True,
                "auto_rebalancing": True,
                "multi_factor_scoring": True
            },
            "flow_control": {
                "wip_limits": {
                    "ready": 10,
                    "in_progress": 3,
                    "review": 5
                },
                "bottleneck_detection": True,
                "auto_escalation": True
            },
            "monitoring": {
                "metrics_enabled": True,
                "alert_thresholds": {
                    "queue_age": 7,  # days
                    "wsjf_variance": 0.3,  # 30% variance
                    "throughput_decline": 0.2  # 20% decline
                }
            }
        }
    
    def init_database(self):
        """Initialize SQLite database for dynamic queue"""
        self.db_file.parent.mkdir(exist_ok=True)
        
        conn = sqlite3.connect(str(self.db_file))
        cursor = conn.cursor()
        
        # Create tables
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS queue_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                item_id TEXT UNIQUE,
                title TEXT,
                wsjf_score REAL,
                priority REAL,
                queue_position INTEGER,
                status TEXT DEFAULT 'queued',
                created_at TIMESTAMP,
                updated_at TIMESTAMP,
                started_at TIMESTAMP,
                completed_at TIMESTAMP,
                age_days REAL,
                dependencies TEXT
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS queue_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                item_id TEXT,
                event_type TEXT,
                old_position INTEGER,
                new_position INTEGER,
                reason TEXT,
                timestamp TIMESTAMP
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS queue_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                metric_type TEXT,
                metric_value REAL,
                timestamp TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
        
        self.logger.info("Database initialized")
    
    def add_to_queue(self, item_id: str, title: str, wsjf_score: float,
                   dependencies: List[str] = None) -> bool:
        """Add item to dynamic queue"""
        try:
            conn = sqlite3.connect(str(self.db_file))
            cursor = conn.cursor()
            
            # Calculate initial priority
            priority = self._calculate_priority(wsjf_score, 0)
            
            cursor.execute('''
                INSERT OR REPLACE INTO queue_items
                (item_id, title, wsjf_score, priority, queue_position, 
                 created_at, updated_at, dependencies)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                item_id, title, wsjf_score, priority, 0,
                datetime.now(), datetime.now(),
                json.dumps(dependencies) if dependencies else None
            ))
            
            conn.commit()
            conn.close()
            
            self.logger.info(f"Added to queue: {item_id} (WSJF: {wsjf_score})")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to add to queue: {e}")
            return False
    
    def _calculate_priority(self, wsjf_score: float, age_days: float) -> float:
        """Calculate priority score based on WSJF and age"""
        base_priority = wsjf_score
        
        # Apply aging factor
        aging_boost = age_days * self.config["queue_management"]["aging_factor"]
        adjusted_priority = base_priority + aging_boost
        
        return adjusted_priority
    
    def update_queue_priorities(self) -> Dict[str, Any]:
        """Update queue priorities based on aging and WSJF changes"""
        conn = sqlite3.connect(str(self.db_file))
        cursor = conn.cursor()
        
        # Get all queued items
        cursor.execute('''
            SELECT * FROM queue_items WHERE status = 'queued'
            ORDER BY queue_position
        ''')
        
        items = cursor.fetchall()
        updated_items = []
        
        for item in items:
            item_id = item[1]
            wsjf_score = item[3]
            created_at = datetime.fromisoformat(item[6]) if item[6] else datetime.now()
            age_days = (datetime.now() - created_at).days
            
            # Calculate new priority
            new_priority = self._calculate_priority(wsjf_score, age_days)
            old_priority = item[4]
            
            if abs(new_priority - old_priority) > 0.01:  # Significant change
                cursor.execute('''
                    UPDATE queue_items
                    SET priority = ?, age_days = ?, updated_at = ?
                    WHERE item_id = ?
                ''', (new_priority, age_days, datetime.now(), item_id))
                
                updated_items.append({
                    "item_id": item_id,
                    "old_priority": old_priority,
                    "new_priority": new_priority,
                    "age_days": age_days
                })
        
        conn.commit()
        conn.close()
        
        result = {
            "updated_count": len(updated_items),
            "updated_items": updated_items,
            "timestamp": datetime.now().isoformat()
        }
        
        self.logger.info(f"Queue priorities updated: {len(updated_items)} items")
        return result
    
    def reorder_queue(self) -> Dict[str, Any]:
        """Reorder queue based on current priorities"""
        conn = sqlite3.connect(str(self.db_file))
        cursor = conn.cursor()
        
        # Get all queued items with current priorities
        cursor.execute('''
            SELECT * FROM queue_items WHERE status = 'queued'
            ORDER BY priority DESC, created_at ASC
        ''')
        
        items = cursor.fetchall()
        
        # Update queue positions
        for index, item in enumerate(items):
            item_id = item[1]
            new_position = index + 1
            old_position = item[5]
            
            if old_position != new_position:
                cursor.execute('''
                    UPDATE queue_items
                    SET queue_position = ?
                    WHERE item_id = ?
                ''', (new_position, item_id))
                
                # Log position change
                cursor.execute('''
                    INSERT INTO queue_history
                    (item_id, event_type, old_position, new_position, reason, timestamp)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (item_id, "position_change", old_position, new_position, 
                       "priority_reorder", datetime.now()))
        
        conn.commit()
        conn.close()
        
        result = {
            "reordered_count": len(items),
            "timestamp": datetime.now().isoformat()
        }
        
        self.logger.info(f"Queue reordered: {len(items)} items")
        return result
    
    def detect_bottlenecks(self) -> Dict[str, Any]:
        """Detect bottlenecks in the queue flow"""
        conn = sqlite3.connect(str(self.db_file))
        cursor = conn.cursor()
        
        # Get queue metrics
        cursor.execute('''
            SELECT 
                COUNT(*) as total_queued,
                AVG(age_days) as avg_age,
                MAX(age_days) as max_age
            FROM queue_items WHERE status = 'queued'
        ''')
        
        queue_stats = cursor.fetchone()
        
        # Get flow metrics
        cursor.execute('''
            SELECT 
                COUNT(*) as completed_today,
                AVG(CASE 
                    WHEN julianday(completed_at) = julianday('now') 
                    THEN (julianday(completed_at) - julianday(started_at))
                    ELSE 0 END) as avg_cycle_time_today
            FROM queue_items 
            WHERE status = 'completed' 
            AND completed_at >= date('now', '-1 day')
        ''')
        
        flow_stats = cursor.fetchone()
        conn.close()
        
        bottlenecks = []
        
        # Check for aging items
        if queue_stats and queue_stats[2] > self.config["monitoring"]["alert_thresholds"]["queue_age"]:
            bottlenecks.append({
                "type": "aging_items",
                "severity": "high",
                "description": f"Items older than {self.config['monitoring']['alert_thresholds']['queue_age']} days",
                "max_age": queue_stats[2],
                "affected_count": self._count_aging_items()
            })
        
        # Check for low throughput
        if flow_stats and flow_stats[0] < 5:  # Less than 5 items completed today
            bottlenecks.append({
                "type": "low_throughput",
                "severity": "medium",
                "description": "Low completion rate detected",
                "completed_today": flow_stats[0],
                "avg_cycle_time": flow_stats[1]
            })
        
        # Check for queue size issues
        if queue_stats and queue_stats[0] > self.config["queue_management"]["max_queue_size"]:
            bottlenecks.append({
                "type": "queue_overflow",
                "severity": "high",
                "description": "Queue size exceeds maximum",
                "current_size": queue_stats[0],
                "max_size": self.config["queue_management"]["max_queue_size"]
            })
        
        result = {
            "bottlenecks_detected": len(bottlenecks) > 0,
            "bottlenecks": bottlenecks,
            "queue_stats": {
                "total_queued": queue_stats[0] if queue_stats else 0,
                "avg_age": queue_stats[1] if queue_stats else 0,
                "max_age": queue_stats[2] if queue_stats else 0
            },
            "flow_stats": {
                "completed_today": flow_stats[0] if flow_stats else 0,
                "avg_cycle_time": flow_stats[1] if flow_stats else 0
            },
            "timestamp": datetime.now().isoformat()
        }
        
        self.logger.info(f"Bottleneck detection completed: {len(bottlenecks)} bottlenecks found")
        return result
    
    def _count_aging_items(self) -> int:
        """Count items older than threshold"""
        conn = sqlite3.connect(str(self.db_file))
        cursor = conn.cursor()
        
        threshold_days = self.config["monitoring"]["alert_thresholds"]["queue_age"]
        cutoff_date = datetime.now() - timedelta(days=threshold_days)
        
        cursor.execute('''
            SELECT COUNT(*) FROM queue_items
            WHERE status = 'queued' AND created_at < ?
        ''', (cutoff_date,))
        
        count = cursor.fetchone()[0]
        conn.close()
        return count
    
    def auto_escalate_items(self) -> Dict[str, Any]:
        """Automatically escalate items based on criteria"""
        if not self.config["flow_control"]["auto_escalation"]:
            return {"escalated": False, "reason": "auto_escalation_disabled"}
        
        conn = sqlite3.connect(str(self.db_file))
        cursor = conn.cursor()
        
        # Get items that need escalation
        priority_threshold = self.config["queue_management"]["priority_threshold"]
        max_age = self.config["queue_management"]["max_age_days"]
        
        cursor.execute('''
            SELECT * FROM queue_items
            WHERE status = 'queued' 
            AND (priority > ? OR age_days > ?)
            ORDER BY priority DESC
        ''', (priority_threshold, max_age))
        
        items_to_escalate = cursor.fetchall()
        escalated_items = []
        
        for item in items_to_escalate:
            item_id = item[1]
            priority = item[4]
            age_days = item[9]
            
            escalation_reason = []
            if priority > priority_threshold:
                escalation_reason.append("high_priority")
            if age_days > max_age:
                escalation_reason.append("aging")
            
            cursor.execute('''
                UPDATE queue_items
                SET status = 'escalated', updated_at = ?
                WHERE item_id = ?
            ''', (datetime.now(), item_id))
            
            escalated_items.append({
                "item_id": item_id,
                "priority": priority,
                "age_days": age_days,
                "reason": escalation_reason
            })
        
        conn.commit()
        conn.close()
        
        result = {
            "escalated": len(escalated_items) > 0,
            "escalated_count": len(escalated_items),
            "escalated_items": escalated_items,
            "timestamp": datetime.now().isoformat()
        }
        
        self.logger.info(f"Auto-escalation completed: {len(escalated_items)} items escalated")
        return result
    
    def get_queue_status(self) -> Dict[str, Any]:
        """Get current queue status"""
        conn = sqlite3.connect(str(self.db_file))
        cursor = conn.cursor()
        
        # Get queue statistics
        cursor.execute('''
            SELECT 
                status,
                COUNT(*) as count,
                AVG(wsjf_score) as avg_wsjf,
                AVG(age_days) as avg_age
            FROM queue_items
            GROUP BY status
        ''')
        
        status_stats = {row[0]: {
            "count": row[1],
            "avg_wsjf": row[2],
            "avg_age": row[3]
        } for row in cursor.fetchall()}
        
        # Get top items
        cursor.execute('''
            SELECT item_id, title, wsjf_score, priority, age_days
            FROM queue_items
            WHERE status = 'queued'
            ORDER BY priority DESC, queue_position ASC
            LIMIT 10
        ''')
        
        top_items = [{
            "item_id": row[0],
            "title": row[1],
            "wsjf_score": row[2],
            "priority": row[3],
            "age_days": row[4]
        } for row in cursor.fetchall()]
        
        conn.close()
        
        result = {
            "status_breakdown": status_stats,
            "top_priority_items": top_items,
            "total_items": sum(stat["count"] for stat in status_stats.values()),
            "timestamp": datetime.now().isoformat()
        }
        
        return result
    
    def run_queue_management(self, update_priorities: bool = False,
                           reorder_queue: bool = False,
                           detect_bottlenecks: bool = False,
                           auto_escalate: bool = False) -> Dict[str, Any]:
        """Run complete queue management cycle"""
        self.logger.info("Starting queue management cycle...")
        
        result = {
            "timestamp": datetime.now().isoformat(),
            "priority_update_result": None,
            "reorder_result": None,
            "bottleneck_result": None,
            "escalation_result": None
        }
        
        if update_priorities:
            priority_result = self.update_queue_priorities()
            result["priority_update_result"] = priority_result
        
        if reorder_queue:
            reorder_result = self.reorder_queue()
            result["reorder_result"] = reorder_result
        
        if detect_bottlenecks:
            bottleneck_result = self.detect_bottlenecks()
            result["bottleneck_result"] = bottleneck_result
        
        if auto_escalate:
            escalation_result = self.auto_escalate_items()
            result["escalation_result"] = escalation_result
        
        self.logger.info("Queue management cycle completed")
        return result

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='Dynamic Queue Management',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument('--config', 
                       help='Configuration file path')
    parser.add_argument('--add-item', nargs=4, metavar=('ITEM_ID', 'TITLE', 'WSJF', 'DEPENDENCIES'),
                       help='Add item to queue')
    parser.add_argument('--update-priorities', action='store_true',
                       help='Update queue priorities based on aging')
    parser.add_argument('--reorder-queue', action='store_true',
                       help='Reorder queue based on priorities')
    parser.add_argument('--detect-bottlenecks', action='store_true',
                       help='Detect queue bottlenecks')
    parser.add_argument('--auto-escalate', action='store_true',
                       help='Auto-escalate high priority or aging items')
    parser.add_argument('--status', action='store_true',
                       help='Show current queue status')
    parser.add_argument('--json', action='store_true',
                       help='Output results in JSON format')
    parser.add_argument('--verbose', action='store_true',
                       help='Enable verbose logging')
    
    args = parser.parse_args()
    
    # Create dynamic queue instance
    queue = DynamicQueue(config_file=args.config)
    
    # Handle add item command
    if args.add_item:
        item_id, title, wsjf_score, dependencies = args.add_item
        dependencies = json.loads(dependencies) if dependencies != 'None' else None
        success = queue.add_to_queue(item_id, title, float(wsjf_score), dependencies)
        
        if args.json:
            print(json.dumps({"success": success}, indent=2))
        else:
            print(f"Item added: {'Success' if success else 'Failed'}")
        
        sys.exit(0 if success else 1)
    
    # Run queue management with specified options
    result = queue.run_queue_management(
        update_priorities=args.update_priorities,
        reorder_queue=args.reorder_queue,
        detect_bottlenecks=args.detect_bottlenecks,
        auto_escalate=args.auto_escalate
    )
    
    # Handle status command
    if args.status:
        status = queue.get_queue_status()
        result = status
    else:
        result = result
    
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print("Dynamic Queue Results:")
        
        if result["priority_update_result"]:
            print(f"Priorities Updated: {result['priority_update_result']['updated_count']} items")
        
        if result["reorder_result"]:
            print(f"Queue Reordered: {result['reorder_result']['reordered_count']} items")
        
        if result["bottleneck_result"]:
            print(f"Bottlenecks: {result['bottleneck_result']['bottlenecks_detected']}")
        
        if result["escalation_result"]:
            print(f"Escalated: {result['escalation_result']['escalated_count']} items")
        
        if args.status:
            status = result["status_breakdown"]
            total = result["total_items"]
            print(f"Total Items: {total}")
            for status_name, stats in status.items():
                print(f"{status_name.title()}: {stats['count']} items")
    
    sys.exit(0)

if __name__ == '__main__':
    main()