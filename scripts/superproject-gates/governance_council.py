#!/usr/bin/env python3
"""
Governance Council Review & Retrospective System
Tracks WSJF rotation decisions, provides oversight, and generates review reports
"""

import json
import sqlite3
from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
import argparse

@dataclass
class GovernanceReview:
    """Governance review session record"""
    review_id: str
    review_date: str
    review_type: str  # weekly, monthly, quarterly, ad-hoc
    participants: List[str]
    metrics: Dict[str, Any]
    decisions: List[Dict[str, Any]]
    action_items: List[Dict[str, Any]]
    roam_risks: List[Dict[str, Any]]
    next_review_date: str

class GovernanceCouncil:
    """Governance Council for WSJF rotation oversight"""
    
    def __init__(self, project_root: Optional[Path] = None):
        self.project_root = project_root or Path.cwd()
        self.orchestrator_file = self.project_root / '.ay-learning' / 'orchestrator_learning.json'
        self.rotation_db = self.project_root / '.agentdb' / 'rotation_history.sqlite'
        self.governance_db = self.project_root / '.agentdb' / 'governance.sqlite'
        
        self.init_governance_database()
        
    def init_governance_database(self):
        """Initialize governance tracking database"""
        self.governance_db.parent.mkdir(parents=True, exist_ok=True)
        
        conn = sqlite3.connect(str(self.governance_db))
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS governance_reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                review_id TEXT UNIQUE,
                review_date TIMESTAMP,
                review_type TEXT,
                participants TEXT,
                metrics TEXT,
                decisions TEXT,
                action_items TEXT,
                roam_risks TEXT,
                next_review_date TIMESTAMP
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS validation_gaps (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                gap_type TEXT,
                description TEXT,
                severity TEXT,
                detected_date TIMESTAMP,
                resolved BOOLEAN DEFAULT 0,
                resolution_date TIMESTAMP
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS council_decisions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                decision_id TEXT UNIQUE,
                decision_date TIMESTAMP,
                decision_type TEXT,
                description TEXT,
                rationale TEXT,
                impact TEXT,
                status TEXT
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def load_orchestrator_state(self) -> Dict[str, Any]:
        """Load current orchestrator state"""
        with open(self.orchestrator_file, 'r') as f:
            return json.load(f)
    
    def get_rotation_metrics(self) -> Dict[str, Any]:
        """Get WSJF rotation metrics from database"""
        conn = sqlite3.connect(str(self.rotation_db))
        cursor = conn.cursor()
        
        # Get rotation statistics
        cursor.execute('SELECT COUNT(*) FROM rotation_decisions')
        total_rotations = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM rotation_decisions WHERE approved = 1')
        approved = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM rotation_decisions WHERE approval_required = 1')
        required_approval = cursor.fetchone()[0]
        
        cursor.execute('SELECT AVG(wsjf_delta) FROM rotation_decisions WHERE wsjf_delta IS NOT NULL')
        avg_delta_result = cursor.fetchone()
        avg_delta = avg_delta_result[0] if avg_delta_result[0] else 0
        
        conn.close()
        
        return {
            'total_rotations': total_rotations,
            'approved': approved,
            'required_approval': required_approval,
            'approval_rate': (approved / total_rotations * 100) if total_rotations > 0 else 0,
            'avg_wsjf_delta': avg_delta
        }
    
    def identify_validation_gaps(self) -> List[Dict[str, Any]]:
        """Identify validation gaps in the system"""
        gaps = []
        
        # Gap 1: Surface validation only
        gaps.append({
            'gap_type': 'surface_validation',
            'description': 'Checked text consistency without verifying evidence contents',
            'severity': 'high',
            'recommendation': 'Implement document content verification before WSJF scoring',
            'detected_date': datetime.now(timezone.utc).isoformat()
        })
        
        # Gap 2: No ground truth
        gaps.append({
            'gap_type': 'no_ground_truth',
            'description': 'No verification of actual document contents against descriptions',
            'severity': 'high',
            'recommendation': 'Add PDF/EML content extraction and validation step',
            'detected_date': datetime.now(timezone.utc).isoformat()
        })
        
        # Gap 3: Time blindness
        gaps.append({
            'gap_type': 'time_blindness',
            'description': 'Timestamps not validated against current time for staleness',
            'severity': 'medium',
            'recommendation': 'Add timestamp validation and staleness detection',
            'detected_date': datetime.now(timezone.utc).isoformat()
        })
        
        # Gap 4: Overconfidence
        gaps.append({
            'gap_type': 'overconfidence',
            'description': 'Assumed files matched descriptions without verification',
            'severity': 'medium',
            'recommendation': 'Implement confidence scoring based on verification depth',
            'detected_date': datetime.now(timezone.utc).isoformat()
        })
        
        return gaps
    
    def generate_roam_analysis(self) -> List[Dict[str, Any]]:
        """Generate ROAM (Resolved, Owned, Accepted, Mitigated) risk analysis"""
        risks = []
        
        # Legal case deadline risk
        risks.append({
            'risk_id': 'legal-deadline-risk',
            'description': 'Feb 12 settlement deadline approaching with incomplete research',
            'status': 'owned',
            'owner': 'legal-analyst',
            'mitigation': 'Automation script created, free resources identified',
            'probability': 'medium',
            'impact': 'high',
            'wsjf_score': 54.0
        })
        
        # Case law validation risk
        risks.append({
            'risk_id': 'case-law-validation-risk',
            'description': 'No Bar membership prevents Fastcase access',
            'status': 'mitigated',
            'owner': 'legal-analyst',
            'mitigation': 'Alternative free resources (Scholar, CourtListener) identified',
            'probability': 'low',
            'impact': 'medium',
            'wsjf_score': 52.0
        })
        
        # Gary confirmation blocker
        risks.append({
            'risk_id': 'gary-confirmation-blocker',
            'description': 'Cannot proceed to Doug without Gary approval',
            'status': 'accepted',
            'owner': 'settlement-strategist',
            'mitigation': 'Wait for confirmation, do not bypass',
            'probability': 'n/a',
            'impact': 'n/a',
            'wsjf_score': 0
        })
        
        # Settlement leverage
        risks.append({
            'risk_id': 'settlement-leverage',
            'description': 'MAA motivation unclear (5 theories)',
            'status': 'owned',
            'owner': 'settlement-strategist',
            'mitigation': 'Theory #5 (unit problems) strongest leverage',
            'probability': 'medium',
            'impact': 'high',
            'wsjf_score': 28.0
        })
        
        return risks
    
    def conduct_pi_sync(self) -> Dict[str, Any]:
        """Conduct Program Increment (PI) Synchronization"""
        orchestrator_state = self.load_orchestrator_state()
        rotation_metrics = self.get_rotation_metrics()
        validation_gaps = self.identify_validation_gaps()
        roam_risks = self.generate_roam_analysis()
        
        pi_sync = {
            'sync_date': datetime.now(timezone.utc).isoformat(),
            'sync_type': 'weekly',
            'objectives': {
                'legal_case_settlement': {
                    'status': 'in_progress',
                    'completion': 40,
                    'blockers': ['gary_confirmation_pending', 'case_law_validation_incomplete'],
                    'wsjf_score': 54.0
                },
                'wsjf_rotation_system': {
                    'status': 'completed',
                    'completion': 100,
                    'blockers': [],
                    'wsjf_score': 45.0
                },
                'evidence_prioritization': {
                    'status': 'pending',
                    'completion': 0,
                    'blockers': ['case_law_validation_incomplete'],
                    'wsjf_score': 36.0
                }
            },
            'rotation_metrics': rotation_metrics,
            'validation_gaps': validation_gaps,
            'roam_risks': roam_risks,
            'next_actions': [
                {
                    'action': 'Execute legal_research_automation.sh',
                    'owner': 'legal-analyst',
                    'deadline': '2026-02-10T23:59:59Z',
                    'priority': 1
                },
                {
                    'action': 'Fill out RESEARCH-FINDINGS-VALIDATED.md',
                    'owner': 'legal-analyst',
                    'deadline': '2026-02-11T09:00:00Z',
                    'priority': 2
                },
                {
                    'action': 'Send findings to Gary for confirmation',
                    'owner': 'settlement-strategist',
                    'deadline': '2026-02-11T12:00:00Z',
                    'priority': 3
                }
            ]
        }
        
        return pi_sync
    
    def generate_retrospective(self) -> Dict[str, Any]:
        """Generate retrospective analysis"""
        return {
            'retro_date': datetime.now(timezone.utc).isoformat(),
            'period': 'sprint-1',
            'what_went_well': [
                'WSJF rotation system implemented successfully',
                'Legal research automation script created',
                'Free alternatives to Fastcase identified',
                'Agent capability mapping completed',
                'Rotation orchestrator operational'
            ],
            'what_could_improve': [
                'Surface validation needs deeper verification',
                'Document content extraction not implemented',
                'Timestamp staleness detection missing',
                'Confidence scoring needs implementation'
            ],
            'action_items': [
                {
                    'item': 'Implement PDF/EML content verification',
                    'owner': 'evidence-curator',
                    'priority': 'high'
                },
                {
                    'item': 'Add timestamp validation logic',
                    'owner': 'evidence-curator',
                    'priority': 'medium'
                },
                {
                    'item': 'Create confidence scoring system',
                    'owner': 'settlement-strategist',
                    'priority': 'medium'
                }
            ],
            'experiments_to_try': [
                'Test WSJF rotation with evidence files',
                'Validate portal = written notice theory',
                'Compare free vs paid legal research quality'
            ]
        }
    
    def generate_dashboard_html(self) -> str:
        """Generate HTML dashboard for governance oversight"""
        orchestrator_state = self.load_orchestrator_state()
        rotation_strategy = orchestrator_state.get('rotation_strategy', {})
        pi_sync = self.conduct_pi_sync()
        retro = self.generate_retrospective()
        
        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Governance Council Dashboard</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }}
        .container {{
            max-width: 1200px;
            margin: 0 auto;
        }}
        .card {{
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 8px;
            margin-bottom: 20px;
        }}
        .metric {{
            display: inline-block;
            margin: 10px 20px;
        }}
        .metric-value {{
            font-size: 2em;
            font-weight: bold;
            color: #667eea;
        }}
        .metric-label {{
            font-size: 0.9em;
            color: #666;
        }}
        .status-badge {{
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.85em;
            font-weight: 600;
        }}
        .status-completed {{ background: #d4edda; color: #155724; }}
        .status-in-progress {{ background: #fff3cd; color: #856404; }}
        .status-pending {{ background: #f8d7da; color: #721c24; }}
        .priority-high {{ color: #dc3545; font-weight: bold; }}
        .priority-medium {{ color: #fd7e14; }}
        .priority-low {{ color: #28a745; }}
        table {{
            width: 100%;
            border-collapse: collapse;
        }}
        th, td {{
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }}
        th {{
            background: #f8f9fa;
            font-weight: 600;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏛️ Governance Council Dashboard</h1>
            <p>WSJF Rotation Oversight & Review</p>
            <p><strong>Last Updated:</strong> {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
        </div>
        
        <div class="card">
            <h2>📊 Rotation Metrics</h2>
            <div class="metric">
                <div class="metric-value">{pi_sync['rotation_metrics']['total_rotations']}</div>
                <div class="metric-label">Total Rotations</div>
            </div>
            <div class="metric">
                <div class="metric-value">{pi_sync['rotation_metrics']['approval_rate']:.1f}%</div>
                <div class="metric-label">Approval Rate</div>
            </div>
            <div class="metric">
                <div class="metric-value">{pi_sync['rotation_metrics']['avg_wsjf_delta']:.2f}</div>
                <div class="metric-label">Avg WSJF Delta</div>
            </div>
        </div>
        
        <div class="card">
            <h2>🎯 PI Sync - Active Objectives</h2>
            <table>
                <thead>
                    <tr>
                        <th>Objective</th>
                        <th>Status</th>
                        <th>Completion</th>
                        <th>WSJF</th>
                        <th>Blockers</th>
                    </tr>
                </thead>
                <tbody>
"""
        
        for obj_name, obj_data in pi_sync['objectives'].items():
            status_class = f"status-{obj_data['status'].replace('_', '-')}"
            blockers_text = ', '.join(obj_data['blockers']) if obj_data['blockers'] else 'None'
            html += f"""
                    <tr>
                        <td>{obj_name.replace('_', ' ').title()}</td>
                        <td><span class="status-badge {status_class}">{obj_data['status'].replace('_', ' ').title()}</span></td>
                        <td>{obj_data['completion']}%</td>
                        <td>{obj_data['wsjf_score']:.1f}</td>
                        <td>{blockers_text}</td>
                    </tr>
"""
        
        html += f"""
                </tbody>
            </table>
        </div>
        
        <div class="card">
            <h2>⚠️ ROAM Risk Analysis</h2>
            <table>
                <thead>
                    <tr>
                        <th>Risk</th>
                        <th>Status</th>
                        <th>Owner</th>
                        <th>Impact</th>
                        <th>WSJF</th>
                    </tr>
                </thead>
                <tbody>
"""
        
        for risk in pi_sync['roam_risks']:
            html += f"""
                    <tr>
                        <td>{risk['description']}</td>
                        <td><span class="status-badge status-{risk['status']}">{risk['status'].upper()}</span></td>
                        <td>{risk['owner']}</td>
                        <td class="priority-{risk['impact']}">{risk['impact'].upper()}</td>
                        <td>{risk['wsjf_score']:.1f}</td>
                    </tr>
"""
        
        html += f"""
                </tbody>
            </table>
        </div>
        
        <div class="card">
            <h2>🔍 Validation Gaps</h2>
            <table>
                <thead>
                    <tr>
                        <th>Gap Type</th>
                        <th>Description</th>
                        <th>Severity</th>
                        <th>Recommendation</th>
                    </tr>
                </thead>
                <tbody>
"""
        
        for gap in pi_sync['validation_gaps']:
            html += f"""
                    <tr>
                        <td>{gap['gap_type'].replace('_', ' ').title()}</td>
                        <td>{gap['description']}</td>
                        <td class="priority-{gap['severity']}">{gap['severity'].upper()}</td>
                        <td>{gap['recommendation']}</td>
                    </tr>
"""
        
        html += f"""
                </tbody>
            </table>
        </div>
        
        <div class="card">
            <h2>📅 Next Actions</h2>
            <table>
                <thead>
                    <tr>
                        <th>Priority</th>
                        <th>Action</th>
                        <th>Owner</th>
                        <th>Deadline</th>
                    </tr>
                </thead>
                <tbody>
"""
        
        for action in pi_sync['next_actions']:
            html += f"""
                    <tr>
                        <td class="priority-high">{action['priority']}</td>
                        <td>{action['action']}</td>
                        <td>{action['owner']}</td>
                        <td>{action['deadline']}</td>
                    </tr>
"""
        
        html += """
                </tbody>
            </table>
        </div>
        
        <div class="card">
            <h2>🔄 Retrospective</h2>
            <h3>✅ What Went Well</h3>
            <ul>
"""
        
        for item in retro['what_went_well']:
            html += f"                <li>{item}</li>\n"
        
        html += """
            </ul>
            <h3>📈 What Could Improve</h3>
            <ul>
"""
        
        for item in retro['what_could_improve']:
            html += f"                <li>{item}</li>\n"
        
        html += """
            </ul>
        </div>
    </div>
</body>
</html>
"""
        
        return html
    
    def save_dashboard(self, output_path: Optional[Path] = None):
        """Save dashboard HTML to file"""
        if output_path is None:
            output_path = self.project_root / 'governance' / 'dashboard.html'
        
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        html = self.generate_dashboard_html()
        with open(output_path, 'w') as f:
            f.write(html)
        
        print(f"✅ Dashboard saved: {output_path}")
        return output_path

def main():
    parser = argparse.ArgumentParser(description='Governance Council Review System')
    parser.add_argument('--pi-sync', action='store_true', help='Conduct PI sync')
    parser.add_argument('--retro', action='store_true', help='Generate retrospective')
    parser.add_argument('--dashboard', action='store_true', help='Generate dashboard')
    parser.add_argument('--output', help='Output file path')
    
    args = parser.parse_args()
    
    council = GovernanceCouncil()
    
    if args.pi_sync:
        pi_sync = council.conduct_pi_sync()
        print(json.dumps(pi_sync, indent=2))
    
    if args.retro:
        retro = council.generate_retrospective()
        print(json.dumps(retro, indent=2))
    
    if args.dashboard:
        output_path = Path(args.output) if args.output else None
        dashboard_path = council.save_dashboard(output_path)
        print(f"\n🌐 Open dashboard in browser:")
        print(f"   open {dashboard_path}")
    
    if not any([args.pi_sync, args.retro, args.dashboard]):
        # Default: generate dashboard
        dashboard_path = council.save_dashboard()
        print(f"\n🌐 Open dashboard in browser:")
        print(f"   open {dashboard_path}")

if __name__ == '__main__':
    main()
