#!/usr/bin/env python3
"""
Signature Block Validator - Detects settlement vs. court email signatures

DoR: Email samples with multi-line signatures
DoD: Validates signature format, suggests corrections, exits 0 (valid) or 1 (invalid)

Usage:
    ./signature_block_validator.py --file email.eml --type settlement
    ./signature_block_validator.py --file email.eml --type court
"""

import re
import sys
import click
from pathlib import Path
from typing import Dict, List, Optional


class SignatureBlockValidator:
    """Validates signature blocks for settlement vs. court emails"""
    
    # Settlement signature requirements
    SETTLEMENT_REQUIRED = [
        r"Pro Se \(Evidence-Based Systemic Analysis\)",
        r"BSBA Finance/Management Information Systems",
        r"Case No\.: 26CV005596-590",
        r"Settlement Deadline: .+ @ .+ EST"
    ]
    
    # Court filing signature requirements
    COURT_REQUIRED = [
        r"Respectfully submitted,",
        r"Pro Se",  # NO methodology disclosure
        r"BSBA Finance/Management Information Systems",
        r"Case No\.: 26CV005596-590"
    ]
    
    # Court procedural/administrative emails (to @nccourts.org)
    # These are NOT legal filings, just administrative coordination
    # Only require: name + contact method (phone/email)
    PROCEDURAL_REQUIRED = [
        r"Shahrooz Bhopti",  # Name
        r"(\d{3}-[A-Z]{5}-\d{2}|\(\d{3}\) \d{3}-\d{4}|s@rooz\.live|shahrooz@bhopti\.com)"  # Contact
    ]
    
    # Contact info patterns
    CONTACT_PATTERNS = {
        "phone": r"\(\d{3}\) \d{3}-\d{4}",
        "email": r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",
        "address": r"Unit \d+, MAA Uptown Charlotte"
    }
    
    def __init__(self, email_path: str, email_type: str):
        self.email_path = Path(email_path)
        self.email_type = email_type
        self.content = ""
        self.verdict = {}
    
    def load_email(self) -> bool:
        """Load email content from .eml file"""
        try:
            with open(self.email_path, 'r', encoding='utf-8') as f:
                self.content = f.read()
            return True
        except FileNotFoundError:
            click.secho(f"❌ Email file not found: {self.email_path}", fg='red')
            return False
        except Exception as e:
            click.secho(f"❌ Error loading email: {e}", fg='red')
            return False
    
    def validate_signature(self) -> Dict:
        """
        Validate signature block against email type requirements
        
        Returns:
            {
                "valid": bool,
                "missing_fields": List[str],
                "suggestions": List[str],
                "confidence": int
            }
        """
        if self.email_type == "settlement":
            required = self.SETTLEMENT_REQUIRED
        elif self.email_type == "court":
            required = self.COURT_REQUIRED
        elif self.email_type == "procedural":
            required = self.PROCEDURAL_REQUIRED
        else:
            return {
                "valid": False,
                "missing_fields": ["Invalid email type"],
                "suggestions": ["Use --type settlement, court, or procedural"],
                "confidence": 0
            }
        
        missing = []
        found_count = 0
        
        for pattern in required:
            if re.search(pattern, self.content, re.MULTILINE):
                found_count += 1
            else:
                # Extract readable field name from regex
                field_name = self._extract_field_name(pattern)
                missing.append(field_name)
        
        confidence = int((found_count / len(required)) * 100)
        valid = len(missing) == 0
        
        suggestions = self._generate_suggestions(missing)
        
        return {
            "valid": valid,
            "missing_fields": missing,
            "suggestions": suggestions,
            "confidence": confidence
        }
    
    def _extract_field_name(self, regex_pattern: str) -> str:
        """Convert regex pattern to human-readable field name"""
        field_map = {
            r"Pro Se \(Evidence-Based Systemic Analysis\)": "Pro Se (Evidence-Based Systemic Analysis)",
            r"BSBA Finance/Management Information Systems": "BSBA Finance/Management Information Systems",
            r"Case No\.: 26CV005596-590": "Case No.: 26CV005596-590",
            r"Settlement Deadline: .+ @ .+ EST": "Settlement Deadline",
            r"Respectfully submitted,": "Respectfully submitted,",
            r"Pro Se": "Pro Se (no methodology)"
        }
        return field_map.get(regex_pattern, regex_pattern)
    
    def _generate_suggestions(self, missing_fields: List[str]) -> List[str]:
        """Generate actionable suggestions based on missing fields"""
        suggestions = []
        
        for field in missing_fields:
            if "Evidence-Based Systemic Analysis" in field:
                suggestions.append("Add '(Evidence-Based Systemic Analysis)' after 'Pro Se' for settlement emails")
            elif "Settlement Deadline" in field:
                suggestions.append("Add 'Settlement Deadline: [Date] @ [Time] EST' line")
            elif "Respectfully submitted" in field:
                suggestions.append("Add 'Respectfully submitted,' before signature block for court filings")
            elif "Pro Se (no methodology)" in field:
                suggestions.append("Remove methodology disclosure for court filings - use 'Pro Se' only")
            else:
                suggestions.append(f"Add missing field: {field}")
        
        return suggestions
    
    def validate_contact_info(self) -> Dict:
        """Validate presence of contact information"""
        contact_found = {}
        
        for contact_type, pattern in self.CONTACT_PATTERNS.items():
            matches = re.findall(pattern, self.content)
            contact_found[contact_type] = len(matches) > 0
        
        # Check for alternative email (s@rooz.live)
        alt_email = re.search(r"s@rooz\.live", self.content)
        contact_found["alt_email"] = alt_email is not None
        
        # Check for iMessage contact
        imessage = re.search(r"iMessage:", self.content)
        contact_found["imessage"] = imessage is not None
        
        return contact_found
    
    def check_methodology_disclosure(self) -> Dict:
        """Check if methodology is disclosed (settlement yes, court/procedural no)"""
        methodology_present = bool(re.search(
            r"Pro Se \(Evidence-Based Systemic Analysis\)",
            self.content
        ))
        
        if self.email_type == "settlement":
            correct = methodology_present
            issue = None if correct else "Missing methodology disclosure for settlement email"
        elif self.email_type == "procedural":
            # Procedural emails don't need methodology OR Pro Se
            correct = True
            issue = None
        else:  # court
            correct = not methodology_present
            issue = "Methodology disclosure should NOT appear in court filings" if methodology_present else None
        
        return {
            "correct": correct,
            "methodology_present": methodology_present,
            "issue": issue
        }
    
    def generate_report(self) -> str:
        """Generate validation report"""
        sig_result = self.validate_signature()
        contact_result = self.validate_contact_info()
        methodology_result = self.check_methodology_disclosure()
        
        report = []
        report.append(f"\n{'='*60}")
        report.append(f"SIGNATURE BLOCK VALIDATION REPORT")
        report.append(f"{'='*60}")
        report.append(f"Email: {self.email_path.name}")
        report.append(f"Type: {self.email_type.upper()}")
        report.append(f"{'='*60}\n")
        
        # Overall verdict
        if sig_result["valid"] and methodology_result["correct"]:
            report.append("✅ VERDICT: APPROVED")
            status_color = "green"
        else:
            report.append("❌ VERDICT: NEEDS REVISION")
            status_color = "red"
        
        report.append(f"Confidence: {sig_result['confidence']}%\n")
        
        # Signature validation details
        report.append("📝 SIGNATURE VALIDATION:")
        if sig_result["valid"]:
            report.append("   ✅ All required fields present")
        else:
            report.append(f"   ❌ Missing {len(sig_result['missing_fields'])} field(s):")
            for field in sig_result["missing_fields"]:
                report.append(f"      - {field}")
        
        # Methodology check
        report.append("\n🔍 METHODOLOGY DISCLOSURE:")
        if methodology_result["correct"]:
            report.append("   ✅ Correct for email type")
        else:
            report.append(f"   ❌ {methodology_result['issue']}")
        
        # Contact info check
        report.append("\n📞 CONTACT INFORMATION:")
        contact_complete = all(contact_result.values())
        if contact_complete:
            report.append("   ✅ Complete")
        else:
            for contact_type, present in contact_result.items():
                icon = "✅" if present else "❌"
                report.append(f"   {icon} {contact_type.replace('_', ' ').title()}")
        
        # Suggestions
        if sig_result["suggestions"]:
            report.append("\n💡 SUGGESTIONS:")
            for i, suggestion in enumerate(sig_result["suggestions"], 1):
                report.append(f"   {i}. {suggestion}")
        
        # Example correct signature
        report.append(f"\n📋 CORRECT {self.email_type.upper()} SIGNATURE:")
        report.append(self._get_example_signature())
        
        report.append(f"\n{'='*60}\n")
        
        return "\n".join(report)
    
    def _get_example_signature(self) -> str:
        """Get example correct signature for email type"""
        if self.email_type == "settlement":
            return """
   Respectfully,

   Shahrooz Bhopti
   Pro Se (Evidence-Based Systemic Analysis)
   BSBA Finance/Management Information Systems

   Contact Information:
   Phone: (412) 555-0190 (412 CLOUD 90)
   iMessage: (412) 555-0190
   Email: shahrooz@bhopti.com
   Alternative: s@rooz.live

   Unit 1215, MAA Uptown Charlotte

   ---
   Case No.: 26CV005596-590
   Court: Mecklenburg County District Court, North Carolina
   Court Hearing: March 3, 2026
   Settlement Deadline: February 12, 2026 @ 5:00 PM EST
"""
        else:  # court
            return """
   Respectfully submitted,

   Shahrooz Bhopti, Pro Se
   BSBA Finance/Management Information Systems
   Unit 1215, MAA Uptown Charlotte
   Phone: (412) 555-0190 (412 CLOUD 90)
   Email: shahrooz@bhopti.com

   ---
   Case No.: 26CV005596-590
   Mecklenburg County District Court
"""


