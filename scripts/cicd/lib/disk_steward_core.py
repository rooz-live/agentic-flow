#!/usr/bin/env python3
"""WSJF-ranked disk stewardship — evidence + optional auto-remediate for R-DISK-01."""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from disk_thresholds import (
    LOOSE_OBJECT_REPACK_THRESHOLD,
    apply_pct,
    low_pct,
)

RUNBOOK = [
    "1. bash scripts/cicd/disk_steward.sh  (probe; writes disk_steward_latest.json)",
    "2. AF_DISK_STEWARD_APPLY=1 bash scripts/cicd/disk_steward.sh  (SAFE tier: npm cache + ephemeral prune)",
    "3. AF_DISK_STEWARD_REPAIR=1 AF_DISK_STEWARD_APPLY=1  (REPAIR: broken tags, pack quarantine, fetch)",
    "4. AF_DISK_GIT_FSCK_FULL=1 bash scripts/cicd/disk_steward.sh  (full fsck when corrupt)",
    "5. AF_DISK_FSCK_TIMEOUT_SEC=900  (raise fsck timeout; default 600 full / 60 connectivity)",
    "6. git fsck --full && git gc --prune=now && git repack -Ad  (manual repair pack corruption)",
    "7. AF_DISK_STEWARD_DEEP_CLEAN=1 bash scripts/cicd/disk_steward.sh  (tm_disk_guardian)",
    "8. re-run: PYTHONPATH=$PWD python3 scripts/cicd/ruflo_doctor_roam.py",
]

SESSION: dict[str, Any] = {
    "gc_succeeded": False,
    "gc_attempted": False,
    "quarantine_applied": False,
    "repair_unresolved": False,
    "connectivity_fsck_rc": None,
    "fsck_output": "",
    "tag_error_tags": [],
    "pack_error_paths": [],
}

class PreconditionState:
    """Tracks git/fsck preconditions for the cleanup DAG."""

    KEYS = (
        "git-fsck-connectivity-ok",
        "git-fsck-tag-errors",
        "git-fsck-pack-errors",
        "git-gc-ok",
        "git-pack-quarantine-applied",
    )

    def __init__(self, root: Path, session: dict[str, Any] | None = None) -> None:
        self.root = root
        self.session = session if session is not None else SESSION

    def as_dict(self) -> dict[str, bool]:
        conn_rc = self.session.get("connectivity_fsck_rc")
        if conn_rc is None:
            conn_rc = 0 if os.environ.get("AF_DISK_SKIP_GIT_FSCK", "0") == "1" else -1
        gc_ok = True
        if self.session.get("gc_attempted"):
            gc_ok = bool(self.session.get("gc_succeeded"))
        return {
            "git-fsck-connectivity-ok": conn_rc == 0,
            "git-fsck-tag-errors": bool(self.session.get("tag_error_tags")),
            "git-fsck-pack-errors": bool(self.session.get("pack_error_paths")),
            "git-gc-ok": gc_ok,
            "git-pack-quarantine-applied": bool(self.session.get("quarantine_applied"))
            or not self.session.get("pack_error_paths"),
        }

    def get(self, key: str, default: bool = False) -> bool:
        return self.as_dict().get(key, default)



