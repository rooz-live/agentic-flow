# Slack Webhook Configuration Status

## Webhook URL
`https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXX`

## Status
**TEST VALUE DETECTED** - The webhook URL contains placeholder values (all zeros).

## Action Required
The Slack webhook URL must be updated with a valid production webhook before testing.

## Test Command (for production webhook)
```bash
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Test alert from offhost syslog deployment - Phase 4 monitoring integration"}' \
  $(cat ~/.slack-webhook.txt)
```

## Verification Steps
1. Update ~/.slack-webhook.txt with production webhook URL
2. Run test command above
3. Verify webhook response (should return "ok")
4. Check Slack channel for test message
5. Document results in this file

## Environment Variable Integration
The webhook URL should be configured via environment variable:
- `SLACK_WEBHOOK_URL`: Full webhook URL
- `SLACK_CHANNEL`: Target channel (optional, defaults to webhook's configured channel)
- `SLACK_USERNAME`: Bot username (optional, defaults to "Monitoring System")
- `SLACK_ICON_EMOJI`: Bot icon emoji (optional, defaults to ":robot_face:")

## Security Note
⚠️ Never commit webhook URLs to version control. Use environment variables or secret managers.
