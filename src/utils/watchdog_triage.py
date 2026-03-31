#!/usr/bin/env python3

import argparse
import datetime
import json
import os
import sys
import time
from pathlib import Path
from dataclasses import dataclass
from typing import Any, Dict, List, Optional


UTC = datetime.timezone.utc


def _default_telemetry_path() -> str:
    root = Path(__file__).resolve().parents[2]
    return str(root / "src" / ".telemetry" / "watchdog.jsonl")


def _parse_iso(ts: str) -> datetime.datetime:
    if ts.endswith("Z"):
        ts = ts[:-1] + "+00:00"
    dt = datetime.datetime.fromisoformat(ts)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt


def _now(now_iso: str) -> datetime.datetime:
    if not now_iso:
        return datetime.datetime.now(tz=UTC)
    return _parse_iso(now_iso)


@dataclass
class Run:
    label: str
    started_at: datetime.datetime
    ttfo_sec: float
    idle_sec: float
    hard_sec: float
    heartbeat_sec: float
    cmd: List[str]
    first_output_at: Optional[datetime.datetime] = None
    finished_at: Optional[datetime.datetime] = None
    exit_code: Optional[int] = None
    aborted_at: Optional[datetime.datetime] = None
    abort_reason: Optional[str] = None


def _to_float(v: Any) -> float:
    try:
        return float(v)
    except Exception:
        return 0.0


def _load_runs(path: str) -> List[Run]:
    if not os.path.exists(path):
        return []

    runs: List[Run] = []
    active_by_label: Dict[str, Run] = {}

    with open(path, "r", encoding="utf-8") as f:
        for raw in f:
            line = raw.strip()
            if not line:
                continue
            try:
                e = json.loads(line)
            except Exception:
                continue

            ev = str(e.get("event") or "")
            label = str(e.get("label") or "")
            ts_raw = e.get("ts")
            if not isinstance(ts_raw, str) or not ts_raw:
                continue

            try:
                ts = _parse_iso(ts_raw)
            except Exception:
                continue

            if ev == "command_started":
                prev = active_by_label.get(label)
                if prev is not None:
                    runs.append(prev)

                cmd = e.get("cmd")
                if not isinstance(cmd, list):
                    cmd = []

                active_by_label[label] = Run(
                    label=label,
                    started_at=ts,
                    ttfo_sec=_to_float(e.get("ttfo_sec")),
                    idle_sec=_to_float(e.get("idle_sec")),
                    hard_sec=_to_float(e.get("hard_sec")),
                    heartbeat_sec=_to_float(e.get("heartbeat_sec")),
                    cmd=[str(x) for x in cmd],
                )
                continue

            r = active_by_label.get(label)
            if r is None:
                continue

            if ev == "first_output" and r.first_output_at is None:
                r.first_output_at = ts
            elif ev == "command_finished" and r.finished_at is None:
                r.finished_at = ts
                ec = e.get("exit_code")
                if isinstance(ec, int):
                    r.exit_code = ec
                active_by_label.pop(label, None)
                runs.append(r)
            elif ev == "aborted" and r.aborted_at is None:
                r.aborted_at = ts
                reason = e.get("reason")
                if isinstance(reason, str):
                    r.abort_reason = reason
                ec = e.get("exit_code")
                if isinstance(ec, int):
                    r.exit_code = ec
                active_by_label.pop(label, None)
                runs.append(r)

    runs.extend(active_by_label.values())
    runs.sort(key=lambda x: x.started_at)
    return runs


def _pick_run(runs: List[Run], label: str) -> Optional[Run]:
    if not runs:
        return None
    if label:
        filtered = [r for r in runs if r.label == label]
        if not filtered:
            return None
        return filtered[-1]
    return runs[-1]


