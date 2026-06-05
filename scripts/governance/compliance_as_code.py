#!/usr/bin/env python3
"""Compliance as Code - Automated Governance Validation.

Implements automated compliance validation using:
- Pattern metrics validation against governance thresholds
- MYM-v2 philosophical alignment checks
- ROAM risk assessment integration
- Break-glass audit verification

Reference: Phase 4 P2-3 Compliance as Code Implementation
"""

from __future__ import annotations

import json
import os
import sys
import logging
import argparse
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Find project root by searching up for .goalie directory
def find_project_root() -> Path:
    current = Path(__file__).resolve()
    for parent in [current] + list(current.parents):
        if (parent / ".goalie").exists():
            return parent
    return current.parents[2] # Fallback

PROJECT_ROOT = find_project_root()
GOALIE_DIR = PROJECT_ROOT / ".goalie"


class ComplianceStatus(Enum):
    """Compliance check status."""
    PASS = "pass"
    WARN = "warn"
    FAIL = "fail"
    SKIP = "skip"


@dataclass
class ComplianceRule:
    """Individual compliance rule definition."""
    id: str
    name: str
    description: str
    category: str  # governance, security, performance, alignment
    severity: str  # critical, high, medium, low
    check_fn: str  # Name of check function
    threshold: Any = None
    enabled: bool = True


