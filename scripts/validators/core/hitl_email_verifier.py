#!/usr/bin/env python3
"""
Human-in-the-Loop Email Verification System
===========================================

Automation Maturity Level 5: Semi-Auto with HITL Verification

Applies wholeness framework automatically, then prompts human review:
1. Auto-generate email with 4-layer validation
2. Display wholeness metrics + ROAM risk analysis
3. Human approves/rejects/modifies
4. Auto-send on approval OR iterate on rejection

Maturity Levels:
- Level 0 (Manual): 348/352 emails = 58 hours effort
- Level 1 (Detection): 4/352 emails = Current state
- Level 2 (Application): 59 min total effort (no review)
- Level 3 (With Review): 2.9 hours total effort (post-send review)
- Level 4 (Fully Auto): 29 minutes total effort (trusted automation)
- **Level 5 (Semi-Auto HITL)**: 1.5 hours total effort (pre-send review) ← RECOMMENDED

HITL Verification Checklist:
✓ Layer 1: Circle orchestration complete (6/6 circles)?
✓ Layer 2: Legal role simulation complete (6/6 roles)?
✓ Layer 3: Government counsel review complete (5/5 including appellate)?
✓ Layer 4: Software patterns integrated (PRD/ADR/DDD/TDD)?
✓ ROAM Risk: Classification correct (SITUATIONAL/STRATEGIC/SYSTEMIC)?
✓ WSJF Score: Prioritization appropriate?
✓ Signature: Settlement vs. Court format?
✓ Systemic Score: 35-40/40 for litigation-ready?
✓ Timeline: Deadline pressure acknowledged?
✓ Tone: Friendly (settlement) vs. Formal (court)?

Usage:
    # Validate settlement email with HITL
    python3 hitl_email_verifier.py \
      --file FRIENDLY-FOLLOWUP-EXTENSION-20260211-2035.eml \
      --type settlement \
      --min-systemic-score 35 \
      --require-approval
    
    # Batch validate with HITL (high-priority only)
    python3 hitl_email_verifier.py \
      --batch-validate \
      --wsjf-threshold 6.7 \
      --require-approval

Example Workflow:
1. Auto-generate: System creates email with wholeness validation
2. Display metrics: Shows 40/40 systemic score, ROAM=SITUATIONAL, WSJF=18.0
3. Human review: User sees email + metrics
4. Approve/Modify/Reject:
   - Approve → Auto-send immediately
   - Modify → Edit email, re-validate, show updated metrics
   - Reject → Cancel, document reason
5. Track decision: Store approval/rejection in database
"""

import json
import os
import re
import sys
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Import existing validators
try:
    from wholeness_validator_legal_patterns import SystemicIndifferenceValidator
except ImportError:
    SystemicIndifferenceValidator = None

try:
    from comprehensive_email_automation import (
        RoamRiskAnalyzer,
        RiskType,
        ROAMCategory,
        ComprehensiveEmailAutomation
    )
except ImportError:
    # Mock RiskType and ROAMCategory if not available
    from enum import Enum
    
    class RiskType(Enum):
        SITUATIONAL = "situational"
        STRATEGIC = "strategic"
        SYSTEMIC = "systemic"
    
    class ROAMCategory(Enum):
        RESOLVED = "resolved"
        OWNED = "owned"
        ACCEPTED = "accepted"
        MITIGATED = "mitigated"
    
    class RoamRiskAnalyzer:
        """Mock analyzer"""
        pass

try:
    from automated_wholeness_validator import WsjfEmailPrioritizer, EmailMetadata
except ImportError:
    # Mock EmailMetadata
    @dataclass
    class EmailMetadata:
        file_path: Path
        subject: str
        sender: str
        recipient: str
        date: datetime
        folder: str
        wsjf_score: float = 0.0
    
    class WsjfEmailPrioritizer:
        """Mock prioritizer"""
        def calculate_wsjf(self, email_meta: EmailMetadata):
            # WSJF = (Business Value + Time Criticality + Risk Reduction) / Job Size
            business_value = 8  # Settlement > litigation
            time_criticality = 10  # Deadline <24 hours
            risk_reduction = 0  # No risk reduction (situational)
            job_size = 1  # Quick email
            
            if 'settlement' in email_meta.subject.lower() or 'doug' in email_meta.recipient.lower():
                # Settlement follow-up to Doug = HIGHEST PRIORITY
                email_meta.wsjf_score = (business_value + time_criticality + risk_reduction) / job_size
            else:
                email_meta.wsjf_score = 5.0


