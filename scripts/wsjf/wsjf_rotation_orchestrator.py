#!/usr/bin/env python3
"""
WSJF Rotation Orchestrator
Semi-automatic agent rotation with WSJF scoring and human-in-loop approval
"""

import json
import os
import sys
import sqlite3
import argparse
import logging
from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from wsjf.wsjf_calculator import WSJFCalculator, WSJFInputs, WSJFResult
    from priority.wsjf_adjuster import WSJFAdjuster
except ImportError:
    # Fallback to relative imports
    import sys
    import os
    script_dir = Path(__file__).parent
    sys.path.insert(0, str(script_dir))
    from wsjf_calculator import WSJFCalculator, WSJFInputs, WSJFResult
    sys.path.insert(0, str(script_dir.parent / 'priority'))
    from wsjf_adjuster import WSJFAdjuster

@dataclass
class AgentCapability:
    """Agent capability profile"""
    agent_id: str
    capabilities: List[str]
    tools: List[str]
    wsjf_affinity: List[str]
    success_rate: float
    max_concurrent: int
    current_load: int = 0

@dataclass
class RotationDecision:
    """Rotation decision record"""
    task_id: str
    from_agent: Optional[str]
    to_agent: str
    reason: str
    wsjf_old: Optional[float]
    wsjf_new: float
    wsjf_delta: Optional[float]
    approval_required: bool
    approved: bool
    timestamp: str
    outcome: Optional[str] = None

