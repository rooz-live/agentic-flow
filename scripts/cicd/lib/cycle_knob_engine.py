#!/usr/bin/env python3
"""Per-cycle knob auto-adjustment for CLS (FA / SA modes)."""
from __future__ import annotations

import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError:
    yaml = None  # type: ignore

SCHEMA = "cls.cycle_knobs.v1"
KNOB_KEYS = (
    "sweet_spot_ticks",
    "max_ticks_per_session",
    "max_minutes_per_tick",
    "max_remediate_retries",
)
BOUNDS = {
    "sweet_spot_ticks": (2, 5),
    "max_ticks_per_session": (3, 9),
    "max_minutes_per_tick": (20, 60),
    "max_remediate_retries": (1, 4),
}
DOCUMENTED_SWEET_SPOT = 3


def repo_root() -> Path:
    env = os.environ.get("REPO_ROOT")
    if env:
        return Path(env)
    return Path(__file__).resolve().parents[3]


def loop_prompts_path(root: Path) -> Path:
    return root / "config" / "cicd" / "loop_prompts.yaml"


def overlay_path(root: Path) -> Path:
    return root / ".goalie" / "cron_state" / "cycle_knobs.json"


def session_stamp_path(root: Path) -> Path:
    return root / ".goalie" / "cron_state" / "cycle_knobs.session"


def _session_id() -> str:
    return os.environ.get("CYCLE_SESSION_ID") or str(os.getpid())


def _is_ci_env() -> bool:
    env = os.environ
    return str(env.get("CI", "")).lower() in ("1", "true", "yes") or "GITHUB_ACTIONS" in env


def _allow_unsigned_overlay() -> bool:
    """CYCLE_ALLOW_UNSIGNED_OVERLAY is honored only in CI (not local dev)."""
    if os.environ.get("CYCLE_ALLOW_UNSIGNED_OVERLAY", "0") != "1":
        return False
    return _is_ci_env()


def write_session_stamp(root: Path, *, overlay: Path | None = None) -> Path:
    stamp_path = session_stamp_path(root)
    stamp_path.parent.mkdir(parents=True, exist_ok=True)
    rel_overlay = ""
    if overlay is not None:
        try:
            rel_overlay = str(overlay.relative_to(root))
        except ValueError:
            rel_overlay = str(overlay)
    doc = {
        "applied_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "session_id": _session_id(),
        "overlay_path": rel_overlay or ".goalie/cron_state/cycle_knobs.json",
        "git_head": _git_head(root),
    }
    stamp_path.write_text(json.dumps(doc, indent=2) + "\n", encoding="utf-8")
    return stamp_path


def _overlay_session_fresh(root: Path) -> bool:
    """Unsigned overlay trusted only when applied in the same session (stamp match)."""
    stamp_path = session_stamp_path(root)
    if not stamp_path.is_file():
        return False
    try:
        stamp = json.loads(stamp_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return False
    if stamp.get("session_id") != _session_id():
        return False
    gh = _git_head(root)
    stamp_head = stamp.get("git_head")
    if gh and stamp_head and stamp_head != gh:
        return False
    return True


def _git_head(root: Path) -> str:
    try:
        return subprocess.check_output(
            ["git", "-C", str(root), "rev-parse", "HEAD"], text=True, timeout=10,
        ).strip()
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired, OSError):
        return ""


def _overlay_enforce_signature(root: Path | None = None) -> bool:
    is_ci = _is_ci_env()
    is_precommit = os.environ.get("AF_GATE_CONTEXT") == "precommit"
    root = root or repo_root()
    allowed = root / ".goalie" / "scorecards" / "allowed_signers"
    local_allowed = root / ".goalie" / "scorecards" / "allowed_signers.local"
    return is_ci or is_precommit or allowed.is_file() or local_allowed.is_file()


def _verify_overlay_signature(doc: dict[str, Any], root: Path) -> bool:
    sig = doc.get("signature")
    principal = doc.get("principal")
    gh = doc.get("git_head")
    if not sig or not principal or not gh:
        return False
    try:
        from scripts.gates.scorecard_gate import get_allowed_signers_db, verify_ssh_signature
    except ImportError:
        return False
    allowed = get_allowed_signers_db(dict(os.environ), str(root))
    if not os.path.exists(allowed):
        return False
    return verify_ssh_signature(sig, principal, gh, allowed)


