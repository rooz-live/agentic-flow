#!/usr/bin/env python3
# scorecard_gate.py - Originality/Impact scorecard gate
# MPP: method=evaluate_scorecard | pattern=verifiable_gate | protocol=exit_code
# AISP: Safety (hard gates block), Idempotency (pure function of input), Precision (typed scoring)
#
# PURPOSE: Turn the Originality/Impact rubric into an executable gate.
#   Originality = Improbability x Resonance x NewRelationship   [hard gate: Coherence==PASS]
#   TailPenalty = sum(severity_i * ROAM_mult_i) * BlastRadius
#   Impact_net  = (BaselineValue + RewardDirection - TailPenalty) * CoD_Weight
#
# SOURCES (first that resolves wins):
#   --file PATH         read scorecard JSON from a file
#   --pr-body PATH|-     extract a fenced ```scorecard / ```json block from PR/MR body text
#   --precommit         read default file (.goalie/scorecards/current.json); soft-skip if absent
#   (stdin)             raw JSON piped in
#
# EXIT: 0 = SHIP, 1 = SPIKE/DROP (keep off main), 2 = BLOCK (hard-gate violation), 3 = usage/parse error
# BYPASS: there is none by design - that is the point of the Cycle Breaker.
# VERIFY: --verify replaces self-asserted fields with verified signals --
#   coherence <- real checks (cargo/pytest/...), gate_integrity <- CI/AF_GATE_CONTEXT,
#   plus anti-replay binding to the current commit/diff.

import argparse
import ast
import datetime
import hashlib
import json
import os
import re
import shlex
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any, Optional

# ROAM disposition -> fraction of tail severity that still counts against Impact.
ROAM_PENALTY = {
    "resolved": 0.0,   # eliminated
    "mitigated": 0.5,  # reduced + bounded
    "owned": 1.0,      # tracked, alert/monitor exists
    "accepted": 1.0,   # chosen with eyes open - no crying at the casino
}
VALID_BLAST = {0.5, 1.0, 1.5}
VALID_COD = {0.5, 1.0, 1.5}
SHIP_THRESHOLD = float(os.environ.get("AF_SHIP_THRESHOLD", "2.0"))
DEFAULT_SCORECARD = os.environ.get(
    "AF_SCORECARD_FILE", ".goalie/scorecards/current.json"
)

DISPOSITION_EXIT = {"SHIP": 0, "SPIKE": 1, "DROP": 1, "BLOCK": 2}

SIGNAL_TIMEOUT = int(os.environ.get("AF_SIGNAL_TIMEOUT", "600"))
VERIFY_SIGNALS_FILE = os.environ.get(
    "AF_VERIFY_SIGNALS", ".goalie/scorecards/verify_signals.json"
)
# Default coherence signals (override via the file above). Heavy on purpose:
# coherence must be EARNED by real checks, not declared.
DEFAULT_SIGNALS = [
    {"name": "cargo-check", "cmd": ["cargo", "check", "--quiet"], "required": True},
    {
        "name": "pytest",
        "cmd": [
            "python3",
            "-m",
            "pytest",
            "tests/pytest/",
            "tests/gates/",
            "--rootdir=.",
            "-q",
            "--tb=line",
        ],
        "required": True,
    },
    {
        "name": "no-invented-symbols",
        "cmd": [
            "python3", "-c",
            "import sys; sys.path.insert(0, '.'); from scripts.gates.scorecard_gate import run_no_invented_symbols; sys.exit(0 if run_no_invented_symbols('.') else 1)"
        ],
        "required": True,
    },
]
GATE_CONTEXTS = {"ci", "review", "precommit"}
EVIDENCE_DIR = os.environ.get("AF_EVIDENCE_DIR", ".goalie/evidence")
APPROVALS_FILE = os.environ.get("AF_APPROVALS_FILE", ".goalie/scorecards/approvals.txt")


def _num(value: Any) -> Optional[float]:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    return None


def extract_from_text(text: str) -> Optional[dict]:
    """Pull a scorecard JSON object out of free-form PR/MR body text.

    Accepts any fenced code block (```scorecard / ```json / untagged) or an
    HTML-commented <!-- SCORECARD --> ... <!-- /SCORECARD --> region whose body
    parses as a JSON object containing an "originality" key. The whole block
    body is parsed, so nested JSON is handled correctly.
    """
    fenced = re.findall(r"```[^\n]*\n(.*?)```", text, re.DOTALL)
    commented = re.findall(
        r"<!--\s*SCORECARD\s*-->(.*?)<!--\s*/SCORECARD\s*-->",
        text,
        re.DOTALL | re.IGNORECASE,
    )
    raw_blocks = list(fenced) + list(commented)
    
    scorecard_blocks = []
    for blob in raw_blocks:
        try:
            obj = json.loads(blob.strip())
            if isinstance(obj, dict) and "originality" in obj:
                scorecard_blocks.append(obj)
        except json.JSONDecodeError:
            continue

    if len(scorecard_blocks) > 1:
        raise ValueError("Multiple scorecard blocks found in text")
    if not scorecard_blocks:
        return None
    return scorecard_blocks[0]


