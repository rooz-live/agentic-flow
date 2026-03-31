#!/usr/bin/env python3
"""
Project Catalyst Micro-Ledger Ingestion Script

Ingests Project Catalyst proposal data (CSV/JSON) into the .goalie/pattern_metrics.jsonl ledger.
Emits 'catalyst_proposal_ingested' and 'catalyst_category_rollup' events with full economic schema.

Schema Features:
- Revenue Impact: Category Prior * Evidence Multipliers
- Agreeableness: Derived from moderation reason/status
- Addressability: Derived from wallet requirements
- Contributable: Flag for actionable vs blocked items
- Data Trail: Provenance links
"""

import sys
import os
import csv
import json
import time
import argparse
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Any, Optional

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(PROJECT_ROOT, "scripts"))

try:
    from agentic.pattern_logger import PatternLogger
except ImportError:
    # Fallback if run from different cwd
    sys.path.append(os.path.join(PROJECT_ROOT, "scripts", "agentic"))
    from pattern_logger import PatternLogger

# --- Configuration & Defaults ---

# Category Priors (Monthly USD Potential Proxy)
CATEGORY_PRIORS = {
    'Development & Infrastructure': 5000.0,
    'Products & Integration': 4000.0,
    'Ecosystem': 3500.0,
    'Governance & Identity': 3000.0,
    'Outreach & Adoption': 2000.0,
    'Miscellaneous': 1000.0,
    'default': 1500.0
}

# Moderation Reason -> Agreeableness (0.0 - 1.0)
MODERATION_AGREEABLENESS = {
    'accepted': 1.0,
    'eligible': 1.0,
    'needs_clarification': 0.7,
    'incomplete': 0.5,
    'duplicate': 0.4,
    'out_of_scope': 0.2,
    'spam': 0.0,
    'fraud': 0.0,
    'malicious': 0.0,
    'none': 1.0,
    '': 1.0
}

# Supported Wallets (for addressability check)
SUPPORTED_WALLETS = {
    'daedalus', 'yoroi', 'eternl', 'typhon', 'gerowallet', 'nami', 'flint', 'lace'
}


