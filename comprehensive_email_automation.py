#!/usr/bin/env python3
"""
Comprehensive Email Automation with Wholeness Validation
=========================================================

Applies wholeness framework to ALL 352 emails with:
1. WSJF Prioritization (Business Value + Time Criticality / Effort)
2. ROAM Risk Tracking (Resolved/Owned/Accepted/Mitigated)
3. Gmail API Integration (auto-labeling, search, metrics export)
4. Mailjet API Integration (send with validation metadata)
5. 4-Layer Wholeness Framework (Circles, Legal Roles, Gov Counsel, Software Patterns)
6. Automated Coverage Reporting (1.1% → 100%)

Why Validate ALL Emails?
- **WSJF = 0**: Still valuable for pattern analysis
- **Historical Record**: Build complete validation timeline
- **Litigation Evidence**: Show systematic approach
- **Attorney Consultation**: Demonstrate analytical rigor
- **Settlement Negotiation**: Proof of good-faith effort

ROAM Risk Integration:
- **SITUATIONAL (60%)**: Doug non-response → Owned (monitor actively)
- **STRATEGIC (30%)**: Discovery deadline pressure → Mitigated (extension offer)
- **SYSTEMIC (10%)**: Pattern of ignoring pro se → Accepted (document for litigation)

Gmail API Benefits:
- Auto-apply labels: "Wholeness-Validated", "High-Priority", "Settlement"
- Search by validation status
- Export metrics to Google Sheets
- Sync validation state across devices

Mailjet API Benefits:
- Send emails with embedded validation metadata
- Track open rates / engagement
- A/B test wholeness signature variations
- Deliverability optimization

Usage:
    # Validate ALL 352 emails (comprehensive)
    python3 comprehensive_email_automation.py --validate-all
    
    # ROAM risk analysis for Doug non-response
    python3 comprehensive_email_automation.py --roam-analysis
    
    # Gmail API sync (future)
    python3 comprehensive_email_automation.py --gmail-sync
    
    # Mailjet send with validation (future)
    python3 comprehensive_email_automation.py --send-email --template settlement-followup

References:
- Gmail API: https://developers.google.com/workspace/gmail/api/guides
- Mailjet API: https://www.mailjet.com/products/email-api/
- MailMaven (Mail.app alternative): https://www.takecontrolbooks.com/mailmaven/?pt=MAVENDOCS
"""

import json
import sqlite3
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Set

# Import from existing framework
try:
    from automated_wholeness_validator import (
        AutomatedWholenessValidator,
        EmailMetadata,
        WsjfEmailPrioritizer
    )
except ImportError:
    print("Warning: Import automated_wholeness_validator first")


# ══════════════════════════════════════════════════════════
# ROAM RISK TRACKING
# ══════════════════════════════════════════════════════════

class RiskType(Enum):
    """Risk classification from Phase 3 DDD architecture"""
    SITUATIONAL = "situational"  # Temporary, addressable (60%)
    STRATEGIC = "strategic"      # Intentional delay (30%)
    SYSTEMIC = "systemic"        # Institutional policy (10%)


class ROAMCategory(Enum):
    """ROAM categorization for risk management"""
    RESOLVED = "resolved"        # Past risks addressed
    OWNED = "owned"              # Actively managing
    ACCEPTED = "accepted"        # Known, no mitigation
    MITIGATED = "mitigated"      # Mitigation in place


@dataclass
class CommunicationRisk:
    """Risk assessment for email communication patterns"""
    email: EmailMetadata
    risk_type: RiskType
    roam_category: ROAMCategory
    likelihood: float  # 0.0-1.0
    impact: str
    mitigation_strategy: str
    wsjf_mitigation_score: float = 0.0
    
    def to_dict(self) -> dict:
        return {
            "email_subject": self.email.subject,
            "email_folder": self.email.folder,
            "risk_type": self.risk_type.value,
            "roam_category": self.roam_category.value,
            "likelihood": self.likelihood,
            "impact": self.impact,
            "mitigation": self.mitigation_strategy,
            "wsjf_mitigation": self.wsjf_mitigation_score
        }


