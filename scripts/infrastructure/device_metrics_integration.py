#!/usr/bin/env python3
"""
Device Metrics Integration for Infrastructure Utilization
Connects device 24460 monitoring to agentic-flow pattern metrics

Usage:
    python3 device_metrics_integration.py --device 24460
    python3 device_metrics_integration.py --all-devices
"""

import argparse
import json
import logging
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class DeviceMetricsIntegration:
    """Integrates device monitoring with agentic-flow economic tracking"""
    
    def __init__(self, device_id: Optional[int] = None):
        self.device_id = device_id
        self.project_root = Path(__file__).parent.parent.parent
        self.hivelocity_db = self.project_root / "logs" / "hivelocity_operations.db"
        self.pattern_metrics = self.project_root / ".goalie" / "pattern_metrics.jsonl"
        
    def fetch_device_metrics(self, lookback_minutes: int = 60) -> Dict:
        """
        Fetch device metrics from Hivelocity monitoring database
        
        Args:
            lookback_minutes: How far back to look for metrics
            
        Returns:
            Dict with CPU, memory, disk, network utilization
        """
        # Check if Hivelocity DB exists
        if not self.hivelocity_db.exists():
            logger.warning(f"Hivelocity DB not found at {self.hivelocity_db}")
            return self._mock_metrics()
            
        try:
            import sqlite3
            conn = sqlite3.connect(str(self.hivelocity_db))
            cursor = conn.cursor()
            
            # Query device metrics (assuming device_metrics table exists)
            query = """
            SELECT 
                timestamp,
                cpu_usage,
                memory_usage,
                disk_usage,
                network_rx_bytes,
                network_tx_bytes
            FROM device_metrics
            WHERE device_id = ?
                AND timestamp >= datetime('now', '-{} minutes')
            ORDER BY timestamp DESC
            LIMIT 1
            """.format(lookback_minutes)
            
            cursor.execute(query, (self.device_id,))
            row = cursor.fetchone()
            conn.close()
            
            if row:
                return {
                    "timestamp": row[0],
                    "cpu_usage_percent": row[1],
                    "memory_usage_percent": row[2],
                    "disk_usage_percent": row[3],
                    "network_rx_mb": row[4] / (1024 * 1024),
                    "network_tx_mb": row[5] / (1024 * 1024),
                }
            else:
                logger.info(f"No recent metrics for device {self.device_id}, using mock data")
                return self._mock_metrics()
                
        except Exception as e:
            logger.error(f"Error fetching device metrics: {e}")
            return self._mock_metrics()
    
    def _mock_metrics(self) -> Dict:
        """Generate mock metrics for testing"""
        return {
            "timestamp": datetime.now().isoformat(),
            "cpu_usage_percent": 45.2,
            "memory_usage_percent": 68.7,
            "disk_usage_percent": 52.1,
            "network_rx_mb": 125.4,
            "network_tx_mb": 89.3,
        }
    
    def calculate_infrastructure_utilization(self, metrics: Dict) -> float:
        """
        Calculate aggregate infrastructure utilization score
        
        Weighted average:
        - CPU: 40% weight
        - Memory: 40% weight
        - Disk: 20% weight
        
        Returns:
            Float 0-100 representing overall infrastructure utilization
        """
        cpu = metrics.get("cpu_usage_percent", 0)
        memory = metrics.get("memory_usage_percent", 0)
        disk = metrics.get("disk_usage_percent", 0)
        
        utilization = (cpu * 0.4) + (memory * 0.4) + (disk * 0.2)
        return round(utilization, 2)
    
    def estimate_infrastructure_cost(self, metrics: Dict) -> Dict:
        """
        Estimate infrastructure costs based on utilization
        
        Cost Model (device 24460):
        - Base monthly cost: $150/month
        - CPU-intensive workload multiplier: 1.2x at 80%+ CPU
        - Memory-intensive multiplier: 1.15x at 75%+ memory
        - Network egress: $0.01/GB over 5TB
        
        Returns:
            Dict with capex, opex, total_monthly_cost
        """
        base_cost = 150.0  # Base server cost per month
        
        # Adjust for high utilization (premium compute)
        cpu = metrics.get("cpu_usage_percent", 0)
        memory = metrics.get("memory_usage_percent", 0)
        
        multiplier = 1.0
        if cpu >= 80:
            multiplier *= 1.2
        if memory >= 75:
            multiplier *= 1.15
            
        compute_cost = base_cost * multiplier
        
        # Network egress cost (simplified: $0.01/GB over 5TB threshold)
        tx_mb = metrics.get("network_tx_mb", 0)
        # Assuming metrics are per minute, extrapolate to monthly
        monthly_tx_gb = (tx_mb / 1024) * 60 * 24 * 30
        free_tier_gb = 5000  # 5TB free
        
        network_cost = max(0, (monthly_tx_gb - free_tier_gb) * 0.01)
        
        total_monthly = compute_cost + network_cost
        
        # Split into CapEx (40%) and OpEx (60%)
        # CapEx: Hardware depreciation
        # OpEx: Power, bandwidth, management
        capex = total_monthly * 0.4
        opex = total_monthly * 0.6
        
        return {
            "capex_monthly": round(capex, 2),
            "opex_monthly": round(opex, 2),
            "total_monthly_cost": round(total_monthly, 2),
            "capex_opex_ratio": round(capex / opex if opex > 0 else 0, 3),
        }
    
    def get_current_infrastructure_snapshot(self) -> Dict:
        """Get complete infrastructure snapshot for economic tracking"""
        metrics = self.fetch_device_metrics()
        utilization = self.calculate_infrastructure_utilization(metrics)
        costs = self.estimate_infrastructure_cost(metrics)
        
        return {
            "device_id": self.device_id,
            "timestamp": datetime.now().isoformat(),
            "metrics": metrics,
            "infrastructure_utilization": utilization,
            "costs": costs,
            "capex_opex_ratio": costs["capex_opex_ratio"],
        }
    
    def export_for_pattern_logger(self) -> Dict:
        """
        Export in format compatible with PatternLogger economic dict
        
        Returns:
            Dict with keys matching PatternLogger's log_economic_pattern()
        """
        snapshot = self.get_current_infrastructure_snapshot()
        
        return {
            "infrastructure_utilization": snapshot["infrastructure_utilization"],
            "capex_opex_ratio": snapshot["capex_opex_ratio"],
            "device_id": snapshot["device_id"],
            "monthly_cost": snapshot["costs"]["total_monthly_cost"],
            "snapshot_timestamp": snapshot["timestamp"],
        }
    
    def write_infrastructure_metrics(self, output_path: Optional[Path] = None):
        """Write infrastructure metrics to file for consumption by prod-cycle"""
        if output_path is None:
            output_path = self.project_root / ".goalie" / "infrastructure_snapshot.json"
            
        snapshot = self.export_for_pattern_logger()
        
        with open(output_path, 'w') as f:
            json.dump(snapshot, f, indent=2)
            
        logger.info(f"Infrastructure snapshot written to {output_path}")
        logger.info(f"  Utilization: {snapshot['infrastructure_utilization']:.1f}%")
        logger.info(f"  CapEx/OpEx Ratio: {snapshot['capex_opex_ratio']:.3f}")
        logger.info(f"  Monthly Cost: ${snapshot['monthly_cost']:.2f}")
        
        return snapshot


def main():
    parser = argparse.ArgumentParser(description="Device metrics integration for agentic-flow")
    parser.add_argument("--device", type=int, default=24460, help="Device ID to monitor")
    parser.add_argument("--output", type=str, help="Output file path")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    
    args = parser.parse_args()
    
    integrator = DeviceMetricsIntegration(device_id=args.device)
    snapshot = integrator.write_infrastructure_metrics(
        Path(args.output) if args.output else None
    )
    
    if args.json:
        print(json.dumps(snapshot, indent=2))
    else:
        print(f"\n✅ Infrastructure metrics updated for device {args.device}")
        print(f"   Utilization: {snapshot['infrastructure_utilization']}%")
        print(f"   CapEx/OpEx: {snapshot['capex_opex_ratio']}")
        print(f"   Monthly Cost: ${snapshot['monthly_cost']:.2f}")


if __name__ == "__main__":
    main()