def load_scorecard(args: argparse.Namespace) -> Optional[dict]:
    if args.file:
        with open(args.file, "r", encoding="utf-8") as fh:
            return json.load(fh)
    if args.pr_body is not None:
        text = sys.stdin.read() if args.pr_body == "-" else open(
            args.pr_body, "r", encoding="utf-8"
        ).read()
        return extract_from_text(text)
    if args.precommit:
        if not os.path.exists(DEFAULT_SCORECARD):
            return None
        with open(DEFAULT_SCORECARD, "r", encoding="utf-8") as fh:
            return json.load(fh)
    # stdin fallback
    data = sys.stdin.read().strip()
    if not data:
        return None
    return json.loads(data)


def evaluate(card: dict, *, derive: bool = False, root_path: Any = ".", ingest_only: bool = False) -> dict:
    """Pure evaluation. Returns disposition, scores, and the reasons behind them."""
    errors: list[str] = []
    warnings: list[str] = []

    orig = card.get("originality", {}) or {}
    impact = card.get("impact", {}) or {}

    # Missing required originality field validation
    required_orig = ["improbability", "resonance", "new_relationship", "coherence"]
    for f in required_orig:
        if f not in orig:
            errors.append(f"Missing required originality field: {f}")

    # Missing required impact field validation
    required_impact = ["baseline_value", "reward_direction", "gate_integrity", "cod_weight", "blast_radius", "sign_off"]
    gates = card.get("gates", {}) or {}
    for f in required_impact:
        if f not in impact and f not in card and f not in gates:
            errors.append(f"Missing required impact field: {f}")

    # Validation of enums
    baseline_value = _num(impact.get("baseline_value"))
    reward_direction = _num(impact.get("reward_direction"))
    blast_radius = _num(impact.get("blast_radius"))
    cod_weight = _num(impact.get("cod_weight"))
    
    reversibility = _num(impact.get("reversibility"))
    if reversibility is None:
        warnings.append("reversibility is missing; assuming 2 (fully reversible)")
        reversibility = 2.0
    elif reversibility not in (0, 1, 2):
        errors.append("reversibility must be 0, 1, or 2")

    if baseline_value is None:
        errors.append("impact.baseline_value must be a number")
    if reward_direction is None:
        errors.append("impact.reward_direction must be a number")

    if cod_weight is not None and cod_weight not in VALID_COD:
        errors.append(f"cod_weight must be in {VALID_COD}")
    if blast_radius is not None and blast_radius not in VALID_BLAST:
        errors.append(f"blast_radius must be in {VALID_BLAST}")

    # Safe math fallbacks
    baseline_val = baseline_value if baseline_value is not None else 0.0
    reward_dir = reward_direction if reward_direction is not None else 0.0
    br = blast_radius if (blast_radius is not None and blast_radius in VALID_BLAST) else 1.0
    cw = cod_weight if (cod_weight is not None and cod_weight in VALID_COD) else 1.0

    # --- Coherence and gate integrity derivation ---
    if derive:
        coherence = derive_coherence(root_path, force_dynamic=False, ingest_only=ingest_only)
        gate_integrity = derive_gate_integrity()
    else:
        coherence = str(orig.get("coherence", "")).upper()
        gates = card.get("gates", {}) or {}
        gate_integrity = str(gates.get("gate_integrity", impact.get("gate_integrity", ""))).upper()

    # --- Originality ---
    improbability = _num(orig.get("improbability"))
    resonance = _num(orig.get("resonance"))
    
    new_rel_val = orig.get("new_relationship", False)
    new_relationship = (new_rel_val is True) or (isinstance(new_rel_val, str) and "new" in new_rel_val.lower())

    if improbability is None or resonance is None:
        errors.append("originality.improbability/resonance must be numbers 0-3")
        improbability = improbability or 0.0
        resonance = resonance or 0.0
    originality_score = improbability * resonance * (1.0 if new_relationship else 0.0)

    if coherence != "PASS":
        errors.append("coherence is not PASS")
        originality_score = 0.0

    # --- Tail penalty + ROAM enforcement (no crying at the casino) ---
    tail_penalty = 0.0
    tails = impact.get("tail_risks", impact.get("tails", []))
    if not isinstance(tails, list) or not tails:
        warnings.append("no tails enumerated; assuming zero tail risk (verify this!)")
    else:
        for i, tail in enumerate(tails):
            name = (tail or {}).get("name", f"tail[{i}]")
            disp = tail.get("disposition", tail.get("roam", ""))
            disp_clean = str(disp).strip().lower()
            if disp_clean not in ROAM_PENALTY:
                errors.append("untagged tail risk present")
                continue
            
            if tail.get("penalty") is not None:
                tail_penalty += float(tail.get("penalty"))
            else:
                severity = _num((tail or {}).get("severity"))
                if severity is None:
                    errors.append(f"tail '{name}': severity must be a number")
                    severity = 0.0
                tail_penalty += severity * ROAM_PENALTY[disp_clean]
                
    tail_penalty *= br

    impact_net = (baseline_val + reward_dir - tail_penalty) * cw

    # --- Hard-gate overrides ---
    env = dict(os.environ)
    is_ci = str(env.get("CI", "")).lower() in ("1", "true", "yes") or "GITHUB_ACTIONS" in env
    if is_ci:
        if gate_integrity != "PASS":
            errors.append("gate_integrity is not PASS")
    else:
        if gate_integrity not in ("PASS", "OWNED"):
            errors.append("gate_integrity is not PASS")
    if reward_direction is not None and reward_direction < 0:
        errors.append("reward_direction is negative")
        
    sign_off = card.get("sign_off", impact.get("sign_off", False))
    if reversibility == 0 and br == 1.5 and sign_off is not True:
        errors.append("one-way door (REV0 x BR1.5) requires sign_off")

    # --- Disposition ---
    if errors:
        disposition = "BLOCK"
    else:
        impact_high = impact_net >= SHIP_THRESHOLD and reward_dir >= 0
        originality_high = originality_score >= 4.0
        if impact_high:
            disposition = "SHIP"
        elif originality_high:
            disposition = "SPIKE"  # keep off main; route to experiment
        else:
            disposition = "DROP"

    res = {
        "disposition": disposition,
        "decision": disposition,
        "originality_score": round(originality_score, 3),
        "tail_penalty": round(tail_penalty, 3),
        "impact_net": round(impact_net, 3),
        "ship_threshold": SHIP_THRESHOLD,
        "errors": errors,
        "blocks": errors,
        "warnings": warnings,
    }
    if derive:
        res["derived_coherence"] = coherence
        res["derived_gate_integrity"] = gate_integrity
    return res