class RoamRiskAnalyzer:
    """
    ROAM risk analysis for email correspondence
    
    Integrates with Phase 3 DDD architecture:
    - RoamRiskClassifier domain service
    - CommunicationPattern value object
    - DelayTacticDetector domain service
    """
    
    def __init__(self):
        self.settlement_deadline = datetime(2026, 2, 12, 17, 0)
        self.discovery_deadline = datetime(2026, 2, 11, 17, 0)
        
    def analyze_doug_non_response(self, emails: List[EmailMetadata]) -> CommunicationRisk:
        """
        Analyze Doug's non-response pattern
        
        Classification logic from Phase 3:
        - 0 non-responses → SITUATIONAL (60%)
        - 1-2 non-responses + deadline <24h → STRATEGIC (30%)
        - 3+ non-responses → SYSTEMIC (10%)
        """
        doug_emails = [e for e in emails if 'doug' in e.folder.lower() or 'doug' in e.recipient.lower()]
        
        # Count non-responses (sent emails without replies)
        sent_to_doug = [e for e in doug_emails if 'shahrooz' in e.sender.lower()]
        received_from_doug = [e for e in doug_emails if 'doug' in e.sender.lower()]
        
        non_response_count = len(sent_to_doug) - len(received_from_doug)
        hours_until_deadline = (self.settlement_deadline - datetime.now()).total_seconds() / 3600
        
        # Classify risk
        if non_response_count == 0:
            risk_type = RiskType.SITUATIONAL
            roam = ROAMCategory.OWNED
            likelihood = 0.6
            mitigation = "Send friendly follow-up, monitor response"
        elif non_response_count <= 2 and hours_until_deadline < 24:
            risk_type = RiskType.STRATEGIC
            roam = ROAMCategory.MITIGATED
            likelihood = 0.3
            mitigation = "Offer deadline extension, escalate if no response"
        else:
            risk_type = RiskType.SYSTEMIC
            roam = ROAMCategory.ACCEPTED
            likelihood = 0.1
            mitigation = "Document pattern, prepare litigation evidence"
        
        # Create risk object (use most recent email as reference)
        reference_email = sent_to_doug[-1] if sent_to_doug else doug_emails[0]
        
        return CommunicationRisk(
            email=reference_email,
            risk_type=risk_type,
            roam_category=roam,
            likelihood=likelihood,
            impact=f"{non_response_count} non-responses, {hours_until_deadline:.1f}h until deadline",
            mitigation_strategy=mitigation
        )
    
    def calculate_mitigation_wsjf(self, risk: CommunicationRisk) -> float:
        """
        Calculate WSJF for risk mitigation actions
        
        WSJF = (Business Value + Time Criticality) / Job Size
        
        Business Value:
        - SITUATIONAL: 8 (good faith gesture)
        - STRATEGIC: 9 (prevent deadline expiration)
        - SYSTEMIC: 7 (litigation documentation)
        
        Time Criticality:
        - SITUATIONAL: 10 (deadline <24h)
        - STRATEGIC: 10 (deadline <24h)
        - SYSTEMIC: 6 (litigation timeline)
        
        Job Size:
        - SITUATIONAL: 1 (quick email)
        - STRATEGIC: 2 (extension offer email)
        - SYSTEMIC: 5 (document pattern + Scenario C)
        """
        bv_map = {
            RiskType.SITUATIONAL: 8,
            RiskType.STRATEGIC: 9,
            RiskType.SYSTEMIC: 7
        }
        
        tc_map = {
            RiskType.SITUATIONAL: 10,
            RiskType.STRATEGIC: 10,
            RiskType.SYSTEMIC: 6
        }
        
        job_size_map = {
            RiskType.SITUATIONAL: 1,
            RiskType.STRATEGIC: 2,
            RiskType.SYSTEMIC: 5
        }
        
        business_value = bv_map[risk.risk_type]
        time_criticality = tc_map[risk.risk_type]
        job_size = job_size_map[risk.risk_type]
        
        risk.wsjf_mitigation_score = (business_value + time_criticality) / job_size
        return risk.wsjf_mitigation_score


