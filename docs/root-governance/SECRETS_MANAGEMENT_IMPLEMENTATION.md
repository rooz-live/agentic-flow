# Secrets Management Implementation Guide

## Overview

This document provides implementation guidance for secure secrets management to prevent future security incidents like the recent OpenRouter API key exposure. It outlines a comprehensive approach to secrets handling, configuration management, and secure development practices.

## 1. Centralized Configuration Management

### 1.1 Configuration Manager Implementation

```python
# config/manager.py
import os
import re
from typing import Any, Dict, Optional
from enum import Enum

class Environment(Enum):
    DEVELOPMENT = "development"
    TESTING = "testing"
    STAGING = "staging"
    PRODUCTION = "production"

class ConfigManager:
    def __init__(self, env_prefix: str = "APP_"):
        self.env_prefix = env_prefix
        self._config = {}
        self._load_configuration()
    
    def get(self, key: str, default: Any = None, required: bool = False) -> Any:
        env_key = f"{self.env_prefix}{key}"
        value = os.getenv(env_key, default)
        
        if required and value is None:
            raise ValueError(f"Required environment variable {env_key} not set")
        
        return value
    
    def get_database_url(self) -> str:
        return self.get("DATABASE_URL", required=True)
    
    def get_api_key(self, service: str) -> str:
        return self.get(f"{service.upper()}_API_KEY", required=True)
    
    def validate_api_key_format(self, key: str, value: str) -> bool:
        """Validate API key format based on service patterns"""
        patterns = {
            'OPENROUTER': r'^sk-or-v1-[a-zA-Z0-9]{40,}$',
            'OPENAI': r'^sk-[a-zA-Z0-9]{48,}$',
            'STRIPE': r'^sk_(test|live)_[a-zA-Z0-9]{24,}$'
        }
        
        if service := key.split('_')[0]:
            if service in patterns:
                return bool(re.match(patterns[service], value))
        return True  # Default to valid if no specific pattern
    
    def get_validated_api_key(self, service: str) -> str:
        """Get API key with validation"""
        key_name = f"{service.upper()}_API_KEY"
        value = self.get(key_name, required=True)
        
        if not self.validate_api_key_format(key_name, value):
            raise ValueError(f"Invalid format for {key_name}")
        
        return value
```

### 1.2 Environment-Specific Configuration

```python
# config/environments.py
from enum import Enum
from typing import Dict, Any

class Environment(Enum):
    DEVELOPMENT = "development"
    TESTING = "testing"
    STAGING = "staging"
    PRODUCTION = "production"

class EnvironmentConfig:
    """Base class for environment-specific configurations"""
    
    def __init__(self, env: Environment):
        self.env = env
        self._config = self._load_env_config()
    
    def _load_env_config(self) -> Dict[str, Any]:
        """Load environment-specific configuration"""
        configs = {
            Environment.DEVELOPMENT: {
                'debug': True,
                'log_level': 'debug',
                'database_pool_size': 5,
                'api_timeout': 30,
                'retry_attempts': 3
            },
            Environment.TESTING: {
                'debug': True,
                'log_level': 'info',
                'database_pool_size': 10,
                'api_timeout': 15,
                'retry_attempts': 5
            },
            Environment.STAGING: {
                'debug': False,
                'log_level': 'warn',
                'database_pool_size': 20,
                'api_timeout': 10,
                'retry_attempts': 3
            },
            Environment.PRODUCTION: {
                'debug': False,
                'log_level': 'error',
                'database_pool_size': 50,
                'api_timeout': 5,
                'retry_attempts': 3
            }
        }
        return configs.get(self.env, configs[Environment.DEVELOPMENT])
    
    def get(self, key: str, default: Any = None) -> Any:
        return self._config.get(key, default)
```

## 2. Secure Secrets Handling

### 2.1 Secret Manager Implementation

