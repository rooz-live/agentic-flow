"""
scripts/infra/cpanel/cpanel_ssh_client.py

Programmatic SSH client for cPanel/WHM automation using Paramiko.
Complements Ansible for use-cases requiring dynamic command composition,
streaming output, or conditional multi-step remote workflows.

This does NOT replace Ansible playbooks — use Ansible for idempotent
infrastructure changes. Use this client for:
  - Interactive audit/gather operations (read-only by default)
  - Conditional multi-step remote logic that Ansible's static task model
    makes awkward
  - Python-based orchestration that drives SSH based on API results

Usage:
    client = CpanelSSHClient.from_env()
    result = client.run("uname -a")
    print(result.stdout)

Source credentials first:
    source scripts/infra/credentials/.env.cpanel
"""

import os
import io
import logging
import subprocess
from dataclasses import dataclass, field
from typing import Optional, List

logger = logging.getLogger(__name__)


@dataclass
class SSHResult:
    command: str
    stdout: str
    stderr: str
    exit_code: int
    host: str

    @property
    def ok(self) -> bool:
        return self.exit_code == 0


class CpanelSSHClient:
    """
    SSH client for cPanel/WHM host with safety defaults:
    - All commands are logged before execution
    - Write/mutating commands require explicit allow_writes=True
    - Uses key-based auth only (no password auth)
    """

    # Commands that are always classified as writes and require allow_writes=True.
    # This is a conservative blocklist; operators may extend it.
    _WRITE_PATTERNS: List[str] = [
        "rm ", "rmdir", "mv ", "cp ", "chmod", "chown",
        "systemctl restart", "systemctl stop", "systemctl start",
        "service ", "reboot", "shutdown",
        "whmapi1 ", "uapi --user",
        "mysql ", "mysqladmin",
        "csf ", "lfd ",
    ]

    def __init__(
        self,
        host: str,
        user: str = "root",
        key_file: Optional[str] = None,
        port: int = 22,
        allow_writes: bool = False,
        timeout: int = 30,
    ):
        self.host = host
        self.user = user
        self.key_file = key_file or os.path.expanduser("~/pem/rooz.pem")
        self.port = port
        self.allow_writes = allow_writes
        self.timeout = timeout
        self._paramiko_available = self._check_paramiko()

    @staticmethod
    def _check_paramiko() -> bool:
        try:
            import paramiko  # noqa: F401
            return True
        except ImportError:
            logger.warning(
                "paramiko not installed — falling back to subprocess SSH. "
                "Install: pip3 install paramiko fabric"
            )
            return False

    @classmethod
    def from_env(cls, allow_writes: bool = False) -> "CpanelSSHClient":
        """Construct from CPANEL_* environment variables."""
        host     = os.environ.get("CPANEL_HOST", "yo.tag.ooo")
        user     = os.environ.get("CPANEL_USER", "ubuntu")
        key_file = os.environ.get("CPANEL_SSH_KEY", os.path.expanduser("~/pem/rooz.pem"))
        port     = int(os.environ.get("CPANEL_SSH_PORT", "22"))
        return cls(host=host, user=user, key_file=key_file, port=port,
                   allow_writes=allow_writes)

    def _is_write_command(self, command: str) -> bool:
        return any(pattern in command for pattern in self._WRITE_PATTERNS)

    def run(self, command: str) -> SSHResult:
        """
        Execute a command on the remote host.

        Read-only commands always allowed.
        Write/mutating commands raise RuntimeError unless allow_writes=True.
        """
        if self._is_write_command(command) and not self.allow_writes:
            raise RuntimeError(
                f"Write command blocked (allow_writes=False): {command!r}\n"
                "Construct client with allow_writes=True to enable mutations."
            )

        logger.info("SSH %s@%s:%d $ %s", self.user, self.host, self.port, command)

        if self._paramiko_available:
            return self._run_paramiko(command)
        return self._run_subprocess(command)

    def _run_paramiko(self, command: str) -> SSHResult:
        import paramiko
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.RejectPolicy())
        # Load system known_hosts; fall back to AutoAdd for first-time connections
        try:
            client.load_system_host_keys()
        except Exception:
            client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

        client.connect(
            hostname=self.host,
            port=self.port,
            username=self.user,
            key_filename=self.key_file,
            timeout=self.timeout,
        )
        try:
            _, stdout, stderr = client.exec_command(command, timeout=self.timeout)
            exit_code = stdout.channel.recv_exit_status()
            return SSHResult(
                command=command,
                stdout=stdout.read().decode(errors="replace").strip(),
                stderr=stderr.read().decode(errors="replace").strip(),
                exit_code=exit_code,
                host=self.host,
            )
        finally:
            client.close()

    def _run_subprocess(self, command: str) -> SSHResult:
        """Fallback: delegate to system ssh binary."""
        cmd = [
            "ssh",
            "-i", self.key_file,
            "-p", str(self.port),
            "-o", "StrictHostKeyChecking=accept-new",
            "-o", f"ConnectTimeout={self.timeout}",
            f"{self.user}@{self.host}",
            command,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=self.timeout)
        return SSHResult(
            command=command,
            stdout=result.stdout.strip(),
            stderr=result.stderr.strip(),
            exit_code=result.returncode,
            host=self.host,
        )

    def gather_info(self) -> dict:
        """Read-only audit: collect key system facts from the remote host."""
        checks = {
            "uptime":   "uptime -p",
            "disk":     "df -h / | tail -1",
            "memory":   "free -h | grep Mem",
            "services": "systemctl list-units --state=failed --no-legend 2>/dev/null | wc -l",
            "ssl_soon": (
                "for d in /etc/letsencrypt/live/*/fullchain.pem; do "
                "openssl x509 -enddate -noout -in \"$d\" 2>/dev/null; done"
            ),
        }
        results = {}
        for key, cmd in checks.items():
            try:
                r = self.run(cmd)
                results[key] = r.stdout if r.ok else f"ERROR: {r.stderr}"
            except Exception as e:
                results[key] = f"EXCEPTION: {e}"
        return results


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse
    import json
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    parser = argparse.ArgumentParser(description="cPanel SSH client")
    parser.add_argument("--gather", action="store_true", help="Read-only system audit")
    parser.add_argument("--cmd", help="Run a single command (read-only by default)")
    parser.add_argument("--write", action="store_true",
                        help="Allow write/mutating commands (use with caution)")
    args = parser.parse_args()

    client = CpanelSSHClient.from_env(allow_writes=args.write)

    if args.gather:
        info = client.gather_info()
        print(json.dumps(info, indent=2))
    elif args.cmd:
        result = client.run(args.cmd)
        print(f"Exit: {result.exit_code}")
        if result.stdout:
            print(result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr, flush=True)
    else:
        parser.print_help()