def overlay_trusted(doc: dict[str, Any], root: Path | None = None) -> bool:
    root = root or repo_root()
    if _allow_unsigned_overlay():
        return True
    if _verify_overlay_signature(doc, root):
        return True
    if _overlay_enforce_signature(root):
        return False
    # Local dev: honor unsigned overlay only when session stamp matches (same apply session).
    return _overlay_session_fresh(root)


def _clamp(key: str, val: int) -> int:
    lo, hi = BOUNDS[key]
    return max(lo, min(hi, int(val)))


def _load_yaml_cfg(root: Path) -> dict[str, Any]:
    path = loop_prompts_path(root)
    if not path.is_file() or yaml is None:
        return {}
    return yaml.safe_load(path.read_text(encoding="utf-8")) or {}


def default_knobs(root: Path | None = None) -> dict[str, int]:
    root = root or repo_root()
    cfg = _load_yaml_cfg(root)
    budget = cfg.get("budget") or {}
    session = budget.get("session") or {}
    return {
        "sweet_spot_ticks": int(session.get("sweet_spot_ticks", DOCUMENTED_SWEET_SPOT)),
        "max_ticks_per_session": int(session.get("max_ticks_per_session", 7)),
        "max_minutes_per_tick": int(cfg.get("max_minutes_per_tick", 40)),
        "max_remediate_retries": int(budget.get("max_remediate_retries", 2)),
    }


def load_knobs(root: Path | None = None) -> dict[str, int]:
    root = root or repo_root()
    base = default_knobs(root)
    path = overlay_path(root)
    if path.is_file():
        try:
            doc = json.loads(path.read_text(encoding="utf-8"))
            if overlay_trusted(doc, root):
                for k in KNOB_KEYS:
                    if k in (doc.get("knobs") or {}):
                        base[k] = int(doc["knobs"][k])
        except (json.JSONDecodeError, TypeError, ValueError):
            pass
    base["max_ticks_per_session"] = max(
        base["max_ticks_per_session"], base["sweet_spot_ticks"] + 1
    )
    return {k: _clamp(k, base[k]) for k in KNOB_KEYS}


def quality_vector_names(root: Path | None = None) -> list[str]:
    root = root or repo_root()
    cfg = _load_yaml_cfg(root)
    vectors = cfg.get("quality_vectors")
    if isinstance(vectors, list) and vectors:
        return [str(v) for v in vectors]
    return [
        "perceive_exit_0",
        "compliance_exit_lte_2",
        "staged_diff_non_empty",
        "coherence_exit_0",
        "trust_path_exit_0",
        "scorecard_not_block",
        "wave_autopilot_exit_0",
    ]


def _run(cmd: list[str], root: Path, timeout: int = 600) -> int:
    try:
        return subprocess.run(
            cmd, cwd=root, timeout=timeout, capture_output=True, text=True
        ).returncode
    except (subprocess.TimeoutExpired, OSError):
        return 124


def _compliance_exit_code(root: Path) -> tuple[int, bool]:
    """Return (exit_code, fresh). Re-run compliance when artifact head_sha != HEAD."""
    comp_dir = root / ".goalie" / "evidence" / "compliance"
    head = _git_head(root)
    comp_ec = 99
    stale = True
    if comp_dir.is_dir():
        files = sorted(comp_dir.glob("compliance_cog_governance_*.json"), reverse=True)
        if not files:
            files = sorted(comp_dir.glob("compliance_*.json"), reverse=True)
        if files:
            try:
                doc = json.loads(files[0].read_text(encoding="utf-8"))
                art_head = doc.get("head_sha") or doc.get("git_head")
                if art_head and head and art_head == head:
                    comp_ec = int(doc.get("exit_code", doc.get("summary", {}).get("exit_code", 99)))
                    return comp_ec, True
            except (json.JSONDecodeError, TypeError, ValueError):
                pass
    # Stale or missing — attempt re-run
    runners = [
        root / "scripts" / "cicd" / "policy_compliance.sh",
        root / "tooling" / "scripts" / "governance" / "compliance_as_code.py",
    ]
    for runner in runners:
        if not runner.is_file():
            continue
        if runner.suffix == ".py":
            ec = _run(["python3", str(runner), "--scope", "governance"], root, timeout=300)
        else:
            ec = _run(["bash", str(runner)], root, timeout=300)
        if ec != 124:
            return ec, True
    return comp_ec, stale


