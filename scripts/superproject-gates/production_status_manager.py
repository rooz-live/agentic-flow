#!/usr/bin/env python3
"""
Production Status Manager
 
This module provides comprehensive status management for production workflows,
including multipass pre/post cycle integration, progress tracking, and JSON status file handling.
"""

import json
import os
import sys
import argparse
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Optional, List


class ProductionStatusManager:
    """Manages production workflow status with JSON file persistence."""
    
    def __init__(self, status_file: str):
        """Initialize the status manager with the status file path."""
        self.status_file = Path(status_file)
        self.status_data = self._load_status()
    
    def _load_status(self) -> Dict[str, Any]:
        """Load status data from file or create new status structure."""
        if self.status_file.exists():
            try:
                with open(self.status_file, 'r') as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError) as e:
                print(f"Warning: Could not load status file {self.status_file}: {e}", file=sys.stderr)
        
        # Default status structure
        return {
            "run_id": "",
            "command": "",
            "start_time": "",
            "end_time": "",
            "status": "initialized",
            "steps": {},
            "metrics": {},
            "multipass": {
                "enabled": False,
                "preflight_iterations": 0,
                "status": "not_started"
            },
            "environment": {
                "af_env": os.environ.get("AF_ENV", "local"),
                "af_run_id": os.environ.get("AF_RUN_ID", ""),
                "af_enable_iris_metrics": os.environ.get("AF_ENABLE_IRIS_METRICS", "0"),
                "af_prod_observability_first": os.environ.get("AF_PROD_OBSERVABILITY_FIRST", "1")
            }
        }
    
    def _save_status(self) -> None:
        """Save status data to file."""
        # Ensure directory exists
        self.status_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Save with pretty formatting
        with open(self.status_file, 'w') as f:
            json.dump(self.status_data, f, indent=2, default=str)
    
    def initialize(self, command: str, run_id: Optional[str] = None) -> None:
        """Initialize a new production run status."""
        self.status_data.update({
            "run_id": run_id or os.environ.get("AF_RUN_ID", ""),
            "command": command,
            "start_time": datetime.now(timezone.utc).isoformat(),
            "end_time": "",
            "status": "running",
            "steps": {},
            "metrics": {}
        })
        self._save_status()
    
    def update_step(self, step_name: str, status: str, message: str, metrics: Optional[Dict[str, Any]] = None) -> None:
        """Update the status of a specific step."""
        timestamp = datetime.now(timezone.utc).isoformat()
        
        # Update step status
        if step_name not in self.status_data["steps"]:
            self.status_data["steps"][step_name] = {}
        
        self.status_data["steps"][step_name].update({
            "status": status,
            "message": message,
            "timestamp": timestamp
        })
        
        # Add step-specific metrics
        if metrics:
            if "metrics" not in self.status_data["steps"][step_name]:
                self.status_data["steps"][step_name]["metrics"] = {}
            self.status_data["steps"][step_name]["metrics"].update(metrics)
        
        # Update global status based on step status
        self._update_global_status()
        self._save_status()
    
    def update_multipass_status(self, enabled: bool, preflight_iterations: int = 0, status: str = "not_started") -> None:
        """Update multipass configuration and status."""
        self.status_data["multipass"].update({
            "enabled": enabled,
            "preflight_iterations": preflight_iterations,
            "status": status
        })
        self._save_status()
    
    def add_metric(self, name: str, value: Any, step: Optional[str] = None) -> None:
        """Add a metric to the status."""
        timestamp = datetime.now(timezone.utc).isoformat()
        
        if step:
            # Step-specific metric
            if step not in self.status_data["steps"]:
                self.status_data["steps"][step] = {}
            if "metrics" not in self.status_data["steps"][step]:
                self.status_data["steps"][step]["metrics"] = {}
            
            self.status_data["steps"][step]["metrics"][name] = {
                "value": value,
                "timestamp": timestamp
            }
        else:
            # Global metric
            self.status_data["metrics"][name] = {
                "value": value,
                "timestamp": timestamp
            }
        
        self._save_status()
    
    def complete(self, status: str = "completed", message: str = "") -> None:
        """Mark the production run as completed."""
        self.status_data.update({
            "end_time": datetime.now(timezone.utc).isoformat(),
            "status": status
        })
        
        if message:
            self.status_data["completion_message"] = message
        
        self._save_status()
    
    def get_status(self) -> Dict[str, Any]:
        """Get the current status data."""
        return self.status_data.copy()
    
    def get_step_status(self, step_name: str) -> Optional[Dict[str, Any]]:
        """Get the status of a specific step."""
        return self.status_data.get("steps", {}).get(step_name)
    
    def is_step_completed(self, step_name: str) -> bool:
        """Check if a specific step is completed."""
        step_status = self.get_step_status(step_name)
        return step_status and step_status.get("status") == "completed"
    
    def is_step_failed(self, step_name: str) -> bool:
        """Check if a specific step has failed."""
        step_status = self.get_step_status(step_name)
        return step_status and step_status.get("status") == "failed"
    
    def get_failed_steps(self) -> List[str]:
        """Get a list of failed steps."""
        failed_steps = []
        for step_name, step_data in self.status_data.get("steps", {}).items():
            if step_data.get("status") == "failed":
                failed_steps.append(step_name)
        return failed_steps
    
    def get_running_steps(self) -> List[str]:
        """Get a list of currently running steps."""
        running_steps = []
        for step_name, step_data in self.status_data.get("steps", {}).items():
            if step_data.get("status") == "running":
                running_steps.append(step_name)
        return running_steps
    
    def _update_global_status(self) -> None:
        """Update the global status based on step statuses."""
        steps = self.status_data.get("steps", {})
        
        # Check for failed steps
        failed_steps = [name for name, data in steps.items() if data.get("status") == "failed"]
        if failed_steps:
            self.status_data["status"] = "failed"
            self.status_data["failed_steps"] = failed_steps
            return
        
        # Check for running steps
        running_steps = [name for name, data in steps.items() if data.get("status") == "running"]
        if running_steps:
            self.status_data["status"] = "running"
            return
        
        # If no failed or running steps, check if all are completed
        if steps and all(data.get("status") == "completed" for data in steps.values()):
            self.status_data["status"] = "completed"
    
    def generate_summary(self) -> Dict[str, Any]:
        """Generate a summary of the production run."""
        steps = self.status_data.get("steps", {})
        
        summary = {
            "run_id": self.status_data.get("run_id"),
            "command": self.status_data.get("command"),
            "status": self.status_data.get("status"),
            "start_time": self.status_data.get("start_time"),
            "end_time": self.status_data.get("end_time"),
            "total_steps": len(steps),
            "completed_steps": len([s for s in steps.values() if s.get("status") == "completed"]),
            "failed_steps": len([s for s in steps.values() if s.get("status") == "failed"]),
            "running_steps": len([s for s in steps.values() if s.get("status") == "running"]),
            "multipass_enabled": self.status_data.get("multipass", {}).get("enabled", False)
        }
        
        # Calculate duration if both start and end times are available
        if summary["start_time"] and summary["end_time"]:
            try:
                start = datetime.fromisoformat(summary["start_time"])
                end = datetime.fromisoformat(summary["end_time"])
                summary["duration_seconds"] = (end - start).total_seconds()
            except (ValueError, TypeError):
                pass
        
        return summary