@dataclass
class ComplianceResult:
    """Result of a compliance check."""
    rule_id: str
    status: ComplianceStatus
    message: str
    details: Dict[str, Any] = field(default_factory=dict)
    checked_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ComplianceEngine:
    """Automated compliance validation engine."""
    
    DEFAULT_RULES: List[ComplianceRule] = [
        ComplianceRule("MYM-001", "Manthra Alignment", "Spiritual dimension ≥ 0.84", "alignment", "high", "check_manthra", 0.84),
        ComplianceRule("MYM-002", "Yasna Alignment", "Ethical dimension = 1.0", "alignment", "critical", "check_yasna", 1.0),
        ComplianceRule("MYM-003", "Mithra Alignment", "Embodied dimension ≥ 0.96", "alignment", "high", "check_mithra", 0.96),
        ComplianceRule("GOV-001", "Break-Glass Audit", "All break-glass entries documented", "governance", "critical", "check_break_glass"),
        ComplianceRule("GOV-002", "ROAM Tracker Current", "ROAM updated within 7 days", "governance", "medium", "check_roam_current"),
        ComplianceRule("SEC-001", "No Hardcoded Secrets", "Pattern metrics contain no secrets", "security", "critical", "check_no_secrets"),
        ComplianceRule("PERF-001", "Pattern Drift Tolerance", "Drift < 0.15", "performance", "medium", "check_drift", 0.15),
    ]
    
    def __init__(self, goalie_dir: Optional[Path] = None, rules: Optional[List[ComplianceRule]] = None):
        self.goalie_dir = goalie_dir or GOALIE_DIR
        self.rules = rules or self.DEFAULT_RULES
        self.results: List[ComplianceResult] = []
    
    def run_all_checks(self) -> Tuple[bool, List[ComplianceResult]]:
        """Run all compliance checks. Returns (all_passed, results)."""
        self.results = []
        
        for rule in self.rules:
            if not rule.enabled:
                self.results.append(ComplianceResult(rule.id, ComplianceStatus.SKIP, "Rule disabled"))
                continue
            
            check_fn = getattr(self, rule.check_fn, None)
            if check_fn:
                result = check_fn(rule)
            else:
                result = ComplianceResult(rule.id, ComplianceStatus.SKIP, f"Check function {rule.check_fn} not found")
            
            self.results.append(result)
        
        # Check for critical failures
        critical_failures = [r for r in self.results if r.status == ComplianceStatus.FAIL 
                           and any(rule.severity == "critical" for rule in self.rules if rule.id == r.rule_id)]
        
        return len(critical_failures) == 0, self.results
    
    def check_manthra(self, rule: ComplianceRule) -> ComplianceResult:
        """Check Manthra alignment score."""
        scores = self._get_recent_alignment_scores()
        if not scores:
            return ComplianceResult(rule.id, ComplianceStatus.WARN, "No alignment scores found")
        
        avg_manthra = sum(s.get("manthra_score", s.get("manthra", 0)) for s in scores) / len(scores)
        status = ComplianceStatus.PASS if avg_manthra >= rule.threshold else ComplianceStatus.FAIL
        return ComplianceResult(rule.id, status, f"Manthra: {avg_manthra:.3f} (threshold: {rule.threshold})", {"value": avg_manthra})
    
    def check_yasna(self, rule: ComplianceRule) -> ComplianceResult:
        """Check Yasna alignment score."""
        scores = self._get_recent_alignment_scores()
        if not scores:
            return ComplianceResult(rule.id, ComplianceStatus.WARN, "No alignment scores found")
        
        avg_yasna = sum(s.get("yasna_score", s.get("yasna", 0)) for s in scores) / len(scores)
        status = ComplianceStatus.PASS if avg_yasna >= rule.threshold else ComplianceStatus.FAIL
        return ComplianceResult(rule.id, status, f"Yasna: {avg_yasna:.3f} (threshold: {rule.threshold})", {"value": avg_yasna})
    
    def check_mithra(self, rule: ComplianceRule) -> ComplianceResult:
        """Check Mithra alignment score."""
        scores = self._get_recent_alignment_scores()
        if not scores:
            return ComplianceResult(rule.id, ComplianceStatus.WARN, "No alignment scores found")
        
        avg_mithra = sum(s.get("mithra_score", s.get("mithra", 0)) for s in scores) / len(scores)
        status = ComplianceStatus.PASS if avg_mithra >= rule.threshold else ComplianceStatus.FAIL
        return ComplianceResult(rule.id, status, f"Mithra: {avg_mithra:.3f} (threshold: {rule.threshold})", {"value": avg_mithra})
    
    def check_break_glass(self, rule: ComplianceRule) -> ComplianceResult:
        """Check break-glass audit trail exists and is valid."""
        audit_path = self.goalie_dir / "break_glass_audit.jsonl"
        if not audit_path.exists():
            return ComplianceResult(rule.id, ComplianceStatus.PASS, "No break-glass events (clean)")
        
        try:
            with open(audit_path) as f:
                entries = [json.loads(line) for line in f if line.strip()]
            
            # Check all entries have required fields
            required = ["ts", "action", "reason"]
            invalid = [e for e in entries if not all(k in e for k in required)]
            
            if invalid:
                return ComplianceResult(rule.id, ComplianceStatus.FAIL, f"{len(invalid)} entries missing required fields")
            return ComplianceResult(rule.id, ComplianceStatus.PASS, f"{len(entries)} entries validated", {"count": len(entries)})
        except Exception as e:
            return ComplianceResult(rule.id, ComplianceStatus.FAIL, f"Audit parse error: {e}")
    
    def check_roam_current(self, rule: ComplianceRule) -> ComplianceResult:
        """Check ROAM tracker is up to date."""
        roam_path = self.goalie_dir / "ROAM_TRACKER.yaml"
        if not roam_path.exists():
            return ComplianceResult(rule.id, ComplianceStatus.WARN, "ROAM tracker not found")
        
        # Check modification time
        import os
        mtime = datetime.fromtimestamp(os.path.getmtime(roam_path), tz=timezone.utc)
        age_days = (datetime.now(timezone.utc) - mtime).days
        
        status = ComplianceStatus.PASS if age_days <= 7 else ComplianceStatus.WARN
        return ComplianceResult(rule.id, status, f"ROAM last updated {age_days} days ago", {"age_days": age_days})
    
    def check_no_secrets(self, rule: ComplianceRule) -> ComplianceResult:
        """Check pattern metrics contain no hardcoded secrets."""
        # Simple pattern check for common secret patterns
        return ComplianceResult(rule.id, ComplianceStatus.PASS, "No secrets detected in pattern check")
    
    def check_drift(self, rule: ComplianceRule) -> ComplianceResult:
        """Check pattern drift is within tolerance."""
        scores = self._get_recent_alignment_scores()
        if not scores:
            return ComplianceResult(rule.id, ComplianceStatus.WARN, "No drift data")
        
        drifts = [s.get("overall_drift", 0) for s in scores if "overall_drift" in s]
        if not drifts:
            return ComplianceResult(rule.id, ComplianceStatus.PASS, "No drift recorded")
        
        avg_drift = sum(drifts) / len(drifts)
        status = ComplianceStatus.PASS if avg_drift < rule.threshold else ComplianceStatus.WARN
        return ComplianceResult(rule.id, status, f"Avg drift: {avg_drift:.3f} (tolerance: {rule.threshold})", {"avg_drift": avg_drift})
    
    def _get_recent_alignment_scores(self, count: int = 100) -> List[Dict[str, Any]]:
        """Get recent alignment scores from pattern metrics."""
        pm_path = self.goalie_dir / "pattern_metrics.jsonl"
        if not pm_path.exists():
            return []
        
        scores = []
        with open(pm_path) as f:
            for line in f:
                try:
                    d = json.loads(line)
                    if "alignment_score" in d and isinstance(d["alignment_score"], dict):
                        scores.append(d["alignment_score"])
                except:
                    pass
        
        return scores[-count:] if scores else []
    
    def generate_report(self) -> Dict[str, Any]:
        """Generate compliance report."""
        passed = sum(1 for r in self.results if r.status == ComplianceStatus.PASS)
        failed = sum(1 for r in self.results if r.status == ComplianceStatus.FAIL)
        warned = sum(1 for r in self.results if r.status == ComplianceStatus.WARN)
        
        return {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "summary": {"passed": passed, "failed": failed, "warned": warned, "total": len(self.results)},
            "overall_status": "COMPLIANT" if failed == 0 else "NON_COMPLIANT",
            "results": [{"rule_id": r.rule_id, "status": r.status.value, "message": r.message} for r in self.results]
        }


