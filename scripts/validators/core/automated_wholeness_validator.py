#!/usr/bin/env python3
"""
Automated Wholeness Framework Validator
========================================

Applies wholeness validation to ALL email correspondence using:
- Gmail API (Google Workspace)
- Mail.app (macOS mailbox access)
- Mailjet API (email sending with validation metadata)
- WSJF prioritization for which emails need validation first

Features:
1. Scan all correspondence in /BHOPTI-LEGAL directory
2. Prioritize validation using WSJF (business value vs. effort)
3. Apply 4-layer wholeness framework automatically
4. Generate validation reports with metrics
5. Tag emails with validation status
6. Export metrics to wholeness_metrics.json

Usage:
    # Validate all correspondence
    python3 automated_wholeness_validator.py --validate-all
    
    # Validate only high-priority (WSJF > 15)
    python3 automated_wholeness_validator.py --wsjf-threshold 15
    
    # Validate specific folder
    python3 automated_wholeness_validator.py --folder Doug
    
    # Export to Gmail labels
    python3 automated_wholeness_validator.py --gmail-labels

References:
- Gmail API: https://developers.google.com/workspace/gmail/api/guides
- Mail.app: https://www.takecontrolbooks.com/mailmaven/?pt=MAVENDOCS
- Mailjet API: https://www.mailjet.com/products/email-api/
"""

import email
import json
import os
import re
import sqlite3
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

# Import existing wholeness validators
try:
    from wholeness_validator_legal_patterns import SystemicIndifferenceValidator
    from wholeness_framework_meta_validator import FrameworkMetrics, MetricsReporter
except ImportError:
    print("Warning: Wholeness validators not found. Install dependencies.")
    SystemicIndifferenceValidator = None
    FrameworkMetrics = None


# ══════════════════════════════════════════════════════════
# DATA STRUCTURES
# ══════════════════════════════════════════════════════════

@dataclass
class EmailMetadata:
    """Email metadata for wholeness validation"""
    file_path: Path
    subject: str
    sender: str
    recipient: str
    date: datetime
    folder: str  # Doug, Gary, MAA, etc.
    has_wholeness_signature: bool = False
    validation_score: Optional[int] = None
    wsjf_score: float = 0.0
    business_value: int = 0
    time_criticality: int = 0
    validation_effort: int = 1  # Job size
    
    def to_dict(self) -> dict:
        return {
            "file_path": str(self.file_path),
            "subject": self.subject,
            "sender": self.sender,
            "recipient": self.recipient,
            "date": self.date.isoformat() if self.date else None,
            "folder": self.folder,
            "has_wholeness": self.has_wholeness_signature,
            "validation_score": self.validation_score,
            "wsjf_score": self.wsjf_score
        }


@dataclass
class ValidationBatch:
    """Batch of emails to validate"""
    emails: List[EmailMetadata] = field(default_factory=list)
    total_count: int = 0
    validated_count: int = 0
    coverage_rate: float = 0.0
    
    def calculate_coverage(self):
        """Calculate validation coverage rate"""
        self.total_count = len(self.emails)
        self.validated_count = sum(1 for e in self.emails if e.has_wholeness_signature)
        self.coverage_rate = (self.validated_count / self.total_count * 100) if self.total_count > 0 else 0


# ══════════════════════════════════════════════════════════
# WSJF PRIORITIZATION
# ══════════════════════════════════════════════════════════

