"""Resolve API keys from process env, .env* files, and op:// references."""
from __future__ import annotations

import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from op_secret_cache import OP_REF_RE, op_read

PLACEHOLDER_RE = re.compile(r"(your_|placeholder|_here\b|changeme|xxx)", re.I)
ENV_LINE_RE = re.compile(
    r"^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$"
)

ENV_GLOB_PATTERNS = (
    ".env",
    ".env.*",
    "config/.env",
    "config/.env.*",
)

DEFAULT_OP_VAULT_ITEMS = (
    "op://Personal/tx45jyibgj4naiekva466annbu/Antigravity",
    "op://Personal/Antigravity",
    "op://Personal/Agentics/MCP API Token",
)

DEP_KEY_MAP = {
    "DEP-008": "GEMINI_API_KEY",
    "DEP-009": "ANTHROPIC_API_KEY",
}

COG_RISK_KEY_MAP = {
    "R04": "COGNITUM_WEBHOOK_SECRET",
}

TRACKED_KEYS = tuple(sorted(set(DEP_KEY_MAP.values()) | {
    "ZAI_API_KEY",
    "COGNITUM_WEBHOOK_SECRET",
    "OPENROUTER_API_KEY",
    "HIRE_MCP_TOKEN",
    "E2B_API_KEY",
    "WHM_API_TOKEN",
    "WHOP_DEV_API_KEY",
    "VITE_LINKEDIN_CLIENT_ID",
    "VITE_DISCORD_CLIENT_ID",
    "VITE_TELEGRAM_BOT_ID",
    "GOVERNANCE_SECRET",
    "TLD_GATE_BYPASS_TOKEN",
    "DBOS_POSTGRES_URL",
}))


_VALUE_CACHE: dict[str, tuple[str | None, str]] = {}


def clear_value_cache() -> None:
    _VALUE_CACHE.clear()


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


def _resolve_value(raw: str) -> tuple[str | None, str]:
    value = _strip_quotes(raw)
    if not value:
        return None, "absent"
    if OP_REF_RE.match(value):
        resolved = op_read(value)
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


def _dotenv_value_for_key(path: Path, key: str) -> tuple[str | None, str]:
    """Resolve a single key from one dotenv file (lazy — no op reads for other keys)."""
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return None, "absent"
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        m = ENV_LINE_RE.match(line)
        if not m or m.group(1) != key:
            continue
        val, src = _resolve_value(m.group(2))
        if val:
            rel = f"dotenv:{path.name}"
            return val, rel if src == "dotenv" else src
        return None, src
    return None, "absent"


def _parse_dotenv(path: Path, keys: Iterable[str] | None = None) -> dict[str, str]:
    """Parse dotenv; when keys is set, only resolve those keys (lazy op reads)."""
    want = set(keys) if keys is not None else None
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
        key = m.group(1)
        if want is not None and key not in want:
            continue
        val, _ = _resolve_value(m.group(2))
        if val:
            out[key] = val
    return out


def _vault_scan_enabled() -> bool:
    return os.environ.get("AF_OP_VAULT_SCAN", "0") == "1"


def _scan_op_vault_for_keys(keys: Iterable[str]) -> dict[str, KeyResolution]:
    if not _vault_scan_enabled():
        return {}
    found: dict[str, KeyResolution] = {}
    for ref in DEFAULT_OP_VAULT_ITEMS:
        blob = op_read(ref)
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
                elif key == "ZAI_API_KEY" and len(blob) > 12 and not _is_placeholder(blob):
                    found[key] = KeyResolution(key, True, ref, len(blob))
    return found




def _cache_resolution(key: str, val: str | None, src: str) -> tuple[str | None, str]:
    pair = (val, src)
    if val is not None:
        _VALUE_CACHE[key] = pair
    return pair

def resolve_key_value(key: str, root: Path | None = None) -> tuple[str | None, str]:
    """Resolve one key's secret value and source label."""
    root = root or repo_root()
    cached = _VALUE_CACHE.get(key)
    if cached is not None:
        return cached

    env_val = os.environ.get(key, "")
    if env_val and not _is_placeholder(env_val):
        if OP_REF_RE.match(env_val):
            resolved = op_read(env_val)
            if resolved:
                return _cache_resolution(key, resolved, env_val)
        else:
            return _cache_resolution(key, env_val, "env")

    for path in _env_files(root):
        val, src = _dotenv_value_for_key(path, key)
        if val:
            return _cache_resolution(key, val, src)

    if _vault_scan_enabled():
        hit = _scan_op_vault_for_keys([key]).get(key)
        if hit and hit.present:
            # Vault scan found presence; re-read blob only when scan enabled (rare path).
            for ref in DEFAULT_OP_VAULT_ITEMS:
                blob = op_read(ref)
                if not blob:
                    continue
                for line in blob.splitlines():
                    m = ENV_LINE_RE.match(line.strip())
                    if m and m.group(1) == key:
                        val, _ = _resolve_value(m.group(2))
                        if val:
                            return _cache_resolution(key, val, ref)
                if key == "GEMINI_API_KEY" and "AIza" in blob:
                    return _cache_resolution(key, blob.strip(), ref)
                if key == "ANTHROPIC_API_KEY" and "sk-ant" in blob:
                    return _cache_resolution(key, blob.strip(), ref)
                if key == "ZAI_API_KEY" and len(blob) > 12:
                    return _cache_resolution(key, blob.strip(), ref)

    return _cache_resolution(key, None, "absent")