class WSJFRotationOrchestrator:
    """Orchestrates agent rotation based on WSJF scores"""
    
    def __init__(self, config_path: Optional[str] = None):
        self.script_dir = Path(__file__).parent
        self.project_root = self.script_dir.parent.parent.parent
        
        # Setup logging
        self.setup_logging()
        
        # Load configurations
        self.rotation_config = self.load_rotation_config(config_path)
        self.agent_capabilities = self.load_agent_capabilities()
        
        # Initialize WSJF components
        self.wsjf_calculator = WSJFCalculator()
        self.wsjf_adjuster = WSJFAdjuster()
        
        # Initialize databases
        self.init_rotation_database()
        
    def setup_logging(self):
        """Setup logging configuration"""
        log_dir = self.project_root / 'logs'
        log_dir.mkdir(exist_ok=True)
        
        log_file = log_dir / 'wsjf_rotation.log'
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler(sys.stdout)
            ]
        )
        
        self.logger = logging.getLogger('WSJFRotationOrchestrator')
        self.logger.info("WSJF Rotation Orchestrator initialized")
    
    def load_rotation_config(self, config_path: Optional[str] = None) -> Dict[str, Any]:
        """Load rotation configuration"""
        if config_path:
            config_file = Path(config_path)
        else:
            config_file = self.project_root / 'config' / 'rotation_config.json'
        
        if config_file.exists():
            with open(config_file, 'r') as f:
                return json.load(f)
        else:
            # Default configuration
            default_config = {
                "rotation_triggers": {
                    "wsjf_delta_threshold": 0.3,
                    "time_decay_hours": 4,
                    "emergency_priority_auto": True,
                    "market_conditions_factor": True
                },
                "approval_thresholds": {
                    "agent_count": {
                        "auto_approve": 2,
                        "review_required": 3,
                        "executive_approval": 5
                    },
                    "task_value": {
                        "auto_approve": 5000,
                        "review_required": 50000
                    },
                    "cross_team": "review_required"
                },
                "notification": {
                    "email_on_rotation": True,
                    "slack_webhook": None,
                    "approval_timeout_hours": 4
                }
            }
            
            # Save default config
            config_file.parent.mkdir(parents=True, exist_ok=True)
            with open(config_file, 'w') as f:
                json.dump(default_config, f, indent=2)
            
            self.logger.info(f"Created default rotation config at {config_file}")
            return default_config
    
    def load_agent_capabilities(self) -> Dict[str, AgentCapability]:
        """Load agent capability profiles"""
        capabilities_file = self.project_root / 'config' / 'agent_capabilities.json'
        
        if capabilities_file.exists():
            with open(capabilities_file, 'r') as f:
                data = json.load(f)
                return {
                    agent_id: AgentCapability(**profile)
                    for agent_id, profile in data['agents'].items()
                }
        else:
            # Default capabilities for legal case
            default_capabilities = {
                "agents": {
                    "legal-analyst": {
                        "agent_id": "legal-analyst",
                        "capabilities": ["case_law_research", "nc_statutes", "habitability", "damages_calculation"],
                        "tools": ["google_scholar", "courtlistener", "justia", "wsjf_calculator"],
                        "wsjf_affinity": ["high_tc", "legal_domain", "high_ubv"],
                        "success_rate": 0.92,
                        "max_concurrent": 3
                    },
                    "evidence-curator": {
                        "agent_id": "evidence-curator",
                        "capabilities": ["document_organization", "timeline_analysis", "eml_processing", "evidence_prioritization"],
                        "tools": ["wsjf_calculator", "file_prioritization", "pdf_processor"],
                        "wsjf_affinity": ["high_rr", "documentation", "compliance"],
                        "success_rate": 0.88,
                        "max_concurrent": 5
                    },
                    "settlement-strategist": {
                        "agent_id": "settlement-strategist",
                        "capabilities": ["negotiation", "cod_analysis", "risk_assessment", "financial_modeling"],
                        "tools": ["wsjf_adjuster", "market_analysis", "settlement_calculator"],
                        "wsjf_affinity": ["high_cod", "strategic", "financial"],
                        "success_rate": 0.85,
                        "max_concurrent": 2
                    },
                    "researcher": {
                        "agent_id": "researcher",
                        "capabilities": ["general_research", "data_gathering", "web_scraping", "api_integration"],
                        "tools": ["curl", "selenium", "api_clients"],
                        "wsjf_affinity": ["medium_tc", "exploratory"],
                        "success_rate": 0.78,
                        "max_concurrent": 4
                    }
                }
            }
            
            # Save default capabilities
            capabilities_file.parent.mkdir(parents=True, exist_ok=True)
            with open(capabilities_file, 'w') as f:
                json.dump(default_capabilities, f, indent=2)
            
            self.logger.info(f"Created default agent capabilities at {capabilities_file}")
            
            return {
                agent_id: AgentCapability(**profile)
                for agent_id, profile in default_capabilities['agents'].items()
            }
    
    def init_rotation_database(self):
        """Initialize rotation history database"""
        db_file = self.project_root / '.agentdb' / 'rotation_history.sqlite'
        db_file.parent.mkdir(parents=True, exist_ok=True)
        
        conn = sqlite3.connect(str(db_file))
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS rotation_decisions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id TEXT NOT NULL,
                from_agent TEXT,
                to_agent TEXT NOT NULL,
                reason TEXT,
                wsjf_old REAL,
                wsjf_new REAL,
                wsjf_delta REAL,
                approval_required BOOLEAN,
                approved BOOLEAN,
                timestamp TIMESTAMP,
                outcome TEXT
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS rotation_approvals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                rotation_id INTEGER,
                approver TEXT,
                approved BOOLEAN,
                approval_timestamp TIMESTAMP,
                comments TEXT,
                FOREIGN KEY (rotation_id) REFERENCES rotation_decisions(id)
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS agent_load (
                agent_id TEXT PRIMARY KEY,
                current_load INTEGER DEFAULT 0,
                last_updated TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
        
        self.logger.info("Rotation database initialized")
        self.db_file = db_file
    
    def calculate_wsjf_delta(self, old_wsjf: float, new_wsjf: float) -> float:
        """Calculate relative WSJF change"""
        if old_wsjf == 0:
            return float('inf')
        return abs(new_wsjf - old_wsjf) / old_wsjf
    
    def should_trigger_rotation(self, old_wsjf: float, new_wsjf: float, 
                               task_meta: Dict[str, Any]) -> Tuple[bool, str]:
        """Determine if rotation should be triggered"""
        config = self.rotation_config['rotation_triggers']
        
        # Calculate delta
        delta = self.calculate_wsjf_delta(old_wsjf, new_wsjf)
        
        # Check WSJF delta threshold
        if delta > config['wsjf_delta_threshold']:
            return True, f"WSJF delta {delta:.2%} exceeds threshold {config['wsjf_delta_threshold']:.2%}"
        
        # Check emergency priority
        if config['emergency_priority_auto']:
            tc = task_meta.get('time_criticality', 0)
            ubv = task_meta.get('user_business_value', 0)
            if tc >= 10 and ubv >= 8:
                return True, "Emergency priority: TC=10, UBV>=8"
        
        # Check time decay (implement based on last calculation time)
        # This would require tracking last_calc_time in task metadata
        
        return False, "No rotation trigger met"
    
    def find_best_agent(self, task: Dict[str, Any], current_agent: Optional[str] = None) -> str:
        """Find best agent for task based on capabilities and availability"""
        required_caps = task.get('required_capabilities', [])
        wsjf_profile = task.get('wsjf_profile', {})
        
        # Score each agent
        agent_scores = {}
        for agent_id, agent in self.agent_capabilities.items():
            if agent_id == current_agent:
                continue  # Skip current agent
            
            # Capability match score
            cap_match = len(set(required_caps) & set(agent.capabilities)) / max(len(required_caps), 1)
            
            # Affinity match score
            task_affinity = wsjf_profile.get('affinity', [])
            affinity_match = len(set(task_affinity) & set(agent.wsjf_affinity)) / max(len(task_affinity), 1)
            
            # Availability score
            availability = 1.0 - (agent.current_load / agent.max_concurrent)
            
            # Combined score
            score = (cap_match * 0.5 + affinity_match * 0.3 + availability * 0.2) * agent.success_rate
            
            agent_scores[agent_id] = score
        
        # Return best agent
        if agent_scores:
            best_agent = max(agent_scores.items(), key=lambda x: x[1])[0]
            self.logger.info(f"Best agent for task: {best_agent} (score: {agent_scores[best_agent]:.3f})")
            return best_agent
        else:
            return "researcher"  # Default fallback
    
    def requires_approval(self, task: Dict[str, Any], rotation: RotationDecision) -> bool:
        """Determine if rotation requires human approval"""
        config = self.rotation_config['approval_thresholds']
        
        # Agent count threshold
        task_agent_count = task.get('agent_count', 1)
        if task_agent_count > config['agent_count']['review_required']:
            return True
        
        # Task value threshold
        task_value = task.get('value', 0)
        if task_value >= config['task_value']['review_required']:
            return True
        
        # Cross-team check
        if task.get('cross_team', False):
            return True
        
        # Auto-approve for small changes
        if (rotation.wsjf_delta and rotation.wsjf_delta < 0.5 and 
            task_agent_count <= config['agent_count']['auto_approve']):
            return False
        
        return True
    
    def generate_approval_request(self, task: Dict[str, Any], 
                                 rotation: RotationDecision,
                                 format: str = 'markdown') -> str:
        """Generate approval request document"""
        if format == 'markdown':
            current_agent = self.agent_capabilities.get(rotation.from_agent)
            proposed_agent = self.agent_capabilities.get(rotation.to_agent)
            
            old_wsjf_str = f"{rotation.wsjf_old:.2f}" if rotation.wsjf_old is not None else 'N/A'
            delta_str = f"{rotation.wsjf_delta:.2%}" if rotation.wsjf_delta is not None else 'N/A'
            
            request = f"""# Rotation Approval Request

**Task ID**: {rotation.task_id}
**Current Agent**: {rotation.from_agent or 'None (new assignment)'}
**Proposed Agent**: {rotation.to_agent}
**Reason**: {rotation.reason}

## WSJF Analysis
- Old WSJF: {old_wsjf_str}
- New WSJF: {rotation.wsjf_new:.2f}
- Delta: {delta_str}

## Task Details
- Business Value: ${task.get('value', 0):,.0f}
- Time Criticality: {task.get('time_criticality', 0)}/10
- Risk Reduction: {task.get('risk_reduction', 0)}/10
- Job Size: {task.get('job_size', 1)} days

## Agent Comparison
| Metric | Current ({rotation.from_agent or 'None'}) | Proposed ({rotation.to_agent}) |
|--------|------------------------------------------|--------------------------------|
"""
            
            if current_agent and proposed_agent:
                request += f"""| Capability Match | {len(current_agent.capabilities)} caps | {len(proposed_agent.capabilities)} caps |
| Availability | {(1 - current_agent.current_load/current_agent.max_concurrent)*100:.0f}% | {(1 - proposed_agent.current_load/proposed_agent.max_concurrent)*100:.0f}% |
| Success Rate | {current_agent.success_rate:.0%} | {proposed_agent.success_rate:.0%} |
"""
            
            request += f"\n**Recommendation**: {'APPROVE' if rotation.wsjf_delta and rotation.wsjf_delta > 0.3 else 'REVIEW'} rotation to {rotation.to_agent}\n"
            
            return request
        
        elif format == 'json':
            return json.dumps(asdict(rotation), indent=2)
        
        else:
            return str(rotation)
    
    def record_rotation(self, rotation: RotationDecision):
        """Record rotation decision in database"""
        conn = sqlite3.connect(str(self.db_file))
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO rotation_decisions 
            (task_id, from_agent, to_agent, reason, wsjf_old, wsjf_new, wsjf_delta,
             approval_required, approved, timestamp, outcome)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            rotation.task_id,
            rotation.from_agent,
            rotation.to_agent,
            rotation.reason,
            rotation.wsjf_old,
            rotation.wsjf_new,
            rotation.wsjf_delta,
            rotation.approval_required,
            rotation.approved,
            rotation.timestamp,
            rotation.outcome
        ))
        
        conn.commit()
        conn.close()
        
        self.logger.info(f"Recorded rotation: {rotation.task_id} -> {rotation.to_agent}")
    
    def evaluate_rotation(self, task_id: str, task_data: Dict[str, Any]) -> Optional[RotationDecision]:
        """Evaluate if rotation should occur for a task"""
        # Calculate current WSJF
        wsjf_inputs = WSJFInputs(
            user_business_value=task_data.get('ubv', 0),
            time_criticality=task_data.get('tc', 0),
            risk_reduction=task_data.get('rr', 0),
            job_size=task_data.get('job_size', 1),
            job_id=task_id,
            circle=task_data.get('circle'),
            tags=task_data.get('tags', [])
        )
        
        wsjf_result = self.wsjf_calculator.calculate_wsjf(wsjf_inputs)
        
        # Check if rotation trigger is met
        old_wsjf = task_data.get('current_wsjf', 0)
        should_rotate, reason = self.should_trigger_rotation(old_wsjf, wsjf_result.wsjf_score, task_data)
        
        if not should_rotate:
            self.logger.info(f"No rotation needed for {task_id}: {reason}")
            return None
        
        # Find best agent
        current_agent = task_data.get('current_agent')
        best_agent = self.find_best_agent(task_data, current_agent)
        
        # Create rotation decision
        rotation = RotationDecision(
            task_id=task_id,
            from_agent=current_agent,
            to_agent=best_agent,
            reason=reason,
            wsjf_old=old_wsjf if old_wsjf > 0 else None,
            wsjf_new=wsjf_result.wsjf_score,
            wsjf_delta=self.calculate_wsjf_delta(old_wsjf, wsjf_result.wsjf_score) if old_wsjf > 0 else None,
            approval_required=self.requires_approval(task_data, RotationDecision(
                task_id=task_id, from_agent=current_agent, to_agent=best_agent,
                reason=reason, wsjf_old=old_wsjf, wsjf_new=wsjf_result.wsjf_score,
                wsjf_delta=None, approval_required=False, approved=False,
                timestamp=datetime.now(timezone.utc).isoformat()
            )),
            approved=False,
            timestamp=datetime.now(timezone.utc).isoformat()
        )
        
        rotation.approval_required = self.requires_approval(task_data, rotation)
        
        return rotation

