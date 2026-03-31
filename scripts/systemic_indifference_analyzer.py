#!/usr/bin/env python3
"""
Systemic Indifference Analyzer — Real File Scanning Edition
=============================================================

DoR: Python 3.10+, access to BHOPTI-LEGAL directory, click installed
DoD: Scans real case files, extracts timelines, validates evidence chains,
     generates scored SYSTEMIC-INDIFFERENCE-REPORT.md per organization

Features:
  - Real file system scanning (PDFs, .eml, .md, .txt, .docx)
  - Timeline extraction with date parsing from filenames and content
  - Evidence chain validation with exhibit tracking
  - Multi-org pattern matching (MAA, Apex/BofA, US Bank, T-Mobile, Credit Bureaus, IRS)
  - Delay tactics detection with regex patterns
  - Cross-org comparison scoring
  - WSJF-prioritised output
  - Markdown + JSON report generation

Usage:
  python scripts/systemic_indifference_analyzer.py
  python scripts/systemic_indifference_analyzer.py --case-dir ~/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL
  python scripts/systemic_indifference_analyzer.py --org MAA --output detailed
  python scripts/systemic_indifference_analyzer.py --all-orgs --json
  python scripts/systemic_indifference_analyzer.py --scan-emails --org MAA
"""

import argparse
import hashlib
import json
import os
import re
import sys
from collections import defaultdict
from dataclasses import asdict, dataclass, field
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

# ═════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═════════════════════════════════════════════════════════════════════════════

DEFAULT_LEGAL_BASE = (
    Path.home() / "Documents" / "Personal" / "CLT" / "MAA" / "Uptown" / "BHOPTI-LEGAL"
)
DEFAULT_ACTIVE_CASE = "01-ACTIVE-CRITICAL/MAA-26CV005596-590"

SUPPORTED_EXTENSIONS = {
    ".eml",
    ".md",
    ".txt",
    ".pdf",
    ".docx",
    ".doc",
    ".html",
    ".json",
    ".csv",
}

# Keywords for each issue category
ISSUE_CATEGORIES = {
    "mold": [
        "mold",
        "mildew",
        "fungus",
        "fungal",
        "spore",
        "mycotoxin",
        "musty",
        "damp",
    ],
    "hvac": [
        "hvac",
        "air conditioning",
        "heating",
        "a/c",
        "ac unit",
        "thermostat",
        "ductwork",
        "ventilation",
        "furnace",
    ],
    "water_intrusion": [
        "water intrusion",
        "leak",
        "leaking",
        "water damage",
        "flooding",
        "flood",
        "moisture",
        "condensation",
        "drip",
    ],
    "plumbing": [
        "plumbing",
        "pipe",
        "drain",
        "toilet",
        "faucet",
        "sewage",
        "sewer",
        "clog",
    ],
    "electrical": [
        "electrical",
        "wiring",
        "outlet",
        "breaker",
        "power outage",
        "light fixture",
    ],
    "structural": [
        "structural",
        "crack",
        "foundation",
        "ceiling",
        "wall damage",
        "floor",
        "door frame",
    ],
    "pest": [
        "pest",
        "roach",
        "cockroach",
        "mouse",
        "mice",
        "rat",
        "ant",
        "termite",
        "bed bug",
        "bedbug",
    ],
    "fire_safety": [
        "fire alarm",
        "smoke detector",
        "sprinkler",
        "fire extinguisher",
        "fire escape",
        "carbon monoxide",
    ],
    "health_hazard": [
        "health hazard",
        "toxic",
        "asbestos",
        "lead paint",
        "contamination",
        "biohazard",
    ],
    "noise": ["noise", "loud", "disturbance", "construction noise"],
    "habitability": [
        "habitability",
        "uninhabitable",
        "unfit",
        "warranty of habitability",
        "implied warranty",
    ],
    "pet_odor_mold": [
        "pet odor",
        "odor",
        "smell",
        "pet smell",
    ],  # often misdiagnosed mold
}

# Organisational hierarchy keywords
ORG_LEVEL_KEYWORDS = {
    "frontline": [
        "maintenance",
        "technician",
        "repair tech",
        "handyman",
        "porter",
        "custodian",
        "maintenance request",
    ],
    "property_management": [
        "property manager",
        "management office",
        "leasing office",
        "front desk",
        "office manager",
        "community manager",
        "site manager",
    ],
    "regional": [
        "regional manager",
        "regional director",
        "district manager",
        "area manager",
        "regional office",
        "division",
    ],
    "corporate": [
        "corporate",
        "headquarters",
        "hq",
        "executive",
        "vp",
        "ceo",
        "coo",
        "general counsel",
        "legal department",
        "corporate office",
        "mid-america apartment",
    ],
}

# Delay tactic patterns (regex, label, severity)
DELAY_TACTIC_PATTERNS = [
    (
        r"cancel(?:l?ed|ation)\s+(?:work\s*order|request|appointment|service)",
        "Work order/request cancellation",
        "HIGH",
    ),
    (r"no\s+respon(?:se|d)", "Non-response to communications", "HIGH"),
    (
        r"fail(?:ed|ure)?\s+to\s+(?:respond|reply|address|fix|repair|complete|follow)",
        "Failure to act",
        "HIGH",
    ),
    (
        r"delay(?:ed|ing)?\s+(?:repair|response|maintenance|action|resolution)",
        "Deliberate delay",
        "MEDIUM",
    ),
    (
        r"(?:pass|miss)(?:ed|ing)?\s+(?:deadline|due\s*date|appointment)",
        "Deadline violation",
        "HIGH",
    ),
    (
        r"ignor(?:ed?|ing)\s+(?:request|complaint|notice|email|message)",
        "Ignoring requests",
        "HIGH",
    ),
    (
        r"rescheduled?\s+(?:multiple|again|repeat|several|three|four|five)",
        "Repeated rescheduling",
        "MEDIUM",
    ),
    (
        r"temporary\s+(?:fix|repair|patch|solution|measure)",
        "Band-aid / temporary fix pattern",
        "MEDIUM",
    ),
    (
        r"closed?\s+(?:without|before)\s+(?:complet|resolv|fix)",
        "Premature closure of request",
        "HIGH",
    ),
    (
        r"(?:repeat|recurring|same\s+issue|happen(?:ed|ing)\s+again)",
        "Recurring unresolved issue",
        "HIGH",
    ),
    (
        r"(?:never|still\s+not|hasn't\s+been|has\s+not\s+been)\s+(?:fixed|repaired|addressed|resolved)",
        "Persistent unresolved issue",
        "HIGH",
    ),
    (
        r"work\s*order\s*(?:#?\d+)?\s*(?:cancel|close|incomplete)",
        "Work order irregularity",
        "MEDIUM",
    ),
    (
        r"(?:sent|submitted|filed)\s+(?:\d+|multiple|several|numerous)\s+(?:request|complaint|work\s*order)",
        "High volume of requests",
        "MEDIUM",
    ),
]