# --------------------------------------------------------------------------- #
# Hardening: replace self-asserted fields with verified signals
# --------------------------------------------------------------------------- #
def load_signals() -> list:
    """Load coherence signal definitions (file overrides DEFAULT_SIGNALS).

    In CI/pre-commit verification mode, restrict overrides of test configurations
    unless the signature is verified against a trusted principal.
    """
    env = os.environ

    is_ci = str(env.get("CI", "")).lower() in ("1", "true", "yes") or "GITHUB_ACTIONS" in env
    is_precommit = env.get("AF_GATE_CONTEXT") == "precommit"
    verify_mode = is_ci or is_precommit or str(env.get("AF_VERIFY_MODE", "0")) == "1"

    if not os.path.exists(VERIFY_SIGNALS_FILE):
        return DEFAULT_SIGNALS

    try:
        with open(VERIFY_SIGNALS_FILE, "r", encoding="utf-8") as fh:
            data = json.load(fh)
    except Exception:
        return DEFAULT_SIGNALS

    if isinstance(data, list):
        if verify_mode:
            # Untrusted override list without dict signature envelope
            return DEFAULT_SIGNALS
        return data

    if not isinstance(data, dict):
        return DEFAULT_SIGNALS

    signals = data.get("signals")
    if not signals:
        return DEFAULT_SIGNALS

    if not verify_mode:
        return signals

    # In verification mode (CI/precommit), we strictly check signature
    allowed_signers = env.get("AF_ALLOWED_SIGNERS", ".goalie/scorecards/allowed_signers")
    sig = data.get("signature")
    principal = data.get("principal")

    if os.path.exists(allowed_signers) and sig and principal:
        # Re-serialize the signals section in canonical form to verify
        canonical = json.dumps(signals, sort_keys=True)
        if verify_ssh_signature(sig, principal, canonical, allowed_signers):
            return signals

    # Signature verification failed or allowed_signers missing
    return DEFAULT_SIGNALS


def run_signals(signals: list, timeout: int = SIGNAL_TIMEOUT) -> list:
    """Execute each signal as a subprocess; capture pass/fail. Never raises."""
    results = []
    for sig in signals:
        name = sig.get("name", "?")
        cmd = sig.get("cmd")
        required = bool(sig.get("required", True))
        if isinstance(cmd, str):
            cmd = shlex.split(cmd)
        entry = {"name": name, "required": required}
        if not cmd:
            entry.update(returncode=2, ok=False, note="no cmd specified")
            results.append(entry)
            continue
        try:
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
            entry["returncode"] = proc.returncode
            entry["ok"] = proc.returncode == 0
        except FileNotFoundError:
            entry.update(returncode=127, ok=False, note=f"not found: {cmd[0]}")
        except subprocess.TimeoutExpired:
            entry.update(returncode=124, ok=False, note=f"timed out after {timeout}s")
        except Exception as exc:  # a probe must never crash the gate
            entry.update(returncode=1, ok=False, note=str(exc))
        results.append(entry)
    return results


def run_cargo_check(root: Any) -> bool:
    try:
        res = subprocess.run(["cargo", "check", "--quiet"], cwd=str(root), capture_output=True)
        return res.returncode == 0
    except Exception:
        return False


def run_pytest_check(root: Any) -> bool:
    try:
        res = subprocess.run([
            "python3", "-m", "pytest",
            "tests/billing/", "tests/pytest/", "tests/gates/",
            "--rootdir=.", "-q", "--tb=line"
        ], cwd=str(root), capture_output=True)
        return res.returncode == 0
    except Exception:
        return False


