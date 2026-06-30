#!/usr/bin/env python3
"""Parse `npx ruflo doctor` → .goalie/evidence/ruflo_doctor_latest.json with ROAM hints."""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import yaml

# Shared disk thresholds (R-DISK-01)
import sys
_lib = Path(__file__).resolve().parent / "lib"
if str(_lib) not in sys.path:
    sys.path.insert(0, str(_lib))
from disk_thresholds import STEWARD_EVIDENCE_MAX_AGE_SEC, low_pct


SCHEMA = "ruflo_doctor_roam.v1"
CHECK_RE = re.compile(r"^([✓⚠✗])\s+([^:]+):\s*(.*)$")
SUMMARY_RE = re.compile(r"Summary:\s*(\d+)\s+passed,\s*(\d+)\s+warnings,\s*(\d+)\s+failed")


def repo_root() -> Path:
    return Path(os.environ.get("REPO_ROOT", Path(__file__).resolve().parents[2]))


def _disk_pct(root: Path) -> float | None:
    try:
        usage = shutil.disk_usage(root)
        return round(100 * (1 - usage.free / usage.total), 1)
    except OSError:
        return None


def _parse_checks(text: str) -> list[dict]:
    checks: list[dict] = []
    for line in text.splitlines():
        m = CHECK_RE.match(line.strip())
        if not m:
            continue
        glyph, name, detail = m.groups()
        status = {"✓": "pass", "⚠": "warn", "✗": "fail"}[glyph]
        checks.append({"name": name.strip(), "status": status, "detail": detail.strip()})
    return checks


def _roam_hint(risk_id: str, roam_status: str, note: str, *, severity: str = "medium") -> dict:
    return {
        "id": risk_id,
        "roam_status": roam_status,
        "note": note,
        "severity": severity,
    }


def _hints_from_checks(checks: list[dict], disk_pct: float | None) -> tuple[list[dict], list[dict]]:
    blockers: list[dict] = []
    warnings: list[dict] = []
    disk_blocked = False

    for chk in checks:
        name = chk["name"].lower()
        if "disk space" in name:
            if chk["status"] == "fail":
                disk_blocked = True
                blockers.append(_roam_hint(
                    "R-DISK-01", "BLOCKED",
                    chk.get("detail") or f"disk {disk_pct}% used",
                    severity="critical",
                ))
            elif chk["status"] == "warn":
                warnings.append(_roam_hint(
                    "R-DISK-01", "OWNED",
                    chk.get("detail") or f"disk {disk_pct}% used",
                    severity="high",
                ))
        elif "memory database" in name or "memory" in name:
            if chk["status"] != "pass":
                warnings.append(_roam_hint("R-RUFLO-MEMORY-01", "OWNED", chk.get("detail", name)))
        elif "config" in name:
            if chk["status"] != "pass":
                warnings.append(_roam_hint("R-RUFLO-CONFIG-01", "OWNED", chk.get("detail", name)))
        elif "encryption" in name:
            if chk["status"] != "pass":
                warnings.append(_roam_hint("R-RUFLO-ENCRYPT-01", "OWNED", chk.get("detail", name)))
        elif "mcp servers" in name or "plugin" in name or "metaharness" in name:
            if chk["status"] == "fail":
                warnings.append(_roam_hint("R-RUFLO-PLUGIN-01", "OWNED", chk.get("detail", name)))

    threshold = low_pct()
    if disk_pct is not None and disk_pct >= threshold and not disk_blocked:
        disk_blocked = True
        blockers.append(_roam_hint("R-DISK-01", "BLOCKED", f"disk {disk_pct}% used (>={threshold}%)", severity="critical"))

    return blockers, warnings


def _disk_steward_evidence(root: Path) -> dict | None:
    """Load the canonical disk_steward evidence (R-DISK-01 owner).

    Returns None when absent/unreadable — never raises, so the doctor still emits a
    payload when the steward has not run. This is the unification seam: the doctor
    propagates the steward's verdict so consumers see ONE consistent disk signal.
    """
    p = root / ".goalie/evidence/disk_steward_latest.json"
    if not p.is_file():
        return None
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def _steward_fresh(doc: dict | None) -> bool:
    if not isinstance(doc, dict):
        return False
    ts = doc.get("timestamp")
    if not ts:
        return False
    try:
        from datetime import datetime
        seen = datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
        age = (datetime.now(timezone.utc) - seen).total_seconds()
        return age <= STEWARD_EVIDENCE_MAX_AGE_SEC
    except (ValueError, TypeError):
        return False


def _steward_disk_blockers(doc: dict | None) -> list[dict]:
    """Surface BLOCKED risks from disk_steward evidence (canonical R-DISK-01 owner)."""
    if not isinstance(doc, dict) or not _steward_fresh(doc):
        return []
    threshold = low_pct()
    blockers: list[dict] = []
    pct = doc.get("disk_used_pct")
    fsck = doc.get("git_fsck_rc")
    if isinstance(pct, (int, float)) and pct >= threshold:
        blockers.append(_roam_hint(
            "R-DISK-01", "BLOCKED",
            f"disk {pct}% used (>={threshold}% threshold) — per disk_steward_latest.json",
            severity="critical",
        ))
    if isinstance(fsck, int) and fsck != 0:
        blockers.append(_roam_hint(
            "R-GIT-FSCK-01", "BLOCKED",
            f"git_fsck_rc={fsck} mode={doc.get('git_fsck_mode')} — per disk_steward_latest.json",
            severity="critical",
        ))
    if doc.get("pack_corrupt") is True:
        blockers.append(_roam_hint(
            "R-PACK-CORRUPT", "BLOCKED",
            "pack_corrupt=true — per disk_steward_latest.json",
            severity="critical",
        ))
    return blockers


