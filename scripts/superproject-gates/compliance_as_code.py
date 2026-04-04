#!/usr/bin/env python3
"""
Compliance as Code - ROAM Staleness Detection
Implements automated compliance checks for governance artifacts
"""

import os
import sys
import logging
import argparse
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@dataclass
class StaleROAMEntry:
    """Represents a stale ROAM entry"""
    id: str
    section: str  # blockers, risks, dependencies
    title: str
    roam_status: str
    discovered: str
    age_days: int
    last_updated: Optional[str] = None


@dataclass
class ComplianceResult:
    """Result of a compliance check"""
    is_compliant: bool
    stale_entries: List[StaleROAMEntry]
    total_entries_checked: int
    metadata_age_days: Optional[int] = None
    error_message: Optional[str] = None


class ROAMComplianceChecker:
    """
    Checks ROAM_TRACKER.yaml for staleness and compliance
    """

    def __init__(self, roam_file: Path = Path(".goalie/ROAM_TRACKER.yaml")):
        self.roam_file = roam_file
        self.max_age_days = int(os.environ.get('ROAM_MAX_AGE_DAYS', 3))

    def check_roam_current(self, max_age_days: Optional[int] = None) -> ComplianceResult:
        """
        Check if ROAM_TRACKER.yaml entries are current (fresh)

        Args:
            max_age_days: Maximum allowed age in days. If None, uses ROAM_MAX_AGE_DAYS env var or default 3

        Returns:
            ComplianceResult with staleness information
        """
        if max_age_days is not None:
            self.max_age_days = max_age_days

        # Check if ROAM file exists
        if not self.roam_file.exists():
            return ComplianceResult(
                is_compliant=False,
                stale_entries=[],
                total_entries_checked=0,
                error_message=f"ROAM file not found: {self.roam_file}"
            )

        # Parse YAML
        try:
            import yaml
            with open(self.roam_file, 'r') as f:
                data = yaml.safe_load(f)
        except Exception as e:
            return ComplianceResult(
                is_compliant=False,
                stale_entries=[],
                total_entries_checked=0,
                error_message=f"Failed to parse ROAM file: {e}"
            )

        if not data:
            return ComplianceResult(
                is_compliant=False,
                stale_entries=[],
                total_entries_checked=0,
                error_message=f"Empty ROAM file: {self.roam_file}"
            )

        # Check metadata last_updated
        metadata = data.get('metadata', {})
        last_updated = metadata.get('last_updated')
        metadata_age_days = None

        if last_updated:
            metadata_age_days = self._parse_age_from_timestamp(last_updated)
            logger.info(f"ROAM metadata last_updated: {last_updated} ({metadata_age_days} days old)")

        # Check individual entries for staleness
        stale_entries = []
        total_entries = 0

        for section in ['blockers', 'risks', 'dependencies']:
            items = data.get(section, [])
            if not items:
                continue

            for item in items:
                if not isinstance(item, dict):
                    continue

                total_entries += 1
                item_id = item.get('id', 'unknown')
                title = item.get('title', 'No title')
                roam_status = item.get('roam_status', '')
                discovered = item.get('discovered')
                item_last_updated = item.get('last_updated')

                # Check staleness for OWNED items that haven't been resolved
                if roam_status in ['OWNED', 'MITIGATING'] and discovered:
                    age_days = self._parse_age_from_timestamp(discovered)

                    # Also check last_updated if available
                    if item_last_updated:
                        last_updated_age = self._parse_age_from_timestamp(item_last_updated)
                        if last_updated_age is not None and last_updated_age > age_days:
                            age_days = last_updated_age

                    if age_days is not None and age_days > self.max_age_days:
                        stale_entries.append(StaleROAMEntry(
                            id=item_id,
                            section=section,
                            title=title,
                            roam_status=roam_status,
                            discovered=discovered,
                            age_days=age_days,
                            last_updated=item_last_updated
                        ))
                        logger.warning(f"Stale entry: {item_id} ({section}) - {age_days} days old")

        # Determine compliance
        is_compliant = len(stale_entries) == 0

        return ComplianceResult(
            is_compliant=is_compliant,
            stale_entries=stale_entries,
            total_entries_checked=total_entries,
            metadata_age_days=metadata_age_days
        )

    def _parse_age_from_timestamp(self, timestamp: str) -> Optional[int]:
        """
        Parse age in days from an ISO 8601 timestamp

        Args:
            timestamp: ISO 8601 timestamp string

        Returns:
            Age in days, or None if parsing fails
        """
        try:
            if isinstance(timestamp, str):
                # Handle ISO format with or without timezone
                # Use fromisoformat for proper ISO 8601 parsing
                timestamp = timestamp.replace('Z', '+00:00')
                date_obj = datetime.fromisoformat(timestamp.split('+')[0])
            else:
                date_obj = timestamp

            now = datetime.now()
            age = (now - date_obj).days
            return age
        except Exception as e:
            logger.debug(f"Failed to parse timestamp '{timestamp}': {e}")
            return None

    def generate_pr_comment(self, result: ComplianceResult) -> str:
        """
        Generate a PR comment for stale ROAM entries

        Args:
            result: ComplianceResult from check_roam_current()

        Returns:
            Formatted PR comment string
        """
        if result.is_compliant:
            return "✅ All ROAM entries are fresh and current."

        lines = [
            "⚠️ **ROAM Staleness Alert**",
            "",
            f"Found **{len(result.stale_entries)}** stale ROAM entries (max age: {self.max_age_days} days).",
            ""
        ]

        if result.metadata_age_days is not None:
            lines.append(f"**ROAM Metadata Age:** {result.metadata_age_days} days")
            lines.append("")

        lines.append("### Stale Entries")
        lines.append("")

        for entry in result.stale_entries:
            lines.append(f"**{entry.id}** ({entry.section})")
            lines.append(f"- **Title:** {entry.title}")
            lines.append(f"- **Status:** {entry.roam_status}")
            lines.append(f"- **Discovered:** {entry.discovered}")
            lines.append(f"- **Age:** {entry.age_days} days")
            if entry.last_updated:
                lines.append(f"- **Last Updated:** {entry.last_updated}")
            lines.append("")

        lines.append("### Remediation Steps")
        lines.append("")
        lines.append("Please update stale ROAM entries with one of the following actions:")
        lines.append("")
        lines.append("1. **RESOLVE** - Mark as RESOLVED with evidence of resolution")
        lines.append("2. **ACCEPT** - Explicitly accept the risk/blocker with justification")
        lines.append("3. **MITIGATE** - Document mitigation steps taken")
        lines.append("4. **UPDATE** - Refresh the `discovered` date if still actively working")
        lines.append("")
        lines.append("### Documentation")
        lines.append("")
        lines.append("See [ROAM Governance Documentation](docs/ROAM_RISK_ASSESSMENT_IMPLEMENTATION_GUIDE.md) for more information.")
        lines.append("")
        lines.append(f"Run `bash scripts/validate-roam-freshness.sh` locally before pushing.")

        return "\n".join(lines)


