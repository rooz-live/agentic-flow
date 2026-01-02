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
        """Calculate WSJF score for inbox item."""
        # User Business Value (UBV) based on sender importance and keywords
        ubv = 5  # default
        if any(kw in item.subject.lower() for kw in ['customer', 'client', 'revenue', 'contract']):
            ubv = 8
        if any(kw in item.subject.lower() for kw in ['ceo', 'exec', 'board', 'investor']):
            ubv = 10
        
        # Time Criticality (TC) based on priority and age
        tc_map = {
            Priority.CRITICAL: 10,
            Priority.HIGH: 7,
            Priority.MEDIUM: 4,
            Priority.LOW: 2,
            Priority.DEFER: 1
        }
        tc = tc_map.get(item.priority, 4)
        
        # Risk Reduction (RR) - higher for items that could escalate
        rr = 3  # default
        if item.priority in [Priority.CRITICAL, Priority.HIGH]:
            rr = 7
        if 'blocker' in item.subject.lower() or 'escalate' in item.subject.lower():
            rr = 9
        
        # Job Size (effort to process)
        size_map = {
            ActionType.DELETE: 1,
            ActionType.ARCHIVE: 1,
            ActionType.SNOOZE: 1,
            ActionType.SCHEDULE: 2,
            ActionType.DELEGATE: 2,
            ActionType.RESPOND: 3,
            ActionType.CREATE_TASK: 3,
        }
        size = size_map.get(item.suggested_action, 2)
        
        # Calculate CoD and WSJF
        item.cod = ubv + tc + rr
        item.wsjf_score = round(item.cod / size, 2) if size > 0 else 0
    
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
    
    parser = argparse.ArgumentParser(description="Inbox Zero Processor")
    parser.add_argument("--add", action="store_true", help="Add sample items")
    parser.add_argument("--stats", action="store_true", help="Show inbox stats")
    parser.add_argument("--queue", action="store_true", help="Show prioritized queue")
    parser.add_argument("--process", type=str, help="Process item by ID")
    parser.add_argument("--bulk", action="store_true", help="Bulk process low priority items")
    parser.add_argument("--simulate", action="store_true", help="Simulate path to inbox zero")
    parser.add_argument("--json", action="store_true", help="JSON output")
    parser.add_argument("--tenant-id", default="default", help="Tenant ID")
    args = parser.parse_args()
    
    processor = InboxZeroProcessor(tenant_id=args.tenant_id)
    
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
    main()
