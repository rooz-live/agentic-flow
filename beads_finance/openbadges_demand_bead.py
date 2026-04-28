from dataclasses import dataclass

@dataclass
class EconomicTelemetry:
    active_pipelines: int
    successful_conversions: int
    target_conversion_rate: float
    infrastructure_cost: float

@dataclass
class AgenticFinanceDecision:
    wsjf_score: float
    is_authorized: bool
    action: str
    rationale: str

def evaluate_openbadges_demand_bead(telemetry: EconomicTelemetry) -> AgenticFinanceDecision:
    """
    ATOMIC BEAD: Autonomous Finance Demand Modeler
    Clean room tested. Ingests economic telemetry and calculates if the OpenBadges 
    architectural upgrade is economically justified (WSJF).
    Prevents "Completion Theater" by gating tech debt behind actual market demand.
    """
    # Guard clause against zero pipelines
    if telemetry.active_pipelines == 0:
        return AgenticFinanceDecision(
            wsjf_score=0.0,
            is_authorized=False,
            action="DEFER_UPGRADE",
            rationale="No active market pipelines. Demand is zero."
        )

    current_conversion_rate = telemetry.successful_conversions / telemetry.active_pipelines
    
    # Calculate Business Value based on whether we hit target conversions
    if current_conversion_rate >= telemetry.target_conversion_rate:
        business_value = 10.0 + (current_conversion_rate * 5.0)  # High value if proven market fit
        time_criticality = 8.0  # We are missing potential up-sells without OpenBadges
    else:
        business_value = 2.0   # Low value, focus on fixing pipeline first
        time_criticality = 1.0 # Not urgent

    # Job Size is fixed based on engineering complexity to implement OpenBadges
    job_size = 5.0
    
    # OPEX Penalty: Deduct points if infrastructure cost is too high
    opex_penalty = min(telemetry.infrastructure_cost / 100.0, 5.0)

    wsjf_score = max(((business_value + time_criticality) / job_size) - opex_penalty, 0.0)
    
    # Threshold for OpenBadges implementation is WSJF >= 2.0
    is_authorized = wsjf_score >= 2.0
    
    if is_authorized:
        action = "AUTHORIZE_OPENBADGES_DEPLOY"
        rationale = f"Proven market demand ({current_conversion_rate*100:.1f}% conversion). Economic justification met."
    else:
        action = "REJECT_OPENBADGES_DEPLOY"
        rationale = f"Unproven market demand. Current conversion {current_conversion_rate*100:.1f}%. Avoid Completion Theater."

    return AgenticFinanceDecision(
        wsjf_score=round(wsjf_score, 2),
        is_authorized=is_authorized,
        action=action,
        rationale=rationale
    )