def _classify(now: datetime.datetime, run: Run) -> Dict[str, Any]:
    elapsed_s = max(0.0, (now - run.started_at).total_seconds())

    if run.aborted_at is not None:
        return {
            "state": "aborted",
            "elapsed_s": elapsed_s,
            "label": run.label,
            "reason": run.abort_reason,
            "exit_code": run.exit_code,
            "next": (
                "Review abort reason; if ttfo_timeout on a chatty command, "
                "tighten scope or add path filter; if hard_timeout, "
                "promote profile or split work."
            ),
        }

    if run.finished_at is not None:
        return {
            "state": "finished",
            "elapsed_s": elapsed_s,
            "label": run.label,
            "exit_code": run.exit_code,
            "next": (
                "Capture a one-line retro and keep budgets stable "
                "unless repeated evidence suggests tuning."
            ),
        }

    if run.first_output_at is not None:
        return {
            "state": "first_output",
            "elapsed_s": elapsed_s,
            "label": run.label,
            "first_output_latency_s": max(
                0.0, (run.first_output_at - run.started_at).total_seconds()
            ),
            "next": (
                "If output later stalls, rely on idle/hard budgets; "
                "if you still never see a terminal event, treat as a breach "
                "and diagnose whether budgets were actually applied."
            ),
        }

    grace_s = 2.0

    if run.ttfo_sec > 0 and elapsed_s >= (run.ttfo_sec + grace_s):
        return {
            "state": "breach_missing_ttfo_abort",
            "elapsed_s": elapsed_s,
            "label": run.label,
            "ttfo_sec": run.ttfo_sec,
            "next": (
                "Expected first_output or ttfo_timeout abort by now. "
                "Most likely not running under watchdog with the "
                "intended budgets "
                "(or looking at the wrong telemetry file)."
            ),
        }

    if run.hard_sec > 0 and elapsed_s >= (run.hard_sec + 5.0):
        return {
            "state": "breach_missing_hard_abort",
            "elapsed_s": elapsed_s,
            "label": run.label,
            "hard_sec": run.hard_sec,
            "next": (
                "Expected command_finished or hard_timeout abort by now. "
                "Treat as protocol breach: stop waiting and verify the "
                "process actually started and the telemetry path is correct."
            ),
        }

    if elapsed_s < 2.0:
        return {
            "state": "starting",
            "elapsed_s": elapsed_s,
            "label": run.label,
            "next": (
                "Wait until >=2s and confirm command_started is present. "
                "If you never see first_output for a chatty command by ttfo, "
                "expect an abort."
            ),
        }

    if elapsed_s < 10.0:
        return {
            "state": "started_no_output",
            "elapsed_s": elapsed_s,
            "label": run.label,
            "next": (
                "If this command should print quickly, expect first_output "
                "by ttfo or a ttfo_timeout abort. Also confirm the terminal "
                "shows watchdog "
                "heartbeats (stderr)."
            ),
        }

    return {
        "state": "started_no_output",
        "elapsed_s": elapsed_s,
        "label": run.label,
        "next": (
            "No output yet. If ttfo is configured, expect abort soon; "
            "otherwise rely on idle/hard budgets. If nothing terminates by "
            "hard_sec, treat as breach."
        ),
    }