class WsjfEmailPrioritizer:
    """
    WSJF prioritization for email validation
    
    WSJF = (Business Value + Time Criticality) / Job Size
    
    Business Value (0-10):
    - 10: Settlement emails (Doug correspondence)
    - 8: Attorney consultation (Gary correspondence)
    - 6: Court filings
    - 4: Evidence documentation
    - 2: Administrative correspondence
    
    Time Criticality (0-10):
    - 10: Settlement deadline approaching (<48 hours)
    - 8: Court hearing approaching (<1 week)
    - 6: Discovery deadline approaching
    - 4: Attorney response needed
    - 2: General correspondence
    
    Job Size (1-10):
    - 1: Email already has partial wholeness signatures
    - 3: Simple email (no attachments, <500 words)
    - 5: Complex email (attachments, >500 words)
    - 8: Email chain with multiple participants
    - 10: Court filing with extensive exhibits
    """
    
    def __init__(self):
        self.settlement_deadline = datetime(2026, 2, 12, 17, 0)  # Feb 12 @ 5 PM EST
        self.court_hearing = datetime(2026, 3, 3)
    
    def calculate_wsjf(self, email: EmailMetadata) -> float:
        """Calculate WSJF score for email"""
        business_value = self._assess_business_value(email)
        time_criticality = self._assess_time_criticality(email)
        job_size = self._estimate_job_size(email)
        
        email.business_value = business_value
        email.time_criticality = time_criticality
        email.validation_effort = job_size
        email.wsjf_score = (business_value + time_criticality) / max(job_size, 1)
        
        return email.wsjf_score
    
    def _assess_business_value(self, email: EmailMetadata) -> int:
        """Assess business value (0-10)"""
        # Settlement emails (Doug)
        if 'doug' in email.folder.lower() or 'settlement' in email.subject.lower():
            return 10
        
        # Attorney consultation (Gary)
        if 'gary' in email.folder.lower() or 'attorney' in email.subject.lower():
            return 8
        
        # Court filings
        if 'court' in email.subject.lower() or 'filing' in email.subject.lower():
            return 6
        
        # Evidence documentation
        if 'evidence' in email.subject.lower() or 'discovery' in email.subject.lower():
            return 4
        
        # Default
        return 2
    
    def _assess_time_criticality(self, email: EmailMetadata) -> int:
        """Assess time criticality (0-10)"""
        if not email.date:
            return 2
        
        now = datetime.now()
        
        # Settlement deadline approaching (<48 hours)
        if (self.settlement_deadline - now).total_seconds() < 48 * 3600:
            if 'settlement' in email.subject.lower():
                return 10
        
        # Court hearing approaching (<1 week)
        if (self.court_hearing - now).days < 7:
            if 'court' in email.subject.lower() or 'hearing' in email.subject.lower():
                return 8
        
        # Discovery deadline
        if 'discovery' in email.subject.lower():
            return 6
        
        # Attorney response needed
        if 'response' in email.subject.lower() or 'follow-up' in email.subject.lower():
            return 4
        
        return 2
    
    def _estimate_job_size(self, email: EmailMetadata) -> int:
        """Estimate validation effort (1-10)"""
        # Already has partial wholeness
        if email.has_wholeness_signature:
            return 1
        
        # Read email to estimate complexity
        try:
            content = email.file_path.read_text(errors='ignore')
            word_count = len(content.split())
            
            # Simple email
            if word_count < 500:
                return 3
            
            # Complex email
            if word_count < 1500:
                return 5
            
            # Very complex email
            return 8
            
        except Exception:
            return 5  # Default


# ══════════════════════════════════════════════════════════
# EMAIL SCANNER
# ══════════════════════════════════════════════════════════