def _minimal_yaml_load(text: str) -> dict[str, Any]:
    """Parse a tiny subset of YAML for cleanup_registry (lists of dicts with scalar values)."""
    root: dict[str, Any] = {}
    stack: list[tuple[Any, str | None]] = [(root, None)]
    current_key: str | None = None
    list_stack: list[list[Any]] = []
    indent_stack: list[int] = [0]

    def set_on_parent(val: Any) -> None:
        parent, pkey = stack[-1]
        if isinstance(parent, dict) and pkey is not None:
            parent[pkey] = val
        elif isinstance(parent, list):
            parent.append(val)

    for raw in text.splitlines():
        if not raw.strip() or raw.strip().startswith("#"):
            continue
        indent = len(raw) - len(raw.lstrip(" "))
        line = raw.strip()
        while len(indent_stack) > 1 and indent < indent_stack[-1]:
            indent_stack.pop()
            if list_stack:
                finished = list_stack.pop()
                set_on_parent(finished)
            stack.pop()

        if line.startswith("- "):
            item_text = line[2:].strip()
            parent, pkey = stack[-1]
            if not isinstance(parent, list):
                new_list: list[Any] = []
                set_on_parent(new_list)
                stack[-1] = (new_list, pkey)
                parent = new_list
            if ":" in item_text:
                key, _, rest = item_text.partition(":")
                item: dict[str, Any] = {key.strip(): rest.strip().strip('"')}
                parent.append(item)
                stack.append((item, None))
                indent_stack.append(indent)
            else:
                parent.append(item_text.strip('"'))
            continue

        if ":" not in line:
            continue
        key, _, rest = line.partition(":")
        key = key.strip()
        rest = rest.strip()
        parent, _ = stack[-1]

        if rest == "":
            if isinstance(parent, dict):
                if key not in parent:
                    parent[key] = {}
                stack.append((parent[key], key))
                indent_stack.append(indent)
            current_key = key
            continue

        val: Any = rest.strip('"')
        if val.isdigit():
            val = int(val)
        elif val.replace(".", "", 1).isdigit():
            val = float(val)

        if isinstance(parent, dict):
            parent[key] = val
        elif isinstance(parent, list) and parent and isinstance(parent[-1], dict):
            parent[-1][key] = val

    while list_stack:
        finished = list_stack.pop()
        set_on_parent(finished)
    return root


def load_cleanup_registry(root: Path) -> dict[str, Any]:
    yaml_path = root / "config/cicd/cleanup_registry.yaml"
    json_path = root / "config/cicd/cleanup_registry.json"
    if yaml_path.is_file():
        text = yaml_path.read_text(encoding="utf-8")
        try:
            import yaml  # type: ignore

            data = yaml.safe_load(text)
            if isinstance(data, dict):
                return data
        except Exception:
            pass
        return _minimal_yaml_load(text)
    if json_path.is_file():
        return json.loads(json_path.read_text(encoding="utf-8"))
    return {"actions": [], "preconditions": {}}


def disk_volume_path(path: Path) -> str | None:
    """Return mount point for path via realpath + df."""
    return volume_mount(path)


def volume_mount(path: Path) -> str | None:
    try:
        rp = os.path.realpath(str(path))
        proc = subprocess.run(
            ["df", rp], capture_output=True, text=True, timeout=30, check=False,
        )
        lines = (proc.stdout or "").strip().splitlines()
        if len(lines) >= 2:
            parts = lines[-1].split()
            return parts[-1] if parts else None
    except (OSError, subprocess.TimeoutExpired):
        return None
    return None


def disk_pct(path: Path) -> float | None:
    try:
        u = shutil.disk_usage(path)
        return round((u.used / u.total) * 100.0, 2) if u.total else None
    except OSError:
        return None


def git_loose_count(root: Path) -> int | None:
    try:
        proc = subprocess.run(
            ["git", "-C", str(root), "count-objects", "-v"],
            capture_output=True,
            text=True,
            timeout=120,
            check=False,
        )
        if proc.returncode != 0:
            return None
        for line in (proc.stdout or "").splitlines():
            if line.startswith("count:"):
                return int(line.split(":", 1)[1].strip())
    except (OSError, subprocess.TimeoutExpired, ValueError):
        return None
    return None


def fsck_timeout_sec(*, full: bool, loose_count: int | None) -> int:
    if not full:
        return 60
    base = 600
    raw = os.environ.get("AF_DISK_FSCK_TIMEOUT_SEC", "").strip()
    if raw:
        try:
            base = int(raw)
        except ValueError:
            base = 600
    adaptive = loose_count // 3000 if loose_count else 0
    return max(base, adaptive)


def run_git_fsck(root: Path, *, full: bool, loose_count: int | None) -> tuple[int, str, str]:
    args = ["git", "-C", str(root), "fsck", "--no-progress"]
    mode = "full" if full else "connectivity-only"
    if full:
        args.append("--full")
    else:
        args.append("--connectivity-only")
    timeout = fsck_timeout_sec(full=full, loose_count=loose_count)
    try:
        proc = subprocess.run(args, capture_output=True, text=True, timeout=timeout, check=False)
        out = (proc.stdout or "") + (proc.stderr or "")
        tail = out[-500:]
        if not full:
            SESSION["connectivity_fsck_rc"] = proc.returncode
        SESSION["fsck_output"] = out
        parse_fsck_output(out)
        return proc.returncode, mode, tail
    except (OSError, subprocess.TimeoutExpired) as exc:
        if not full:
            SESSION["connectivity_fsck_rc"] = 125
        return 125, mode, str(exc)


