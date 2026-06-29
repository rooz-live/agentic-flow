#!/usr/bin/env python3
"""Render pin literals from config/versions/portfolio.yaml (Slice 5).

Modes:
  --dry-run              Show planned edits (no VERSION_PIN_APPLY required)
  --sync-help            Align help.sh to current pins (no registry bump)
  --from-evidence        Apply `latest` from version_portfolio_latest.json

Apply requires VERSION_PIN_APPLY=1 and (CYCLE_APPLY=1 or VERSION_PIN_FA=1).
Blocked when evidence.blockers_active non-empty unless VERSION_PIN_FORCE=1.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError:
    yaml = None  # type: ignore


def repo_root() -> Path:
    env = os.environ.get("REPO_ROOT")
    if env:
        return Path(env)
    return Path(__file__).resolve().parents[2]


def _load_yaml(path: Path) -> dict[str, Any]:
    if yaml is None:
        raise SystemExit("PyYAML required")
    return yaml.safe_load(path.read_text(encoding="utf-8")) or {}


def _read_env_pin(root: Path, rel: str, key: str) -> str | None:
    p = root / rel
    if not p.is_file():
        return None
    for line in p.read_text(encoding="utf-8").splitlines():
        if line.startswith(f"{key}="):
            return line.split("=", 1)[1].strip()
    return None


def _read_aqe_pin(root: Path) -> str | None:
    text = (root / "scripts/one-sh.d/aqe.sh").read_text(encoding="utf-8")
    m = re.search(r"agentic-qe@([0-9]+\.[0-9]+\.[0-9]+)", text)
    return m.group(1) if m else None


def _load_evidence(root: Path) -> dict[str, Any]:
    p = root / ".goalie/evidence/version_portfolio_latest.json"
    if not p.is_file():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}


def _apply_allowed(evidence: dict[str, Any], *, sync_help_only: bool) -> tuple[bool, str]:
    if os.environ.get("VERSION_PIN_FORCE", "0") == "1":
        return True, "VERSION_PIN_FORCE=1"
    if os.environ.get("VERSION_PIN_APPLY", "0") != "1":
        return False, "VERSION_PIN_APPLY=1 required"
    sa = os.environ.get("CYCLE_APPLY", "0") == "1"
    fa = os.environ.get("VERSION_PIN_FA", "0") == "1"
    if not (sa or fa):
        return False, "CYCLE_APPLY=1 ({SA}) or VERSION_PIN_FA=1 (human [FA]) required"
    if sync_help_only:
        return True, "sync-help only (no registry bump)"
    blockers = evidence.get("blockers_active") or []
    if blockers:
        return False, f"blockers_active: {[b.get('id') for b in blockers]}"
    return True, "ok"


def _write_if_changed(path: Path, new_text: str, *, dry_run: bool) -> bool:
    old = path.read_text(encoding="utf-8") if path.is_file() else ""
    if old == new_text:
        return False
    if not dry_run:
        path.write_text(new_text, encoding="utf-8")
    return True


def render_env(root: Path, pin: dict[str, Any], version: str, *, dry_run: bool) -> bool:
    rel = pin.get("file", "")
    key = pin.get("key", "")
    p = root / rel
    lines = p.read_text(encoding="utf-8").splitlines() if p.is_file() else []
    out: list[str] = []
    found = False
    for line in lines:
        if line.startswith(f"{key}="):
            out.append(f"{key}={version}")
            found = True
        else:
            out.append(line)
    if not found:
        out.append(f"{key}={version}")
    return _write_if_changed(p, "\n".join(out) + ("\n" if out else ""), dry_run=dry_run)


def render_aqe(root: Path, version: str, *, dry_run: bool) -> bool:
    p = root / "scripts/one-sh.d/aqe.sh"
    text = p.read_text(encoding="utf-8")
    new_text = re.sub(r"agentic-qe@[0-9]+\.[0-9]+\.[0-9]+", f"agentic-qe@{version}", text)
    return _write_if_changed(p, new_text, dry_run=dry_run)


def render_help(root: Path, ruflo: str, aqe: str, *, dry_run: bool) -> bool:
    p = root / "scripts/one-sh.d/help.sh"
    text = p.read_text(encoding="utf-8")
    text = re.sub(r"Agentic QE v[0-9]+\.[0-9]+\.[0-9]+", f"Agentic QE v{aqe}", text)
    text = re.sub(r"Ruflo v[0-9]+\.[0-9]+\.[0-9]+", f"Ruflo v{ruflo}", text)
    return _write_if_changed(p, text, dry_run=dry_run)


def render_json_dep(root: Path, pin: dict[str, Any], version: str, *, dry_run: bool) -> bool:
    rel = pin.get("file", "")
    path_key = pin.get("path", "")
    p = root / rel
    doc = json.loads(p.read_text(encoding="utf-8"))
    cur: Any = doc
    parts = path_key.split(".")
    for part in parts[:-1]:
        cur = cur.setdefault(part, {})
    leaf = parts[-1]
    new_val = f"^{version}"
    if cur.get(leaf) == new_val:
        return False
    cur[leaf] = new_val
    new_text = json.dumps(doc, indent=2) + "\n"
    return _write_if_changed(p, new_text, dry_run=dry_run)


def build_targets(
    root: Path,
    spec: dict[str, Any],
    evidence: dict[str, Any],
    *,
    from_evidence: bool,
    sync_help: bool,
) -> dict[str, str]:
    targets: dict[str, str] = {}
    by_id = {p["id"]: p for p in evidence.get("packages") or [] if p.get("id")}
    for pkg in spec.get("packages") or []:
        pid = pkg.get("id", "")
        pin = pkg.get("pin") or {}
        if from_evidence and pid in by_id:
            entry = by_id[pid]
            if entry.get("drift") not in (None, "none", "unknown") and entry.get("latest"):
                targets[pid] = str(entry["latest"])
            continue
        if sync_help or not from_evidence:
            if pin.get("type") == "env":
                v = _read_env_pin(root, pin.get("file", ""), pin.get("key", ""))
                if v:
                    targets[pid] = v
            elif pid == "agentic-qe":
                v = _read_aqe_pin(root)
                if v:
                    targets[pid] = v
    if from_evidence:
        for pkg in evidence.get("packages") or []:
            pid = pkg.get("id", "")
            if pid and pkg.get("latest") and pkg.get("drift") not in ("none", "unknown"):
                targets[pid] = str(pkg["latest"])
    return targets


def render_all(
    root: Path,
    *,
    dry_run: bool,
    from_evidence: bool,
    sync_help: bool,
) -> dict[str, Any]:
    spec = _load_yaml(root / "config/versions/portfolio.yaml")
    evidence = _load_evidence(root)
    if from_evidence and not evidence:
        subprocess.run([sys.executable, str(root / "scripts/cicd/version_portfolio_probe.py")], check=False)
        evidence = _load_evidence(root)

    targets = build_targets(root, spec, evidence, from_evidence=from_evidence, sync_help=sync_help)
    changed: list[str] = []

    for pkg in spec.get("packages") or []:
        pid = pkg.get("id", "")
        if pid not in targets:
            continue
        ver = targets[pid]
        pin = pkg.get("pin") or {}
        ptype = pin.get("type")
        if ptype == "env":
            if render_env(root, pin, ver, dry_run=dry_run):
                changed.append(pin.get("file", ""))
        elif pid == "agentic-qe":
            if render_aqe(root, ver, dry_run=dry_run):
                changed.append("scripts/one-sh.d/aqe.sh")
        elif ptype == "json":
            if render_json_dep(root, pin, ver, dry_run=dry_run):
                changed.append(pin.get("file", ""))

    ruflo = targets.get("ruflo") or _read_env_pin(root, "config/ruflo/version.env", "RUFLO_VERSION") or "0.0.0"
    aqe = targets.get("agentic-qe") or _read_aqe_pin(root) or "0.0.0"
    if sync_help or from_evidence or dry_run:
        if render_help(root, ruflo, aqe, dry_run=dry_run):
            changed.append("scripts/one-sh.d/help.sh")

    return {
        "dry_run": dry_run,
        "from_evidence": from_evidence,
        "sync_help": sync_help,
        "targets": targets,
        "changed": changed,
        "blockers_active": evidence.get("blockers_active") or [],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Render portfolio version pins")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--sync-help", action="store_true", help="Sync help.sh to current pins")
    parser.add_argument("--from-evidence", action="store_true", help="Bump pins to probe latest")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    root = repo_root()
    evidence = _load_evidence(root)

    if not args.dry_run:
        ok, reason = _apply_allowed(evidence, sync_help_only=args.sync_help and not args.from_evidence)
        if not ok:
            print(f"error: {reason}", file=sys.stderr)
            return 2

    if not args.dry_run and not args.sync_help and not args.from_evidence:
        print("error: specify --sync-help and/or --from-evidence", file=sys.stderr)
        return 2

    result = render_all(
        root,
        dry_run=args.dry_run,
        from_evidence=args.from_evidence,
        sync_help=args.sync_help or (args.dry_run and not args.from_evidence),
    )
    out_path = root / ".goalie/evidence/version_pin_render_latest.json"
    if not args.dry_run:
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps({**result, "schema": "version_pin_render.v1"}, indent=2) + "\n", encoding="utf-8")

    if args.json:
        print(json.dumps(result, indent=2))
    else:
        mode = "dry-run" if args.dry_run else "apply"
        print(f"version_pin_render ({mode}): changed={result['changed']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
