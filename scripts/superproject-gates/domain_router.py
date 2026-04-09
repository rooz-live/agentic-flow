#!/usr/bin/env python3
"""
Domain Router for stx-aio-0
Setup failover and monitor traffic configuration
"""

import os
import sys
import json
import argparse
import logging
import subprocess
import yaml
from typing import Dict, Any, List, Optional
from pathlib import Path

class DomainRouter:
    def __init__(self, config_file: str = None):
        self.script_dir = Path(__file__).parent
        self.project_root = self.script_dir.parent.parent
        self.config_file = config_file or (self.script_dir / 'config' / 'domain_router.yaml')
        
        # Setup logging
        self.setup_logging()
        
        # Load configuration
        self.config = self.load_config()
        
    def setup_logging(self):
        """Setup logging for domain router"""
        log_dir = self.project_root / 'logs'
        log_dir.mkdir(exist_ok=True)
        
        log_file = log_dir / 'domain_router.log'
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler(sys.stdout)
            ]
        )
        
        self.logger = logging.getLogger('DomainRouter')
        self.logger.info("Domain Router initialized")
    
    def load_config(self) -> Dict[str, Any]:
        """Load domain routing configuration"""
        try:
            if self.config_file.exists():
                with open(self.config_file, 'r') as f:
                    if self.config_file.suffix == '.yaml':
                        return yaml.safe_load(f)
                    else:
                        return json.load(f)
            else:
                # Default configuration
                return self.get_default_config()
        except Exception as e:
            self.logger.error(f"Failed to load config: {e}")
            return self.get_default_config()
    
    def get_default_config(self) -> Dict[str, Any]:
        """Get default domain routing configuration"""
        return {
            "domain": "stx-aio-0",
            "primary_backend": {
                "host": "localhost",
                "port": 8080,
                "protocol": "http"
            },
            "failover_backends": [
                {
                    "host": "backup1.stx-aio-0.internal",
                    "port": 8080,
                    "protocol": "http",
                    "priority": 1
                },
                {
                    "host": "backup2.stx-aio-0.internal", 
                    "port": 8080,
                    "protocol": "http",
                    "priority": 2
                }
            ],
            "health_checks": {
                "endpoint": "/health",
                "interval": 30,
                "timeout": 5,
                "retries": 3
            },
            "load_balancing": {
                "method": "round_robin",
                "sticky_sessions": True
            },
            "monitoring": {
                "metrics_enabled": True,
                "log_requests": True,
                "alert_thresholds": {
                    "response_time": 5000,  # ms
                    "error_rate": 5,  # percentage
                    "cpu_usage": 80,  # percentage
                    "memory_usage": 85  # percentage
                }
            }
        }
    
    def setup_nginx_config(self) -> bool:
        """Generate nginx configuration for domain routing"""
        try:
            self.logger.info("Setting up nginx configuration...")
            
            nginx_config = self.generate_nginx_config()
            
            # Write nginx config file
            nginx_config_path = self.script_dir / 'config' / 'nginx_stx_aio_0.conf'
            nginx_config_path.parent.mkdir(exist_ok=True)
            
            with open(nginx_config_path, 'w') as f:
                f.write(nginx_config)
            
            self.logger.info(f"Nginx configuration written to {nginx_config_path}")
            
            # Test nginx configuration
            result = subprocess.run(['nginx', '-t', '-c', str(nginx_config_path)], 
                              capture_output=True, text=True)
            
            if result.returncode == 0:
                self.logger.info("Nginx configuration test passed")
                return True
            else:
                self.logger.error(f"Nginx configuration test failed: {result.stderr}")
                return False
                
        except Exception as e:
            self.logger.error(f"Nginx setup failed: {e}")
            return False
    
    def generate_nginx_config(self) -> str:
        """Generate nginx configuration based on current config"""
        config = self.config
        
        upstream_servers = []
        for backend in [config["primary_backend"]] + config["failover_backends"]:
            server_line = f"    server {backend['host']}:{backend['port']}"
            if backend.get('backup', False):
                server_line += " backup"
            upstream_servers.append(server_line)
        
        upstream_block = f"""upstream stx_aio_0_backend {{
{chr(10).join(upstream_servers)}
    
    # Health check configuration
    keepalive 32;
}}"""
        
        server_block = f"""server {{
    listen 80;
    server_name {config["domain"]};
    
    # Enable monitoring
    access_log /var/log/nginx/stx_aio_0_access.log;
    error_log /var/log/nginx/stx_aio_0_error.log;
    
    # Load balancing configuration
    location / {{
        proxy_pass http://stx_aio_0_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # Health check endpoint bypass
        location = /health {{
            proxy_pass http://stx_aio_0_backend;
            access_log off;
        }}
    }}
    
    # Monitoring endpoint
    location /nginx_status {{
        stub_status;
        access_log off;
        allow 127.0.0.1;
        deny all;
    }}
}}"""
        
        return f"""# Generated nginx configuration for stx-aio-0
# Auto-generated by domain_router.py

{upstream_block}

{server_block}"""
    
    def setup_monitoring(self) -> bool:
        """Setup monitoring for domain routing"""
        try:
            self.logger.info("Setting up monitoring...")
            
            monitoring_config = self.config["monitoring"]
            
            # Create monitoring script
            monitoring_script = self.generate_monitoring_script(monitoring_config)
            
            monitoring_script_path = self.script_dir / 'monitor_stx_aio_0.sh'
            with open(monitoring_script_path, 'w') as f:
                f.write(monitoring_script)
            
            # Make monitoring script executable
            monitoring_script_path.chmod(0o755)
            
            self.logger.info(f"Monitoring script created at {monitoring_script_path}")
            return True
            
        except Exception as e:
            self.logger.error(f"Monitoring setup failed: {e}")
            return False
    
    def generate_monitoring_script(self, monitoring_config: Dict[str, Any]) -> str:
        """Generate monitoring script"""
        thresholds = monitoring_config["alert_thresholds"]
        
        return f"""#!/bin/bash
# Monitoring script for stx-aio-0 domain routing
# Auto-generated by domain_router.py

DOMAIN="{self.config["domain"]}"
PRIMARY_BACKEND="{self.config["primary_backend"]["host"]}:{self.config["primary_backend"]["port"]}"
RESPONSE_TIME_THRESHOLD={thresholds["response_time"]}
ERROR_RATE_THRESHOLD={thresholds["error_rate"]}
CPU_THRESHOLD={thresholds["cpu_usage"]}
MEMORY_THRESHOLD={thresholds["memory_usage"]}

# Check backend health
check_backend_health() {{
    local backend=$1
    local response=$(curl -s -o /dev/null -w "%{{http_code}}" \\
        "http://$backend/health" --max-time 5)
    
    if [ "$response" = "200" ]; then
        echo "✓ Backend $backend is healthy"
        return 0
    else
        echo "✗ Backend $backend is unhealthy (HTTP $response)"
        return 1
    fi
}}

# Check response time
check_response_time() {{
    local backend=$1
    local response_time=$(curl -s -o /dev/null -w "%{{time_total}}" \\
        "http://$backend/health" --max-time 10)
    
    response_time_ms=$(echo "$response_time * 1000" | bc)
    
    if (( $(echo "$response_time_ms > $RESPONSE_TIME_THRESHOLD" | bc -l) )); then
        echo "⚠️  Response time warning: $response_time_ms ms > $RESPONSE_TIME_THRESHOLD ms"
        return 1
    else
        echo "✓ Response time OK: $response_time_ms ms"
        return 0
    fi
}}

# Check system resources
check_system_resources() {{
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | \\
        sed "s/.*, *\\([0-9.]*\\)%us.*/\\1/" | sed 's/^ *//')
    local memory_usage=$(free | grep Mem | \\
        awk '{{printf "%.0f", $3/$2 * 100.0}}')
    
    if (( $(echo "$cpu_usage > $CPU_THRESHOLD" | bc -l) )); then
        echo "⚠️  CPU usage warning: $cpu_usage% > $CPU_THRESHOLD%"
    fi
    
    if (( $(echo "$memory_usage > $MEMORY_THRESHOLD" | bc -l) )); then
        echo "⚠️  Memory usage warning: $memory_usage% > $MEMORY_THRESHOLD%"
    fi
}}

# Main monitoring loop
echo "🔍 Starting monitoring for $DOMAIN..."

# Check primary backend
check_backend_health "$PRIMARY_BACKEND"
check_response_time "$PRIMARY_BACKEND"

# Check system resources
check_system_resources

echo "✅ Monitoring check completed"
"""
    
    def setup_failover(self) -> bool:
        """Setup failover configuration"""
        try:
            self.logger.info("Setting up failover configuration...")
            
            # Create failover script
            failover_script = self.generate_failover_script()
            
            failover_script_path = self.script_dir / 'failover_stx_aio_0.sh'
            with open(failover_script_path, 'w') as f:
                f.write(failover_script)
            
            # Make failover script executable
            failover_script_path.chmod(0o755)
            
            self.logger.info(f"Failover script created at {failover_script_path}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failover setup failed: {e}")
            return False
    
    def generate_failover_script(self) -> str:
        """Generate failover script"""
        backends = self.config["failover_backends"]
        
        backend_checks = ""
        for i, backend in enumerate(backends):
            backend_checks += f"""
check_backend_{i}() {{
    echo "Checking backend {i}: {backend['host']}:{backend['port']}"
    check_backend_health "{backend['host']}:{backend['port']}"
    return $?
}}"""
        
        failover_logic = """
# Failover decision logic
echo "🔄 Checking failover backends..."

for i in $(seq 0 $(expr $BACKEND_COUNT - 1)); do
    check_backend_$i
    if [ $? -eq 0 ]; then
        echo "✓ Failover backend $i is available"
        # Update nginx configuration to use this backend
        # TODO: Implement nginx reload logic
        exit 0
    fi
done

echo "❌ All failover backends are unavailable"
exit 1
"""
        
        return f"""#!/bin/bash
# Failover script for stx-aio-0 domain routing
# Auto-generated by domain_router.py

BACKEND_COUNT={len(backends)}

{backend_checks}

{failover_logic}"""
    
    def run_setup(self) -> bool:
        """Run complete setup process"""
        self.logger.info("Starting domain router setup...")
        
        setup_steps = [
            ("nginx_config", self.setup_nginx_config),
            ("monitoring", self.setup_monitoring),
            ("failover", self.setup_failover)
        ]
        
        for step_name, step_func in setup_steps:
            self.logger.info(f"Executing setup step: {step_name}")
            
            if not step_func():
                self.logger.error(f"Setup step failed: {step_name}")
                return False
        
        self.logger.info("Domain router setup completed successfully")
        return True

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='Domain Router Setup for stx-aio-0',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument('--config', 
                       help='Configuration file path')
    parser.add_argument('--setup-only', action='store_true',
                       help='Run setup only, no monitoring')
    parser.add_argument('--nginx-only', action='store_true',
                       help='Setup nginx configuration only')
    parser.add_argument('--monitoring-only', action='store_true',
                       help='Setup monitoring only')
    parser.add_argument('--failover-only', action='store_true',
                       help='Setup failover only')
    parser.add_argument('--json', action='store_true',
                       help='Output results in JSON format')
    parser.add_argument('--verbose', action='store_true',
                       help='Enable verbose logging')
    
    args = parser.parse_args()
    
    # Create domain router instance
    router = DomainRouter(config_file=args.config)
    
    # Execute requested operations
    success = True
    
    if args.nginx_only:
        success = router.setup_nginx_config()
    elif args.monitoring_only:
        success = router.setup_monitoring()
    elif args.failover_only:
        success = router.setup_failover()
    else:
        success = router.run_setup()
    
    if args.json:
        print(json.dumps({
            "success": success,
            "config": router.config
        }, indent=2))
    else:
        if success:
            print("✅ Domain router setup completed successfully")
        else:
            print("❌ Domain router setup failed")
    
    sys.exit(0 if success else 1)

if __name__ == '__main__':
    main()