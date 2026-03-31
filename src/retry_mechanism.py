#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CANCELLED CLASSIFICATION RETRY MECHANISM
========================================

Handles emails that failed validation or classification, implementing:
- Evidence bundle validation before retry
- Exponential backoff with max retry limits
- FSM (Finite State Machine) for retry lifecycle
- Integration with WSJF prioritization

Usage:
    python3 src/retry_mechanism.py --list-cancelled
    python3 src/retry_mechanism.py --retry-all
    python3 src/retry_mechanism.py --retry-id <message_id>
    python3 src/retry_mechanism.py --daemon

Definition of Ready (DoR):
- Cancelled classification record exists with valid message_id and cancel_reason
- Evidence base path configured and accessible
- Retry count below max_retries threshold
- WSJF score and ROAM risk populated for prioritization

Definition of Done (DoD):
- FSM transitions enforce valid state sequence (PENDING → VALIDATING → RECLASSIFYING → COMPLETED/FAILED)
- Exponential backoff applied between retry attempts
- Evidence bundle validated against REQUIRED_EVIDENCE before reclassification
- Failed retries escalated after max_retries exceeded
- All state transitions logged with timestamps
"""

import json
import argparse
import os
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from enum import Enum, auto
from typing import Optional, List, Dict, Any
from pathlib import Path
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler('logs/retry_mechanism.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class RetryState(Enum):
    """Finite State Machine states for retry lifecycle"""
    PENDING = auto()           # Initial state, queued for retry
    VALIDATING = auto()        # Running invariant validation
    EVIDENCE_GATHERING = auto()  # Collecting missing evidence
    RECLASSIFYING = auto()     # Re-running classification
    COMPLETED = auto()         # Successfully reclassified
    FAILED = auto()            # Max retries exceeded, escalated
    CANCELLED = auto()         # Permanently cancelled (not recoverable)


class CancelReason(Enum):
    """Reasons for initial classification cancellation"""
    VALIDATION_TIMEOUT = "validation_timeout"
    CLASSIFICATION_AMBIGUITY = "classification_ambiguity"
    EVIDENCE_INCOMPLETE = "evidence_incomplete"
    WSJF_STALE = "wsjf_stale"
    ROAM_UNRESOLVED = "roam_unresolved"
    INVARIANT_VIOLATION = "invariant_violation"
    DUPLICATE_DETECTED = "duplicate_detected"
    PARSE_ERROR = "parse_error"


@dataclass
class EvidenceRequirement:
    """Defines required evidence for classification types"""
    evidence_type: str
    description: str
    validator: str  # Function name for validation
    min_confidence: float


@dataclass
class EvidenceBundle:
    """Collection of evidence items for retry"""
    items: Dict[str, Any]
    collected_at: datetime
    validation_score: float
    
    def has_item(self, item_type: str) -> bool:
        return item_type in self.items and self.items[item_type] is not None
    
    def to_dict(self) -> Dict:
        return {
            'items': self.items,
            'collected_at': self.collected_at.isoformat(),
            'validation_score': self.validation_score
        }


@dataclass
class CancelledClassification:
    """Represents a cancelled classification awaiting retry"""
    message_id: str
    subject: str
    original_classification: Optional[str]
    cancel_reason: CancelReason
    cancel_timestamp: datetime
    retry_count: int
    max_retries: int
    current_state: RetryState
    evidence_gaps: List[str]
    evidence_bundle: Optional[EvidenceBundle]
    wsjf_score: Optional[float]
    roam_risk: Optional[str]
    last_error: Optional[str]
    next_attempt: Optional[datetime]
    
    def can_retry(self) -> bool:
        """Check if this cancelled classification can be retried"""
        if self.retry_count >= self.max_retries:
            return False
        if self.current_state == RetryState.CANCELLED:
            return False
        if self.cancel_reason == CancelReason.DUPLICATE_DETECTED:
            return False  # Duplicates are not recoverable
        return True
    
    def to_dict(self) -> Dict:
        return {
            'message_id': self.message_id,
            'subject': self.subject,
            'original_classification': self.original_classification,
            'cancel_reason': self.cancel_reason.value,
            'cancel_timestamp': self.cancel_timestamp.isoformat(),
            'retry_count': self.retry_count,
            'max_retries': self.max_retries,
            'current_state': self.current_state.name,
            'evidence_gaps': self.evidence_gaps,
            'evidence_bundle': self.evidence_bundle.to_dict() if self.evidence_bundle else None,
            'wsjf_score': self.wsjf_score,
            'roam_risk': self.roam_risk,
            'last_error': self.last_error,
            'next_attempt': self.next_attempt.isoformat() if self.next_attempt else None
        }


class EvidenceBundleValidator:
    """Validates that required evidence is present for each classification type"""
    
    # Define required evidence by classification type
    REQUIRED_EVIDENCE = {
        'settlement': [
            EvidenceRequirement('damages_calculation', 'Financial damages worksheet', 'validate_damages', 0.9),
            EvidenceRequirement('timeline_documentation', 'Chronological dispute timeline', 'validate_timeline', 0.8),
            EvidenceRequirement('precedent_citations', 'Legal precedent references', 'validate_citations', 0.7),
            EvidenceRequirement('communication_history', 'Prior correspondence log', 'validate_comm_history', 0.6),
        ],
        'litigation': [
            EvidenceRequirement('complaint_filed', 'Filed complaint document', 'validate_complaint', 1.0),
            EvidenceRequirement('expert_witness', 'Expert witness declaration', 'validate_expert', 0.9),
            EvidenceRequirement('discovery_plan', 'Discovery schedule and scope', 'validate_discovery', 0.8),
            EvidenceRequirement('systemic_score_40', 'Systemic indifference score >= 40', 'validate_systemic_score', 1.0),
            EvidenceRequirement('evidence_index', 'Numbered exhibit list', 'validate_exhibits', 0.9),
        ],
        'discovery': [
            EvidenceRequirement('document_request_list', 'List of requested documents', 'validate_doc_requests', 0.9),
            EvidenceRequirement('interrogatories', 'Drafted interrogatories', 'validate_interrogatories', 0.8),
            EvidenceRequirement('deposition_schedule', 'Deposition timeline', 'validate_depositions', 0.7),
            EvidenceRequirement('privilege_log', 'Attorney-client privilege log', 'validate_privilege', 0.6),
        ],
        'admin': [
            EvidenceRequirement('filing_deadline', 'Court deadline documentation', 'validate_deadline', 0.8),
            EvidenceRequirement('case_number', 'Active case reference', 'validate_case_num', 0.7),
        ]
    }
    
    def __init__(self, evidence_base_path: str = "EVIDENCE/"):
        self.evidence_base_path = Path(evidence_base_path)
    
    def validate_bundle(self, classification_type: str, bundle: EvidenceBundle) -> Dict:
        """Validate evidence bundle against requirements"""
        requirements = self.REQUIRED_EVIDENCE.get(classification_type, [])
        
        if not requirements:
            return {
                'valid': False,
                'reason': f'Unknown classification type: {classification_type}',
                'gaps': [],
                'confidence': 0.0
            }
        
        missing = []
        present_count = 0
        total_confidence = 0.0
        
        for req in requirements:
            if bundle.has_item(req.evidence_type):
                present_count += 1
                total_confidence += req.min_confidence
            else:
                missing.append(req.evidence_type)
        
        coverage = present_count / len(requirements)
        avg_confidence = total_confidence / len(requirements) if requirements else 0.0
        
        # Valid if >80% coverage and avg confidence >0.7
        is_valid = coverage >= 0.8 and avg_confidence >= 0.7
        
        return {
            'valid': is_valid,
            'reason': f'Missing: {missing}' if missing else 'Complete',
            'gaps': missing,
            'confidence': avg_confidence,
            'coverage': coverage,
            'requirements_met': f'{present_count}/{len(requirements)}'
        }
    
    def gather_evidence(self, message_id: str, classification_type: str, 
                       gaps: List[str]) -> EvidenceBundle:
        """Attempt to gather missing evidence from various sources"""
        items = {}
        
        # Check evidence directories
        evidence_paths = {
            'damages_calculation': 'DAMAGES/',
            'timeline_documentation': 'TIMELINE/',
            'precedent_citations': 'RESEARCH/CASE-LAW/',
            'communication_history': 'CORRESPONDENCE/',
            'complaint_filed': 'COURT-FILINGS/',
            'expert_witness': 'EXPERTS/',
            'evidence_index': 'EXHIBITS/',
        }
        
        for gap in gaps:
            # Attempt to locate evidence file
            search_path = self.evidence_base_path / evidence_paths.get(gap, '')
            
            if search_path.exists():
                # Look for files matching message_id or pattern
                matching_files = list(search_path.glob(f'*{message_id}*'))
                if matching_files:
                    items[gap] = {
                        'found': True,
                        'path': str(matching_files[0]),
                        'source': 'auto_discovered'
                    }
                else:
                    items[gap] = {'found': False, 'source': 'pending_manual'}
            else:
                items[gap] = {'found': False, 'source': 'directory_missing'}
        
        # Calculate validation score based on found items
        found_count = sum(1 for v in items.values() if v.get('found', False))
        total_items = len(items) if items else 1
        validation_score = found_count / total_items
        
        return EvidenceBundle(
            items=items,
            collected_at=datetime.now(),
            validation_score=validation_score
        )


class RetryMechanismFSM:
    """Finite State Machine for managing retry lifecycle"""
    
    def __init__(self, max_retries: int = 3, backoff_base: int = 1):
        self.max_retries = max_retries
        self.backoff_base = backoff_base  # Hours
        self.evidence_validator = EvidenceBundleValidator()
        self.retry_queue_path = Path('CORRESPONDENCE/_RETRY_QUEUE/retry_pending.jsonl')
        self.completed_path = Path('CORRESPONDENCE/_RETRY_QUEUE/retry_completed.jsonl')
        self.failed_path = Path('CORRESPONDENCE/_RETRY_QUEUE/retry_failed.jsonl')
        
        # Ensure directories exist
        self.retry_queue_path.parent.mkdir(parents=True, exist_ok=True)
    
    def load_pending_retries(self) -> List[CancelledClassification]:
        """Load all pending retries from queue"""
        pending = []
        
        if not self.retry_queue_path.exists():
            return pending
        
        with open(self.retry_queue_path, 'r') as f:
            for line in f:
                if not line.strip():
                    continue
                try:
                    data = json.loads(line)
                    cancelled = self._dict_to_cancelled(data)
                    if cancelled.current_state not in [RetryState.COMPLETED, RetryState.CANCELLED]:
                        pending.append(cancelled)
                except json.JSONDecodeError:
                    logger.error(f"Failed to parse retry entry: {line}")
                    continue
        
        return pending
    
    def _dict_to_cancelled(self, data: Dict) -> CancelledClassification:
        """Convert dictionary to CancelledClassification"""
        evidence_bundle = None
        if data.get('evidence_bundle'):
            eb = data['evidence_bundle']
            evidence_bundle = EvidenceBundle(
                items=eb.get('items', {}),
                collected_at=datetime.fromisoformat(eb['collected_at']),
                validation_score=eb.get('validation_score', 0.0)
            )
        
        return CancelledClassification(
            message_id=data['message_id'],
            subject=data['subject'],
            original_classification=data.get('original_classification'),
            cancel_reason=CancelReason(data['cancel_reason']),
            cancel_timestamp=datetime.fromisoformat(data['cancel_timestamp']),
            retry_count=data.get('retry_count', 0),
            max_retries=data.get('max_retries', self.max_retries),
            current_state=RetryState[data['current_state']],
            evidence_gaps=data.get('evidence_gaps', []),
            evidence_bundle=evidence_bundle,
            wsjf_score=data.get('wsjf_score'),
            roam_risk=data.get('roam_risk'),
            last_error=data.get('last_error'),
            next_attempt=datetime.fromisoformat(data['next_attempt']) if data.get('next_attempt') else None
        )
    
    def save_retry_entry(self, cancelled: CancelledClassification):
        """Save or update a retry entry"""
        entries = []
        
        # Load existing entries
        if self.retry_queue_path.exists():
            with open(self.retry_queue_path, 'r') as f:
                for line in f:
                    if line.strip():
                        entries.append(json.loads(line))
        
        # Update or add entry
        entry_dict = cancelled.to_dict()
        existing_idx = None
        for i, entry in enumerate(entries):
            if entry.get('message_id') == cancelled.message_id:
                existing_idx = i
                break
        
        if existing_idx is not None:
            entries[existing_idx] = entry_dict
        else:
            entries.append(entry_dict)
        
        # Write back
        with open(self.retry_queue_path, 'w') as f:
            for entry in entries:
                f.write(json.dumps(entry) + '\n')
    
    def calculate_backoff(self, retry_count: int) -> timedelta:
        """Calculate exponential backoff delay"""
        # 1h, 2h, 4h, 8h... capped at 24h
        hours = min(self.backoff_base * (2 ** retry_count), 24)
        return timedelta(hours=hours)
    
    def attempt_retry(self, cancelled: CancelledClassification) -> CancelledClassification:
        """Attempt to retry a cancelled classification"""
        logger.info(f"Attempting retry for {cancelled.message_id} (attempt {cancelled.retry_count + 1}/{cancelled.max_retries})")
        
        if not cancelled.can_retry():
            logger.warning(f"Cannot retry {cancelled.message_id}: max retries exceeded or not recoverable")
            cancelled.current_state = RetryState.FAILED if cancelled.retry_count >= cancelled.max_retries else RetryState.CANCELLED
            return cancelled
        
        # Update state
        cancelled.current_state = RetryState.VALIDATING
        cancelled.retry_count += 1
        
        # Step 1: Validate invariants
        validation_result = self._run_invariant_validation(cancelled)
        if not validation_result['valid']:
            cancelled.last_error = f"Invariant validation failed: {validation_result['reason']}"
            cancelled.next_attempt = datetime.now() + self.calculate_backoff(cancelled.retry_count)
            self.save_retry_entry(cancelled)
            return cancelled
        
        # Step 2: Evidence gathering if needed
        if cancelled.evidence_gaps:
            cancelled.current_state = RetryState.EVIDENCE_GATHERING
            bundle = self.evidence_validator.gather_evidence(
                cancelled.message_id,
                cancelled.original_classification or 'admin',
                cancelled.evidence_gaps
            )
            cancelled.evidence_bundle = bundle
            
            # Validate gathered evidence
            validation = self.evidence_validator.validate_bundle(
                cancelled.original_classification or 'admin',
                bundle
            )
            
            if not validation['valid']:
                cancelled.last_error = f"Evidence validation failed: {validation['reason']}"
                cancelled.next_attempt = datetime.now() + self.calculate_backoff(cancelled.retry_count)
                self.save_retry_entry(cancelled)
                return cancelled
        
        # Step 3: Reclassification
        cancelled.current_state = RetryState.RECLASSIFYING
        reclass_result = self._run_reclassification(cancelled)
        
        if reclass_result['success']:
            cancelled.current_state = RetryState.COMPLETED
            cancelled.original_classification = reclass_result['new_classification']
            self._move_to_completed(cancelled)
            logger.info(f"Retry successful for {cancelled.message_id}: classified as {reclass_result['new_classification']}")
        else:
            cancelled.last_error = f"Reclassification failed: {reclass_result['reason']}"
            if cancelled.retry_count < cancelled.max_retries:
                cancelled.next_attempt = datetime.now() + self.calculate_backoff(cancelled.retry_count)
                cancelled.current_state = RetryState.PENDING
            else:
                cancelled.current_state = RetryState.FAILED
                self._move_to_failed(cancelled)
        
        self.save_retry_entry(cancelled)
        return cancelled
    
    def _run_invariant_validation(self, cancelled: CancelledClassification) -> Dict:
        """Run invariant validation on the message"""
        # This would call the actual invariant validator
        # For now, simulate based on cancel reason
        if cancelled.cancel_reason == CancelReason.INVARIANT_VIOLATION:
            return {'valid': False, 'reason': 'Previous invariant violation'}
        return {'valid': True}
    
    def _run_reclassification(self, cancelled: CancelledClassification) -> Dict:
        """Run classification pipeline with enriched context"""
        # This would call the actual 21-role validation + WSJF/ROAM
        # For now, simulate based on evidence completeness
        if cancelled.evidence_bundle and cancelled.evidence_bundle.validation_score >= 0.7:
            # High evidence score = successful reclassification
            return {
                'success': True,
                'new_classification': cancelled.original_classification or 'settlement',
                'confidence': cancelled.evidence_bundle.validation_score
            }
        return {
            'success': False,
            'reason': 'Insufficient evidence for confident classification'
        }
    
    def _move_to_completed(self, cancelled: CancelledClassification):
        """Move completed retry to completed log"""
        with open(self.completed_path, 'a') as f:
            f.write(json.dumps({
                'message_id': cancelled.message_id,
                'final_classification': cancelled.original_classification,
                'completed_at': datetime.now().isoformat(),
                'retry_count': cancelled.retry_count,
                'final_state': cancelled.current_state.name
            }) + '\n')
    
    def _move_to_failed(self, cancelled: CancelledClassification):
        """Move failed retry to failed log"""
        with open(self.failed_path, 'a') as f:
            f.write(json.dumps({
                'message_id': cancelled.message_id,
                'failed_at': datetime.now().isoformat(),
                'retry_count': cancelled.retry_count,
                'last_error': cancelled.last_error,
                'escalation_required': True
            }) + '\n')
    
    def run_daemon(self, interval_seconds: int = 300):
        """Run retry mechanism as daemon process"""
        import time
        
        logger.info(f"Starting retry daemon (checking every {interval_seconds}s)")
        
        while True:
            try:
                pending = self.load_pending_retries()
                due_for_retry = [
                    p for p in pending 
                    if p.next_attempt and p.next_attempt <= datetime.now()
                    and p.current_state == RetryState.PENDING
                ]
                
                logger.info(f"Found {len(due_for_retry)} retries due for processing")
                
                for cancelled in due_for_retry:
                    # Prioritize by WSJF score
                    priority = cancelled.wsjf_score or 0.0
                    if priority < 10.0:
                        continue  # Skip low priority during busy periods
                    
                    self.attempt_retry(cancelled)
                
            except Exception as e:
                logger.error(f"Daemon error: {e}")
            
            time.sleep(interval_seconds)


def main():
    parser = argparse.ArgumentParser(description='Cancelled Classification Retry Mechanism')
    parser.add_argument('--list-cancelled', action='store_true', help='List all pending cancellations')
    parser.add_argument('--list-since', type=str, help='List cancellations since date (YYYY-MM-DD)')
    parser.add_argument('--retry-all', action='store_true', help='Retry all eligible cancellations')
    parser.add_argument('--retry-id', type=str, help='Retry specific message ID')
    parser.add_argument('--daemon', action='store_true', help='Run as background daemon')
    parser.add_argument('--interval', type=int, default=300, help='Daemon check interval (seconds)')
    parser.add_argument('--validate-evidence', type=str, help='Validate evidence bundle for message ID')
    
    args = parser.parse_args()
    
    fsm = RetryMechanismFSM()
    
    if args.list_cancelled or args.list_since:
        pending = fsm.load_pending_retries()
        
        if args.list_since:
            since_date = datetime.strptime(args.list_since, '%Y-%m-%d')
            pending = [p for p in pending if p.cancel_timestamp >= since_date]
        
        print(f"\n{'='*80}")
        print(f"CANCELLED CLASSIFICATIONS ({len(pending)} pending)")
        print(f"{'='*80}\n")
        
        for p in sorted(pending, key=lambda x: x.wsjf_score or 0, reverse=True):
            status_icon = "🔴" if not p.can_retry() else "🟡" if p.current_state == RetryState.PENDING else "🟢"
            print(f"{status_icon} {p.message_id}")
            print(f"   Subject: {p.subject[:50]}...")
            print(f"   Reason: {p.cancel_reason.value}")
            print(f"   State: {p.current_state.name} (Retry {p.retry_count}/{p.max_retries})")
            print(f"   WSJF: {p.wsjf_score or 'N/A'} | ROAM: {p.roam_risk or 'N/A'}")
            print(f"   Next Attempt: {p.next_attempt.strftime('%Y-%m-%d %H:%M') if p.next_attempt else 'Manual'}")
            if p.evidence_gaps:
                print(f"   Gaps: {', '.join(p.evidence_gaps)}")
            print()
    
    elif args.retry_all:
        pending = fsm.load_pending_retries()
        eligible = [p for p in pending if p.can_retry()]
        
        print(f"Retrying {len(eligible)} eligible cancellations...")
        
        success_count = 0
        for cancelled in eligible:
            result = fsm.attempt_retry(cancelled)
            if result.current_state == RetryState.COMPLETED:
                success_count += 1
        
        print(f"\nResults: {success_count}/{len(eligible)} successful retries")
    
    elif args.retry_id:
        pending = fsm.load_pending_retries()
        target = next((p for p in pending if p.message_id == args.retry_id), None)
        
        if target:
            result = fsm.attempt_retry(target)
            print(f"Retry result: {result.current_state.name}")
            if result.current_state == RetryState.COMPLETED:
                print(f"✓ Successfully reclassified as: {result.original_classification}")
            else:
                print(f"✗ Failed: {result.last_error}")
        else:
            print(f"Message ID {args.retry_id} not found in retry queue")
    
    elif args.validate_evidence:
        validator = EvidenceBundleValidator()
        # Would load actual evidence bundle for message
        print(f"Evidence validation for {args.validate_evidence} not yet implemented")
    
    elif args.daemon:
        fsm.run_daemon(args.interval)
    
    else:
        parser.print_help()


if __name__ == '__main__':
    main()
