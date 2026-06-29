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
import atexit
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

_temp_files = []

def cleanup_temp_files():
    for p in _temp_files:
        try:
            os.remove(p)
        except OSError:
            pass

atexit.register(cleanup_temp_files)


def get_allowed_signers_db(env: dict, root_path: str = ".") -> str:
    is_ci = str(env.get("CI", "")).lower() in ("1", "true", "yes") or "GITHUB_ACTIONS" in env
    global_path = Path(root_path) / ".goalie/scorecards/allowed_signers"
    if is_ci and str(env.get("AF_ALLOW_TEST_OVERRIDE", "")).lower() not in ("1", "true", "yes"):
        # Strictly ignore AF_ALLOWED_SIGNERS override in CI context to prevent tampering
        return str(global_path)

    override = env.get("AF_ALLOWED_SIGNERS")
    if override:
        return override
    
    local_path = Path(root_path) / ".goalie/scorecards/allowed_signers.local"
    
    if global_path.exists() and local_path.exists():
        try:
            with tempfile.NamedTemporaryFile(mode="w", delete=False, prefix="allowed_signers_", suffix=".db") as tf:
                tf.write(global_path.read_text(encoding="utf-8"))
                tf.write("\n")
                tf.write(local_path.read_text(encoding="utf-8"))
                temp_path = tf.name
            _temp_files.append(temp_path)
            return temp_path
        except Exception:
            return str(global_path)
            
    if local_path.exists():
        return str(local_path)
    return str(global_path)


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



def _coerce_new_relationship(val: Any) -> tuple:
    """Strict bool gate with optional meaningful phrase (not loose substring match)."""
    if val is True:
        return True, None
    if val is False or val is None:
        return False, None
    if isinstance(val, str):
        s = val.strip()
        if not s:
            return False, None
        lower = s.lower()
        if lower in ("true", "false", "yes", "no", "1", "0"):
            return False, "new_relationship string must be a meaningful phrase, not a boolean literal"
        
        # Check for negation words
        import re
        negation_pattern = re.compile(r"\b(no|not|false|none|never|without|reject|non)\b", re.IGNORECASE)
        positive_pattern = re.compile(r"\bnew\b", re.IGNORECASE)
        
        if negation_pattern.search(lower):
            return False, "new_relationship contains negation words"
        if positive_pattern.search(lower):
            return True, None
        return False, "new_relationship must be boolean true or a phrase containing 'new'"
    return False, "new_relationship must be boolean true"


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
    else:
        if not (0.0 <= baseline_value <= 3.0):
            errors.append("impact.baseline_value must be between 0 and 3")

    if reward_direction is None:
        errors.append("impact.reward_direction must be a number")
    else:
        if not (-1.0 <= reward_direction <= 1.5):
            errors.append("impact.reward_direction must be between -1 and 1.5")

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
    new_relationship, nr_warn = _coerce_new_relationship(new_rel_val)
    if nr_warn:
        warnings.append(nr_warn)

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

    deploy_receipt_meta: Optional[dict] = None
    if derive:
        receipt_ok, receipt_doc, receipt_msg = verify_deploy_uapi_receipt(root_path)
        if receipt_doc is not None:
            deploy_receipt_meta = {
                "ok": receipt_ok,
                "message": receipt_msg,
                "tld_gate_github_run_id": receipt_doc.get("tld_gate_github_run_id"),
                "tld_gate_conclusion": receipt_doc.get("tld_gate_conclusion"),
            }
            if not receipt_ok:
                errors.append(f"deploy-uapi receipt not closed: {receipt_msg}")

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
        if deploy_receipt_meta is not None:
            res["deploy_uapi_receipt"] = deploy_receipt_meta
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
    allowed_signers = get_allowed_signers_db(env, ".")
    sig = data.get("signature")
    principal = data.get("principal")

    if os.path.exists(allowed_signers) and sig and principal:
        # Re-serialize the signals section in canonical form to verify
        canonical = json.dumps(signals, sort_keys=True)
        if verify_ssh_signature(sig, principal, canonical, allowed_signers):
            return signals

    # Local precommit may use the repo's unsigned verify_signals.json (lighter than DEFAULT_SIGNALS).
    # Reject unsigned changes locally (if verify_signals.json itself is modified/untracked).
    if is_precommit and not is_ci and signals:
        status = _git(["status", "--porcelain", VERIFY_SIGNALS_FILE])
        if not (status and status.strip()):
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
            # Run signals in a clean environment so scorecard-internal flags
            # (AF_VERIFY_MODE, AF_GATE_CONTEXT) do not leak into the test suite
            # and cause false self-test failures.
            signal_env = {k: v for k, v in os.environ.items() if k not in ("AF_VERIFY_MODE", "AF_GATE_CONTEXT")}
            root_abs = str(Path(".").resolve())
            existing_pythonpath = os.environ.get("PYTHONPATH", "")
            if existing_pythonpath:
                signal_env["PYTHONPATH"] = f"{root_abs}:{existing_pythonpath}"
            else:
                signal_env["PYTHONPATH"] = root_abs
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, env=signal_env)
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




