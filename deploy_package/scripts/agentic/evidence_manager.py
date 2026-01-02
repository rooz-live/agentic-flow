#!/usr/bin/env python3
"""
Evidence Manager - Unified evidence collection and emission system
Collects evidence from multiple emitters asynchronously with consistent schema
"""

import json
import sys
import asyncio
import os
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from datetime import datetime
import subprocess

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

@dataclass
class EmitterResult:
    """Result from a single emitter execution"""
    emitter: str
    success: bool
    data: Dict[str, Any]
    duration_ms: int
    error: Optional[str] = None
    
    def to_dict(self) -> Dict:
        return asdict(self)


class EvidenceManager:
    """Unified evidence collection and emission manager"""
    
    def __init__(self, config_path: Optional[str] = None):
        """Initialize Evidence Manager with configuration"""
        if config_path is None:
            config_path = PROJECT_ROOT / "config" / "evidence_config.json"
        else:
            config_path = Path(config_path)
        
        if not config_path.exists():
            raise FileNotFoundError(f"Evidence config not found: {config_path}")
        
        with open(config_path) as f:
            self.config = json.load(f)
        
        self.results: List[EmitterResult] = []
        self.context: Dict[str, Any] = {}
    
    async def run_emitter(self, emitter_name: str, context: Dict[str, Any]) -> EmitterResult:
        """Run a single emitter asynchronously"""
        emitter_config = self.config['emitters'][emitter_name]
        
        # Substitute context variables in args
        args = []
        for arg in emitter_config['args']:
            try:
                formatted_arg = arg.format(**context)
                args.append(formatted_arg)
            except KeyError as e:
                # Skip if context variable not provided
                print(f"  ⚠️  Skipping {emitter_name}: missing context variable {e}", file=sys.stderr)
                return EmitterResult(emitter_name, False, {}, 0, f"Missing context: {e}")
        
        # Build command with absolute paths
        script_path = PROJECT_ROOT / emitter_config['script']
        if not script_path.exists():
            script_path = Path(emitter_config['script'])  # Try as absolute path
        
        cmd = [sys.executable, str(script_path)] + args
        
        start_time = datetime.now()
        try:
            # Create subprocess with timeout
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(PROJECT_ROOT)
            )
            
            try:
                stdout, stderr = await asyncio.wait_for(
                    proc.communicate(),
                    timeout=emitter_config['timeout_sec']
                )
            except asyncio.TimeoutError:
                proc.kill()
                await proc.wait()
                duration_ms = emitter_config['timeout_sec'] * 1000
                return EmitterResult(emitter_name, False, {}, duration_ms, "Timeout")
            
            duration_ms = int((datetime.now() - start_time).total_seconds() * 1000)
            
            if proc.returncode == 0:
                # Parse output based on format
                if emitter_config['output_format'] == 'json':
                    try:
                        data = json.loads(stdout.decode())
                    except json.JSONDecodeError as e:
                        return EmitterResult(emitter_name, False, {}, duration_ms, f"JSON parse error: {e}")
                else:
                    data = {'raw': stdout.decode()}
                
                return EmitterResult(emitter_name, True, data, duration_ms)
            else:
                error_msg = stderr.decode()[:200]  # Truncate long errors
                return EmitterResult(emitter_name, False, {}, duration_ms, error_msg)
        
        except Exception as e:
            duration_ms = int((datetime.now() - start_time).total_seconds() * 1000)
            return EmitterResult(emitter_name, False, {}, duration_ms, str(e))
    
    async def collect_evidence(
        self, 
        phase: str, 
        context: Dict[str, Any], 
        emitter_list: Optional[List[str]] = None,
        mode: str = "prod_cycle"
    ) -> List[EmitterResult]:
        """
        Collect evidence from all enabled emitters for a phase
        
        Args:
            phase: Execution phase (pre_iteration, teardown, post_run, etc.)
            context: Context dict with run_id, circle, iteration, mode, depth
            emitter_list: Optional list of specific emitters to run
            mode: Integration mode (prod_cycle or prod_swarm)
        
        Returns:
            List of EmitterResult objects
        """
        self.context = context
        
        # Determine which emitters to run
        if emitter_list:
            emitters_to_run = [e for e in emitter_list if e in self.config['emitters']]
        else:
            emitters_to_run = [
                name for name, config in self.config['emitters'].items()
                if config['enabled'] 
                and config['integration'].get(mode, False)
                and config['integration']['phase'] == phase
            ]
        
        if not emitters_to_run:
            return []
        
        # Run emitters concurrently
        tasks = [self.run_emitter(name, context) for name in emitters_to_run]
        results = await asyncio.gather(*tasks)
        
        self.results.extend(results)
        return results
    
    def emit_unified_event(self, result: EmitterResult, context: Dict[str, Any]) -> Dict[str, Any]:
        """Convert emitter result to unified schema"""
        return {
            "event_type": "evidence",
            "emitter": result.emitter,
            "timestamp": datetime.now().isoformat(),
            "run_id": context.get('run_id', 'unknown'),
            "circle": context.get('circle', 'unknown'),
            "context": {
                "iteration": context.get('iteration', 0),
                "mode": context.get('mode', 'unknown'),
                "depth": context.get('depth', 1)
            },
            "data": result.data,
            "metadata": {
                "duration_ms": result.duration_ms,
                "status": "success" if result.success else "failure",
                "error": result.error,
                "version": self.config['version']
            }
        }
    
    def write_evidence(self, output_path: Optional[str] = None) -> int:
        """
        Write all collected evidence to JSONL
        
        Args:
            output_path: Path to output file (default: .goalie/evidence.jsonl)
        
        Returns:
            Number of events written
        """
        if output_path is None:
            output_path = PROJECT_ROOT / ".goalie" / "evidence.jsonl"
        else:
            output_path = Path(output_path)
        
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        count = 0
        with open(output_path, 'a') as f:
            for result in self.results:
                event = self.emit_unified_event(result, self.context)
                f.write(json.dumps(event) + '\n')
                count += 1
        
        return count
    
    def get_summary(self) -> Dict[str, Any]:
        """Get summary of collected evidence"""
        total = len(self.results)
        successful = sum(1 for r in self.results if r.success)
        failed = total - successful
        
        by_emitter = {}
        for result in self.results:
            if result.emitter not in by_emitter:
                by_emitter[result.emitter] = {"success": 0, "failure": 0, "total_ms": 0}
            
            status = "success" if result.success else "failure"
            by_emitter[result.emitter][status] += 1
            by_emitter[result.emitter]["total_ms"] += result.duration_ms
        
        return {
            "total_emitters": total,
            "successful": successful,
            "failed": failed,
            "by_emitter": by_emitter,
            "config_version": self.config['version']
        }
    
    def print_summary(self):
        """Print evidence collection summary to stdout"""
        summary = self.get_summary()
        
        print(f"\n📊 Evidence Collection Summary:")
        print(f"   Total Emitters: {summary['total_emitters']}")
        print(f"   ✅ Successful: {summary['successful']}")
        print(f"   ❌ Failed: {summary['failed']}")
        
        if summary['by_emitter']:
            print(f"\n   By Emitter:")
            for emitter, stats in summary['by_emitter'].items():
                success_rate = (stats['success'] / (stats['success'] + stats['failure']) * 100) if (stats['success'] + stats['failure']) > 0 else 0
                avg_duration = stats['total_ms'] / (stats['success'] + stats['failure']) if (stats['success'] + stats['failure']) > 0 else 0
                print(f"      {emitter}: {stats['success']}/{stats['success'] + stats['failure']} ({success_rate:.0f}%) - {avg_duration:.0f}ms avg")


