#!/usr/bin/env python3
"""
WSJF Auto-Adjustment
Calculate and adjust WSJF scores based on provided data
"""

import os
import sys
import json
import argparse
import logging
import sqlite3
import math
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path
from datetime import datetime, timedelta

class WSJFAdjuster:
    def __init__(self, config_file: str = None):
        self.script_dir = Path(__file__).parent
        self.project_root = self.script_dir.parent.parent
        self.config_file = config_file or (self.script_dir / 'config' / 'wsjf_config.json')
        self.db_file = self.project_root / '.agentdb' / 'wsjf.sqlite'
        
        # Setup logging
        self.setup_logging()
        
        # Load configuration
        self.config = self.load_config()
        
        # Initialize database
        self.init_database()
        
    def setup_logging(self):
        """Setup logging for WSJF adjuster"""
        log_dir = self.project_root / 'logs'
        log_dir.mkdir(exist_ok=True)
        
        log_file = log_dir / 'wsjf_adjuster.log'
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler(sys.stdout)
            ]
        )
        
        self.logger = logging.getLogger('WSJFAdjuster')
        self.logger.info("WSJF Adjuster initialized")
    
    def load_config(self) -> Dict[str, Any]:
        """Load WSJF configuration"""
        try:
            if self.config_file.exists():
                with open(self.config_file, 'r') as f:
                    return json.load(f)
            else:
                # Default configuration
                return self.get_default_config()
        except Exception as e:
            self.logger.error(f"Failed to load config: {e}")
            return self.get_default_config()
    
    def get_default_config(self) -> Dict[str, Any]:
        """Get default WSJF configuration"""
        return {
            "cost_of_delay": {
                "business_value": {
                    "critical": 1000,
                    "high": 500,
                    "medium": 200,
                    "low": 100
                },
                "time_criticality": {
                    "urgent": 2.0,
                    "high": 1.5,
                    "normal": 1.0,
                    "low": 0.5
                },
                "risk_reduction": {
                    "high": 300,
                    "medium": 150,
                    "low": 50
                }
            },
            "job_duration": {
                "small": 1,
                    "medium": 2,
                    "large": 3,
                    "xlarge": 5
            },
            "adjustment_factors": {
                "real_time_enabled": True,
                "auto_rebalancing": True,
                "multi_factor_ranking": True,
                "historical_accuracy_weight": 0.3,
                "market_conditions_weight": 0.2
            },
            "thresholds": {
                "min_wsjf": 10,
                "max_wsjf": 10000,
                "rebalance_threshold": 0.2,  # 20% change triggers rebalance
                "update_frequency": 3600  # seconds
            }
        }
    
    def init_database(self):
        """Initialize SQLite database for WSJF tracking"""
        self.db_file.parent.mkdir(exist_ok=True)
        
        conn = sqlite3.connect(str(self.db_file))
        cursor = conn.cursor()
        
        # Create tables
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS work_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                item_id TEXT UNIQUE,
                title TEXT,
                business_value TEXT,
                time_criticality TEXT,
                risk_reduction TEXT,
                job_duration TEXT,
                user_business_value REAL,
                cost_of_delay REAL,
                job_duration_days REAL,
                wsjf_score REAL,
                last_updated TIMESTAMP,
                status TEXT DEFAULT 'active'
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS wsjf_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                item_id TEXT,
                old_wsjf REAL,
                new_wsjf REAL,
                adjustment_reason TEXT,
                timestamp TIMESTAMP
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS market_conditions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                condition_type TEXT,
                impact_factor REAL,
                timestamp TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
        
        self.logger.info("Database initialized")
    
    def calculate_cost_of_delay(self, business_value: str, 
                            time_criticality: str, 
                            risk_reduction: str) -> float:
        """Calculate Cost of Delay (CoD)"""
        config = self.config["cost_of_delay"]
        
        # Base business value
        bv = config["business_value"].get(business_value.lower(), 100)
        
        # Time criticality factor
        tc_factor = config["time_criticality"].get(time_criticality.lower(), 1.0)
        
        # Risk reduction value
        rr = config["risk_reduction"].get(risk_reduction.lower(), 0)
        
        # Calculate CoD
        cost_of_delay = (bv + rr) * tc_factor
        
        self.logger.debug(f"CoD calculation: BV={bv}, TC={tc_factor}, RR={rr}, CoD={cost_of_delay}")
        return cost_of_delay
    
    def calculate_job_duration(self, duration: str) -> float:
        """Get job duration in days"""
        return self.config["job_duration"].get(duration.lower(), 1.0)
    
    def calculate_wsjf(self, business_value: str, time_criticality: str, 
                     risk_reduction: str, job_duration: str) -> float:
        """Calculate WSJF score"""
        cost_of_delay = self.calculate_cost_of_delay(business_value, time_criticality, risk_reduction)
        duration = self.calculate_job_duration(job_duration)
        
        wsjf_score = cost_of_delay / duration
        
        self.logger.debug(f"WSJF calculation: CoD={cost_of_delay}, Duration={duration}, WSJF={wsjf_score}")
        return wsjf_score
    
    def analyze_cost_of_delay_factors(self, items: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Perform detailed cost of delay analysis"""
        analysis = {
            "total_items": len(items),
            "cod_distribution": {},
            "criticality_impact": {},
            "risk_impact": {},
            "recommendations": []
        }
        
        # Analyze CoD distribution
        cod_values = [item["cost_of_delay"] for item in items]
        if cod_values:
            analysis["cod_distribution"] = {
                "min": min(cod_values),
                "max": max(cod_values),
                "avg": sum(cod_values) / len(cod_values),
                "median": self._median(cod_values)
            }
        
        # Analyze criticality impact
        criticality_groups = {}
        for item in items:
            crit = item["time_criticality"]
            if crit not in criticality_groups:
                criticality_groups[crit] = []
            criticality_groups[crit].append(item["wsjf_score"])
        
        for crit, scores in criticality_groups.items():
            if scores:
                analysis["criticality_impact"][crit] = {
                    "count": len(scores),
                    "avg_wsjf": sum(scores) / len(scores),
                    "total_wsjf": sum(scores)
                }
        
        # Generate recommendations
        high_cod_items = [item for item in items if item["cost_of_delay"] > 500]
        if high_cod_items:
            analysis["recommendations"].append({
                "type": "high_cod_priority",
                "message": f"{len(high_cod_items)} items with high Cost of Delay need immediate attention",
                "items": [item["item_id"] for item in high_cod_items]
            })
        
        return analysis
    
    def _median(self, values: List[float]) -> float:
        """Calculate median value"""
        sorted_values = sorted(values)
        n = len(sorted_values)
        
        if n == 0:
            return 0
        elif n % 2 == 1:
            return sorted_values[n // 2]
        else:
            return (sorted_values[n // 2 - 1] + sorted_values[n // 2]) / 2
    
    def auto_rebalance_scores(self, items: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Automatically rebalance WSJF scores based on market conditions"""
        if not self.config["adjustment_factors"]["auto_rebalancing"]:
            return {"rebalanced": False, "reason": "auto_rebalancing_disabled"}
        
        # Get current market conditions
        market_impact = self._get_market_conditions_impact()
        
        rebalanced_items = []
        for item in items:
            original_wsjf = item["wsjf_score"]
            
            # Apply market conditions adjustment
            adjusted_wsjf = original_wsjf * market_impact
            
            # Apply historical accuracy adjustment
            if self.config["adjustment_factors"]["multi_factor_ranking"]:
                accuracy_factor = self._get_historical_accuracy_factor(item["item_id"])
                adjusted_wsjf *= accuracy_factor
            
            # Check if rebalance is significant
            change_threshold = self.config["thresholds"]["rebalance_threshold"]
            relative_change = abs(adjusted_wsjf - original_wsjf) / original_wsjf
            
            if relative_change > change_threshold:
                rebalanced_items.append({
                    "item_id": item["item_id"],
                    "original_wsjf": original_wsjf,
                    "adjusted_wsjf": adjusted_wsjf,
                    "relative_change": relative_change,
                    "market_impact": market_impact,
                    "accuracy_factor": accuracy_factor if self.config["adjustment_factors"]["multi_factor_ranking"] else 1.0
                })
        
        result = {
            "rebalanced": len(rebalanced_items) > 0,
            "items_rebalanced": len(rebalanced_items),
            "rebalancing_details": rebalanced_items,
            "market_impact_factor": market_impact,
            "timestamp": datetime.now().isoformat()
        }
        
        self.logger.info(f"Auto-rebalancing completed: {len(rebalanced_items)} items adjusted")
        return result
    
    def _get_market_conditions_impact(self) -> float:
        """Get current market conditions impact factor"""
        conn = sqlite3.connect(str(self.db_file))
        cursor = conn.cursor()
        
        # Get latest market conditions
        cursor.execute('''
            SELECT impact_factor FROM market_conditions
            ORDER BY timestamp DESC
            LIMIT 1
        ''')
        
        result = cursor.fetchone()
        conn.close()
        
        if result:
            return result[0]
        else:
            # Default market conditions
            return 1.0
    
    def _get_historical_accuracy_factor(self, item_id: str) -> float:
        """Get historical accuracy factor for an item"""
        # Placeholder implementation - would use historical data
        # For now, return default factor
        return 1.0
    
    def real_time_adjustment(self, items: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Perform real-time WSJF adjustments"""
        if not self.config["adjustment_factors"]["real_time_enabled"]:
            return {"adjusted": False, "reason": "real_time_disabled"}
        
        current_time = datetime.now()
        adjustments = []
        
        for item in items:
            # Check if item needs real-time adjustment
            last_updated = datetime.fromisoformat(item["last_updated"]) if item.get("last_updated") else current_time
            age_hours = (current_time - last_updated).total_seconds() / 3600
            
            # Adjust for aging items
            if age_hours > 24:  # Older than 24 hours
                aging_factor = 1 + (age_hours / 168)  # Increase by 1% per week
                adjusted_wsjf = item["wsjf_score"] * aging_factor
                
                adjustments.append({
                    "item_id": item["item_id"],
                    "adjustment_type": "aging",
                    "factor": aging_factor,
                    "original_wsjf": item["wsjf_score"],
                    "adjusted_wsjf": adjusted_wsjf,
                    "age_hours": age_hours
                })
        
        result = {
            "adjusted": len(adjustments) > 0,
            "adjustments": adjustments,
            "timestamp": current_time.isoformat()
        }
        
        self.logger.info(f"Real-time adjustment completed: {len(adjustments)} items adjusted")
        return result
    
    def multi_factor_ranking(self, items: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Apply multi-factor ranking to items"""
        if not self.config["adjustment_factors"]["multi_factor_ranking"]:
            return {"ranked": False, "reason": "multi_factor_disabled"}
        
        ranked_items = []
        for item in items:
            base_score = item["wsjf_score"]
            
            # Apply multiple factors
            factors = {
                "historical_accuracy": self._get_historical_accuracy_factor(item["item_id"]),
                "market_conditions": self._get_market_conditions_impact(),
                "business_value_weight": 1.0,
                "urgency_boost": 1.0
            }
            
            # Calculate weighted score
            config = self.config["adjustment_factors"]
            weighted_score = base_score
            
            # Apply historical accuracy weight
            if config["historical_accuracy_weight"] > 0:
                weighted_score *= (1 + (factors["historical_accuracy"] - 1) * config["historical_accuracy_weight"])
            
            # Apply market conditions weight
            if config["market_conditions_weight"] > 0:
                weighted_score *= (1 + (factors["market_conditions"] - 1) * config["market_conditions_weight"])
            
            ranked_items.append({
                "item_id": item["item_id"],
                "base_wsjf": base_score,
                "weighted_score": weighted_score,
                "factors": factors,
                "rank_change": weighted_score - base_score
            })
        
        # Sort by weighted score
        ranked_items.sort(key=lambda x: x["weighted_score"], reverse=True)
        
        result = {
            "ranked": True,
            "items": ranked_items,
            "ranking_factors": {
                "historical_accuracy_weight": config["historical_accuracy_weight"],
                "market_conditions_weight": config["market_conditions_weight"]
            },
            "timestamp": datetime.now().isoformat()
        }
        
        self.logger.info(f"Multi-factor ranking completed: {len(ranked_items)} items ranked")
        return result
    
    def run_adjustment_cycle(self, real_time: bool = False, 
                          cost_of_delay_analysis: bool = False,
                          auto_rebalancing: bool = False,
                          multi_factor_ranking: bool = False) -> Dict[str, Any]:
        """Run complete WSJF adjustment cycle"""
        self.logger.info("Starting WSJF adjustment cycle...")
        
        # Get current work items
        conn = sqlite3.connect(str(self.db_file))
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM work_items WHERE status = 'active'
        ''')
        
        items = []
        for row in cursor.fetchall():
            items.append({
                "item_id": row[1],
                "title": row[2],
                "business_value": row[3],
                "time_criticality": row[4],
                "risk_reduction": row[5],
                "job_duration": row[6],
                "wsjf_score": row[10],
                "last_updated": row[11]
            })
        
        conn.close()
        
        result = {
            "items_processed": len(items),
            "real_time_result": None,
            "cod_analysis_result": None,
            "rebalancing_result": None,
            "ranking_result": None,
            "timestamp": datetime.now().isoformat()
        }
        
        # Apply requested adjustments
        if real_time:
            real_time_result = self.real_time_adjustment(items)
            result["real_time_result"] = real_time_result
        
        if cost_of_delay_analysis:
            cod_analysis = self.analyze_cost_of_delay_factors(items)
            result["cod_analysis_result"] = cod_analysis
        
        if auto_rebalancing:
            rebalancing_result = self.auto_rebalance_scores(items)
            result["rebalancing_result"] = rebalancing_result
        
        if multi_factor_ranking:
            ranking_result = self.multi_factor_ranking(items)
            result["ranking_result"] = ranking_result
        
        self.logger.info("WSJF adjustment cycle completed")
        return result

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='WSJF Auto-Adjustment',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument('--config', 
                       help='Configuration file path')
    parser.add_argument('--real-time', action='store_true',
                       help='Enable real-time adjustments')
    parser.add_argument('--cost-of-delay-analysis', action='store_true',
                       help='Perform cost of delay analysis')
    parser.add_argument('--auto-rebalancing', action='store_true',
                       help='Enable automatic score rebalancing')
    parser.add_argument('--multi-factor-ranking', action='store_true',
                       help='Apply multi-factor ranking')
    parser.add_argument('--json', action='store_true',
                       help='Output results in JSON format')
    parser.add_argument('--verbose', action='store_true',
                       help='Enable verbose logging')
    
    args = parser.parse_args()
    
    # Create WSJF adjuster instance
    adjuster = WSJFAdjuster(config_file=args.config)
    
    # Run adjustment cycle with specified options
    result = adjuster.run_adjustment_cycle(
        real_time=args.real_time,
        cost_of_delay_analysis=args.cost_of_delay_analysis,
        auto_rebalancing=args.auto_rebalancing,
        multi_factor_ranking=args.multi_factor_ranking
    )
    
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print("WSJF Adjustment Results:")
        print(f"Items Processed: {result['items_processed']}")
        
        if result["real_time_result"]:
            print(f"Real-time Adjustments: {len(result['real_time_result']['adjustments'])}")
        
        if result["cod_analysis_result"]:
            print(f"CoD Analysis: {result['cod_analysis_result']['total_items']} items analyzed")
        
        if result["rebalancing_result"]:
            print(f"Rebalanced Items: {result['rebalancing_result']['items_rebalanced']}")
        
        if result["ranking_result"]:
            print(f"Ranked Items: {len(result['ranking_result']['items'])}")
    
    sys.exit(0)

if __name__ == '__main__':
    main()