def resolve_keys(root: Path | None = None, *, keys: Iterable[str] | None = None) -> dict[str, KeyResolution]:
    root = root or repo_root()
    want = list(keys or TRACKED_KEYS)
    results: dict[str, KeyResolution] = {}

    for key in want:
        val, src = resolve_key_value(key, root)
        if val:
            results[key] = KeyResolution(key, True, src, len(val))

    if _vault_scan_enabled():
        op_hits = _scan_op_vault_for_keys(k for k in want if k not in results)
        results.update(op_hits)

    for key in want:
        if key not in results:
            results[key] = KeyResolution(key, False, "absent", 0)
    return results


def sync_roam_env_deps(
    root: Path | None = None,
    *,
    dry_run: bool = False,
    keys: dict[str, KeyResolution] | None = None,
) -> list[str]:
    import yaml
    from datetime import datetime, timezone

    root = root or repo_root()
    resolved_ids: list[str] = []
    keys = keys or resolve_keys(root)
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


def sync_roam_cog_env_deps(
    root: Path | None = None,
    *,
    dry_run: bool = False,
    keys: dict[str, KeyResolution] | None = None,
) -> list[str]:
    """Resolve environment-backed ROAM risks in ROAM_TRACKER_COG.yaml."""
    import yaml
    from datetime import datetime, timezone

    root = root or repo_root()
    resolved_ids: list[str] = []
    keys = keys or resolve_keys(root)
    cog_path = root / ".goalie" / "ROAM_TRACKER_COG.yaml"
    if not cog_path.is_file():
        return resolved_ids

    data = yaml.safe_load(cog_path.read_text(encoding="utf-8", errors="replace")) or {}
    risks = data.get("risks") or []
    changed = False
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    for risk in risks:
        rid = str(risk.get("id") or "")
        key_name = COG_RISK_KEY_MAP.get(rid)
        if not key_name:
            continue
        if str(risk.get("status", "")).lower() == "resolved":
            continue
        hit = keys.get(key_name)
        if hit and hit.present:
            if not dry_run:
                risk["status"] = "resolved"
                risk["roam"] = "Resolved"
                risk["resolution"] = f"{key_name} present via {hit.source}"
                risk["resolved_at"] = now_iso
                risk["last_verified"] = now_iso
                risk["last_result"] = f"env_key_resolver: {key_name} len={hit.value_len}"
            resolved_ids.append(rid)
            changed = True

    if changed and not dry_run:
        text = yaml.dump(data, default_flow_style=False, sort_keys=False)
        cog_path.write_text(text, encoding="utf-8")
    return resolved_ids




def tick_bootstrap(root: Path | None = None) -> tuple[str, list[str], list[str]]:
    """Single-process tick env bootstrap: resolve once, forbid OP, sync ROAM, emit exports."""
    root = root or repo_root()
    clear_value_cache()
    keys = resolve_keys(root)
    os.environ["AF_SKIP_OP_READ"] = "1"
    os.environ.pop("AF_ALLOW_OP_READ", None)
    dep_ids = sync_roam_env_deps(root, keys=keys)
    cog_ids = sync_roam_cog_env_deps(root, keys=keys)
    exports = export_shell(root=root)
    return exports, dep_ids, cog_ids

def export_shell(keys: Iterable[str] | None = None, *, root: Path | None = None) -> str:
    """Emit export statements for resolved keys (never prints secret values to logs elsewhere)."""
    import shlex

    root = root or repo_root()
    want = list(keys or TRACKED_KEYS)
    lines: list[str] = []
    for key in want:
        val, _ = resolve_key_value(key, root)
        if val and not _is_placeholder(val):
            lines.append(f"export {key}={shlex.quote(val)}")
    return "\n".join(lines) + ("\n" if lines else "")


def main() -> int:
    import argparse
    import json
    import sys

    parser = argparse.ArgumentParser(description="Resolve env API keys from .env* and op://")
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--sync-roam", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--export-shell", action="store_true", help="Print export statements for resolved keys")
    parser.add_argument(
        "--tick-bootstrap",
        action="store_true",
        help="One OP pass: resolve keys, sync ROAM (main+cog), emit export-shell (no second resolve)",
    )
    args = parser.parse_args()

    root = repo_root()
    if args.tick_bootstrap:
        exports, dep_ids, cog_ids = tick_bootstrap(root)
        sys.stderr.write(
            f"tick_bootstrap: roam_deps={','.join(dep_ids) or 'none'} "
            f"cog_deps={','.join(cog_ids) or 'none'}\n"
        )
        sys.stdout.write(exports)
        return 0
    if args.export_shell:
        sys.stdout.write(export_shell(root=root))
        return 0
    if args.sync_roam:
        if os.environ.get("AF_SKIP_OP_READ") == "1":
            keys = resolve_keys(root)
        else:
            clear_value_cache()
            keys = resolve_keys(root)
            os.environ["AF_SKIP_OP_READ"] = "1"
        ids = sync_roam_env_deps(root, dry_run=args.dry_run, keys=keys)
        sync_roam_cog_env_deps(root, dry_run=args.dry_run, keys=keys)
        if args.json:
            print(json.dumps({"resolved": ids, "keys": {k: v.__dict__ for k, v in keys.items()}}, indent=2))
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