```python
# config/secrets.py
import os
import base64
from cryptography.fernet import Fernet
from typing import Optional

class SecretManager:
    """Secure secret management with encryption"""
    
    def __init__(self, encryption_key: Optional[bytes] = None):
        """Initialize with encryption key from environment or generate one"""
        if encryption_key is None:
            # Try to get from environment
            key_str = os.getenv('SECRET_ENCRYPTION_KEY')
            if key_str:
                encryption_key = base64.urlsafe_b64decode(key_str.encode())
            else:
                # Generate a new key and store it
                encryption_key = Fernet.generate_key()
                print(f"Generated new encryption key: {base64.urlsafe_b64encode(encryption_key).decode()}")
                print("Store this key securely in your secret management system")
        
        self.cipher = Fernet(encryption_key)
    
    def encrypt_secret(self, secret: str) -> str:
        """Encrypt a secret for storage"""
        encrypted = self.cipher.encrypt(secret.encode())
        return base64.urlsafe_b64encode(encrypted).decode()
    
    def decrypt_secret(self, encrypted_secret: str) -> str:
        """Decrypt a secret from storage"""
        try:
            encrypted = base64.urlsafe_b64decode(encrypted_secret.encode())
            decrypted = self.cipher.decrypt(encrypted)
            return decrypted.decode()
        except Exception as e:
            raise ValueError(f"Failed to decrypt secret: {e}")
    
    def get_secret_from_env(self, env_var: str) -> str:
        """Get and decrypt secret from environment variable"""
        encrypted_secret = os.getenv(env_var)
        if not encrypted_secret:
            raise ValueError(f"Secret {env_var} not found in environment")
        
        return self.decrypt_secret(encrypted_secret)
```

### 2.2 Environment Variable Templates

```bash
# .env.template
# Application Configuration
APP_ENV=development|testing|staging|production
APP_DEBUG=true|false
APP_LOG_LEVEL=debug|info|warn|error

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=application
DB_USER=username
DB_PASSWORD=ENCRYPTED_PASSWORD_PLACEHOLDER

# External Service API Keys
OPENROUTER_API_KEY=ENCRYPTED_OPENROUTER_KEY_PLACEHOLDER
OPENAI_API_KEY=ENCRYPTED_OPENAI_KEY_PLACEHOLDER
STRIPE_API_KEY=ENCRYPTED_STRIPE_KEY_PLACEHOLDER

# Internal Service Configuration
REDIS_URL=redis://localhost:6379
CACHE_TTL=3600

# Secret Management
SECRET_ENCRYPTION_KEY=YOUR_ENCRYPTION_KEY_HERE
```

## 3. Development Process Security

### 3.1 Pre-commit Hooks

```bash
#!/bin/sh
# .git/hooks/pre-commit
echo "Running security pre-commit checks..."

# Check for exposed secrets
if git diff --cached --name-only | xargs grep -l "sk-or-v1\|sk-\|sk_test_\|password\|secret\|token" 2>/dev/null; then
    echo "❌ ERROR: Potential secret detected in staged files!"
    echo "Please remove secrets before committing."
    exit 1
fi

# Check for hardcoded environment values
if git diff --cached --name-only | xargs grep -l "os\.getenv.*\".*\"" 2>/dev/null; then
    echo "❌ ERROR: Hardcoded environment values detected!"
    echo "Please use environment variables instead."
    exit 1
fi

echo "✅ Security checks passed"
```

### 3.2 CI/CD Security Pipeline

```yaml
# .github/workflows/security-scan.yml
name: Security Scan

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Scan for secrets
        run: |
          # Install secret scanning tools
          pip install detect-secrets
          
          # Scan for exposed secrets
          detect-secrets --all-history --baseline .secrets_baseline
          
          # Scan for hardcoded credentials
          grep -r "sk-or-v1\|sk-\|password\|secret" --include="*.py" --include="*.js" --include="*.ts" .
          
      - name: Check environment files
        run: |
          # Ensure no .env files with real secrets are committed
          if find . -name ".env" -not -name ".env.template" | xargs grep -l "sk-or-v1\|sk-\|password\|secret"; then
            echo "❌ Found .env files with potential secrets"
            exit 1
          fi
```

## 4. Migration Strategy

### 4.1 Phase 1: Immediate Secure Replacement (0-24 hours)

1. **Replace all hardcoded API keys**
   ```python
   # Before (insecure)
   OPENROUTER_API_KEY = "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"
   
   # After (secure)
   from config.manager import ConfigManager
   config = ConfigManager()
   OPENROUTER_API_KEY = config.get_validated_api_key('OPENROUTER')
   ```

2. **Implement environment variable validation**
   ```python
   # Add validation to all entry points
   from config.manager import ConfigManager
   
   def main():
       config = ConfigManager()
       try:
           api_key = config.get_validated_api_key('OPENROUTER')
           # Use api_key securely
       except ValueError as e:
           print(f"Configuration error: {e}")
           sys.exit(1)
   ```

### 4.2 Phase 2: Systematic Refactoring (1-7 days)

1. **Break down monolithic files**
   - Split `dt_evaluation_dashboard.py` (2,057 lines) into:
     - `data_processor.py` - Data loading and parsing
     - `metrics_calculator.py` - Statistics and summaries
     - `html_generator.py` - Dashboard HTML generation
     - `config_loader.py` - Configuration management
     - `main.py` - Orchestration

