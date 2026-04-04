#!/usr/bin/env python3
"""
WIP Monitor with Enforcement
Monitor and enforce Work-in-Progress limits
"""

import os
import sys
import json
import argparse
import logging
import time
import sqlite3
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path
from datetime import datetime, timedelta

class WIPMonitor:
    def __init__(self, config_file: str = None):
        self.script_dir = Path(__file__).parent
        self.project_root = self.script_dir.parent.parent
        self.config_file = config_file or (self.script_dir / 'config' / 'wip_limits.json')
        self.db_file = self.project_root / '.agentdb' / 'wip_monitor.sqlite'
        
        # Setup logging
        self.setup_logging()
        
        # Load configuration
        self.config = self.load_config()
        
        # Initialize database
        self.init_database()
        
    def setup_logging(self):
        """Setup logging for WIP monitor"""
        log_dir = self.project_root / 'logs'
        log_dir.mkdir(exist_ok=True)
        
        log_file = log_dir / 'wip_monitor.log'
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler(sys.stdout)
            ]
        )
        
        self.logger = logging.getLogger('WIPMonitor')
        self.logger.info("WIP Monitor initialized")
    
    def load_config(self) -> Dict[str, Any]:
        """Load WIP limits configuration"""
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
        """Get default WIP limits configuration"""
        return {
            "stages": {
                "backlog": {"limit": 50, "enforce": False},
                "ready": {"limit": 10, "enforce": True},
                "in_progress": {"limit": 3, "enforce": True},
                "review": {"limit": 5, "enforce": True},
                "done": {"limit": 20, "enforce": False}
            },
            "adaptive_thresholds": {
                "enabled": True,
                "adjustment_factor": 0.2,
                "min_limit": 1,
                "max_limit": 10
            },
            "enforcement": {
                "mode": "soft",  # soft, hard, adaptive
                "escalation": ["notification", "block_new_work", "manager_alert"],
                "grace_period": 300  # seconds
            },
            "monitoring": {
                "check_interval": 60,  # seconds
                "alert_threshold": 2,  # consecutive violations
                "auto_adjust": True
            }
        }
    
    def init_database(self):
        """Initialize SQLite database for WIP tracking"""
        self.db_file.parent.mkdir(exist_ok=True)
        
        conn = sqlite3.connect(str(self.db_file))
        cursor = conn.cursor()
        
        # Create tables
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS wip_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                item_id TEXT UNIQUE,
                stage TEXT,
                title TEXT,
                assigned_to TEXT,
                created_at TIMESTAMP,
                updated_at TIMESTAMP,
                status TEXT DEFAULT 'active'
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS wip_violations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                stage TEXT,
                current_count INTEGER,
                limit INTEGER,
                violation_type TEXT,
                timestamp TIMESTAMP,
                resolved BOOLEAN DEFAULT FALSE
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS wip_adjustments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                stage TEXT,
                old_limit INTEGER,
                new_limit INTEGER,
                reason TEXT,
                timestamp TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
        
        self.logger.info("Database initialized")
    
    def check_wip_limits(self) -> Dict[str, Any]:
        """Check current WIP against limits"""
        conn = sqlite3.connect(str(self.db_file))
        cursor = conn.cursor()
        
        # Get current WIP counts by stage
        cursor.execute('''
            SELECT stage, COUNT(*) as count
            FROM wip_items
            WHERE status = 'active'
            GROUP BY stage
        ''')
        
        current_wip = {row[0]: row[1] for row in cursor.fetchall()}
        
        # Check against limits
        violations = []
        for stage, config in self.config["stages"].items():
            current_count = current_wip.get(stage, 0)
            limit = config["limit"]
            
            if current_count > limit:
                violations.append({
                    "stage": stage,
                    "current_count": current_count,
                    "limit": limit,
                    "violation_type": "exceeded",
                    "severity": self._calculate_severity(current_count, limit)
                })
        
        conn.close()
        
        result = {
            "timestamp": datetime.now().isoformat(),
            "current_wip": current_wip,
            "violations": violations,
            "total_violations": len(violations)
        }
        
        self.logger.info(f"WIP check completed: {len(violations)} violations found")
        return result
    
    def _calculate_severity(self, current: int, limit: int) -> str:
        """Calculate violation severity"""
        ratio = current / limit if limit > 0 else float('inf')
        
        if ratio <= 1.2:
            return "low"
        elif ratio <= 1.5:
            return "medium"
        else:
            return "high"
    
    def enforce_wip_limits(self, check_result: Dict[str, Any]) -> Dict[str, Any]:
        """Enforce WIP limits based on configuration"""
        if not check_result["violations"]:
            return {"enforced": False, "reason": "no_violations"}
        
        enforcement_mode = self.config["enforcement"]["mode"]
        violations = check_result["violations"]
        
        enforcement_actions = []
        
        for violation in violations:
            stage = violation["stage"]
            stage_config = self.config["stages"][stage]
            
            if not stage_config["enforce"]:
                continue
            
            if enforcement_mode == "soft":
                actions = self._soft_enforcement(violation)
            elif enforcement_mode == "hard":
                actions = self._hard_enforcement(violation)
            elif enforcement_mode == "adaptive":
                actions = self._adaptive_enforcement(violation)
            else:
                actions = []
            
            enforcement_actions.extend(actions)
        
        # Log violations
        self._log_violations(violations)
        
        result = {
            "enforced": True,
            "mode": enforcement_mode,
            "actions_taken": enforcement_actions,
            "violations_count": len(violations)
        }
        
        self.logger.info(f"WIP enforcement completed: {len(enforcement_actions)} actions taken")
        return result
    
    def _soft_enforcement(self, violation: Dict[str, Any]) -> List[str]:
        """Soft enforcement actions"""
        actions = []
        escalation = self.config["enforcement"]["escalation"]
        
        if "notification" in escalation:
            actions.append(f"Send notification for {violation['stage']} WIP violation")
        
        return actions
    
    def _hard_enforcement(self, violation: Dict[str, Any]) -> List[str]:
        """Hard enforcement actions"""
        actions = []
        escalation = self.config["enforcement"]["escalation"]
        
        if "notification" in escalation:
            actions.append(f"Send critical notification for {violation['stage']} WIP violation")
        
        if "block_new_work" in escalation:
            actions.append(f"Block new work entry to {violation['stage']}")
        
        if "manager_alert" in escalation:
            actions.append(f"Escalate to manager: {violation['stage']} WIP limit exceeded")
        
        return actions
    
    def _adaptive_enforcement(self, violation: Dict[str, Any]) -> List[str]:
        """Adaptive enforcement based on historical patterns"""
        actions = []
        
        # Check if this is a recurring violation
        recurring = self._is_recurring_violation(violation["stage"])
        
        if recurring:
            # Escalate enforcement for recurring violations
            actions.extend(self._hard_enforcement(violation))
        else:
            # Use soft enforcement for first-time violations
            actions.extend(self._soft_enforcement(violation))
            
            # Consider adaptive threshold adjustment
            if self.config["adaptive_thresholds"]["enabled"]:
                adjustment = self._calculate_adaptive_adjustment(violation)
                if adjustment:
                    actions.append(f"Adjust {violation['stage']} limit to {adjustment}")
        
        return actions
    
    def _is_recurring_violation(self, stage: str) -> bool:
        """Check if violation is recurring"""
        conn = sqlite3.connect(str(self.db_file))
        cursor = conn.cursor()
        
        # Check for violations in last 24 hours
        yesterday = datetime.now() - timedelta(days=1)
        cursor.execute('''
            SELECT COUNT(*) FROM wip_violations
            WHERE stage = ? AND timestamp > ? AND resolved = FALSE
        ''', (stage, yesterday))
        
        count = cursor.fetchone()[0]
        conn.close()
        
        return count >= self.config["monitoring"]["alert_threshold"]
    
    def _calculate_adaptive_adjustment(self, violation: Dict[str, Any]) -> Optional[int]:
        """Calculate adaptive threshold adjustment"""
        if not self.config["adaptive_thresholds"]["enabled"]:
            return None
        
        stage = violation["stage"]
        current_limit = self.config["stages"][stage]["limit"]
        current_count = violation["current_count"]
        
        # Calculate suggested new limit
        adjustment_factor = self.config["adaptive_thresholds"]["adjustment_factor"]
        suggested_limit = int(current_limit * (1 + adjustment_factor))
        
        # Apply bounds
        min_limit = self.config["adaptive_thresholds"]["min_limit"]
        max_limit = self.config["adaptive_thresholds"]["max_limit"]
        
        new_limit = max(min_limit, min(max_limit, suggested_limit))
        
        if new_limit != current_limit:
            return new_limit
        
        return None
    
    def _log_violations(self, violations: List[Dict[str, Any]]):
        """Log violations to database"""
        conn = sqlite3.connect(str(self.db_file))
        cursor = conn.cursor()
        
        for violation in violations:
            cursor.execute('''
                INSERT INTO wip_violations 
                (stage, current_count, limit, violation_type, timestamp)
                VALUES (?, ?, ?, ?, ?)
            ''', (
                violation["stage"],
                violation["current_count"],
                violation["limit"],
                violation["violation_type"],
                datetime.now()
            ))
        
        conn.commit()
        conn.close()
    
    def apply_adaptive_thresholds(self) -> Dict[str, Any]:
        """Apply adaptive threshold adjustments"""
        if not self.config["adaptive_thresholds"]["enabled"]:
            return {"adjusted": False, "reason": "adaptive_disabled"}
        
        conn = sqlite3.connect(str(self.db_file))
        cursor = conn.cursor()
        
        # Get recent violations for analysis
        last_week = datetime.now() - timedelta(days=7)
        cursor.execute('''
            SELECT stage, COUNT(*) as violation_count
            FROM wip_violations
            WHERE timestamp > ? AND resolved = FALSE
            GROUP BY stage
        ''', (last_week,))
        
        violation_data = {row[0]: row[1] for row in cursor.fetchall()}
        
        adjustments = []
        for stage, violation_count in violation_data.items():
            if violation_count >= self.config["monitoring"]["alert_threshold"]:
                current_limit = self.config["stages"][stage]["limit"]
                new_limit = self._calculate_adaptive_adjustment({
                    "stage": stage,
                    "current_count": current_limit + 1,
                    "limit": current_limit
                })
                
                if new_limit and new_limit != current_limit:
                    # Update configuration
                    self.config["stages"][stage]["limit"] = new_limit
                    
                    # Log adjustment
                    cursor.execute('''
                        INSERT INTO wip_adjustments
                        (stage, old_limit, new_limit, reason, timestamp)
                        VALUES (?, ?, ?, ?, ?)
                    ''', (stage, current_limit, new_limit, "adaptive_adjustment", datetime.now()))
                    
                    adjustments.append({
                        "stage": stage,
                        "old_limit": current_limit,
                        "new_limit": new_limit,
                        "reason": "adaptive_adjustment"
                    })
        
        conn.commit()
        conn.close()
        
        result = {
            "adjusted": len(adjustments) > 0,
            "adjustments": adjustments,
            "timestamp": datetime.now().isoformat()
        }
        
        self.logger.info(f"Adaptive thresholds applied: {len(adjustments)} adjustments")
        return result
    
    def run_monitoring(self, enforce: bool = False, 
                     adaptive_thresholds: bool = False) -> Dict[str, Any]:
        """Run WIP monitoring with specified options"""
        self.logger.info("Starting WIP monitoring...")
        
        # Check current WIP
        check_result = self.check_wip_limits()
        
        result = {
            "check_result": check_result,
            "enforcement_result": None,
            "adaptive_result": None,
            "timestamp": datetime.now().isoformat()
        }
        
        # Apply enforcement if requested
        if enforce:
            enforcement_result = self.enforce_wip_limits(check_result)
            result["enforcement_result"] = enforcement_result
        
        # Apply adaptive thresholds if requested
        if adaptive_thresholds:
            adaptive_result = self.apply_adaptive_thresholds()
            result["adaptive_result"] = adaptive_result
        
        self.logger.info("WIP monitoring completed")
        return result

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='WIP Monitor with Enforcement',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument('--config', 
                       help='Configuration file path')
    parser.add_argument('--check', action='store_true',
                       help='Check WIP limits only')
    parser.add_argument('--enforce', action='store_true',
                       help='Enforce WIP limits')
    parser.add_argument('--adaptive-thresholds', action='store_true',
                       help='Apply adaptive threshold adjustments')
    parser.add_argument('--json', action='store_true',
                       help='Output results in JSON format')
    parser.add_argument('--verbose', action='store_true',
                       help='Enable verbose logging')
    
    args = parser.parse_args()
    
    # Create WIP monitor instance
    monitor = WIPMonitor(config_file=args.config)
    
    # Run monitoring with specified options
    result = monitor.run_monitoring(
        enforce=args.enforce,
        adaptive_thresholds=args.adaptive_thresholds
    )
    
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print("WIP Monitor Results:")
        print(f"Violations: {result['check_result']['total_violations']}")
        
        if result["enforcement_result"]:
            print(f"Enforcement Actions: {len(result['enforcement_result']['actions_taken'])}")
        
        if result["adaptive_result"]:
            print(f"Adaptive Adjustments: {len(result['adaptive_result']['adjustments'])}")
    
    sys.exit(0)

if __name__ == '__main__':
    main()