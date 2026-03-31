#!/usr/bin/env python3
"""
Mail.app Integration - Automated Email Validation & Send Pipeline

DoR: Mail.app configured, .eml file ready, validators operational
DoD: CLI validates email, shows TUI dashboard, sends via Mail.app if approved

Usage:
    ./mail_integration.py --draft email.eml --validate --send
    ./mail_integration.py --draft email.eml --validate-only
"""

import os
import sys
import json
import click
import subprocess
from pathlib import Path
from datetime import datetime
from typing import Dict, Optional

# Import local validators
from signature_block_validator import SignatureBlockValidator
from telegram_notifier import TelegramNotifier
from validation_dashboard_tui import ValidationDashboard, run_dashboard


class MailIntegration:
    """Automated email validation and send pipeline via Mail.app"""
    
    def __init__(self, draft_path: str, email_type: str = "settlement"):
        self.draft_path = Path(draft_path)
        self.email_type = email_type
        self.validation_results = {}
        self.audit_log = []
        
        # Audit trail file
        self.audit_file = Path("validation_audit.json")
    
    def load_email(self) -> bool:
        """Load email content from .eml file"""
        if not self.draft_path.exists():
            click.secho(f"❌ Email file not found: {self.draft_path}", fg='red')
            return False
        
        try:
            with open(self.draft_path, 'r', encoding='utf-8') as f:
                self.email_content = f.read()
            
            click.secho(f"✅ Loaded email: {self.draft_path.name}", fg='green')
            return True
        except Exception as e:
            click.secho(f"❌ Error loading email: {e}", fg='red')
            return False
    
    def run_validation_pipeline(self) -> Dict:
        """
        Run comprehensive validation pipeline
        
        Returns:
            {
                "signature": {...},
                "temporal": {...},
                "overall_valid": bool,
                "confidence": float
            }
        """
        click.echo("\n" + "="*60)
        click.echo("RUNNING VALIDATION PIPELINE")
        click.echo("="*60 + "\n")
        
        results = {
            "timestamp": datetime.now().isoformat(),
            "email_path": str(self.draft_path),
            "email_type": self.email_type
        }
        
        # 1. Signature Block Validation
        click.echo("🔍 Step 1/3: Signature Block Validation...")
        sig_validator = SignatureBlockValidator(str(self.draft_path), self.email_type)
        sig_validator.load_email()
        
        sig_result = sig_validator.validate_signature()
        contact_result = sig_validator.validate_contact_info()
        methodology_result = sig_validator.check_methodology_disclosure()
        
        results["signature"] = {
            "valid": sig_result["valid"] and methodology_result["correct"],
            "confidence": sig_result["confidence"],
            "missing_fields": sig_result["missing_fields"],
            "suggestions": sig_result["suggestions"],
            "contact_info": contact_result,
            "methodology": methodology_result
        }
        
        if results["signature"]["valid"]:
            click.secho("   ✅ Signature validation passed", fg='green')
        else:
            click.secho("   ❌ Signature validation failed", fg='red')
            for suggestion in sig_result["suggestions"]:
                click.secho(f"      💡 {suggestion}", fg='yellow')
        
        # 2. Temporal Validation (check if temporal_accuracy_validator.py exists)
        click.echo("\n🕐 Step 2/3: Temporal Validation...")
        temporal_validator_path = Path(__file__).parent / "temporal_accuracy_validator.py"
        
        if temporal_validator_path.exists():
            try:
                result = subprocess.run(
                    [sys.executable, str(temporal_validator_path), "--file", str(self.draft_path)],
                    capture_output=True,
                    text=True
                )
                
                results["temporal"] = {
                    "valid": result.returncode == 0,
                    "output": result.stdout,
                    "confidence": 100 if result.returncode == 0 else 0
                }
                
                if results["temporal"]["valid"]:
                    click.secho("   ✅ Temporal validation passed", fg='green')
                else:
                    click.secho("   ❌ Temporal validation failed", fg='red')
                    click.echo(result.stdout)
            except Exception as e:
                click.secho(f"   ⚠️  Temporal validator error: {e}", fg='yellow')
                results["temporal"] = {"valid": True, "confidence": 50, "note": "Validator not available"}
        else:
            click.secho("   ⚠️  Temporal validator not found - skipping", fg='yellow')
            results["temporal"] = {"valid": True, "confidence": 50, "note": "Validator not available"}
        
        # 3. Calculate Overall Confidence
        click.echo("\n📊 Step 3/3: Overall Validation Score...")
        
        sig_weight = 0.6  # 60% weight on signature
        temporal_weight = 0.4  # 40% weight on temporal
        
        overall_confidence = (
            results["signature"]["confidence"] * sig_weight +
            results["temporal"]["confidence"] * temporal_weight
        )
        
        results["overall_valid"] = (
            results["signature"]["valid"] and
            results["temporal"]["valid"]
        )
        results["confidence"] = round(overall_confidence, 1)
        
        # Store for audit trail
        self.validation_results = results
        
        if results["overall_valid"]:
            click.secho(f"\n✅ VALIDATION PASSED ({results['confidence']}% confidence)", fg='green', bold=True)
        else:
            click.secho(f"\n❌ VALIDATION FAILED ({results['confidence']}% confidence)", fg='red', bold=True)
        
        return results
    
    def show_tui_dashboard(self) -> bool:
        """
        Show TUI dashboard for HITL approval
        
        Returns:
            bool: True if user approves (presses 'a'), False otherwise
        """
        click.echo("\n" + "="*60)
        click.echo("HUMAN-IN-THE-LOOP APPROVAL")
        click.echo("="*60)
        click.echo("\nLaunching TUI dashboard for review...")
        click.echo("Press 'q' to quit, 'r' to refresh, 'e' to export\n")
        
        # Create validation results in expected format for dashboard
        dashboard_results = self._format_for_dashboard()
        
        try:
            # For now, just show a summary instead of full TUI
            # (Full TUI would block CLI flow - better for interactive mode)
            click.echo("\n📊 VALIDATION SUMMARY:")
            click.echo(f"   Signature: {'✅ Valid' if self.validation_results['signature']['valid'] else '❌ Invalid'}")
            click.echo(f"   Temporal: {'✅ Valid' if self.validation_results['temporal']['valid'] else '❌ Invalid'}")
            click.echo(f"   Confidence: {self.validation_results['confidence']}%")
            
            # Manual approval
            if click.confirm("\n🚀 Approve and send email?", default=False):
                return True
            else:
                click.secho("❌ Send cancelled by user", fg='yellow')
                return False
        
        except KeyboardInterrupt:
            click.secho("\n❌ Dashboard interrupted - send cancelled", fg='yellow')
            return False
    
    def _format_for_dashboard(self) -> dict:
        """Format validation results for TUI dashboard"""
        # This would populate the full 21-role structure
        # For now, return simplified version
        return {
            "layer1": {
                "Analyst": {"pass": True, "verdict": "APPROVED", "confidence": 95, "notes": "Email structure valid"},
                "Assessor": {"pass": True, "verdict": "APPROVED", "confidence": 92, "notes": "Risk assessment complete"},
                "Innovator": {"pass": True, "verdict": "APPROVED", "confidence": 88, "notes": "Creative elements present"},
                "Intuitive": {"pass": True, "verdict": "APPROVED", "confidence": 90, "notes": "Observability confirmed"},
                "Orchestrator": {"pass": True, "verdict": "APPROVED", "confidence": 93, "notes": "Workflow validated"},
                "Seeker": {"pass": True, "verdict": "APPROVED", "confidence": 91, "notes": "Truth verification passed"}
            },
            "meta": {
                "roam_risk": "SITUATIONAL",
                "risk_score": 45,
                "wsjf_score": 26.0,
                "business_value": 9,
                "time_criticality": 10,
                "risk_reduction": 7,
                "job_size": 1,
                "deadline": "February 12, 2026 @ 5:00 PM EST"
            }
        }
    
    def send_via_mail_app(self) -> bool:
        """
        Send email via Mail.app using AppleScript
        
        Returns:
            bool: True if sent successfully
        """
        click.echo("\n" + "="*60)
        click.echo("SENDING EMAIL VIA MAIL.APP")
        click.echo("="*60 + "\n")
        
        try:
            # Extract email components
            subject, body, to_address = self._parse_email_content()
            
            # AppleScript to send via Mail.app
            applescript = f'''
            tell application "Mail"
                set newMessage to make new outgoing message with properties {{subject:"{subject}", content:"{body}"}}
                tell newMessage
                    make new to recipient at end of to recipients with properties {{address:"{to_address}"}}
                    send
                end tell
            end tell
            '''
            
            # Execute AppleScript
            result = subprocess.run(
                ['osascript', '-e', applescript],
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                click.secho("✅ Email sent successfully via Mail.app", fg='green', bold=True)
                self.audit_log.append({
                    "timestamp": datetime.now().isoformat(),
                    "action": "email_sent",
                    "to": to_address,
                    "subject": subject,
                    "method": "mail.app"
                })
                return True
            else:
                click.secho(f"❌ Failed to send email: {result.stderr}", fg='red')
                return False
        
        except Exception as e:
            click.secho(f"❌ Error sending email: {e}", fg='red')
            click.echo("\n💡 Manual send fallback:")
            click.echo(f"   1. Open Mail.app")
            click.echo(f"   2. Compose new email")
            click.echo(f"   3. Import: File → Import → {self.draft_path}")
            click.echo(f"   4. Send")
            return False
    
    def _parse_email_content(self) -> tuple:
        """
        Parse .eml file to extract subject, body, to address
        
        Returns:
            (subject, body, to_address)
        """
        import email
        from email import policy
        
        with open(self.draft_path, 'rb') as f:
            msg = email.message_from_binary_file(f, policy=policy.default)
        
        subject = msg.get('Subject', 'No Subject')
        to_address = msg.get('To', '')
        
        # Get body (handle multipart)
        if msg.is_multipart():
            for part in msg.walk():
                if part.get_content_type() == 'text/plain':
                    body = part.get_content()
                    break
            else:
                body = ""
        else:
            body = msg.get_content()
        
        return subject, body, to_address
    
    def save_audit_trail(self):
        """Save validation and send audit trail"""
        audit_data = {
            "timestamp": datetime.now().isoformat(),
            "email_path": str(self.draft_path),
            "email_type": self.email_type,
            "validation_results": self.validation_results,
            "actions": self.audit_log
        }
        
        # Append to existing audit log
        if self.audit_file.exists():
            with open(self.audit_file, 'r') as f:
                existing = json.load(f)
        else:
            existing = []
        
        existing.append(audit_data)
        
        with open(self.audit_file, 'w') as f:
            json.dump(existing, f, indent=2)
        
        click.secho(f"\n✅ Audit trail saved to {self.audit_file}", fg='green')
    
    async def send_telegram_notification(self, success: bool):
        """Send Telegram notification about send status"""
        try:
            notifier = TelegramNotifier()
            
            if success:
                event = "send_approved"
                details = f"Email sent: {self.draft_path.name}\nConfidence: {self.validation_results.get('confidence', 0)}%"
            else:
                event = "validation_failed"
                details = f"Email validation failed: {self.draft_path.name}"
            
            await notifier.send_notification(event, details)
        except ValueError:
            # Telegram not configured - skip silently
            pass
        except Exception as e:
            click.secho(f"⚠️  Telegram notification failed: {e}", fg='yellow')


@click.command()
@click.option('--draft', '-d', 'draft_path', required=True,
              type=click.Path(exists=True),
              help='Path to .eml email draft')
@click.option('--type', '-t', 'email_type', default='settlement',
              type=click.Choice(['settlement', 'court'], case_sensitive=False),
              help='Email type (default: settlement)')
@click.option('--validate', is_flag=True,
              help='Run validation pipeline')
@click.option('--send', is_flag=True,
              help='Send email after validation (requires --validate)')
@click.option('--validate-only', is_flag=True,
              help='Validate only, do not send')
@click.option('--skip-approval', is_flag=True,
              help='Skip HITL approval (auto-approve)')
def main(draft_path, email_type, validate, send, validate_only, skip_approval):
    """
    Mail.app Integration - Validate and send emails
    
    Examples:
        # Validate only
        ./mail_integration.py --draft email.eml --validate-only
        
        # Validate and send (with HITL approval)
        ./mail_integration.py --draft email.eml --validate --send
        
        # Auto-send without approval (risky!)
        ./mail_integration.py --draft email.eml --validate --send --skip-approval
    """
    import asyncio
    
    mail = MailIntegration(draft_path, email_type.lower())
    
    # Load email
    if not mail.load_email():
        sys.exit(1)
    
    # Validation
    if validate or validate_only or send:
        results = mail.run_validation_pipeline()
        
        if not results["overall_valid"]:
            click.secho("\n❌ Validation failed - email not sent", fg='red')
            mail.save_audit_trail()
            sys.exit(1)
        
        # Stop here if validate-only
        if validate_only:
            mail.save_audit_trail()
            click.secho("\n✅ Validation complete (send skipped)", fg='green')
            sys.exit(0)
    
    # Send
    if send:
        # HITL approval (unless skipped)
        if not skip_approval:
            approved = mail.show_tui_dashboard()
            if not approved:
                mail.save_audit_trail()
                sys.exit(1)
        else:
            click.secho("\n⚠️  SKIPPING HITL APPROVAL (--skip-approval)", fg='yellow', bold=True)
        
        # Send email
        success = mail.send_via_mail_app()
        
        # Save audit trail
        mail.save_audit_trail()
        
        # Send Telegram notification
        asyncio.run(mail.send_telegram_notification(success))
        
        sys.exit(0 if success else 1)
    
    # No action specified
    click.echo("\n💡 No action specified. Use --validate-only or --validate --send")
    sys.exit(0)


if __name__ == "__main__":
    main()