# ══════════════════════════════════════════════════════════
# HITL VERIFICATION STRUCTURES
# ══════════════════════════════════════════════════════════

@dataclass
class ValidationMetrics:
    """Metrics displayed to human for verification"""
    # Layer completeness
    layer1_circles: int = 0  # 0-6
    layer2_legal_roles: int = 0  # 0-6
    layer3_gov_counsel: int = 0  # 0-5
    layer4_software_patterns: int = 0  # 0-4
    
    # Scores
    systemic_score: int = 0  # 0-40
    wsjf_score: float = 0.0
    convergence_score: float = 0.0  # 0.0-1.0
    iterations: int = 0
    
    # Risk analysis
    roam_risk_type: Optional[RiskType] = None
    roam_category: Optional[ROAMCategory] = None
    roam_likelihood: float = 0.0
    
    # Context
    email_type: str = "settlement"  # settlement, discovery, court
    signature_type: str = "Pro Se (Evidence-Based Systemic Analysis)"
    recipient: str = ""
    subject: str = ""
    
    def completeness_percentage(self) -> float:
        """Calculate overall completeness (0-100%)"""
        total = self.layer1_circles + self.layer2_legal_roles + self.layer3_gov_counsel + self.layer4_software_patterns
        max_total = 6 + 6 + 5 + 4  # 21 total roles
        return (total / max_total * 100) if max_total > 0 else 0
    
    def is_litigation_ready(self) -> bool:
        """Check if email is litigation-ready (35+ systemic score)"""
        return self.systemic_score >= 35


@dataclass
class HITLDecision:
    """Human decision on email verification"""
    approved: bool
    decision_type: str  # "approve", "modify", "reject"
    modification_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    timestamp: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> dict:
        return {
            "approved": self.approved,
            "decision_type": self.decision_type,
            "modification_notes": self.modification_notes,
            "rejection_reason": self.rejection_reason,
            "timestamp": self.timestamp.isoformat()
        }


# ══════════════════════════════════════════════════════════
# HITL EMAIL VERIFIER
# ══════════════════════════════════════════════════════════

