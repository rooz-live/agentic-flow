from dataclasses import dataclass
from typing import Dict, List, Optional
import json

@dataclass
class WholenessMetadata:
    wsjf_score: float
    roam_category: str
    risk_type: str
    phase: str

@dataclass
class MailjetPayload:
    sender_email: str
    sender_name: str
    recipient_email: str
    subject: str
    text_part: str
    html_part: str
    wholeness_metadata: WholenessMetadata

def construct_mailjet_payload_bead(data: MailjetPayload) -> Dict:
    """
    ATOMIC BEAD: Mailjet Payload Constructor
    Clean room tested. Constructs the exact JSON payload required by Mailjet API v3.1
    and automatically injects Wholeness Metadata as custom headers.
    """
    
    # Serialize metadata for headers
    metadata_json = json.dumps({
        "WSJF-Score": data.wholeness_metadata.wsjf_score,
        "ROAM-State": data.wholeness_metadata.roam_category,
        "Risk-Type": data.wholeness_metadata.risk_type,
        "Governance-Phase": data.wholeness_metadata.phase
    })

    return {
        "Messages": [
            {
                "From": {
                    "Email": data.sender_email,
                    "Name": data.sender_name
                },
                "To": [
                    {
                        "Email": data.recipient_email,
                        "Name": "Recipient"
                    }
                ],
                "Subject": data.subject,
                "TextPart": data.text_part,
                "HTMLPart": data.html_part,
                "CustomHeaders": {
                    "X-Wholeness-Metadata": metadata_json
                }
            }
        ]
    }