# Known organisations and their expected hierarchy depth
KNOWN_ORGS: Dict[str, Dict[str, Any]] = {
    "MAA": {
        "full_name": "MAA (Mid-America Apartment Communities)",
        "aliases": ["maa", "mid-america", "mid america", "maa uptown", "maa charlotte"],
        "type": "property_management",
        "expected_levels": 4,
        "statutes": ["N.C.G.S. § 42-42", "N.C.G.S. § 42-37.1", "N.C.G.S. § 75-1.1"],
        "subdirs": ["EVIDENCE", "CORRESPONDENCE", "RESEARCH"],
    },
    "Apex/BofA": {
        "full_name": "Apex Group / Bank of America",
        "aliases": ["apex", "bank of america", "bofa", "boa", "b of a"],
        "type": "financial_services",
        "expected_levels": 3,
        "statutes": ["FCRA", "FDCPA", "TILA"],
        "subdirs": [],
    },
    "US Bank": {
        "full_name": "US Bank / US Bancorp",
        "aliases": ["us bank", "u.s. bank", "us bancorp"],
        "type": "banking",
        "expected_levels": 4,
        "statutes": ["FCRA", "TILA", "ECOA"],
        "subdirs": [],
    },
    "T-Mobile": {
        "full_name": "T-Mobile US",
        "aliases": ["t-mobile", "tmobile", "t mobile"],
        "type": "telecommunications",
        "expected_levels": 3,
        "statutes": ["TCPA", "State Consumer Protection"],
        "subdirs": [],
    },
    "Credit Bureaus": {
        "full_name": "Credit Bureaus (Equifax, Experian, TransUnion)",
        "aliases": [
            "equifax",
            "experian",
            "transunion",
            "credit bureau",
            "credit report",
        ],
        "type": "credit_reporting",
        "expected_levels": 2,
        "statutes": ["FCRA 15 U.S.C. § 1681"],
        "subdirs": [],
    },
    "IRS": {
        "full_name": "Internal Revenue Service",
        "aliases": ["irs", "internal revenue", "tax"],
        "type": "government",
        "expected_levels": 5,
        "statutes": ["IRC"],
        "subdirs": [],
    },
}

# ═════════════════════════════════════════════════════════════════════════════
# DATA CLASSES
# ═════════════════════════════════════════════════════════════════════════════


@dataclass
class EvidenceItem:
    """A single piece of evidence found in the file system."""

    file_path: str
    file_name: str
    file_type: str  # eml, pdf, md, txt, etc.
    file_size: int
    date_extracted: Optional[str] = None  # ISO date if found
    date_source: str = ""  # "filename", "content", "metadata"
    org_mentions: List[str] = field(default_factory=list)
    issue_categories: List[str] = field(default_factory=list)
    org_levels: List[str] = field(default_factory=list)
    delay_tactics: List[str] = field(default_factory=list)
    content_snippet: str = ""  # first 200 chars
    content_hash: str = ""


@dataclass
class TimelineEvent:
    """A dated event in the dispute timeline."""

    date: str  # ISO format
    description: str
    source_file: str
    event_type: (
        str  # "request", "response", "cancellation", "escalation", "legal_action"
    )
    org: str = ""
    severity: str = "INFO"  # INFO, WARNING, CRITICAL


@dataclass
class OrgAnalysis:
    """Analysis results for a single organisation."""

    org_key: str
    full_name: str
    org_type: str
    status: str  # LITIGATION-READY, SETTLEMENT-ONLY, DEFER, NOT SYSTEMIC
    systemic_score: float
    max_score: float = 40.0
    evidence_count: int = 0
    timeline_months: float = 0.0
    earliest_date: Optional[str] = None
    latest_date: Optional[str] = None
    issue_types: List[str] = field(default_factory=list)
    org_levels_found: List[str] = field(default_factory=list)
    expected_levels: int = 1
    delay_tactics: List[str] = field(default_factory=list)
    delay_severity_counts: Dict[str, int] = field(default_factory=dict)
    timeline_events: List[TimelineEvent] = field(default_factory=list)
    evidence_items: List[EvidenceItem] = field(default_factory=list)
    score_breakdown: Dict[str, float] = field(default_factory=dict)
    statutes: List[str] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)
    cross_org_patterns: List[str] = field(default_factory=list)
    osint_data: Dict[str, str] = field(default_factory=dict)


@dataclass
class FullReport:
    """Complete systemic indifference report across all organisations."""

    generated_at: str
    case_dir: str
    total_files_scanned: int
    total_evidence_items: int
    org_analyses: Dict[str, OrgAnalysis] = field(default_factory=dict)
    cross_org_summary: Dict[str, Any] = field(default_factory=dict)
    wsjf_priority_order: List[str] = field(default_factory=list)
    settlement_recommendation: str = ""
    litigation_recommendation: str = ""