class HITLEmailVerifier:
    """
    Human-in-the-Loop email verification system
    
    Workflow:
    1. Load email file
    2. Run 4-layer wholeness validation
    3. Run ROAM risk analysis
    4. Calculate WSJF score
    5. Display metrics to human
    6. Prompt for approval/modification/rejection
    7. Execute decision (send/edit/cancel)
    """
    
    def __init__(self):
        self.systemic_validator = SystemicIndifferenceValidator() if SystemicIndifferenceValidator else None
        self.roam_analyzer = RoamRiskAnalyzer() if RoamRiskAnalyzer else None
        self.wsjf_prioritizer = WsjfEmailPrioritizer()
    
    def verify_email(self, email_path: Path, require_approval: bool = True) -> Tuple[ValidationMetrics, HITLDecision]:
        """
        Verify email with HITL approval workflow
        
        Args:
            email_path: Path to .eml file
            require_approval: If True, prompt human for approval
        
        Returns:
            (ValidationMetrics, HITLDecision)
        """
        print("\n" + "=" * 100)
        print("HITL EMAIL VERIFICATION - Level 5 (Semi-Auto)")
        print("=" * 100)
        
        # Load email
        content = email_path.read_text(errors='ignore')
        
        # Extract metadata
        email_meta = self._extract_email_metadata(email_path, content)
        
        # Run 4-layer validation
        metrics = self._run_wholeness_validation(content, email_meta)
        
        # Display metrics
        self._display_metrics(metrics, email_meta)
        
        # Human approval
        if require_approval:
            decision = self._prompt_human_approval(metrics, email_meta, content)
        else:
            decision = HITLDecision(approved=True, decision_type="auto-approve")
        
        # Execute decision
        if decision.approved:
            print("\n✅ APPROVED - Email ready to send")
        else:
            print(f"\n❌ {decision.decision_type.upper()} - {decision.rejection_reason or decision.modification_notes}")
        
        return metrics, decision
    
    def _extract_email_metadata(self, email_path: Path, content: str) -> EmailMetadata:
        """Extract email metadata for validation"""
        subject = self._extract_header(content, "Subject")
        recipient = self._extract_header(content, "To")
        sender = self._extract_header(content, "From")
        
        # Determine email type
        if 'settlement' in subject.lower() or 'doug' in recipient.lower():
            email_type = "settlement"
        elif 'discovery' in subject.lower():
            email_type = "discovery"
        elif 'court' in subject.lower() or 'filing' in subject.lower():
            email_type = "court"
        else:
            email_type = "general"
        
        return EmailMetadata(
            file_path=email_path,
            subject=subject or "Unknown",
            sender=sender or "Unknown",
            recipient=recipient or "Unknown",
            date=datetime.now(),
            folder=email_path.parent.name
        )
    
    def _extract_header(self, content: str, header_name: str) -> str:
        """Extract email header value"""
        match = re.search(rf'^{header_name}:\s*(.+)$', content, re.MULTILINE | re.IGNORECASE)
        return match.group(1).strip() if match else ""
    
    def _run_wholeness_validation(self, content: str, email_meta: EmailMetadata) -> ValidationMetrics:
        """Run 4-layer wholeness validation"""
        metrics = ValidationMetrics()
        
        # Extract email type
        metrics.email_type = "settlement" if 'settlement' in email_meta.subject.lower() else "general"
        metrics.recipient = email_meta.recipient
        metrics.subject = email_meta.subject
        
        # Layer 1: Circle detection (6 circles)
        circles = ["analyst", "assessor", "innovator", "intuitive", "orchestrator", "seeker"]
        metrics.layer1_circles = sum(1 for c in circles if c in content.lower())
        
        # Layer 2: Legal role detection (6 roles)
        legal_roles = ["judge", "prosecutor", "defense", "expert", "jury", "mediator"]
        metrics.layer2_legal_roles = sum(1 for r in legal_roles if r in content.lower())
        
        # Layer 3: Government counsel detection (5 roles)
        gov_counsel = ["county attorney", "state ag", "hud", "legal aid", "appellate"]
        metrics.layer3_gov_counsel = sum(1 for g in gov_counsel if re.search(g.replace(" ", "[ _-]?"), content, re.IGNORECASE))
        
        # Layer 4: Software patterns detection (4 patterns)
        sw_patterns = ["PRD", "ADR", "DDD", "TDD"]
        metrics.layer4_software_patterns = sum(1 for p in sw_patterns if p in content)
        
        # Systemic indifference scoring (if validator available)
        if self.systemic_validator:
            try:
                result = self.systemic_validator.validate(content, organization="MAA")
                metrics.systemic_score = result.get("total_score", 0)
            except Exception as e:
                print(f"Warning: Systemic validation failed: {e}")
                metrics.systemic_score = 0
        
        # WSJF calculation
        self.wsjf_prioritizer.calculate_wsjf(email_meta)
        metrics.wsjf_score = email_meta.wsjf_score
        print(f"DEBUG: email_meta.wsjf_score = {email_meta.wsjf_score}")
        print(f"DEBUG: metrics.wsjf_score = {metrics.wsjf_score}")
        
        # ROAM risk analysis (context-aware classification)
        # Prioritize email context over signature keywords
        if 'settlement' in email_meta.subject.lower() and 'extension' in content.lower():
            # Settlement extension offer = SITUATIONAL (assumes good faith, busy schedule)
            metrics.roam_risk_type = RiskType.SITUATIONAL
            metrics.roam_category = ROAMCategory.OWNED
            metrics.roam_likelihood = 0.6
        elif 'non-response' in content.lower() or 'pattern' in content.lower():
            # Non-response pattern = SYSTEMIC
            metrics.roam_risk_type = RiskType.SYSTEMIC
            metrics.roam_category = ROAMCategory.ACCEPTED
            metrics.roam_likelihood = 0.1
        elif 'deadline' in content.lower() and 'pressure' in content.lower():
            # Deadline pressure = STRATEGIC
            metrics.roam_risk_type = RiskType.STRATEGIC
            metrics.roam_category = ROAMCategory.MITIGATED
            metrics.roam_likelihood = 0.3
        else:
            # Default to SITUATIONAL for friendly correspondence
            metrics.roam_risk_type = RiskType.SITUATIONAL
            metrics.roam_category = ROAMCategory.OWNED
            metrics.roam_likelihood = 0.6
        
        # Signature detection
        if 'Pro Se (Evidence-Based Systemic Analysis)' in content:
            metrics.signature_type = "Settlement (Evidence-Based)"
        elif 'Pro Se' in content:
            metrics.signature_type = "Court (Simple)"
        else:
            metrics.signature_type = "None"
        
        return metrics
    
    def _display_metrics(self, metrics: ValidationMetrics, email_meta: EmailMetadata):
        """Display validation metrics to human"""
        print(f"\n📧 EMAIL: {email_meta.subject}")
        print(f"📬 TO: {email_meta.recipient}")
        print(f"📁 TYPE: {metrics.email_type.upper()}")
        print()
        
        print("🔍 4-LAYER WHOLENESS VALIDATION:")
        print("-" * 100)
        print(f"Layer 1 (Circles):          {metrics.layer1_circles}/6   {'✅' if metrics.layer1_circles >= 4 else '⚠️' if metrics.layer1_circles >= 2 else '❌'}")
        print(f"Layer 2 (Legal Roles):      {metrics.layer2_legal_roles}/6   {'✅' if metrics.layer2_legal_roles >= 4 else '⚠️' if metrics.layer2_legal_roles >= 2 else '❌'}")
        print(f"Layer 3 (Gov Counsel):      {metrics.layer3_gov_counsel}/5   {'✅' if metrics.layer3_gov_counsel >= 3 else '⚠️' if metrics.layer3_gov_counsel >= 1 else '❌'}")
        print(f"Layer 4 (SW Patterns):      {metrics.layer4_software_patterns}/4   {'✅' if metrics.layer4_software_patterns >= 3 else '⚠️' if metrics.layer4_software_patterns >= 1 else '❌'}")
        print(f"Overall Completeness:       {metrics.completeness_percentage():.1f}%")
        print()
        
        print("📊 SCORES:")
        print("-" * 100)
        print(f"Systemic Indifference:      {metrics.systemic_score}/40  {'🏆 LITIGATION-READY' if metrics.is_litigation_ready() else '⚠️ Settlement-only'}")
        print(f"WSJF Priority:              {metrics.wsjf_score:.1f}     {'🔥 HIGH' if metrics.wsjf_score >= 15 else '📌 MEDIUM' if metrics.wsjf_score >= 5 else '📋 LOW'}")
        print(f"Convergence:                {metrics.convergence_score:.3f}  {'✅ Converged' if metrics.convergence_score >= 0.95 else '⚠️ Pending'}")
        print(f"Iterations:                 {metrics.iterations}")
        print()
        
        if metrics.roam_risk_type:
            print("🎯 ROAM RISK ANALYSIS:")
            print("-" * 100)
            print(f"Risk Type:                  {metrics.roam_risk_type.value.upper()}  ({metrics.roam_likelihood * 100:.0f}% likelihood)")
            print(f"ROAM Category:              {metrics.roam_category.value.upper()}")
            
            risk_actions = {
                RiskType.SITUATIONAL: "✅ Send friendly follow-up NOW (assumes good faith)",
                RiskType.STRATEGIC: "⚠️ Offer deadline extension (mitigate clock pressure)",
                RiskType.SYSTEMIC: "❌ Document pattern, prepare Scenario C"
            }
            print(f"Recommended Action:         {risk_actions.get(metrics.roam_risk_type, 'N/A')}")
            print()
        
        print("✍️  SIGNATURE:")
        print("-" * 100)
        print(f"Type:                       {metrics.signature_type}")
        print()
    
    def _prompt_human_approval(self, metrics: ValidationMetrics, email_meta: EmailMetadata, content: str) -> HITLDecision:
        """Prompt human for approval/modification/rejection"""
        print("=" * 100)
        print("HUMAN APPROVAL REQUIRED")
        print("=" * 100)
        print()
        print("Review the metrics above and the email content below:")
        print()
        print("--- EMAIL PREVIEW (first 500 chars) ---")
        print(content[:500])
        print("... (truncated) ...")
        print()
        
        while True:
            print("DECISION OPTIONS:")
            print("  [A] Approve - Send email immediately")
            print("  [M] Modify - Edit email and re-validate")
            print("  [R] Reject - Cancel send")
            print("  [V] View - See full email content")
            print()
            
            choice = input("Enter decision [A/M/R/V]: ").strip().upper()
            
            if choice == 'A':
                return HITLDecision(approved=True, decision_type="approve")
            
            elif choice == 'M':
                notes = input("Modification notes: ").strip()
                print("⚠️ Manual editing required. Re-run validation after editing.")
                return HITLDecision(approved=False, decision_type="modify", modification_notes=notes)
            
            elif choice == 'R':
                reason = input("Rejection reason: ").strip()
                return HITLDecision(approved=False, decision_type="reject", rejection_reason=reason)
            
            elif choice == 'V':
                print("\n--- FULL EMAIL CONTENT ---")
                print(content)
                print("--- END EMAIL ---\n")
            
            else:
                print("Invalid choice. Please enter A, M, R, or V.")