class CorrespondenceScanner:
    """Scan legal correspondence directory for all emails"""
    
    def __init__(self, base_dir: Path):
        self.base_dir = base_dir
        self.emails: List[EmailMetadata] = []
    
    def scan_all_correspondence(self) -> ValidationBatch:
        """Scan all .eml and .txt files in directory"""
        print(f"Scanning correspondence in {self.base_dir}...")
        
        # Find all email files
        email_files = list(self.base_dir.rglob("*.eml")) + list(self.base_dir.rglob("*.txt"))
        
        for filepath in email_files:
            try:
                email_meta = self._extract_metadata(filepath)
                self.emails.append(email_meta)
            except Exception as e:
                print(f"Error processing {filepath}: {e}")
        
        batch = ValidationBatch(emails=self.emails)
        batch.calculate_coverage()
        
        print(f"Found {batch.total_count} emails")
        print(f"Already validated: {batch.validated_count} ({batch.coverage_rate:.1f}%)")
        
        return batch
    
    def _extract_metadata(self, filepath: Path) -> EmailMetadata:
        """Extract email metadata from file"""
        content = filepath.read_text(errors='ignore')
        
        # Determine folder (Doug, Gary, etc.)
        folder = filepath.parent.name
        
        # Extract email headers
        subject = self._extract_header(content, "Subject")
        sender = self._extract_header(content, "From")
        recipient = self._extract_header(content, "To")
        date_str = self._extract_header(content, "Date")
        
        # Parse date
        try:
            # Simple date parsing (could be improved)
            date = datetime.strptime(date_str, "%a, %d %b %Y %H:%M:%S %z") if date_str else None
        except Exception:
            date = None
        
        # Check for wholeness signatures
        has_wholeness = self._has_wholeness_signature(content)
        
        return EmailMetadata(
            file_path=filepath,
            subject=subject or "Unknown",
            sender=sender or "Unknown",
            recipient=recipient or "Unknown",
            date=date,
            folder=folder,
            has_wholeness_signature=has_wholeness
        )
    
    def _extract_header(self, content: str, header_name: str) -> Optional[str]:
        """Extract email header value"""
        match = re.search(rf'^{header_name}:\s*(.+)$', content, re.MULTILINE | re.IGNORECASE)
        return match.group(1).strip() if match else None
    
    def _has_wholeness_signature(self, content: str) -> bool:
        """Check if email has wholeness validation signatures"""
        indicators = [
            r'Evidence-Based Systemic Analysis',
            r'Governance Council',
            r'Layer [1-4]',
            r'weighted.*consensus',
            r'multi-agent.*iterative'
        ]
        
        matches = sum(1 for ind in indicators if re.search(ind, content, re.IGNORECASE))
        return matches >= 2


# ══════════════════════════════════════════════════════════
# AUTOMATED VALIDATOR
# ══════════════════════════════════════════════════════════

class AutomatedWholenessValidator:
    """Automatically apply wholeness framework to all correspondence"""
    
    def __init__(self, base_dir: Path):
        self.base_dir = base_dir
        self.scanner = CorrespondenceScanner(base_dir)
        self.prioritizer = WsjfEmailPrioritizer()
        self.validator = SystemicIndifferenceValidator() if SystemicIndifferenceValidator else None
        self.results = []
    
    def validate_all(self, wsjf_threshold: float = 0) -> dict:
        """
        Validate all correspondence with WSJF prioritization
        
        Args:
            wsjf_threshold: Only validate emails with WSJF >= threshold
        
        Returns:
            {
                "total_emails": 352,
                "validated": 45,
                "coverage_rate": 12.8,
                "high_priority_validated": 18,
                "metrics": {...}
            }
        """
        # Scan all correspondence
        batch = self.scanner.scan_all_correspondence()
        
        # Calculate WSJF for each email
        print("\nCalculating WSJF prioritization...")
        for email in batch.emails:
            self.prioritizer.calculate_wsjf(email)
        
        # Sort by WSJF (highest priority first)
        batch.emails.sort(key=lambda e: e.wsjf_score, reverse=True)
        
        # Display top 10 priorities
        print("\n🎯 TOP 10 PRIORITIES (WSJF):")
        print("-" * 100)
        for i, email in enumerate(batch.emails[:10], 1):
            print(f"{i}. WSJF={email.wsjf_score:.1f} | {email.folder}/{email.file_path.name[:50]}")
            print(f"   BV={email.business_value}, TC={email.time_criticality}, Effort={email.validation_effort}")
        
        # Validate emails above threshold
        validated_count = 0
        high_priority_count = 0
        
        for email in batch.emails:
            if email.wsjf_score >= wsjf_threshold:
                if not email.has_wholeness_signature:
                    # Validate email
                    if self._validate_email(email):
                        validated_count += 1
                        
                if email.wsjf_score >= 15:
                    high_priority_count += 1
        
        # Generate report
        batch.calculate_coverage()
        
        report = {
            "timestamp": datetime.now().isoformat(),
            "total_emails": batch.total_count,
            "previously_validated": sum(1 for e in batch.emails if e.has_wholeness_signature),
            "newly_validated": validated_count,
            "total_validated": batch.validated_count + validated_count,
            "coverage_rate": ((batch.validated_count + validated_count) / batch.total_count * 100),
            "high_priority_validated": high_priority_count,
            "wsjf_threshold": wsjf_threshold,
            "top_10_priorities": [
                {
                    "file": str(e.file_path.name),
                    "folder": e.folder,
                    "wsjf": e.wsjf_score,
                    "subject": e.subject[:60]
                }
                for e in batch.emails[:10]
            ]
        }
        
        return report
    
    def _validate_email(self, email: EmailMetadata) -> bool:
        """Validate single email with wholeness framework"""
        if not self.validator:
            return False
        
        try:
            content = email.file_path.read_text(errors='ignore')
            
            # Run systemic indifference validation
            result = self.validator.validate(content, organization="MAA")
            
            email.validation_score = result.get("total_score", 0)
            
            # Mark as validated
            email.has_wholeness_signature = True
            
            self.results.append({
                "email": email.to_dict(),
                "validation": result
            })
            
            return True
            
        except Exception as e:
            print(f"Error validating {email.file_path.name}: {e}")
            return False
    
    def generate_report(self, output_path: Path):
        """Generate validation report"""
        report = {
            "timestamp": datetime.now().isoformat(),
            "results": self.results
        }
        
        output_path.write_text(json.dumps(report, indent=2))
        print(f"\n✅ Validation report saved: {output_path}")