# ══════════════════════════════════════════════════════════
# COMPREHENSIVE VALIDATION DATABASE
# ══════════════════════════════════════════════════════════

class ValidationDatabase:
    """SQLite database for tracking email validation state"""
    
    def __init__(self, db_path: Path):
        self.db_path = db_path
        self.conn = sqlite3.connect(str(db_path))
        self._init_schema()
    
    def _init_schema(self):
        """Initialize database schema"""
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS emails (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_path TEXT UNIQUE NOT NULL,
                subject TEXT,
                sender TEXT,
                recipient TEXT,
                folder TEXT,
                date TEXT,
                has_wholeness BOOLEAN DEFAULT 0,
                validation_score INTEGER,
                wsjf_score REAL,
                business_value INTEGER,
                time_criticality INTEGER,
                validation_effort INTEGER,
                validated_at TEXT,
                UNIQUE(file_path)
            )
        """)
        
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS risks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email_id INTEGER,
                risk_type TEXT,
                roam_category TEXT,
                likelihood REAL,
                impact TEXT,
                mitigation TEXT,
                wsjf_mitigation REAL,
                analyzed_at TEXT,
                FOREIGN KEY (email_id) REFERENCES emails(id)
            )
        """)
        
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT,
                total_emails INTEGER,
                validated_emails INTEGER,
                coverage_rate REAL,
                high_priority_count INTEGER,
                avg_wsjf REAL
            )
        """)
        
        self.conn.commit()
    
    def upsert_email(self, email: EmailMetadata):
        """Insert or update email record"""
        self.conn.execute("""
            INSERT OR REPLACE INTO emails 
            (file_path, subject, sender, recipient, folder, date, has_wholeness, 
             validation_score, wsjf_score, business_value, time_criticality, validation_effort)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            str(email.file_path),
            email.subject,
            email.sender,
            email.recipient,
            email.folder,
            email.date.isoformat() if email.date else None,
            email.has_wholeness_signature,
            email.validation_score,
            email.wsjf_score,
            email.business_value,
            email.time_criticality,
            email.validation_effort
        ))
        self.conn.commit()
    
    def record_metrics(self, report: dict):
        """Record validation metrics snapshot"""
        self.conn.execute("""
            INSERT INTO metrics (timestamp, total_emails, validated_emails, coverage_rate, high_priority_count, avg_wsjf)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            datetime.now().isoformat(),
            report['total_emails'],
            report['total_validated'],
            report['coverage_rate'],
            report['high_priority_validated'],
            report.get('avg_wsjf', 0.0)
        ))
        self.conn.commit()


# ══════════════════════════════════════════════════════════
# COMPREHENSIVE EMAIL AUTOMATION
# ══════════════════════════════════════════════════════════

class ComprehensiveEmailAutomation:
    """
    Comprehensive email automation with:
    - WSJF prioritization
    - ROAM risk tracking
    - Wholeness validation
    - Gmail/Mailjet integration (future)
    """
    
    def __init__(self, base_dir: Path, db_path: Path):
        self.validator = AutomatedWholenessValidator(base_dir)
        self.risk_analyzer = RoamRiskAnalyzer()
        self.db = ValidationDatabase(db_path)
    
    def validate_all_with_roam(self) -> dict:
        """
        Validate ALL 352 emails with ROAM risk analysis
        
        Returns comprehensive report with:
        - Validation coverage
        - WSJF prioritization
        - ROAM risk classification
        - Mitigation recommendations
        """
        print("🚀 COMPREHENSIVE EMAIL AUTOMATION")
        print("=" * 100)
        
        # Run validation on all emails
        report = self.validator.validate_all(wsjf_threshold=0)  # Validate everything
        
        # Analyze ROAM risks for Doug correspondence
        doug_risk = self.risk_analyzer.analyze_doug_non_response(self.validator.scanner.emails)
        wsjf_mitigation = self.risk_analyzer.calculate_mitigation_wsjf(doug_risk)
        
        # Store all emails in database
        for email in self.validator.scanner.emails:
            self.db.upsert_email(email)
        
        # Calculate average WSJF
        wsjf_scores = [e.wsjf_score for e in self.validator.scanner.emails]
        avg_wsjf = sum(wsjf_scores) / len(wsjf_scores) if wsjf_scores else 0
        
        # Enhanced report
        comprehensive_report = {
            **report,
            "avg_wsjf": avg_wsjf,
            "roam_analysis": {
                "doug_non_response": doug_risk.to_dict(),
                "wsjf_mitigation": wsjf_mitigation,
                "recommendation": self._generate_recommendation(doug_risk)
            },
            "coverage_metrics": {
                "target": "100% (352/352)",
                "current": f"{report['coverage_rate']:.1f}% ({report['total_validated']}/352)",
                "gap": f"{352 - report['total_validated']} emails remaining"
            }
        }
        
        # Record metrics snapshot
        self.db.record_metrics(comprehensive_report)
        
        return comprehensive_report
    
    def _generate_recommendation(self, risk: CommunicationRisk) -> str:
        """Generate action recommendation based on risk type"""
        recommendations = {
            RiskType.SITUATIONAL: (
                "✅ SITUATIONAL RISK (60% likelihood)\n"
                f"WSJF Mitigation Score: {risk.wsjf_mitigation_score:.1f} (HIGHEST PRIORITY)\n"
                "Action: Send friendly follow-up NOW\n"
                "Timeline: 3:54 PM EST (before 5 PM discovery deadline)\n"
                "Rationale: Assumes good faith, busy schedule, needs MAA approval"
            ),
            RiskType.STRATEGIC: (
                "⚠️ STRATEGIC RISK (30% likelihood)\n"
                f"WSJF Mitigation Score: {risk.wsjf_mitigation_score:.1f} (HIGH PRIORITY)\n"
                "Action: Offer deadline extension (Friday 5 PM)\n"
                "Timeline: By 9 AM tomorrow if no response\n"
                "Rationale: Running settlement clock, needs time pressure relief"
            ),
            RiskType.SYSTEMIC: (
                "❌ SYSTEMIC RISK (10% likelihood)\n"
                f"WSJF Mitigation Score: {risk.wsjf_mitigation_score:.1f} (MEDIUM PRIORITY)\n"
                "Action: Document pattern, prepare Scenario C settlement\n"
                "Timeline: By 3 PM tomorrow if still no response\n"
                "Rationale: Institutional policy to ignore pro se, prepare litigation"
            )
        }
        
        return recommendations[risk.risk_type]


# ══════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Comprehensive Email Automation")
    parser.add_argument("--base-dir", type=Path,
                        default=Path("/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL"),
                        help="Base directory for legal correspondence")
    parser.add_argument("--db", type=Path,
                        default=Path("email_validation.db"),
                        help="SQLite database path")
    parser.add_argument("--validate-all", action="store_true",
                        help="Validate ALL 352 emails (comprehensive)")
    parser.add_argument("--roam-analysis", action="store_true",
                        help="ROAM risk analysis for Doug non-response")
    parser.add_argument("--output", type=Path,
                        default=Path("comprehensive_validation_report.json"),
                        help="Output report path")
    
    args = parser.parse_args()
    
    # Create automation system
    automation = ComprehensiveEmailAutomation(args.base_dir, args.db)
    
    # Run comprehensive validation
    report = automation.validate_all_with_roam()
    
    # Display summary
    print("\n" + "=" * 100)
    print("COMPREHENSIVE VALIDATION REPORT")
    print("=" * 100)
    print(f"Total Emails: {report['total_emails']}")
    print(f"Validated: {report['total_validated']} ({report['coverage_rate']:.1f}%)")
    print(f"High Priority (WSJF ≥ 15): {report['high_priority_validated']}")
    print(f"Average WSJF: {report['avg_wsjf']:.2f}")
    print()
    print("ROAM RISK ANALYSIS (Doug Non-Response):")
    print("-" * 100)
    print(report['roam_analysis']['recommendation'])
    print("=" * 100)
    
    # Save report
    args.output.write_text(json.dumps(report, indent=2))
    print(f"\n✅ Report saved: {args.output}")
    print(f"✅ Database updated: {args.db}")


if __name__ == "__main__":
    main()
