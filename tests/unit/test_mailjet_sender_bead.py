import unittest
import json
from beads_email.mailjet_sender_bead import construct_mailjet_payload_bead, MailjetPayload, WholenessMetadata

class TestMailjetSenderBead(unittest.TestCase):
    
    def test_constructs_valid_v3_1_payload_with_headers(self):
        # Create pure atomic state
        metadata = WholenessMetadata(
            wsjf_score=18.5,
            roam_category="MITIGATED",
            risk_type="STRATEGIC",
            phase="PHASE_3"
        )
        
        request = MailjetPayload(
            sender_email="legal@bhop.ti",
            sender_name="Sovereign AI",
            recipient_email="doug.grimes@example.com",
            subject="Settlement Extension Proposal",
            text_part="Please see the attached proposal.",
            html_part="<p>Please see the attached proposal.</p>",
            wholeness_metadata=metadata
        )
        
        payload = construct_mailjet_payload_bead(request)
        
        # Verify Mailjet V3.1 Structure
        self.assertIn("Messages", payload)
        message = payload["Messages"][0]
        self.assertEqual(message["From"]["Email"], "legal@bhop.ti")
        self.assertEqual(message["To"][0]["Email"], "doug.grimes@example.com")
        self.assertEqual(message["Subject"], "Settlement Extension Proposal")
        
        # Verify Wholeness Headers
        headers = message.get("CustomHeaders", {})
        self.assertIn("X-Wholeness-Metadata", headers)
        
        # Verify Metadata parsing
        decoded_metadata = json.loads(headers["X-Wholeness-Metadata"])
        self.assertEqual(decoded_metadata["WSJF-Score"], 18.5)
        self.assertEqual(decoded_metadata["ROAM-State"], "MITIGATED")

if __name__ == '__main__':
    unittest.main()