def parse_fsck_output(fsck_out: str) -> None:
    tag_pat = re.compile(
        r"error:\s+refs/tags/([^\s:]+)",
        re.IGNORECASE,
    )
    tags: list[str] = []
    packs: list[str] = []
    for line in fsck_out.splitlines():
        if "refs/tags/" not in line:
            continue
        if not any(
            k in line.lower()
            for k in (
                "does not point to a valid object",
                "invalid sha1 pointer",
                "invalid sha256 pointer",
            )
        ):
            continue
        m = tag_pat.search(line)
        if m:
            tags.append(m.group(1))
        else:
            frag = line.split("refs/tags/", 1)[-1].split(":")[0].strip()
            if frag and frag not in tags:
                tags.append(frag)
        if "far too short to be a packfile" in line.lower():
            packs.append(line.strip())
        if re.search(r"pack-[0-9a-f]+\.pack", line, re.IGNORECASE):
            for pm in re.findall(r"[^\s]*pack-[0-9a-f]+\.pack", line, re.IGNORECASE):
                if pm not in packs:
                    packs.append(pm)
    SESSION["tag_error_tags"] = list(dict.fromkeys(tags))
    SESSION["pack_error_paths"] = list(dict.fromkeys(packs))


def precondition_state(root: Path) -> dict[str, bool]:
    return PreconditionState(root).as_dict()


def _append_action(
    actions: list[dict[str, Any]],
    *,
    id_: str,
    tier: str,
    status: str,
    rc: int | None = None,
    skipped_reason: str | None = None,
    detail: str | None = None,
    owner: str | None = None,
) -> None:
    rec: dict[str, Any] = {"id": id_, "tier": tier, "status": status}
    if rc is not None:
        rec["rc"] = rc
    if skipped_reason:
        rec["skipped_reason"] = skipped_reason
    if detail:
        rec["detail"] = detail
    if owner:
        rec["owner"] = owner
    actions.append(rec)


def repair_broken_tags(root: Path, actions: list[dict[str, Any]]) -> bool:
    ok = True
    for tag in SESSION.get("tag_error_tags") or []:
        proc = subprocess.run(
            ["git", "-C", str(root), "tag", "-d", tag],
            capture_output=True,
            text=True,
            timeout=60,
            check=False,
        )
        if proc.returncode == 0:
            _append_action(
                actions, id_="broken-tag-delete", tier="REPAIR", status="applied",
                rc=0, detail=f"deleted tag {tag}",
            )
        else:
            ok = False
            _append_action(
                actions, id_="broken-tag-delete", tier="REPAIR", status="failed",
                rc=proc.returncode, detail=(proc.stderr or proc.stdout or "")[:200],
            )
    return ok


def repair_pack_quarantine(root: Path, actions: list[dict[str, Any]]) -> bool:
    git_dir = root / ".git"
    pack_dir = git_dir / "objects" / "pack"
    if not pack_dir.is_dir():
        return True
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    dest = root / ".goalie/evidence/quarantine" / ts
    dest.mkdir(parents=True, exist_ok=True)
    moved = 0
    ok = True
    names: set[str] = set()
    for entry in SESSION.get("pack_error_paths") or []:
        for m in re.findall(r"pack-[0-9a-f]+", entry, re.IGNORECASE):
            names.add(m.lower())
    if not names:
        for p in pack_dir.glob("*.pack"):
            if p.stat().st_size < 20:
                names.add(p.stem)
    for stem in names:
        for ext in (".pack", ".idx", ".keep"):
            src = pack_dir / f"{stem}{ext}"
            if not src.is_file() and ext == ".pack":
                src = pack_dir / f"{stem}.pack"
            if src.is_file():
                try:
                    shutil.move(str(src), str(dest / src.name))
                    moved += 1
                except OSError as exc:
                    ok = False
                    _append_action(
                        actions, id_="git-pack-quarantine", tier="REPAIR", status="failed",
                        detail=str(exc),
                    )
    if moved:
        SESSION["quarantine_applied"] = True
        _append_action(
            actions, id_="git-pack-quarantine", tier="REPAIR", status="applied",
            detail=f"quarantined {moved} file(s) to {dest}",
        )
    elif names:
        ok = False
        _append_action(
            actions, id_="git-pack-quarantine", tier="REPAIR", status="failed",
            detail="no pack files moved",
        )
    return ok


