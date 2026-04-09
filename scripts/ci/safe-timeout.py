#!/usr/bin/env python3
"""
safe-timeout.py
A cross-platform timeout wrapper that correctly handles bash SIGALRM proxy limitations.
Replaces brittle `perl -e "alarm X"` by spawning processes in a new session group and 
issuing SIGKILL to the entire process group upon timeout, ensuring no zombies are orphaned.
Usage: safe-timeout.py <seconds> <command> [args...]
"""
import sys
import subprocess
import os
import signal

if len(sys.argv) < 3:
    print(f"Usage: {sys.argv[0]} <timeout_seconds> <command> [args...]", file=sys.stderr)
    sys.exit(1)

timeout_sec = int(sys.argv[1])
cmd_args = sys.argv[2:]

try:
    # Use preexec_fn=os.setsid to detach and create a new process group.
    # This prevents signals to the parent from being incorrectly routed 
    # and allows us to kill the whole tree cleanly.
    process = subprocess.Popen(cmd_args, preexec_fn=os.setsid)
    process.communicate(timeout=timeout_sec)
    sys.exit(process.returncode)
except subprocess.TimeoutExpired:
    print(f"[safe-timeout.py] Process timed out after {timeout_sec}s. Terminating process group...", file=sys.stderr)
    try:
        os.killpg(os.getpgid(process.pid), signal.SIGTERM)
        process.communicate(timeout=2)
    except Exception:
        # Hard kill if it refuses to die
        os.killpg(os.getpgid(process.pid), signal.SIGKILL)
    # 124 is the standard exit code for GNU timeout when a timeout occurs
    sys.exit(124)
