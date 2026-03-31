#!/usr/bin/env python3

import argparse
import datetime
import json
import os
import re
import selectors
import subprocess
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple


UTC = datetime.timezone.utc


def _emit_pattern_event(
    pattern_name: str,
    data: Dict[str, Any],
    *,
    gate: str,
    behavioral_type: str,
    run_type: str,
) -> None:
    try:
        root = _repo_root()
        os.environ.setdefault("PROJECT_ROOT", str(root))
        scripts_dir = str(root / "scripts")
        if scripts_dir not in sys.path:
            sys.path.insert(0, scripts_dir)

        from agentic.pattern_logger import PatternLogger  # type: ignore

        circle = os.environ.get("AF_CIRCLE") or "governance"
        mode = os.environ.get("AF_PROD_CYCLE_MODE") or "advisory"
        depth_raw = os.environ.get("AF_DEPTH")
        depth: Optional[int]
        try:
            depth = int(depth_raw) if depth_raw is not None else None
        except Exception:
            depth = None

        correlation_id = (
            os.environ.get("AF_CORRELATION_ID")
            or os.environ.get("AF_RUN_ID")
            or None
        )

        logger = PatternLogger(
            mode=mode,
            circle=circle,
            depth=depth,
            correlation_id=correlation_id,
        )

        logger.log(
            pattern_name,
            data,
            gate=gate,
            behavioral_type=behavioral_type,
            run_type=run_type,
        )
    except Exception:
        return


def _utc_iso(ts: Optional[float] = None) -> str:
    if ts is None:
        ts = time.time()
    dt = datetime.datetime.fromtimestamp(ts, tz=UTC)
    return dt.isoformat()


def _sanitize_token(s: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_.-]+", "_", s)


def _ensure_parent(path: str) -> None:
    parent = os.path.dirname(os.path.abspath(path))
    if parent:
        os.makedirs(parent, exist_ok=True)


def _append_jsonl(path: str, obj: Dict[str, Any]) -> None:
    _ensure_parent(path)
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(obj, separators=(",", ":"), ensure_ascii=False))
        f.write("\n")


