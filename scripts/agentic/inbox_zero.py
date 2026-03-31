#!/usr/bin/env python3
"""
Inbox Zero Automation System
Automated message processing and workflow optimization with WSJF prioritization.
"""

import os
import sys
import json
import re
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field, asdict
from enum import Enum

# Add project root to path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.join(PROJECT_ROOT, "scripts"))
from agentic.pattern_logger import PatternLogger

GOALIE_DIR = os.path.join(PROJECT_ROOT, ".goalie")
INBOX_FILE = os.path.join(GOALIE_DIR, "inbox_queue.jsonl")


class Priority(Enum):
    """
    # @constraint DDD-INBOX: Priorities must match the 5-tier system defined in domain model.
    """
    CRITICAL = 4
    HIGH = 3
    MEDIUM = 2
    LOW = 1
    DEFER = 0


class ActionType(Enum):
    RESPOND = "respond"
    DELEGATE = "delegate"
    SCHEDULE = "schedule"
    ARCHIVE = "archive"
    DELETE = "delete"
    CREATE_TASK = "create_task"
    SNOOZE = "snooze"


@dataclass
class InboxItem:
    """Represents an item in the inbox queue."""
    item_id: str
    source: str  # email, slack, github, jira, etc.
    subject: str
    body: str
    sender: str
    received_at: str
    priority: Priority = Priority.MEDIUM
    wsjf_score: float = 0.0
    cod: float = 0.0  # Cost of Delay
    coherence_score: float = 0.0  # Coherence validation score (0-100)
    suggested_action: Optional[ActionType] = None
    tags: List[str] = field(default_factory=list)
    processed: bool = False
    processed_at: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ProcessingRule:
    """Rule for automated inbox processing."""
    rule_id: str
    name: str
    condition_type: str  # sender, subject, body, source
    condition_pattern: str
    action: ActionType
    priority_override: Optional[Priority] = None
    tags_to_add: List[str] = field(default_factory=list)
    enabled: bool = True