def run_no_invented_symbols(root: Any) -> bool:
    # 1. Get the list of modified/added/untracked files
    env = dict(os.environ)
    files = set()
    
    # Staged files
    staged = _git(["diff", "--cached", "--name-only"], root=root)
    if staged:
        files.update(staged.splitlines())
        
    # Unstaged files
    unstaged = _git(["diff", "--name-only"], root=root)
    if unstaged:
        files.update(unstaged.splitlines())
        
    # Untracked files
    untracked = _git(["ls-files", "--others", "--exclude-standard"], root=root)
    if untracked:
        files.update(untracked.splitlines())
        
    # If AF_DIFF_BASE is set, check diff against base
    base = env.get("AF_DIFF_BASE")
    if base:
        base_diff = _git(["diff", f"{base}...HEAD", "--name-only"], root=root)
        if base_diff:
            files.update(base_diff.splitlines())

    if not files:
        return True

    # Tracked/disk files cache helper
    tracked_out = _git(["ls-files"], root=root)
    tracked_files = set(tracked_out.splitlines()) if tracked_out else set()

    def is_exempt(file_path: str) -> bool:
        if any(part.startswith(".") for part in Path(file_path).parts):
            return True
        exempt_prefixes = ("scripts/gates/", "scripts/ci/", "scripts/deploy/", "tests/pytest/")
        if file_path.startswith(exempt_prefixes):
            return True
        return False

    for file_path in sorted(files):
        file_path = file_path.strip()
        if not file_path or is_exempt(file_path):
            continue

        full_path = Path(root) / file_path
        if not full_path.exists() or not full_path.is_file():
            continue

        ext = full_path.suffix
        if ext not in (".py", ".rs", ".ts", ".js", ".tsx", ".jsx"):
            continue

        try:
            content = full_path.read_text(encoding="utf-8")
        except Exception:
            continue

        if ext == ".py":
            try:
                tree = ast.parse(content)
            except SyntaxError:
                return False

            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        parts = alias.name.split(".")
                        if parts[0] in ("src", "tests", "config", "tooling", "domain", "scripts", "validation"):
                            target_path = Path(root) / "/".join(parts)
                            possible_paths = [
                                target_path.with_suffix(".py"),
                                target_path / "__init__.py"
                            ]
                            resolved = False
                            for p in possible_paths:
                                try:
                                    rel_to_root = p.relative_to(Path(root)).as_posix()
                                except ValueError:
                                    rel_to_root = None
                                if rel_to_root and rel_to_root in tracked_files:
                                    resolved = True
                                    break
                            if not resolved:
                                return False
                elif isinstance(node, ast.ImportFrom):
                    module_name = node.module or ""
                    level = node.level or 0
                    if level > 0:
                        parent_dir = full_path.parent
                        for _ in range(level - 1):
                            parent_dir = parent_dir.parent
                        if module_name:
                            parts = module_name.split(".")
                            target_path = parent_dir / "/".join(parts)
                            possible_paths = [
                                target_path.with_suffix(".py"),
                                target_path / "__init__.py"
                            ]
                            resolved = False
                            for p in possible_paths:
                                try:
                                    rel_to_root = p.relative_to(Path(root)).as_posix()
                                except ValueError:
                                    rel_to_root = None
                                if rel_to_root and rel_to_root in tracked_files:
                                    resolved = True
                                    break
                            if not resolved:
                                return False
                        else:
                            if not parent_dir.exists():
                                return False
                    else:
                        if module_name:
                            parts = module_name.split(".")
                            if parts[0] in ("src", "tests", "config", "tooling", "domain", "scripts", "validation"):
                                target_path = Path(root) / "/".join(parts)
                                possible_paths = [
                                    target_path.with_suffix(".py"),
                                    target_path / "__init__.py"
                                ]
                                resolved = False
                                for p in possible_paths:
                                    try:
                                        rel_to_root = p.relative_to(Path(root)).as_posix()
                                    except ValueError:
                                        rel_to_root = None
                                    if rel_to_root and rel_to_root in tracked_files:
                                        resolved = True
                                        break
                                if not resolved:
                                    return False

        elif ext == ".rs":
            for line in content.splitlines():
                line = line.strip()
                if not line or line.startswith("//"):
                    continue
                m_mod = re.match(r"^mod\s+(\w+)\s*;$", line)
                if m_mod:
                    mod_name = m_mod.group(1)
                    parent_dir = full_path.parent
                    possible_files = [
                        parent_dir / f"{mod_name}.rs",
                        parent_dir / mod_name / "mod.rs"
                    ]
                    resolved = False
                    for p in possible_files:
                        try:
                            rel_to_root = p.relative_to(Path(root)).as_posix()
                        except ValueError:
                            rel_to_root = None
                        if (rel_to_root and rel_to_root in tracked_files):
                            resolved = True
                            break
                    if not resolved:
                        return False

        elif ext in (".ts", ".js", ".tsx", ".jsx"):
            for line in content.splitlines():
                line = line.strip()
                if not line or line.startswith("//") or line.startswith("/*"):
                    continue
                m_import = re.search(r"from\s+['\"](\.\.?/[^'\"]+)['\"]", line)
                m_require = re.search(r"require\s*\(\s*['\"](\.\.?/[^'\"]+)['\"]\s*\)", line)
                m_direct = re.search(r"import\s+['\"](\.\.?/[^'\"]+)['\"]", line)

                target_rel = None
                if m_import:
                    target_rel = m_import.group(1)
                elif m_require:
                    target_rel = m_require.group(1)
                elif m_direct:
                    target_rel = m_direct.group(1)

                if target_rel:
                    parent_dir = full_path.parent
                    target_path = (parent_dir / target_rel).resolve()
                    possible_extensions = [
                        "",
                        ".ts", ".tsx", ".d.ts", ".js", ".jsx",
                        "/index.ts", "/index.tsx", "/index.js", "/index.jsx"
                    ]
                    resolved = False
                    for suffix in possible_extensions:
                        p = Path(str(target_path) + suffix)
                        try:
                            rel_to_root = p.relative_to(Path(root)).as_posix()
                        except ValueError:
                            rel_to_root = None
                        if (rel_to_root and rel_to_root in tracked_files):
                            resolved = True
                            break
                    if not resolved:
                        return False

    return True