def _wave_ok_from_artifact(root: Path, wave_ec: int | None = None) -> bool:
    if wave_ec is not None:
        return wave_ec == 0
    env_ok = os.environ.get("CYCLE_WAVE_OK", "")
    if env_ok in ("0", "1"):
        return env_ok == "1"
    for pattern in ("wave_autopilot_*.json", "last_wave_autopilot.json"):
        for path in sorted((root / ".goalie" / "evidence").glob(pattern), reverse=True):
            try:
                doc = json.loads(path.read_text(encoding="utf-8"))
                if "exit_code" in doc:
                    return int(doc["exit_code"]) == 0
            except (json.JSONDecodeError, TypeError, ValueError, OSError):
                continue
    return False


def vectors_from_env() -> dict[str, dict[str, Any]] | None:
    raw = os.environ.get("CYCLE_VECTORS_JSON", "")
    if not raw.strip():
        path = os.environ.get("CYCLE_VECTORS_FILE", "")
        if path and Path(path).is_file():
            raw = Path(path).read_text(encoding="utf-8")
    if not raw.strip():
        return None
    try:
        data = json.loads(raw)
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        return None
    return None


def collect_vectors(
    root: Path | None = None,
    *,
    measured: dict[str, dict[str, Any]] | None = None,
    wave_ec: int | None = None,
) -> dict[str, dict[str, Any]]:
    if measured is not None:
        return measured
    pre = vectors_from_env()
    if pre is not None:
        return pre

    root = root or repo_root()
    one = root / "scripts" / "one.sh"
    dod = root / "code" / "tooling" / "scripts" / "dod-gate.sh"
    if not dod.is_file():
        dod = root / "scripts" / "dod-gate.sh"

    vectors: dict[str, dict[str, Any]] = {}
    pe = _run([str(dod), "--perceive"], root, timeout=300)
    vectors["perceive_exit_0"] = {"ok": pe == 0, "exit_code": pe}

    comp_ec, comp_fresh = _compliance_exit_code(root)
    vectors["compliance_exit_lte_2"] = {
        "ok": comp_ec <= 2,
        "exit_code": comp_ec,
        "fresh": comp_fresh,
        "head_sha": _git_head(root),
    }

    staged = subprocess.run(
        ["git", "diff", "--cached", "--stat"], cwd=root, capture_output=True, text=True,
    )
    vectors["staged_diff_non_empty"] = {
        "ok": bool(staged.stdout.strip()),
        "lines": len(staged.stdout.splitlines()),
    }

    coh = _run(["bash", str(one), "coherence"], root, timeout=600)
    vectors["coherence_exit_0"] = {"ok": coh == 0, "exit_code": coh}

    trust = _run(["bash", str(one), "trust-path"], root, timeout=300)
    vectors["trust_path_exit_0"] = {"ok": trust == 0, "exit_code": trust}

    from scorecard_vector import evaluate_scorecard_not_block
    vectors["scorecard_not_block"] = evaluate_scorecard_not_block(root)

    aqe_q = _run(
        ["bash", str(one), "aqe", "quality", "assess", "--gate"],
        root, timeout=300,
    )
    vectors["aqe_quality_pass"] = {"ok": aqe_q == 0, "exit_code": aqe_q}

    aqe_c = _run(
        ["bash", str(one), "aqe", "coverage", "src/", "--threshold", "80"],
        root, timeout=300,
    )
    vectors["aqe_coverage_pass"] = {"ok": aqe_c == 0, "exit_code": aqe_c}

    wave_ok = _wave_ok_from_artifact(root, wave_ec=wave_ec)
    vectors["wave_autopilot_exit_0"] = {"ok": wave_ok, "exit_code": 0 if wave_ok else 1}

    return vectors


def evaluate_pass(vectors: dict[str, dict[str, Any]], required: list[str] | None = None) -> tuple[bool, list[str]]:
    required = required or quality_vector_names()
    failures = [name for name in required if not vectors.get(name, {}).get("ok")]
    return len(failures) == 0, failures