def _resolve_python_module(root: Any, module_name: str, tracked_files: set) -> bool:
    """Return True if a top-level repo module path resolves to tracked files."""
    if not module_name:
        return True
    parts = module_name.split(".")
    if parts[0] not in ("src", "tests", "config", "tooling", "domain", "scripts", "validation"):
        return True
    target_path = Path(root) / "/".join(parts)
    for p in (target_path.with_suffix(".py"), target_path / "__init__.py"):
        try:
            rel_to_root = p.relative_to(Path(root)).as_posix()
        except ValueError:
            rel_to_root = None
        if rel_to_root and rel_to_root in tracked_files:
            return True
    return False


def _dynamic_import_call_ok(node: ast.Call, root: Any, tracked_files: set) -> bool:
    """Reject dynamic imports of invented in-repo modules (importlib / __import__)."""
    func = node.func
    
    is_import_module = False
    is_dunder_import = False
    
    if isinstance(func, ast.Attribute) and func.attr == "import_module":
        base = func.value
        if isinstance(base, ast.Name) and base.id == "importlib":
            is_import_module = True
    elif isinstance(func, ast.Name) and func.id == "__import__":
        is_dunder_import = True
        
    if not (is_import_module or is_dunder_import):
        return True
        
    module_name = None
    if node.args and isinstance(node.args[0], ast.Constant) and isinstance(node.args[0].value, str):
        module_name = node.args[0].value
    elif node.keywords:
        for kw in node.keywords:
            if kw.arg == "name" and isinstance(kw.value, ast.Constant) and isinstance(kw.value.value, str):
                module_name = kw.value.value
                break
                
    if module_name is not None:
        return _resolve_python_module(root, module_name, tracked_files)
        
    return True


PACKAGE_ALIASES = {
    "yaml": "pyyaml",
    "pyyaml": "yaml",
}

# Native/Rust-built modules that are not installed via pip but are allowed
# because they are built from the local workspace.
NATIVE_MODULE_ALIASES = {
    "eventops_pyo3": "eventops_pyo3",
}


def get_allowed_python_packages(root: str) -> set[str]:
    req_path = Path(root) / "requirements.txt"
    packages = set()
    if req_path.is_file():
        for line in req_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            m = re.match(r"^([a-zA-Z0-9_\-]+)", line)
            if m:
                name = m.group(1).lower().replace("-", "_")
                packages.add(name)
    return packages


