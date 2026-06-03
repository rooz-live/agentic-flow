#!/usr/bin/env python3
"""
Risk Analytics Integration Script
Handles the integration between the main platform and risk-analytics repository
"""

import asyncio
import json
import logging
import os
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any

import yaml
import requests
from pydantic import BaseModel, Field
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/risk_analytics_integration.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


class RiskAnalyticsConfig(BaseModel):
    """Configuration model for risk analytics integration"""

    repository: Dict[str, Any] = Field(...)
    integration: Dict[str, Any] = Field(...)
    api: Dict[str, Any] = Field(...)
    data_sources: Dict[str, Any] = Field(...)
    risk_calculation: Dict[str, Any] = Field(...)
    monitoring: Dict[str, Any] = Field(...)


class RiskAnalyticsIntegrator:
    """Main integration class for risk analytics"""

    def __init__(self, config_path: str = "configs/risk-analytics-config.yaml"):
        """Initialize the risk analytics integrator

        Args:
            config_path: Path to the configuration file
        """
        self.config_path = Path(config_path)
        self.config = None
        self.session = None
        self.load_config()

    def load_config(self) -> None:
        """Load configuration from YAML file"""
        try:
            with open(self.config_path, 'r') as f:
                config_data = yaml.safe_load(f)
            self.config = RiskAnalyticsConfig(**config_data)
            logger.info("Configuration loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load configuration: {e}")
            raise

    def setup_http_session(self) -> None:
        """Setup HTTP session with retry strategy"""
        self.session = requests.Session()

        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
        )

        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)

        # Set default headers
        self.session.headers.update({
            'User-Agent': 'StarlingX-RiskAnalytics-Integrator/1.0',
            'Content-Type': 'application/json'
        })

        logger.info("HTTP session configured with retry strategy")

    def authenticate_api(self) -> Dict[str, str]:
        """Authenticate with the risk analytics API"""
        if not self.config or not self.session:
            raise RuntimeError("Configuration or session not initialized")

        auth_config = self.config.api['auth']

        try:
            response = self.session.post(
                auth_config['token_url'],
                data={
                    'grant_type': 'client_credentials',
                    'client_id': auth_config['client_id'],
                    'client_secret': auth_config['client_secret'],
                },
                timeout=self.config.api.get('timeout', 30)
            )

            response.raise_for_status()
            token_data = response.json()

            # Update session headers with access token
            self.session.headers.update({
                'Authorization': f"Bearer {token_data['access_token']}"
            })

            logger.info("Successfully authenticated with risk analytics API")
            return token_data

        except Exception as e:
            logger.error(f"Authentication failed: {e}")
            raise

    def test_api_connectivity(self) -> bool:
        """Test connectivity to the risk analytics API"""
        if not self.config or not self.session:
            raise RuntimeError("Configuration or session not initialized")

        try:
            response = self.session.get(
                f"{self.config.api['base_url']}/health",
                timeout=self.config.api.get('timeout', 30)
            )
            response.raise_for_status()

            logger.info("API connectivity test successful")
            return True

        except Exception as e:
            logger.error(f"API connectivity test failed: {e}")
            return False

    def sync_repository(self) -> bool:
        """Sync with the risk analytics repository"""
        repo_config = self.config.repository

        try:
            repo_path = Path(repo_config['path'])

            if not repo_path.exists():
                logger.info(f"Cloning repository to {repo_path}")
                os.system(f"git clone {repo_config['url']} {repo_path}")
            else:
                logger.info(f"Updating existing repository at {repo_path}")
                os.chdir(repo_path)
                os.system("git pull origin main")
                os.chdir(Path.cwd())

            logger.info("Repository sync completed successfully")
            return True

        except Exception as e:
            logger.error(f"Repository sync failed: {e}")
            return False

    def validate_dependencies(self) -> List[str]:
        """Validate that all required dependencies are available"""
        missing_deps = []

        # Check Python packages
        required_packages = [
            'yfinance', 'pandas_ta', 'arch', 'statsmodels', 'riskfolio_lib',
            'numpy', 'pandas', 'scipy', 'matplotlib', 'seaborn'
        ]

        for package in required_packages:
            try:
                __import__(package.replace('-', '_'))
            except ImportError:
                missing_deps.append(package)

        # Check external API keys (without exposing them)
        required_keys = [
            'RISK_ANALYTICS_ALPHA_VANTAGE_KEY',
            'RISK_ANALYTICS_IEX_CLOUD_KEY',
            'RISK_ANALYTICS_POLYGON_KEY'
        ]

        for key in required_keys:
            if not os.getenv(key):
                missing_deps.append(f"API key: {key}")

        return missing_deps

    def run_risk_analysis(self, portfolio_data: Dict[str, Any]) -> Dict[str, Any]:
        """Run risk analysis using the risk analytics repository"""
        if not self.config or not self.session:
            raise RuntimeError("Configuration or session not initialized")

        try:
            # Prepare request payload
            payload = {
                'portfolio': portfolio_data,
                'config': self.config.risk_calculation.dict(),
                'timestamp': datetime.utcnow().isoformat()
            }

            # Make API request
            response = self.session.post(
                f"{self.config.api['base_url']}{self.config.endpoints['portfolio_analysis']}",
                json=payload,
                timeout=self.config.api.get('timeout', 30)
            )

            response.raise_for_status()
            result = response.json()

            logger.info("Risk analysis completed successfully")
            return result

        except Exception as e:
            logger.error(f"Risk analysis failed: {e}")
            raise

    def generate_risk_report(self, analysis_result: Dict[str, Any]) -> str:
        """Generate a formatted risk report"""
        try:
            # Create reports directory if it doesn't exist
            reports_dir = Path("reports/risk_analytics")
            reports_dir.mkdir(parents=True, exist_ok=True)

            # Generate timestamp for report
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            report_file = reports_dir / f"risk_report_{timestamp}.json"

            # Save analysis result to file
            with open(report_file, 'w') as f:
                json.dump(analysis_result, f, indent=2, default=str)

            logger.info(f"Risk report generated: {report_file}")
            return str(report_file)

        except Exception as e:
            logger.error(f"Failed to generate risk report: {e}")
            raise

    def monitor_risk_metrics(self) -> Dict[str, Any]:
        """Monitor risk metrics and generate alerts if needed"""
        try:
            # Get current risk metrics from API
            response = self.session.get(
                f"{self.config.api['base_url']}{self.config.endpoints['risk_assessment']}",
                timeout=self.config.api.get('timeout', 30)
            )

            response.raise_for_status()
            metrics = response.json()

            # Check alert thresholds
            alerts = []
            thresholds = self.config.monitoring['alerts']

            # Check volatility threshold
            if metrics.get('volatility', 0) > thresholds['high_risk']['volatility_threshold']:
                alerts.append({
                    'type': 'high_volatility',
                    'message': f"Portfolio volatility ({metrics['volatility']:.2%}) exceeds threshold ({thresholds['high_risk']['volatility_threshold']:.2%})",
                    'severity': 'high',
                    'timestamp': datetime.utcnow().isoformat()
                })

            # Check drawdown threshold
            if metrics.get('max_drawdown', 0) < thresholds['high_risk']['drawdown_threshold']:
                alerts.append({
                    'type': 'high_drawdown',
                    'message': f"Portfolio drawdown ({metrics['max_drawdown']:.2%}) exceeds threshold ({thresholds['high_risk']['drawdown_threshold']:.2%})",
                    'severity': 'high',
                    'timestamp': datetime.utcnow().isoformat()
                })

            logger.info(f"Risk monitoring completed. Generated {len(alerts)} alerts")
            return {
                'metrics': metrics,
                'alerts': alerts,
                'timestamp': datetime.utcnow().isoformat()
            }

        except Exception as e:
            logger.error(f"Risk monitoring failed: {e}")
            return {
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }

    async def run_integration_cycle(self) -> Dict[str, Any]:
        """Run a complete integration cycle"""
        cycle_results = {
            'start_time': datetime.utcnow().isoformat(),
            'steps': [],
            'success': True,
            'errors': []
        }

        try:
            # Step 1: Setup and authentication
            cycle_results['steps'].append('setup_started')
            self.setup_http_session()
            self.authenticate_api()
            cycle_results['steps'].append('setup_completed')

            # Step 2: Repository sync
            cycle_results['steps'].append('repo_sync_started')
            if not self.sync_repository():
                raise RuntimeError("Repository sync failed")
            cycle_results['steps'].append('repo_sync_completed')

            # Step 3: Dependency validation
            cycle_results['steps'].append('dependency_check_started')
            missing_deps = self.validate_dependencies()
            if missing_deps:
                logger.warning(f"Missing dependencies: {missing_deps}")
            cycle_results['steps'].append('dependency_check_completed')

            # Step 4: API connectivity test
            cycle_results['steps'].append('connectivity_test_started')
            if not self.test_api_connectivity():
                logger.warning("API connectivity test failed, but continuing...")
            cycle_results['steps'].append('connectivity_test_completed')

            # Step 5: Risk monitoring
            cycle_results['steps'].append('risk_monitoring_started')
            monitoring_result = self.monitor_risk_metrics()
            cycle_results['steps'].append('risk_monitoring_completed')

            cycle_results['monitoring_result'] = monitoring_result

        except Exception as e:
            cycle_results['success'] = False
            cycle_results['errors'].append(str(e))
            logger.error(f"Integration cycle failed: {e}")

        finally:
            cycle_results['end_time'] = datetime.utcnow().isoformat()

        return cycle_results

    def run_standalone_integration(self) -> None:
        """Run integration as a standalone script"""
        try:
            logger.info("Starting standalone risk analytics integration")

            # Run integration cycle
            result = asyncio.run(self.run_integration_cycle())

            # Log results
            logger.info(f"Integration cycle completed. Success: {result['success']}")

            if result['errors']:
                logger.error(f"Errors encountered: {result['errors']}")

            # Save integration results
            results_dir = Path("logs")
            results_dir.mkdir(exist_ok=True)

            result_file = results_dir / f"risk_integration_{int(time.time())}.json"
            with open(result_file, 'w') as f:
                json.dump(result, f, indent=2)

            logger.info(f"Integration results saved to {result_file}")

        except KeyboardInterrupt:
            logger.info("Integration interrupted by user")
        except Exception as e:
            logger.error(f"Standalone integration failed: {e}")
            raise


def main():
    """Main entry point for the risk analytics integration script"""
    integrator = RiskAnalyticsIntegrator()

    if len(sys.argv) > 1 and sys.argv[1] == '--cycle':
        # Run integration cycle
        result = asyncio.run(integrator.run_integration_cycle())
        print(json.dumps(result, indent=2))
    else:
        # Run standalone integration
        integrator.run_standalone_integration()


if __name__ == "__main__":
    main()