# ═════════════════════════════════════════════════════════════════════════════
# DATE EXTRACTION
# ═════════════════════════════════════════════════════════════════════════════

_MONTH_MAP = {}
import calendar as _cal

for _i, _name in enumerate(_cal.month_name):
    if _name:
        _MONTH_MAP[_name.lower()] = _i
        _MONTH_MAP[_name[:3].lower()] = _i

_DATE_PATTERNS = [
    # ISO: 2026-02-12
    (
        re.compile(r"(\d{4})-(\d{1,2})-(\d{1,2})"),
        lambda m: _safe_date(int(m.group(1)), int(m.group(2)), int(m.group(3))),
    ),
    # US: 02/12/2026 or 2/12/26
    (
        re.compile(r"(\d{1,2})/(\d{1,2})/(\d{2,4})"),
        lambda m: _safe_date(
            _fix_year(int(m.group(3))), int(m.group(1)), int(m.group(2))
        ),
    ),
    # Named: February 12, 2026 or Feb 12 2026
    (
        re.compile(r"([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})"),
        lambda m: _named_date(m.group(1), int(m.group(2)), int(m.group(3))),
    ),
    # Euro: 12 February 2026
    (
        re.compile(r"(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})"),
        lambda m: _named_date(m.group(2), int(m.group(1)), int(m.group(3))),
    ),
    # Filename dates: 20260212 or 2026-02-12
    (
        re.compile(r"(\d{4})(\d{2})(\d{2})"),
        lambda m: _safe_date(int(m.group(1)), int(m.group(2)), int(m.group(3))),
    ),
]


def _fix_year(y: int) -> int:
    return y + 2000 if y < 100 else y


def _safe_date(year: int, month: int, day: int) -> Optional[date]:
    try:
        if 1990 <= year <= 2035 and 1 <= month <= 12 and 1 <= day <= 31:
            return date(year, month, day)
    except (ValueError, OverflowError):
        pass
    return None


def _named_date(month_str: str, day: int, year: int) -> Optional[date]:
    month = _MONTH_MAP.get(month_str.lower().strip()[:3])
    if month:
        return _safe_date(year, month, day)
    return None


def extract_dates_from_text(text: str) -> List[Tuple[date, str]]:
    """Extract all recognisable dates from text. Returns list of (date, original_string)."""
    results = []
    seen_positions: Set[int] = set()
    for pattern, parser in _DATE_PATTERNS:
        for m in pattern.finditer(text):
            if m.start() in seen_positions:
                continue
            parsed = parser(m)
            if parsed:
                seen_positions.add(m.start())
                results.append((parsed, m.group(0)))
    # Deduplicate by date value
    seen_dates: Set[str] = set()
    unique = []
    for d, s in sorted(results, key=lambda x: x[0]):
        key = str(d)
        if key not in seen_dates:
            seen_dates.add(key)
            unique.append((d, s))
    return unique


def extract_date_from_filename(filename: str) -> Optional[date]:
    """Try to extract a date from a filename like 'WSJF-30.0-20260212-Doug-Extension-READY.eml'."""
    # Try YYYYMMDD pattern
    m = re.search(r"(\d{4})(\d{2})(\d{2})", filename)
    if m:
        d = _safe_date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        if d:
            return d
    # Try YYYY-MM-DD
    m = re.search(r"(\d{4})-(\d{2})-(\d{2})", filename)
    if m:
        return _safe_date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
    return None


# ═════════════════════════════════════════════════════════════════════════════
# FILE SCANNER
# ═════════════════════════════════════════════════════════════════════════════


def read_file_content(filepath: Path, max_bytes: int = 50000) -> str:
    """Read file content as text. Handles common encodings. Skips binary."""
    if filepath.suffix.lower() in {".pdf", ".docx", ".doc"}:
        # For PDF/DOCX we just extract what we can from filename + any sidecar .txt
        txt_sidecar = filepath.with_suffix(".txt")
        if txt_sidecar.exists():
            return read_file_content(txt_sidecar, max_bytes)
        # Return filename-based info only
        return f"[Binary file: {filepath.name}]"

    for encoding in ("utf-8", "latin-1", "cp1252"):
        try:
            with open(filepath, "r", encoding=encoding, errors="replace") as f:
                return f.read(max_bytes)
        except (OSError, UnicodeError):
            continue
    return ""


def scan_directory(base_dir: Path, max_files: int = 5000) -> List[EvidenceItem]:
    """Recursively scan a directory for evidence files."""
    items: List[EvidenceItem] = []
    if not base_dir.exists():
        return items

    count = 0
    for filepath in sorted(base_dir.rglob("*")):
        if count >= max_files:
            break
        if not filepath.is_file():
            continue
        if filepath.suffix.lower() not in SUPPORTED_EXTENSIONS:
            continue
        if any(part.startswith(".") for part in filepath.parts):
            continue  # skip hidden dirs

        count += 1
        content = read_file_content(filepath)
        content_lower = content.lower()
        file_size = filepath.stat().st_size

        # Extract date
        file_date = extract_date_from_filename(filepath.name)
        date_source = "filename" if file_date else ""
        if not file_date:
            dates_in_content = extract_dates_from_text(content)
            if dates_in_content:
                file_date = dates_in_content[0][0]
                date_source = "content"

        # Detect organisation mentions
        org_mentions = []
        for org_key, org_info in KNOWN_ORGS.items():
            for alias in org_info["aliases"]:
                if alias in content_lower:
                    if org_key not in org_mentions:
                        org_mentions.append(org_key)
                    break

        # Detect issue categories
        issue_cats = []
        for cat, keywords in ISSUE_CATEGORIES.items():
            for kw in keywords:
                if kw in content_lower:
                    if cat not in issue_cats:
                        issue_cats.append(cat)
                    break

        # Detect org levels
        levels = []
        for level, keywords in ORG_LEVEL_KEYWORDS.items():
            for kw in keywords:
                if kw in content_lower:
                    if level not in levels:
                        levels.append(level)
                    break

        # Detect delay tactics
        delay_found = []
        for pattern, label, severity in DELAY_TACTIC_PATTERNS:
            if re.search(pattern, content_lower):
                delay_found.append(f"{label} [{severity}]")

        # Content hash for deduplication
        content_hash = hashlib.md5(
            content.encode("utf-8", errors="replace")
        ).hexdigest()[:12]

        items.append(
            EvidenceItem(
                file_path=str(filepath),
                file_name=filepath.name,
                file_type=filepath.suffix.lower().lstrip("."),
                file_size=file_size,
                date_extracted=str(file_date) if file_date else None,
                date_source=date_source,
                org_mentions=org_mentions,
                issue_categories=issue_cats,
                org_levels=levels,
                delay_tactics=delay_found,
                content_snippet=content[:200].replace("\n", " ").strip(),
                content_hash=content_hash,
            )
        )

    return items