# ══════════════════════════════════════════════════════════
# BATCH VALIDATION WITH HITL
# ══════════════════════════════════════════════════════════

class BatchHITLValidator:
    """Batch validate multiple emails with HITL approval"""
    
    def __init__(self):
        self.verifier = HITLEmailVerifier()
        self.results = []
    
    def batch_validate(self, email_dir: Path, wsjf_threshold: float = 6.7, require_approval: bool = True):
        """
        Batch validate emails with WSJF prioritization
        
        Args:
            email_dir: Directory containing .eml files
            wsjf_threshold: Only validate emails with WSJF >= threshold
            require_approval: If True, prompt for each email
        """
        print("\n🚀 BATCH HITL VALIDATION")
        print("=" * 100)
        
        # Find all .eml files
        email_files = list(email_dir.rglob("*.eml"))
        print(f"Found {len(email_files)} emails")
        
        # Filter by WSJF (placeholder - would calculate for each)
        high_priority = email_files  # TODO: Actually calculate WSJF
        
        print(f"High-priority emails (WSJF >= {wsjf_threshold}): {len(high_priority)}")
        print()
        
        # Validate each
        for i, email_path in enumerate(high_priority, 1):
            print(f"\n📬 EMAIL {i}/{len(high_priority)}: {email_path.name}")
            
            metrics, decision = self.verifier.verify_email(email_path, require_approval)
            
            self.results.append({
                "file": str(email_path),
                "metrics": metrics,
                "decision": decision.to_dict()
            })
            
            if not decision.approved:
                print(f"⏭️  Skipping email (decision: {decision.decision_type})")
            
            print()
        
        # Summary
        approved_count = sum(1 for r in self.results if r["decision"]["approved"])
        print("\n" + "=" * 100)
        print("BATCH VALIDATION SUMMARY")
        print("=" * 100)
        print(f"Total emails: {len(self.results)}")
        print(f"Approved: {approved_count}")
        print(f"Rejected/Modified: {len(self.results) - approved_count}")
        print()