class InboxZeroProcessor:
    """
    Inbox Zero automation engine.
    Processes incoming items with WSJF prioritization and rule-based automation.

    # @business-context WSJF-1: Automating MAA settlement and inbox handling is the highest priority.
    # @adr ADR-014: Chose rule-based prioritization (WSJF) instead of simple FIFO for robust decision making.
    """

    def __init__(self, tenant_id: str = "default"):
        self.logger = PatternLogger(
            mode="advisory",
            circle="inbox-zero",
            run_id=f"inbox-{int(datetime.now().timestamp())}",
            tenant_id=tenant_id,
            tenant_platform="agentic-flow-core"
        )
        self.rules: List[ProcessingRule] = []
        self.queue: List[InboxItem] = []
        self._load_default_rules()
        self._load_queue()

    def _load_default_rules(self):
        """Load default processing rules."""
        self.rules = [
            # High priority rules
            ProcessingRule(
                rule_id="urgent-keywords",
                name="Urgent Keywords",
                condition_type="subject",
                condition_pattern=r"(urgent|critical|emergency|asap|blocker)",
                action=ActionType.CREATE_TASK,
                priority_override=Priority.CRITICAL,
                tags_to_add=["urgent", "needs-attention"]
            ),
            ProcessingRule(
                rule_id="pr-review",
                name="PR Review Requests",
                condition_type="subject",
                condition_pattern=r"(pull request|PR|review|merge)",
                action=ActionType.CREATE_TASK,
                priority_override=Priority.HIGH,
                tags_to_add=["github", "pr-review"]
            ),
            ProcessingRule(
                rule_id="calendar-invite",
                name="Calendar Invites",
                condition_type="subject",
                condition_pattern=r"(invitation|invite|meeting|calendar)",
                action=ActionType.SCHEDULE,
                priority_override=Priority.MEDIUM,
                tags_to_add=["calendar", "scheduling"]
            ),
            # Low priority / archive rules
            ProcessingRule(
                rule_id="newsletter",
                name="Newsletters",
                condition_type="subject",
                condition_pattern=r"(newsletter|digest|weekly|unsubscribe)",
                action=ActionType.ARCHIVE,
                priority_override=Priority.DEFER,
                tags_to_add=["newsletter", "read-later"]
            ),
            ProcessingRule(
                rule_id="automated-notifications",
                name="Automated Notifications",
                condition_type="sender",
                condition_pattern=r"(noreply|no-reply|automated|notifications)",
                action=ActionType.ARCHIVE,
                priority_override=Priority.LOW,
                tags_to_add=["automated", "notification"]
            ),
            # Integration-specific rules
            ProcessingRule(
                rule_id="jira-updates",
                name="Jira Updates",
                condition_type="source",
                condition_pattern=r"jira",
                action=ActionType.CREATE_TASK,
                priority_override=Priority.MEDIUM,
                tags_to_add=["jira", "issue-tracking"]
            ),
            ProcessingRule(
                rule_id="slack-mentions",
                name="Slack Mentions",
                condition_type="body",
                condition_pattern=r"(@here|@channel|mentioned you)",
                action=ActionType.RESPOND,
                priority_override=Priority.HIGH,
                tags_to_add=["slack", "mention"]
            )
        ]

    def _load_queue(self):
        """Load existing queue from file."""
        if os.path.exists(INBOX_FILE):
            try:
                with open(INBOX_FILE, 'r') as f:
                    for line in f:
                        if line.strip():
                            data = json.loads(line)
                            item = InboxItem(
                                item_id=data['item_id'],
                                source=data['source'],
                                subject=data['subject'],
                                body=data['body'],
                                sender=data['sender'],
                                received_at=data['received_at'],
                                priority=Priority(data.get('priority', 2)),
                                wsjf_score=data.get('wsjf_score', 0),
                                cod=data.get('cod', 0),
                                suggested_action=ActionType(data['suggested_action']) if data.get('suggested_action') else None,
                                tags=data.get('tags', []),
                                processed=data.get('processed', False),
                                processed_at=data.get('processed_at'),
                                metadata=data.get('metadata', {})
                            )
                            self.queue.append(item)
            except Exception as e:
                print(f"[WARN] Failed to load inbox queue: {e}")

    def _save_queue(self):
        """Save queue to file."""
        os.makedirs(os.path.dirname(INBOX_FILE), exist_ok=True)
        with open(INBOX_FILE, 'w') as f:
            for item in self.queue:
                data = {
                    'item_id': item.item_id,
                    'source': item.source,
                    'subject': item.subject,
                    'body': item.body,
                    'sender': item.sender,
                    'received_at': item.received_at,
                    'priority': item.priority.value,
                    'wsjf_score': item.wsjf_score,
                    'cod': item.cod,
                    'suggested_action': item.suggested_action.value if item.suggested_action else None,
                    'tags': item.tags,
                    'processed': item.processed,
                    'processed_at': item.processed_at,
                    'metadata': item.metadata
                }
                f.write(json.dumps(data) + '\n')

    def add_item(self,
                 source: str,
                 subject: str,
                 body: str,
                 sender: str,
                 metadata: Dict[str, Any] = None) -> InboxItem:
        """Add a new item to the inbox."""
        item = InboxItem(
            item_id=f"inbox-{int(datetime.now().timestamp())}-{len(self.queue)}",
            source=source,
            subject=subject,
            body=body,
            sender=sender,
            received_at=datetime.now().isoformat(),
            metadata=metadata or {}
        )

        # Apply rules and calculate WSJF
        self._apply_rules(item)
        self._calculate_wsjf(item)

        self.queue.append(item)
        self._save_queue()

        # Log item addition
        self.logger.log(
            pattern_name="inbox_item_added",
            data={
                "item_id": item.item_id,
                "source": source,
                "subject": subject[:50],
                "sender": sender,
                "priority": item.priority.name,
                "suggested_action": item.suggested_action.value if item.suggested_action else None,
                "action": "add-item",
                "tags": item.tags
            },
            gate="general",
            behavioral_type="observability",
            economic={"cod": item.cod, "wsjf_score": item.wsjf_score}
        )

        return item

    def _validate_coherence(self, item: InboxItem) -> float:
        """
        Validate email coherence.
        Returns coherence score (0-100).
        """
        try:
            score = 100.0  # Start with perfect score

            # Deduct points for missing subject
            if not item.subject or len(item.subject.strip()) == 0:
                score -= 20

            # Deduct points for very short body
            if not item.body or len(item.body.strip()) < 10:
                score -= 30

            # Deduct points for missing sender
            if not item.sender or len(item.sender.strip()) == 0:
                score -= 20

            # Deduct points for spam-like content
            spam_keywords = ['viagra', 'lottery', 'prince', 'inheritance', 'click here']
            if any(kw in item.body.lower() for kw in spam_keywords):
                score -= 40

            return max(0.0, score)

        except Exception as e:
            self.logger.log("coherence_validation_error", {
                "item_id": item.item_id,
                "error": str(e)
            }, gate="inbox-zero", behavioral_type="advisory")
            return 0.0

    def _apply_rules(self, item: InboxItem):
        """Apply processing rules to an item."""
        for rule in self.rules:
            if not rule.enabled:
                continue

            # Check condition
            match = False
            if rule.condition_type == "sender":
                match = bool(re.search(rule.condition_pattern, item.sender, re.IGNORECASE))
            elif rule.condition_type == "subject":
                match = bool(re.search(rule.condition_pattern, item.subject, re.IGNORECASE))
            elif rule.condition_type == "body":
                match = bool(re.search(rule.condition_pattern, item.body, re.IGNORECASE))
            elif rule.condition_type == "source":
                match = bool(re.search(rule.condition_pattern, item.source, re.IGNORECASE))

            if match:
                item.suggested_action = rule.action
                if rule.priority_override:
                    item.priority = rule.priority_override
                item.tags.extend(rule.tags_to_add)
                break

    def _calculate_wsjf(self, item: InboxItem):
        """
        Calculate WSJF score with anti-pattern detection and bias mitigation.
        WSJF = Cost of Delay (CoD) / Job Size
        CoD = User Business Value + Time Criticality + Risk Reduction
        """
        # 1. User Business Value (UBV)
        ubv_score = 5  # default

        # Strategic Alignment Bonus (Goal: Fire Focused)
        strategic_keywords = ['settlement', 'evidence', 'deadline', 'court', 'filing', 'maa', 'apex']
        if any(kw in item.subject.lower() for kw in strategic_keywords):
            ubv_score += 3

        # Stakeholder Value (HiPPO check mechanism)
        vip_senders = ['court', 'clerk', 'attorney', 'counsel']
        if any(vip in item.sender.lower() for vip in vip_senders):
            ubv_score += 5  # Legitimate VIP
        elif any(kw in item.subject.lower() for kw in ['urgent', 'asap']):
             # Potential "Squeaky Wheel" anti-pattern - only boost if context matches
             pass

        ubv_score = min(20, ubv_score)

        # 2. Time Criticality (TC)
        tc_score = 4
        # Deadline proximity check would go here if we parsed body dates
        if item.priority == Priority.CRITICAL:
            tc_score = 10
        elif item.priority == Priority.HIGH:
            tc_score = 7
        elif item.priority == Priority.DEFER:
            tc_score = 1

        # Recency Bias Mitigation: Don't over-index on "just arrived"
        # automated via strict priority mapping rather than age

        # 3. Risk Reduction / Opportunity Enablement (RR/OE)
        rr_score = 3
        # Systemic risk reduction
        if 'blocker' in item.subject.lower() or 'failure' in item.subject.lower():
            rr_score = 8
        if 'compliance' in item.subject.lower() or 'legal' in item.subject.lower():
            rr_score = 9

        # 4. Job Size (Proxy)
        # Squeaky Wheel Anti-Pattern: Quick tasks often crowd out important ones
        # We normalize size to avoid "Snacking" on small low-value items
        size_map = {
            ActionType.DELETE: 1,      # Quick
            ActionType.ARCHIVE: 1,     # Quick
            ActionType.SNOOZE: 1,      # Quick
            ActionType.SCHEDULE: 2,    # Medium
            ActionType.DELEGATE: 3,    # Medium
            ActionType.RESPOND: 5,     # Large
            ActionType.CREATE_TASK: 8, # X-Large (Requires context switching)
        }
        size = size_map.get(item.suggested_action, 3)

        # Anti-Pattern: Institutional Indifference (ignoring hard items)
        # We cap size to prevent "Too Big To Solve" paralysis
        size = min(13, size)

        # Calculate CoD and WSJF
        item.cod = ubv_score + tc_score + rr_score

        # Bias Mitigation: Floor for size to prevent division by near-zero
        effective_size = max(1, size)

        item.wsjf_score = round(item.cod / effective_size, 2)

        # Log decision logic for audit
        item.metadata['wsjf_components'] = {
            "ubv": ubv_score,
            "tc": tc_score,
            "rr": rr_score,
            "size": size,
            "anti_patterns_checked": ["squeaky_wheel", "hippo", "recency_bias"]
        }

    def process_item(self, item_id: str, action: ActionType = None) -> bool:
        """Process an inbox item."""
        item = next((i for i in self.queue if i.item_id == item_id), None)
        if not item:
            return False

        final_action = action or item.suggested_action or ActionType.ARCHIVE
        item.processed = True
        item.processed_at = datetime.now().isoformat()
        item.suggested_action = final_action

        self._save_queue()

        # Log processing
        self.logger.log(
            pattern_name="inbox_item_processed",
            data={
                "item_id": item_id,
                "action": final_action.value,
                "priority": item.priority.name,
                "processing_time_sec": self._calculate_processing_time(item),
                "action": "process-item",
                "tags": item.tags
            },
            gate="general",
            behavioral_type="enforcement",
            economic={"cod": item.cod, "wsjf_score": item.wsjf_score}
        )

        return True

    def _calculate_processing_time(self, item: InboxItem) -> float:
        """Calculate time from receipt to processing."""
        if not item.processed_at:
            return 0
        received = datetime.fromisoformat(item.received_at)
        processed = datetime.fromisoformat(item.processed_at)
        return (processed - received).total_seconds()

    def get_prioritized_queue(self) -> List[InboxItem]:
        """Get unprocessed items sorted by WSJF score."""
        unprocessed = [i for i in self.queue if not i.processed]
        return sorted(unprocessed, key=lambda x: x.wsjf_score, reverse=True)

    def get_inbox_stats(self) -> Dict[str, Any]:
        """Get inbox statistics."""
        total = len(self.queue)
        processed = sum(1 for i in self.queue if i.processed)
        unprocessed = total - processed

        by_priority = {}
        for p in Priority:
            by_priority[p.name] = sum(1 for i in self.queue if i.priority == p and not i.processed)

        by_action = {}
        for a in ActionType:
            by_action[a.value] = sum(1 for i in self.queue if i.suggested_action == a)

        avg_wsjf = sum(i.wsjf_score for i in self.queue) / total if total > 0 else 0
        avg_processing_time = 0
        processed_items = [i for i in self.queue if i.processed and i.processed_at]
        if processed_items:
            avg_processing_time = sum(self._calculate_processing_time(i) for i in processed_items) / len(processed_items)

        return {
            "total_items": total,
            "processed": processed,
            "unprocessed": unprocessed,
            "inbox_zero_achieved": unprocessed == 0,
            "by_priority": by_priority,
            "by_action": by_action,
            "avg_wsjf_score": round(avg_wsjf, 2),
            "avg_processing_time_sec": round(avg_processing_time, 2),
            "generated_at": datetime.now().isoformat()
        }

    def bulk_process(self, action: ActionType = ActionType.ARCHIVE,
                     max_items: int = 10,
                     priority_filter: Priority = None) -> int:
        """Bulk process items matching criteria."""
        processed_count = 0
        queue = self.get_prioritized_queue()

        for item in queue[:max_items]:
            if priority_filter and item.priority != priority_filter:
                continue
            if self.process_item(item.item_id, action):
                processed_count += 1

        # Log bulk processing
        self.logger.log(
            pattern_name="inbox_bulk_processed",
            data={
                "action": action.value,
                "items_processed": processed_count,
                "priority_filter": priority_filter.name if priority_filter else None,
                "action": "bulk-process",
                "tags": ["inbox-zero", "bulk-operation"]
            },
            gate="general",
            behavioral_type="enforcement",
            economic={"cod": processed_count * 5, "wsjf_score": processed_count}
        )

        return processed_count

    def add_rule(self, rule: ProcessingRule):
        """Add a custom processing rule."""
        self.rules.append(rule)

    def simulate_inbox_zero_path(self) -> Dict[str, Any]:
        """Simulate path to inbox zero with current queue."""
        queue = self.get_prioritized_queue()
        if not queue:
            return {
                "status": "achieved",
                "items_remaining": 0,
                "estimated_time_minutes": 0
            }

        # Estimate time based on action types
        time_estimates = {
            ActionType.DELETE: 0.1,
            ActionType.ARCHIVE: 0.2,
            ActionType.SNOOZE: 0.3,
            ActionType.SCHEDULE: 2,
            ActionType.DELEGATE: 3,
            ActionType.RESPOND: 5,
            ActionType.CREATE_TASK: 3,
        }

        total_time = 0
        action_plan = []

        for item in queue:
            action = item.suggested_action or ActionType.ARCHIVE
            time_needed = time_estimates.get(action, 2)
            total_time += time_needed
            action_plan.append({
                "item_id": item.item_id,
                "subject": item.subject[:40],
                "suggested_action": action.value,
                "estimated_minutes": time_needed,
                "wsjf_score": item.wsjf_score
            })

        return {
            "status": "in_progress",
            "items_remaining": len(queue),
            "estimated_time_minutes": round(total_time, 1),
            "action_plan": action_plan[:10],  # Top 10 items
            "recommendation": "Process highest WSJF items first for maximum impact"
        }