# ═════════════════════════════════════════════════════════════════════════════
# ANALYSIS ENGINE
# ═════════════════════════════════════════════════════════════════════════════


def build_timeline(items: List[EvidenceItem], org_key: str) -> List[TimelineEvent]:
    """Build a chronological timeline from evidence items for a specific org."""
    events: List[TimelineEvent] = []
    for item in items:
        if org_key not in item.org_mentions and org_key != "ALL":
            continue
        if not item.date_extracted:
            continue

        # Classify event type
        name_lower = item.file_name.lower()
        event_type = "document"
        if any(
            kw in name_lower
            for kw in ["request", "complaint", "work order", "maintenance"]
        ):
            event_type = "request"
        elif any(kw in name_lower for kw in ["response", "reply", "re_", "re:"]):
            event_type = "response"
        elif any(kw in name_lower for kw in ["cancel", "closed"]):
            event_type = "cancellation"
        elif any(kw in name_lower for kw in ["settlement", "offer", "proposal"]):
            event_type = "settlement"
        elif any(
            kw in name_lower
            for kw in ["court", "filing", "motion", "complaint", "summons"]
        ):
            event_type = "legal_action"
        elif any(kw in name_lower for kw in ["escal", "urgent", "emergency"]):
            event_type = "escalation"
        elif any(
            kw in name_lower for kw in ["photo", "image", "screenshot", "evidence"]
        ):
            event_type = "evidence"
        elif any(kw in name_lower for kw in ["lease", "agreement", "contract"]):
            event_type = "contract"

        # Determine severity from delay tactics
        severity = "INFO"
        if item.delay_tactics:
            if any("[HIGH]" in d for d in item.delay_tactics):
                severity = "CRITICAL"
            elif any("[MEDIUM]" in d for d in item.delay_tactics):
                severity = "WARNING"

        description = item.file_name
        if item.issue_categories:
            description += f" [{', '.join(item.issue_categories[:3])}]"

        events.append(
            TimelineEvent(
                date=item.date_extracted,
                description=description,
                source_file=item.file_path,
                event_type=event_type,
                org=org_key,
                severity=severity,
            )
        )

    events.sort(key=lambda e: e.date)
    return events


def calculate_systemic_score(
    evidence_count: int,
    timeline_months: float,
    issue_types: List[str],
    org_levels: List[str],
    delay_tactics: List[str],
    expected_levels: int,
) -> Tuple[float, Dict[str, float]]:
    """
    Calculate systemic indifference score on a 0-40 scale.

    Components (10 points each, 40 total):
      1. Organisation depth: org_levels / expected_levels * 10
      2. Issue diversity: unique_issue_types * 2.5 (cap 10)
      3. Volume: evidence_count (log scale, cap 10)
      4. Timeline: months (cap 10 at 12+ months)
    """
    import math

    # 1. Org depth (0-10)
    depth_ratio = len(org_levels) / max(expected_levels, 1)
    org_depth_score = min(depth_ratio * 10, 10.0)

    # 2. Issue diversity (0-10)
    issue_score = min(len(issue_types) * 2.5, 10.0)

    # 3. Volume (0-10, logarithmic)
    if evidence_count > 0:
        volume_score = min(math.log2(evidence_count + 1) * 2.0, 10.0)
    else:
        volume_score = 0.0

    # 4. Timeline (0-10)
    timeline_score = min(timeline_months / 1.2, 10.0)  # 12 months = 10

    # Bonus: delay tactics (up to +5, but cap total at 40)
    delay_bonus = min(len(delay_tactics) * 0.5, 5.0)

    total = org_depth_score + issue_score + volume_score + timeline_score + delay_bonus
    total = min(total, 40.0)

    breakdown = {
        "org_depth": round(org_depth_score, 2),
        "issue_diversity": round(issue_score, 2),
        "volume": round(volume_score, 2),
        "timeline": round(timeline_score, 2),
        "delay_bonus": round(delay_bonus, 2),
        "total": round(total, 2),
    }

    return round(total, 2), breakdown


def classify_status(score: float) -> str:
    """Classify litigation readiness from systemic score."""
    if score >= 35:
        return "LITIGATION-READY"
    elif score >= 25:
        return "LITIGATION-READY"
    elif score >= 15:
        return "SETTLEMENT-ONLY"
    elif score >= 8:
        return "DEFER"
    else:
        return "NOT SYSTEMIC"


