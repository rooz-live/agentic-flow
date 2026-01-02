#!/usr/bin/env python3
"""
Economic Attribution System
============================

Revenue Impact Attribution per Circle with CapEx/OpEx Tracking

Circle Revenue Impact (Monthly Business Value):
- Innovator: $5,000/month (highest - new product features)
- Analyst: $3,500/month (high - strategic insights)
- Orchestrator: $2,500/month (medium - coordination)
- Assessor: $2,000/month (medium - quality assurance)
- Intuitive: $1,000/month (lower - exploratory)
- Seeker: $500/month (lower - research)
- Testing: $250/month (lowest - validation)

CapEx/OpEx Metrics:
- capex_opex_ratio: Infrastructure cost / Operational cost
- infrastructure_utilization: Device usage / Capacity
- revenue_impact: Circle revenue × WSJF score normalization
"""

import json
from datetime import datetime
from typing import Dict, Any, Optional
from pathlib import Path


# Circle Revenue Impact (monthly business value in USD)
CIRCLE_REVENUE_IMPACT = {
    "innovator": 5000,      # New product features
    "analyst": 3500,        # Strategic insights
    "orchestrator": 2500,   # Coordination
    "assessor": 2000,       # Quality assurance
    "intuitive": 1000,      # Exploratory
    "seeker": 500,          # Research
    "testing": 250          # Validation
}

# CapEx weights by circle (how much infrastructure investment required)
CIRCLE_CAPEX_WEIGHT = {
    "innovator": 0.7,       # High infrastructure for experiments
    "analyst": 0.5,         # Medium for data processing
    "orchestrator": 0.3,    # Lower - mainly coordination
    "assessor": 0.4,        # Medium for testing infrastructure
    "intuitive": 0.2,       # Low - exploratory
    "seeker": 0.1,          # Very low - research
    "testing": 0.6          # High for test environments
}