def _read_json(path: str) -> Dict[str, Any]:
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def _write_json(path: str, obj: Dict[str, Any]) -> None:
    _ensure_parent(path)
    with open(path, "w", encoding="utf-8") as f:
        f.write(json.dumps(obj, separators=(",", ":"), ensure_ascii=False))
        f.write("\n")


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _parse_args(argv: Sequence[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(prog="provider_run")

    p.add_argument("--provider", type=str, required=True)
    p.add_argument("--where", type=str, default="cli")

    p.add_argument("--label", type=str, default="")
    p.add_argument("--evidence-dir", type=str, default="")

    p.add_argument("--events-jsonl", type=str, default="")
    p.add_argument("--circuit-json", type=str, default="")

    p.add_argument("--ttfo-sec", type=float, default=-1.0)
    p.add_argument("--idle-sec", type=float, default=-1.0)
    p.add_argument("--hard-sec", type=float, default=-1.0)
    p.add_argument("--heartbeat-sec", type=float, default=-1.0)

    p.add_argument("--max-failures", type=int, default=3)
    p.add_argument("--window-sec", type=int, default=300)
    p.add_argument("--open-ttl-sec", type=int, default=600)
    p.add_argument("--force", action="store_true")

    p.add_argument("--cwd", type=str, default="")

    p.add_argument("cmd", nargs=argparse.REMAINDER)

    args = p.parse_args(list(argv))

    if not args.cmd or args.cmd[0] != "--":
        raise SystemExit("provider_run: expected command after --")

    args.cmd = args.cmd[1:]
    if not args.cmd:
        raise SystemExit("provider_run: missing command after --")

    return args


def _env_float(name: str, default: float) -> float:
    v = os.environ.get(name)
    if v is None or v == "":
        return default
    try:
        return float(v)
    except Exception:
        return default


def _tail_bytes(buf: bytes, max_bytes: int) -> bytes:
    if len(buf) <= max_bytes:
        return buf
    return buf[-max_bytes:]


def _extract_watchdog_result(
    telemetry_jsonl: str,
    label: str,
) -> Tuple[Optional[str], Optional[int], Optional[float]]:
    abort_reason: Optional[str] = None
    exit_code: Optional[int] = None
    duration_s: Optional[float] = None

    if not telemetry_jsonl or not os.path.exists(telemetry_jsonl):
        return abort_reason, exit_code, duration_s

    with open(telemetry_jsonl, "r", encoding="utf-8") as f:
        for raw in f:
            line = raw.strip()
            if not line:
                continue
            try:
                e = json.loads(line)
            except Exception:
                continue
            if str(e.get("label") or "") != label:
                continue
            ev = str(e.get("event") or "")
            if ev == "aborted":
                r = e.get("reason")
                if isinstance(r, str):
                    abort_reason = r
                ec = e.get("exit_code")
                if isinstance(ec, int):
                    exit_code = ec
                ds = e.get("duration_s")
                if isinstance(ds, (int, float)):
                    duration_s = float(ds)
            elif ev == "command_finished":
                ec = e.get("exit_code")
                if isinstance(ec, int):
                    exit_code = ec
                ds = e.get("duration_s")
                if isinstance(ds, (int, float)):
                    duration_s = float(ds)

    return abort_reason, exit_code, duration_s


def _classify_failure(abort_reason: Optional[str], stderr_tail: str) -> str:
    if abort_reason in ("ttfo_timeout", "idle_timeout", "hard_timeout"):
        return "provider_timeout"
    if abort_reason == "failed_to_start":
        return "provider_misconfigured"

    s = stderr_tail or ""

    if re.search(
        r"CERTIFICATE_VERIFY_FAILED|certificate verify failed|tls|SSL",
        s,
        flags=re.IGNORECASE,
    ):
        return "provider_tls_error"

    if re.search(
        (
            r"ENOTFOUND|ECONNREFUSED|EHOSTUNREACH|"
            r"No route to host|Name or service not known"
        ),
        s,
        flags=re.IGNORECASE,
    ):
        return "provider_unreachable"

    if re.search(
        r"command not found|No such file or directory",
        s,
        flags=re.IGNORECASE,
    ):
        return "provider_misconfigured"

    return "provider_internal_error"


def _circuit_state_path(args: argparse.Namespace, root: Path) -> str:
    if args.circuit_json:
        return args.circuit_json
    return str(
        root
        / "src"
        / ".telemetry"
        / "provider_circuit.json"
    )


def _events_path(args: argparse.Namespace, root: Path) -> str:
    if args.events_jsonl:
        return args.events_jsonl
    return str(
        root
        / "src"
        / ".telemetry"
        / "provider_events.jsonl"
    )


def _now_epoch() -> float:
    return time.time()


def _load_provider_state(path: str) -> Dict[str, Any]:
    state = _read_json(path)
    if not isinstance(state, dict):
        return {}
    return state


def _get_provider_entry(
    state: Dict[str, Any],
    provider: str,
) -> Dict[str, Any]:
    v = state.get(provider)
    if not isinstance(v, dict):
        v = {}
    if not isinstance(v.get("failures"), list):
        v["failures"] = []
    if not isinstance(v.get("open_until"), (int, float)):
        v["open_until"] = 0.0
    if not isinstance(v.get("last_failure_class"), str):
        v["last_failure_class"] = ""
    return v


def _prune_failures(
    failures: List[Any],
    now: float,
    window_sec: int,
) -> List[float]:
    out: List[float] = []
    for x in failures:
        try:
            t = float(x)
        except Exception:
            continue
        if (now - t) <= float(window_sec):
            out.append(t)
    return out


def _write_provider_state(path: str, state: Dict[str, Any]) -> None:
    _write_json(path, state)


def _emit_provider_event(
    events_jsonl: str,
    event_obj: Dict[str, Any],
) -> None:
    _append_jsonl(events_jsonl, event_obj)


def _run_watchdog(
    root: Path,
    label: str,
    cwd: str,
    ttfo_sec: float,
    idle_sec: float,
    hard_sec: float,
    heartbeat_sec: float,
    telemetry_jsonl: str,
    status_json: str,
    cmd: List[str],
) -> Tuple[int, str]:
    wd_py = root / "src" / "utils" / "watchdog_run.py"
    if not wd_py.exists():
        raise SystemExit(f"provider_run: watchdog_run.py not found at {wd_py}")

    wd_cmd = [
        sys.executable,
        str(wd_py),
        "--label",
        label,
        "--ttfo-sec",
        str(ttfo_sec),
        "--idle-sec",
        str(idle_sec),
        "--hard-sec",
        str(hard_sec),
        "--heartbeat-sec",
        str(heartbeat_sec),
        "--telemetry-mirror-jsonl",
        telemetry_jsonl,
        "--status-json",
        status_json,
        "--cwd",
        cwd,
        "--",
    ] + cmd

    proc = subprocess.Popen(
        wd_cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )

    sel = selectors.DefaultSelector()
    assert proc.stdout is not None
    assert proc.stderr is not None

    sel.register(proc.stdout, selectors.EVENT_READ, data=sys.stdout.buffer)
    sel.register(proc.stderr, selectors.EVENT_READ, data=sys.stderr.buffer)

    stderr_buf = b""

    try:
        while True:
            events = sel.select(timeout=1.0)
            if not events:
                if proc.poll() is not None:
                    break
                continue

            for key, _mask in events:
                try:
                    chunk = os.read(key.fileobj.fileno(), 4096)
                except OSError:
                    chunk = b""

                if not chunk:
                    try:
                        sel.unregister(key.fileobj)
                    except Exception:
                        pass
                    continue

                key.data.write(chunk)
                key.data.flush()

                if key.data is sys.stderr.buffer:
                    stderr_buf = _tail_bytes(stderr_buf + chunk, 2048)

            if proc.poll() is not None and not sel.get_map():
                break

    finally:
        try:
            sel.close()
        except Exception:
            pass

    rc = proc.wait()
    return rc, stderr_buf.decode("utf-8", errors="replace")


def main(argv: Sequence[str]) -> int:
    args = _parse_args(argv)

    root = _repo_root()
    provider = str(args.provider)
    where = str(args.where)

    run_tag = datetime.datetime.now(tz=UTC).strftime("%Y%m%dT%H%M%SZ")

    if args.evidence_dir:
        evidence_dir = args.evidence_dir
    else:
        safe_provider = _sanitize_token(provider)
        evidence_dir = str(
            root
            / "src"
            / ".telemetry"
            / "providers"
            / safe_provider
            / run_tag
        )

    os.makedirs(evidence_dir, exist_ok=True)

    if args.label:
        label = args.label
    else:
        raw_label = f"provider__{provider}__{run_tag}__{os.getpid()}"
        label = _sanitize_token(raw_label)

    telemetry_jsonl = os.path.join(evidence_dir, f"{label}.jsonl")
    status_json = os.path.join(evidence_dir, f"{label}_status.json")

    events_jsonl = _events_path(args, root)
    circuit_json = _circuit_state_path(args, root)

    now = _now_epoch()

    state = _load_provider_state(circuit_json)
    entry = _get_provider_entry(state, provider)

    failures = _prune_failures(
        entry.get("failures") or [],
        now,
        args.window_sec,
    )
    open_until = float(entry.get("open_until") or 0.0)

    entry["failures"] = failures

    if (not args.force) and open_until > now:
        cooldown_sec = int(max(0.0, open_until - now))
        last_fc = str(entry.get("last_failure_class") or "provider_timeout")
        out = {
            "ts": _utc_iso(),
            "event": "provider_offline",
            "provider": provider,
            "where": where,
            "failure_class": last_fc,
            "command_or_endpoint": args.cmd,
            "exit_code": None,
            "stderr_tail": "",
            "retry_count": len(failures),
            "cooldown_sec": cooldown_sec,
            "circuit_state": "open",
            "offline_mode": True,
            "evidence": {
                "watchdog_label": label,
                "evidence_dir": evidence_dir,
            },
        }
        _emit_provider_event(events_jsonl, out)
        _emit_pattern_event(
            "provider_offline",
            {
                "action": "offline",
                "reason": last_fc,
                "action_completed": False,
                "tags": ["Federation", "provider", provider],
                "provider": provider,
                "where": where,
                "failure_class": last_fc,
                "command_or_endpoint": args.cmd,
                "exit_code": None,
                "stderr_tail": "",
                "retry_count": len(failures),
                "cooldown_sec": cooldown_sec,
                "circuit_state": "open",
                "offline_mode": True,
                "watchdog_label": label,
                "evidence_dir": evidence_dir,
                "duration_ms": 0,
                "duration_measured": True,
            },
            gate="providers",
            behavioral_type="observability",
            run_type="provider-run",
        )
        state[provider] = entry
        _write_provider_state(circuit_json, state)
        msg = (
            "[provider/run] offline "
            f"provider={provider} cooldown_sec={cooldown_sec} "
            f"evidence_dir={evidence_dir} label={label}\n"
        )
        sys.stderr.write(msg)
        sys.stderr.flush()
        return 2

    ttfo_sec = (
        args.ttfo_sec
        if args.ttfo_sec >= 0
        else _env_float("AF_WD_TTFO_SEC", 30.0)
    )
    idle_sec = (
        args.idle_sec
        if args.idle_sec >= 0
        else _env_float("AF_WD_IDLE_SEC", 180.0)
    )
    hard_sec = (
        args.hard_sec
        if args.hard_sec >= 0
        else _env_float("AF_WD_HARD_SEC", 1800.0)
    )
    heartbeat_sec = (
        args.heartbeat_sec
        if args.heartbeat_sec >= 0
        else _env_float("AF_WD_HEARTBEAT_SEC", 5.0)
    )

    cwd = args.cwd or str(root)

    msg = (
        "[provider/run] start "
        f"provider={provider} evidence_dir={evidence_dir} label={label}\n"
    )
    sys.stderr.write(msg)
    sys.stderr.flush()

    rc, stderr_tail = _run_watchdog(
        root=root,
        label=label,
        cwd=cwd,
        ttfo_sec=ttfo_sec,
        idle_sec=idle_sec,
        hard_sec=hard_sec,
        heartbeat_sec=heartbeat_sec,
        telemetry_jsonl=telemetry_jsonl,
        status_json=status_json,
        cmd=[str(x) for x in args.cmd],
    )

    abort_reason, exit_code, duration_s = _extract_watchdog_result(
        telemetry_jsonl,
        label,
    )

    if exit_code is None:
        exit_code = rc

    if exit_code == 0 and abort_reason is None:
        entry["failures"] = []
        entry["open_until"] = 0.0
        entry["last_failure_class"] = ""
        state[provider] = entry
        _write_provider_state(circuit_json, state)

        stderr_tail_str = _tail_bytes(
            stderr_tail.encode("utf-8", errors="replace"),
            2048,
        ).decode("utf-8", errors="replace")

        out = {
            "ts": _utc_iso(),
            "event": "provider_success",
            "provider": provider,
            "where": where,
            "failure_class": "",
            "command_or_endpoint": args.cmd,
            "exit_code": int(exit_code),
            "stderr_tail": stderr_tail_str,
            "retry_count": 0,
            "cooldown_sec": 0,
            "circuit_state": "closed",
            "offline_mode": False,
            "duration_s": duration_s,
            "evidence": {
                "watchdog_label": label,
                "evidence_dir": evidence_dir,
            },
        }
        _emit_provider_event(events_jsonl, out)
        _emit_pattern_event(
            "provider_success",
            {
                "action": "probe",
                "reason": "",
                "action_completed": True,
                "tags": ["Federation", "provider", provider],
                "provider": provider,
                "where": where,
                "failure_class": "",
                "command_or_endpoint": args.cmd,
                "exit_code": int(exit_code),
                "stderr_tail": stderr_tail_str,
                "retry_count": 0,
                "cooldown_sec": 0,
                "circuit_state": "closed",
                "offline_mode": False,
                "watchdog_label": label,
                "evidence_dir": evidence_dir,
                "duration_ms": (
                    int(duration_s * 1000)
                    if isinstance(duration_s, (int, float))
                    else None
                ),
                "duration_measured": isinstance(duration_s, (int, float)),
            },
            gate="providers",
            behavioral_type="observability",
            run_type="provider-run",
        )
        return 0

    failure_class = _classify_failure(abort_reason, stderr_tail)

    failures = _prune_failures(
        (entry.get("failures") or []) + [now],
        now,
        args.window_sec,
    )
    entry["failures"] = failures
    entry["last_failure_class"] = failure_class

    circuit_state = "closed"
    cooldown_sec = 0

    if len(failures) >= int(args.max_failures):
        entry["open_until"] = now + float(args.open_ttl_sec)
        circuit_state = "open"
        cooldown_sec = int(args.open_ttl_sec)
    else:
        entry["open_until"] = float(entry.get("open_until") or 0.0)

    state[provider] = entry
    _write_provider_state(circuit_json, state)

    stderr_tail_str = _tail_bytes(
        stderr_tail.encode("utf-8", errors="replace"),
        2048,
    ).decode("utf-8", errors="replace")

    out = {
        "ts": _utc_iso(),
        "event": "provider_failure",
        "provider": provider,
        "where": where,
        "failure_class": failure_class,
        "command_or_endpoint": args.cmd,
        "exit_code": (
            int(exit_code)
            if isinstance(exit_code, int)
            else exit_code
        ),
        "stderr_tail": stderr_tail_str,
        "retry_count": len(failures),
        "cooldown_sec": cooldown_sec,
        "circuit_state": circuit_state,
        "offline_mode": False,
        "abort_reason": abort_reason,
        "duration_s": duration_s,
        "evidence": {
            "watchdog_label": label,
            "evidence_dir": evidence_dir,
        },
    }
    _emit_provider_event(events_jsonl, out)

    _emit_pattern_event(
        "provider_failure",
        {
            "action": "probe",
            "reason": failure_class,
            "action_completed": False,
            "tags": ["Federation", "provider", provider],
            "provider": provider,
            "where": where,
            "failure_class": failure_class,
            "command_or_endpoint": args.cmd,
            "exit_code": exit_code,
            "stderr_tail": stderr_tail_str,
            "retry_count": len(failures),
            "cooldown_sec": cooldown_sec,
            "circuit_state": circuit_state,
            "offline_mode": False,
            "abort_reason": abort_reason,
            "watchdog_label": label,
            "evidence_dir": evidence_dir,
            "duration_ms": (
                int(duration_s * 1000)
                if isinstance(duration_s, (int, float))
                else None
            ),
            "duration_measured": isinstance(duration_s, (int, float)),
        },
        gate="providers",
        behavioral_type="observability",
        run_type="provider-run",
    )

    return int(exit_code) if isinstance(exit_code, int) else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