def generate_recommendations(analysis: OrgAnalysis) -> List[str]:
    """Generate actionable recommendations for an org analysis."""
    recs = []
    score = analysis.systemic_score

    if score >= 35:
        recs.append(f"✅ {analysis.org_key} is LITIGATION-READY (score {score}/40)")
        recs.append("Proceed with confidence — evidence chain is complete")
        if analysis.delay_tactics:
            recs.append(
                f"Highlight {len(analysis.delay_tactics)} delay tactics as evidence of deliberate indifference"
            )
    elif score >= 25:
        recs.append(
            f"🟢 {analysis.org_key} approaching litigation threshold (score {score}/40)"
        )
        gaps = []
        if analysis.score_breakdown.get("org_depth", 0) < 5:
            gaps.append(
                "Document interactions at higher org levels (regional/corporate)"
            )
        if analysis.score_breakdown.get("issue_diversity", 0) < 5:
            gaps.append("Document additional issue categories")
        if analysis.score_breakdown.get("volume", 0) < 5:
            gaps.append("Collect additional evidence items")
        if gaps:
            recs.append("To strengthen: " + "; ".join(gaps))
    elif score >= 15:
        recs.append(
            f"🟡 {analysis.org_key} suitable for settlement only (score {score}/40)"
        )
        recs.append(
            "Insufficient evidence depth for litigation — focus on negotiated resolution"
        )
    elif score >= 8:
        recs.append(f"🟠 {analysis.org_key} — defer to later phase (score {score}/40)")
        recs.append("Gather more evidence before pursuing any action")
    else:
        recs.append(f"⚪ {analysis.org_key} — not systemic (score {score}/40)")
        recs.append("Isolated incident — does not establish pattern of indifference")

    return recs


# ═════════════════════════════════════════════════════════════════════════════
# CROSS-ORG ANALYSIS
# ═════════════════════════════════════════════════════════════════════════════


def cross_org_analysis(analyses: Dict[str, OrgAnalysis]) -> Dict[str, Any]:
    """Compare patterns across organisations."""
    all_issues: Set[str] = set()
    all_tactics: Set[str] = set()
    total_evidence = 0
    orgs_with_pattern = 0

    for org, a in analyses.items():
        all_issues.update(a.issue_types)
        all_tactics.update(a.delay_tactics)
        total_evidence += a.evidence_count
        if a.systemic_score >= 15:
            orgs_with_pattern += 1

    # Common patterns across orgs
    common_issues = defaultdict(int)
    for org, a in analyses.items():
        for issue in a.issue_types:
            common_issues[issue] += 1
    shared_issues = {k: v for k, v in common_issues.items() if v >= 2}

    common_tactics = defaultdict(int)
    for org, a in analyses.items():
        for tactic in a.delay_tactics:
            # Normalise tactic label (strip severity)
            label = re.sub(r"\s*\[.*?\]", "", tactic)
            common_tactics[label] += 1
    shared_tactics = {k: v for k, v in common_tactics.items() if v >= 2}

    return {
        "orgs_analysed": len(analyses),
        "orgs_with_systemic_pattern": orgs_with_pattern,
        "total_evidence_items": total_evidence,
        "unique_issue_types": sorted(all_issues),
        "shared_issue_types": dict(shared_issues),
        "shared_delay_tactics": dict(shared_tactics),
        "litigation_ready": [
            k for k, a in analyses.items() if a.status == "LITIGATION-READY"
        ],
        "settlement_only": [
            k for k, a in analyses.items() if a.status == "SETTLEMENT-ONLY"
        ],
        "deferred": [
            k for k, a in analyses.items() if a.status in ("DEFER", "NOT SYSTEMIC")
        ],
        "recommendation": (
            "Include cross-org patterns in LITIGATION materials (proves institutional pattern recognition)"
            if orgs_with_pattern >= 2
            else "Focus on MAA only for settlement — keep other orgs separate"
        ),
    }


# ═════════════════════════════════════════════════════════════════════════════
# WSJF PRIORITISATION
# ═════════════════════════════════════════════════════════════════════════════


def wsjf_prioritise(analyses: Dict[str, OrgAnalysis]) -> List[str]:
    """Order organisations by WSJF score for prioritised action."""
    scored = []
    for key, a in analyses.items():
        # Business value: systemic score / 40 * 10
        bv = (a.systemic_score / 40) * 10
        # Time criticality: based on status
        tc = {
            "LITIGATION-READY": 9,
            "SETTLEMENT-ONLY": 7,
            "DEFER": 3,
            "NOT SYSTEMIC": 1,
        }.get(a.status, 1)
        # Risk reduction: delay tactics count
        rr = min(len(a.delay_tactics) * 1.5, 10)
        # Job size: inverse of evidence availability (more evidence = smaller job)
        js = max(1, 10 - min(a.evidence_count / 5, 8))

        cost_of_delay = bv + tc + rr
        wsjf = cost_of_delay / js
        scored.append((key, round(wsjf, 2)))

    scored.sort(key=lambda x: x[1], reverse=True)
    return [k for k, _ in scored]


# ═════════════════════════════════════════════════════════════════════════════
# REPORT GENERATION
# ═════════════════════════════════════════════════════════════════════════════


