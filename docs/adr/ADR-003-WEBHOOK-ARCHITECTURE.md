---
date: 2026-03-06
status: accepted
related_tests: TBD
---

# ADR-003: Multi-Platform Webhook Architecture

**Status**: Accepted  
**Date**: 2026-02-24  
**Context**: Phase 3 Implementation  

---

## Context

Advocate CLI needs real-time notifications across multiple platforms (Discord, Telegram, X, GitHub) for:
- Trial countdown alerts (6 days to Trial #1)
- PDF classification results
- Evidence bundle status
- API cost monitoring

### Requirements

1. **Platform Diversity**: Support 4+ notification channels
2. **Graceful Degradation**: Single platform failure doesn't block workflow
3. **Consistent Format**: Unified message structure across platforms
4. **Low Latency**: Notifications sent within <1 second
5. **Cost Efficiency**: Use webhooks (no polling)

---

## Decision

Implement **platform-specific notifier classes** with:

1. **Common Interface**:
```python
class BaseNotifier(ABC):
    @abstractmethod
    def send_classification_notification(self, result: Dict) -> bool: ...
    
    @abstractmethod
    def send_trial_countdown(self, trials: List) -> bool: ...
    
    @abstractmethod
    def send_evidence_bundle_status(self, status: Dict) -> bool: ...
```

2. **Platform Adapters**:
   - `DiscordNotifier` - Rich embeds with color coding
   - `TelegramNotifier` - Markdown formatting
   - `XNotifier` - 280-char constraint handling
   - `GitHubNotifier` - Issue/PR comments

3. **Fanout Pattern**:
```python
def notify_all_platforms(message_type: str, data: Dict):
    platforms = [Discord(), Telegram(), X(), GitHub()]
    for platform in platforms:
        try:
            platform.send(message_type, data)
        except Exception:
            log_and_continue()  # Don't block other platforms
```

---

## Rationale

### Why Not a Unified Abstraction?

**Rejected**: Single `Notifier` class with platform parameter
- Discord embeds ≠ Telegram markdown ≠ X thread ≠ GitHub issue
- Each platform has unique capabilities (embeds, inline buttons, threads)
- Forcing abstraction would limit platform-specific features

### Why Webhooks Over API Polling?

**Accepted**: Webhooks for all platforms
- Discord: Native webhook support
- Telegram: Bot API with `sendMessage`
- X: API v2 with OAuth 2.0
- GitHub: Webhooks + Octokit

**Benefits**:
- No polling overhead
- Real-time delivery
- Lower API costs

### Why Fanout Instead of Queue?

**Accepted**: Immediate fanout to all platforms
- Trial alerts are **time-critical** (6 days to Trial #1!)
- Queueing adds latency (50-200ms per platform)
- Failure isolation via try/except

**Trade-off**: Slight risk of duplicate notifications if retry logic is naive

---

## Consequences

### Positive

1. **Platform Independence**: Add new platforms without changing core logic
2. **Rich Formatting**: Each platform uses native capabilities (embeds, markdown, threads)
3. **Fast Delivery**: Parallel fanout completes in <1 second
4. **Testability**: Mock each platform independently

### Negative

1. **Code Duplication**: Similar logic in each notifier (message formatting)
2. **Maintenance Overhead**: 4+ classes to update when message schema changes
3. **Credential Management**: 4+ sets of API keys/webhooks to secure

### Mitigations

1. **Shared Utilities**:
```python
def format_confidence(confidence: float) -> str:
    """Shared formatting logic"""
    return f"{confidence:.1%}"
```

2. **Schema Validation**:
```python
from pydantic import BaseModel

class ClassificationResult(BaseModel):
    type: str
    confidence: float
    case_number: Optional[str]
```

3. **Centralized Secrets**:
```bash
# ~/.advocate/config.json
{
  "webhooks": {
    "discord": "https://discord.com/api/webhooks/...",
    "telegram_token": "...",
    "telegram_chat_id": "..."
  }
}
```

---

## Implementation Checklist

- [x] Discord webhook integration
- [x] Telegram bot API integration
- [ ] X (Twitter) API v2 integration
- [ ] GitHub issue/PR comment integration
- [ ] Fanout orchestrator (`advocate notify --platforms all`)
- [ ] Error handling + retry logic
- [ ] Credential validation on startup
- [ ] Integration tests with mocked APIs

---

## Alternatives Considered

### Alternative 1: Third-Party Service (Zapier, IFTTT)

**Rejected**:
- External dependency (single point of failure)
- Cost ($20-$50/month for webhook volume)
- Latency (webhook → Zapier → platform = 500ms-2s)
- Limited customization (no access to platform-specific features)

### Alternative 2: Message Queue (RabbitMQ, Kafka)

**Rejected**:
- Over-engineering for single-user CLI
- Infrastructure overhead (running broker)
- Overkill for <10 notifications/day

### Alternative 3: Unified Notification Service (AWS SNS)

**Rejected**:
- Requires AWS infrastructure
- Cost ($0.50 per million notifications, but adds AWS bill)
- Still need platform adapters anyway

---

## Verification

### TDD Tests

```python
def test_discord_webhook_success():
    notifier = DiscordNotifier(webhook_url="https://test.webhook")
    result = {"type": "order", "confidence": 0.85, "provider": "anthropic"}
    
    with mock.patch("requests.post") as mock_post:
        mock_post.return_value.status_code = 200
        assert notifier.send_classification_notification(result) == True

def test_telegram_markdown_formatting():
    notifier = TelegramNotifier(bot_token="test", chat_id="123")
    result = {"type": "motion", "confidence": 0.92}
    
    # Should format with Markdown bold/italic
    message = notifier._format_classification(result)
    assert "*Type*: MOTION" in message
    assert "*Confidence*: 92.0%" in message
```

### VDD (Verification-Driven Development)

**Acceptance Criteria**:
1. ✅ Discord webhook sends embed within 500ms
2. ✅ Telegram bot formats message with Markdown
3. ⏳ X API posts tweet within 280 chars
4. ⏳ GitHub creates issue with classification result

---

## References

- Discord Webhooks: https://discord.com/developers/docs/resources/webhook
- Telegram Bot API: https://core.telegram.org/bots/api
- X API v2: https://developer.x.com/en/docs/twitter-api
- GitHub Webhooks: https://docs.github.com/webhooks

---

**Decision Maker**: Shahrooz Bhopti (Pro Se Litigant)  
**Stakeholders**: Trial #1 (Habitability claim, $43K-$113K exposure)  
**Co-Authored-By**: Oz <oz-agent@warp.dev>