def derive_coherence(root_path_or_results: Any, force_dynamic: bool = False, ingest_only: bool = False) -> str:
    if isinstance(root_path_or_results, list):
        required = [r for r in root_path_or_results if r.get("required", True)]
        if not required:
            return "FAIL"
        return "PASS" if all(r.get("ok") for r in required) else "FAIL"

    root_path = root_path_or_results
    if force_dynamic:
        ok = run_cargo_check(root_path) and run_pytest_check(root_path) and run_no_invented_symbols(root_path)
        return "PASS" if ok else "FAIL"

    path = Path(root_path) / ".goalie" / "evidence" / "coherence_results.json"
    if not path.exists():
        return "FAIL"
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        coherence = data.get("coherence")
        gh = data.get("git_head")
        current_head = git_head(root_path)
        if gh != current_head:
            return "FAIL"
            
        env = dict(os.environ)
        is_ci = str(env.get("CI", "")).lower() in ("1", "true", "yes") or "GITHUB_ACTIONS" in env
        allowed_signers = env.get("AF_ALLOWED_SIGNERS", ".goalie/scorecards/allowed_signers")
        
        sig = data.get("signature")
        principal = data.get("principal")
        
        if os.path.exists(allowed_signers):
            if not sig or not principal:
                return "FAIL"
            if not verify_ssh_signature(sig, principal, gh, allowed_signers):
                return "FAIL"
        else:
            if is_ci or sig or principal:
                return "FAIL"

        return str(coherence).upper()
    except Exception:
        return "FAIL"


class GateIntegrityResult(str):
    def __new__(cls, val, reason=""):
        obj = super().__new__(cls, val)
        obj.reason = reason
        return obj

    def __iter__(self):
        return iter((str(self), self.reason))

    def __getitem__(self, item):
        if item == 0:
            return str(self)
        if item == 1:
            return self.reason
        return super().__getitem__(item)


def derive_gate_integrity(env: Optional[dict] = None) -> GateIntegrityResult:
    if env is None:
        env = dict(os.environ)
    is_ci = str(env.get("CI", "")).lower() in ("1", "true", "yes") or "GITHUB_ACTIONS" in env
    allowed_signers = env.get("AF_ALLOWED_SIGNERS", ".goalie/scorecards/allowed_signers")
    if is_ci:
        event = env.get("GITHUB_EVENT_NAME", "")
        if event not in ("pull_request", "pull_request_review"):
            return GateIntegrityResult("FAIL", "invalid CI event")
            
        if os.path.exists(allowed_signers):
            prov_sig = env.get("AF_CI_PROVENANCE_SIGNATURE")
            prov_principal = env.get("AF_CI_PROVENANCE_PRINCIPAL")
            if not prov_sig or not prov_principal:
                return GateIntegrityResult("FAIL", "CI context requires cryptographic provenance signature")
            actual_commit = git_head()
            if not actual_commit or not verify_ssh_signature(prov_sig, prov_principal, actual_commit, allowed_signers):
                return GateIntegrityResult("FAIL", "CI provenance signature verification failed")
            return GateIntegrityResult("PASS", f"CI execution context verified via signature from {prov_principal}")
            
        return GateIntegrityResult("FAIL", "CI context requires allowed_signers configuration")
        
    context = env.get("AF_GATE_CONTEXT", "")
    if context in GATE_CONTEXTS:
        return GateIntegrityResult("PASS", f"valid context: {context}")
    return GateIntegrityResult("OWNED", "no valid execution context (local fallback)")


def _git(args: list, timeout: int = 30, root: Any = ".") -> Optional[str]:
    try:
        proc = subprocess.run(
            ["git"] + args, capture_output=True, text=True, timeout=timeout, cwd=str(root)
        )
        return proc.stdout if proc.returncode == 0 else None
    except Exception:
        return None


def git_head(root: Any = ".") -> Optional[str]:
    out = _git(["rev-parse", "HEAD"], root=root)
    return out.strip() if out else None