def repair_git_fetch(root: Path, actions: list[dict[str, Any]]) -> bool:
    proc = subprocess.run(
        ["git", "-C", str(root), "fetch", "origin"],
        capture_output=True,
        text=True,
        timeout=300,
        check=False,
    )
    if proc.returncode == 0:
        _append_action(
            actions, id_="git-fetch-restore", tier="REPAIR", status="applied", rc=0,
        )
        return True
    _append_action(
        actions, id_="git-fetch-restore", tier="REPAIR", status="failed",
        rc=proc.returncode, detail=(proc.stderr or "")[:200],
    )
    return False


def prune_ephemeral(root: Path, actions: list[dict[str, Any]]) -> None:
    cron = root / ".goalie/cron_state"
    if cron.is_dir():
        cutoff = time.time() - 7 * 86400
        for p in cron.glob("*"):
            try:
                if p.is_file() and p.stat().st_mtime < cutoff:
                    p.unlink()
                    _append_action(
                        actions, id_="goalie-cron-prune", tier="SAFE", status="applied",
                        detail=f"pruned:{p.name}",
                    )
            except OSError:
                pass
    evidence = root / ".goalie/evidence"
    if evidence.is_dir():
        for p in evidence.glob("*.log"):
            try:
                if p.stat().st_size > 1_000_000:
                    p.write_text("", encoding="utf-8")
                    _append_action(
                        actions, id_="ephemeral-evidence-prune", tier="SAFE", status="applied",
                        detail=f"truncated:{p.name}",
                    )
            except OSError:
                pass


def run_deep_clean(root: Path, actions: list[dict[str, Any]]) -> None:
    guardian = root / "scripts/monitoring/tm_disk_guardian.sh"
    if guardian.is_file() and os.environ.get("AF_DISK_STEWARD_DEEP_CLEAN", "0") == "1":
        proc = subprocess.run(
            ["bash", str(guardian), "--cleanup"],
            cwd=str(root),
            capture_output=True,
            text=True,
            check=False,
            timeout=600,
        )
        combined = (proc.stdout or "") + "\n" + (proc.stderr or "")
        parsed = False
        for line in combined.splitlines():
            stripped = line.strip()
            if stripped.startswith("[OK]"):
                parsed = True
                _append_action(
                    actions, id_="tm_disk_guardian", tier="SAFE", status="applied",
                    detail=stripped, owner="guardian",
                )
            elif stripped.startswith("[WARNING]"):
                parsed = True
                _append_action(
                    actions, id_="tm_disk_guardian", tier="SAFE", status="skipped",
                    skipped_reason=stripped, owner="guardian",
                )
            elif stripped.startswith("[ACTION]"):
                parsed = True
                _append_action(
                    actions, id_="tm_disk_guardian", tier="SAFE", status="applied",
                    detail=stripped, owner="guardian",
                )
            elif stripped.startswith("[FATAL]"):
                parsed = True
                _append_action(
                    actions, id_="tm_disk_guardian", tier="SAFE", status="failed",
                    detail=stripped, owner="guardian", rc=proc.returncode,
                )
            elif stripped.startswith("{") and "emit_event" in stripped:
                try:
                    evt = json.loads(stripped)
                    parsed = True
                    _append_action(
                        actions, id_="tm_disk_guardian", tier="SAFE",
                        status="applied" if evt.get("ok", True) else "failed",
                        detail=stripped, owner="guardian",
                    )
                except json.JSONDecodeError:
                    pass
        if not parsed:
            status = "applied" if proc.returncode == 0 else "failed"
            _append_action(
                actions, id_="tm_disk_guardian", tier="SAFE", status=status,
                rc=proc.returncode, detail=combined[-300:], owner="guardian",
            )


def _tier_actions(registry: dict[str, Any], tier: str) -> list[dict[str, Any]]:
    actions = registry.get("actions") or []
    return sorted(
        [a for a in actions if isinstance(a, dict) and a.get("tier") == tier],
        key=lambda x: -float(x.get("wsjf", 0)),
    )


