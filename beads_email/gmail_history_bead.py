import base64
import json
from dataclasses import dataclass
from typing import Optional, Dict

@dataclass
class GmailWebhookPayload:
    email_address: str
    history_id: int
    raw_message_id: Optional[str] = None

def parse_pubsub_webhook_bead(request_body: Dict) -> Optional[GmailWebhookPayload]:
    """
    ATOMIC BEAD: Gmail Pub/Sub Webhook Parser
    Clean room tested. Extracts the historyId from Google's base64 encoded push notification.
    """
    try:
        # Google Pub/Sub sends data wrapped in a 'message' object
        message = request_body.get('message', {})
        if not message:
            return None
            
        data_base64 = message.get('data')
        if not data_base64:
            return None
            
        # Decode the base64 payload
        decoded_bytes = base64.b64decode(data_base64)
        payload = json.loads(decoded_bytes.decode('utf-8'))
        
        email_address = payload.get('emailAddress')
        history_id = payload.get('historyId')
        
        if not email_address or not history_id:
            return None
            
        return GmailWebhookPayload(
            email_address=email_address,
            history_id=int(history_id),
            raw_message_id=message.get('messageId')
        )
    except (ValueError, TypeError, json.JSONDecodeError, base64.binascii.Error):
        return None