def current_diff_sha(env: dict) -> Optional[str]:
    """SHA-256 of the relevant diff: BASE...HEAD if AF_DIFF_BASE set, else staged."""
    base = env.get("AF_DIFF_BASE")
    out = _git(["diff", f"{base}...HEAD"]) if base else _git(["diff", "--cached"])
    if out is None:
        return None
    return hashlib.sha256(out.encode("utf-8")).hexdigest()


def check_binding(card: dict, actual_commit, actual_diff_sha, strict: bool) -> tuple:
    """Anti-replay: the scorecard must be bound to THIS commit/diff."""
    blocks: list = []
    warns: list = []
    claimed_commit = card.get("commit")
    claimed_diff = card.get("diff_sha256")
    if claimed_commit is None and claimed_diff is None:
        msg = "scorecard has no binding (commit/diff_sha256); may be stale/reused"
        (blocks if strict else warns).append(("HARD GATE: " if strict else "") + msg)
        return blocks, warns
    if claimed_commit and actual_commit and claimed_commit != actual_commit:
        blocks.append(
            f"HARD GATE: scorecard.commit {claimed_commit[:12]} != HEAD "
            f"{actual_commit[:12]} (stale scorecard)"
        )
    if claimed_diff and actual_diff_sha and claimed_diff != actual_diff_sha:
        blocks.append("HARD GATE: scorecard.diff_sha256 != current diff (stale)")
    return blocks, warns


def collect_reward_proxies(env: dict) -> dict:
    """Cheap, objective proxies for reward direction (Anti-CVT: untracked sprawl)."""
    proxies: dict = {}
    # Scope to src/ and cap time: in a huge / home-dir repo an unscoped
    # `git ls-files --others` can enumerate the entire tree and hang.
    out = _git(["ls-files", "--others", "--exclude-standard", "--", "src"], timeout=10)
    if out is not None:
        proxies["untracked_added"] = sum(
            1 for line in out.splitlines() if line.startswith("src/")
        )
    return proxies


def derive_reward_direction(proxies: dict) -> tuple:
    """Signed proxy for reward direction. Negative signals dominate."""
    notes: list = []
    rd = 1
    untracked = proxies.get("untracked_added", 0)
    if untracked > 0:
        rd = -1
        notes.append(f"{untracked} new untracked src/ file(s) (Anti-CVT)")
    return rd, notes


def path_is_tracked(path: str, root: str = ".") -> bool:
    """True if path is in the git index (every referenced path must resolve)."""
    return _git(["ls-files", "--error-unmatch", "--", path], root=root) is not None


def find_invented_paths(refs: list, root: str = ".") -> list:
    """Referenced paths that resolve nowhere (git index or disk) = confabulated."""
    return [p for p in (refs or []) if p and not path_is_tracked(p, root)]


def verify_ssh_signature(signature_str: str, principal: str, message: str, allowed_signers_path: str) -> bool:
    """Validate a signature of the message string using ssh-keygen -Y verify."""
    try:
        with tempfile.NamedTemporaryFile(mode="w", delete=False) as sig_file:
            sig_file.write(signature_str)
            sig_file_path = sig_file.name
        try:
            # Run ssh-keygen verify on stdin input
            proc = subprocess.run(
                [
                    "ssh-keygen",
                    "-Y", "verify",
                    "-f", allowed_signers_path,
                    "-I", principal,
                    "-n", "scorecard-gate",
                    "-s", sig_file_path
                ],
                input=message.encode("utf-8"),
                capture_output=True,
                timeout=10
            )
            return proc.returncode == 0
        finally:
            os.remove(sig_file_path)
    except Exception:
        return False


def verify_signoff(card: dict, env: dict, actual_commit, actual_diff) -> tuple:
    """External approval for THIS commit/diff. The card's boolean is never trusted.

    Option 1: Cryptographic Signatures (SSH)
    """
    allowed_signers_path = env.get("AF_ALLOWED_SIGNERS", ".goalie/scorecards/allowed_signers")
    is_ci = str(env.get("CI", "")).lower() in ("1", "true", "yes") or "GITHUB_ACTIONS" in env
    
    # Determine if this is a one-way door (REV0 x BR1.5)
    impact = card.get("impact", {}) or {}
    reversibility = _num(impact.get("reversibility"))
    blast_radius = _num(impact.get("blast_radius"))
    is_one_way_door = (reversibility == 0 and blast_radius == 1.5)
    
    is_enforcing = is_ci or str(env.get("AF_STRICT_SIGN_OFF", "0")) == "1" or is_one_way_door
    
    # Check if cryptographic signing is enabled/enforced
    if os.path.exists(allowed_signers_path) or is_enforcing:
        if not os.path.exists(allowed_signers_path):
            return False, "allowed_signers file is missing in enforcing/CI mode"
        principal = card.get("sign_off_principal") or card.get("impact", {}).get("sign_off_principal")
        signature = card.get("sign_off_signature") or card.get("impact", {}).get("sign_off_signature")
        if not principal or not signature:
            return False, "allowed_signers exists but no sign_off_principal or sign_off_signature provided"
            
        if actual_commit and verify_ssh_signature(signature, principal, actual_commit, allowed_signers_path):
            return True, f"cryptographically verified sign-off for commit by {principal}"
            
        if actual_diff and verify_ssh_signature(signature, principal, actual_diff, allowed_signers_path):
            return True, f"cryptographically verified sign-off for diff by {principal}"
            
        return False, f"cryptographic signature verification failed for principal {principal}"

    # Fallback to legacy behavior if allowed_signers does not exist AND not in enforcing mode
    token = str(env.get("AF_SIGNOFF", "")).strip()
    if token and token in (actual_commit, actual_diff):
        kind = "commit" if token == actual_commit else "diff"
        return True, f"AF_SIGNOFF matches {kind} (legacy mode)"
    try:
        if os.path.exists(APPROVALS_FILE):
            with open(APPROVALS_FILE, "r", encoding="utf-8") as fh:
                for line in fh:
                    line = line.strip()
                    if line and not line.startswith("#") and line in (actual_commit, actual_diff):
                        return True, f"approvals file entry matches {line[:12]} (legacy mode)"
    except OSError:
        pass
    return False, "no external approval matching current commit/diff (legacy mode)"