def adjust_knobs(
    current: dict[str, int],
    vectors: dict[str, dict[str, Any]],
    *,
    wave_ok: bool = False,
) -> dict[str, int]:
    k = dict(current)
    core_ok = (
        vectors.get("perceive_exit_0", {}).get("ok")
        and vectors.get("coherence_exit_0", {}).get("ok")
        and vectors.get("staged_diff_non_empty", {}).get("ok")
        and wave_ok
    )
    structural_ok = (
        vectors.get("trust_path_exit_0", {}).get("ok")
        and vectors.get("scorecard_not_block", {}).get("ok")
    )
    qe_ok = (
        vectors.get("aqe_quality_pass", {}).get("ok")
        and vectors.get("aqe_coverage_pass", {}).get("ok")
    )

    if core_ok and structural_ok and qe_ok:
        # Green cycle: hold or tighten toward documented sweet spot (3), never widen.
        target = DOCUMENTED_SWEET_SPOT
        if k["sweet_spot_ticks"] > target:
            k["sweet_spot_ticks"] = _clamp("sweet_spot_ticks", k["sweet_spot_ticks"] - 1)
        k["max_remediate_retries"] = _clamp("max_remediate_retries", k["max_remediate_retries"] - 1)
        k["max_minutes_per_tick"] = _clamp("max_minutes_per_tick", k["max_minutes_per_tick"] - 5)
    elif core_ok:
        k["max_minutes_per_tick"] = _clamp("max_minutes_per_tick", k["max_minutes_per_tick"] - 2)
    else:
        k["sweet_spot_ticks"] = _clamp("sweet_spot_ticks", k["sweet_spot_ticks"] - 1)
        k["max_remediate_retries"] = _clamp("max_remediate_retries", k["max_remediate_retries"] + 1)
        k["max_minutes_per_tick"] = _clamp("max_minutes_per_tick", k["max_minutes_per_tick"] + 5)

    if not vectors.get("trust_path_exit_0", {}).get("ok"):
        k["max_ticks_per_session"] = _clamp("max_ticks_per_session", k["max_ticks_per_session"] - 1)
    elif core_ok and structural_ok:
        k["max_ticks_per_session"] = _clamp("max_ticks_per_session", k["max_ticks_per_session"] + 1)

    k["max_ticks_per_session"] = max(k["max_ticks_per_session"], k["sweet_spot_ticks"] + 1)
    return {key: _clamp(key, k[key]) for key in KNOB_KEYS}


def _stamp_overlay_signature(path: Path, root: Path, doc: dict[str, Any]) -> None:
    try:
        from scripts.gates.scorecard_gate import stamp_local_coherence_signature
    except ImportError:
        return
    gh = doc.get("git_head") or _git_head(root)
    if not gh:
        return
    path.write_text(json.dumps(doc, indent=2) + "\n", encoding="utf-8")
    if stamp_local_coherence_signature(str(path), str(root)):
        try:
            signed = json.loads(path.read_text(encoding="utf-8"))
            doc.update({k: signed[k] for k in ("signature", "principal") if k in signed})
        except (json.JSONDecodeError, OSError):
            pass


def save_overlay(root: Path, knobs: dict[str, int], *, mode: str,
                 vectors: dict[str, dict[str, Any]], wave_ok: bool) -> Path:
    path = overlay_path(root)
    path.parent.mkdir(parents=True, exist_ok=True)
    doc = {
        "schema": SCHEMA,
        "updated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "git_head": _git_head(root),
        "mode": mode,
        "knobs": knobs,
        "last_cycle": {
            "vectors": vectors,
            "wave_autopilot_ok": wave_ok,
            "required": quality_vector_names(root),
        },
    }
    path.write_text(json.dumps(doc, indent=2) + "\n", encoding="utf-8")
    _stamp_overlay_signature(path, root, doc)
    write_session_stamp(root, overlay=path)
    return path


def _vectors_file_from_args(args: list[str]) -> Path | None:
    for i, arg in enumerate(args):
        if arg in ("--vectors-file", "-f") and i + 1 < len(args):
            return Path(args[i + 1])
    env_path = os.environ.get("CYCLE_VECTORS_FILE", "").strip()
    if env_path:
        return Path(env_path)
    return None


def _require_measured_vectors_file(args: list[str], root: Path) -> Path:
    vf = _vectors_file_from_args(args)
    if vf is None or not str(vf).strip():
        print(
            "error: propose/apply require CYCLE_VECTORS_FILE or --vectors-file "
            "pointing to an existing measured vectors JSON",
            file=sys.stderr,
        )
        return Path()  # sentinel handled by caller
    if not vf.is_file():
        print(f"error: vectors file not found: {vf}", file=sys.stderr)
        return Path()
    return vf