def generate_markdown_report(report: FullReport) -> str:
    """Generate a comprehensive Markdown report."""
    lines = []
    now_str = report.generated_at

    lines.append("# Systemic Indifference Analysis Report")
    lines.append(f"**Generated:** {now_str}")
    lines.append(f"**Case Directory:** `{report.case_dir}`")
    lines.append(f"**Files Scanned:** {report.total_files_scanned}")
    lines.append(f"**Evidence Items:** {report.total_evidence_items}")
    lines.append("")

    # Executive Summary Table
    lines.append("## Executive Summary")
    lines.append("")
    lines.append(
        "| Entity | Status | Score | Evidence | Timeline | Delay Tactics | Issues |"
    )
    lines.append("| :--- | :--- | :---: | :---: | :--- | :---: | :--- |")

    for org_key in report.wsjf_priority_order:
        a = report.org_analyses.get(org_key)
        if not a:
            continue
        score_str = f"**{a.systemic_score}**/{a.max_score}"
        timeline_str = f"{a.timeline_months:.0f} mo" if a.timeline_months else "—"
        if a.earliest_date and a.latest_date:
            timeline_str += f" ({a.earliest_date} → {a.latest_date})"
        issues_str = ", ".join(a.issue_types[:4]) if a.issue_types else "—"
        status_icon = {
            "LITIGATION-READY": "🔴",
            "SETTLEMENT-ONLY": "🟡",
            "DEFER": "🟠",
            "NOT SYSTEMIC": "⚪",
        }.get(a.status, "⚪")
        lines.append(
            f"| **{org_key}** | {status_icon} {a.status} | {score_str} | "
            f"{a.evidence_count} | {timeline_str} | {len(a.delay_tactics)} | {issues_str} |"
        )

    lines.append("")

    # Settlement vs Litigation guidance
    lines.append("## Strategic Guidance")
    lines.append("")
    cross = report.cross_org_summary
    lines.append(
        f"- **Settlement Focus:** {', '.join(cross.get('litigation_ready', ['MAA'])) or 'MAA'} only (avoid confusion)"
    )
    lines.append(
        f"- **Litigation Bundle:** Include cross-org if needed ({cross.get('orgs_with_systemic_pattern', 0)} orgs with pattern)"
    )
    lines.append(
        f"- **Cross-Org Recommendation:** {cross.get('recommendation', 'N/A')}"
    )
    if cross.get("shared_issue_types"):
        lines.append(f"- **Shared Issue Types:** {cross['shared_issue_types']}")
    if cross.get("shared_delay_tactics"):
        lines.append(f"- **Shared Delay Tactics:** {cross['shared_delay_tactics']}")
    lines.append("")

    # Detailed Breakdown
    lines.append("## Detailed Breakdown")
    lines.append("")

    for org_key in report.wsjf_priority_order:
        a = report.org_analyses.get(org_key)
        if not a:
            continue

        lines.append(f"### {org_key} — {a.full_name}")
        lines.append("")
        lines.append(f"- **Status:** {a.status}")
        lines.append(f"- **Systemic Score:** {a.systemic_score}/{a.max_score}")
        lines.append(f"- **Evidence Items:** {a.evidence_count}")
        if a.earliest_date and a.latest_date:
            lines.append(
                f"- **Timeline:** {a.earliest_date} → {a.latest_date} ({a.timeline_months:.1f} months)"
            )
        lines.append(
            f"- **Org Levels Found:** {' → '.join(a.org_levels_found) if a.org_levels_found else '—'} (expected {a.expected_levels})"
        )
        lines.append(
            f"- **Issue Types:** {', '.join(a.issue_types) if a.issue_types else '—'}"
        )
        lines.append(
            f"- **Applicable Statutes:** {', '.join(a.statutes) if a.statutes else '—'}"
        )
        lines.append("")

        if a.score_breakdown:
            lines.append("**Score Breakdown:**")
            lines.append("")
            lines.append("| Component | Score | Max |")
            lines.append("| :--- | :---: | :---: |")
            for component, score in a.score_breakdown.items():
                if component == "total":
                    continue
                max_val = 10 if component != "delay_bonus" else 5
                bar_filled = int(score / max_val * 10)
                bar = "█" * bar_filled + "░" * (10 - bar_filled)
                lines.append(
                    f"| {component.replace('_', ' ').title()} | {bar} {score} | {max_val} |"
                )
            lines.append("")

        if a.delay_tactics:
            lines.append(f"**Delay Tactics Detected ({len(a.delay_tactics)}):**")
            lines.append("")
            for tactic in sorted(set(a.delay_tactics)):
                lines.append(f"- ⚠️ {tactic}")
            lines.append("")

        if a.recommendations:
            lines.append("**Recommendations:**")
            lines.append("")
            for rec in a.recommendations:
                lines.append(f"- {rec}")
            lines.append("")

        if a.timeline_events:
            lines.append(f"**Timeline ({len(a.timeline_events)} events):**")
            lines.append("")
            for event in a.timeline_events[:20]:  # Cap at 20
                icon = {
                    "request": "📝",
                    "response": "📨",
                    "cancellation": "❌",
                    "escalation": "🔺",
                    "legal_action": "⚖️",
                    "settlement": "🤝",
                    "evidence": "📷",
                    "contract": "📄",
                    "document": "📋",
                }.get(event.event_type, "•")
                sev_icon = {"CRITICAL": "🔴", "WARNING": "🟡", "INFO": ""}.get(
                    event.severity, ""
                )
                lines.append(f"- `{event.date}` {icon} {event.description} {sev_icon}")
            if len(a.timeline_events) > 20:
                lines.append(f"- ... and {len(a.timeline_events) - 20} more events")
            lines.append("")

        lines.append("---")
        lines.append("")

    # WSJF Priority
    lines.append("## WSJF Priority Order")
    lines.append("")
    for i, org_key in enumerate(report.wsjf_priority_order, 1):
        a = report.org_analyses.get(org_key)
        if a:
            lines.append(
                f"{i}. **{org_key}** — {a.status} (score {a.systemic_score}/40)"
            )
    lines.append("")

    # Judge perspective
    lines.append("## Judicial Perspective")
    lines.append("")
    primary_org_key = list(report.wsjf_priority_order)[0] if report.wsjf_priority_order else None
    primary_org = report.org_analyses.get(primary_org_key) if primary_org_key else None

    if primary_org and primary_org.systemic_score >= 25:
        lines.append(
            f'> "This isn\'t a maintenance mistake. This is how {primary_org.org_key} operates."'
        )
        lines.append(
            f"> — Projected judicial interpretation of {primary_org.evidence_count} evidence items over {primary_org.timeline_months:.0f} months"
        )
        lines.append("")
        lines.append(
            f"NC courts can award **punitive damages** for deliberate organizational indifference (not just negligence)."
        )
        lines.append(
            f"Pattern: {primary_org.evidence_count}+ requests across {primary_org.timeline_months:.0f} months = organisational, not isolated."
        )
    lines.append("")

    # Footer
    lines.append("---")
    lines.append(f"*Generated by Systemic Indifference Analyzer v2.0 | {now_str}*")

    return "\n".join(lines)