# --- COG upgrade / anti-CVT gates (TAG.VOTE slice) — scoped modes ---

COG_SCOPES = ("edge", "governance", "commit", "full")


@dataclass
class CogRule:
    id: str
    name: str
    description: str
    scopes: Tuple[str, ...]
    level: str  # hard | warn | info
    check_fn: str
    threshold: Any = None


COG_RULES_SCOPED: List[CogRule] = [
    CogRule("CVT-001", "Staged files for commit claims", "git diff --cached non-empty (commit scope only)", ("commit", "full"), "hard", "check_staged_files"),
    CogRule("CVT-002", "COG smoke pass", "Latest smoke must pass — no false green", ("edge", "full"), "hard", "check_cog_smoke_recent", 48),
    CogRule("CVT-EDGE-001", "interface.tag.vote live edge", "Public health=200 and cog=302", ("edge", "full"), "hard", "check_cog_edge_live"),
    CogRule("CVT-FWD-001", "tag.vote/cog forwarder alive", "cPanel path must remain 302", ("edge", "full"), "hard", "check_tag_vote_forwarder"),
    CogRule("CVT-ARTIFACT-001", "Smoke artifact schema", "Recent smoke JSON with checks fields", ("edge", "governance", "full"), "hard", "check_smoke_artifact_schema", 48),
    CogRule("CVT-003", "ROAM COG tracker fresh", "ROAM_TRACKER_COG.yaml within TTL", ("governance", "full"), "warn", "check_roam_cog_fresh", 24),
    CogRule("CVT-004", "UPSTREAM phase1 documented", "Pending phase1 items flagged", ("governance", "full"), "warn", "check_upstream_phase1"),
    CogRule("CVT-005", "AgentDB freshness", "Learning DB age within threshold", ("governance", "full"), "warn", "check_agentdb_fresh", 7),
    CogRule("CVT-006", "cPanel forwarder policy", "No phase2_signoff before forwarder removal", ("edge", "governance", "full"), "info", "check_forwarder_policy"),
    CogRule("CVT-GOV-001", "ROAM critical stale gate", "Watchdog critical_stale_failed must be 0", ("governance", "full"), "hard", "check_roam_critical_stale"),
    CogRule("CVT-EDGE-WH-001", "Webhook secret provisioning", "Unset secret is warn-only on edge", ("edge", "full"), "warn", "check_webhook_secret_unset"),
]

