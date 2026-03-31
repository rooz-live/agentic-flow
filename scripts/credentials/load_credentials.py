#!/usr/bin/env python3
"""
Universal Credential Loader
Supports multiple credential sources with fallback chain:
1. Environment variables (direct or from .env files)
2. 1Password CLI (op command)
3. Passbolt API
4. macOS Keychain Access
"""

import os
import subprocess
import json
import sys
from pathlib import Path
from typing import Optional, Dict, List
from dataclasses import dataclass

# Try to import python-dotenv for .env file support
try:
    from dotenv import load_dotenv
    DOTENV_AVAILABLE = True
except ImportError:
    DOTENV_AVAILABLE = False
    print("Warning: python-dotenv not installed. .env file support disabled.", file=sys.stderr)


@dataclass
class CredentialSource:
    """Represents a credential source with metadata"""
    name: str
    value: str
    source_type: str  # 'env', '1password', 'passbolt', 'keychain'


class CredentialLoader:
    """Unified credential loader with multiple source support"""
    
    def __init__(self, env_file: Optional[Path] = None, verbose: bool = False):
        self.verbose = verbose
        self.env_file = env_file or Path.cwd() / ".env"
        
        # Load .env file if available and exists
        if DOTENV_AVAILABLE and self.env_file.exists():
            load_dotenv(self.env_file)
            if self.verbose:
                print(f"Loaded .env from {self.env_file}", file=sys.stderr)
    
    def load_credential(self, key: str, required: bool = True) -> Optional[CredentialSource]:
        """
        Load credential from available sources with fallback chain
        
        Args:
            key: Credential key name
            required: If True, raise error if not found
            
        Returns:
            CredentialSource if found, None if not found and not required
            
        Raises:
            ValueError: If required=True and credential not found in any source
        """
        # 1. Check environment variables
        if value := os.getenv(key):
            if self.verbose:
                print(f"✓ Loaded {key} from environment variable", file=sys.stderr)
            return CredentialSource(name=key, value=value, source_type="env")
        
        # 2. Try 1Password CLI
        if value := self._load_from_1password(key):
            if self.verbose:
                print(f"✓ Loaded {key} from 1Password", file=sys.stderr)
            return CredentialSource(name=key, value=value, source_type="1password")
        
        # 3. Try Passbolt API
        if value := self._load_from_passbolt(key):
            if self.verbose:
                print(f"✓ Loaded {key} from Passbolt", file=sys.stderr)
            return CredentialSource(name=key, value=value, source_type="passbolt")
        
        # 4. Try system keychain (macOS)
        if value := self._load_from_keychain(key):
            if self.verbose:
                print(f"✓ Loaded {key} from macOS Keychain", file=sys.stderr)
            return CredentialSource(name=key, value=value, source_type="keychain")
        
        # Not found in any source
        if required:
            raise ValueError(
                f"Credential '{key}' not found in any source "
                f"(env, 1Password, Passbolt, keychain)"
            )
        
        if self.verbose:
            print(f"✗ Credential {key} not found in any source", file=sys.stderr)
        return None
    
    def _load_from_1password(self, key: str) -> Optional[str]:
        """Load credential from 1Password CLI"""
        try:
            result = subprocess.run(
                ["op", "read", f"op://Private/{key}"],
                capture_output=True,
                text=True,
                check=True,
                timeout=5
            )
            return result.stdout.strip()
        except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
            return None
    
    def _load_from_passbolt(self, key: str) -> Optional[str]:
        """Load credential from Passbolt API"""
        passbolt_token = os.getenv("PASSBOLT_API_TOKEN")
        passbolt_url = os.getenv("PASSBOLT_BASE_URL")
        
        if not passbolt_token or not passbolt_url:
            return None
        
        try:
            # Import passbolt client if available
            from passbolt import Passbolt
            
            client = Passbolt()
            # Note: This is a simplified example
            # Actual implementation would need resource UUID lookup
            resource = client.get_resource_by_name(key)
            if resource:
                return resource.get('password')
        except (ImportError, Exception):
            return None
        
        return None
    
    def _load_from_keychain(self, key: str) -> Optional[str]:
        """Load credential from macOS Keychain"""
        if sys.platform != "darwin":
            return None
        
        try:
            result = subprocess.run(
                ["security", "find-generic-password", "-w", "-s", key],
                capture_output=True,
                text=True,
                check=True,
                timeout=5
            )
            return result.stdout.strip()
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
            return None
    
    def load_multiple(self, keys: List[str], required: bool = True) -> Dict[str, Optional[CredentialSource]]:
        """Load multiple credentials at once"""
        results = {}
        for key in keys:
            try:
                results[key] = self.load_credential(key, required=required)
            except ValueError as e:
                if required:
                    raise
                results[key] = None
        return results
    
    def export_to_env(self, keys: List[str]) -> None:
        """Load credentials and export to environment variables"""
        for key in keys:
            cred = self.load_credential(key, required=False)
            if cred:
                os.environ[key] = cred.value


def main():
    """CLI interface for credential loader"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Universal Credential Loader")
    parser.add_argument("keys", nargs="+", help="Credential keys to load")
    parser.add_argument("--env-file", type=Path, help="Path to .env file")
    parser.add_argument("--export", action="store_true", help="Export to environment")
    parser.add_argument("--required", action="store_true", help="Fail if any key not found")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    
    args = parser.parse_args()
    
    loader = CredentialLoader(env_file=args.env_file, verbose=args.verbose)
    
    try:
        results = loader.load_multiple(args.keys, required=args.required)
        
        if args.export:
            loader.export_to_env(args.keys)
            print("Credentials exported to environment", file=sys.stderr)
        
        if args.json:
            output = {
                key: {
                    "found": cred is not None,
                    "source": cred.source_type if cred else None
                }
                for key, cred in results.items()
            }
            print(json.dumps(output, indent=2))
        else:
            for key, cred in results.items():
                if cred:
                    print(f"✓ {key}: {cred.source_type}")
                else:
                    print(f"✗ {key}: not found")
        
        # Exit with error if any required key not found
        if args.required and any(cred is None for cred in results.values()):
            sys.exit(1)
    
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