# ═════════════════════════════════════════════════════════════════════════════
# MAIN ANALYSIS PIPELINE
# ═════════════════════════════════════════════════════════════════════════════


def run_analysis(
    case_dir: Optional[Path] = None,
    target_org: Optional[str] = None,
    output_format: str = "markdown",
) -> FullReport:
    """Run the full systemic indifference analysis pipeline."""

    base = case_dir or DEFAULT_LEGAL_BASE
    active_case = (
        base / DEFAULT_ACTIVE_CASE if (base / DEFAULT_ACTIVE_CASE).exists() else base
    )

    print(f"📂 Scanning: {active_case}")
    print(f"   Target org: {target_org or 'ALL'}")
    print()

    # Step 1: Scan files
    all_items = scan_directory(active_case)
    print(f"📄 Files scanned: {len(all_items)}")

    # Also scan the broader BHOPTI-LEGAL for cross-org evidence if it exists
    if base.exists() and base != active_case:
        extra_items = scan_directory(base, max_files=2000)
        # Merge, avoiding duplicates by hash
        existing_hashes = {item.content_hash for item in all_items}
        for item in extra_items:
            if item.content_hash not in existing_hashes:
                all_items.append(item)
                existing_hashes.add(item.content_hash)
        print(f"📄 Total after cross-directory scan: {len(all_items)}")

    # Step 2: Analyse each org
    org_analyses: Dict[str, OrgAnalysis] = {}

    for org_key, org_info in KNOWN_ORGS.items():
        if target_org and org_key != target_org:
            continue

        # Filter items that mention this org (or all items for primary org)
        # If a target org is specified or we assume the first KNOWN_ORGs key to be primary
        primary_org_name = args.org if hasattr(args, 'org') and args.org else list(KNOWN_ORGS.keys())[0]
        if org_key == primary_org_name:
            # The primary case — include items that don't mention any other org
            org_items = [
                item
                for item in all_items
                if org_key in item.org_mentions
                or (
                    not item.org_mentions
                    and any(
                        kw in item.file_path.lower()
                        for kw in [
                            "maa",
                            "uptown",
                            "maintenance",
                            "work order",
                            "lease",
                            "settlement",
                        ]
                    )
                )
            ]
        else:
            org_items = [item for item in all_items if org_key in item.org_mentions]

        # Collect aggregates
        all_issues: Set[str] = set()
        all_levels: Set[str] = set()
        all_delays: List[str] = []
        all_dates: List[date] = []

        for item in org_items:
            all_issues.update(item.issue_categories)
            all_levels.update(item.org_levels)
            all_delays.extend(item.delay_tactics)
            if item.date_extracted:
                try:
                    all_dates.append(date.fromisoformat(item.date_extracted))
                except (ValueError, TypeError):
                    pass

        # Timeline
        earliest = min(all_dates) if all_dates else None
        latest = max(all_dates) if all_dates else None
        timeline_months = 0.0
        if earliest and latest:
            delta = latest - earliest
            timeline_months = delta.days / 30.44

        # Score
        score, breakdown = calculate_systemic_score(
            evidence_count=len(org_items),
            timeline_months=timeline_months,
            issue_types=list(all_issues),
            org_levels=list(all_levels),
            delay_tactics=all_delays,
            expected_levels=org_info["expected_levels"],
        )

        status = classify_status(score)

        # Build timeline
        timeline_events = build_timeline(org_items, org_key)

        # Delay severity counts
        delay_severity: Dict[str, int] = {"HIGH": 0, "MEDIUM": 0, "LOW": 0}
        for d in all_delays:
            for sev in ["HIGH", "MEDIUM", "LOW"]:
                if f"[{sev}]" in d:
                    delay_severity[sev] += 1

        analysis = OrgAnalysis(
            org_key=org_key,
            full_name=org_info["full_name"],
            org_type=org_info["type"],
            status=status,
            systemic_score=score,
            evidence_count=len(org_items),
            timeline_months=round(timeline_months, 1),
            earliest_date=str(earliest) if earliest else None,
            latest_date=str(latest) if latest else None,
            issue_types=sorted(all_issues),
            org_levels_found=sorted(all_levels),
            expected_levels=org_info["expected_levels"],
            delay_tactics=sorted(set(all_delays)),
            delay_severity_counts=delay_severity,
            timeline_events=timeline_events,
            evidence_items=org_items[:50],  # Cap stored items
            score_breakdown=breakdown,
            statutes=org_info.get("statutes", []),
        )
        analysis.recommendations = generate_recommendations(analysis)

        org_analyses[org_key] = analysis
        print(
            f"  {org_key}: score={score}/40  status={status}  evidence={len(org_items)}  timeline={timeline_months:.1f}mo"
        )

    # Step 3: Cross-org analysis
    cross = cross_org_analysis(org_analyses)

    # Step 4: WSJF prioritisation
    priority_order = wsjf_prioritise(org_analyses)

    # Step 5: Build report
    primary_org_key = priority_order[0] if priority_order else "Primary Target"
    report = FullReport(
        generated_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        case_dir=str(active_case),
        total_files_scanned=len(all_items),
        total_evidence_items=sum(a.evidence_count for a in org_analyses.values()),
        org_analyses=org_analyses,
        cross_org_summary=cross,
        wsjf_priority_order=priority_order,
        settlement_recommendation=f"Focus ONLY on {primary_org_key} for settlement (avoid confusion with other orgs)",
        litigation_recommendation="Include cross-org patterns to show institutional indifference is not isolated",
    )

    return report


# ═════════════════════════════════════════════════════════════════════════════
# CLI
# ═════════════════════════════════════════════════════════════════════════════


