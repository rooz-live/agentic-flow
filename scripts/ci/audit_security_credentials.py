#!/usr/bin/env python3
"""
Security Credentials Audit Script
Identifies placeholder credentials, missing environment variables, and blockers.

Dynamic pattern spectrum approach with confidence scoring.
Follows stdlib-only pattern from collect_metrics.py.

Version: 2.0 - Dynamic Pattern Spectrums
"""

import os
import sys
import json
import re
import sqlite3
import datetime
from pathlib import Path
from typing import Dict, List, Tuple, Optional

class PatternSpectrum:
    """Represents a range of acceptable patterns with confidence scoring"""
    
    def __init__(self, name: str, patterns: List[Dict]):
        self.name = name
        self.patterns = patterns  # List of {pattern, confidence, version_hint}
    
    def validate(self, value: str) -> Tuple[bool, float, str]:
        """
        Validate value against pattern spectrum.
        Returns: (is_valid, confidence_score, matched_pattern_hint)
        """
        if not value:
            return False, 0.0, "empty"
        
        for spec in self.patterns:
            if re.match(spec['pattern'], value):
                return True, spec['confidence'], spec.get('hint', spec['pattern'])
        
        return False, 0.0, "no_match"


class SecurityAuditor:
    """Audit environment and configuration with dynamic pattern matching"""
    
    def __init__(self, repo_path: str = "."):
        self.repo_path = Path(repo_path).resolve()
        self.findings: List[Dict] = []
        self.blockers: List[Dict] = []
        self.warnings: List[Dict] = []
        
        # Anti-patterns: things that are NEVER valid
        self.anti_patterns = [
            {
                'pattern': r'^(your|my|example|test-|demo-|sample-|placeholder|changeme|todo|xxx|yyy|zzz)',
                'confidence': 1.0,
                'reason': 'Common placeholder prefix'
            },
            {
                'pattern': r'(1234567|0000000|fake|dummy|mock|invalid)',
                'confidence': 0.95,
                'reason': 'Placeholder sequence'
            },
            {
                'pattern': r'^[a-z]{3,8}$',  # Short lowercase only (too simple)
                'confidence': 0.7,
                'reason': 'Suspiciously simple'
            },
            {
                'pattern': r'^\s+$',
                'confidence': 1.0,
                'reason': 'Whitespace only'
            },
            {
                'pattern': r'^(test|dev|local)$',
                'confidence': 0.9,
                'reason': 'Environment marker used as value'
            }
        ]
        
        # Pattern spectrums for each credential type
        self.credential_spectrums = {
            # Discord - multiple format versions over time
            'DISCORD_APPLICATION_ID': PatternSpectrum('Discord Application ID', [
                {
                    'pattern': r'^\d{18}$',
                    'confidence': 1.0,
                    'hint': 'Standard 18-digit snowflake (current)'
                },
                {
                    'pattern': r'^\d{17}$',
                    'confidence': 0.95,
                    'hint': 'Legacy 17-digit snowflake'
                },
                {
                    'pattern': r'^\d{19,20}$',
                    'confidence': 0.85,
                    'hint': 'Extended snowflake (future-proof)'
                }
            ]),
            
            'DISCORD_PUBLIC_KEY': PatternSpectrum('Discord Public Key', [
                {
                    'pattern': r'^[a-f0-9]{64}$',
                    'confidence': 1.0,
                    'hint': 'Hex-encoded 32-byte key'
                },
                {
                    'pattern': r'^[A-Fa-f0-9]{64}$',
                    'confidence': 0.95,
                    'hint': 'Mixed-case hex (some APIs)'
                }
            ]),
            
            'DISCORD_BOT_TOKEN': PatternSpectrum('Discord Bot Token', [
                {
                    'pattern': r'^[A-Za-z0-9_-]{59}$',
                    'confidence': 1.0,
                    'hint': 'Modern bot token format (59 chars)'
                },
                {
                    'pattern': r'^[A-Za-z0-9_-]{70,72}$',
                    'confidence': 0.95,
                    'hint': 'Extended token format (70-72 chars)'
                },
                {
                    'pattern': r'^[MN][A-Za-z0-9_-]{23}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27}$',
                    'confidence': 0.98,
                    'hint': 'Structured token (prefix.timestamp.signature)'
                }
            ]),
            
            # Cloudflare - different formats across services
            'CLOUDFLARE_ACCOUNT_ID': PatternSpectrum('Cloudflare Account ID', [
                {
                    'pattern': r'^[a-f0-9]{32}$',
                    'confidence': 1.0,
                    'hint': 'Standard 32-char hex ID'
                },
                {
                    'pattern': r'^[A-Fa-f0-9]{32}$',
                    'confidence': 0.95,
                    'hint': 'Mixed-case hex'
                }
            ]),
            
            'CLOUDFLARE_API_TOKEN': PatternSpectrum('Cloudflare API Token', [
                {
                    'pattern': r'^[A-Za-z0-9_-]{40}$',
                    'confidence': 1.0,
                    'hint': 'API token v1 (40 chars)'
                },
                {
                    'pattern': r'^[A-Za-z0-9_-]{43}$',
                    'confidence': 0.95,
                    'hint': 'API token v2 (43 chars)'
                },
                {
                    'pattern': r'^[A-Za-z0-9_-]{36,50}$',
                    'confidence': 0.85,
                    'hint': 'Variable-length token (future formats)'
                }
            ]),
            
            'CLOUDFLARE_ZONE_ID': PatternSpectrum('Cloudflare Zone ID', [
                {
                    'pattern': r'^[a-f0-9]{32}$',
                    'confidence': 1.0,
                    'hint': 'Standard zone ID'
                }
            ]),
            
            # Anthropic - evolving format
            'ANTHROPIC_API_KEY': PatternSpectrum('Anthropic API Key', [
                {
                    'pattern': r'^sk-ant-api03-[A-Za-z0-9_-]{95}$',
                    'confidence': 1.0,
                    'hint': 'API v3 key format (current)'
                },
                {
                    'pattern': r'^sk-ant-[A-Za-z0-9_-]{95,105}$',
                    'confidence': 0.9,
                    'hint': 'Generic Anthropic key (version-agnostic)'
                },
                {
                    'pattern': r'^sk-ant-api\d{2}-[A-Za-z0-9_-]{90,110}$',
                    'confidence': 0.85,
                    'hint': 'Future API version key'
                }
            ]),
            
            # AWS - multiple key generations
            'AWS_ACCESS_KEY_ID': PatternSpectrum('AWS Access Key ID', [
                {
                    'pattern': r'^AKIA[A-Z0-9]{16}$',
                    'confidence': 1.0,
                    'hint': 'Standard IAM user key'
                },
                {
                    'pattern': r'^ASIA[A-Z0-9]{16}$',
                    'confidence': 1.0,
                    'hint': 'Temporary security credentials (STS)'
                },
                {
                    'pattern': r'^AIDA[A-Z0-9]{16}$',
                    'confidence': 0.95,
                    'hint': 'IAM user identifier (some contexts)'
                },
                {
                    'pattern': r'^AROA[A-Z0-9]{16}$',
                    'confidence': 0.9,
                    'hint': 'Role identifier'
                }
            ]),
            
            'AWS_SECRET_ACCESS_KEY': PatternSpectrum('AWS Secret Access Key', [
                {
                    'pattern': r'^[A-Za-z0-9/+=]{40}$',
                    'confidence': 1.0,
                    'hint': 'Standard 40-char secret'
                },
                {
                    'pattern': r'^[A-Za-z0-9/+=]{38,42}$',
                    'confidence': 0.85,
                    'hint': 'Variable-length secret (some services)'
                }
            ]),
            
            # Hivelocity - API evolution
            'HIVELOCITY_API_KEY': PatternSpectrum('Hivelocity API Key', [
                {
                    'pattern': r'^[A-Za-z0-9]{32}$',
                    'confidence': 0.95,
                    'hint': 'Standard 32-char alphanumeric'
                },
                {
                    'pattern': r'^hv_[A-Za-z0-9_-]{28,40}$',
                    'confidence': 1.0,
                    'hint': 'Prefixed format (if implemented)'
                },
                {
                    'pattern': r'^[A-Za-z0-9_-]{32,64}$',
                    'confidence': 0.8,
                    'hint': 'Generic long token'
                }
            ]),
            
            # Financial data providers - vary widely
            'DATA_EARNINGS_API_KEY': PatternSpectrum('Earnings Data API Key', [
                {
                    'pattern': r'^[A-Za-z0-9]{16}$',
                    'confidence': 0.9,
                    'hint': 'FMP/AlphaVantage style (16 chars)'
                },
                {
                    'pattern': r'^[A-Za-z0-9]{32}$',
                    'confidence': 0.95,
                    'hint': 'Polygon.io style (32 chars)'
                },
                {
                    'pattern': r'^[A-Za-z0-9_-]{20,64}$',
                    'confidence': 0.75,
                    'hint': 'Generic provider key'
                }
            ]),
            
            'DATA_ANALYST_API_KEY': PatternSpectrum('Analyst Data API Key', [
                {
                    'pattern': r'^[a-z0-9]{40}$',
                    'confidence': 0.9,
                    'hint': 'Finnhub style (lowercase 40)'
                },
                {
                    'pattern': r'^[A-Za-z0-9]{16,32}$',
                    'confidence': 0.85,
                    'hint': 'TipRanks/generic style'
                },
                {
                    'pattern': r'^[A-Za-z0-9_-]{20,64}$',
                    'confidence': 0.75,
                    'hint': 'Generic provider key'
                }
            ]),
            
            'DATA_MARKET_API_KEY': PatternSpectrum('Market Data API Key', [
                {
                    'pattern': r'^[A-Z0-9]{16}$',
                    'confidence': 0.9,
                    'hint': 'AlphaVantage style (uppercase)'
                },
                {
                    'pattern': r'^[A-Za-z0-9_]{32}$',
                    'confidence': 0.95,
                    'hint': 'Polygon.io style'
                },
                {
                    'pattern': r'^[A-Za-z0-9_-]{20,64}$',
                    'confidence': 0.75,
                    'hint': 'Generic provider key'
                }
            ]),
            
            # Stripe - versioned format
            'STRIPE_SECRET_KEY': PatternSpectrum('Stripe Secret Key', [
                {
                    'pattern': r'^sk_test_[A-Za-z0-9]{24}$',
                    'confidence': 1.0,
                    'hint': 'Test mode secret key (24 chars)'
                },
                {
                    'pattern': r'^sk_live_[A-Za-z0-9]{24}$',
                    'confidence': 1.0,
                    'hint': 'Live mode secret key (24 chars)'
                },
                {
                    'pattern': r'^sk_test_[A-Za-z0-9]{99}$',
                    'confidence': 0.95,
                    'hint': 'Test mode restricted key (99 chars)'
                },
                {
                    'pattern': r'^sk_live_[A-Za-z0-9]{99}$',
                    'confidence': 0.95,
                    'hint': 'Live mode restricted key (99 chars)'
                }
            ]),
            
            'STRIPE_WEBHOOK_SECRET': PatternSpectrum('Stripe Webhook Secret', [
                {
                    'pattern': r'^whsec_[A-Za-z0-9]{32}$',
                    'confidence': 1.0,
                    'hint': 'Standard webhook secret (32 chars)'
                },
                {
                    'pattern': r'^whsec_[A-Za-z0-9]{40,64}$',
                    'confidence': 0.9,
                    'hint': 'Extended webhook secret'
                }
            ]),
            
            'STRIPE_PUBLIC_KEY': PatternSpectrum('Stripe Publishable Key', [
                {
                    'pattern': r'^pk_test_[A-Za-z0-9]{24}$',
                    'confidence': 1.0,
                    'hint': 'Test mode publishable'
                },
                {
                    'pattern': r'^pk_live_[A-Za-z0-9]{24}$',
                    'confidence': 1.0,
                    'hint': 'Live mode publishable'
                }
            ]),
        }
        
        # Credential requirements and impact
        self.credential_requirements = {
            'DISCORD_APPLICATION_ID': {
                'required': True,
                'blocker_impact': 'CRITICAL',
                'blocks': ['DISCORD-1', 'DISCORD-2', 'EARNINGS-1 Discord integration', 'ALERTS-1']
            },
            'DISCORD_PUBLIC_KEY': {
                'required': True,
                'blocker_impact': 'CRITICAL',
                'blocks': ['DISCORD-1', 'DISCORD-2']
            },
            'DISCORD_BOT_TOKEN': {
                'required': True,
                'blocker_impact': 'CRITICAL',
                'blocks': ['DISCORD-1', 'DISCORD-2']
            },
            'DISCORD_GUILD_ID': {
                'required': False,
                'blocker_impact': 'LOW',
                'blocks': []
            },
            'CLOUDFLARE_ACCOUNT_ID': {
                'required': True,
                'blocker_impact': 'CRITICAL',
                'blocks': ['DISCORD-1', 'DISCORD-2']
            },
            'CLOUDFLARE_API_TOKEN': {
                'required': True,
                'blocker_impact': 'CRITICAL',
                'blocks': ['DISCORD-1', 'DISCORD-2']
            },
            'CLOUDFLARE_ZONE_ID': {
                'required': False,
                'blocker_impact': 'LOW',
                'blocks': []
            },
            'ANTHROPIC_API_KEY': {
                'required': False,
                'blocker_impact': 'MEDIUM',
                'blocks': ['Federation Runtime', 'Agentic QE with Claude']
            },
            'AWS_ACCESS_KEY_ID': {
                'required': False,
                'blocker_impact': 'LOW',
                'blocks': []
            },
            'AWS_SECRET_ACCESS_KEY': {
                'required': False,
                'blocker_impact': 'LOW',
                'blocks': []
            },
            'HIVELOCITY_API_KEY': {
                'required': False,
                'blocker_impact': 'LOW',
                'blocks': ['Device management automation']
            },
            'DATA_EARNINGS_API_KEY': {
                'required': False,
                'blocker_impact': 'HIGH',
                'blocks': ['EARNINGS-1', 'EARNINGS-2']
            },
            'DATA_ANALYST_API_KEY': {
                'required': False,
                'blocker_impact': 'HIGH',
                'blocks': ['SCANNER-2']
            },
            'DATA_MARKET_API_KEY': {
                'required': False,
                'blocker_impact': 'HIGH',
                'blocks': ['SCANNER-1', 'PORTFOLIO-1']
            },
            'STRIPE_SECRET_KEY': {
                'required': False,
                'blocker_impact': 'MEDIUM',
                'blocks': ['Payment integration']
            },
            'STRIPE_WEBHOOK_SECRET': {
                'required': False,
                'blocker_impact': 'MEDIUM',
                'blocks': ['Stripe webhook handler']
            },
            'STRIPE_PUBLIC_KEY': {
                'required': False,
                'blocker_impact': 'LOW',
                'blocks': []
            },
        }
    
    def check_anti_patterns(self, value: str) -> Tuple[bool, float, str]:
        """Check if value matches any anti-patterns (placeholders)"""
        if not value:
            return True, 1.0, "Empty value"
        
        value_lower = value.lower()
        
        for anti in self.anti_patterns:
            if re.search(anti['pattern'], value_lower, re.IGNORECASE):
                return True, anti['confidence'], anti['reason']
        
        return False, 0.0, ""
    
    def validate_credential(self, key: str, value: Optional[str]) -> Dict:
        """Validate credential with dynamic pattern spectrum matching"""
        
        requirements = self.credential_requirements.get(key, {
            'required': False,
            'blocker_impact': 'LOW',
            'blocks': []
        })
        
        result = {
            'key': key,
            'present': value is not None and len(value) > 0,
            'valid': False,
            'confidence': 0.0,
            'is_placeholder': False,
            'required': requirements['required'],
            'blocker_impact': requirements['blocker_impact'],
            'blocks': requirements['blocks'],
            'message': '',
            'matched_pattern': None
        }
        
        # Check if missing
        if not value:
            if requirements['required']:
                result['message'] = f"❌ MISSING (REQUIRED) - Blocks: {', '.join(requirements['blocks'])}"
                self.blockers.append({
                    'credential': key,
                    'impact': requirements['blocker_impact'],
                    'blocks': requirements['blocks'],
                    'reason': 'Missing required credential',
                    'confidence': 1.0
                })
            else:
                result['message'] = "⚪ Not set (optional)"
            return result
        
        # Check anti-patterns first
        is_anti, anti_conf, anti_reason = self.check_anti_patterns(value)
        result['is_placeholder'] = is_anti
        
        if is_anti:
            result['message'] = f"⚠️  PLACEHOLDER ({int(anti_conf * 100)}% confidence): {anti_reason}"
            if requirements['required']:
                self.blockers.append({
                    'credential': key,
                    'impact': requirements['blocker_impact'],
                    'blocks': requirements['blocks'],
                    'reason': f'Placeholder detected: {anti_reason}',
                    'confidence': anti_conf
                })
            else:
                self.warnings.append({
                    'credential': key,
                    'impact': requirements['blocker_impact'],
                    'reason': f'Placeholder detected: {anti_reason}',
                    'confidence': anti_conf
                })
            return result
        
        # Check against pattern spectrum
        if key in self.credential_spectrums:
            spectrum = self.credential_spectrums[key]
            is_valid, confidence, hint = spectrum.validate(value)
            
            result['valid'] = is_valid
            result['confidence'] = confidence
            result['matched_pattern'] = hint
            
            if is_valid:
                conf_pct = int(confidence * 100)
                if confidence >= 0.95:
                    result['message'] = f"✅ Valid ({conf_pct}% confidence): {hint}"
                elif confidence >= 0.80:
                    result['message'] = f"✅ Likely valid ({conf_pct}% confidence): {hint}"
                else:
                    result['message'] = f"⚠️  Possibly valid ({conf_pct}% confidence): {hint}"
            else:
                result['message'] = f"❌ Invalid format - no pattern match"
                if requirements['required']:
                    self.blockers.append({
                        'credential': key,
                        'impact': requirements['blocker_impact'],
                        'blocks': requirements['blocks'],
                        'reason': 'Invalid credential format (no pattern match)',
                        'confidence': 0.9
                    })
        else:
            # No spectrum defined - basic validation
            result['valid'] = True
            result['confidence'] = 0.5
            result['message'] = "⚪ Present (no validation pattern defined)"
        
        return result
    
    def audit_environment(self) -> Dict:
        """Audit all credentials in current environment"""
        print("\n🔍 Auditing Environment Variables...")
        print("=" * 80)
        
        results = {}
        for key in self.credential_requirements.keys():
            value = os.environ.get(key)
            result = self.validate_credential(key, value)
            results[key] = result
            
            print(f"{result['message'][:3]} {key:30s} {result['message'][4:]}")
            if result['confidence'] > 0:
                print(f"    Confidence: {int(result['confidence'] * 100)}%")
        
        return results
    
    def audit_env_files(self) -> Dict:
        """Audit .env files for placeholders and security issues"""
        print("\n\n🔍 Auditing .env Files...")
        print("=" * 80)
        
        env_files = [
            'config/.env.production',
            'config/.env.development',
            '.env',
            '.env.local',
        ]
        
        findings = {}
        
        for env_file in env_files:
            file_path = self.repo_path / env_file
            
            if not file_path.exists():
                print(f"⚪ {env_file}: Not found")
                continue
            
            print(f"\n📄 {env_file}:")
            
            with open(file_path, 'r') as f:
                lines = f.readlines()
            
            file_findings = []
            for line_num, line in enumerate(lines, 1):
                line = line.strip()
                
                if not line or line.startswith('#'):
                    continue
                
                if '=' not in line:
                    continue
                
                key, value = line.split('=', 1)
                key = key.strip()
                value = value.strip().strip('"\'')
                
                if key in self.credential_requirements:
                    result = self.validate_credential(key, value if value else None)
                    file_findings.append({'line': line_num, 'key': key, 'result': result})
                    
                    print(f"  {result['message'][:3]} L{line_num:3d}: {key}")
                    if result['confidence'] > 0:
                        print(f"       Confidence: {int(result['confidence'] * 100)}%")
            
            findings[env_file] = file_findings
        
        return findings
    
    def check_git_ignored(self) -> Dict:
        """Check if sensitive files are properly gitignored"""
        print("\n\n🔍 Checking .gitignore Configuration...")
        print("=" * 80)
        
        gitignore_path = self.repo_path / '.gitignore'
        
        if not gitignore_path.exists():
            print("❌ .gitignore not found!")
            return {'status': 'error', 'message': 'No .gitignore file'}
        
        with open(gitignore_path, 'r') as f:
            gitignore_content = f.read()
        
        sensitive_patterns = [
            '.env', '.env.local', '.env.production', '.env.development',
            '*.pem', '*.key', '*_key', '*_secret', 
            'credentials', 'secrets', 'config/.env*'
        ]
        
        results = {}
        for pattern in sensitive_patterns:
            is_ignored = pattern in gitignore_content or pattern.replace('*', '') in gitignore_content
            results[pattern] = is_ignored
            
            status = "✅" if is_ignored else "⚠️"
            print(f"{status} {pattern:30s}")
        
        return results
    
    def generate_blockers_summary(self) -> Dict:
        """Generate summary of blockers organized by impact and confidence"""
        print("\n\n📊 Blockers Summary")
        print("=" * 80)
        
        # Sort by impact then confidence
        impact_priority = {'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3}
        sorted_blockers = sorted(
            self.blockers,
            key=lambda b: (impact_priority.get(b['impact'], 99), -b.get('confidence', 0.5))
        )
        
        blockers_by_impact = {
            'CRITICAL': [], 'HIGH': [], 'MEDIUM': [], 'LOW': []
        }
        
        for blocker in sorted_blockers:
            blockers_by_impact[blocker['impact']].append(blocker)
        
        summary = {
            'total_blockers': len(self.blockers),
            'by_impact': {},
            'affected_roadmap_items': set()
        }
        
        for impact in ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']:
            blockers = blockers_by_impact[impact]
            summary['by_impact'][impact] = len(blockers)
            
            if blockers:
                print(f"\n{impact} Priority ({len(blockers)} blockers):")
                for blocker in blockers:
                    conf = blocker.get('confidence', 0.5)
                    print(f"  🔴 {blocker['credential']} ({int(conf * 100)}% confidence)")
                    print(f"     {blocker['reason']}")
                    if blocker['blocks']:
                        print(f"     Blocks: {', '.join(blocker['blocks'])}")
                        summary['affected_roadmap_items'].update(blocker['blocks'])
        
        summary['affected_roadmap_items'] = sorted(list(summary['affected_roadmap_items']))
        return summary
    
    def export_audit_report(self, output_file: str = 'logs/security_audit.json'):
        """Export audit findings to JSON"""
        output_path = self.repo_path / output_file
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        report = {
            'audit_timestamp': datetime.datetime.utcnow().isoformat() + 'Z',
            'audit_version': '2.0_dynamic_spectrum',
            'total_credentials_checked': len(self.credential_requirements),
            'blockers': self.blockers,
            'warnings': self.warnings,
            'blockers_summary': {
                'total': len(self.blockers),
                'critical': sum(1 for b in self.blockers if b['impact'] == 'CRITICAL'),
                'high': sum(1 for b in self.blockers if b['impact'] == 'HIGH'),
                'medium': sum(1 for b in self.blockers if b['impact'] == 'MEDIUM'),
                'low': sum(1 for b in self.blockers if b['impact'] == 'LOW'),
            },
            'affected_roadmap_items': sorted(list(set(
                item for blocker in self.blockers for item in blocker['blocks']
            )))
        }
        
        with open(output_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"\n✅ Audit report: {output_path}")
        return report
    
    def store_to_risk_db(self):
        """Store audit findings in risk analytics database"""
        db_path = self.repo_path / 'metrics' / 'risk_analytics_baseline.db'
        
        if not db_path.exists():
            print(f"\n⚠️  Risk DB not found: {db_path}")
            return
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS risk_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                occurred_at TEXT NOT NULL,
                category TEXT NOT NULL,
                severity TEXT NOT NULL,
                detail TEXT NOT NULL,
                meta TEXT DEFAULT '{}'
            )
        """)
        
        for blocker in self.blockers:
            cursor.execute("""
                INSERT INTO risk_events (occurred_at, category, severity, detail, meta)
                VALUES (?, ?, ?, ?, ?)
            """, (
                datetime.datetime.utcnow().isoformat() + 'Z',
                'security',
                blocker['impact'].lower(),
                f"Credential blocker: {blocker['credential']} - {blocker['reason']}",
                json.dumps({
                    'credential': blocker['credential'],
                    'blocks': blocker['blocks'],
                    'confidence': blocker.get('confidence', 0.5)
                })
            ))
        
        conn.commit()
        conn.close()
        print(f"✅ Stored {len(self.blockers)} risk events")


def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Security audit with dynamic pattern spectrum validation'
    )
    parser.add_argument('--repo-path', default='.', help='Repository path')
    parser.add_argument('--output', default='logs/security_audit.json', help='Output file')
    parser.add_argument('--store-to-db', action='store_true', help='Store to risk DB')
    parser.add_argument('--check-env-only', action='store_true', help='Only check environment')
    
    args = parser.parse_args()
    
    print("🔐 Security Credentials Audit v2.0 (Dynamic Pattern Spectrum)")
    print("=" * 80)
    print(f"Repository: {Path(args.repo_path).resolve()}")
    
    try:
        auditor = SecurityAuditor(args.repo_path)
        
        # Run audits
        env_results = auditor.audit_environment()
        
        if not args.check_env_only:
            env_files_results = auditor.audit_env_files()
            gitignore_results = auditor.check_git_ignored()
        
        blockers_summary = auditor.generate_blockers_summary()
        
        # Export report
        report = auditor.export_audit_report(args.output)
        
        # Store to database if requested
        if args.store_to_db:
            auditor.store_to_risk_db()
        
        # Print summary
        print("\n" + "=" * 80)
        print("📋 AUDIT SUMMARY")
        print("=" * 80)
        print(f"Credentials Checked: {len(auditor.credential_requirements)}")
        print(f"Blockers: {len(auditor.blockers)} (Critical: {sum(1 for b in auditor.blockers if b['impact'] == 'CRITICAL')})")
        print(f"Warnings: {len(auditor.warnings)}")
        
        if report['affected_roadmap_items']:
            print(f"\n🚫 Blocked Roadmap Items ({len(report['affected_roadmap_items'])}):")
            for item in report['affected_roadmap_items'][:10]:
                print(f"   - {item}")
        
        # Exit code
        critical = sum(1 for b in auditor.blockers if b['impact'] == 'CRITICAL')
        return 1 if critical > 0 else 0
    
    except Exception as e:
        print(f"\n❌ Audit failed: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == '__main__':
    sys.exit(main())