def get_allowed_node_packages(root: str) -> set[str]:
    pkg_path = Path(root) / "package.json"
    packages = set()
    if pkg_path.is_file():
        try:
            with open(pkg_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            for section in ("dependencies", "devDependencies"):
                if section in data and isinstance(data[section], dict):
                    for pkg in data[section].keys():
                        name = pkg.lower().replace("-", "_")
                        packages.add(name)
        except Exception:
            pass
    return packages


_LOCAL_MODULE_CACHE: dict[str, set[str]] = {}


def _local_module_names(root: str) -> set[str]:
    if root in _LOCAL_MODULE_CACHE:
        return _LOCAL_MODULE_CACHE[root]
    names: set[str] = set()
    try:
        # Fast path: use tracked files to avoid scanning the whole tree
        proc = subprocess.run(
            ["git", "ls-files", "*.py"],
            cwd=str(root),
            capture_output=True,
            text=True,
            timeout=30,
        )
        if proc.returncode == 0:
            for line in proc.stdout.splitlines():
                p = Path(line)
                if p.name == "__init__.py":
                    if p.parent.name:
                        names.add(p.parent.name)
                else:
                    names.add(p.stem)
                # Treat any intermediate directory under scripts/ or src/ as a
                # potential package prefix (e.g., scripts/cicd/lib/receipt.py → lib).
                for part in p.parts[1:-1] if p.parts[0] in ("scripts", "src") else []:
                    names.add(part)
            _LOCAL_MODULE_CACHE[root] = names
            return names
    except Exception:
        pass
    root_path = Path(root)
    for search_dir in (root_path, root_path / "src", root_path / "scripts", root_path / "domain"):
        if not search_dir.is_dir():
            continue
        for p in search_dir.rglob("*.py"):
            if p.name == "__init__.py":
                if p.parent != search_dir:
                    names.add(p.parent.name)
            else:
                names.add(p.stem)
    _LOCAL_MODULE_CACHE[root] = names
    return names


def is_local_module(root: str, module_name: str) -> bool:
    if module_name in _local_module_names(root):
        return True
    root_path = Path(root)
    p_dir = root_path / module_name
    p_file = root_path / f"{module_name}.py"
    return p_dir.is_dir() or p_file.is_file()


def audit_pytest_imports(root: str) -> bool:
    allowed_py = get_allowed_python_packages(root)
    allowed_node = get_allowed_node_packages(root)
    allowed_all = allowed_py | allowed_node | set(NATIVE_MODULE_ALIASES.keys())
    
    import sys
    std_lib = set(getattr(sys, "stdlib_module_names", [])) | set(sys.builtin_module_names) | {"__future__", "sys", "os"}
    
    pytest_dir = Path(root) / "tests" / "pytest"
    if not pytest_dir.is_dir():
        return True
        
    for p in pytest_dir.rglob("*.py"):
        try:
            content = p.read_text(encoding="utf-8")
            tree = ast.parse(content)
        except Exception:
            continue
            
        for node in ast.walk(tree):
            modules = []
            if isinstance(node, ast.Import):
                for alias in node.names:
                    modules.append(alias.name.split(".")[0])
            elif isinstance(node, ast.ImportFrom) and node.module:
                if node.level > 0:
                    continue
                modules.append(node.module.split(".")[0])
                
            for mod in modules:
                mod_norm = mod.lower().replace("-", "_")
                alias = PACKAGE_ALIASES.get(mod_norm)
                if mod in std_lib:
                    continue
                if is_local_module(root, mod):
                    continue
                if mod_norm in allowed_all or (alias and alias in allowed_all):
                    continue
                
                print(f"🛑 Import audit violation in {p.relative_to(root)}: untracked dependency '{mod}'", file=sys.stderr)
                return False
    return True


def run_no_invented_symbols(root: Any) -> bool:
    if not audit_pytest_imports(root):
        return False

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
    untracked_files = {line.strip() for line in untracked.splitlines() if line.strip()} if untracked else set()
    files.update(untracked_files)

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
    root_resolved = Path(root).resolve()

    def is_exempt(file_path: str) -> bool:
        if any(part.startswith(".") for part in Path(file_path).parts):
            return True
        return False

    for file_path in sorted(files):
        file_path = file_path.strip()
        if not file_path or is_exempt(file_path):
            continue

        full_path = root_resolved / file_path
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
                print(f"no-invented-symbols: SyntaxError in {file_path}", file=sys.stderr)
                return False

            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        parts = alias.name.split(".")
                        if parts[0] in ("src", "tests", "config", "tooling", "domain", "scripts", "validation"):
                            target_path = root_resolved / "/".join(parts)
                            possible_paths = [
                                target_path.with_suffix(".py"),
                                target_path / "__init__.py"
                            ]
                            resolved = False
                            for p in possible_paths:
                                try:
                                    rel_to_root = p.relative_to(root_resolved).as_posix()
                                except ValueError:
                                    rel_to_root = None
                                if rel_to_root and rel_to_root in tracked_files:
                                    resolved = True
                                    break
                            if not resolved:
                                try:
                                    dir_rel = target_path.relative_to(root_resolved).as_posix()
                                    if any(f == dir_rel or f.startswith(f"{dir_rel}/") for f in tracked_files):
                                        resolved = True
                                except ValueError:
                                    pass
                            if not resolved:
                                print(f"no-invented-symbols: Unresolved import alias '{alias.name}' in {file_path}", file=sys.stderr)
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
                                    rel_to_root = p.relative_to(root_resolved).as_posix()
                                except ValueError:
                                    rel_to_root = None
                                if rel_to_root and rel_to_root in tracked_files:
                                    resolved = True
                                    break
                            if not resolved:
                                try:
                                    dir_rel = target_path.relative_to(root_resolved).as_posix()
                                    if any(f == dir_rel or f.startswith(f"{dir_rel}/") for f in tracked_files):
                                        resolved = True
                                except ValueError:
                                    pass
                            if not resolved:
                                print(f"no-invented-symbols: Unresolved relative import '{module_name}' in {file_path}", file=sys.stderr)
                                return False
                        else:
                            if not parent_dir.exists():
                                return False
                    else:
                        if module_name:
                            parts = module_name.split(".")
                            if parts[0] in ("src", "tests", "config", "tooling", "domain", "scripts", "validation"):
                                target_path = root_resolved / "/".join(parts)
                                possible_paths = [
                                    target_path.with_suffix(".py"),
                                    target_path / "__init__.py"
                                ]
                                resolved = False
                                for p in possible_paths:
                                    try:
                                        rel_to_root = p.relative_to(root_resolved).as_posix()
                                    except ValueError:
                                        rel_to_root = None
                                    if rel_to_root and rel_to_root in tracked_files:
                                        resolved = True
                                        break
                                if not resolved:
                                    try:
                                        dir_rel = target_path.relative_to(root_resolved).as_posix()
                                        if any(f == dir_rel or f.startswith(f"{dir_rel}/") for f in tracked_files):
                                            resolved = True
                                    except ValueError:
                                        pass
                                if not resolved:
                                    print(f"no-invented-symbols: Unresolved absolute import '{module_name}' in {file_path}", file=sys.stderr)
                                    return False
                elif isinstance(node, ast.Call):
                    if not _dynamic_import_call_ok(node, root, tracked_files):
                        print(f"no-invented-symbols: Unresolved dynamic import call in {file_path}", file=sys.stderr)
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
                            rel_to_root = p.relative_to(root_resolved).as_posix()
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
                            rel_to_root = p.relative_to(root_resolved).as_posix()
                        except ValueError:
                            rel_to_root = None
                        if (rel_to_root and rel_to_root in tracked_files):
                            resolved = True
                            break
                    if not resolved:
                        return False

    return True





def stamp_local_coherence_signature(artifact_path: str, root: str = ".") -> bool:
    """Sign coherence_results.json with workspace key when present (pre-commit / local runs)."""
    key_path = Path(root) / ".goalie" / "scorecards" / "workspace_signer"
    allowed_db = get_allowed_signers_db(dict(os.environ), root)
    principal = os.environ.get("AF_LOCAL_SIGN_PRINCIPAL", "workspace@local")
    if not key_path.exists() or not os.path.exists(allowed_db):
        return False
    try:
        with open(artifact_path, "r", encoding="utf-8") as fh:
            data = json.load(fh)
    except (OSError, json.JSONDecodeError):
        return False
    gh = data.get("git_head")
    if not gh:
        return False
    sig_path = tempfile.NamedTemporaryFile(delete=False, suffix=".sig").name
    try:
        proc = subprocess.run(
            [
                "ssh-keygen", "-Y", "sign",
                "-f", str(key_path),
                "-n", "scorecard-gate",
                "-s", sig_path,
            ],
            input=gh.encode("utf-8"),
            capture_output=True,
            timeout=10,
        )
        if proc.returncode != 0:
            return False
        with open(sig_path, "r", encoding="utf-8") as sf:
            sig_content = sf.read()
        # Some OpenSSH versions emit the signature on stdout instead of the -s file.
        if not sig_content and proc.stdout:
            sig_content = proc.stdout.decode("utf-8")
        if not sig_content:
            return False
        if not verify_ssh_signature(sig_content, principal, gh, allowed_db):
            return False
        data["signature"] = sig_content
        data["principal"] = principal
        with open(artifact_path, "w", encoding="utf-8") as fh:
            json.dump(data, fh, indent=2)
        return True
    except Exception:
        return False
    finally:
        try:
            os.remove(sig_path)
        except OSError:
            pass

def _coherence_artifact_usable(root_path: Any, env: Optional[dict] = None) -> bool:
    """True when a fresh PASS coherence_results.json exists for HEAD."""
    env = env or dict(os.environ)
    path = Path(root_path) / ".goalie" / "evidence" / "coherence_results.json"
    if not path.is_file():
        return False
    try:
        with open(path, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        if str(data.get("coherence", "")).upper() != "PASS":
            return False
        gh = data.get("git_head")
        current = git_head(root_path)
        if gh and current and gh != current:
            return False
        return True
    except (OSError, json.JSONDecodeError, TypeError):
        return False




def deploy_receipt_applicable(art: dict, root_path: Any) -> tuple[bool, str]:
    """Only enforce receipt when artifact is post-hardening and bound to current HEAD."""
    if "tld_gate_status" not in art:
        return False, "legacy artifact (no tld_gate_status) — enforcement skipped"
    art_hash = str(art.get("hash") or "").strip()
    head = git_head(root_path) or ""
    if not art_hash:
        return False, "deploy artifact missing hash — enforcement skipped"
    if head and art_hash != head:
        return False, f"stale deploy artifact (hash {art_hash[:12]} != HEAD {head[:12]}) — enforcement skipped"
    return True, "artifact bound to HEAD"


def verify_deploy_uapi_receipt(root_path: Any) -> tuple[bool, Optional[dict], str]:
    """When a fresh deploy-uapi artifact exists for HEAD, require closed TLD gate receipt."""
    path = Path(root_path) / ".goalie" / "evidence" / "last_deploy_uapi.json"
    if not path.is_file():
        return True, None, "no deploy artifact"
    try:
        art = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return False, None, "deploy-uapi artifact unreadable"
    applicable, reason = deploy_receipt_applicable(art, root_path)
    if not applicable:
        return True, art, reason
    status = str(art.get("tld_gate_status", ""))
    pw = int(art.get("playwright_exit", -1))
    conc = str(art.get("tld_gate_conclusion", "") or "")
    receipt = str(art.get("tld_gate_receipt_status", "") or "")
    run_id = art.get("tld_gate_github_run_id")
    errors: list[str] = []
    if status != "pass":
        errors.append(f"tld_gate_status={status!r}")
    if pw != 0:
        errors.append(f"playwright_exit={pw}")
    if status == "pass" and conc and conc != "success":
        errors.append(f"tld_gate_conclusion={conc!r}")
    if status == "pass" and receipt and receipt != "pass":
        errors.append(f"tld_gate_receipt_status={receipt!r}")
    if status == "pass" and not run_id:
        errors.append("tld_gate_github_run_id missing")
    if errors:
        return False, art, "; ".join(errors)
    return True, art, "deploy receipt closed"

def derive_coherence(root_path_or_results: Any, force_dynamic: bool = False, ingest_only: bool = False, env: Optional[dict] = None) -> str:
    if isinstance(root_path_or_results, list):
        required = [r for r in root_path_or_results if r.get("required", True)]
        if not required:
            return "FAIL"
        return "PASS" if all(r.get("ok") for r in required) else "FAIL"

    if env is None:
        env = dict(os.environ)

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
            
        is_ci = str(env.get("CI", "")).lower() in ("1", "true", "yes") or "GITHUB_ACTIONS" in env
        is_precommit = env.get("AF_GATE_CONTEXT") == "precommit"
        allowed_signers = get_allowed_signers_db(env, root_path)

        sig = data.get("signature")
        principal = data.get("principal")
        enforce_signature = is_ci or is_precommit or os.path.exists(allowed_signers) or bool(sig)

        if enforce_signature:
            if not os.path.exists(allowed_signers):
                if is_precommit:
                    print(
                        "🛑 precommit coherence check failed: local workspace signer is not setup.\n"
                        "👉 Run scripts/gates/setup_workspace_signer.sh to generate local signing keys.",
                        file=sys.stderr
                    )
                return "FAIL"
            if not sig or not principal:
                if is_precommit:
                    print(
                        "🛑 precommit coherence check failed: coherence receipt is not signed.\n"
                        "👉 Run coherence-gate (e.g. via ./scripts/gates/coherence-gate.sh) to execute tests and sign results.",
                        file=sys.stderr
                    )
                return "FAIL"
            if not verify_ssh_signature(sig, principal, gh, allowed_signers):
                if is_precommit:
                    print(
                        "🛑 precommit coherence check failed: receipt signature verification failed.\n"
                        "👉 Run coherence-gate (e.g. via ./scripts/gates/coherence-gate.sh) to re-sign with a valid key.",
                        file=sys.stderr
                    )
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
    allowed_signers = get_allowed_signers_db(env, ".")
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
    if str(env.get("AF_ALLOW_OWNED_LOCAL", "")).lower() in ("1", "true", "yes"):
        return GateIntegrityResult("OWNED", "local fallback allowed by AF_ALLOW_OWNED_LOCAL")
    return GateIntegrityResult("FAIL", "no valid execution context (set AF_GATE_CONTEXT or AF_ALLOW_OWNED_LOCAL=1)")


def _git(args: list, timeout: int = 30, root: Any = ".") -> Optional[str]:
    try:
        proc = subprocess.run(
            ["git"] + args, capture_output=True, text=True, timeout=timeout, cwd=str(root)
        )
        return proc.stdout if proc.returncode == 0 else None
    except Exception:
        return None


def _git_ignored(path: str, root: Any = ".") -> bool:
    """True if git considers the path ignored (untracked files only)."""
    out = _git(["check-ignore", path], root=root)
    return bool(out and out.strip())


# Generated artifacts that are tracked despite being in .gitignore.
# The hard gate should not require dynamic test execution for these.
ARTIFACT_PATH_PREFIXES = (
    ".goalie/cron_state/",
    ".goalie/evidence/",
    ".goalie/trust_snapshots/",
    "reports/",
)
ARTIFACT_PATH_EXACT = frozenset({
    ".goalie/scorecards/current.json",
    ".goalie/trust_cache.json",
    ".goalie/ROAM_TRACKER_COG.yaml",
    ".goalie/LNNNL.yaml",
    "profile_readme.md",
})


def _is_generated_artifact(path: str) -> bool:
    return (
        path in ARTIFACT_PATH_EXACT
        or any(path.startswith(p) for p in ARTIFACT_PATH_PREFIXES)
    )


def git_head(root: Any = ".") -> Optional[str]:
    out = _git(["rev-parse", "HEAD"], root=root)
    return out.strip() if out else None



def git_branch(root: Any = ".") -> str:
    try:
        out = subprocess.check_output(
            ["git", "-C", str(root), "rev-parse", "--abbrev-ref", "HEAD"],
            stderr=subprocess.DEVNULL,
            text=True,
        )
        return out.strip()
    except (OSError, subprocess.CalledProcessError):
        return ""


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
    targets = ["src", "domain", "scripts", "tests"]
    untracked_count = 0
    for target in targets:
        out = _git(["ls-files", "--others", "--exclude-standard", "--", target], timeout=10)
        if out is not None:
            untracked_count += sum(
                1 for line in out.splitlines() if line.startswith(f"{target}/")
            )
    proxies["untracked_added"] = untracked_count
    
    # Check if ROAM_TRACKER.yaml is modified or staged
    roam_status = _git(["status", "--porcelain", "ROAM_TRACKER.yaml"])
    proxies["roam_updated"] = bool(roam_status and roam_status.strip())
    return proxies


def derive_reward_direction(proxies: dict) -> tuple:
    """Signed proxy for reward direction. Negative signals dominate unless explicitly ROAM-ed."""
    notes: list = []
    rd = 1
    untracked = proxies.get("untracked_added", 0)
    roam_updated = proxies.get("roam_updated", False)
    
    if untracked > 0:
        if roam_updated:
            # Updating ROAM reduces the penalty but does not invert it into a bonus.
            rd = -0.5
            notes.append(f"{untracked} new untracked file(s), ROAM_TRACKER updated (reduced penalty)")
        else:
            rd = -1
            notes.append(f"{untracked} new untracked file(s) (Anti-CVT, un-ROAMed)")
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
    allowed_signers_path = get_allowed_signers_db(env, ".")
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

    # Legacy bypass: explicit opt-in only (AF_LEGACY_SIGNOFF=1); never in CI/enforcing mode
    if str(env.get("AF_LEGACY_SIGNOFF", "0")) != "1":
        return False, "no external approval (legacy bypass disabled; set AF_LEGACY_SIGNOFF=1 for local dev only)"
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




def check_allowed_signers_tamper(env: dict, root: str = ".") -> tuple:
    """Block PR and local modifications to allowed_signers unless keys match base branch."""
    blocks: list = []
    warns: list = []
    is_ci = str(env.get("CI", "")).lower() in ("1", "true", "yes") or "GITHUB_ACTIONS" in env
    is_precommit = env.get("AF_GATE_CONTEXT") == "precommit"
    if not is_ci and not is_precommit:
        return blocks, warns
    path = get_allowed_signers_db(env, root)
    base = env.get("AF_DIFF_BASE")
    if not base:
        if is_ci:
            blocks.append("HARD GATE: CI context requires AF_DIFF_BASE to be set to check allowed_signers tampering")
            return blocks, warns
        else:
            # Local pre-commit fallback: search for origin/main or main
            for cand in ("origin/main", "main"):
                ref = _git(["rev-parse", "--verify", "--quiet", cand], root=root)
                if ref and ref.strip():
                    base = cand
                    break
            if not base:
                return blocks, warns
    diff_names = _git(["diff", f"{base}...HEAD", "--name-only", "--", path], root=root)
    if diff_names and diff_names.strip():
        blocks.append(
            f"HARD GATE: allowed_signers modified in PR against {base} — use base-branch keys only"
        )
    return blocks, warns

def harden(card: dict, *, env: dict, strict: bool, ingest_only: bool = False, skip_roam_check: bool = False) -> tuple:
    """Override self-asserted fields with verified signals.

    Returns (hardened_card, extra_blocks, extra_warnings, meta).
    """
    keys_to_align = ("AF_GATE_CONTEXT", "CI", "GITHUB_ACTIONS", "AF_VERIFY_MODE", "AF_SIGNAL_TIMEOUT")
    orig_env = {k: os.environ.get(k) for k in keys_to_align}
    for key in keys_to_align:
        if key in env and env[key] is not None:
            os.environ[key] = str(env[key])
    try:
        return _harden_internal(card, env=env, strict=strict, ingest_only=ingest_only, skip_roam_check=skip_roam_check)
    finally:
        for key, val in orig_env.items():
            if val is not None:
                os.environ[key] = val
            else:
                os.environ.pop(key, None)


def get_altered_files(root: str = ".", env: Optional[dict] = None) -> set[str]:
    files = set()
    staged = _git(["diff", "--cached", "--name-only"], root=root)
    if staged:
        files.update(staged.splitlines())
    unstaged = _git(["diff", "--name-only"], root=root)
    if unstaged:
        files.update(unstaged.splitlines())
    untracked = _git(["ls-files", "--others", "--exclude-standard"], root=root)
    if untracked:
        files.update(untracked.splitlines())
    env = env or dict(os.environ)
    base = env.get("AF_DIFF_BASE")
    if base:
        base_diff = _git(["diff", f"{base}...HEAD", "--name-only"], root=root)
        if base_diff:
            files.update(base_diff.splitlines())
    return {f.strip() for f in files if f.strip()}



def ingest_deploy_receipt(root_path: Any, env: dict, meta: dict, extra_blocks: list) -> None:
    """Ingest deploy-uapi artifact + TLD dispatch receipt (unified freshness via verify)."""
    root = Path(root_path)
    evidence = root / ".goalie" / "evidence"
    dispatch = evidence / "tld_gate_dispatch_latest.json"
    disp_doc: dict = {}
    if dispatch.is_file():
        try:
            disp_doc = json.loads(dispatch.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            extra_blocks.append("HARD GATE: tld_gate_dispatch_latest.json is not valid JSON")

    ok, deploy_doc, msg = verify_deploy_uapi_receipt(root_path)
    if deploy_doc is not None:
        meta["deploy_receipt"] = deploy_doc
    if disp_doc:
        meta["tld_gate_dispatch"] = disp_doc
    meta["deploy_receipt_verify"] = msg

    enforce = str(env.get("AF_DEPLOY_RECEIPT_ENFORCE", "0")) == "1"
    is_ci = str(env.get("CI", "")).lower() in ("1", "true", "yes") or "GITHUB_ACTIONS" in env
    if not enforce and not is_ci:
        return
    if deploy_doc is None and not disp_doc:
        return

    if deploy_doc is not None:
        if not ok:
            extra_blocks.append(f"HARD GATE: deploy receipt — {msg}")
            return
        if msg != "deploy receipt closed":
            meta["deploy_receipt_skipped"] = msg
            return
        meta["deploy_tld_gate_status"] = deploy_doc.get("tld_gate_status")
        meta["deploy_github_run_id"] = deploy_doc.get("tld_gate_github_run_id") or disp_doc.get("github_run_id")
        meta["deploy_gate_conclusion"] = deploy_doc.get("tld_gate_conclusion") or disp_doc.get("conclusion")
        return

    if disp_doc and (enforce or is_ci):
        tld_status = str(disp_doc.get("status", "") or "")
        conclusion = disp_doc.get("conclusion")
        meta["deploy_tld_gate_status"] = tld_status
        meta["deploy_github_run_id"] = disp_doc.get("github_run_id")
        meta["deploy_gate_conclusion"] = conclusion
        if tld_status and tld_status != "pass":
            extra_blocks.append(
                f"HARD GATE: deploy TLD gate status={tld_status!r} (required pass)"
            )
        if disp_doc.get("strict") and conclusion not in (None, "success"):
            extra_blocks.append(
                f"HARD GATE: TLD dispatch conclusion={conclusion!r} (required success)"
            )


def _harden_internal(card: dict, *, env: dict, strict: bool, ingest_only: bool = False, skip_roam_check: bool = False) -> tuple:
    extra_blocks: list = []
    extra_warnings: list = []
    meta: dict = {}

    # Enforce allowed_signers presence in CI context
    allowed_signers = get_allowed_signers_db(env, ".")
    is_ci = str(env.get("CI", "")).lower() in ("1", "true", "yes") or "GITHUB_ACTIONS" in env
    if is_ci and not os.path.exists(allowed_signers):
        extra_blocks.append("HARD GATE: CI context requires allowed_signers configuration")
    tamper_blocks, tamper_warns = check_allowed_signers_tamper(env)
    extra_blocks += tamper_blocks
    extra_warnings += tamper_warns

    # ROAM update validation: if ROAM_TRACKER.yaml is updated, ensure untracked files are registered
    if not skip_roam_check:
        roam_status = _git(["status", "--porcelain", "ROAM_TRACKER.yaml"])
        roam_updated = bool(roam_status and roam_status.strip())
        if roam_updated:
            untracked_files = []
            for target in ["src", "domain", "scripts", "tests"]:
                out = _git(["ls-files", "--others", "--exclude-standard", "--", target], timeout=10)
                if out:
                    untracked_files.extend(line.strip() for line in out.splitlines() if line.strip().startswith(f"{target}/"))
            if untracked_files:
                try:
                    with open("ROAM_TRACKER.yaml", "r", encoding="utf-8") as fh:
                        tracker_content = fh.read()
                except Exception:
                    tracker_content = ""
                missing_from_tracker = [f for f in untracked_files if f not in tracker_content]
                if missing_from_tracker:
                    extra_blocks.append(
                        f"HARD GATE: ROAM_TRACKER.yaml was updated, but the following newly added untracked files are not registered: "
                        f"{', '.join(missing_from_tracker)}"
                    )

    # 1) coherence <- real signals (or ingest PASS artifact to avoid duplicate pytest)
    is_ci = str(env.get("CI", "")).lower() in ("1", "true", "yes") or "GITHUB_ACTIONS" in env
    is_precommit = env.get("AF_GATE_CONTEXT") == "precommit"
    artifact_ok = _coherence_artifact_usable(".", env)
    artifact_only = str(env.get("AF_COHERENCE_ARTIFACT_ONLY", "")).lower() in ("1", "true", "yes")
    prefer_artifact = (
        (ingest_only and not is_ci)
        or (not is_ci and is_precommit and artifact_ok)
        or (not is_ci and artifact_only and artifact_ok)
    )
    if prefer_artifact:
        if is_precommit:
            unstaged_diff = _git(["diff", "--name-only"])
            if unstaged_diff:
                scorecard_path = Path(DEFAULT_SCORECARD).as_posix()
                non_ignored = [
                    f for f in unstaged_diff.strip().splitlines()
                    if f.strip()
                    and f.strip() != scorecard_path
                    and not _git_ignored(f.strip())
                    and not _is_generated_artifact(f.strip())
                ]
                if non_ignored:
                    extra_blocks.append(
                        "HARD GATE: pre-commit verification requires dynamic test execution when unstaged modifications are present: "
                        f"{', '.join(non_ignored[:10])}"
                    )
        coherence = derive_coherence(".", force_dynamic=False, env=env)
        meta["coherence_ingested"] = True
        meta["coherence_source"] = "artifact"
    else:
        old_verify_mode = os.environ.get("AF_VERIFY_MODE")
        os.environ["AF_VERIFY_MODE"] = "1"
        try:
            results = run_signals(load_signals())
            coherence = derive_coherence(results)
            meta["signals"] = results
            meta["coherence_source"] = "signals"
        finally:
            if old_verify_mode is not None:
                os.environ["AF_VERIFY_MODE"] = old_verify_mode
            else:
                os.environ.pop("AF_VERIFY_MODE", None)

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
    # Always overwrite claimed binding with actual HEAD/diff in verify mode.
    # This prevents committed self-asserted bindings from stale-checking themselves.
    if actual_commit:
        card["commit"] = actual_commit
    if actual_diff:
        card["diff_sha256"] = actual_diff
    b, w = check_binding(card, actual_commit, actual_diff, strict)
    extra_blocks += b
    extra_warnings += w

    # GATE-003: sign_off <- external approval (never the self-asserted boolean)
    verified_signoff, so_reason = verify_signoff(card, env, actual_commit, actual_diff)
    card["sign_off"] = verified_signoff
    card.setdefault("impact", {})["sign_off"] = verified_signoff
    meta["sign_off_verified"] = verified_signoff
    meta["sign_off_reason"] = so_reason

    # Verify DB schema/model alterations require verified review signature
    altered_files = get_altered_files(".", env)
    has_db_schema_or_model = False
    for f in altered_files:
        f_lower = f.lower()
        if any(f.startswith(p) for p in ("tests/", "scripts/", "tooling/", "config/", ".")):
            continue
        is_in_source = any(p in f for p in ("src/", "domain/", "docs/api/", "crates/", "packages/", "rust/core/"))
        if is_in_source:
            if "schema" in f_lower or "model" in f_lower or f_lower.endswith(".sql") or f_lower.endswith(".proto"):
                has_db_schema_or_model = True
                break
    if has_db_schema_or_model and not verified_signoff:
        extra_blocks.append("HARD GATE: alterations to DB schemas or models require a cryptographically verified review signature")

    # 4) reward_direction <- proxy (GATE-006)
    #    Default advisory (warn). With AF_RD_ENFORCE=1 a negative objective signal
    #    overrides the asserted value (blocks). Enforcement is opt-in because the
    #    $HOME-rooted repo's untracked sprawl makes the bare untracked-delta proxy
    #    noisy until a real per-diff baseline exists.
    proxies = collect_reward_proxies(env)
    rd_proxy, rnotes = derive_reward_direction(proxies)
    meta["reward_direction_proxy"] = rd_proxy
    is_ci = str(env.get("CI", "")).lower() in ("1", "true", "yes") or "GITHUB_ACTIONS" in env
    enforce_rd = str(env.get("AF_RD_ENFORCE", "1" if (is_ci or is_precommit) else "0")) == "1"
    meta["reward_direction_enforced"] = enforce_rd
    asserted = card.get("impact", {}).get("reward_direction")
    if enforce_rd:
        card.setdefault("impact", {})["reward_direction"] = rd_proxy
        if asserted != rd_proxy:
            extra_warnings.append(
                f"reward_direction overridden to {rd_proxy} by objective signals "
                f"({'; '.join(rnotes) or 'no negative signals'})"
            )
    elif isinstance(asserted, (int, float)) and not isinstance(asserted, bool):
        if (asserted >= 0) != (rd_proxy >= 0):
            extra_warnings.append(
                f"reward_direction asserted {asserted} but proxy={rd_proxy} "
                f"({'; '.join(rnotes) or 'no negative signals'})"
            )
    ingest_deploy_receipt(".", env, meta, extra_blocks)

    # 5) blast_radius <- proxy based on file change count
    card_impact = card.setdefault("impact", {})
    asserted_br = card_impact.get("blast_radius")
    prod_altered = [
        f for f in altered_files
        if not any(f.startswith(p) for p in ("tests/", "scripts/", "tooling/", "config/", "."))
    ]
    file_count = len(prod_altered)
    if file_count > 10:
        br_proxy = 1.5
    elif file_count >= 3:
        br_proxy = 1.0
    else:
        br_proxy = 0.5
    meta["blast_radius_proxy"] = br_proxy
    if asserted_br is None or asserted_br < br_proxy:
        card_impact["blast_radius"] = br_proxy
        extra_warnings.append(
            f"blast_radius overridden to {br_proxy} based on {file_count} prod modified files (asserted {asserted_br})"
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
        "--self-asserted",
        action="store_true",
        help="trust self-asserted scorecard fields (default is verify; use only for local drafts)",
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
    parser.add_argument(
        "--write-back",
        action="store_true",
        help="write the hardened scorecard back to the source file (local development only)",
    )
    parser.add_argument(
        "--skip-roam-check",
        action="store_true",
        help="skip the ROAM_TRACKER.yaml untracked-files check (local development only)",
    )
    parser.add_argument(
        "--sign-coherence",
        action="store_true",
        help="sign .goalie/evidence/coherence_results.json with the local workspace signer and exit",
    )
    args = parser.parse_args(argv)

    if args.sign_coherence:
        artifact_path = Path(".goalie/evidence/coherence_results.json")
        if not artifact_path.is_file():
            print("🛑 --sign-coherence: no coherence artifact found", file=sys.stderr)
            return 3
        if stamp_local_coherence_signature(str(artifact_path), "."):
            print(f"✅ Signed coherence artifact: {artifact_path}")
            return 0
        print("🛑 --sign-coherence: signing failed (workspace signer or allowed_signers missing)", file=sys.stderr)
        return 3

    env = dict(os.environ)
    if args.precommit:
        env["AF_GATE_CONTEXT"] = "precommit"
    is_ci = str(env.get("CI", "")).lower() in ("1", "true", "yes") or "GITHUB_ACTIONS" in env
    is_precommit = env.get("AF_GATE_CONTEXT") == "precommit" or args.precommit
    # Default is verified (hardened). Self-asserted is opt-in; CI/precommit always verify.
    verify_mode = (not args.self_asserted) or is_ci or is_precommit

    require = env.get("AF_REQUIRE_SCORECARD", "0") == "1"
    if is_precommit and not require and env.get("AF_REQUIRE_SCORECARD", "") == "":
        branch = git_branch()
        if branch in ("main", "master"):
            require = True

    if (is_ci or is_precommit) and args.self_asserted:
        print("🛑 --self-asserted is not allowed in CI/pre-commit", file=sys.stderr)
        return 2

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
    source_path = None
    if verify_mode:
        card, extra_blocks, extra_warnings, meta = harden(
            card, env=env, strict=args.strict, ingest_only=args.ingest_only, skip_roam_check=args.skip_roam_check
        )
        if args.write_back:
            source_path = args.file or (DEFAULT_SCORECARD if args.precommit else None)

    result = evaluate(card)
    if verify_mode:
        result = finalize(result, extra_blocks, extra_warnings, meta)
        if is_ci and result.get("disposition") == "SHIP":
            derived = (result.get("verification") or {}).get("coherence_derived")
            if derived != "PASS":
                result["disposition"] = "BLOCK"
                result["blocks"] = list(result.get("blocks", [])) + [
                    f"CI: coherence_derived must be PASS (got {derived!r})"
                ]
    elif not args.json:
        print("note: self-asserted scorecard (run with --verify to verify signals)")

    if args.write_back and source_path:
        try:
            with open(source_path, "w", encoding="utf-8") as fh:
                json.dump(card, fh, indent=2)
                fh.write("\n")
            if not args.json:
                print(f"scorecard written back: {source_path}")
        except OSError as exc:
            print(f"scorecard write-back failed: {exc}", file=sys.stderr)

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