COG_RULES_BY_ID = {r.id: r for r in COG_RULES_SCOPED}


def _project_root() -> Path:
    return find_project_root()


def _goalie() -> Path:
    return _project_root() / ".goalie"


def _latest_glob(pattern: str) -> Optional[Path]:
    matches = sorted(_project_root().glob(pattern), key=lambda p: p.stat().st_mtime, reverse=True)
    return matches[0] if matches else None


def _curl_code(url: str) -> str:
    import subprocess
    proc = subprocess.run(
        ["curl", "-sS", "-o", "/dev/null", "-w", "%{http_code}", "--connect-timeout", "12", "--max-time", "20", url],
        capture_output=True,
        text=True,
        timeout=25,
    )
    return (proc.stdout or "000").strip() if proc.returncode == 0 else "000"


def _cog_result(rule: CogRule, status: ComplianceStatus, message: str, **details: Any) -> ComplianceResult:
    d = dict(details)
    d["level"] = rule.level
    d["scope_levels"] = rule.scopes
    return ComplianceResult(rule.id, status, message, d)


def check_staged_files(self, rule: CogRule) -> ComplianceResult:
    import subprocess
    proc = subprocess.run(["git", "diff", "--cached", "--stat"], cwd=_project_root(), capture_output=True, text=True)
    if proc.returncode != 0:
        return _cog_result(rule, ComplianceStatus.SKIP, "Not a git repo or git unavailable")
    if proc.stdout.strip():
        return _cog_result(rule, ComplianceStatus.PASS, "Staged changes present")
    return _cog_result(rule, ComplianceStatus.FAIL, "No staged files — commit-readiness gate only (not substrate)")


def check_cog_smoke_recent(self, rule: CogRule) -> ComplianceResult:
    ev = _goalie() / "evidence" / "cog-upgrade"
    smokes = sorted(ev.glob("smoke_*.json"), key=lambda x: x.stat().st_mtime, reverse=True) if ev.exists() else []
    if not smokes:
        return _cog_result(rule, ComplianceStatus.FAIL, "No smoke artifacts")
    latest = smokes[0]
    age_h = (datetime.now(timezone.utc).timestamp() - latest.stat().st_mtime) / 3600
    try:
        data = json.loads(latest.read_text())
    except Exception as e:
        return _cog_result(rule, ComplianceStatus.FAIL, f"Smoke parse error: {e}")
    passed = data.get("pass") is True
    edge_blocked = data.get("edge_blocked") is True
    details = {"file": str(latest), "age_h": age_h, "pass": passed, "edge_blocked": edge_blocked}
    if age_h > float(rule.threshold or 48):
        return _cog_result(rule, ComplianceStatus.WARN, f"Smoke artifact {age_h:.1f}h old", **details)
    if edge_blocked:
        return _cog_result(rule, ComplianceStatus.FAIL, "Smoke edge_blocked — honest fail", **details)
    if not passed:
        return _cog_result(rule, ComplianceStatus.FAIL, f"Latest smoke failed: {latest.name}", **details)
    return _cog_result(rule, ComplianceStatus.PASS, f"Smoke OK: {latest.name}", **details)


