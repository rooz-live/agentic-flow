#!/usr/bin/env python3
"""
VibeThinker Model Integration Script
Validates model integration in a production context
"""

import os
import sys
import json
import argparse
import logging
import requests
import time
from typing import Dict, Any, Optional, List
from pathlib import Path

class VibeThinkerIntegration:
    def __init__(self, model_endpoint: str = None, api_key: str = None):
        self.model_endpoint = model_endpoint or os.getenv('VIBE_THINKER_ENDPOINT', 'http://localhost:8080')
        self.api_key = api_key or os.getenv('VIBE_THINKER_API_KEY')
        self.script_dir = Path(__file__).parent
        self.project_root = self.script_dir.parent.parent.parent
        
        # Setup logging
        self.setup_logging()
        
    def setup_logging(self):
        """Setup logging for VibeThinker integration"""
        log_dir = self.project_root / 'logs'
        log_dir.mkdir(exist_ok=True)
        
        log_file = log_dir / 'vibe_thinker_integration.log'
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler(sys.stdout)
            ]
        )
        
        self.logger = logging.getLogger('VibeThinkerIntegration')
        self.logger.info("VibeThinker Integration initialized")
    
    def validate_model_availability(self) -> bool:
        """Check if VibeThinker model is available and responsive"""
        try:
            self.logger.info("Validating VibeThinker model availability...")
            
            # Health check endpoint
            health_url = f"{self.model_endpoint}/health"
            response = requests.get(health_url, timeout=10)
            
            if response.status_code == 200:
                health_data = response.json()
                self.logger.info(f"Model health check passed: {health_data}")
                return True
            else:
                self.logger.error(f"Health check failed with status: {response.status_code}")
                return False
                
        except requests.exceptions.RequestException as e:
            self.logger.error(f"Model availability check failed: {e}")
            return False
        except Exception as e:
            self.logger.error(f"Unexpected error during availability check: {e}")
            return False
    
    def test_model_integration(self, test_input: str = "Test integration request") -> Dict[str, Any]:
        """Test model integration with sample input"""
        try:
            self.logger.info("Testing model integration...")
            
            # Prepare test request
            payload = {
                "input": test_input,
                "context": "production_integration_test",
                "parameters": {
                    "temperature": 0.7,
                    "max_tokens": 100
                }
            }
            
            headers = {}
            if self.api_key:
                headers['Authorization'] = f"Bearer {self.api_key}"
            
            # Make request to model
            response = requests.post(
                f"{self.model_endpoint}/generate",
                json=payload,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                self.logger.info("Model integration test passed")
                return {
                    "success": True,
                    "response": result,
                    "latency_ms": result.get("latency_ms", 0)
                }
            else:
                self.logger.error(f"Model integration test failed: {response.status_code}")
                return {
                    "success": False,
                    "error": response.text,
                    "status_code": response.status_code
                }
                
        except Exception as e:
            self.logger.error(f"Model integration test exception: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def validate_production_readiness(self) -> Dict[str, Any]:
        """Validate production readiness of VibeThinker integration"""
        self.logger.info("Validating production readiness...")
        
        readiness_checks = {
            "model_availability": self.validate_model_availability(),
            "integration_test": self.test_model_integration(),
            "configuration_check": self._validate_configuration(),
            "performance_check": self._validate_performance(),
            "security_check": self._validate_security()
        }
        
        # Calculate overall readiness score
        passed_checks = sum(1 for check in readiness_checks.values() 
                          if isinstance(check, bool) and check)
        total_checks = len([k for k, v in readiness_checks.items() 
                          if isinstance(v, bool)])
        
        readiness_score = (passed_checks / total_checks) * 100 if total_checks > 0 else 0
        
        readiness_result = {
            "readiness_score": readiness_score,
            "ready_for_production": readiness_score >= 80,
            "checks": readiness_checks,
            "timestamp": time.time()
        }
        
        self.logger.info(f"Production readiness score: {readiness_score}%")
        return readiness_result
    
    def _validate_configuration(self) -> bool:
        """Validate configuration settings"""
        required_vars = ['VIBE_THINKER_ENDPOINT']
        
        for var in required_vars:
            if not os.getenv(var):
                self.logger.error(f"Missing required environment variable: {var}")
                return False
        
        return True
    
    def _validate_performance(self) -> bool:
        """Validate performance characteristics"""
        try:
            # Test response time
            start_time = time.time()
            result = self.test_model_integration("Performance test")
            end_time = time.time()
            
            response_time = (end_time - start_time) * 1000  # Convert to ms
            
            # Check if response time is acceptable (< 5 seconds)
            if response_time < 5000:
                self.logger.info(f"Performance check passed: {response_time:.2f}ms")
                return True
            else:
                self.logger.error(f"Performance check failed: {response_time:.2f}ms > 5000ms")
                return False
                
        except Exception as e:
            self.logger.error(f"Performance validation failed: {e}")
            return False
    
    def _validate_security(self) -> bool:
        """Validate security configuration"""
        try:
            # Check for API key in production
            if os.getenv('ENVIRONMENT') == 'production' and not self.api_key:
                self.logger.error("API key required for production environment")
                return False
            
            # Check for HTTPS endpoint in production
            if os.getenv('ENVIRONMENT') == 'production':
                if not self.model_endpoint.startswith('https://'):
                    self.logger.error("HTTPS required for production endpoint")
                    return False
            
            return True
            
        except Exception as e:
            self.logger.error(f"Security validation failed: {e}")
            return False
    
    def run_integration_suite(self) -> Dict[str, Any]:
        """Run complete integration test suite"""
        self.logger.info("Running VibeThinker integration suite...")
        
        suite_results = {
            "availability": self.validate_model_availability(),
            "integration": self.test_model_integration(),
            "production_readiness": self.validate_production_readiness()
        }
        
        # Overall success determination
        overall_success = (
            suite_results["availability"] and
            suite_results["integration"]["success"] and
            suite_results["production_readiness"]["ready_for_production"]
        )
        
        suite_results["overall_success"] = overall_success
        suite_results["timestamp"] = time.time()
        
        self.logger.info(f"Integration suite completed. Success: {overall_success}")
        return suite_results

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='VibeThinker Model Integration Validation',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument('--endpoint', 
                       help='VibeThinker model endpoint URL')
    parser.add_argument('--api-key', 
                       help='API key for authentication')
    parser.add_argument('--test-input', 
                       default='Test integration request',
                       help='Test input for integration test')
    parser.add_argument('--json', action='store_true',
                       help='Output results in JSON format')
    parser.add_argument('--verbose', action='store_true',
                       help='Enable verbose logging')
    
    args = parser.parse_args()
    
    # Create integration instance
    integration = VibeThinkerIntegration(
        model_endpoint=args.endpoint,
        api_key=args.api_key
    )
    
    # Run integration suite
    results = integration.run_integration_suite()
    
    if args.json:
        print(json.dumps(results, indent=2))
    else:
        print("VibeThinker Integration Results:")
        print(f"Availability: {'✓' if results['availability'] else '✗'}")
        print(f"Integration Test: {'✓' if results['integration']['success'] else '✗'}")
        print(f"Production Ready: {'✓' if results['production_readiness']['ready_for_production'] else '✗'}")
        print(f"Overall Success: {'✓' if results['overall_success'] else '✗'}")
    
    sys.exit(0 if results['overall_success'] else 1)

if __name__ == '__main__':
    main()