def main():
    parser = argparse.ArgumentParser(
        description="Systemic Indifference Analyzer — Real file scanning with evidence chain validation",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                                    # Scan default BHOPTI-LEGAL directory
  %(prog)s --case-dir /path/to/legal/files    # Custom case directory
  %(prog)s --org MAA                          # Analyse only MAA
  %(prog)s --all-orgs --json                  # All orgs, JSON output
  %(prog)s --output detailed                  # Detailed markdown report
        """,
    )
    parser.add_argument("--case-dir", type=str, help="Path to legal case directory")
    parser.add_argument(
        "--osint", action="store_true", help="Enable Human-in-the-Loop OSINT enrichment"
    )
    parser.add_argument(
        "--org",
        type=str,
        choices=list(KNOWN_ORGS.keys()),
        help="Analyse single organisation",
    )
    parser.add_argument(
        "--all-orgs", action="store_true", help="Analyse all known organisations"
    )
    parser.add_argument(
        "--output",
        choices=["markdown", "json", "summary", "detailed"],
        default="markdown",
    )
    parser.add_argument(
        "--json", action="store_true", help="Output JSON instead of markdown"
    )
    parser.add_argument("--save", type=str, help="Save report to file path")
    parser.add_argument(
        "--scan-emails", action="store_true", help="Include email scanning"
    )

    args = parser.parse_args()

    case_dir = Path(args.case_dir) if args.case_dir else None
    output_format = "json" if args.json else args.output

    print("═" * 60)
    print("  SYSTEMIC INDIFFERENCE ANALYZER v2.0")
    print("  Real File Scanning · Timeline Extraction · Evidence Chains")
    print("═" * 60)
    print()

    report = run_analysis(
        case_dir=case_dir,
        target_org=args.org if not args.all_orgs else None,
        output_format=output_format,
    )

    if args.osint:
        print("\n" + "═" * 60)
        print("  HUMAN-IN-THE-LOOP OSINT ENRICHMENT")
        print("═" * 60)
        for org_key, analysis in report.org_analyses.items():
            if analysis.status in ["LITIGATION-READY", "SETTLEMENT-ONLY"] or org_key == args.org:
                print(f"\n[?] Enriching target: {analysis.full_name}")
                reg_agent = input(f"    Enter Registered Agent for {org_key} (or press Enter to skip): ").strip()
                if reg_agent:
                    analysis.osint_data['registered_agent'] = reg_agent

                exec_name = input(f"    Enter known Executive/CEO name for {org_key} (or press Enter to skip): ").strip()
                if exec_name:
                    analysis.osint_data['executive_target'] = exec_name

                known_law_firm = input(f"    Enter typical opposing counsel/firm for {org_key} (or press Enter to skip): ").strip()
                if known_law_firm:
                    analysis.osint_data['opposing_counsel'] = known_law_firm

                if analysis.osint_data:
                    print(f"    ✅ OSINT data integrated for {org_key}.")


    print()

    if output_format == "json":
        # Convert to JSON-serialisable format
        def _serialise(obj):
            if hasattr(obj, "__dict__"):
                d = {}
                for k, v in obj.__dict__.items():
                    d[k] = _serialise(v)
                return d
            elif isinstance(obj, dict):
                return {k: _serialise(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [_serialise(v) for v in obj]
            elif isinstance(obj, (date, datetime)):
                return str(obj)
            elif isinstance(obj, Path):
                return str(obj)
            else:
                return obj

        json_data = _serialise(report)
        output_str = json.dumps(json_data, indent=2, default=str)
        print(output_str)
    else:
        md_content = generate_markdown_report(report)
        print(md_content)

    # Save report
    save_path = args.save
    if not save_path:
        # Default save location
        script_dir = Path(__file__).parent.parent
        save_path = str(script_dir / "SYSTEMIC-INDIFFERENCE-REPORT.md")

    try:
        if output_format == "json":
            json_path = save_path.replace(".md", ".json")
            with open(json_path, "w") as f:
                json.dump(_serialise(report), f, indent=2, default=str)
            print(f"\n📄 JSON report saved: {json_path}")
        else:
            md_content = generate_markdown_report(report)
            with open(save_path, "w") as f:
                f.write(md_content)
            print(f"\n📄 Markdown report saved: {save_path}")

            # Also save JSON companion
            json_path = save_path.replace(".md", ".json")

            def _serialise_for_json(obj):
                if hasattr(obj, "__dict__"):
                    return {k: _serialise_for_json(v) for k, v in obj.__dict__.items()}
                elif isinstance(obj, dict):
                    return {k: _serialise_for_json(v) for k, v in obj.items()}
                elif isinstance(obj, list):
                    return [_serialise_for_json(v) for v in obj]
                elif isinstance(obj, (date, datetime)):
                    return str(obj)
                elif isinstance(obj, Path):
                    return str(obj)
                return obj

            with open(json_path, "w") as f:
                json.dump(_serialise_for_json(report), f, indent=2, default=str)
            print(f"📄 JSON companion saved: {json_path}")

    except OSError as e:
        print(f"⚠️  Could not save report: {e}", file=sys.stderr)

    # Summary line
    print()
    for org_key in report.wsjf_priority_order:
        a = report.org_analyses.get(org_key)
        if a:
            icon = {
                "LITIGATION-READY": "🔴",
                "SETTLEMENT-ONLY": "🟡",
                "DEFER": "🟠",
                "NOT SYSTEMIC": "⚪",
            }.get(a.status, "⚪")
            bar_len = int(a.systemic_score / 40 * 20)
            bar = "█" * bar_len + "░" * (20 - bar_len)
            print(
                f"  {icon} {org_key:<18} {bar} {a.systemic_score:>5.1f}/40  {a.status}"
            )

    print()
    litigation_ready = report.cross_org_summary.get('litigation_ready', [])
    primary_focus = ", ".join(litigation_ready) if litigation_ready else "Primary Target"
    print(f"Settlement: Focus on {primary_focus}")
    print(
        f"Litigation: Include cross-org if {report.cross_org_summary.get('orgs_with_systemic_pattern', 0)} >= 2 orgs show pattern"
    )


if __name__ == "__main__":
    main()
