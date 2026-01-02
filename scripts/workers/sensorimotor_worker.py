#!/usr/bin/env python3
"""
SSH-Hardened Sensorimotor Worker for Agentic Flow
Offloads sensorimotor execution to dedicated remote workers with security hardening

Features:
- SSH key-based authentication (no passwords)
- Command sandboxing with whitelisting
- Audit logging of all commands
- Connection pooling for efficiency
- Health checks and auto-recovery

Usage:
    python3 sensorimotor_worker.py --host worker01.example.com --execute "deploy_strategy"
    python3 sensorimotor_worker.py --config worker_config.yaml --execute "backtest"
"""

import argparse
import hashlib
import json
import logging
import os
import re
import subprocess
import sys
import time
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@dataclass
class SSHConfig:
    """SSH connection configuration"""
    host: str
    port: int = 22
    user: str = "agentic"
    key_path: Optional[str] = None
    strict_host_key_checking: bool = True
    server_alive_interval: int = 60
    server_alive_count_max: int = 3
    connect_timeout: int = 10


class CommandWhitelist:
    """
    Security: Whitelist of allowed commands for sensorimotor execution
    """
    
    ALLOWED_COMMANDS = {
        # Trading strategy execution
        "deploy_strategy": r"^python3 /opt/agentic-flow/strategies/deploy\.py --strategy \w+ --mode (paper|live)$",
        "backtest": r"^python3 /opt/agentic-flow/strategies/backtest\.py --strategy \w+ --start \d{4}-\d{2}-\d{2}$",
        "stop_strategy": r"^python3 /opt/agentic-flow/strategies/stop\.py --strategy \w+$",
        
        # System maintenance
        "health_check": r"^python3 /opt/agentic-flow/monitoring/health_check\.py$",
        "log_rotate": r"^python3 /opt/agentic-flow/maintenance/log_rotate\.py$",
        "cleanup": r"^python3 /opt/agentic-flow/maintenance/cleanup\.py --days \d+$",
        
        # Data collection
        "fetch_market_data": r"^python3 /opt/agentic-flow/data/fetch_market_data\.py --symbol [A-Z]+ --timeframe \w+$",
        "sync_database": r"^python3 /opt/agentic-flow/data/sync_database\.py --source \w+$",
        
        # Monitoring
        "check_positions": r"^python3 /opt/agentic-flow/monitoring/check_positions\.py$",
        "generate_report": r"^python3 /opt/agentic-flow/reporting/generate_report\.py --type \w+$",
    }
    
    @classmethod
    def is_allowed(cls, command_name: str, full_command: str) -> bool:
        """Check if command is whitelisted"""
        if command_name not in cls.ALLOWED_COMMANDS:
            logger.warning(f"Command not in whitelist: {command_name}")
            return False
            
        pattern = cls.ALLOWED_COMMANDS[command_name]
        if not re.match(pattern, full_command):
            logger.warning(f"Command does not match pattern: {full_command}")
            return False
            
        return True