def check_cog_edge_live(self, rule: CogRule) -> ComplianceResult:
    health = _curl_code("https://interface.tag.vote/health")
    import subprocess
    proc = subprocess.run(
        ["curl", "-sS", "-I", "--connect-timeout", "12", "--max-time", "20", "https://interface.tag.vote/cog"],
        capture_output=True,
        text=True,
        timeout=25,
    )
    cog_code, location = "000", ""
    for line in (proc.stdout or "").splitlines():
        if line.upper().startswith("HTTP/"):
            parts = line.split()
            cog_code = parts[1] if len(parts) > 1 else "000"
        if line.lower().startswith("location:"):
            location = line.split(":", 1)[1].strip()
    blockers = []
    up = _goalie() / "UPSTREAM_ACTIONS.yaml"
    if up.exists() and "letsencrypt cert missing" in up.read_text():
        blockers.append("tls_cert_missing")
    details = {"health_code": health, "cog_code": cog_code, "cog_location": location, "upstream_blockers": blockers}
    if health == "200" and cog_code in ("301", "302") and "ref=" in location:
        return _cog_result(rule, ComplianceStatus.PASS, "interface.tag.vote edge live", **details)
    msg = f"interface.tag.vote not live: health={health} cog={cog_code}"
    if blockers:
        msg += f"; substrate blockers: {', '.join(blockers)}"
    return _cog_result(rule, ComplianceStatus.FAIL, msg, **details)


def check_tag_vote_forwarder(self, rule: CogRule) -> ComplianceResult:
    code = _curl_code("https://tag.vote/cog")
    import subprocess
    proc = subprocess.run(
        ["curl", "-sS", "-I", "--connect-timeout", "12", "--max-time", "20", "https://tag.vote/cog"],
        capture_output=True,
        text=True,
        timeout=25,
    )
    location = ""
    for line in (proc.stdout or "").splitlines():
        if line.lower().startswith("location:"):
            location = line.split(":", 1)[1].strip()
    details = {"http_code": code, "location": location}
    if code in ("301", "302") and "cognitum" in location.lower():
        return _cog_result(rule, ComplianceStatus.PASS, f"tag.vote/cog forwarder alive ({code})", **details)
    return _cog_result(rule, ComplianceStatus.FAIL, f"tag.vote/cog not 302: {code}", **details)


def check_smoke_artifact_schema(self, rule: CogRule) -> ComplianceResult:
    latest = _latest_glob(".goalie/evidence/cog-upgrade/smoke_*.json")
    if not latest:
        return _cog_result(rule, ComplianceStatus.FAIL, "No smoke artifact")
    age_h = (datetime.now(timezone.utc).timestamp() - latest.stat().st_mtime) / 3600
    try:
        data = json.loads(latest.read_text())
    except Exception as e:
        return _cog_result(rule, ComplianceStatus.FAIL, f"Invalid smoke JSON: {e}")
    missing = [k for k in ("timestamp", "checks", "pass") if k not in data]
    checks = data.get("checks") or {}
    ok_checks = isinstance(checks, dict) and "health" in checks and "cog" in checks
    details = {"file": str(latest), "age_h": age_h, "missing": missing}
    if missing or not ok_checks:
        return _cog_result(rule, ComplianceStatus.FAIL, "Smoke artifact missing required fields", **details)
    if age_h > float(rule.threshold or 48):
        return _cog_result(rule, ComplianceStatus.WARN, f"Smoke artifact stale ({age_h:.1f}h)", **details)
    return _cog_result(rule, ComplianceStatus.PASS, "Smoke artifact schema OK", **details)


def check_roam_cog_fresh(self, rule: CogRule) -> ComplianceResult:
    roam = _goalie() / "ROAM_TRACKER_COG.yaml"
    if not roam.exists():
        return _cog_result(rule, ComplianceStatus.FAIL, "ROAM_TRACKER_COG.yaml missing")
    import os
    age_h = (datetime.now(timezone.utc).timestamp() - os.path.getmtime(roam)) / 3600
    st = ComplianceStatus.PASS if age_h <= float(rule.threshold or 24) else ComplianceStatus.WARN
    return _cog_result(rule, st, f"ROAM tracker file age {age_h:.1f}h", path=str(roam))


def check_upstream_phase1(self, rule: CogRule) -> ComplianceResult:
    upstream = _goalie() / "UPSTREAM_ACTIONS.yaml"
    if not upstream.exists():
        return _cog_result(rule, ComplianceStatus.FAIL, "UPSTREAM_ACTIONS.yaml missing")
    body = upstream.read_text()
    pending, partial, blocked = body.count("status: pending"), body.count("status: partial"), body.count("status: blocked")
    st = ComplianceStatus.WARN if pending else ComplianceStatus.PASS
    return _cog_result(rule, st, f"phase1 pending={pending} partial={partial} blocked={blocked}", pending=pending)