2. **Extract environment coupling**
   - Create abstraction layers for environment access
   - Implement dependency injection for configuration
   - Remove direct `os.getenv()` calls from business logic

### 4.3 Phase 3: Advanced Security Implementation (1-4 weeks)

1. **Deploy secrets management system**
   - Implement HashiCorp Vault or similar
   - Create secret rotation procedures
   - Add audit logging for secret access

2. **Enhance development security**
   - Implement comprehensive pre-commit hooks
   - Add automated security scanning to CI/CD
   - Create security training materials

## 5. Monitoring and Alerting

### 5.1 Secret Exposure Detection

```python
# monitoring/secret_monitor.py
import re
import os
from typing import List, Dict

class SecretMonitor:
    """Monitor for potential secret exposures"""
    
    SECRET_PATTERNS = [
        r'sk-or-v1-[a-zA-Z0-9]{40,}',
        r'sk-[a-zA-Z0-9]{48,}',
        r'sk_test_[a-zA-Z0-9]{24,}',
        r'password\s*=\s*["\']?[^"\']+["\']?',
        r'secret\s*=\s*["\']?[^"\']+["\']?',
        r'token\s*=\s*["\']?[^"\']+["\']?'
    ]
    
    def scan_file(self, filepath: str) -> List[Dict[str, int]]:
        """Scan file for potential secrets"""
        issues = []
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                for line_num, line in enumerate(f, 1):
                    for pattern in self.SECRET_PATTERNS:
                        if re.search(pattern, line):
                            issues.append({
                                'line': line_num,
                                'pattern': pattern,
                                'content': line.strip()
                            })
        except Exception as e:
            print(f"Error scanning {filepath}: {e}")
        
        return issues
    
    def scan_repository(self, repo_path: str = '.') -> Dict[str, List[Dict[str, int]]]:
        """Scan entire repository for secrets"""
        results = {}
        for root, dirs, files in os.walk(repo_path):
            # Skip common non-source directories
            dirs[:] = [d for d in dirs if d not in ['.git', 'node_modules', '__pycache__', '.venv']]
            
            for file in files:
                if file.endswith(('.py', '.js', '.ts', '.json', '.env', '.yml', '.yaml')):
                    filepath = os.path.join(root, file)
                    issues = self.scan_file(filepath)
                    if issues:
                        results[filepath] = issues
        
        return results
```

### 5.2 Alerting System

```python
# alerting/security_alerts.py
import smtplib
import json
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Dict

class SecurityAlerts:
    """Security incident alerting system"""
    
    def __init__(self, smtp_config: Dict[str, str]):
        self.smtp_config = smtp_config
    
    def send_secret_exposure_alert(self, findings: List[Dict[str, any]]):
        """Send alert for secret exposure"""
        subject = "🚨 CRITICAL: Secret Exposure Detected"
        
        body = f"""
        A security scan has detected potential secret exposures in the codebase.
        
        Summary:
        - Total files affected: {len(findings)}
        - High-risk findings: {len([f for f in findings if any('API_KEY' in str(f).get('pattern', ''))])}
        
        Immediate action required:
        1. Review and remove all exposed secrets
        2. Rotate all potentially compromised credentials
        3. Update affected services with new credentials
        
        Detailed findings:
        {json.dumps(findings, indent=2)}
        """
        
        msg = MIMEMultipart()
        msg['From'] = self.smtp_config['from']
        msg['To'] = self.smtp_config['to']
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))
        
        server = smtplib.SMTP(self.smtp_config['host'], self.smtp_config['port'])
        server.starttls()
        server.login(self.smtp_config['user'], self.smtp_config['password'])
        server.send_message(msg)
        server.quit()
```

## 6. GitLab Migration Security

### 6.1 Secure GitLab CI/CD Configuration

```yaml
# .gitlab-ci.yml
stages:
  - security-scan
  - test
  - build
  - deploy

variables:
  # Use GitLab's protected variables for secrets
  # Never expose secrets in job definitions
  SECURE_VAR: $PROTECTED_SECRET

security-scan:
  stage: security-scan
  script:
    - |
      # Install security scanning tools
      pip install detect-secrets safety bandit
      
      # Scan for secrets in code
      detect-secrets --all-history --baseline .secrets_baseline
      
      # Run security linters
      bandit -r . -f json -o security-report.json
      
      # Check for known vulnerabilities
      safety check --json --output safety-report.json
  artifacts:
    reports:
      - security-report.json
      - safety-report.json
  only:
    - merge_requests
    - main

test:
  stage: test
  script:
    - echo "Running tests with secure configuration..."
  variables:
    # Test environment variables from GitLab CI/CD variables
    TEST_API_KEY: $TEST_API_KEY
```