def main(argv: List[str]) -> int:
    p = argparse.ArgumentParser(prog="watchdog_triage")
    p.add_argument(
        "--telemetry-jsonl",
        type=str,
        default=_default_telemetry_path(),
    )
    p.add_argument("--label", type=str, default="")
    p.add_argument("--now-iso", type=str, default="")
    p.add_argument("--json", action="store_true")
    p.add_argument("--watch", action="store_true")
    p.add_argument("--interval-sec", type=float, default=5.0)
    p.add_argument("--max-wait-sec", type=float, default=70.0)

    args = p.parse_args(argv)

    watch_started_at = datetime.datetime.now(tz=UTC)

    last_state: Optional[str] = None
    last_started_at: Optional[str] = None

    def emit(out: Dict[str, Any]) -> None:
        nonlocal last_state, last_started_at

        out["telemetry_jsonl"] = args.telemetry_jsonl

        if args.json:
            sys.stdout.write(json.dumps(out, separators=(",", ":")) + "\n")
            sys.stdout.flush()
            last_state = str(out.get("state") or "")
            last_started_at = str(out.get("started_at") or "")
            return

        lines = []
        lines.append(
            f"state={out.get('state')} label={out.get('label')} "
            f"elapsed_s={out.get('elapsed_s')}"
        )
        lines.append(f"telemetry={out.get('telemetry_jsonl')}")
        if "reason" in out and out["reason"]:
            lines.append(f"reason={out['reason']}")
        if "exit_code" in out and out["exit_code"] is not None:
            lines.append(f"exit_code={out['exit_code']}")
        lines.append(f"next={out.get('next')}")
        sys.stdout.write("\n".join(lines) + "\n")
        sys.stdout.flush()
        last_state = str(out.get("state") or "")
        last_started_at = str(out.get("started_at") or "")

    def run_once(now: datetime.datetime) -> int:
        runs = _load_runs(args.telemetry_jsonl)
        run = _pick_run(runs, args.label)

        if run is None:
            out = {
                "state": "not_started",
                "label": args.label,
                "next": (
                    "No command_started found. Likely the run never started "
                    "(not approved/canceled/wrong cwd) or you are reading "
                    "the wrong telemetry file."
                ),
            }
            emit(out)
            return 2

        out = _classify(now, run)
        out["started_at"] = run.started_at.isoformat()
        emit(out)

        state = str(out.get("state") or "")
        if state.startswith("breach"):
            return 3
        if state in ("finished", "aborted"):
            return 0
        return 0

    if not args.watch:
        now = _now(args.now_iso)
        runs = _load_runs(args.telemetry_jsonl)
        run = _pick_run(runs, args.label)

        if run is None:
            out = {
                "state": "not_started",
                "label": args.label,
                "next": (
                    "No command_started found. Likely the run never started "
                    "(not approved/canceled/wrong cwd) or you are reading "
                    "the wrong telemetry file."
                ),
                "telemetry_jsonl": args.telemetry_jsonl,
            }
            if args.json:
                sys.stdout.write(json.dumps(out, separators=(",", ":")) + "\n")
            else:
                msg = (
                    f"state={out['state']} telemetry={out['telemetry_jsonl']}\n"
                    f"next={out['next']}\n"
                )
                sys.stdout.write(msg)
            return 2

        out = _classify(now, run)
        out["telemetry_jsonl"] = args.telemetry_jsonl
        out["started_at"] = run.started_at.isoformat()

        if args.json:
            sys.stdout.write(json.dumps(out, separators=(",", ":")) + "\n")
        else:
            lines = [
                (
                    f"state={out.get('state')} label={out.get('label')} "
                    f"elapsed_s={out.get('elapsed_s')}"
                ),
                f"telemetry={out.get('telemetry_jsonl')}",
            ]
            if "reason" in out and out["reason"]:
                lines.append(f"reason={out['reason']}")
            if "exit_code" in out and out["exit_code"] is not None:
                lines.append(f"exit_code={out['exit_code']}")
            lines.append(f"next={out.get('next')}")
            sys.stdout.write("\n".join(lines) + "\n")

        if str(out.get("state", "")).startswith("breach"):
            return 3
        return 0

    while True:
        now = datetime.datetime.now(tz=UTC)

        elapsed_watch_s = (now - watch_started_at).total_seconds()
        if elapsed_watch_s >= args.max_wait_sec:
            out = {
                "state": "breach_max_wait",
                "label": args.label,
                "elapsed_s": round(elapsed_watch_s, 1),
                "next": (
                    "Exceeded max wait; treat as breach and verify run started "
                    "and budgets were applied."
                ),
            }
            emit(out)
            return 3

        runs = _load_runs(args.telemetry_jsonl)
        run = _pick_run(runs, args.label)
        if run is None:
            if elapsed_watch_s >= 2.0:
                out = {
                    "state": "not_started",
                    "label": args.label,
                    "elapsed_s": round(elapsed_watch_s, 1),
                    "next": (
                        "No command_started found within 2s. Most likely the run "
                        "never started (not approved/canceled/wrong cwd) or you are "
                        "reading the wrong telemetry file."
                    ),
                }
                emit(out)
                return 2
            out = {
                "state": "starting",
                "label": args.label,
                "elapsed_s": round(elapsed_watch_s, 1),
                "next": "Waiting for command_started.",
            }
            if last_state != out["state"]:
                emit(out)
            time.sleep(args.interval_sec)
            continue

        out = _classify(now, run)
        out["started_at"] = run.started_at.isoformat()

        current_state = str(out.get("state") or "")
        current_started_at = str(out.get("started_at") or "")
        if current_state != last_state or current_started_at != last_started_at:
            emit(out)

        if current_state.startswith("breach"):
            return 3
        if current_state in ("finished", "aborted"):
            return 0

        time.sleep(args.interval_sec)


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
