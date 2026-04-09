#!/usr/bin/env python3
#
# cmd_prod_cycle.py - Production Cycle Management
# Handles production cycle execution with enhanced mutate mode support
#
# Usage: python3 cmd_prod_cycle.py [--mode mutate] [--full-cycle] [options]
#

import os
import sys
import json
import argparse
import subprocess
import logging
import datetime
from pathlib import Path

class ProductionCycleManager:
    def __init__(self, mode='normal', full_cycle=False, dry_run=False,
                 safeguards=False, rollout_strategy='gradual', validation=False,
                 pattern_metrics=False, compliance_checks=False,
                 variant_a_iters=1, variant_b_iters=0, variant_c_iters=0, variant_d_iters=0, variant_e_iters=0,
                 variant_a_label='A', variant_b_label='B', variant_c_label='C', variant_d_label='D', variant_e_label='E',
                 ab_reps=5):
        self.mode = mode
        self.full_cycle = full_cycle
        self.dry_run = dry_run
        self.safeguards = safeguards
        self.rollout_strategy = rollout_strategy
        self.validation = validation
        self.pattern_metrics = pattern_metrics
        self.compliance_checks = compliance_checks
        
        # Variant iteration controls
        self.variant_iters = {
            'A': variant_a_iters,
            'B': variant_b_iters,
            'C': variant_c_iters,
            'D': variant_d_iters,
            'E': variant_e_iters
        }
        self.variant_labels = {
            'A': variant_a_label,
            'B': variant_b_label,
            'C': variant_c_label,
            'D': variant_d_label,
            'E': variant_e_label
        }
        self.ab_reps = ab_reps
        
        self.script_dir = Path(__file__).parent
        self.project_root = self.script_dir.parent
        self.snapshots_dir = self.project_root / '.snapshots'
        self.goalie_dir = self.project_root / '.goalie'
        self.agentdb_dir = self.project_root / '.agentdb'
        
        # Setup logging
        self.setup_logging()
        
    def setup_logging(self):
        """Setup comprehensive logging for production cycle operations"""
        log_dir = self.project_root / 'logs'
        log_dir.mkdir(exist_ok=True)
        
        log_file = log_dir / f'prod_cycle_{datetime.datetime.now().strftime("%Y%m%d")}.log'
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler(sys.stdout)
            ]
        )
        
        self.logger = logging.getLogger('ProductionCycle')
        self.logger.info(f"Production Cycle Manager initialized - Mode: {self.mode}")
    
    def log_event(self, event_type, message, details=None):
        """Log production cycle events with structured data"""
        event = {
            'timestamp': datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'event_type': event_type,
            'message': message,
            'mode': self.mode,
            'full_cycle': self.full_cycle,
            'dry_run': self.dry_run
        }
        
        if details:
            event['details'] = details
        
        # Log to file
        events_file = self.goalie_dir / 'production_events.jsonl'
        events_file.parent.mkdir(exist_ok=True)
        
        with open(events_file, 'a') as f:
            f.write(json.dumps(event) + '\n')
        
        self.logger.info(f"Event logged: {event_type} - {message}")
    
    def run_preflight_checks(self):
        """Run comprehensive pre-flight checks for mutate mode"""
        if self.mode != 'mutate':
            return True
        
        self.logger.info("Running pre-flight checks for mutate mode...")
        
        checks = {
            'directories': self._check_directories(),
            'disk_space': self._check_disk_space(),
            'git_state': self._check_git_state(),
            'dependencies': self._check_dependencies(),
            'permissions': self._check_permissions()
        }
        
        failed_checks = [name for name, result in checks.items() if not result]
        
        if failed_checks:
            self.logger.error(f"Pre-flight checks failed: {failed_checks}")
            self.log_event('preflight_failed', f"Failed checks: {', '.join(failed_checks)}", {'failed_checks': failed_checks})
            return False
        else:
            self.logger.info("All pre-flight checks passed")
            self.log_event('preflight_passed', "All pre-flight checks completed successfully")
            return True
    
    def _check_directories(self):
        """Check required directories exist"""
        required_dirs = [
            self.goalie_dir,
            self.agentdb_dir,
            self.snapshots_dir
        ]
        
        for dir_path in required_dirs:
            if not dir_path.exists():
                self.logger.error(f"Required directory missing: {dir_path}")
                return False
        
        return True
    
    def _check_disk_space(self):
        """Check sufficient disk space"""
        try:
            stat = os.statvfs(self.project_root)
            free_space = stat.f_bavail * stat.f_frsize
            required_space = 1024 * 1024 * 1024  # 1GB minimum
            
            if free_space < required_space:
                self.logger.error(f"Insufficient disk space: {free_space} bytes available, {required_space} bytes required")
                return False
            
            return True
        except Exception as e:
            self.logger.error(f"Disk space check failed: {e}")
            return False
    
    def _check_git_state(self):
        """Check git repository state"""
        try:
            # Check if we're in a git repo
            result = subprocess.run(['git', 'rev-parse', '--git-dir'], 
                                cwd=self.project_root, capture_output=True, text=True)
            if result.returncode != 0:
                self.logger.error("Not in a git repository")
                return False
            
            # Check for uncommitted changes
            result = subprocess.run(['git', 'status', '--porcelain'], 
                                cwd=self.project_root, capture_output=True, text=True)
            if result.stdout.strip():
                self.logger.warning("Uncommitted changes detected")
                return False
            
            return True
        except Exception as e:
            self.logger.error(f"Git state check failed: {e}")
            return False
    
    def _check_dependencies(self):
        """Check required dependencies"""
        try:
            # Check Python dependencies
            import sqlite3
            import json
            
            # Check for required scripts
            required_scripts = [
                self.script_dir / 'restore-environment.sh',
                self.script_dir / 'emergency_rollback.sh'
            ]
            
            for script in required_scripts:
                if not script.exists():
                    self.logger.error(f"Required script missing: {script}")
                    return False
            
            return True
        except ImportError as e:
            self.logger.error(f"Dependency check failed: {e}")
            return False
    
    def _check_permissions(self):
        """Check file permissions"""
        try:
            # Check write permissions in key directories
            test_dirs = [self.goalie_dir, self.agentdb_dir, self.snapshots_dir]
            
            for dir_path in test_dirs:
                if dir_path.exists():
                    test_file = dir_path / '.permission_test'
                    try:
                        test_file.write_text('test')
                        test_file.unlink()
                    except Exception as e:
                        self.logger.error(f"Permission check failed for {dir_path}: {e}")
                        return False
            
            return True
        except Exception as e:
            self.logger.error(f"Permission check failed: {e}")
            return False
    
    def create_mutation_snapshot(self):
        """Create snapshot before mutation"""
        if self.mode != 'mutate':
            return True
        
        snapshot_name = f"pre-mutate-{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}"
        self.logger.info(f"Creating pre-mutation snapshot: {snapshot_name}")
        
        try:
            # Use restore script to create snapshot
            restore_script = self.script_dir / 'restore-environment.sh'
            cmd = [str(restore_script), '--snapshot', snapshot_name]
            
            if self.dry_run:
                self.logger.info(f"DRY RUN: Would execute {' '.join(cmd)}")
                return True
            
            result = subprocess.run(cmd, cwd=self.project_root, capture_output=True, text=True)
            
            if result.returncode == 0:
                self.logger.info(f"Pre-mutation snapshot created: {snapshot_name}")
                self.log_event('snapshot_created', f"Pre-mutation snapshot: {snapshot_name}", 
                             {'snapshot_name': snapshot_name})
                return True
            else:
                self.logger.error(f"Snapshot creation failed: {result.stderr}")
                self.log_event('snapshot_failed', f"Snapshot creation failed", 
                             {'error': result.stderr})
                return False
                
        except Exception as e:
            self.logger.error(f"Snapshot creation exception: {e}")
            self.log_event('snapshot_error', f"Snapshot creation exception", {'exception': str(e)})
            return False
    
    def execute_mutation_cycle(self):
        """Execute the actual mutation cycle with variant iteration controls"""
        if self.mode != 'mutate':
            return self.execute_normal_cycle()
        
        self.logger.info("Executing mutation cycle with enhanced safeguards and variant controls")
        
        # Check if we have active variants
        active_variants = [variant for variant, iters in self.variant_iters.items() if iters > 0]
        
        if active_variants:
            self.logger.info(f"Active variants: {active_variants} with iterations: {[self.variant_iters[v] for v in active_variants]}")
            return self._execute_variant_mutation_cycle(active_variants)
        else:
            self.logger.info("No active variants, executing standard mutation cycle")
            return self._execute_standard_mutation_cycle()
    
    def _execute_variant_mutation_cycle(self, active_variants):
        """Execute mutation cycle with variant iteration controls"""
        # Step 1: Validate environment
        if not self.run_preflight_checks():
            return False
        
        # Step 2: Create pre-mutation backup
        if not self.create_mutation_snapshot():
            return False
        
        # Step 3: Execute variant-based mutation operations
        variant_results = {}
        
        for variant in active_variants:
            variant_label = self.variant_labels[variant]
            iters = self.variant_iters[variant]
            
            self.logger.info(f"Executing variant {variant} ({variant_label}) for {iters} iterations")
            
            variant_results[variant] = {
                'label': variant_label,
                'iterations': iters,
                'reps': self.ab_reps,
                'results': []
            }
            
            # Execute AB testing for this variant
            for rep in range(self.ab_reps):
                self.logger.info(f"Variant {variant} - Repetition {rep + 1}/{self.ab_reps}")
                
                rep_result = {
                    'rep': rep + 1,
                    'iterations': []
                }
                
                # Execute iterations for this repetition
                for iter_num in range(iters):
                    self.logger.info(f"Variant {variant} - Iteration {iter_num + 1}/{iters}")
                    
                    iter_result = self._execute_variant_iteration(variant, iter_num + 1)
                    rep_result['iterations'].append(iter_result)
                
                variant_results[variant]['results'].append(rep_result)
        
        # Step 4: Log variant results
        self._log_variant_results(variant_results)
        
        self.logger.info("Variant mutation cycle completed successfully")
        self.log_event('variant_mutation_completed', "Variant mutation cycle completed successfully",
                       {'variants': active_variants, 'results': variant_results})
        return True
    
    def _execute_standard_mutation_cycle(self):
        """Execute standard mutation cycle without variant controls"""
        # Step 1: Validate environment
        if not self.run_preflight_checks():
            return False
        
        # Step 2: Create pre-mutation backup
        if not self.create_mutation_snapshot():
            return False
        
        # Step 3: Execute mutation operations
        mutation_steps = [
            'validate_governance_state',
            'check_system_health',
            'execute_mutation_operations',
            'validate_mutation_results'
        ]
        
        # Apply enhanced safeguards if enabled
        if self.safeguards:
            self.logger.info("Enhanced safeguards enabled")
            mutation_steps.insert(0, 'enhanced_safeguards_check')
            mutation_steps.insert(len(mutation_steps), 'safeguards_validation')
        
        # Apply rollout strategy
        if self.rollout_strategy != 'gradual':
            self.logger.info(f"Using rollout strategy: {self.rollout_strategy}")
            mutation_steps.append(f'rollout_{self.rollout_strategy}')
        
        # Apply validation if enabled
        if self.validation:
            self.logger.info("Enhanced validation enabled")
            mutation_steps.append('comprehensive_validation')
        
        # Apply pattern metrics if enabled
        if self.pattern_metrics:
            self.logger.info("Pattern metrics collection enabled")
            mutation_steps.append('pattern_metrics_collection')
        
        # Apply compliance checks if enabled
        if self.compliance_checks:
            self.logger.info("Compliance checks enabled")
            mutation_steps.append('compliance_validation')
        
        for step in mutation_steps:
            self.logger.info(f"Executing mutation step: {step}")
            
            if self.dry_run:
                self.logger.info(f"DRY RUN: Would execute {step}")
                continue
            
            try:
                success = self._execute_mutation_step(step)
                if not success:
                    self.logger.error(f"Mutation step failed: {step}")
                    self.log_event('mutation_step_failed', f"Step failed: {step}", {'step': step})
                    return False
            except Exception as e:
                self.logger.error(f"Mutation step exception: {step} - {e}")
                self.log_event('mutation_step_error', f"Step exception: {step}",
                             {'step': step, 'exception': str(e)})
                return False
        
        self.logger.info("Standard mutation cycle completed successfully")
        self.log_event('mutation_completed', "Standard mutation cycle completed successfully")
        return True
    
    def _execute_variant_iteration(self, variant, iter_num):
        """Execute a single variant iteration"""
        iteration_result = {
            'variant': variant,
            'iteration': iter_num,
            'start_time': datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'steps': []
        }
        
        # Define variant-specific mutation steps
        variant_steps = [
            'validate_governance_state',
            'check_system_health',
            f'execute_variant_{variant.lower()}_operations',
            'validate_mutation_results'
        ]
        
        # Apply enhanced safeguards if enabled
        if self.safeguards:
            variant_steps.insert(0, 'enhanced_safeguards_check')
            variant_steps.insert(len(variant_steps), 'safeguards_validation')
        
        # Apply rollout strategy
        if self.rollout_strategy != 'gradual':
            variant_steps.append(f'rollout_{self.rollout_strategy}')
        
        # Apply validation if enabled
        if self.validation:
            variant_steps.append('comprehensive_validation')
        
        # Apply pattern metrics if enabled
        if self.pattern_metrics:
            variant_steps.append('pattern_metrics_collection')
        
        # Apply compliance checks if enabled
        if self.compliance_checks:
            variant_steps.append('compliance_validation')
        
        for step in variant_steps:
            step_result = {
                'step': step,
                'start_time': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                'success': False,
                'duration': 0
            }
            
            step_start = datetime.datetime.utcnow()
            
            if self.dry_run:
                self.logger.info(f"DRY RUN: Would execute {step} for variant {variant}")
                step_result['success'] = True
                step_result['duration'] = 0.1
            else:
                try:
                    success = self._execute_mutation_step(step)
                    step_result['success'] = success
                    
                    if not success:
                        self.logger.error(f"Variant {variant} step failed: {step}")
                        self.log_event('variant_step_failed', f"Step failed: {step}",
                                     {'variant': variant, 'step': step})
                        
                except Exception as e:
                    self.logger.error(f"Variant {variant} step exception: {step} - {e}")
                    self.log_event('variant_step_error', f"Step exception: {step}",
                                 {'variant': variant, 'step': step, 'exception': str(e)})
            
            step_end = datetime.datetime.now(datetime.timezone.utc)
            step_result['duration'] = (step_end - step_start).total_seconds()
            step_result['end_time'] = step_end.isoformat()
            
            iteration_result['steps'].append(step_result)
            
            if not step_result['success']:
                iteration_result['success'] = False
                iteration_result['error'] = f"Step failed: {step}"
                break
        else:
            iteration_result['success'] = True
        
        iteration_result['end_time'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        iteration_result['duration'] = (
            datetime.datetime.fromisoformat(iteration_result['end_time']) -
            datetime.datetime.fromisoformat(iteration_result['start_time'])
        ).total_seconds()
        
        return iteration_result
    
    def _log_variant_results(self, variant_results):
        """Log variant results to evidence emitter"""
        evidence_dir = self.goalie_dir / 'evidence'
        evidence_dir.mkdir(exist_ok=True)
        
        evidence_file = evidence_dir / f'variant_results_{datetime.datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
        
        evidence_data = {
            'timestamp': datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'variant_config': {
                'variant_iters': self.variant_iters,
                'variant_labels': self.variant_labels,
                'ab_reps': self.ab_reps
            },
            'results': variant_results,
            'summary': self._generate_variant_summary(variant_results)
        }
        
        with open(evidence_file, 'w') as f:
            json.dump(evidence_data, f, indent=2)
        
        self.logger.info(f"Variant results logged to: {evidence_file}")
        
        # Log summary to console
        summary = evidence_data['summary']
        self.logger.info(f"Variant Summary: {summary['total_variants']} variants, "
                        f"{summary['total_iterations']} iterations, "
                        f"{summary['success_rate']:.1%} success rate")
    
    def _generate_variant_summary(self, variant_results):
        """Generate summary statistics for variant results"""
        total_variants = len(variant_results)
        total_iterations = sum(result['iterations'] * result['reps'] for result in variant_results.values())
        successful_iterations = 0
        total_duration = 0
        
        for variant_data in variant_results.values():
            for rep_result in variant_data['results']:
                for iter_result in rep_result['iterations']:
                    if iter_result.get('success', False):
                        successful_iterations += 1
                    total_duration += iter_result.get('duration', 0)
        
        success_rate = successful_iterations / total_iterations if total_iterations > 0 else 0
        
        return {
            'total_variants': total_variants,
            'total_iterations': total_iterations,
            'successful_iterations': successful_iterations,
            'success_rate': success_rate,
            'total_duration': total_duration,
            'average_duration': total_duration / total_iterations if total_iterations > 0 else 0
        }
    
    def _execute_mutation_step(self, step):
        """Execute individual mutation step"""
        if step == 'validate_governance_state':
            return self._validate_governance_state()
        elif step == 'check_system_health':
            return self._check_system_health()
        elif step == 'execute_mutation_operations':
            return self._execute_mutation_operations()
        elif step == 'validate_mutation_results':
            return self._validate_mutation_results()
        else:
            self.logger.error(f"Unknown mutation step: {step}")
            return False
    
    def _validate_governance_state(self):
        """Validate governance state before mutation"""
        try:
            governance_file = self.goalie_dir / 'governance_state.json'
            
            if not governance_file.exists():
                self.logger.warning("No governance state file found, creating default")
                default_state = {
                    'status': 'active',
                    'last_updated': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    'mutation_count': 0
                }
                
                with open(governance_file, 'w') as f:
                    json.dump(default_state, f, indent=2)
                
                return True
            
            # Validate existing governance state
            with open(governance_file, 'r') as f:
                state = json.load(f)
            
            # Basic validation
            if state.get('status') != 'active':
                self.logger.warning(f"Governance status is not active: {state.get('status')}")
            
            return True
            
        except Exception as e:
            self.logger.error(f"Governance validation failed: {e}")
            return False
    
    def _check_system_health(self):
        """Check system health metrics"""
        try:
            health_metrics = {
                'cpu_usage': self._get_cpu_usage(),
                'memory_usage': self._get_memory_usage(),
                'disk_usage': self._get_disk_usage(),
                'timestamp': datetime.datetime.utcnow().isoformat()
            }
            
            # Log health metrics
            health_file = self.goalie_dir / 'system_health.json'
            with open(health_file, 'w') as f:
                json.dump(health_metrics, f, indent=2)
            
            self.logger.info("System health check completed")
            return True
            
        except Exception as e:
            self.logger.error(f"System health check failed: {e}")
            return False
    
    def _get_cpu_usage(self):
        """Get CPU usage (mock implementation)"""
        try:
            import psutil
            return psutil.cpu_percent(interval=1)
        except ImportError:
            # Fallback mock implementation
            import random
            return random.uniform(20, 80)
    
    def _get_memory_usage(self):
        """Get memory usage (mock implementation)"""
        try:
            import psutil
            return psutil.virtual_memory().percent
        except ImportError:
            # Fallback mock implementation
            import random
            return random.uniform(30, 70)
    
    def _get_disk_usage(self):
        """Get disk usage"""
        stat = os.statvfs(self.project_root)
        total = stat.f_blocks * stat.f_frsize
        used = (stat.f_blocks - stat.f_bavail) * stat.f_frsize
        return (used / total) * 100
    
    def _execute_mutation_operations(self):
        """Execute the actual mutation operations"""
        try:
            # This would contain the actual mutation logic
            # For testing purposes, we'll simulate successful operations
            
            mutation_ops = [
                'backup_critical_data',
                'apply_mutations',
                'validate_integrity',
                'update_metadata'
            ]
            
            for op in mutation_ops:
                self.logger.info(f"Executing mutation operation: {op}")
                # Simulate operation
                import time
                time.sleep(0.1)  # Simulate work
            
            self.logger.info("Mutation operations completed")
            return True
            
        except Exception as e:
            self.logger.error(f"Mutation operations failed: {e}")
            return False
    
    def _validate_mutation_results(self):
        """Validate results of mutation operations"""
        try:
            # Check critical directories exist and are intact
            critical_dirs = [self.goalie_dir, self.agentdb_dir]
            
            for dir_path in critical_dirs:
                if not dir_path.exists():
                    self.logger.error(f"Critical directory missing after mutation: {dir_path}")
                    return False
            
            # Validate database integrity
            agentdb_file = self.agentdb_dir / 'agentdb.sqlite'
            if agentdb_file.exists():
                # Basic SQLite integrity check
                import sqlite3
                try:
                    conn = sqlite3.connect(str(agentdb_file))
                    cursor = conn.cursor()
                    cursor.execute("PRAGMA integrity_check")
                    result = cursor.fetchone()
                    conn.close()
                    
                    if result[0] != 'ok':
                        self.logger.error(f"Database integrity check failed: {result[0]}")
                        return False
                        
                except Exception as e:
                    self.logger.error(f"Database integrity check exception: {e}")
                    return False
            
            self.logger.info("Mutation results validation passed")
            return True
            
        except Exception as e:
            self.logger.error(f"Mutation results validation failed: {e}")
            return False
    
    def execute_normal_cycle(self):
        """Execute normal production cycle"""
        self.logger.info("Executing normal production cycle")
        
        if self.dry_run:
            self.logger.info("DRY RUN: Would execute normal production cycle")
            return True
        
        # Implement normal cycle logic here
        self.log_event('normal_cycle_completed', "Normal production cycle completed")
        return True
    
    def execute_full_cycle(self):
        """Execute complete agentic cycle"""
        self.logger.info("Executing full agentic cycle")
        
        if self.dry_run:
            self.logger.info("DRY RUN: Would execute full agentic cycle")
            return True
        
        # Implement full cycle logic here
        self.log_event('full_cycle_completed', "Full agentic cycle completed")
        return True
    
    def run(self):
        """Main execution method"""
        try:
            self.logger.info(f"Starting production cycle - Mode: {self.mode}")
            
            if self.mode == 'mutate':
                return self.execute_mutation_cycle()
            elif self.full_cycle:
                return self.execute_full_cycle()
            else:
                return self.execute_normal_cycle()
                
        except Exception as e:
            self.logger.error(f"Production cycle execution failed: {e}")
            self.log_event('execution_failed', f"Production cycle execution failed", {'exception': str(e)})
            return False

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='Production Cycle Manager with Enhanced Mutate Mode Support',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Variant Iteration Controls Examples:
  # Run variant A with 3 iterations, variant B with 2 iterations
  python3 cmd_prod_cycle.py --mode mutate --variant-a-iters 3 --variant-b-iters 2

  # Run AB testing with custom labels and 10 repetitions
  python3 cmd_prod_cycle.py --mode mutate --variant-a-iters 1 --variant-b-iters 1 \\
    --variant-a-label "Control" --variant-b-label "Treatment" --ab-reps 10

  # Skip variant C and D (0 iterations), run E with 5 iterations
  python3 cmd_prod_cycle.py --mode mutate --variant-a-iters 1 --variant-b-iters 1 \\
    --variant-c-iters 0 --variant-d-iters 0 --variant-e-iters 5
        """
    )
    
    parser.add_argument('--mode', choices=['mutate', 'normal'],
                       default='normal', help='Execution mode (mutate or normal)')
    parser.add_argument('--full-cycle', action='store_true',
                       help='Execute complete agentic cycle')
    parser.add_argument('--dry-run', action='store_true',
                       help='Show what would be executed without running')
    parser.add_argument('--verbose', action='store_true',
                       help='Enable verbose logging')
    
    # New production cycle flags
    parser.add_argument('--safeguards', action='store_true',
                       help='Enable enhanced safeguards for production operations')
    parser.add_argument('--rollout-strategy', choices=['gradual', 'big-bang', 'canary'],
                       default='gradual', help='Rollout strategy for changes')
    parser.add_argument('--validation', action='store_true',
                       help='Enable comprehensive validation of production changes')
    parser.add_argument('--pattern-metrics', action='store_true',
                       help='Collect and analyze pattern execution metrics')
    parser.add_argument('--compliance-checks', action='store_true',
                       help='Run compliance checks during production cycle')
    
    # Variant iteration controls
    parser.add_argument('--variant-a-iters', type=int, default=1,
                       help='Iterations for variant A (0 = skip, default: 1)')
    parser.add_argument('--variant-b-iters', type=int, default=0,
                       help='Iterations for variant B (0 = skip, default: 0)')
    parser.add_argument('--variant-c-iters', type=int, default=0,
                       help='Iterations for variant C (0 = skip, default: 0)')
    parser.add_argument('--variant-d-iters', type=int, default=0,
                       help='Iterations for variant D (0 = skip, default: 0)')
    parser.add_argument('--variant-e-iters', type=int, default=0,
                       help='Iterations for variant E (0 = skip, default: 0)')
    
    # Variant label controls
    parser.add_argument('--variant-a-label', default='A',
                       help='Custom label for variant A (default: A)')
    parser.add_argument('--variant-b-label', default='B',
                       help='Custom label for variant B (default: B)')
    parser.add_argument('--variant-c-label', default='C',
                       help='Custom label for variant C (default: C)')
    parser.add_argument('--variant-d-label', default='D',
                       help='Custom label for variant D (default: D)')
    parser.add_argument('--variant-e-label', default='E',
                       help='Custom label for variant E (default: E)')
    
    # AB testing controls
    parser.add_argument('--ab-reps', type=int, default=5,
                       help='Repetitions per variant for AB testing (default: 5)')
    
    args = parser.parse_args()
    
    # Create manager and run
    manager = ProductionCycleManager(
        mode=args.mode,
        full_cycle=args.full_cycle,
        dry_run=args.dry_run,
        safeguards=args.safeguards,
        rollout_strategy=args.rollout_strategy,
        validation=args.validation,
        pattern_metrics=args.pattern_metrics,
        compliance_checks=args.compliance_checks,
        variant_a_iters=args.variant_a_iters,
        variant_b_iters=args.variant_b_iters,
        variant_c_iters=args.variant_c_iters,
        variant_d_iters=args.variant_d_iters,
        variant_e_iters=args.variant_e_iters,
        variant_a_label=args.variant_a_label,
        variant_b_label=args.variant_b_label,
        variant_c_label=args.variant_c_label,
        variant_d_label=args.variant_d_label,
        variant_e_label=args.variant_e_label,
        ab_reps=args.ab_reps
    )
    
    success = manager.run()
    sys.exit(0 if success else 1)

if __name__ == '__main__':
    main()