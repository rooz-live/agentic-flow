import json
from dataclasses import dataclass
from typing import Dict, Optional

@dataclass
class AgenticAction:
    should_execute: bool
    reason: str
    proposed_response: Optional[str] = None
    target_bead: Optional[str] = None

def evaluate_matrix_contract_bead(event_content: Dict, wsjf_threshold: float = 15.0) -> AgenticAction:
    """
    ATOMIC BEAD: Hermes WSJF Evaluator
    Clean room tested. Evaluates a Matrix room event. If the event contains
    Wholeness Metadata with a WSJF score exceeding the threshold, it authorizes
    execution of the Mailjet sender bead.
    """
    body = event_content.get("body", "")
    
    # The event must be a formatted JSON contract from the ROAM bead
    try:
        if not body.strip().startswith("{"):
            return AgenticAction(False, "Not a JSON contract")
            
        payload = json.loads(body)
        wholeness = payload.get("wholeness_metadata", {})
        
        wsjf_score = float(wholeness.get("wsjf_score", 0.0))
        risk_type = wholeness.get("risk_type", "UNKNOWN")
        
        if wsjf_score >= wsjf_threshold:
            # High value/criticality -> Execute Response
            return AgenticAction(
                should_execute=True,
                reason=f"WSJF {wsjf_score} >= Threshold {wsjf_threshold}",
                proposed_response=f"Drafting Settlement Response for {risk_type} risk.",
                target_bead="mailjet_sender_bead"
            )
        else:
            # Low value -> Archive and Ignore
            return AgenticAction(
                should_execute=False,
                reason=f"WSJF {wsjf_score} < Threshold {wsjf_threshold}. Archiving.",
                target_bead="archive_bead"
            )
            
    except (json.JSONDecodeError, ValueError, TypeError):
        return AgenticAction(False, "Invalid JSON contract format")