def main():
    parser = argparse.ArgumentParser(description='WSJF Rotation Orchestrator')
    parser.add_argument('--init', action='store_true', help='Initialize rotation system')
    parser.add_argument('--auto-rotate', action='store_true', help='Run auto-rotation cycle')
    parser.add_argument('--task-id', help='Task ID for operations')
    parser.add_argument('--task-file', help='JSON file with task data')
    parser.add_argument('--generate-approval-request', action='store_true', help='Generate approval request')
    parser.add_argument('--format', default='markdown', choices=['markdown', 'json'], help='Output format')
    parser.add_argument('--config', help='Path to rotation config file')
    
    args = parser.parse_args()
    
    orchestrator = WSJFRotationOrchestrator(config_path=args.config)
    
    if args.init:
        print("✅ WSJF Rotation System initialized")
        print(f"   - Config: {orchestrator.project_root}/config/rotation_config.json")
        print(f"   - Capabilities: {orchestrator.project_root}/config/agent_capabilities.json")
        print(f"   - Database: {orchestrator.db_file}")
        return 0
    
    if args.task_file:
        with open(args.task_file, 'r') as f:
            task_data = json.load(f)
        
        task_id = args.task_id or task_data.get('task_id', 'unknown')
        
        # Evaluate rotation
        rotation = orchestrator.evaluate_rotation(task_id, task_data)
        
        if rotation:
            if args.generate_approval_request:
                print(orchestrator.generate_approval_request(task_data, rotation, args.format))
            else:
                orchestrator.record_rotation(rotation)
                print(f"✅ Rotation evaluated: {rotation.to_agent}")
                print(f"   Approval required: {rotation.approval_required}")
        else:
            print("ℹ️  No rotation needed")
    
    return 0

if __name__ == '__main__':
    sys.exit(main())