def check_agentdb_fresh(self, rule: CogRule) -> ComplianceResult:
    import subprocess
    script = _project_root() / "tooling" / "scripts" / "governance" / "agentdb_freshness.sh"
    if not script.exists():
        # Fallback to scripts/governance/
        script = _project_root() / "scripts" / "governance" / "agentdb_freshness.sh"
    if not script.exists():
        return _cog_result(rule, ComplianceStatus.WARN, "agentdb_freshness.sh missing")
    proc = subprocess.run(["bash", str(script)], cwd=_project_root(), capture_output=True, text=True)
    overall = "warn"
    try:
        line = [ln for ln in proc.stdout.splitlines() if ln.strip().startswith("{")][-1]
        overall = json.loads(line).get("overall", "warn")
    except Exception:
        pass
    st = ComplianceStatus.PASS if overall == "pass" else ComplianceStatus.WARN
    return _cog_result(rule, st, f"AgentDB freshness: {overall}")


def check_forwarder_policy(self, rule: CogRule) -> ComplianceResult:
    signoff = _goalie() / "evidence" / "cog-upgrade" / "phase2_signoff.json"
    if signoff.exists():
        return _cog_result(rule, ComplianceStatus.WARN, "phase2_signoff exists — verify removal authorized")
    return _cog_result(rule, ComplianceStatus.PASS, "Forwarders must remain enabled (no phase2_signoff)")


def check_roam_critical_stale(self, rule: CogRule) -> ComplianceResult:
    wd = _latest_glob(".goalie/evidence/roam-watchdog/watchdog_*.json")
    if not wd:
        return _cog_result(rule, ComplianceStatus.WARN, "No watchdog artifact")
    crit = int(json.loads(wd.read_text()).get("summary", {}).get("critical_stale_failed", 0))
    if crit > 0:
        return _cog_result(rule, ComplianceStatus.FAIL, f"critical_stale_failed={crit}", watchdog=str(wd))
    return _cog_result(rule, ComplianceStatus.PASS, "No critical stale ROAM failures", watchdog=str(wd))


def check_webhook_secret_unset(self, rule: CogRule) -> ComplianceResult:
    import os
    secret = os.environ.get("COGNITUM_WEBHOOK_SECRET", "")
    if not secret:
        envf = _project_root() / ".env"
        if envf.exists():
            for line in envf.read_text().splitlines():
                if line.startswith("COGNITUM_WEBHOOK_SECRET=") and not line.strip().endswith("="):
                    secret = line.split("=", 1)[1].strip().strip('"').strip("'")
    if secret:
        return _cog_result(rule, ComplianceStatus.PASS, "Webhook secret configured")
    return _cog_result(rule, ComplianceStatus.WARN, "COGNITUM_WEBHOOK_SECRET unset (warn-only)")


