from enum import Enum
from dataclasses import dataclass
from typing import List
from datetime import datetime

class RiskType(Enum):
    SITUATIONAL = "situational"
    STRATEGIC = "strategic"
    SYSTEMIC = "systemic"

class ROAMCategory(Enum):
    RESOLVED = "resolved"
    OWNED = "owned"
    ACCEPTED = "accepted"
    MITIGATED = "mitigated"

@dataclass
class CommunicationRisk:
    email_reference: str
    risk_type: RiskType
    roam_category: ROAMCategory
    likelihood: float
    impact: str
    mitigation_strategy: str
    wsjf_mitigation_score: float = 0.0

def calculate_mitigation_wsjf(risk_type: RiskType) -> float:
    bv_map = {RiskType.SITUATIONAL: 8, RiskType.STRATEGIC: 9, RiskType.SYSTEMIC: 7}
    tc_map = {RiskType.SITUATIONAL: 10, RiskType.STRATEGIC: 10, RiskType.SYSTEMIC: 6}
    job_size_map = {RiskType.SITUATIONAL: 1, RiskType.STRATEGIC: 2, RiskType.SYSTEMIC: 5}
    
    return (bv_map[risk_type] + tc_map[risk_type]) / job_size_map[risk_type]

def analyze_doug_non_response_bead(sent_count: int, received_count: int, hours_until_deadline: float, last_email_subject: str) -> CommunicationRisk:
    """
    ATOMIC BEAD: ROAM Risk Classifier
    Isolated function specifically for classifying non-response patterns.
    Clean room tested. No external dependencies or DB connections.
    """
    non_response_count = sent_count - received_count
    
    if non_response_count <= 0:
        risk_type = RiskType.SITUATIONAL
        roam = ROAMCategory.OWNED
        likelihood = 0.6
        mitigation = "Send friendly follow-up, monitor response"
    elif non_response_count <= 2 and hours_until_deadline < 24:
        risk_type = RiskType.STRATEGIC
        roam = ROAMCategory.MITIGATED
        likelihood = 0.3
        mitigation = "Offer deadline extension, escalate if no response"
    else:
        risk_type = RiskType.SYSTEMIC
        roam = ROAMCategory.ACCEPTED
        likelihood = 0.1
        mitigation = "Document pattern, prepare litigation evidence"
        
    risk = CommunicationRisk(
        email_reference=last_email_subject,
        risk_type=risk_type,
        roam_category=roam,
        likelihood=likelihood,
        impact=f"{non_response_count} non-responses, {hours_until_deadline:.1f}h until deadline",
        mitigation_strategy=mitigation
    )
    
    risk.wsjf_mitigation_score = calculate_mitigation_wsjf(risk_type)
    return risk
