#!/usr/bin/env python3

import argparse
import datetime
import json
import os
import selectors
import subprocess
import sys
import time
from typing import Any, Dict, Optional, Sequence


def _utc_iso(ts: Optional[float] = None) -> str:
    if ts is None:
        ts = time.time()
    dt = datetime.datetime.fromtimestamp(ts, tz=datetime.timezone.utc)
    return dt.isoformat()


def _ensure_parent(path: str) -> None:
    parent = os.path.dirname(os.path.abspath(path))
    if parent:
        os.makedirs(parent, exist_ok=True)


def _append_jsonl(path: str, obj: Dict[str, Any]) -> None:
    _ensure_parent(path)
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(obj, separators=(",", ":"), ensure_ascii=False))
        f.write("\n")


def _write_status_json(path: str, obj: Dict[str, Any]) -> None:
    _ensure_parent(path)
    with open(path, "w", encoding="utf-8") as f:
        f.write(json.dumps(obj, separators=(",", ":"), ensure_ascii=False))
        f.write("\n")


def _parse_args(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(prog="watchdog_run")

    parser.add_argument("--ttfo-sec", type=float, default=0.0)
    parser.add_argument("--idle-sec", type=float, default=0.0)
    parser.add_argument("--hard-sec", type=float, default=0.0)
    parser.add_argument("--heartbeat-sec", type=float, default=0.0)

    parser.add_argument("--label", type=str, default="")
    parser.add_argument("--telemetry-jsonl", type=str, default="")
    parser.add_argument("--telemetry-mirror-jsonl", type=str, default="")
    parser.add_argument("--status-json", type=str, default="")

    parser.add_argument("--cwd", type=str, default="")

    parser.add_argument("--fallback", type=str, default="")
    parser.add_argument("--return-fallback-exit-code", action="store_true")

    parser.add_argument("cmd", nargs=argparse.REMAINDER)

    args = parser.parse_args(list(argv))

    if not args.cmd or args.cmd[0] != "--":
        raise SystemExit("watchdog_run: expected command after --")

    args.cmd = args.cmd[1:]
    if not args.cmd:
        raise SystemExit("watchdog_run: missing command after --")

    return args


def _emit(
    telemetry_jsonl: str,
    telemetry_mirror_jsonl: str,
    status_json: str,
    obj: Dict[str, Any],
) -> None:
    any_requested = bool(
        telemetry_jsonl
        or telemetry_mirror_jsonl
        or status_json
    )
    any_written = False

    if telemetry_jsonl:
        try:
            _append_jsonl(telemetry_jsonl, obj)
            any_written = True
        except Exception as e:
            sys.stderr.write(
                "[watchdog] telemetry_write_failed "
                f"path={telemetry_jsonl} error={repr(e)}\n"
            )
            sys.stderr.flush()

    if telemetry_mirror_jsonl and telemetry_mirror_jsonl != telemetry_jsonl:
        try:
            _append_jsonl(telemetry_mirror_jsonl, obj)
            any_written = True
        except Exception as e:
            sys.stderr.write(
                "[watchdog] telemetry_write_failed "
                f"path={telemetry_mirror_jsonl} error={repr(e)}\n"
            )
            sys.stderr.flush()

    if status_json:
        try:
            _write_status_json(status_json, obj)
            any_written = True
        except Exception as e:
            sys.stderr.write(
                "[watchdog] telemetry_write_failed "
                f"path={status_json} error={repr(e)}\n"
            )
            sys.stderr.flush()

    if any_requested and not any_written:
        raise SystemExit(
            "watchdog_run: failed to write any telemetry/status outputs"
        )


def _heartbeat_line(label: str, elapsed_s: float, no_output_s: float) -> str:
    lbl = f" label={label}" if label else ""
    msg = (
        f"[watchdog] heartbeat{lbl} "
        f"elapsed_s={elapsed_s:.1f} "
        f"no_output_s={no_output_s:.1f}\n"
    )
    return msg


def _run_fallback(
    fallback: str,
    label: str,
    telemetry_jsonl: str,
    telemetry_mirror_jsonl: str,
    status_json: str,
) -> int:
    started = time.monotonic()
    _emit(
        telemetry_jsonl,
        telemetry_mirror_jsonl,
        status_json,
        {
            "ts": _utc_iso(),
            "event": "fallback_started",
            "label": label,
            "fallback": fallback,
        },
    )

    try:
        proc = subprocess.Popen(fallback, shell=True)
        rc = proc.wait()
    except Exception as e:
        _emit(
            telemetry_jsonl,
            telemetry_mirror_jsonl,
            status_json,
            {
                "ts": _utc_iso(),
                "event": "fallback_failed_to_start",
                "label": label,
                "fallback": fallback,
                "error": repr(e),
            },
        )
        return 1

    dur_s = time.monotonic() - started
    _emit(
        telemetry_jsonl,
        telemetry_mirror_jsonl,
        status_json,
        {
            "ts": _utc_iso(),
            "event": "fallback_finished",
            "label": label,
            "fallback": fallback,
            "exit_code": rc,
            "duration_s": dur_s,
        },
    )

    return rc


def main(argv: Sequence[str]) -> int:
    args = _parse_args(argv)

    label = args.label
    cmd = list(args.cmd)

    start = time.monotonic()
    last_output = start
    last_heartbeat = 0.0
    first_output_time: Optional[float] = None

    abort_reason: Optional[str] = None
    used_kill = False

    _emit(
        args.telemetry_jsonl,
        args.telemetry_mirror_jsonl,
        args.status_json,
        {
            "ts": _utc_iso(),
            "event": "command_started",
            "label": label,
            "cmd": cmd,
            "cwd": (args.cwd or os.getcwd()),
            "ttfo_sec": args.ttfo_sec,
            "idle_sec": args.idle_sec,
            "hard_sec": args.hard_sec,
            "heartbeat_sec": args.heartbeat_sec,
        },
    )

    try:
        proc = subprocess.Popen(
            cmd,
            cwd=(args.cwd or None),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
    except Exception as e:
        dur_s = time.monotonic() - start
        _emit(
            args.telemetry_jsonl,
            args.telemetry_mirror_jsonl,
            args.status_json,
            {
                "ts": _utc_iso(),
                "event": "aborted",
                "label": label,
                "reason": "failed_to_start",
                "error": repr(e),
                "duration_s": dur_s,
                "exit_code": 1,
            },
        )
        return 1

    sel = selectors.DefaultSelector()
    assert proc.stdout is not None
    assert proc.stderr is not None
    sel.register(proc.stdout, selectors.EVENT_READ, data=sys.stdout.buffer)
    sel.register(proc.stderr, selectors.EVENT_READ, data=sys.stderr.buffer)

    try:
        while True:
            now = time.monotonic()

            if args.hard_sec > 0 and (now - start) >= args.hard_sec:
                abort_reason = "hard_timeout"
                break

            if (
                first_output_time is None
                and args.ttfo_sec > 0
                and (now - start) >= args.ttfo_sec
            ):
                abort_reason = "ttfo_timeout"
                break

            if (
                first_output_time is not None
                and args.idle_sec > 0
                and (now - last_output) >= args.idle_sec
            ):
                abort_reason = "idle_timeout"
                break

            timeout = 1.0
            events = sel.select(timeout=timeout)

            if not events:
                now = time.monotonic()
                if (
                    args.heartbeat_sec > 0
                    and (now - last_output) >= args.heartbeat_sec
                ):
                    if (now - last_heartbeat) >= args.heartbeat_sec:
                        hb = _heartbeat_line(
                            label,
                            now - start,
                            now - last_output,
                        )
                        sys.stderr.write(hb)
                        sys.stderr.flush()
                        last_heartbeat = now
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

                now = time.monotonic()
                if first_output_time is None:
                    first_output_time = now
                    _emit(
                        args.telemetry_jsonl,
                        args.telemetry_mirror_jsonl,
                        args.status_json,
                        {
                            "ts": _utc_iso(),
                            "event": "first_output",
                            "label": label,
                            "first_output_latency_ms": int(
                                (first_output_time - start) * 1000
                            ),
                        },
                    )

                last_output = now

            if proc.poll() is not None and not sel.get_map():
                break

    finally:
        try:
            sel.close()
        except Exception:
            pass

    if abort_reason is not None:
        _emit(
            args.telemetry_jsonl,
            args.telemetry_mirror_jsonl,
            args.status_json,
            {
                "ts": _utc_iso(),
                "event": "aborting",
                "label": label,
                "reason": abort_reason,
            },
        )

        try:
            proc.terminate()
            proc.wait(timeout=5)
        except Exception:
            try:
                proc.kill()
                used_kill = True
            except Exception:
                pass

        if used_kill:
            exit_code = 137
        else:
            exit_code = 124

        dur_s = time.monotonic() - start
        _emit(
            args.telemetry_jsonl,
            args.telemetry_mirror_jsonl,
            args.status_json,
            {
                "ts": _utc_iso(),
                "event": "aborted",
                "label": label,
                "reason": abort_reason,
                "duration_s": dur_s,
                "exit_code": exit_code,
            },
        )

        if args.fallback:
            fallback_rc = _run_fallback(
                args.fallback,
                label,
                args.telemetry_jsonl,
                args.telemetry_mirror_jsonl,
                args.status_json,
            )
            _emit(
                args.telemetry_jsonl,
                args.telemetry_mirror_jsonl,
                args.status_json,
                {
                    "ts": _utc_iso(),
                    "event": "fallback_used",
                    "label": label,
                    "fallback": args.fallback,
                    "fallback_exit_code": fallback_rc,
                },
            )

            if args.return_fallback_exit_code:
                return fallback_rc

        return exit_code

    rc = proc.wait()
    dur_s = time.monotonic() - start

    _emit(
        args.telemetry_jsonl,
        args.telemetry_mirror_jsonl,
        args.status_json,
        {
            "ts": _utc_iso(),
            "event": "command_finished",
            "label": label,
            "exit_code": rc,
            "duration_s": dur_s,
        },
    )

    return rc


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
