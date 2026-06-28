"""Subprocess command execution for local upgrader."""

import subprocess
from pathlib import Path
from typing import List, Tuple, Union


Command = Union[List[str], str]


def run_cmd(command: Command, cwd: Path, dry_run: bool, timeout_s: int = 180) -> Tuple[bool, str]:
    """Execute a shell command or list of arguments in cwd, returns (success, output)."""
    if dry_run:
        cmd_str = command if isinstance(command, str) else " ".join(command)
        return True, f"[DRY-RUN] {cmd_str}"

    shell = isinstance(command, str)
    try:
        res = subprocess.run(
            command,
            cwd=str(cwd),
            shell=shell,
            capture_output=True,
            text=True,
            timeout=timeout_s,
        )
        success = res.returncode == 0
        output = res.stdout + "\n" + res.stderr
        return success, output
    except Exception as e:
        return False, str(e)