def harden(card: dict, *, env: dict, strict: bool, ingest_only: bool = False) -> tuple:
    """Override self-asserted fields with verified signals.

    Returns (hardened_card, extra_blocks, extra_warnings, meta).
    """
    extra_blocks: list = []
    extra_warnings: list = []
    meta: dict = {}

    # Enforce allowed_signers presence in CI context
    allowed_signers = env.get("AF_ALLOWED_SIGNERS", ".goalie/scorecards/allowed_signers")
    is_ci = str(env.get("CI", "")).lower() in ("1", "true", "yes") or "GITHUB_ACTIONS" in env
    if is_ci and not os.path.exists(allowed_signers):
        extra_blocks.append("HARD GATE: CI context requires allowed_signers configuration")

    # 1) coherence <- real signals
    if ingest_only:
        coherence = derive_coherence(".", force_dynamic=False)
        meta["coherence_ingested"] = True
    else:
        old_verify_mode = os.environ.get("AF_VERIFY_MODE")
        os.environ["AF_VERIFY_MODE"] = "1"
        try:
            results = run_signals(load_signals())
        finally:
            if old_verify_mode is not None:
                os.environ["AF_VERIFY_MODE"] = old_verify_mode
            else:
                os.environ.pop("AF_VERIFY_MODE", None)
        coherence = derive_coherence(results)
        meta["signals"] = results

    # GATE-004: no-invented-paths -- referenced paths must resolve (index or disk)
    refs = card.get("referenced_paths") or card.get("impact", {}).get("referenced_paths") or []
    invented = find_invented_paths(refs)
    if invented:
        coherence = "FAIL"
        extra_blocks.append(
            "HARD GATE: invented paths (not in git index or on disk): "
            + ", ".join(invented)
        )
        meta["invented_paths"] = invented
    if card.get("originality") is None:
        card["originality"] = {}
    card["originality"]["coherence"] = coherence
    meta["coherence_derived"] = coherence

    # 2) gate_integrity <- execution provenance
    gi, reason = derive_gate_integrity(env)
    if card.get("gates") is None:
        card["gates"] = {}
    card["gates"]["gate_integrity"] = gi
    meta["gate_integrity_derived"] = gi
    meta["gate_integrity_reason"] = reason

    # 3) anti-replay binding <- git
    actual_commit = git_head()
    actual_diff = current_diff_sha(env)
    meta["commit"] = actual_commit
    meta["diff_sha256"] = actual_diff
    b, w = check_binding(card, actual_commit, actual_diff, strict)
    extra_blocks += b
    extra_warnings += w

    # GATE-003: sign_off <- external approval (never the self-asserted boolean)
    verified_signoff, so_reason = verify_signoff(card, env, actual_commit, actual_diff)
    card["sign_off"] = verified_signoff
    meta["sign_off_verified"] = verified_signoff
    meta["sign_off_reason"] = so_reason

    # 4) reward_direction <- proxy (GATE-006)
    #    Default advisory (warn). With AF_RD_ENFORCE=1 a negative objective signal
    #    overrides the asserted value (blocks). Enforcement is opt-in because the
    #    $HOME-rooted repo's untracked sprawl makes the bare untracked-delta proxy
    #    noisy until a real per-diff baseline exists.
    proxies = collect_reward_proxies(env)
    rd_proxy, rnotes = derive_reward_direction(proxies)
    meta["reward_direction_proxy"] = rd_proxy
    is_ci = str(env.get("CI", "")).lower() in ("1", "true", "yes") or "GITHUB_ACTIONS" in env
    enforce_rd = str(env.get("AF_RD_ENFORCE", "1" if is_ci else "0")) == "1"
    meta["reward_direction_enforced"] = enforce_rd
    asserted = card.get("impact", {}).get("reward_direction")
    if enforce_rd and rd_proxy < 0:
        card.setdefault("impact", {})["reward_direction"] = rd_proxy
        extra_warnings.append(
            f"reward_direction overridden to {rd_proxy} by objective signals "
            f"({'; '.join(rnotes)})"
        )
    elif isinstance(asserted, (int, float)) and not isinstance(asserted, bool):
        if (asserted >= 0) != (rd_proxy >= 0):
            extra_warnings.append(
                f"reward_direction asserted {asserted} but proxy={rd_proxy} "
                f"({'; '.join(rnotes) or 'no negative signals'})"
            )
    return card, extra_blocks, extra_warnings, meta