def _ruflo_version(root: Path) -> str | None:
    """RUFLO_VERSION sourced from config/ruflo/version.env (canonical) then env var.

    Returns None when unresolvable — never fabricates a hardcoded version (drift
    guard). The previous ``3.15.0`` fallback silently diverged from the canonical pin.
    """
    vf = root / "config/ruflo/version.env"
    if vf.is_file():
        for line in vf.read_text(encoding="utf-8").splitlines():
            if line.startswith("RUFLO_VERSION="):
                return line.split("=", 1)[1].strip()
    return os.environ.get("RUFLO_VERSION")


def run_doctor(root: Path) -> tuple[int, str]:
    if os.environ.get("AF_SKIP_NETWORK", "0") == "1":
        return 0, "AF_SKIP_NETWORK=1 — doctor skipped (offline contract mode)"
    ver = _ruflo_version(root)
    if ver is None:
        # Fail-closed drift guard: refuse to fabricate a version. The canonical pin
        # lives in config/ruflo/version.env; an unresolvable version must not silently
        # fall back to a stale hardcoded literal (false-green npx invocation).
        return 1, "FATAL: RUFLO_VERSION unset and config/ruflo/version.env missing (drift guard)"
    try:
        proc = subprocess.run(
            ["npx", "-y", f"ruflo@{ver}", "doctor"],
            cwd=str(root),
            capture_output=True,
            text=True,
            timeout=int(os.environ.get("RUFLO_DOCTOR_TIMEOUT", "120")),
            check=False,
        )
        text = (proc.stdout or "") + "\n" + (proc.stderr or "")
        return proc.returncode, text
    except (OSError, subprocess.TimeoutExpired) as exc:
        return 1, str(exc)


def build_payload(root: Path) -> tuple[dict, int]:
    doctor_exit, doctor_text = run_doctor(root)
    checks = _parse_checks(doctor_text)
    steward_doc = _disk_steward_evidence(root)
    disk_pct = _disk_pct(root)
    # When steward evidence is fresh, use its disk_pct for threshold blockers so doctor
    # and steward share ONE signal (avoids live-disk vs evidence mismatch in CI tests).
    if steward_doc and _steward_fresh(steward_doc):
        steward_pct = steward_doc.get("disk_used_pct")
        if isinstance(steward_pct, (int, float)):
            disk_pct = steward_pct
    blockers, warnings = _hints_from_checks(checks, disk_pct)

    # Unify the disk signal: propagate the disk_steward verdict (canonical R-DISK-01
    # owner). Without this an OFFLINE doctor (AF_SKIP_NETWORK=1) hides critical-disk /
    # corrupt-repo conditions, so consumers saw an inconsistent shape vs the steward.
    for steward_block in _steward_disk_blockers(steward_doc):
        if not any(b["id"] == steward_block["id"] for b in blockers):
            blockers.append(steward_block)

    summary_match = SUMMARY_RE.search(doctor_text)
    summary = {
        "passed": int(summary_match.group(1)) if summary_match else None,
        "warnings": int(summary_match.group(2)) if summary_match else None,
        "failed": int(summary_match.group(3)) if summary_match else None,
    }

    mem_cfg = root / "config/ruflo/memory_graph.yaml"
    mem_doc = yaml.safe_load(mem_cfg.read_text(encoding="utf-8")) if mem_cfg.is_file() else {}

    payload = {
        "schema": SCHEMA,
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "doctor_exit": doctor_exit,
        "disk_pct_used": disk_pct,
        "disk_steward_evidence": steward_doc is not None,
        "checks": checks,
        "summary": summary,
        "roam_blockers": blockers,
        "roam_warnings": warnings,
        "memory_graph": mem_doc.get("schema"),
        "af_skip_network": os.environ.get("AF_SKIP_NETWORK", "0") == "1",
        "doctor_tail": doctor_text[-3000:],
        "inbox_zero_gate": not blockers,
        "blockers": [
            {"id": b["id"], "disposition": b["roam_status"], "note": b["note"], "severity": b["severity"]}
            for b in blockers
        ],
        "warnings": [
            {"id": w["id"], "disposition": w["roam_status"], "note": w["note"], "severity": w["severity"]}
            for w in warnings
        ],
    }

    exit_code = 0
    if any(b.get("roam_status") == "BLOCKED" for b in blockers):
        exit_code = 2
    elif doctor_exit != 0 and not blockers:
        exit_code = 1
    return payload, exit_code


def main() -> int:
    root = repo_root()
    out = root / ".goalie/evidence/ruflo_doctor_latest.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    payload, exit_code = build_payload(root)
    out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"path": str(out), "exit": exit_code, "blockers": len(payload["roam_blockers"])}))
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