def _compact_allowed(preds: dict[str, bool]) -> tuple[bool, str | None]:
    if not preds.get("git-fsck-connectivity-ok"):
        return False, "precondition:git-fsck-connectivity-ok failed"
    if SESSION.get("repair_unresolved"):
        return False, "unresolved REPAIR failures"
    return True, None


def run_apply_dag(root: Path, loose_count: int | None, registry: dict[str, Any]) -> tuple[list[str], list[dict]]:
    actions: list[dict[str, Any]] = []
    applied_legacy: list[str] = []
    failed_legacy: list[dict] = []

    def mirror_success(aid: str) -> None:
        if aid not in applied_legacy:
            applied_legacy.append(aid)

    def mirror_fail(aid: str, rc: int, hint: str | None = None) -> None:
        entry: dict[str, Any] = {"id": aid, "rc": rc}
        if hint:
            entry["hint"] = hint
        failed_legacy.append(entry)

    # --- SAFE ---
    if os.environ.get("AF_DISK_SKIP_NPM_CACHE", "0") == "1":
        _append_action(
            actions, id_="npm-cache", tier="SAFE", status="skipped",
            skipped_reason="AF_DISK_SKIP_NPM_CACHE=1",
        )
    else:
        npm_rc = subprocess.run(
            ["npm", "cache", "clean", "--force"], check=False, timeout=180,
        ).returncode
        if npm_rc == 0:
            _append_action(actions, id_="npm-cache", tier="SAFE", status="applied", rc=0)
            mirror_success("npm-cache")
        else:
            _append_action(actions, id_="npm-cache", tier="SAFE", status="failed", rc=npm_rc)
            mirror_fail("npm-cache", npm_rc)

    prune_ephemeral(root, actions)
    for a in actions:
        if a.get("tier") == "SAFE" and a.get("status") == "applied":
            mirror_success(str(a["id"]))

    run_deep_clean(root, actions)

    preds = precondition_state(root)
    repair_on = os.environ.get("AF_DISK_STEWARD_REPAIR", "0") == "1"

    # --- REPAIR ---
    if repair_on:
        if preds.get("git-fsck-tag-errors"):
            if not repair_broken_tags(root, actions):
                SESSION["repair_unresolved"] = True
            else:
                run_git_fsck(root, full=False, loose_count=loose_count)
                preds = precondition_state(root)
        if preds.get("git-fsck-pack-errors"):
            if not repair_pack_quarantine(root, actions):
                SESSION["repair_unresolved"] = True
            else:
                run_git_fsck(root, full=False, loose_count=loose_count)
                preds = precondition_state(root)
        if SESSION.get("tag_error_tags") or SESSION.get("pack_error_paths"):
            if not repair_git_fetch(root, actions):
                SESSION["repair_unresolved"] = True
    else:
        for rid in ("broken-tag-delete", "git-pack-quarantine", "git-fetch-restore"):
            _append_action(
                actions, id_=rid, tier="REPAIR", status="skipped",
                skipped_reason="AF_DISK_STEWARD_REPAIR!=1",
            )

    preds = precondition_state(root)
    allow_compact, skip_reason = _compact_allowed(preds)

    # --- COMPACT ---
    if os.environ.get("AF_DISK_SKIP_GIT_GC", "0") == "1":
        _append_action(
            actions, id_="git-gc", tier="COMPACT", status="skipped",
            skipped_reason="AF_DISK_SKIP_GIT_GC=1",
        )
    elif not allow_compact:
        _append_action(
            actions, id_="git-gc", tier="COMPACT", status="skipped",
            skipped_reason=skip_reason or "compact blocked",
        )
    else:
        SESSION["gc_attempted"] = True
        gc_rc = subprocess.run(
            ["git", "-C", str(root), "gc", "--prune=now"], check=False, timeout=300,
        ).returncode
        SESSION["gc_succeeded"] = gc_rc == 0
        if gc_rc == 0:
            _append_action(actions, id_="git-gc", tier="COMPACT", status="applied", rc=0)
            mirror_success("git-gc")
        else:
            _append_action(
                actions, id_="git-gc", tier="COMPACT", status="failed", rc=gc_rc,
                detail="git repo may be corrupt; run repair tier",
            )
            mirror_fail(
                "git-gc", gc_rc,
                hint="git fsck --full && git gc --prune=now",
            )

    if os.environ.get("AF_DISK_SKIP_GIT_REPACK", "0") == "1":
        _append_action(
            actions, id_="git-repack-Ad", tier="COMPACT", status="skipped",
            skipped_reason="AF_DISK_SKIP_GIT_REPACK=1",
        )
    elif not allow_compact:
        _append_action(
            actions, id_="git-repack-Ad", tier="COMPACT", status="skipped",
            skipped_reason=skip_reason or "compact blocked",
        )
    elif loose_count is not None and loose_count >= LOOSE_OBJECT_REPACK_THRESHOLD:
        repack_rc = subprocess.run(
            ["git", "-C", str(root), "repack", "-Ad"], check=False, timeout=600,
        ).returncode
        if repack_rc == 0:
            _append_action(actions, id_="git-repack-Ad", tier="COMPACT", status="applied", rc=0)
            mirror_success("git-repack-Ad")
        else:
            _append_action(actions, id_="git-repack-Ad", tier="COMPACT", status="failed", rc=repack_rc)
            mirror_fail("git-repack-Ad", repack_rc)
    else:
        _append_action(
            actions, id_="git-repack-Ad", tier="COMPACT", status="skipped",
            skipped_reason="loose object count below threshold",
        )

    SESSION["_actions"] = actions
    return applied_legacy, failed_legacy