def finalize(result: dict, extra_blocks: list, extra_warnings: list, meta: dict) -> dict:
    """Merge hardening blocks/warnings into an evaluate() result."""
    if extra_blocks:
        result["blocks"] = list(result["blocks"]) + extra_blocks
        result["disposition"] = "BLOCK"
    if extra_warnings:
        result["warnings"] = list(result["warnings"]) + extra_warnings
    result["verification"] = meta
    return result


def _write_evidence(result: dict) -> Optional[str]:
    """Persist the result+verification as evidence (best-effort)."""
    try:
        os.makedirs(EVIDENCE_DIR, exist_ok=True)
        commit = (result.get("verification", {}) or {}).get("commit") or "nocommit"
        ts = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        path = os.path.join(EVIDENCE_DIR, f"scorecard-{commit[:12]}-{ts}.json")
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(result, fh, indent=2)
        return path
    except OSError:
        return None


def render_human(result: dict) -> str:
    icon = {"SHIP": "✅", "SPIKE": "🧪", "DROP": "🗑️", "BLOCK": "🛑"}.get(
        result["disposition"], "?"
    )
    lines = [
        f"{icon} disposition: {result['disposition']}",
        f"   originality_score = {result['originality_score']}",
        f"   tail_penalty      = {result['tail_penalty']}",
        f"   impact_net        = {result['impact_net']} (ship >= {result['ship_threshold']})",
    ]
    v = result.get("verification")
    if v:
        lines.append(
            f"   \u21b3 verified: coherence={v.get('coherence_derived')} "
            f"gate_integrity={v.get('gate_integrity_derived')} "
            f"commit={(v.get('commit') or '-')[:12]}"
        )
    for w in result["warnings"]:
        lines.append(f"   ⚠️  {w}")
    for b in result["blocks"]:
        lines.append(f"   ✗ {b}")
    return "\n".join(lines)


def main(argv: Optional[list] = None) -> int:
    parser = argparse.ArgumentParser(description="Originality/Impact scorecard gate")
    src = parser.add_mutually_exclusive_group()
    src.add_argument("--file", help="path to scorecard JSON")
    src.add_argument("--pr-body", help="path to PR/MR body text, or '-' for stdin")
    src.add_argument(
        "--precommit",
        action="store_true",
        help=f"read {DEFAULT_SCORECARD}; soft-skip if absent unless AF_REQUIRE_SCORECARD=1",
    )
    parser.add_argument("--json", action="store_true", help="emit JSON result")
    parser.add_argument(
        "--verify",
        action="store_true",
        help="derive coherence (real signals), gate_integrity (CI/AF_GATE_CONTEXT), "
        "and anti-replay binding (git); these OVERRIDE self-asserted fields",
    )
    parser.add_argument(
        "--ingest-only",
        action="store_true",
        help="ingest CI-produced results artifact rather than running checks inline",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="treat a missing diff binding as a hard block (use in CI)",
    )
    parser.add_argument(
        "--emit-evidence",
        action="store_true",
        help=f"write result+verification JSON under {EVIDENCE_DIR}/",
    )
    args = parser.parse_args(argv)

    env = dict(os.environ)
    is_ci = str(env.get("CI", "")).lower() in ("1", "true", "yes") or "GITHUB_ACTIONS" in env
    is_precommit = env.get("AF_GATE_CONTEXT") == "precommit" or args.precommit
    verify_mode = args.verify or is_ci or is_precommit

    require = env.get("AF_REQUIRE_SCORECARD", "0") == "1"

    try:
        card = load_scorecard(args)
    except (OSError, json.JSONDecodeError) as exc:
        print(f"scorecard-gate: could not read scorecard: {exc}", file=sys.stderr)
        return 3

    if card is None:
        msg = "scorecard-gate: no scorecard found"
        if require:
            print(f"🛑 {msg} and AF_REQUIRE_SCORECARD=1 -> BLOCK", file=sys.stderr)
            return 2
        print(f"{msg}; skipping (set AF_REQUIRE_SCORECARD=1 to enforce).")
        return 0

    extra_blocks: list = []
    extra_warnings: list = []
    meta: dict = {}
    if verify_mode:
        card, extra_blocks, extra_warnings, meta = harden(
            card, env=env, strict=args.strict, ingest_only=args.ingest_only
        )

    result = evaluate(card)
    if verify_mode:
        result = finalize(result, extra_blocks, extra_warnings, meta)
    elif not args.json:
        print("note: self-asserted scorecard (run with --verify to verify signals)")

    if args.emit_evidence:
        path = _write_evidence(result)
        if path:
            print(f"evidence written: {path}")

    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print(render_human(result))

    return DISPOSITION_EXIT.get(result["disposition"], 2)


if __name__ == "__main__":
    sys.exit(main())