@click.command()
@click.option('--file', '-f', 'email_file', required=True, type=click.Path(exists=True),
              help='Path to .eml email file')
@click.option('--type', '-t', 'email_type', required=True,
              type=click.Choice(['settlement', 'court'], case_sensitive=False),
              help='Email type: settlement or court')
@click.option('--json', 'output_json', is_flag=True,
              help='Output results as JSON')
def main(email_file, email_type, output_json):
    """
    Validate signature block in settlement or court email
    
    Examples:
        ./signature_block_validator.py -f email.eml -t settlement
        ./signature_block_validator.py -f email.eml -t court --json
    """
    validator = SignatureBlockValidator(email_file, email_type.lower())
    
    if not validator.load_email():
        sys.exit(1)
    
    if output_json:
        import json
        sig_result = validator.validate_signature()
        contact_result = validator.validate_contact_info()
        methodology_result = validator.check_methodology_disclosure()
        
        output = {
            "email": str(validator.email_path),
            "type": email_type,
            "signature": sig_result,
            "contact_info": contact_result,
            "methodology": methodology_result,
            "overall_valid": sig_result["valid"] and methodology_result["correct"]
        }
        
        print(json.dumps(output, indent=2))
    else:
        report = validator.generate_report()
        print(report)
    
    # Exit code
    sig_result = validator.validate_signature()
    methodology_result = validator.check_methodology_disclosure()
    
    if sig_result["valid"] and methodology_result["correct"]:
        click.secho("✅ Signature validation PASSED", fg='green')
        sys.exit(0)
    else:
        click.secho("❌ Signature validation FAILED", fg='red')
        sys.exit(1)


if __name__ == "__main__":
    main()