def main():
    """Main entry point for ROAM compliance checker"""
    parser = argparse.ArgumentParser(
        description="ROAM Compliance Checker - Validates ROAM_TRACKER.yaml staleness"
    )
    parser.add_argument(
        "--roam-file",
        type=Path,
        default=Path(".goalie/ROAM_TRACKER.yaml"),
        help="Path to ROAM_TRACKER.yaml file"
    )
    parser.add_argument(
        "--max-age-days",
        type=int,
        default=None,
        help="Maximum allowed age in days (default: from ROAM_MAX_AGE_DAYS env var or 3)"
    )
    parser.add_argument(
        "--output-format",
        choices=["text", "json"],
        default="text",
        help="Output format"
    )
    parser.add_argument(
        "--generate-comment",
        action="store_true",
        help="Generate PR comment format output"
    )

    args = parser.parse_args()

    checker = ROAMComplianceChecker(args.roam_file)
    result = checker.check_roam_current(args.max_age_days)

    if args.output_format == "json":
        output = {
            "is_compliant": result.is_compliant,
            "stale_entries": [asdict(e) for e in result.stale_entries],
            "total_entries_checked": result.total_entries_checked,
            "metadata_age_days": result.metadata_age_days,
            "max_age_days": checker.max_age_days,
            "error_message": result.error_message
        }
        import json
        print(json.dumps(output, indent=2))
    elif args.generate_comment:
        print(checker.generate_pr_comment(result))
    else:
        # Text output
        if result.error_message:
            print(f"ERROR: {result.error_message}", file=sys.stderr)
            sys.exit(2)

        if result.is_compliant:
            print(f"✅ All ROAM entries are fresh (< {checker.max_age_days} days)")
            print(f"Checked {result.total_entries_checked} entries")
            sys.exit(0)
        else:
            print(f"❌ Found {len(result.stale_entries)} stale ROAM entries")
            print(f"Checked {result.total_entries_checked} entries")
            print("")
            for entry in result.stale_entries:
                print(f"  - {entry.id} ({entry.section}): {entry.age_days} days old")
            sys.exit(1)


if __name__ == "__main__":
    main()