def _next_recommended(registry: dict[str, Any], actions: list[dict[str, Any]]) -> list[str]:
    success_ids = {a["id"] for a in actions if a.get("status") == "applied"}
    out: list[str] = []
    for entry in sorted(
        [a for a in (registry.get("actions") or []) if isinstance(a, dict)],
        key=lambda x: -float(x.get("wsjf", 0)),
    ):
        aid = str(entry.get("id", ""))
        if aid and aid not in success_ids:
            out.append(aid)
    return out



def _pack_corrupt(fsck_rc: int, failed: list[dict], *, skip_fsck: bool) -> bool:
    if not skip_fsck and fsck_rc != 0:
        return True
    return any(f.get("id") in ("git-gc", "git-repack-Ad") for f in failed)


def _write_json_atomic(path: Path, payload: dict) -> None:
  import json, os
  path.parent.mkdir(parents=True, exist_ok=True)
  tmp = path.with_suffix(path.suffix + ".tmp")
  tmp.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
  os.replace(tmp, path)


def build_payload(root: Path) -> tuple[dict, int]:
    global SESSION
    SESSION = {
        "gc_succeeded": False,
        "gc_attempted": False,
        "quarantine_applied": False,
        "repair_unresolved": False,
        "connectivity_fsck_rc": None,
        "fsck_output": "",
        "tag_error_tags": [],
        "pack_error_paths": [],
    }

    registry = load_cleanup_registry(root)
    low = low_pct()
    apply_thr = apply_pct()
    auto_apply = os.environ.get("AF_DISK_STEWARD_AUTO_APPLY", "0") == "1"
    force_apply = os.environ.get("AF_DISK_STEWARD_APPLY", "0") == "1"

    out = root / ".goalie/evidence/disk_steward_latest.json"
    out.parent.mkdir(parents=True, exist_ok=True)

    vol_path = root
    pct = disk_pct(vol_path)
    mount = disk_volume_path(vol_path)

    def _loose() -> int | None:
        return None if os.environ.get("AF_DISK_SKIP_LOOSE_COUNT") == "1" else git_loose_count(root)

    loose_count = _loose()

    candidates = [
        {"id": a.get("id"), "wsjf": a.get("wsjf"), "tier": a.get("tier")}
        for a in (registry.get("actions") or [])
        if isinstance(a, dict) and a.get("id")
    ]
    if not candidates:
        candidates = [
            {"id": "git-fsck", "wsjf": 9.5, "path": str(root / ".git"), "action": "git fsck"},
            {"id": "git-gc", "wsjf": 9.0, "path": str(root / ".git"), "action": "git gc --prune=now"},
        ]
    candidates.sort(key=lambda x: -float(x.get("wsjf") or 0))

    skip_fsck = os.environ.get("AF_DISK_SKIP_GIT_FSCK", "0") == "1"
    fsck_full = os.environ.get("AF_DISK_GIT_FSCK_FULL", "0") == "1"
    connectivity_only = os.environ.get("AF_DISK_FSCK_CONNECTIVITY_ONLY", "0") == "1"
    fsck_auto_escalated = False
    if skip_fsck:
        fsck_rc, fsck_mode, fsck_err = 0, "skipped", ""
        SESSION["connectivity_fsck_rc"] = 0
    else:
        fsck_rc, fsck_mode, fsck_err = run_git_fsck(root, full=fsck_full, loose_count=loose_count)
    if not fsck_full and not connectivity_only and fsck_rc != 0:
        fsck_rc, fsck_mode, fsck_err = run_git_fsck(root, full=True, loose_count=loose_count)
        fsck_auto_escalated = True
    elif (
        not fsck_full
        and not connectivity_only
        and loose_count is not None
        and loose_count >= LOOSE_OBJECT_REPACK_THRESHOLD
    ):
        fsck_rc, fsck_mode, fsck_err = run_git_fsck(root, full=True, loose_count=loose_count)
        fsck_auto_escalated = True

    if SESSION.get("connectivity_fsck_rc") is None:
        SESSION["connectivity_fsck_rc"] = fsck_rc if fsck_mode == "connectivity-only" else fsck_rc

    low_disk = pct is not None and pct >= low
    should_apply = force_apply or (auto_apply and pct is not None and pct >= apply_thr)
    applied: list[str] = []
    failed: list[dict] = []
    actions: list[dict[str, Any]] = []

    if should_apply and pct is not None:
        applied, failed = run_apply_dag(root, loose_count, registry)
        actions = SESSION.get("_actions") or []
        pct = disk_pct(vol_path)
        loose_count = _loose()

    inbox_zero = pct is not None and pct < low
    blockers: list[dict[str, str]] = []
    if not inbox_zero and pct is not None:
        blockers.append({
            "id": "R-DISK-01",
            "reason": f"disk_used_pct={pct} >= low_threshold_pct={low}",
        })

    pack_corrupt = _pack_corrupt(fsck_rc, failed, skip_fsck=skip_fsck)
    roam_risks: list[str] = []
    if pack_corrupt:
        roam_risks.append("R-PACK-CORRUPT")
    if low_disk:
        roam_risks.append("R-DISK-01")

    payload = {
        "schema": "disk_steward.v1.1",
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "volume": mount,
        "disk_used_pct": pct,
        "low_threshold_pct": low,
        "apply_threshold_pct": apply_thr,
        "inbox_zero_gate": inbox_zero,
        "blockers": blockers,
        "next_recommended": _next_recommended(registry, actions),
        "fsck_auto_escalated": fsck_auto_escalated,
        "pack_corrupt": pack_corrupt,
        "roam_risks": roam_risks,
        "roam_risk": roam_risks[0] if roam_risks else None,
        "triggered_low_disk": low_disk,
        "auto_apply_ran": should_apply,
        "runbook": RUNBOOK,
        "wsjf_ranked_actions": candidates,
        "git_fsck_rc": fsck_rc,
        "git_fsck_mode": fsck_mode,
        "git_fsck_tail": fsck_err,
        "git_loose_object_count": loose_count,
        "actions": actions,
        "applied": applied,
        "failed": failed,
    }
    _write_json_atomic(out, payload)

    exit_code = 0
    if os.environ.get("AF_DISK_STEWARD_ENFORCE", "0") == "1":
        if low_disk or pack_corrupt or (not skip_fsck and fsck_rc != 0):
            exit_code = 2
    return payload, exit_code


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: disk_steward_core.py ROOT", file=sys.stderr)
        return 2
    root = Path(sys.argv[1]).resolve()
    payload, exit_code = build_payload(root)
    print(json.dumps({
        "path": str(root / ".goalie/evidence/disk_steward_latest.json"),
        "disk_used_pct": payload.get("disk_used_pct"),
        "inbox_zero_gate": payload.get("inbox_zero_gate"),
        "low": payload.get("triggered_low_disk"),
        "git_fsck_rc": payload.get("git_fsck_rc"),
        "schema": payload.get("schema"),
    }))
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