class EconomicAttributor:
    """Calculate economic attribution for circles and work items"""
    
    def __init__(self):
        self.circle_monthly_revenue = CIRCLE_REVENUE_IMPACT
        self.circle_capex_weight = CIRCLE_CAPEX_WEIGHT
    
    def calculate_revenue_impact(
        self, 
        circle: str, 
        wsjf_score: float = 0, 
        completion_rate: float = 1.0
    ) -> float:
        """
        Calculate revenue impact for a work item.
        
        Args:
            circle: Circle name
            wsjf_score: WSJF score of the work item
            completion_rate: 0.0-1.0 (1.0 = fully complete)
        
        Returns:
            Revenue impact in USD
        """
        circle = circle.lower()
        base_revenue = self.circle_monthly_revenue.get(circle, 0)
        
        # Normalize WSJF score (assume typical range 0-20)
        wsjf_multiplier = min(wsjf_score / 10, 2.0) if wsjf_score > 0 else 1.0
        
        # Calculate daily revenue impact
        daily_revenue = base_revenue / 30  # Monthly to daily
        
        # Apply WSJF multiplier and completion rate
        revenue_impact = daily_revenue * wsjf_multiplier * completion_rate
        
        return round(revenue_impact, 2)
    
    def calculate_capex_opex_ratio(
        self,
        circle: str,
        infrastructure_cost: float = 0,
        operational_cost: float = 0,
        time_period_days: int = 30
    ) -> float:
        """
        Calculate CapEx/OpEx ratio for a circle.
        
        Args:
            circle: Circle name
            infrastructure_cost: Infrastructure investment (servers, tools, etc.)
            operational_cost: Operational costs (people, cloud, etc.)
            time_period_days: Time period for calculation
        
        Returns:
            CapEx/OpEx ratio
        """
        circle = circle.lower()
        
        # If no costs provided, estimate from circle weights
        if infrastructure_cost == 0 and operational_cost == 0:
            capex_weight = self.circle_capex_weight.get(circle, 0.3)
            # Assume $10K monthly baseline operational cost
            estimated_opex = 10000 * (time_period_days / 30)
            estimated_capex = estimated_opex * capex_weight
            
            return round(capex_weight, 2)
        
        # Calculate actual ratio
        if operational_cost == 0:
            return 0.0
        
        ratio = infrastructure_cost / operational_cost
        return round(ratio, 3)
    
    def calculate_infrastructure_utilization(
        self,
        device_metrics: Dict[str, Any]
    ) -> float:
        """
        Calculate infrastructure utilization from device metrics.
        
        Args:
            device_metrics: Dict with 'cpu_usage', 'memory_usage', 'disk_usage' (0-100%)
        
        Returns:
            Average utilization percentage (0-100)
        """
        if not device_metrics:
            return 0.0
        
        utilizations = []
        
        for metric in ['cpu_usage', 'memory_usage', 'disk_usage']:
            value = device_metrics.get(metric, 0)
            if isinstance(value, (int, float)):
                utilizations.append(value)
        
        if not utilizations:
            return 0.0
        
        avg_utilization = sum(utilizations) / len(utilizations)
        return round(avg_utilization, 1)
    
    def enrich_economic_fields(
        self,
        event: Dict[str, Any],
        device_metrics: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Enrich event with complete economic attribution.
        
        Args:
            event: Pattern event dict
            device_metrics: Optional device metrics for infrastructure calculation
        
        Returns:
            Enhanced economic dict
        """
        circle = event.get("circle", "unknown")
        wsjf_score = event.get("economic", {}).get("wsjf_score", 0)
        
        # Calculate revenue impact
        revenue_impact = self.calculate_revenue_impact(
            circle=circle,
            wsjf_score=wsjf_score,
            completion_rate=1.0 if event.get("action_completed") else 0.0
        )
        
        # Calculate CapEx/OpEx ratio
        capex_opex_ratio = self.calculate_capex_opex_ratio(circle=circle)
        
        # Calculate infrastructure utilization
        infrastructure_utilization = 0.0
        if device_metrics:
            infrastructure_utilization = self.calculate_infrastructure_utilization(
                device_metrics
            )
        
        # Build enhanced economic dict
        economic = event.get("economic", {})
        economic.update({
            "revenue_impact": revenue_impact,
            "capex_opex_ratio": capex_opex_ratio,
            "infrastructure_utilization": infrastructure_utilization,
            "circle_monthly_value": self.circle_monthly_revenue.get(circle.lower(), 0),
            "attribution_method": "wsjf_normalized"
        })
        
        return economic
    
    def calculate_portfolio_metrics(
        self,
        events: list[Dict[str, Any]],
        time_window_days: int = 30
    ) -> Dict[str, Any]:
        """
        Calculate portfolio-level economic metrics.
        
        Args:
            events: List of pattern events
            time_window_days: Time window for calculations
        
        Returns:
            Portfolio metrics dict
        """
        metrics = {
            "total_revenue_impact": 0.0,
            "by_circle": {},
            "capex_opex_ratio": 0.0,
            "avg_infrastructure_utilization": 0.0,
            "top_revenue_drivers": []
        }
        
        circle_revenues = {}
        capex_ratios = []
        utilizations = []
        
        for event in events:
            circle = event.get("circle", "unknown")
            economic = event.get("economic", {})
            
            revenue = economic.get("revenue_impact", 0)
            metrics["total_revenue_impact"] += revenue
            
            circle_revenues[circle] = circle_revenues.get(circle, 0) + revenue
            
            capex_ratio = economic.get("capex_opex_ratio", 0)
            if capex_ratio > 0:
                capex_ratios.append(capex_ratio)
            
            util = economic.get("infrastructure_utilization", 0)
            if util > 0:
                utilizations.append(util)
        
        # By-circle breakdown
        metrics["by_circle"] = {
            circle: {
                "revenue_impact": round(rev, 2),
                "percentage": round((rev / metrics["total_revenue_impact"] * 100), 1) if metrics["total_revenue_impact"] > 0 else 0
            }
            for circle, rev in circle_revenues.items()
        }
        
        # Average CapEx/OpEx ratio
        if capex_ratios:
            metrics["capex_opex_ratio"] = round(sum(capex_ratios) / len(capex_ratios), 3)
        
        # Average infrastructure utilization
        if utilizations:
            metrics["avg_infrastructure_utilization"] = round(sum(utilizations) / len(utilizations), 1)
        
        # Top revenue drivers
        sorted_circles = sorted(circle_revenues.items(), key=lambda x: x[1], reverse=True)
        metrics["top_revenue_drivers"] = [
            {"circle": circle, "revenue_impact": round(rev, 2)}
            for circle, rev in sorted_circles[:5]
        ]
        
        return metrics
    
    def calculate_opex_monthly(
        self,
        device_hosting_cost: float = 200,
        software_licenses: float = 150,
        api_costs: float = 500,
        capex_total: float = 35450
    ) -> Dict[str, Any]:
        """
        Calculate monthly operational expenses.
        
        Args:
            device_hosting_cost: Monthly server/device hosting
            software_licenses: Monthly software subscriptions  
            api_costs: Monthly API usage (Anthropic, AWS, etc.)
            capex_total: Total capital expenditure
        
        Returns:
            OpEx breakdown dict
        """
        # Maintenance: 10% of CapEx annually, prorated monthly
        maintenance_monthly = (capex_total * 0.10) / 12
        
        total_opex = (
            device_hosting_cost + 
            software_licenses + 
            api_costs + 
            maintenance_monthly
        )
        
        return {
            "device_hosting": round(device_hosting_cost, 2),
            "software_licenses": round(software_licenses, 2),
            "api_costs": round(api_costs, 2),
            "maintenance": round(maintenance_monthly, 2),
            "total_monthly": round(total_opex, 2),
            "capex_total": capex_total,
            "capex_opex_ratio": round(capex_total / total_opex, 2) if total_opex > 0 else 0
        }
    
    def get_infrastructure_metrics_from_sensorimotor(
        self,
        device_id: str = "24460"
    ) -> Dict[str, Any]:
        """
        Get infrastructure metrics from sensorimotor worker (IPMI).
        
        Args:
            device_id: Device identifier
        
        Returns:
            Infrastructure metrics dict
        """
        # Placeholder - would call sensorimotor worker in production
        # For now, return mock data based on typical server utilization
        return {
            "device_id": device_id,
            "cpu_utilization": 73.5,
            "memory_utilization": 68.2,
            "network_throughput_mbps": 450,
            "uptime_pct": 99.7,
            "disk_usage": 62.1,
            "last_updated": datetime.now().isoformat()
        }


def enrich_pattern_event(
    event: Dict[str, Any],
    device_metrics: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Enrich a pattern event with economic attribution.
    
    Usage:
        event = load_event_from_jsonl()
        enriched = enrich_pattern_event(event, device_metrics)
    """
    attributor = EconomicAttributor()
    event["economic"] = attributor.enrich_economic_fields(event, device_metrics)
    return event


def main():
    """Example usage and testing"""
    import sys
    
    attributor = EconomicAttributor()
    
    # Example 1: Calculate revenue impact for innovator
    print("=" * 70)
    print("ECONOMIC ATTRIBUTION EXAMPLES")
    print("=" * 70)
    
    print("\n1. Revenue Impact by Circle (WSJF=10):")
    for circle in CIRCLE_REVENUE_IMPACT.keys():
        revenue = attributor.calculate_revenue_impact(circle, wsjf_score=10, completion_rate=1.0)
        monthly = CIRCLE_REVENUE_IMPACT[circle]
        print(f"   {circle:12s}: ${revenue:6.2f}/day (${monthly:,}/month)")
    
    # Example 2: CapEx/OpEx ratios
    print("\n2. CapEx/OpEx Ratios by Circle:")
    for circle in CIRCLE_CAPEX_WEIGHT.keys():
        ratio = attributor.calculate_capex_opex_ratio(circle)
        weight = CIRCLE_CAPEX_WEIGHT[circle]
        print(f"   {circle:12s}: {ratio:.2f} (weight: {weight:.1f})")
    
    # Example 3: Enrich event
    print("\n3. Enriched Event Example:")
    sample_event = {
        "circle": "innovator",
        "pattern": "new_feature",
        "action_completed": True,
        "economic": {
            "wsjf_score": 15.5,
            "cod": 50
        }
    }
    
    device_metrics = {
        "cpu_usage": 65.0,
        "memory_usage": 78.0,
        "disk_usage": 45.0
    }
    
    enriched_economic = attributor.enrich_economic_fields(sample_event, device_metrics)
    print(json.dumps(enriched_economic, indent=2))
    
    # Example 4: Portfolio metrics
    print("\n4. Portfolio Metrics (Sample Data):")
    sample_events = [
        {"circle": "innovator", "economic": {"revenue_impact": 250, "wsjf_score": 15}},
        {"circle": "analyst", "economic": {"revenue_impact": 180, "wsjf_score": 12}},
        {"circle": "orchestrator", "economic": {"revenue_impact": 120, "wsjf_score": 10}},
        {"circle": "testing", "economic": {"revenue_impact": 15, "wsjf_score": 3}},
    ]
    
    portfolio = attributor.calculate_portfolio_metrics(sample_events)
    print(json.dumps(portfolio, indent=2))


if __name__ == "__main__":
    main()
