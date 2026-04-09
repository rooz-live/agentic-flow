#!/usr/bin/env python3
"""
Progress Tracking and Dashboard System
Provides comprehensive progress tracking and dashboard capabilities
"""

import json
import os
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, List, Optional

class ProgressDashboard:
    """Progress tracking and dashboard system"""
    
    def __init__(self, project_root: Optional[str] = None):
        self.project_root = Path(project_root) if project_root else Path.cwd()
        self.goalie_dir = self.project_root / ".goalie"
        self.dashboard_dir = self.goalie_dir / "dashboard"
        self.dashboard_dir.mkdir(exist_ok=True)
        
        # Dashboard data files
        self.current_status_file = self.goalie_dir / "prod_status_current.json"
        self.progress_log_file = self.dashboard_dir / "progress_log.jsonl"
        self.dashboard_state_file = self.dashboard_dir / "dashboard_state.json"
    
    def generate_dashboard(self, format: str = "text") -> Dict[str, Any]:
        """Generate comprehensive dashboard"""
        # Get current production status
        current_status = self._get_current_status()
        
        # Get progress history
        progress_history = self._get_progress_history()
        
        # Get system metrics
        system_metrics = self._get_system_metrics()
        
        # Get evidence trails
        evidence_trails = self._get_evidence_trails()
        
        dashboard = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "current_status": current_status,
            "progress_history": progress_history,
            "system_metrics": system_metrics,
            "evidence_trails": evidence_trails,
            "summary": self._generate_summary(current_status, progress_history, system_metrics)
        }
        
        # Save dashboard state
        self._save_dashboard_state(dashboard)
        
        # Format output
        if format == "json":
            return dashboard
        elif format == "text":
            return self._format_text_dashboard(dashboard)
        elif format == "compact":
            return self._format_compact_dashboard(dashboard)
        elif format == "rich":
            return self._format_rich_dashboard(dashboard)
        else:
            return dashboard
    
    def update_progress(self, step: str, status: str, message: str, 
                     metrics: Optional[Dict[str, Any]] = None) -> None:
        """Update progress tracking"""
        progress_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "step": step,
            "status": status,
            "message": message,
            "metrics": metrics or {}
        }
        
        # Append to progress log
        with open(self.progress_log_file, 'a') as f:
            f.write(json.dumps(progress_entry) + '\n')
        
        # Update current status file if it exists
        if self.current_status_file.exists():
            try:
                with open(self.current_status_file, 'r') as f:
                    current_status = json.load(f)
                
                # Update steps in current status
                step_entry = {
                    "step": step,
                    "status": status,
                    "message": message,
                    "timestamp": progress_entry["timestamp"]
                }
                
                if metrics:
                    step_entry["metrics"] = metrics
                
                # Find existing step or add new one
                existing_step_index = None
                for i, s in enumerate(current_status.get("steps", [])):
                    if s.get("step") == step:
                        existing_step_index = i
                        break
                
                if existing_step_index is not None:
                    current_status["steps"][existing_step_index] = step_entry
                else:
                    current_status.setdefault("steps", []).append(step_entry)
                
                # Update overall status
                current_status["status"] = status
                current_status["last_update"] = progress_entry["timestamp"]
                
                # Merge metrics
                if metrics:
                    current_status.setdefault("metrics", {}).update(metrics)
                
                # Write back to current status
                with open(self.current_status_file, 'w') as f:
                    json.dump(current_status, f, indent=2)
            
            except (json.JSONDecodeError, IOError):
                pass  # Ignore errors in status update
    
    def get_progress_summary(self, steps: int = 10) -> Dict[str, Any]:
        """Get progress summary for recent steps"""
        progress_history = self._get_progress_history()
        recent_progress = progress_history[:steps]
        
        if not recent_progress:
            return {"error": "No progress history found"}
        
        # Calculate statistics
        total_steps = len(recent_progress)
        completed_steps = sum(1 for p in recent_progress if p.get("status") == "completed")
        failed_steps = sum(1 for p in recent_progress if p.get("status") == "failed")
        running_steps = sum(1 for p in recent_progress if p.get("status") == "running")
        
        # Calculate duration
        if len(recent_progress) >= 2:
            first_time = datetime.fromisoformat(recent_progress[-1]["timestamp"].replace('Z', '+00:00'))
            last_time = datetime.fromisoformat(recent_progress[0]["timestamp"].replace('Z', '+00:00'))
            duration = (last_time - first_time).total_seconds()
        else:
            duration = 0
        
        return {
            "total_steps": total_steps,
            "completed_steps": completed_steps,
            "failed_steps": failed_steps,
            "running_steps": running_steps,
            "completion_rate": (completed_steps / total_steps) * 100 if total_steps > 0 else 0,
            "duration_seconds": duration,
            "average_step_duration": duration / total_steps if total_steps > 0 else 0,
            "latest_step": recent_progress[0] if recent_progress else None
        }
    
    def _get_current_status(self) -> Optional[Dict[str, Any]]:
        """Get current production status"""
        if not self.current_status_file.exists():
            return None
        
        try:
            with open(self.current_status_file, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return None
    
    def _get_progress_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get progress history from log file"""
        if not self.progress_log_file.exists():
            return []
        
        progress_history = []
        try:
            with open(self.progress_log_file, 'r') as f:
                lines = f.readlines()
                for line in reversed(lines[-limit:]):  # Get most recent
                    line = line.strip()
                    if line:
                        try:
                            progress_history.append(json.loads(line))
                        except json.JSONDecodeError:
                            continue
        except IOError:
            pass
        
        return progress_history
    
    def _get_system_metrics(self) -> Dict[str, Any]:
        """Get system metrics"""
        metrics = {}
        
        # Get memory usage
        try:
            import psutil
            memory = psutil.virtual_memory()
            metrics["memory_usage_percent"] = memory.percent
            metrics["memory_available_gb"] = memory.available / (1024**3)
        except ImportError:
            metrics["memory_usage_percent"] = "N/A"
            metrics["memory_available_gb"] = "N/A"
        
        # Get disk usage
        try:
            import psutil
            disk = psutil.disk_usage(str(self.project_root))
            metrics["disk_usage_percent"] = disk.percent
            metrics["disk_free_gb"] = disk.free / (1024**3)
        except ImportError:
            metrics["disk_usage_percent"] = "N/A"
            metrics["disk_free_gb"] = "N/A"
        
        # Get pattern metrics if available
        pattern_metrics_file = self.goalie_dir / "pattern_metrics.jsonl"
        if pattern_metrics_file.exists():
            try:
                with open(pattern_metrics_file, 'r') as f:
                    lines = f.readlines()
                    if lines:
                        latest_metric = json.loads(lines[-1].strip())
                        metrics["latest_performance_score"] = latest_metric.get("performance_score", 0)
                        metrics["latest_pattern_hit_rate"] = latest_metric.get("pattern_hit_rate", 0)
            except (json.JSONDecodeError, IOError):
                pass
        
        return metrics
    
    def _get_evidence_trails(self) -> List[Dict[str, Any]]:
        """Get evidence trails"""
        evidence_trails = []
        
        # Get from current status
        current_status = self._get_current_status()
        if current_status and "evidence_trails" in current_status:
            evidence_trails.extend(current_status["evidence_trails"])
        
        # Get from unified evidence file
        unified_evidence_file = self.goalie_dir / "unified_evidence.jsonl"
        if unified_evidence_file.exists():
            try:
                with open(unified_evidence_file, 'r') as f:
                    lines = f.readlines()
                    for line in lines[-20:]:  # Get last 20 evidence entries
                        line = line.strip()
                        if line:
                            try:
                                evidence_trails.append(json.loads(line))
                            except json.JSONDecodeError:
                                continue
            except IOError:
                pass
        
        return evidence_trails[-50:]  # Return last 50 evidence trails
    
    def _generate_summary(self, current_status: Optional[Dict[str, Any]], 
                       progress_history: List[Dict[str, Any]], 
                       system_metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Generate dashboard summary"""
        summary = {
            "overall_status": "unknown",
            "progress_percentage": 0,
            "active_steps": 0,
            "completed_steps": 0,
            "failed_steps": 0,
            "health_indicators": {},
            "performance_indicators": {}
        }
        
        if current_status:
            summary["overall_status"] = current_status.get("status", "unknown")
            
            # Calculate progress from steps
            steps = current_status.get("steps", [])
            if steps:
                completed_steps = sum(1 for s in steps if s.get("status") == "completed")
                total_steps = len(steps)
                summary["progress_percentage"] = (completed_steps / total_steps) * 100
                summary["active_steps"] = sum(1 for s in steps if s.get("status") == "running")
                summary["completed_steps"] = completed_steps
                summary["failed_steps"] = sum(1 for s in steps if s.get("status") == "failed")
        
        # Health indicators
        memory_usage = system_metrics.get("memory_usage_percent", 0)
        if isinstance(memory_usage, (int, float)):
            if memory_usage < 70:
                summary["health_indicators"]["memory"] = "good"
            elif memory_usage < 90:
                summary["health_indicators"]["memory"] = "warning"
            else:
                summary["health_indicators"]["memory"] = "critical"
        else:
            summary["health_indicators"]["memory"] = "unknown"
        
        disk_usage = system_metrics.get("disk_usage_percent", 0)
        if isinstance(disk_usage, (int, float)):
            if disk_usage < 70:
                summary["health_indicators"]["disk"] = "good"
            elif disk_usage < 90:
                summary["health_indicators"]["disk"] = "warning"
            else:
                summary["health_indicators"]["disk"] = "critical"
        else:
            summary["health_indicators"]["disk"] = "unknown"
        
        # Performance indicators
        perf_score = system_metrics.get("latest_performance_score", 0)
        if isinstance(perf_score, (int, float)):
            if perf_score >= 90:
                summary["performance_indicators"]["performance"] = "excellent"
            elif perf_score >= 75:
                summary["performance_indicators"]["performance"] = "good"
            elif perf_score >= 60:
                summary["performance_indicators"]["performance"] = "fair"
            else:
                summary["performance_indicators"]["performance"] = "poor"
        else:
            summary["performance_indicators"]["performance"] = "unknown"
        
        return summary
    
    def _format_text_dashboard(self, dashboard: Dict[str, Any]) -> str:
        """Format dashboard as plain text"""
        output = []
        output.append("=" * 60)
        output.append("PRODUCTION DASHBOARD")
        output.append("=" * 60)
        output.append(f"Generated: {dashboard['timestamp']}")
        output.append("")
        
        # Current status
        current_status = dashboard.get("current_status", {})
        if current_status:
            output.append("CURRENT STATUS:")
            output.append(f"  Run ID: {current_status.get('run_id', 'N/A')}")
            output.append(f"  Command: {current_status.get('command', 'N/A')}")
            output.append(f"  Status: {current_status.get('status', 'N/A')}")
            output.append(f"  Mode: {current_status.get('mode', 'N/A')}")
            output.append(f"  Circle: {current_status.get('circle', 'N/A')}")
            output.append("")
        
        # Summary
        summary = dashboard.get("summary", {})
        output.append("SUMMARY:")
        output.append(f"  Progress: {summary.get('progress_percentage', 0):.1f}%")
        output.append(f"  Active Steps: {summary.get('active_steps', 0)}")
        output.append(f"  Completed Steps: {summary.get('completed_steps', 0)}")
        output.append(f"  Failed Steps: {summary.get('failed_steps', 0)}")
        output.append("")
        
        # Health indicators
        health = summary.get("health_indicators", {})
        output.append("HEALTH INDICATORS:")
        output.append(f"  Memory: {health.get('memory', 'N/A')}")
        output.append(f"  Disk: {health.get('disk', 'N/A')}")
        output.append("")
        
        # Performance indicators
        performance = summary.get("performance_indicators", {})
        output.append("PERFORMANCE INDICATORS:")
        output.append(f"  Performance: {performance.get('performance', 'N/A')}")
        output.append("")
        
        # Recent progress
        progress_history = dashboard.get("progress_history", [])
        if progress_history:
            output.append("RECENT PROGRESS:")
            for i, progress in enumerate(progress_history[:5]):
                timestamp = progress.get("timestamp", "")[:19]  # Remove timezone
                step = progress.get("step", "N/A")
                status = progress.get("status", "N/A")
                message = progress.get("message", "")
                output.append(f"  {i+1}. [{timestamp}] {step}: {status}")
                if message:
                    output.append(f"     {message}")
            output.append("")
        
        return "\n".join(output)
    
    def _format_compact_dashboard(self, dashboard: Dict[str, Any]) -> str:
        """Format dashboard as compact text"""
        current_status = dashboard.get("current_status", {})
        summary = dashboard.get("summary", {})
        
        return f"{dashboard['timestamp'][:19]} | " \
               f"Status: {current_status.get('status', 'N/A')} | " \
               f"Progress: {summary.get('progress_percentage', 0):.1f}% | " \
               f"Memory: {summary.get('health_indicators', {}).get('memory', 'N/A')} | " \
               f"Disk: {summary.get('health_indicators', {}).get('disk', 'N/A')} | " \
               f"Perf: {summary.get('performance_indicators', {}).get('performance', 'N/A')}"
    
    def _format_rich_dashboard(self, dashboard: Dict[str, Any]) -> str:
        """Format dashboard as rich text with emojis"""
        output = []
        output.append("🚀 PRODUCTION DASHBOARD 🚀")
        output.append("=" * 60)
        output.append(f"📅 Generated: {dashboard['timestamp'][:19]}")
        output.append("")
        
        # Current status with emojis
        current_status = dashboard.get("current_status", {})
        if current_status:
            status_emoji = {
                "initializing": "🔄",
                "running": "⚡",
                "completed": "✅",
                "failed": "❌",
                "unknown": "❓"
            }.get(current_status.get("status", "unknown"), "❓")
            
            output.append(f"{status_emoji} CURRENT STATUS:")
            output.append(f"   🆔 Run ID: {current_status.get('run_id', 'N/A')}")
            output.append(f"   🎯 Command: {current_status.get('command', 'N/A')}")
            output.append(f"   📊 Status: {current_status.get('status', 'N/A')}")
            output.append(f"   ⚙️  Mode: {current_status.get('mode', 'N/A')}")
            output.append(f"   🎪 Circle: {current_status.get('circle', 'N/A')}")
            output.append("")
        
        # Summary with progress bar
        summary = dashboard.get("summary", {})
        progress_pct = summary.get('progress_percentage', 0)
        progress_bar_length = 20
        filled_length = int(progress_bar_length * progress_pct / 100)
        progress_bar = "█" * filled_length + "░" * (progress_bar_length - filled_length)
        
        output.append("📈 SUMMARY:")
        output.append(f"   📊 Progress: {progress_bar} {progress_pct:.1f}%")
        output.append(f"   ⚡ Active Steps: {summary.get('active_steps', 0)}")
        output.append(f"   ✅ Completed Steps: {summary.get('completed_steps', 0)}")
        output.append(f"   ❌ Failed Steps: {summary.get('failed_steps', 0)}")
        output.append("")
        
        # Health indicators with emojis
        health = summary.get("health_indicators", {})
        health_emojis = {
            "good": "🟢",
            "warning": "🟡",
            "critical": "🔴",
            "unknown": "⚪"
        }
        
        output.append("🏥 HEALTH INDICATORS:")
        output.append(f"   💾 Memory: {health_emojis.get(health.get('memory', 'unknown'), '⚪')} {health.get('memory', 'N/A')}")
        output.append(f"   💿 Disk: {health_emojis.get(health.get('disk', 'unknown'), '⚪')} {health.get('disk', 'N/A')}")
        output.append("")
        
        # Performance indicators with emojis
        performance = summary.get("performance_indicators", {})
        perf_emojis = {
            "excellent": "🌟",
            "good": "👍",
            "fair": "👌",
            "poor": "👎",
            "unknown": "❓"
        }
        
        output.append("🎯 PERFORMANCE INDICATORS:")
        output.append(f"   📈 Performance: {perf_emojis.get(performance.get('performance', 'unknown'), '❓')} {performance.get('performance', 'N/A')}")
        output.append("")
        
        # Recent progress with emojis
        progress_history = dashboard.get("progress_history", [])
        if progress_history:
            output.append("📝 RECENT PROGRESS:")
            for i, progress in enumerate(progress_history[:5]):
                timestamp = progress.get("timestamp", "")[:19]
                step = progress.get("step", "N/A")
                status = progress.get("status", "N/A")
                message = progress.get("message", "")
                
                status_emoji = {
                    "running": "⚡",
                    "completed": "✅",
                    "failed": "❌"
                }.get(status, "❓")
                
                output.append(f"   {i+1}. {status_emoji} [{timestamp}] {step}")
                if message:
                    output.append(f"      💬 {message}")
            output.append("")
        
        return "\n".join(output)
    
    def _save_dashboard_state(self, dashboard: Dict[str, Any]) -> None:
        """Save dashboard state to file"""
        try:
            with open(self.dashboard_state_file, 'w') as f:
                json.dump(dashboard, f, indent=2)
        except IOError:
            pass

def main():
    """CLI interface for progress dashboard"""
    if len(sys.argv) < 2:
        print("Usage: progress_dashboard.py <command> [options]")
        print("Commands: generate, update, summary")
        sys.exit(1)
    
    command = sys.argv[1]
    dashboard = ProgressDashboard()
    
    if command == "generate":
        format_type = sys.argv[3] if len(sys.argv) > 3 and sys.argv[2] == "--format" else "text"
        dashboard_data = dashboard.generate_dashboard(format_type)
        
        if format_type == "json":
            print(json.dumps(dashboard_data, indent=2))
        else:
            print(dashboard_data)
    
    elif command == "update":
        if len(sys.argv) < 5:
            print("Usage: progress_dashboard.py update <step> <status> <message> [metrics_json]")
            sys.exit(1)
        
        step = sys.argv[2]
        status = sys.argv[3]
        message = sys.argv[4]
        metrics = json.loads(sys.argv[5]) if len(sys.argv) > 5 else None
        
        dashboard.update_progress(step, status, message, metrics)
        print(f"Progress updated: {step} -> {status}")
    
    elif command == "summary":
        steps = int(sys.argv[3]) if len(sys.argv) > 3 and sys.argv[2] == "--steps" else 10
        summary = dashboard.get_progress_summary(steps)
        print(json.dumps(summary, indent=2))
    
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)

if __name__ == "__main__":
    main()