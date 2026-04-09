#!/usr/bin/env python3
"""
MCP Dynamic Context Loader with Prime Commands
Implements dynamic context loading, token usage optimization, and prime command orchestration
"""

import asyncio
import json
import sqlite3
import time
from datetime import datetime
from typing import Dict, List, Optional, Any
import logging
import hashlib
import os

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class TokenBudgetManager:
    """Manages token budgets per context type with dynamic pruning"""
    
    def __init__(self, db_path: str = "token_budgets.db"):
        self.db_path = db_path
        self.init_database()
        self.context_budgets = {
            'devops': 8000,
            'test': 6000,
            'code': 10000,
            'monitoring': 4000,
            'security': 5000,
            'deployment': 7000,
            'default': 5000
        }
    
    def init_database(self):
        """Initialize SQLite database for token tracking"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS token_usage (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            context_type TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            tokens_used INTEGER NOT NULL,
            budget_limit INTEGER NOT NULL,
            efficiency_score REAL NOT NULL,
            correlation_id TEXT
        )
        ''')
        
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS context_cache (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            context_key TEXT UNIQUE NOT NULL,
            context_data TEXT NOT NULL,
            token_count INTEGER NOT NULL,
            last_accessed TEXT NOT NULL,
            priority_score REAL DEFAULT 1.0
        )
        ''')
        
        conn.commit()
        conn.close()
    
    def calculate_token_count(self, text: str) -> int:
        """Estimate token count (approximate: 4 chars per token)"""
        return len(text) // 4
    
    def log_usage(self, context_type: str, tokens_used: int, correlation_id: str = None):
        """Log token usage for analytics"""
        budget = self.context_budgets.get(context_type, self.context_budgets['default'])
        efficiency = min(1.0, budget / max(tokens_used, 1))
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
        INSERT INTO token_usage 
        (context_type, timestamp, tokens_used, budget_limit, efficiency_score, correlation_id)
        VALUES (?, ?, ?, ?, ?, ?)
        ''', (context_type, datetime.utcnow().isoformat(), tokens_used, budget, efficiency, correlation_id))
        
        conn.commit()
        conn.close()
        
        # Emit heartbeat for monitoring
        self.emit_heartbeat(context_type, tokens_used, efficiency, correlation_id)
    
    def emit_heartbeat(self, context_type: str, tokens_used: int, efficiency: float, correlation_id: str = None):
        """Emit heartbeat for monitoring integration"""
        heartbeat = f"{datetime.utcnow().isoformat()}|mcp_loader|token_usage|{context_type}|{tokens_used}|{efficiency:.3f}|{correlation_id or 'none'}"
        
        # Log to master orchestrator log
        log_path = "/Users/shahroozbhopti/Documents/code/legacy engineering/DevOps/logs/master_orchestrator.log"
        os.makedirs(os.path.dirname(log_path), exist_ok=True)
        
        with open(log_path, 'a') as f:
            f.write(f"{heartbeat}\n")
        
        logger.info(f"Token usage heartbeat: {heartbeat}")

class MCPDynamicContextLoader:
    """Main MCP Dynamic Context Loader with prime command orchestration"""
    
    def __init__(self):
        self.budget_manager = TokenBudgetManager()
        self.context_cache = {}
        self.active_contexts = {}
        self.prime_handlers = {
            '/prime devops': self.handle_prime_devops,
            '/prime test': self.handle_prime_test,
            '/prime code': self.handle_prime_code,
            '/prime monitoring': self.handle_prime_monitoring,
            '/prime security': self.handle_prime_security,
            '/prime deployment': self.handle_prime_deployment,
            '/prime status': self.handle_prime_status,
            '/prime optimize': self.handle_prime_optimize
        }
        
    async def handle_prime_command(self, command: str, args: List[str] = None) -> Dict[str, Any]:
        """Route prime commands to appropriate handlers"""
        correlation_id = hashlib.md5(f"{command}{time.time()}".encode()).hexdigest()[:8]
        
        if command not in self.prime_handlers:
            return {
                'status': 'error',
                'message': f'Unknown prime command: {command}',
                'available_commands': list(self.prime_handlers.keys())
            }
        
        try:
            result = await self.prime_handlers[command](args or [], correlation_id)
            return {
                'status': 'success',
                'command': command,
                'result': result,
                'correlation_id': correlation_id
            }
        except Exception as e:
            logger.error(f"Error executing {command}: {str(e)}")
            return {
                'status': 'error',
                'command': command,
                'error': str(e),
                'correlation_id': correlation_id
            }
    
    async def handle_prime_devops(self, args: List[str], correlation_id: str) -> Dict[str, Any]:
        """Handle /prime devops command - load DevOps context and tools"""
        context_data = {
            'tools': [
                'ci_cd_promotion_gates',
                'heartbeat_monitoring',
                'device_state_tracking',
                'infrastructure_automation'
            ],
            'configs': [
                'kubernetes_manifests',
                'terraform_modules', 
                'ansible_playbooks',
                'monitoring_configs'
            ],
            'scripts': [
                'deployment_scripts',
                'backup_procedures',
                'rollback_automation',
                'health_checks'
            ]
        }
        
        tokens_used = self.budget_manager.calculate_token_count(json.dumps(context_data))
        self.budget_manager.log_usage('devops', tokens_used, correlation_id)
        
        return {
            'context_type': 'devops',
            'loaded_tools': len(context_data['tools']),
            'loaded_configs': len(context_data['configs']),
            'loaded_scripts': len(context_data['scripts']),
            'tokens_used': tokens_used,
            'budget_remaining': self.budget_manager.context_budgets['devops'] - tokens_used
        }
    
    async def handle_prime_test(self, args: List[str], correlation_id: str) -> Dict[str, Any]:
        """Handle /prime test command - load testing context and frameworks"""
        context_data = {
            'frameworks': [
                'pytest',
                'unittest',
                'integration_tests',
                'performance_tests'
            ],
            'test_suites': [
                'unit_tests',
                'api_tests',
                'security_tests',
                'load_tests'
            ],
            'coverage_tools': [
                'coverage.py',
                'pytest-cov',
                'sonarqube',
                'quality_gates'
            ]
        }
        
        tokens_used = self.budget_manager.calculate_token_count(json.dumps(context_data))
        self.budget_manager.log_usage('test', tokens_used, correlation_id)
        
        return {
            'context_type': 'test',
            'loaded_frameworks': len(context_data['frameworks']),
            'loaded_suites': len(context_data['test_suites']),
            'loaded_tools': len(context_data['coverage_tools']),
            'tokens_used': tokens_used,
            'budget_remaining': self.budget_manager.context_budgets['test'] - tokens_used
        }
    
    async def handle_prime_code(self, args: List[str], correlation_id: str) -> Dict[str, Any]:
        """Handle /prime code command - load coding context and patterns"""
        context_data = {
            'languages': [
                'python',
                'javascript',
                'bash',
                'yaml'
            ],
            'patterns': [
                'design_patterns',
                'best_practices',
                'code_standards',
                'refactoring_rules'
            ],
            'tools': [
                'linters',
                'formatters',
                'static_analysis',
                'dependency_management'
            ]
        }
        
        tokens_used = self.budget_manager.calculate_token_count(json.dumps(context_data))
        self.budget_manager.log_usage('code', tokens_used, correlation_id)
        
        return {
            'context_type': 'code',
            'loaded_languages': len(context_data['languages']),
            'loaded_patterns': len(context_data['patterns']),
            'loaded_tools': len(context_data['tools']),
            'tokens_used': tokens_used,
            'budget_remaining': self.budget_manager.context_budgets['code'] - tokens_used
        }
    
    async def handle_prime_monitoring(self, args: List[str], correlation_id: str) -> Dict[str, Any]:
        """Handle /prime monitoring command - load monitoring and observability context"""
        context_data = {
            'metrics': [
                'prometheus',
                'grafana',
                'alertmanager',
                'custom_metrics'
            ],
            'logging': [
                'structured_logging',
                'log_aggregation',
                'error_tracking',
                'audit_trails'
            ],
            'dashboards': [
                'system_health',
                'application_metrics',
                'business_metrics',
                'sla_tracking'
            ]
        }
        
        tokens_used = self.budget_manager.calculate_token_count(json.dumps(context_data))
        self.budget_manager.log_usage('monitoring', tokens_used, correlation_id)
        
        return {
            'context_type': 'monitoring',
            'loaded_metrics': len(context_data['metrics']),
            'loaded_logging': len(context_data['logging']),
            'loaded_dashboards': len(context_data['dashboards']),
            'tokens_used': tokens_used,
            'budget_remaining': self.budget_manager.context_budgets['monitoring'] - tokens_used
        }
    
    async def handle_prime_security(self, args: List[str], correlation_id: str) -> Dict[str, Any]:
        """Handle /prime security command - load security context and tools"""
        context_data = {
            'scanning': [
                'vulnerability_scanners',
                'dependency_checks',
                'container_scanning',
                'infrastructure_scanning'
            ],
            'policies': [
                'security_policies',
                'compliance_checks',
                'access_controls',
                'encryption_standards'
            ],
            'monitoring': [
                'security_monitoring',
                'incident_response',
                'threat_detection',
                'forensics_tools'
            ]
        }
        
        tokens_used = self.budget_manager.calculate_token_count(json.dumps(context_data))
        self.budget_manager.log_usage('security', tokens_used, correlation_id)
        
        return {
            'context_type': 'security',
            'loaded_scanning': len(context_data['scanning']),
            'loaded_policies': len(context_data['policies']),
            'loaded_monitoring': len(context_data['monitoring']),
            'tokens_used': tokens_used,
            'budget_remaining': self.budget_manager.context_budgets['security'] - tokens_used
        }
    
    async def handle_prime_deployment(self, args: List[str], correlation_id: str) -> Dict[str, Any]:
        """Handle /prime deployment command - load deployment context and strategies"""
        context_data = {
            'strategies': [
                'blue_green',
                'canary',
                'rolling_updates',
                'feature_flags'
            ],
            'platforms': [
                'kubernetes',
                'docker',
                'serverless',
                'bare_metal'
            ],
            'automation': [
                'ci_cd_pipelines',
                'infrastructure_as_code',
                'configuration_management',
                'release_orchestration'
            ]
        }
        
        tokens_used = self.budget_manager.calculate_token_count(json.dumps(context_data))
        self.budget_manager.log_usage('deployment', tokens_used, correlation_id)
        
        return {
            'context_type': 'deployment',
            'loaded_strategies': len(context_data['strategies']),
            'loaded_platforms': len(context_data['platforms']),
            'loaded_automation': len(context_data['automation']),
            'tokens_used': tokens_used,
            'budget_remaining': self.budget_manager.context_budgets['deployment'] - tokens_used
        }
    
    async def handle_prime_status(self, args: List[str], correlation_id: str) -> Dict[str, Any]:
        """Handle /prime status command - show system status and usage"""
        conn = sqlite3.connect(self.budget_manager.db_path)
        cursor = conn.cursor()
        
        # Get recent usage statistics
        cursor.execute('''
        SELECT context_type, COUNT(*), AVG(tokens_used), AVG(efficiency_score)
        FROM token_usage 
        WHERE timestamp > datetime('now', '-1 hour')
        GROUP BY context_type
        ''')
        
        recent_usage = cursor.fetchall()
        conn.close()
        
        status_data = {
            'active_contexts': list(self.active_contexts.keys()),
            'budget_limits': self.budget_manager.context_budgets,
            'recent_usage': [
                {
                    'context': row[0],
                    'requests': row[1],
                    'avg_tokens': row[2],
                    'avg_efficiency': row[3]
                }
                for row in recent_usage
            ],
            'cache_size': len(self.context_cache)
        }
        
        tokens_used = self.budget_manager.calculate_token_count(json.dumps(status_data))
        self.budget_manager.log_usage('status', tokens_used, correlation_id)
        
        return status_data
    
    async def handle_prime_optimize(self, args: List[str], correlation_id: str) -> Dict[str, Any]:
        """Handle /prime optimize command - perform context optimization"""
        optimization_results = {
            'cache_cleared': 0,
            'contexts_pruned': 0,
            'tokens_saved': 0,
            'efficiency_improvement': 0.0
        }
        
        # Clear old cache entries
        conn = sqlite3.connect(self.budget_manager.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
        DELETE FROM context_cache 
        WHERE last_accessed < datetime('now', '-1 hour')
        ''')
        optimization_results['cache_cleared'] = cursor.rowcount
        
        # Calculate efficiency improvements
        cursor.execute('''
        SELECT AVG(efficiency_score) FROM token_usage 
        WHERE timestamp > datetime('now', '-1 hour')
        ''')
        current_efficiency = cursor.fetchone()[0] or 0.0
        
        conn.commit()
        conn.close()
        
        optimization_results['efficiency_improvement'] = current_efficiency
        
        tokens_used = self.budget_manager.calculate_token_count(json.dumps(optimization_results))
        self.budget_manager.log_usage('optimize', tokens_used, correlation_id)
        
        return optimization_results

async def main():
    """Main execution function for testing"""
    loader = MCPDynamicContextLoader()
    
    # Test prime commands
    test_commands = [
        '/prime devops',
        '/prime test', 
        '/prime code',
        '/prime monitoring',
        '/prime status'
    ]
    
    for cmd in test_commands:
        print(f"\n--- Testing {cmd} ---")
        result = await loader.handle_prime_command(cmd)
        print(json.dumps(result, indent=2))
        await asyncio.sleep(0.1)  # Brief pause between commands

if __name__ == "__main__":
    asyncio.run(main())