def main():
    """Main CLI entry point for the production status manager."""
    parser = argparse.ArgumentParser(description="Production Status Manager")
    parser.add_argument("--action", choices=["initialize", "update", "complete", "status", "summary"], default=None,
                        help="Action to perform")
    parser.add_argument("--status-file", default=".goalie/prod_status_current.json",
                        help="Path to the status file")
    parser.add_argument("--run-id", help="Run ID for initialization")
    parser.add_argument("--step", help="Step name for update action")
    parser.add_argument("--step-status", help="Step status for update action")
    parser.add_argument("--message", help="Message for update action")
    parser.add_argument("--metrics", help="JSON string of metrics for update action")
    parser.add_argument("--global-status", help="Global status for complete action")
    parser.add_argument("--completion-message", help="Completion message")
    
    args, unknown = parser.parse_known_args()
    
    if unknown:
        if len(unknown) == 1 and not unknown[0].startswith('-'):
            args.step = unknown[0]
        else:
            print("Unrecognized arguments:", ' '.join(unknown), file=sys.stderr)
            sys.exit(1)
    
    if args.action is None:
        if args.step:
            args.action = "update"
        else:
            args.action = "status"
    
    # Initialize status manager
    manager = ProductionStatusManager(args.status_file)
    
    try:
        if args.action == "initialize":
            command = args.step if args.step else "unknown"
            manager.initialize(command, args.run_id)
            print(f"Initialized production status for command: {command}")
        
        elif args.action == "update":
            if not args.step or not args.step_status:
                print("Error: --step and --step-status are required for update action", file=sys.stderr)
                sys.exit(1)
            
            metrics = None
            if args.metrics:
                try:
                    metrics = json.loads(args.metrics)
                except json.JSONDecodeError as e:
                    print(f"Error parsing metrics JSON: {e}", file=sys.stderr)
                    sys.exit(1)
            
            manager.update_step(args.step, args.step_status, args.message or "", metrics)
            print(f"Updated step '{args.step}' status to '{args.step_status}'")
        
        elif args.action == "complete":
            status = args.global_status or "completed"
            manager.complete(status, args.completion_message or "")
            print(f"Marked production run as '{status}'")
        
        elif args.action == "status":
            status_data = manager.get_status()
            print(json.dumps(status_data, indent=2, default=str))
        
        elif args.action == "summary":
            summary = manager.generate_summary()
            print(json.dumps(summary, indent=2, default=str))
    
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()