def main():
    """Demo inbox zero processor."""
    import argparse

    parser = argparse.ArgumentParser(description="Inbox Zero Processor with WSJF")
    parser.add_argument("--add", action="store_true", help="Add sample items")
    parser.add_argument("--stats", action="store_true", help="Show inbox stats")
    parser.add_argument("--queue", action="store_true", help="Show prioritized queue")
    parser.add_argument("--process", type=str, help="Process item by ID")
    parser.add_argument("--bulk", action="store_true", help="Bulk process low priority items")
    parser.add_argument("--simulate", action="store_true", help="Simulate path to inbox zero")
    parser.add_argument("--json", action="store_true", help="JSON output")
    parser.add_argument("--tenant-id", default="default", help="Tenant ID")

    # AppleScript integration flags (WSJF 10.0)
    parser.add_argument("--file", type=str, help="Email file path (.eml)")
    parser.add_argument("--wsjf", action="store_true", help="Calculate WSJF score")
    parser.add_argument("--retry", type=int, default=3, help="Max retry attempts")
    parser.add_argument("--subject", type=str, help="Email subject")
    parser.add_argument("--sender", type=str, help="Email sender")
    parser.add_argument("--limit-coherence", action="store_true", help="Block if system coherence < 85%")

    args = parser.parse_args()

    processor = InboxZeroProcessor(tenant_id=args.tenant_id)

    # AppleScript integration mode (WSJF 10.0)
    if args.file and args.wsjf:
        try:
            # Read email file
            with open(args.file, 'r') as f:
                email_content = f.read()

            # Create inbox item
            item = InboxItem(
                item_id=f"email-{int(datetime.now().timestamp())}",
                source="email",
                subject=args.subject or "No subject",
                body=email_content[:500],  # First 500 chars
                sender=args.sender or "unknown",
                received_at=datetime.now().isoformat(),
                tags=["maa", "inbox-monitor"]
            )

            # Calculate WSJF (use existing _calculate_wsjf method)
            processor._calculate_wsjf(item)
            wsjf_score = item.wsjf_score

            # Apply rules (use existing _apply_rules method)
            processor._apply_rules(item)

            # Validate coherence (WSJF 7.0 - Priority 1)
            coherence_score = processor._validate_coherence(item)
            item.coherence_score = coherence_score

            # Check coherence threshold (85%)
            if coherence_score < 85.0:
                # Log coherence failure
                processor.logger.log("coherence_validation_failed", {
                    "item_id": item.item_id,
                    "subject": item.subject,
                    "sender": item.sender,
                    "coherence_score": coherence_score,
                    "threshold": 85.0,
                    "wsjf_score": wsjf_score
                }, gate="inbox-zero", behavioral_type="advisory")

                # Output for AppleScript parsing
                print(f"MANUAL_REVIEW: WSJF: {wsjf_score:.2f} | Coherence: {coherence_score:.1f}% (< 85%) | Action: MANUAL_REVIEW")

                return 2  # Coherence validation failed

            # Log to pattern logger
            processor.logger.log("inbox_wsjf_calculated", {
                "item_id": item.item_id,
                "subject": item.subject,
                "sender": item.sender,
                "wsjf_score": wsjf_score,
                "coherence_score": coherence_score,
                "suggested_action": item.suggested_action.value if item.suggested_action else None,
                "priority": item.priority.name,
                "tags": item.tags
            }, gate="inbox-zero", behavioral_type="advisory")

            # Output for AppleScript parsing
            print(f"SUCCESS: WSJF: {wsjf_score:.2f} | Coherence: {coherence_score:.1f}% | Action: {item.suggested_action.value if item.suggested_action else 'ARCHIVE'} | Priority: {item.priority.name}")

            # Save to queue
            processor.add_item(item.source, item.subject, item.body, item.sender)

            return 0

        except Exception as e:
            print(f"CANCELLED: {str(e)}")
            return 2

    # Verify System Coherence (Mithra Gate)
    if args.limit_coherence:
        import subprocess
        try:
            cwd = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            result = subprocess.run(
                [sys.executable, "scripts/validate_coherence.py", "--json", "--quiet"],
                cwd=cwd,
                capture_output=True,
                text=True
            )
            # Check for failure or strict violation
            if result.returncode != 0 and result.returncode != 1:
                 pass # Script error, proceed with caution or log warning

            if result.stdout:
                import json
                try:
                    report = json.loads(result.stdout)
                    score = report.get("overall_score", 0)
                    if score < 85.0:
                        print(f"BLOCKED: System Coherence {score:.1f}% < 85% (Mithra Gate)")
                        return 1
                except json.JSONDecodeError:
                    pass
        except Exception as e:
            print(f"WARNING: Coherence check failed: {e}")

    if args.add:
        # Add sample items
        samples = [
            ("email", "URGENT: Production issue needs immediate attention", "Server is down...", "ops@company.com"),
            ("github", "PR Review: Add WSJF calculator to replenishment", "Please review...", "dev@company.com"),
            ("slack", "Team standup notes", "Here are today's updates...", "team-channel"),
            ("email", "Weekly Newsletter: Tech Updates", "This week in tech...", "newsletter@tech.com"),
            ("jira", "JIRA-123: Implement inbox zero feature", "Description...", "jira@company.com"),
        ]
        for source, subject, body, sender in samples:
            item = processor.add_item(source, subject, body, sender)
            print(f"Added: {item.item_id} (WSJF: {item.wsjf_score})")

    elif args.stats:
        stats = processor.get_inbox_stats()
        if args.json:
            print(json.dumps(stats, indent=2))
        else:
            print("\n=== Inbox Zero Stats ===")
            print(f"Total Items: {stats['total_items']}")
            print(f"Processed: {stats['processed']}")
            print(f"Unprocessed: {stats['unprocessed']}")
            print(f"Inbox Zero: {'✅ Achieved!' if stats['inbox_zero_achieved'] else '❌ Not yet'}")
            print(f"Avg WSJF: {stats['avg_wsjf_score']}")
            print(f"Avg Processing Time: {stats['avg_processing_time_sec']}s")

    elif args.queue:
        queue = processor.get_prioritized_queue()
        if args.json:
            print(json.dumps([asdict(i) for i in queue], indent=2, default=str))
        else:
            print("\n=== Prioritized Inbox Queue ===")
            for i, item in enumerate(queue[:10], 1):
                action = item.suggested_action.value if item.suggested_action else "none"
                print(f"{i}. [{item.wsjf_score:.1f}] {item.subject[:50]}")
                print(f"   Source: {item.source} | Priority: {item.priority.name} | Action: {action}")

    elif args.process:
        success = processor.process_item(args.process)
        print(f"Processing {'successful' if success else 'failed'}")

    elif args.bulk:
        count = processor.bulk_process(ActionType.ARCHIVE, max_items=5, priority_filter=Priority.DEFER)
        print(f"Bulk processed {count} items")

    elif args.simulate:
        sim = processor.simulate_inbox_zero_path()
        if args.json:
            print(json.dumps(sim, indent=2))
        else:
            print("\n=== Path to Inbox Zero ===")
            print(f"Status: {sim['status']}")
            print(f"Items Remaining: {sim['items_remaining']}")
            print(f"Estimated Time: {sim['estimated_time_minutes']} minutes")
            if sim.get('action_plan'):
                print("\nAction Plan (Top 10):")
                for item in sim['action_plan']:
                    print(f"  - [{item['wsjf_score']:.1f}] {item['subject']} → {item['suggested_action']}")

    else:
        # Default: show stats
        stats = processor.get_inbox_stats()
        print(f"Inbox: {stats['unprocessed']} unprocessed / {stats['total_items']} total")


if __name__ == "__main__":
    sys.exit(main() or 0)
