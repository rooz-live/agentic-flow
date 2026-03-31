#!/usr/bin/env python3
"""
Session Manager for Advocate CLI
Handles ~/.advocate/session.json persistence

DoR: ~/.advocate directory writable, JSON serializable session structure
DoD: Session persists across CLI invocations, feature flags toggle, trial tracking works
"""

import json
import os
from pathlib import Path
from datetime import datetime
from typing import Dict, Optional


class SessionManager:
    """Manage persistent session state across advocate CLI invocations"""
    
    SESSION_DIR = Path.home() / ".advocate"
    SESSION_FILE = SESSION_DIR / "session.json"
    
    def __init__(self):
        self.SESSION_DIR.mkdir(exist_ok=True)
        self.session = self._load_session()
    
    def _load_session(self) -> Dict:
        """Load existing session or create new"""
        if self.SESSION_FILE.exists():
            try:
                with open(self.SESSION_FILE, 'r') as f:
                    return json.load(f)
            except json.JSONDecodeError:
                return self._create_default_session()
        return self._create_default_session()
    
    def _create_default_session(self) -> Dict:
        """Create default session structure"""
        return {
            "last_case": None,
            "last_classification": None,
            "document_count": 0,
            "api_usage": {
                "classify_calls": 0,
                "last_month_cost": 0.0,
                "provider_usage": {
                    "anthropic": 0,
                    "openai": 0,
                    "gemini": 0
                }
            },
            "trials": [],
            "evidence_bundle_status": "incomplete",
            "feature_flags": {
                "FEATURE_PDF_VISION": True,
                "FEATURE_AUTO_RENAME": True,
                "FEATURE_WEBHOOKS": False
            }
        }
    
    def save(self):
        """Persist session to disk"""
        with open(self.SESSION_FILE, 'w') as f:
            json.dump(self.session, f, indent=2)
    
    def update_classification(self, case_number: str, provider: str, model: str):
        """Update session after classification"""
        self.session["last_case"] = case_number
        self.session["last_classification"] = datetime.utcnow().isoformat() + "Z"
        self.session["document_count"] += 1
        self.session["api_usage"]["classify_calls"] += 1
        
        # Track provider usage
        provider_name = provider.lower()
        if provider_name in self.session["api_usage"]["provider_usage"]:
            self.session["api_usage"]["provider_usage"][provider_name] += 1
        
        self.save()
    
    def add_trial(self, case_number: str, trial_date: str, trial_type: str):
        """Add trial to session"""
        trial = {
            "case_number": case_number,
            "trial_date": trial_date,
            "trial_type": trial_type,
            "status": "pending"
        }
        self.session["trials"].append(trial)
        self.save()
    
    def set_feature_flag(self, flag: str, value: bool):
        """Set feature flag"""
        self.session["feature_flags"][flag] = value
        self.save()
    
    def get_feature_flag(self, flag: str, default: bool = False) -> bool:
        """Get feature flag value"""
        return self.session["feature_flags"].get(flag, default)
    
    def restore(self) -> Dict:
        """Restore session for display"""
        return self.session
    
    def summary(self) -> str:
        """Generate human-readable session summary"""
        lines = []
        lines.append("📋 Advocate Session Status\n")
        
        if self.session["last_case"]:
            lines.append(f"✓ Last case: {self.session['last_case']}")
            
            if self.session["last_classification"]:
                last_time = datetime.fromisoformat(self.session["last_classification"].replace("Z", "+00:00"))
                lines.append(f"✓ Last classified: {self.session['document_count']} PDFs on {last_time.strftime('%b %d')}")
        
        # Trials
        if self.session["trials"]:
            lines.append("\n🗓️  Upcoming Trials:")
            for trial in self.session["trials"]:
                if trial["status"] == "pending":
                    trial_date = datetime.fromisoformat(trial["trial_date"])
                    days_away = (trial_date - datetime.now()).days
                    lines.append(f"  • {trial['trial_type']}: {trial_date.strftime('%b %d')} ({days_away} days)")
        
        # API usage
        total_calls = self.session["api_usage"]["classify_calls"]
        if total_calls > 0:
            lines.append(f"\n📊 API Usage: {total_calls} classification calls")
            provider_usage = self.session["api_usage"]["provider_usage"]
            for provider, count in provider_usage.items():
                if count > 0:
                    lines.append(f"  • {provider.title()}: {count} calls")
        
        return "\n".join(lines)


def main():
    """CLI entry point for session management"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Manage advocate session")
    parser.add_argument("action", choices=["restore", "reset", "summary"], help="Action to perform")
    
    args = parser.parse_args()
    
    session_mgr = SessionManager()
    
    if args.action == "restore":
        print(json.dumps(session_mgr.restore(), indent=2))
    elif args.action == "summary":
        print(session_mgr.summary())
    elif args.action == "reset":
        session_mgr.session = session_mgr._create_default_session()
        session_mgr.save()
        print("✓ Session reset")


if __name__ == "__main__":
    main()