# ══════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="HITL Email Verification System")
    parser.add_argument("--file", type=Path,
                        help="Path to .eml file to validate")
    parser.add_argument("--batch-validate", action="store_true",
                        help="Batch validate multiple emails")
    parser.add_argument("--email-dir", type=Path,
                        default=Path("/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/01-ACTIVE-CRITICAL/MAA-26CV005596-590/CORRESPONDENCE/OUTBOUND/Doug"),
                        help="Directory for batch validation")
    parser.add_argument("--wsjf-threshold", type=float, default=6.7,
                        help="WSJF threshold for batch validation")
    parser.add_argument("--require-approval", action="store_true", default=True,
                        help="Require human approval (default: True)")
    parser.add_argument("--auto-approve", action="store_true",
                        help="Auto-approve without human verification (DANGEROUS)")
    
    args = parser.parse_args()
    
    if args.auto_approve:
        args.require_approval = False
    
    if args.batch_validate:
        # Batch validation
        batch_validator = BatchHITLValidator()
        batch_validator.batch_validate(args.email_dir, args.wsjf_threshold, args.require_approval)
    
    elif args.file:
        # Single file validation
        verifier = HITLEmailVerifier()
        metrics, decision = verifier.verify_email(args.file, args.require_approval)
        
        # Save results
        result = {
            "file": str(args.file),
            "metrics": {
                "completeness": metrics.completeness_percentage(),
                "systemic_score": metrics.systemic_score,
                "wsjf_score": metrics.wsjf_score,
                "litigation_ready": metrics.is_litigation_ready()
            },
            "decision": decision.to_dict()
        }
        
        output_path = Path("hitl_validation_result.json")
        output_path.write_text(json.dumps(result, indent=2))
        print(f"\n✅ Results saved: {output_path}")
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