def write_cycle_receipt(
    root: Path,
    *,
    passed: bool,
    failures: list[str],
    vectors: dict[str, dict[str, Any]],
    exit_code: int,
    mode: str,
) -> Path:
    path = root / ".goalie" / "cron_state" / "cycle_receipt.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    doc = {
        "schema": "cls.cycle_receipt.v1",
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "git_head": _git_head(root),
        "mode": mode,
        "passed": passed,
        "exit_code": exit_code,
        "failures": failures,
        "vectors": {k: v.get("ok") for k, v in vectors.items()},
    }
    path.write_text(json.dumps(doc, indent=2) + "\n", encoding="utf-8")
    return path


def knob_get(key: str, default: str = "") -> str:
    mapping = {
        "session.sweet_spot_ticks": "sweet_spot_ticks",
        "session.max_ticks_per_session": "max_ticks_per_session",
        "max_remediate_retries": "max_remediate_retries",
        "max_minutes_per_tick": "max_minutes_per_tick",
    }
    knob_key = mapping.get(key)
    if knob_key:
        val = load_knobs().get(knob_key)
        if val is not None:
            return str(val)
    return default


def main(argv: list[str] | None = None) -> int:
    args = argv if argv is not None else sys.argv[1:]
    root = repo_root()
    if not args or args[0] in ("-h", "--help"):
        print("usage: cycle_knob_engine.py {show|propose|apply|receipt} [FA|SA]")
        return 0

    cmd = args[0]
    mode = (args[1] if len(args) > 1 else os.environ.get("CYCLE_MODE", "SA")).upper()
    if mode not in ("FA", "SA"):
        mode = "SA"

    current = load_knobs(root)
    if cmd == "show":
        print(json.dumps({"knobs": current, "schema": SCHEMA}, indent=2))
        return 0

    measured: dict[str, dict[str, Any]] | None = None
    if cmd in ("propose", "apply"):
        vf = _require_measured_vectors_file(args, root)
        if not vf or not str(vf).strip() or not vf.is_file():
            return 2
        try:
            data = json.loads(vf.read_text(encoding="utf-8"))
            if not isinstance(data, dict):
                print("error: vectors file must contain a JSON object", file=sys.stderr)
                return 2
            measured = data
        except (json.JSONDecodeError, OSError) as exc:
            print(f"error: invalid vectors file {vf}: {exc}", file=sys.stderr)
            return 2

    wave_ec: int | None = None
    if os.environ.get("CYCLE_WAVE_EC", "").isdigit():
        wave_ec = int(os.environ["CYCLE_WAVE_EC"])

    vectors = collect_vectors(root, measured=measured, wave_ec=wave_ec)
    passed, failures = evaluate_pass(vectors)
    wave_ok = vectors.get("wave_autopilot_exit_0", {}).get("ok", False)
    proposed = adjust_knobs(current, vectors, wave_ok=wave_ok)

    if cmd == "receipt":
        ec = 0 if passed else 1
        if os.environ.get("CYCLE_EXIT_CODE", "").isdigit():
            ec = int(os.environ["CYCLE_EXIT_CODE"])
        write_cycle_receipt(root, passed=passed, failures=failures, vectors=vectors,
                            exit_code=ec, mode=mode)
        print(json.dumps({"passed": passed, "failures": failures}, indent=2))
        return 0 if passed else 1

    if cmd == "propose":
        print(json.dumps({
            "mode": mode, "current": current, "proposed": proposed,
            "vectors": vectors, "failures": failures, "passed": passed, "wave_ok": wave_ok,
        }, indent=2))
        return 0

    if cmd == "apply":
        cycle_pass = passed and os.environ.get("CYCLE_EXIT_CODE", "0") == "0"
        fa_apply = mode == "FA" and cycle_pass
        sa_apply = mode == "SA" and cycle_pass and os.environ.get("CYCLE_APPLY", "0") == "1"
        apply = fa_apply or sa_apply
        if not apply:
            print(json.dumps({
                "mode": mode, "applied": False, "proposed": proposed,
                "passed": passed, "failures": failures,
                "hint": "Requires cycle pass + (FA or CYCLE_APPLY=1 for SA)",
            }, indent=2))
            return 0
        path = save_overlay(root, proposed, mode=mode, vectors=vectors, wave_ok=wave_ok)
        print(json.dumps({"applied": True, "path": str(path), "knobs": proposed}, indent=2))
        return 0

    print(f"unknown command: {cmd}", file=sys.stderr)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
