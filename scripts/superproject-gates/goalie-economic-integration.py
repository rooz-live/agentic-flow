#!/usr/bin/env python3
"""
Goalie Economic Integration Script

Integrates economic tracking with .goalie system for
economic goal tracking and management
"""

import json
import os
import sys
import argparse
from datetime import datetime, timedelta
from pathlib import Path
import logging
import yaml

# Configuration
PROJECT_ROOT = Path(__file__).parent.parent
GOALIE_DIR = PROJECT_ROOT / ".goalie"
ECONOMICS_DIR = PROJECT_ROOT / "agentic-flow-core" / "src" / "economics"

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(GOALIE_DIR / "economic-integration.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class GoalieEconomicIntegration:
    """Integrates economic tracking with .goalie system"""
    
    def __init__(self):
        self.economic_goals_file = GOALIE_DIR / "economic-goals.json"
        self.economic_metrics_file = GOALIE_DIR / "economic-metrics.jsonl"
        self.learning_metrics_file = GOALIE_DIR / "learning_metrics.json"
        self.process_flow_metrics_file = GOALIE_DIR / "process_flow_metrics.json"
        
        # Ensure .goalie directory structure exists
        GOALIE_DIR.mkdir(exist_ok=True)
        
    def load_existing_data(self):
        """Load existing .goalie data for integration"""
        data = {}
        
        # Load learning metrics
        if self.learning_metrics_file.exists():
            try:
                with open(self.learning_metrics_file, 'r') as f:
                    data['learning_metrics'] = json.load(f)
                logger.info("Loaded learning metrics from .goalie")
            except Exception as e:
                logger.error(f"Failed to load learning metrics: {e}")
        
        # Load process flow metrics
        if self.process_flow_metrics_file.exists():
            try:
                with open(self.process_flow_metrics_file, 'r') as f:
                    data['process_flow_metrics'] = json.load(f)
                logger.info("Loaded process flow metrics from .goalie")
            except Exception as e:
                logger.error(f"Failed to load process flow metrics: {e}")
        
        return data
    
    def create_economic_goals(self, existing_data):
        """Create economic goals based on existing .goalie data"""
        goals = []
        
        # Analyze learning metrics for cost optimization goals
        if 'learning_metrics' in existing_data:
            learning_data = existing_data['learning_metrics']
            
            # Create cost optimization goal based on feature adoption
            if 'feature_adoption' in learning_data:
                adoption_data = learning_data['feature_adoption']
                
                for feature, data in adoption_data.items():
                    if data.get('adoption_rate', 0) < 0.8:  # Less than 80% adoption
                        goals.append({
                            "id": f"cost-opt-{feature}",
                            "name": f"Improve {feature} Adoption",
                            "description": f"Increase {feature} feature adoption to 90% through optimization and training",
                            "category": "cost_optimization",
                            "target": {
                                "amount": 90,
                                "unit": "percent",
                                "metric": "adoption_rate",
                                "baseline": data.get('adoption_rate', 0),
                                "target": 90,
                                "achieved": data.get('adoption_rate', 0)
                            },
                            "current": {
                                "amount": data.get('adoption_rate', 0),
                                "unit": "percent",
                                "metric": "adoption_rate",
                                "baseline": data.get('adoption_rate', 0),
                                "target": 90,
                                "achieved": data.get('adoption_rate', 0)
                            },
                            "progress": (data.get('adoption_rate', 0) / 90) * 100,
                            "deadline": (datetime.now() + timedelta(days=90)).isoformat(),
                            "owner": "economic-team",
                            "circle": self.map_feature_to_circle(feature),
                            "status": "in_progress"
                        })
        
        # Analyze process flow metrics for efficiency goals
        if 'process_flow_metrics' in existing_data:
            flow_data = existing_data['process_flow_metrics']
            
            if 'process_flows' in flow_data:
                for flow in flow_data['process_flows']:
                    if flow.get('efficiency_score', 1.0) < 0.8:  # Less than 80% efficiency
                        goals.append({
                            "id": f"efficiency-{flow['name'].lower().replace(' ', '-')}",
                            "name": f"Improve {flow['name']} Efficiency",
                            "description": f"Optimize {flow['name']} process to achieve 90% efficiency",
                            "category": "efficiency_improvement",
                            "target": {
                                "amount": 90,
                                "unit": "percent",
                                "metric": "efficiency_score",
                                "baseline": flow.get('efficiency_score', 0),
                                "target": 90,
                                "achieved": flow.get('efficiency_score', 0)
                            },
                            "current": {
                                "amount": flow.get('efficiency_score', 0),
                                "unit": "percent",
                                "metric": "efficiency_score",
                                "baseline": flow.get('efficiency_score', 0),
                                "target": 90,
                                "achieved": flow.get('efficiency_score', 0)
                            },
                            "progress": (flow.get('efficiency_score', 0) / 90) * 100,
                            "deadline": (datetime.now() + timedelta(days=60)).isoformat(),
                            "owner": "process-team",
                            "circle": self.map_process_to_circle(flow.get('name', '')),
                            "status": "in_progress"
                        })
        
        # Add revenue growth goals based on business value
        goals.append({
            "id": "revenue-growth-quarterly",
            "name": "Quarterly Revenue Growth",
            "description": "Achieve 15% quarterly revenue growth through improved efficiency and customer satisfaction",
            "category": "revenue_growth",
            "target": {
                "amount": 15,
                "unit": "percent",
                "metric": "revenue_growth",
                "baseline": 0,
                "target": 15,
                "achieved": 0
            },
            "current": {
                "amount": 0,
                "unit": "percent",
                "metric": "revenue_growth",
                "baseline": 0,
                "target": 15,
                "achieved": 0
            },
            "progress": 0,
            "deadline": (datetime.now() + timedelta(days=90)).isoformat(),
            "owner": "business-team",
            "circle": "business-operations",
            "status": "in_progress"
        })
        
        # Add utilization optimization goals
        goals.append({
            "id": "utilization-optimization",
            "name": "Infrastructure Utilization Optimization",
            "description": "Achieve 80% average infrastructure utilization through rightsizing and load balancing",
            "category": "utilization_optimization",
            "target": {
                "amount": 80,
                "unit": "percent",
                "metric": "utilization_rate",
                "baseline": 0,
                "target": 80,
                "achieved": 0
            },
            "current": {
                "amount": 0,
                "unit": "percent",
                "metric": "utilization_rate",
                "baseline": 0,
                "target": 80,
                "achieved": 0
            },
            "progress": 0,
            "deadline": (datetime.now() + timedelta(days=45)).isoformat(),
            "owner": "infrastructure-team",
            "circle": "technical-operations",
            "status": "in_progress"
        })
        
        return goals
    
    def map_feature_to_circle(self, feature):
        """Map feature to responsible circle"""
        feature_circle_map = {
            'pattern_metrics_filtering': 'analyst',
            'real_time_updates': 'intuitive',
            'alert_system': 'assessor',
            'drag_drop_functionality': 'intuitive',
            'performance_optimization': 'orchestrator',
            'file_watching': 'technical-operations'
        }
        return feature_circle_map.get(feature, 'analyst')
    
    def map_process_to_circle(self, process_name):
        """Map process to responsible circle"""
        process_circle_map = {
            'Kanban Item Creation': 'ui',
            'File Watching Implementation': 'core',
            'Alert System Development': 'assessor',
            'Lean Workflow Management': 'orchestrator'
        }
        return process_circle_map.get(process_name, 'core')
    
    def save_economic_goals(self, goals):
        """Save economic goals to .goalie system"""
        try:
            with open(self.economic_goals_file, 'w') as f:
                json.dump({
                    "timestamp": datetime.now().isoformat(),
                    "goals": goals,
                    "total_goals": len(goals),
                    "categories": {
                        "cost_optimization": len([g for g in goals if g["category"] == "cost_optimization"]),
                        "efficiency_improvement": len([g for g in goals if g["category"] == "efficiency_improvement"]),
                        "revenue_growth": len([g for g in goals if g["category"] == "revenue_growth"]),
                        "utilization_optimization": len([g for g in goals if g["category"] == "utilization_optimization"]),
                        "investment_roi": len([g for g in goals if g["category"] == "investment_roi"])
                    }
                }, f, indent=2)
            
            logger.info(f"Saved {len(goals)} economic goals to {self.economic_goals_file}")
            
        except Exception as e:
            logger.error(f"Failed to save economic goals: {e}")
            raise
    
    def update_goal_progress(self, goal_id, progress_data):
        """Update progress for a specific goal"""
        try:
            if self.economic_goals_file.exists():
                with open(self.economic_goals_file, 'r') as f:
                    goals_data = json.load(f)
                
                # Update the specific goal
                for goal in goals_data.get('goals', []):
                    if goal['id'] == goal_id:
                        goal['current']['achieved'] = progress_data.get('achieved', goal['current']['achieved'])
                        goal['progress'] = progress_data.get('progress', goal['progress'])
                        
                        # Update status based on progress
                        if goal['progress'] >= 100:
                            goal['status'] = 'completed'
                        elif goal['progress'] >= 75:
                            goal['status'] = 'on_track'
                        elif goal['progress'] >= 50:
                            goal['status'] = 'in_progress'
                        else:
                            goal['status'] = 'at_risk'
                        
                        break
                
                # Save updated goals
                with open(self.economic_goals_file, 'w') as f:
                    json.dump(goals_data, f, indent=2)
                
                logger.info(f"Updated progress for goal {goal_id}: {progress_data.get('progress', 0)}%")
            
        except Exception as e:
            logger.error(f"Failed to update goal progress: {e}")
            raise
    
    def generate_economic_metrics(self, goals):
        """Generate economic metrics based on goals"""
        metrics = {
            "timestamp": datetime.now().isoformat(),
            "goals_summary": {
                "total_goals": len(goals),
                "completed_goals": len([g for g in goals if g["status"] == "completed"]),
                "in_progress_goals": len([g for g in goals if g["status"] == "in_progress"]),
                "at_risk_goals": len([g for g in goals if g["status"] == "at_risk"]),
                "average_progress": sum(g["progress"] for g in goals) / len(goals) if goals else 0
            },
            "category_breakdown": {
                "cost_optimization": {
                    "goals": len([g for g in goals if g["category"] == "cost_optimization"]),
                    "avg_progress": sum(g["progress"] for g in goals if g["category"] == "cost_optimization") / max(1, len([g for g in goals if g["category"] == "cost_optimization"]))
                },
                "efficiency_improvement": {
                    "goals": len([g for g in goals if g["category"] == "efficiency_improvement"]),
                    "avg_progress": sum(g["progress"] for g in goals if g["category"] == "efficiency_improvement") / max(1, len([g for g in goals if g["category"] == "efficiency_improvement"]))
                },
                "revenue_growth": {
                    "goals": len([g for g in goals if g["category"] == "revenue_growth"]),
                    "avg_progress": sum(g["progress"] for g in goals if g["category"] == "revenue_growth"]) / max(1, len([g for g in goals if g["category"] == "revenue_growth"]))
                },
                "utilization_optimization": {
                    "goals": len([g for g in goals if g["category"] == "utilization_optimization"]),
                    "avg_progress": sum(g["progress"] for g in goals if g["category"] == "utilization_optimization"]) / max(1, len([g for g in goals if g["category"] == "utilization_optimization"]))
                }
            }
        }
        
        return metrics
    
    def append_to_metrics_log(self, metrics):
        """Append metrics to the economic metrics log"""
        try:
            with open(self.economic_metrics_file, 'a') as f:
                f.write(json.dumps(metrics) + '\n')
            
            logger.info("Appended metrics to economic metrics log")
            
        except Exception as e:
            logger.error(f"Failed to append to metrics log: {e}")
            raise
    
    def create_integration_config(self):
        """Create integration configuration file"""
        config = {
            "integration_version": "1.0.0",
            "created_at": datetime.now().isoformat(),
            "economic_tracking": {
                "enabled": True,
                "collection_interval_seconds": 300,
                "retention_days": 90,
                "alert_thresholds": {
                    "capex_opex_ratio": {"warning": 1.5, "critical": 2.0},
                    "utilization_low": {"warning": 30, "critical": 20},
                    "utilization_high": {"warning": 85, "critical": 95},
                    "goal_progress_low": {"warning": 25, "critical": 10}
                }
            },
            "goalie_integration": {
                "auto_sync": True,
                "sync_interval_minutes": 60,
                "goal_categories": [
                    "cost_optimization",
                    "efficiency_improvement", 
                    "revenue_growth",
                    "utilization_optimization",
                    "investment_roi"
                ]
            },
            "data_sources": {
                "learning_metrics": str(self.learning_metrics_file),
                "process_flow_metrics": str(self.process_flow_metrics_file),
                "economic_goals": str(self.economic_goals_file),
                "economic_metrics": str(self.economic_metrics_file)
            }
        }
        
        config_file = GOALIE_DIR / "economic-integration-config.json"
        try:
            with open(config_file, 'w') as f:
                json.dump(config, f, indent=2)
            
            logger.info(f"Created integration configuration at {config_file}")
            
        except Exception as e:
            logger.error(f"Failed to create integration configuration: {e}")
            raise

