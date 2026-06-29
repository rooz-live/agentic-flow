#!/usr/bin/env python3
"""Read-only portfolio version probe — npm registry vs canonical pins.

Writes .goalie/evidence/version_portfolio_latest.json.
Does NOT mutate pins unless VERSION_PIN_APPLY=1 (SA/human [FA] only).
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
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
        raise SystemExit("PyYAML required for version_portfolio_probe")
    return yaml.safe_load(path.read_text(encoding="utf-8")) or {}


def _read_pin(pkg: dict[str, Any], root: Path) -> str | None:
    pin = pkg.get("pin") or {}
    ptype = pin.get("type")
    fpath = root / pin.get("file", "")
    if not fpath.is_file():
        return None
    text = fpath.read_text(encoding="utf-8")
    if ptype == "env":
        prefix = f"{pin.get('key', '')}="
        for line in text.splitlines():
            if line.startswith(prefix):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    elif ptype == "regex":
        m = re.search(pin.get("pattern", ""), text)
        return m.group(1) if m else None
    elif ptype == "json":
        doc = json.loads(text)
        path = pin.get("path", "")
        cur: Any = doc
        for part in path.split("."):
            if not isinstance(cur, dict):
                return None
            cur = cur.get(part)
        if isinstance(cur, str):
            return cur.lstrip("^~>=< ")
    return None


def _npm_latest(name: str, *, skip_network: bool) -> tuple[str | None, str | None]:
    if skip_network:
        return None, "AF_SKIP_NETWORK=1"
    try:
        out = subprocess.check_output(
            ["npm", "view", name, "version"],
            text=True,
            timeout=30,
            stderr=subprocess.STDOUT,
        ).strip()
        return out or None, None
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired, FileNotFoundError) as exc:
        return None, str(exc)


def _parse_semver(v: str) -> tuple[int, ...]:
    core = re.match(r"(\d+(?:\.\d+)*)", v)
    if not core:
        return (0,)
    return tuple(int(x) for x in core.group(1).split("."))


def _drift(pinned: str | None, latest: str | None) -> str:
    if not pinned or not latest:
        return "unknown"
    p, l = _parse_semver(pinned), _parse_semver(latest)
    if p == l:
        return "none"
    if p[:2] == l[:2] and len(p) >= 3 and len(l) >= 3 and p[2] < l[2]:
        return "patch"
    if p[:1] == l[:1] and p != l:
        return "minor"
    return "major"


def _action(drift: str, blockers_active: bool) -> str:
    if blockers_active:
        return "blocked"
    if drift == "none":
        return "observe"
    if drift in ("patch", "minor"):
        return "propose_sa"
    if drift == "major":
        return "propose_sa"
    return "observe"


def _active_blockers(root: Path, spec: dict[str, Any]) -> list[dict[str, Any]]:
    active: list[dict[str, Any]] = []
    for b in spec.get("blockers") or []:
        bid = b.get("id", "")
        if b.get("env"):
            val = os.environ.get(b["env"], "")
            if val == b.get("expect"):
                active.append({"id": bid, "reason": f"{b['env']}={val}"})
            continue
        check = b.get("check")
        if not check:
            continue
        p = root / check
        if not p.is_file():
            active.append({"id": bid, "reason": f"missing {check}"})
            continue
        try:
            doc = json.loads(p.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            active.append({"id": bid, "reason": f"unreadable {check}"})
            continue
        field = b.get("field", "")
        expect = b.get("expect")
        actual = doc.get(field)
        if expect is True and actual is not True:
            active.append({"id": bid, "reason": f"{field}={actual!r} expected true"})
        elif expect is not True and actual != expect:
            active.append({"id": bid, "reason": f"{field}={actual!r} expected {expect!r}"})
    return active


def probe(root: Path | None = None, *, skip_network: bool | None = None) -> dict[str, Any]:
    root = root or repo_root()
    manifest_path = root / "config/versions/portfolio.yaml"
    spec = _load_yaml(manifest_path)
    skip = skip_network if skip_network is not None else os.environ.get("AF_SKIP_NETWORK", "0") == "1"
    blockers = _active_blockers(root, spec)
    blocked = bool(blockers)

    entries: list[dict[str, Any]] = []
    for pkg in spec.get("packages") or []:
        pid = pkg.get("id", "")
        npm_name = pkg.get("npm", "")
        pinned = _read_pin(pkg, root)
        latest, err = _npm_latest(npm_name, skip_network=skip)
        drift = _drift(pinned, latest) if pinned and latest else "unknown"
        entries.append({
            "id": pid,
            "npm": npm_name,
            "channel": pkg.get("channel", "stable"),
            "pinned": pinned,
            "latest": latest,
            "query_error": err,
            "drift": drift,
            "action": _action(drift, blocked),
            "consumers": pkg.get("consumers") or [],
        })

    plugins_manifest = spec.get("plugins", {}).get("manifest")
    plugin_count = 0
    if plugins_manifest:
        pm = root / plugins_manifest
        if pm.is_file() and yaml:
            pdoc = _load_yaml(pm)
            plugin_count = len(pdoc.get("plugins") or [])

    out = {
        "schema": "version_portfolio.v1",
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "manifest": str(manifest_path.relative_to(root)),
        "git_head": _git_head(root),
        "skip_network": skip,
        "blockers_active": blockers,
        "inbox_zero_gate": not blocked,
        "packages": entries,
        "plugins": {"manifest": plugins_manifest, "count": plugin_count},
        "deprecated_probe_delegated": spec.get("deprecated_probes"),
        "pin_apply_allowed": os.environ.get("VERSION_PIN_APPLY", "0") == "1",
        "rca_addressed": [
            "A_dual_upstream_unified_manifest",
            "B_orphan_npm_view_wired_tick_post",
            "C_fa_sa_observe_only",
            "D_policy_blockers_in_artifact",
            "E_single_portfolio_yaml",
        ],
    }
    return out


def _git_head(root: Path) -> str:
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=str(root), text=True, timeout=10,
        ).strip()
    except Exception:
        return "unknown"


def write_evidence(doc: dict[str, Any], root: Path) -> Path:
    out = root / ".goalie/evidence/version_portfolio_latest.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(doc, indent=2) + "\n", encoding="utf-8")
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description="Portfolio version probe (read-only)")
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--dry-run", action="store_true", help="Print only; do not write evidence")
    parser.add_argument("--skip-network", action="store_true")
    args = parser.parse_args()
    root = repo_root()
    doc = probe(root, skip_network=args.skip_network or None)
    if not args.dry_run:
        path = write_evidence(doc, root)
        if not args.json:
            print(f"wrote {path}")
    if args.json:
        print(json.dumps(doc, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