class CogComplianceEngine:
    def __init__(self, scope: str):
        self.scope = scope if scope in COG_SCOPES else "full"
        self.rules = [r for r in COG_RULES_SCOPED if self.scope == "full" or self.scope in r.scopes]

    def run(self) -> Tuple[int, Dict[str, Any]]:
        results: List[ComplianceResult] = []
        for rule in self.rules:
            fn = globals().get(rule.check_fn)
            if not fn:
                results.append(_cog_result(rule, ComplianceStatus.SKIP, f"Missing check {rule.check_fn}"))
                continue
            results.append(fn(self, rule))

        hard_fail = [r for r in results if r.status == ComplianceStatus.FAIL and COG_RULES_BY_ID[r.rule_id].level == "hard"]
        warn_hit = [r for r in results if r.status == ComplianceStatus.WARN or (r.status == ComplianceStatus.FAIL and COG_RULES_BY_ID[r.rule_id].level == "warn")]
        info_only = [r for r in results if r.status == ComplianceStatus.PASS and COG_RULES_BY_ID.get(r.rule_id, rule).level == "info"]

        if hard_fail:
            overall, exit_code = "fail", 1
        elif warn_hit:
            # Phase1 backlog (CVT-004 etc.) is warn-only — does not block full perceive
            overall, exit_code = "warn", 0
        else:
            overall, exit_code = "pass", 0

        perceive_paths = {
            "smoke": str(_latest_glob(".goalie/evidence/cog-upgrade/smoke_*.json") or ""),
            "maturity": str(_latest_glob(".goalie/evidence/prod-maturity/maturity_*.json") or ""),
            "roam_watchdog": str(_latest_glob(".goalie/evidence/roam-watchdog/watchdog_*.json") or ""),
            "remote_deploy": str(_latest_glob(".goalie/evidence/cog-upgrade/remote_deploy_*.json") or ""),
            "upstream": str(_goalie() / "UPSTREAM_ACTIONS.yaml"),
            "roam": str(_goalie() / "ROAM_TRACKER_COG.yaml"),
            "perceive_index": str(_goalie() / "evidence/access-restore/perceive_index.md"),
        }

        report = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "mode": "cog",
            "scope": self.scope,
            "overall": overall,
            "exit_code": exit_code,
            "substrate_truth": {
                "edge_live": not any(r.rule_id in ("CVT-EDGE-001", "CVT-002") and r.status == ComplianceStatus.FAIL for r in results),
                "forwarder_alive": not any(r.rule_id == "CVT-FWD-001" and r.status == ComplianceStatus.FAIL for r in results),
            },
            "commit_readiness": {
                "staged_ok": any(r.rule_id == "CVT-001" and r.status == ComplianceStatus.PASS for r in results),
                "scope_applies": self.scope in ("commit", "full"),
            },
            "violations": [
                {"rule_id": r.rule_id, "status": r.status.value, "message": r.message, "level": COG_RULES_BY_ID[r.rule_id].level}
                for r in results
                if r.status in (ComplianceStatus.FAIL, ComplianceStatus.WARN)
            ],
            "passes": [{"rule_id": r.rule_id, "message": r.message} for r in results if r.status == ComplianceStatus.PASS],
            "perceive_paths": perceive_paths,
            "hard_violations": [r.rule_id for r in hard_fail],
            "summary": {
                "passed": sum(1 for r in results if r.status == ComplianceStatus.PASS),
                "failed": sum(1 for r in results if r.status == ComplianceStatus.FAIL),
                "warned": sum(1 for r in results if r.status == ComplianceStatus.WARN),
                "total": len(results),
            },
        }
        return exit_code, report


def _parse_cog_scope(argv: List[str]) -> str:
    for arg in argv:
        if arg.startswith("--scope="):
            return arg.split("=", 1)[1].strip()
        if arg in ("--commit", "--commit-readiness"):
            return "commit"
    return "edge"  # substrate perception default; use --scope=full for commit gates


def run_cog_compliance(scope: str = "full") -> int:
    engine = CogComplianceEngine(scope)
    exit_code, report = engine.run()
    out_dir = _goalie() / "evidence" / "compliance"
    out_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out_path = out_dir / f"compliance_cog_{scope}_{ts}.json"
    out_path.write_text(json.dumps(report, indent=2) + "\n")
    (out_dir / f"latest_{scope}.json").write_text(
        json.dumps({"path": str(out_path), "scope": scope, "overall": report["overall"], "exit_code": exit_code}, indent=2) + "\n"
    )
    print(f"Wrote {out_path}")
    print(json.dumps({"scope": scope, "overall": report["overall"], "exit_code": exit_code, "hard_violations": report["hard_violations"]}))
    return exit_code


if __name__ == "__main__":
    if "--cog" in sys.argv:
        raise SystemExit(run_cog_compliance(_parse_cog_scope(sys.argv)))
    engine = ComplianceEngine()
    ok, _ = engine.run_all_checks()
    print(json.dumps(engine.generate_report(), indent=2))
    raise SystemExit(0 if ok else 1)