### 6.2 GitLab Protected Variables Setup

1. **Set up protected variables in GitLab:**
   - Go to Settings > CI/CD > Variables
   - Add all API keys and secrets as protected variables
   - Mask variables that contain sensitive data
   - Set environment-specific variables (dev/staging/prod)

2. **Configure variable scopes:**
   - Restrict production variables to protected branches only
   - Limit deployment access to authorized users
   - Use variable environments for different deployment targets

## 7. Implementation Checklist

### Phase 1: Immediate Secure Replacement (0-24 hours)
- [ ] Revoke all exposed API keys
- [ ] Generate new secure API keys
- [ ] Replace hardcoded keys in source files
- [ ] Implement environment variable validation
- [ ] Update all service configurations
- [ ] Test functionality with new keys

### Phase 2: Systematic Refactoring (1-7 days)
- [ ] Break down monolithic files into focused modules
- [ ] Extract environment coupling into abstraction layers
- [ ] Implement centralized configuration management
- [ ] Create environment-specific configurations
- [ ] Add comprehensive error handling
- [ ] Update documentation and examples

### Phase 3: Advanced Security Implementation (1-4 weeks)
- [ ] Deploy secrets management system (Vault)
- [ ] Implement secret rotation procedures
- [ ] Set up automated security scanning
- [ ] Configure monitoring and alerting
- [ ] Create security incident response plan
- [ ] Train development team on secure practices
- [ ] Complete GitLab migration with security best practices

## 8. Validation and Testing

### 8.1 Security Testing

```python
# tests/security/test_secrets_management.py
import pytest
import os
from config.manager import ConfigManager
from config.secrets import SecretManager

class TestSecretsManagement:
    """Test secure secrets management implementation"""
    
    def test_config_manager_validation(self):
        """Test configuration manager validation"""
        # Test missing required variable
        with pytest.raises(ValueError, match="Required environment variable"):
            config = ConfigManager()
            config.get('MISSING_VAR', required=True)
    
    def test_secret_manager_encryption(self):
        """Test secret manager encryption/decryption"""
        secret_manager = SecretManager()
        test_secret = "test-secret-value"
        
        # Test encryption
        encrypted = secret_manager.encrypt_secret(test_secret)
        assert encrypted != test_secret
        assert "test-secret-value" not in encrypted
        
        # Test decryption
        decrypted = secret_manager.decrypt_secret(encrypted)
        assert decrypted == test_secret
    
    def test_api_key_format_validation(self):
        """Test API key format validation"""
        config = ConfigManager()
        
        # Test valid OpenRouter key
        valid_key = config.get_validated_api_key('OPENROUTER')
        assert valid_key.startswith('sk-or-v1-')
        
        # Test invalid key format
        with pytest.raises(ValueError, match="Invalid format"):
            config.validate_api_key_format('OPENROUTER_API_KEY', 'invalid-key')
```

### 8.2 Integration Testing

```python
# tests/integration/test_secure_integration.py
import pytest
import os
from unittest.mock import patch

class TestSecureIntegration:
    """Test secure integration with external services"""
    
    @patch.dict(os.environ, {'OPENROUTER_API_KEY': 'test-key-for-integration'})
    def test_secure_api_integration(self):
        """Test that API integration works with environment variables"""
        # Test that the application can securely access API keys
        # from environment variables without hardcoding
        from services.openrouter import OpenRouterService
        
        service = OpenRouterService()
        assert service.api_key == 'test-key-for-integration'
        assert service.is_authenticated() is False  # Test key should be invalid
    
    def test_environment_specific_config(self):
        """Test environment-specific configuration loading"""
        with patch.dict(os.environ, {'APP_ENV': 'testing'}):
            from config.manager import ConfigManager
            config = ConfigManager()
            
            # Should load testing configuration
            assert config.get('debug') is True
            assert config.get('log_level') == 'info'
```

## Conclusion

This implementation guide provides a comprehensive approach to secure secrets management that addresses the immediate security incident while establishing long-term prevention measures. By following these guidelines, the development team can:

1. **Immediately contain the current exposure**
2. **Systematically eliminate hardcoded credentials**
3. **Implement robust secrets management practices**
4. **Establish secure development processes**
5. **Create monitoring and alerting for early detection**

The phased approach allows for immediate risk mitigation while building a comprehensive security foundation for future development.