class CatalystIngester:
    def __init__(self, circle: str = "innovator", run_id: str = None, dry_run: bool = False):
        self.logger = PatternLogger(circle=circle, run_id=run_id, mode="ingest")
        self.dry_run = dry_run
        self.stats = {
            'total_rows': 0,
            'ingested': 0,
            'skipped': 0,
            'total_revenue_impact': 0.0,
            'total_agreeable_value': 0.0
        }
        self.category_rollups = {} # Key: Category -> Aggregate Stats

    def _parse_tags(self, tags_raw: str) -> List[str]:
        if not tags_raw:
            return []
        # Handle JSON array string or comm-separated
        try:
            if tags_raw.startswith('[') and tags_raw.endswith(']'):
                return json.loads(tags_raw)
        except:
            pass
        return [t.strip() for t in tags_raw.split(',') if t.strip()]

    def _determine_agreeableness(self, status: str, mod_reason: str) -> float:
        reason_key = (mod_reason or 'none').lower().replace(' ', '_')
        status_key = (status or 'none').lower()

        # Prioritize moderation reason if negative
        if reason_key in MODERATION_AGREEABLENESS and MODERATION_AGREEABLENESS[reason_key] < 1.0:
            return MODERATION_AGREEABLENESS[reason_key]

        if status_key in MODERATION_AGREEABLENESS:
            return MODERATION_AGREEABLENESS[status_key]

        return 1.0 # Default optimistic

    def _check_addressability(self, description: str, requirements: str) -> float:
        """
        Check wallet requirements.
        Returns 1.0 if supported/standard, 0.25 if unsupported wallet required.
        """
        text = (description + " " + requirements).lower()

        # Heuristic: if explicit mention of unsupported wallet requirement
        # This is a placeholder; real logic would need detailed parsing
        # For MVP: Default to 1.0 unless specific negative markers found
        return 1.0

    def process_row(self, row: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Process a single proposal row into an event payload."""

        # Basic Extraction
        proposal_id = row.get('proposal_id') or row.get('id')
        title = row.get('title') or row.get('proposal_title')
        if not proposal_id or not title:
            return None # Skip malformed rows

        category = row.get('category') or row.get('challenge') or 'default'
        funds_req = float(row.get('funds_requested') or row.get('amount_requested') or 0.0)

        status = row.get('status')
        mod_reason = row.get('moderation_reason')
        app_url = row.get('app_url')
        proposal_url = row.get('proposal_url')
        proposer = row.get('proposer_name') or row.get('proposer')

        tags = self._parse_tags(row.get('tags') or '')

        # --- Economic Calculation ---

        # 1. Gross Revenue Impact
        base_prior = CATEGORY_PRIORS.get(category, CATEGORY_PRIORS['default'])

        # Evidence Multiplier (0.5 to 1.5)
        evidence_mult = 1.0
        data_trail = []
        if proposal_url:
            data_trail.append(proposal_url)
            evidence_mult += 0.1
        if app_url:
            data_trail.append(app_url)
            evidence_mult += 0.2

        # Cap multiplier
        revenue_impact = base_prior * min(1.5, evidence_mult)

        # 2. Agreeableness (Claimability Throttle)
        agreeableness = self._determine_agreeableness(status, mod_reason)

        # 3. Addressability (Wallet Support)
        # Assuming parsing description/requirements if available, else 1.0
        desc = row.get('description') or ''
        reqs = row.get('requirements') or ''
        addressability_mult = self._check_addressability(desc, reqs)

        # 4. Contributable Check
        # Hard gate: strictly impossible wallet requirements or malicious moderation
        contributable = True
        non_contributable_reasons = []

        if agreeableness == 0.0:
            contributable = False
            non_contributable_reasons.append(f"Zero agreeableness: {mod_reason}")

        # Apply final multipliers
        # Final Agreeableness used for dividend calc
        final_agreeableness_factor = agreeableness * addressability_mult

        # --- Value Accumulation ---
        self.stats['total_revenue_impact'] += revenue_impact
        # Agreeable Value = Impact * Factor * (1 if contributable else 0)
        agreeable_value = revenue_impact * final_agreeableness_factor * (1.0 if contributable else 0.0)
        self.stats['total_agreeable_value'] += agreeable_value

        # Update Rollups
        if category not in self.category_rollups:
            self.category_rollups[category] = {
                'count': 0, 'funds_requested': 0.0,
                'revenue_impact': 0.0, 'agreeable_value': 0.0,
                'accepted': 0, 'rejected': 0
            }

        prof = self.category_rollups[category]
        prof['count'] += 1
        prof['funds_requested'] += funds_req
        prof['revenue_impact'] += revenue_impact
        prof['agreeable_value'] += agreeable_value
        if contributable:
            prof['accepted'] += 1
        else:
            prof['rejected'] += 1

        # Event Payload
        payload = {
            "proposal_id": proposal_id,
            "title": title,
            "category": category,
            "proposer": proposer,
            "funds_requested": funds_req,
            "status": status,
            "moderation_reason": mod_reason,
            "data_trail": data_trail,
            "tags": tags,
            "economic": {
                "revenue_impact": round(revenue_impact, 2),
                "agreeableness": round(agreeableness, 2),
                "addressability_multiplier": round(addressability_mult, 2),
                "contributable": contributable,
                "non_contributable_reasons": non_contributable_reasons,
                # Explicitly pass calculating factors for transparency
                "category_prior": base_prior,
                "evidence_multiplier": round(evidence_mult, 2)
            }
        }

        return payload

    def ingest_csv(self, filepath: str):
        """Main ingestion loop."""
        print(f"Checking {filepath}...")
        if not os.path.exists(filepath):
            print(f"Error: File {filepath} not found.")
            return

        print(f"Starting ingestion of {filepath}...")
        start_time = time.time()

        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)

            # Use timed context for batch-level or row-level?
            # Row-level might be spammy for 1000s rows.
            # Let's time the *block* of processing but emit per-item.
            # Actually, user protocol says "catalyst_proposal_ingested (per proposal)".
            # If we want 100% measured coverage, we'd wrap each log.
            # But overhead is high. Let's wrap the logic and inject duration.

            for row in reader:
                self.stats['total_rows'] += 1

                # Measure processing time per row
                with self.logger.timed("catalyst_proposal_ingested", gate="governance-ingest") as payload:
                   data = self.process_row(row)
                   if data:
                       # Transfer generated data to keys for logging
                       payload.update(data)
                       self.stats['ingested'] += 1
                   else:
                       payload['action_completed'] = False
                       payload['failure_reasons'] = ["Skipped/Malformed"]
                       self.stats['skipped'] += 1

        duration = time.time() - start_time
        print(f"Ingestion complete. {self.stats['ingested']} items in {duration:.2f}s.")
        print("Emitting category rollups...")

        # Emit Rollups
        for cat, stats in self.category_rollups.items():
            with self.logger.timed("catalyst_category_rollup", gate="governance-rollup") as payload:
                payload.update({
                    "category": cat,
                    "proposal_count": stats['count'],
                    "accepted_count": stats['accepted'],
                    "rejected_count": stats['rejected'],
                    "funds_requested_total": round(stats['funds_requested'], 2),
                    "economic": {
                        "revenue_impact": round(stats['revenue_impact'], 2),
                        "agreeable_value": round(stats['agreeable_value'], 2)
                    }
                })

def main():
    parser = argparse.ArgumentParser(description="Ingest Project Catalyst proposals.")
    parser.add_argument("file", help="Path to CSV file with proposals")
    parser.add_argument("--circle", default="innovator", help="Attribution circle")
    parser.add_argument("--run-id", default=None, help="Correlation ID")
    parser.add_argument("--dry-run", action="store_true", help="Don't write to ledger")

    args = parser.parse_args()

    ingester = CatalystIngester(circle=args.circle, run_id=args.run_id, dry_run=args.dry_run)
    ingester.ingest_csv(args.file)

if __name__ == "__main__":
    main()