def main():
    """Main execution function"""
    parser = argparse.ArgumentParser(description='Goalie Economic Integration')
    parser.add_argument('command', choices=[
        'init', 'sync', 'update-progress', 'generate-metrics', 'config'
    ], help='Command to execute')
    
    parser.add_argument('--goal-id', help='Goal ID for progress update')
    parser.add_argument('--progress', type=float, help='Progress percentage for goal update')
    parser.add_argument('--achieved', type=float, help='Achieved value for goal update')
    
    args = parser.parse_args()
    
    try:
        integration = GoalieEconomicIntegration()
        
        if args.command == 'init':
            logger.info("Initializing Goalie economic integration...")
            
            # Load existing data
            existing_data = integration.load_existing_data()
            
            # Create economic goals
            goals = integration.create_economic_goals(existing_data)
            integration.save_economic_goals(goals)
            
            # Generate initial metrics
            metrics = integration.generate_economic_metrics(goals)
            integration.append_to_metrics_log(metrics)
            
            # Create integration config
            integration.create_integration_config()
            
            logger.info("Goalie economic integration completed successfully")
        
        elif args.command == 'sync':
            logger.info("Syncing economic goals with .goalie...")
            
            existing_data = integration.load_existing_data()
            goals = integration.create_economic_goals(existing_data)
            integration.save_economic_goals(goals)
            
            logger.info("Sync completed successfully")
        
        elif args.command == 'update-progress':
            if not args.goal_id:
                logger.error("Goal ID is required for progress update")
                sys.exit(1)
            
            progress_data = {}
            if args.progress is not None:
                progress_data['progress'] = args.progress
            if args.achieved is not None:
                progress_data['achieved'] = args.achieved
            
            integration.update_goal_progress(args.goal_id, progress_data)
            logger.info(f"Updated progress for goal {args.goal_id}")
        
        elif args.command == 'generate-metrics':
            logger.info("Generating economic metrics...")
            
            if integration.economic_goals_file.exists():
                with open(integration.economic_goals_file, 'r') as f:
                    goals_data = json.load(f)
                    goals = goals_data.get('goals', [])
            else:
                goals = []
            
            metrics = integration.generate_economic_metrics(goals)
            integration.append_to_metrics_log(metrics)
            
            logger.info("Economic metrics generated successfully")
        
        elif args.command == 'config':
            logger.info("Creating integration configuration...")
            integration.create_integration_config()
            logger.info("Configuration created successfully")
        
        else:
            logger.error(f"Unknown command: {args.command}")
            sys.exit(1)
    
    except Exception as e:
        logger.error(f"Command execution failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()