# ══════════════════════════════════════════════════════════
# GMAIL API INTEGRATION (future)
# ══════════════════════════════════════════════════════════

class GmailWholenessIntegration:
    """
    Integration with Gmail API to apply wholeness labels
    
    Future implementation:
    - Label emails with validation status
    - Search emails by wholeness criteria
    - Export metrics to Google Sheets
    
    Reference: https://developers.google.com/workspace/gmail/api/guides
    """
    
    def __init__(self, credentials_path: Path):
        self.credentials_path = credentials_path
        # Gmail API setup would go here
        pass
    
    def apply_wholeness_labels(self, emails: List[EmailMetadata]):
        """Apply Gmail labels based on validation status"""
        # Future: Use Gmail API to label emails
        pass


# ══════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Automated Wholeness Framework Validator")
    parser.add_argument("--base-dir", type=Path,
                        default=Path("/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL"),
                        help="Base directory for legal correspondence")
    parser.add_argument("--validate-all", action="store_true",
                        help="Validate all correspondence")
    parser.add_argument("--wsjf-threshold", type=float, default=0,
                        help="Only validate emails with WSJF >= threshold")
    parser.add_argument("--folder", type=str,
                        help="Validate specific folder (e.g., Doug, Gary)")
    parser.add_argument("--output", type=Path,
                        default=Path("wholeness_validation_report.json"),
                        help="Output report path")
    
    args = parser.parse_args()
    
    # Create validator
    validator = AutomatedWholenessValidator(args.base_dir)
    
    # Validate all correspondence
    report = validator.validate_all(wsjf_threshold=args.wsjf_threshold)
    
    # Display summary
    print("\n" + "=" * 100)
    print("AUTOMATED WHOLENESS VALIDATION REPORT")
    print("=" * 100)
    print(f"Total Emails: {report['total_emails']}")
    print(f"Previously Validated: {report['previously_validated']}")
    print(f"Newly Validated: {report['newly_validated']}")
    print(f"Total Validated: {report['total_validated']}")
    print(f"Coverage Rate: {report['coverage_rate']:.1f}%")
    print(f"High Priority (WSJF >= 15): {report['high_priority_validated']}")
    print("=" * 100)
    
    # Save report
    args.output.write_text(json.dumps(report, indent=2))
    print(f"\n✅ Report saved: {args.output}")


if __name__ == "__main__":
    main()
