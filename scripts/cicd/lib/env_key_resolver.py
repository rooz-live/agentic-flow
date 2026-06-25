"""Resolve API keys from process env, .env* files, and op:// references."""
from __future__ import annotations

import os
import re
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

PLACEHOLDER_RE = re.compile(r"(your_|placeholder|_here\b|changeme|xxx)", re.I)
ENV_LINE_RE = re.compile(
    r"^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$"
)
OP_REF_RE = re.compile(r"^op://")

ENV_GLOB_PATTERNS = (
    ".env",
    ".env.*",
    "config/.env",
    "config/.env.*",
)

DEFAULT_OP_VAULT_ITEMS = (
    "op://Personal/tx45jyibgj4naiekva466annbu/Antigravity",
    "op://Personal/Antigravity",
)

DEP_KEY_MAP = {
    "DEP-008": "GEMINI_API_KEY",
    "DEP-009": "ANTHROPIC_API_KEY",
}

TRACKED_KEYS = tuple(sorted(set(DEP_KEY_MAP.values())))


@dataclass(frozen=True)
class KeyResolution:
    name: str
    present: bool
    source: str
    value_len: int = 0


def repo_root() -> Path:
    env = os.environ.get("REPO_ROOT")
    if env:
        return Path(env)
    return Path(__file__).resolve().parents[3]


def _strip_quotes(raw: str) -> str:
    s = raw.strip()
    if len(s) >= 2 and s[0] == s[-1] and s[0] in ("'", '"'):
        return s[1:-1]
    return s


def _is_placeholder(value: str) -> bool:
    if not value or not value.strip():
        return True
    return bool(PLACEHOLDER_RE.search(value))


def _op_read(ref: str) -> str | None:
    if not OP_REF_RE.match(ref):
        return None
    if os.environ.get("AF_SKIP_OP_READ") == "1":
        return None
    try:
        proc = subprocess.run(
            ["op", "read", ref],
            capture_output=True,
            text=True,
            timeout=60,
            check=False,
        )
        if proc.returncode == 0:
            val = proc.stdout.strip()
            if val and not _is_placeholder(val):
                return val
    except (OSError, subprocess.TimeoutExpired):
        pass
    return None


def _resolve_value(raw: str) -> tuple[str | None, str]:
    value = _strip_quotes(raw)
    if not value:
        return None, "absent"
    if OP_REF_RE.match(value):
        resolved = _op_read(value)
        if resolved:
            return resolved, value
        return None, value
    if _is_placeholder(value):
        return None, "placeholder"
    return value, "dotenv"


def _env_files(root: Path) -> list[Path]:
    seen: set[Path] = set()
    files: list[Path] = []
    for pattern in ENV_GLOB_PATTERNS:
        for path in sorted(root.glob(pattern)):
            if not path.is_file():
                continue
            name = path.name
            if name.endswith(".example") or name.endswith(".template"):
                continue
            rp = path.resolve()
            if rp in seen:
                continue
            seen.add(rp)
            files.append(path)
    return files


def _parse_dotenv(path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return out
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        m = ENV_LINE_RE.match(line)
        if not m:
            continue
        key, raw_val = m.group(1), m.group(2)
        val, _ = _resolve_value(raw_val)
        if val:
            out[key] = val
    return out


def _scan_op_vault_for_keys(keys: Iterable[str]) -> dict[str, KeyResolution]:
    found: dict[str, KeyResolution] = {}
    for ref in DEFAULT_OP_VAULT_ITEMS:
        blob = _op_read(ref)
        if not blob:
            continue
        upper = blob.upper()
        for key in keys:
            if key in found:
                continue
            for line in blob.splitlines():
                m = ENV_LINE_RE.match(line.strip())
                if m and m.group(1) == key:
                    val, _ = _resolve_value(m.group(2))
                    if val:
                        found[key] = KeyResolution(key, True, ref, len(val))
                        break
            if key not in found and len(blob) > 8 and not _is_placeholder(blob):
                if key == "GEMINI_API_KEY" and ("AIza" in blob or "GEMINI" in upper):
                    found[key] = KeyResolution(key, True, ref, len(blob))
                elif key == "ANTHROPIC_API_KEY" and ("sk-ant" in blob or "ANTHROPIC" in upper):
                    found[key] = KeyResolution(key, True, ref, len(blob))
    return found


def resolve_keys(root: Path | None = None, *, keys: Iterable[str] | None = None) -> dict[str, KeyResolution]:
    root = root or repo_root()
    want = list(keys or TRACKED_KEYS)
    results: dict[str, KeyResolution] = {}

    for key in want:
        env_val = os.environ.get(key, "")
        if env_val and not _is_placeholder(env_val):
            if OP_REF_RE.match(env_val):
                resolved = _op_read(env_val)
                if resolved:
                    results[key] = KeyResolution(key, True, env_val, len(resolved))
                    continue
            else:
                results[key] = KeyResolution(key, True, "env", len(env_val))
                continue

    for path in _env_files(root):
        dotenv = _parse_dotenv(path)
        for key in want:
            if key in results:
                continue
            val = dotenv.get(key)
            if val:
                results[key] = KeyResolution(key, True, f"dotenv:{path.relative_to(root)}", len(val))

    op_hits = _scan_op_vault_for_keys(k for k in want if k not in results)
    results.update(op_hits)

    for key in want:
        if key not in results:
            results[key] = KeyResolution(key, False, "absent", 0)
    return results


def sync_roam_env_deps(root: Path | None = None, *, dry_run: bool = False) -> list[str]:
    import yaml
    from datetime import datetime, timezone

    root = root or repo_root()
    resolved_ids: list[str] = []
    keys = resolve_keys(root)
    roam_path = root / ".goalie" / "ROAM_TRACKER.yaml"
    if not roam_path.is_file():
        return resolved_ids

    data = yaml.safe_load(roam_path.read_text(encoding="utf-8")) or {}
    deps = data.get("dependencies") or []
    changed = False
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    for dep in deps:
        dep_id = str(dep.get("id") or "")
        key_name = DEP_KEY_MAP.get(dep_id)
        if not key_name:
            continue
        if str(dep.get("status", "")).lower() == "resolved":
            continue
        hit = keys.get(key_name)
        if hit and hit.present:
            if not dry_run:
                dep["status"] = "resolved"
                dep["resolution"] = f"{key_name} present via {hit.source}"
                dep["resolved_at"] = now_iso
            resolved_ids.append(dep_id)
            changed = True

    if changed and not dry_run:
        text = yaml.dump(data, default_flow_style=False, sort_keys=False)
        roam_path.write_text(text, encoding="utf-8")
        (root / "ROAM_TRACKER.yaml").write_text(text, encoding="utf-8")
    return resolved_ids


def main() -> int:
    import argparse
    import json

    parser = argparse.ArgumentParser(description="Resolve env API keys from .env* and op://")
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--sync-roam", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    root = repo_root()
    if args.sync_roam:
        ids = sync_roam_env_deps(root, dry_run=args.dry_run)
        if args.json:
            print(json.dumps({"resolved": ids, "keys": {k: v.__dict__ for k, v in resolve_keys(root).items()}}, indent=2))
        else:
            print(f"resolved_deps={','.join(ids) or 'none'}")
        return 0

    keys = resolve_keys(root)
    if args.json:
        print(json.dumps({k: v.__dict__ for k, v in keys.items()}, indent=2))
    else:
        for k, v in keys.items():
            print(f"{k}: present={v.present} source={v.source} len={v.value_len}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