def main():
    """CLI entry point for evidence manager"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Evidence Manager - Collect and emit evidence")
    parser.add_argument('--phase', required=True, choices=['pre_iteration', 'teardown', 'post_run', 'analysis'],
                        help='Execution phase')
    parser.add_argument('--circle', required=True, help='Circle name')
    parser.add_argument('--run-id', required=True, help='Run ID')
    parser.add_argument('--mode', default='prod_cycle', choices=['prod_cycle', 'prod_swarm'],
                        help='Integration mode')
    parser.add_argument('--iteration', type=int, default=0, help='Iteration number')
    parser.add_argument('--depth', type=int, default=1, help='Execution depth')
    parser.add_argument('--emitters', nargs='+', help='Specific emitters to run')
    parser.add_argument('--output', help='Output path for evidence JSONL')
    parser.add_argument('--config', help='Path to evidence config JSON')
    parser.add_argument('--json', action='store_true', help='Output summary as JSON')
    
    args = parser.parse_args()
    
    # Build context
    context = {
        'run_id': args.run_id,
        'circle': args.circle,
        'iteration': args.iteration,
        'mode': args.mode,
        'depth': args.depth
    }
    
    # Initialize manager
    try:
        manager = EvidenceManager(config_path=args.config)
    except Exception as e:
        print(f"❌ Failed to initialize Evidence Manager: {e}", file=sys.stderr)
        sys.exit(1)
    
    # Collect evidence
    try:
        results = asyncio.run(manager.collect_evidence(
            phase=args.phase,
            context=context,
            emitter_list=args.emitters,
            mode=args.mode
        ))
    except Exception as e:
        print(f"❌ Evidence collection failed: {e}", file=sys.stderr)
        sys.exit(1)
    
    # Write evidence
    try:
        count = manager.write_evidence(output_path=args.output)
    except Exception as e:
        print(f"❌ Failed to write evidence: {e}", file=sys.stderr)
        sys.exit(1)
    
    # Output summary
    if args.json:
        summary = manager.get_summary()
        summary['events_written'] = count
        print(json.dumps(summary, indent=2))
    else:
        manager.print_summary()
        print(f"   📝 Events Written: {count}")
    
    # Exit with error if any emitters failed
    summary = manager.get_summary()
    sys.exit(0 if summary['failed'] == 0 else 1)


if __name__ == '__main__':
    main()
