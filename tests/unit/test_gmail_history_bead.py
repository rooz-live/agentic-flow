import unittest
import base64
import json
from beads_email.gmail_history_bead import parse_pubsub_webhook_bead

class TestGmailHistoryBead(unittest.TestCase):
    
    def test_valid_pubsub_payload(self):
        # Create a mock Google Pub/Sub payload
        inner_payload = json.dumps({
            "emailAddress": "legal@bhop.ti",
            "historyId": 987654321
        })
        b64_data = base64.b64encode(inner_payload.encode('utf-8')).decode('utf-8')
        
        request_body = {
            "message": {
                "data": b64_data,
                "messageId": "msg-12345"
            }
        }
        
        result = parse_pubsub_webhook_bead(request_body)
        self.assertIsNotNone(result)
        self.assertEqual(result.email_address, "legal@bhop.ti")
        self.assertEqual(result.history_id, 987654321)
        self.assertEqual(result.raw_message_id, "msg-12345")
        
    def test_invalid_base64_payload(self):
        request_body = {
            "message": {
                "data": "not-valid-base64-!@#$"
            }
        }
        result = parse_pubsub_webhook_bead(request_body)
        self.assertIsNone(result)
        
    def test_missing_fields_in_payload(self):
        inner_payload = json.dumps({"emailAddress": "test@test.com"}) # Missing historyId
        b64_data = base64.b64encode(inner_payload.encode('utf-8')).decode('utf-8')
        
        request_body = {"message": {"data": b64_data}}
        result = parse_pubsub_webhook_bead(request_body)
        self.assertIsNone(result)

if __name__ == '__main__':
    unittest.main()