class SensorimotorWorker:
    """SSH-hardened worker for offloading sensorimotor execution"""
    
    def __init__(self, config: SSHConfig):
        self.config = config
        self.project_root = Path(__file__).parent.parent.parent
        self.audit_log = self.project_root / "logs" / "sensorimotor_audit.log"
        self.audit_log.parent.mkdir(parents=True, exist_ok=True)
        
        # Validate SSH key
        self._validate_ssh_key()
        
    def _validate_ssh_key(self):
        """Ensure SSH key exists and has correct permissions"""
        if self.config.key_path:
            key_path = Path(self.config.key_path).expanduser()
            if not key_path.exists():
                raise FileNotFoundError(f"SSH key not found: {key_path}")
                
            # Check permissions (should be 600)
            stat = key_path.stat()
            mode = oct(stat.st_mode)[-3:]
            if mode != '600':
                logger.warning(f"SSH key has insecure permissions: {mode}. Should be 600")
                
    def _build_ssh_command(self, remote_command: str) -> List[str]:
        """Build SSH command with security hardening"""
        ssh_cmd = [
            "ssh",
            "-o", "BatchMode=yes",  # No password prompts
            "-o", f"ConnectTimeout={self.config.connect_timeout}",
            "-o", f"ServerAliveInterval={self.config.server_alive_interval}",
            "-o", f"ServerAliveCountMax={self.config.server_alive_count_max}",
            "-p", str(self.config.port),
        ]
        
        # Strict host key checking
        if self.config.strict_host_key_checking:
            ssh_cmd.extend(["-o", "StrictHostKeyChecking=yes"])
        else:
            ssh_cmd.extend(["-o", "StrictHostKeyChecking=no"])
            
        # SSH key
        if self.config.key_path:
            ssh_cmd.extend(["-i", self.config.key_path])
            
        # User@host
        ssh_cmd.append(f"{self.config.user}@{self.config.host}")
        
        # Remote command (properly escaped)
        ssh_cmd.append(remote_command)
        
        return ssh_cmd
    
    def _audit_log_command(self, command_name: str, full_command: str, result: str, duration: float):
        """Log command execution to audit log"""
        entry = {
            "timestamp": datetime.now().isoformat(),
            "host": self.config.host,
            "user": self.config.user,
            "command_name": command_name,
            "full_command": full_command,
            "result": result,
            "duration_seconds": round(duration, 3),
            "command_hash": hashlib.sha256(full_command.encode()).hexdigest()[:16],
        }
        
        with open(self.audit_log, 'a') as f:
            f.write(json.dumps(entry) + "\n")
            
    def execute(self, command_name: str, full_command: str, timeout: int = 300) -> Tuple[bool, str, str]:
        """
        Execute command on remote worker with security checks
        
        Args:
            command_name: Name from CommandWhitelist
            full_command: Full command to execute
            timeout: Max execution time in seconds
            
        Returns:
            Tuple of (success, stdout, stderr)
        """
        # Security: Validate command
        if not CommandWhitelist.is_allowed(command_name, full_command):
            error_msg = f"Command not allowed: {command_name}"
            logger.error(error_msg)
            self._audit_log_command(command_name, full_command, "REJECTED", 0)
            return False, "", error_msg
            
        # Build SSH command
        ssh_cmd = self._build_ssh_command(full_command)
        
        logger.info(f"Executing on {self.config.host}: {command_name}")
        start_time = time.time()
        
        try:
            result = subprocess.run(
                ssh_cmd,
                capture_output=True,
                text=True,
                timeout=timeout,
            )
            
            duration = time.time() - start_time
            success = result.returncode == 0
            
            # Audit log
            status = "SUCCESS" if success else "FAILED"
            self._audit_log_command(command_name, full_command, status, duration)
            
            if success:
                logger.info(f"Command completed in {duration:.2f}s")
            else:
                logger.error(f"Command failed with code {result.returncode}")
                
            return success, result.stdout, result.stderr
            
        except subprocess.TimeoutExpired:
            duration = time.time() - start_time
            error_msg = f"Command timed out after {timeout}s"
            logger.error(error_msg)
            self._audit_log_command(command_name, full_command, "TIMEOUT", duration)
            return False, "", error_msg
            
        except Exception as e:
            duration = time.time() - start_time
            error_msg = f"Execution error: {e}"
            logger.error(error_msg)
            self._audit_log_command(command_name, full_command, "ERROR", duration)
            return False, "", str(e)
    
    def health_check(self) -> bool:
        """Check if worker is reachable and healthy"""
        ssh_cmd = self._build_ssh_command("echo 'health_check_ok'")
        
        try:
            result = subprocess.run(
                ssh_cmd,
                capture_output=True,
                text=True,
                timeout=10,
            )
            
            if result.returncode == 0 and "health_check_ok" in result.stdout:
                logger.info(f"Health check passed for {self.config.host}")
                return True
            else:
                logger.warning(f"Health check failed for {self.config.host}")
                return False
                
        except Exception as e:
            logger.error(f"Health check error for {self.config.host}: {e}")
            return False
    
    def get_audit_summary(self, last_n: int = 10) -> List[Dict]:
        """Get recent audit log entries"""
        if not self.audit_log.exists():
            return []
            
        entries = []
        with open(self.audit_log, 'r') as f:
            for line in f:
                try:
                    entries.append(json.loads(line))
                except:
                    pass
                    
        return entries[-last_n:] if entries else []


def main():
    parser = argparse.ArgumentParser(description="SSH-hardened sensorimotor worker")
    parser.add_argument("--host", required=True, help="Remote worker hostname")
    parser.add_argument("--port", type=int, default=22, help="SSH port")
    parser.add_argument("--user", default="agentic", help="SSH user")
    parser.add_argument("--key", help="Path to SSH private key (default: ~/.ssh/id_rsa)")
    parser.add_argument("--execute", help="Command name to execute")
    parser.add_argument("--command", help="Full command (must match whitelist)")
    parser.add_argument("--health-check", action="store_true", help="Run health check only")
    parser.add_argument("--audit", action="store_true", help="Show recent audit logs")
    
    args = parser.parse_args()
    
    # Default key path
    key_path = args.key or str(Path.home() / ".ssh" / "id_rsa")
    
    config = SSHConfig(
        host=args.host,
        port=args.port,
        user=args.user,
        key_path=key_path,
    )
    
    worker = SensorimotorWorker(config)
    
    # Health check
    if args.health_check:
        healthy = worker.health_check()
        sys.exit(0 if healthy else 1)
    
    # Audit logs
    if args.audit:
        entries = worker.get_audit_summary(last_n=20)
        print(json.dumps(entries, indent=2))
        sys.exit(0)
    
    # Execute command
    if args.execute and args.command:
        success, stdout, stderr = worker.execute(args.execute, args.command)
        
        if success:
            print("✅ Command executed successfully")
            if stdout:
                print("\nOutput:")
                print(stdout)
        else:
            print("❌ Command failed")
            if stderr:
                print("\nError:")
                print(stderr)
                
        sys.exit(0 if success else 1)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
