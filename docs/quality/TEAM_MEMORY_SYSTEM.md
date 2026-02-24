# Team Memory System
## Organizational Learning & Knowledge Preservation

### Executive Summary
Persistent memory system for capturing lessons learned, decision rationale, and pattern recognition across the advocacy pipeline. Enables continuous improvement through structured knowledge management with 40-role governance integration.

---

## MEMORY ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      TEAM MEMORY SYSTEM                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  INPUT LAYER              PROCESSING LAYER           STORAGE LAYER       │
│  ┌──────────┐            ┌──────────────┐          ┌──────────────┐     │
│  │ Decisions│───────────▶│ Pattern      │────────▶│ Vector DB    │     │
│  │ Outcomes │            │ Recognition  │          │ (AgentDB)    │     │
│  └──────────┘            └──────────────┘          └──────────────┘     │
│       │                         │                         │            │
│       │                         ▼                         │            │
│  ┌──────────┐            ┌──────────────┐                 │            │
│  │ Mistakes │───────────▶│ Causal       │─────────────────┘            │
│  │          │            │ Analysis     │                              │
│  └──────────┘            └──────────────┘                              │
│       │                         │                                       │
│       │                         ▼                                       │
│  ┌──────────┐            ┌──────────────┐                               │
│  │ Wins     │───────────▶│ Success      │                               │
│  │          │            │ Pattern      │                               │
│  └──────────┘            │ Extraction   │                               │
│                          └──────────────┘                               │
│                                                                         │
│  RETRIEVAL LAYER         APPLICATION LAYER                              │
│  ┌──────────────┐        ┌──────────────┐                              │
│  │ Similarity   │◀───────│ 40-Role      │                              │
│  │ Search       │        │ Recommend-   │                              │
│  │ (Context)    │        │ ations       │                              │
│  └──────────────┘        └──────────────┘                              │
│         │                      │                                       │
│         ▼                      ▼                                       │
│  ┌──────────────┐        ┌──────────────┐                              │
│  │ Temporal     │        │ DoR/DoD      │                              │
│  │ Retrieval    │        │ Enrichment   │                              │
│  │ (Timeline)   │        │              │                              │
│  └──────────────┘        └──────────────┘                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## MEMORY TYPES

### 1. Decision Memory

```python
# memory/decision_memory.py
from dataclasses import dataclass
from datetime import datetime
from typing import List, Dict, Optional
import hashlib

@dataclass
class DecisionMemory:
    """Memory of a decision and its outcome"""
    memory_id: str
    timestamp: datetime
    decision_type: str  # "settlement_offer", "court_filing", "response"
    context: Dict
    options_considered: List[str]
    selected_option: str
    reasoning: str
    participating_roles: List[int]
    consensus_score: float
    
    # Outcome
    outcome: Optional[str] = None  # Filled later
    outcome_timestamp: Optional[datetime] = None
    outcome_assessment: Optional[str] = None  # "success", "partial", "failure"
    
    # Lessons
    lessons_learned: List[str] = None
    what_worked: List[str] = None
    what_failed: List[str] = None
    what_to_try_next: List[str] = None
    
    def __post_init__(self):
        if self.memory_id is None:
            self.memory_id = self._generate_id()
        if self.lessons_learned is None:
            self.lessons_learned = []
        if self.what_worked is None:
            self.what_worked = []
        if self.what_failed is None:
            self.what_failed = []
        if self.what_to_try_next is None:
            self.what_to_try_next = []
    
    def _generate_id(self) -> str:
        """Generate unique memory ID"""
        content = f"{self.timestamp.isoformat()}{self.decision_type}"
        return hashlib.md5(content.encode()).hexdigest()[:12]
    
    def record_outcome(self, outcome: str, assessment: str):
        """Record the outcome of this decision"""
        self.outcome = outcome
        self.outcome_timestamp = datetime.now()
        self.outcome_assessment = assessment
        
        # Auto-generate lessons based on outcome
        if assessment == "success":
            self.what_worked.append(f"Selected option '{self.selected_option}' succeeded")
        elif assessment == "failure":
            self.what_failed.append(f"Selected option '{self.selected_option}' failed")
            self.what_to_try_next.append(f"Consider alternatives: {self.options_considered}")
    
    def to_embedding_text(self) -> str:
        """Convert to text for vector embedding"""
        return f"""
Decision: {self.decision_type}
Context: {self.context}
Selected: {self.selected_option}
Reasoning: {self.reasoning}
Outcome: {self.outcome}
Assessment: {self.outcome_assessment}
Lessons: {', '.join(self.lessons_learned)}
"""


class DecisionMemoryStore:
    """Store for decision memories with retrieval capabilities"""
    
    def __init__(self, vector_db_client=None):
        self.memories: Dict[str, DecisionMemory] = {}
        self.vector_db = vector_db_client
    
    def store(self, memory: DecisionMemory):
        """Store a decision memory"""
        self.memories[memory.memory_id] = memory
        
        # Index in vector DB if available
        if self.vector_db:
            self.vector_db.store(
                id=memory.memory_id,
                text=memory.to_embedding_text(),
                metadata={
                    "timestamp": memory.timestamp.isoformat(),
                    "decision_type": memory.decision_type,
                    "consensus_score": memory.consensus_score,
                    "outcome_assessment": memory.outcome_assessment
                }
            )
    
    def retrieve_similar(self, context: Dict, n: int = 5) -> List[DecisionMemory]:
        """Retrieve similar decisions based on context"""
        if not self.vector_db:
            # Fallback: simple text matching
            return self._text_search(context, n)
        
        # Vector similarity search
        query_text = str(context)
        results = self.vector_db.search(query_text, n=n)
        
        memories = []
        for result in results:
            memory_id = result.get("id")
            if memory_id in self.memories:
                memories.append(self.memories[memory_id])
        
        return memories
    
    def retrieve_by_outcome(self, assessment: str) -> List[DecisionMemory]:
        """Retrieve all memories with specific outcome assessment"""
        return [
            m for m in self.memories.values()
            if m.outcome_assessment == assessment
        ]
    
    def get_success_patterns(self) -> List[Dict]:
        """Extract patterns from successful decisions"""
        successes = self.retrieve_by_outcome("success")
        
        patterns = []
        for memory in successes:
            patterns.append({
                "decision_type": memory.decision_type,
                "selected_option": memory.selected_option,
                "consensus_score": memory.consensus_score,
                "what_worked": memory.what_worked
            })
        
        return patterns
    
    def _text_search(self, context: Dict, n: int) -> List[DecisionMemory]:
        """Simple text-based search fallback"""
        # Simple keyword matching
        matches = []
        context_str = str(context).lower()
        
        for memory in self.memories.values():
            memory_text = memory.to_embedding_text().lower()
            score = sum(1 for word in context_str.split() if word in memory_text)
            matches.append((memory, score))
        
        matches.sort(key=lambda x: x[1], reverse=True)
        return [m[0] for m in matches[:n]]
```

### 2. Mistake Memory

```python
# memory/mistake_memory.py
@dataclass
class MistakeMemory:
    """Memory of mistakes and their lessons"""
    memory_id: str
    timestamp: datetime
    mistake_type: str  # "calculation", "timing", "strategy", "procedural"
    description: str
    consequences: List[str]
    root_cause: str
    
    # Prevention
    prevention_measures: List[str]
    detection_methods: List[str]
    
    # Cultural integration
    share_with_team: bool = True
    training_material: Optional[str] = None
    
    def to_lesson(self) -> str:
        """Convert to shareable lesson"""
        return f"""
LESSON LEARNED: {self.mistake_type}

What happened:
{self.description}

Root cause:
{self.root_cause}

Prevention:
{chr(10).join(f"- {m}" for m in self.prevention_measures)}

Detection:
{chr(10).join(f"- {m}" for m in self.detection_methods)}
"""


class MistakeMemoryStore:
    """Store for mistake memories with pattern detection"""
    
    def __init__(self):
        self.mistakes: List[MistakeMemory] = []
        self.pattern_detector = PatternDetector()
    
    def record_mistake(self, mistake: MistakeMemory):
        """Record a new mistake"""
        self.mistakes.append(mistake)
        
        # Check for patterns
        patterns = self.pattern_detector.analyze(self.mistakes)
        if patterns:
            print(f"Pattern detected: {patterns}")
    
    def get_prevention_checklist(self, task_type: str) -> List[str]:
        """Get prevention checklist for a task type"""
        relevant = [
            m for m in self.mistakes
            if m.mistake_type in task_type or task_type in m.description
        ]
        
        checklist = []
        for m in relevant:
            checklist.extend(m.prevention_measures)
        
        return list(set(checklist))  # Deduplicate
    
    def get_mistake_frequency(self, time_window_days: int = 30) -> Dict:
        """Get mistake frequency analysis"""
        from datetime import timedelta
        
        cutoff = datetime.now() - timedelta(days=time_window_days)
        recent = [m for m in self.mistakes if m.timestamp > cutoff]
        
        by_type = {}
        for m in recent:
            by_type[m.mistake_type] = by_type.get(m.mistake_type, 0) + 1
        
        return {
            "total": len(recent),
            "by_type": by_type,
            "trend": "increasing" if len(recent) > len(self.mistakes) / 2 else "stable"
        }
```

### 3. Win Memory

```python
# memory/win_memory.py
@dataclass
class WinMemory:
    """Memory of wins and success patterns"""
    memory_id: str
    timestamp: datetime
    win_type: str  # "settlement", "filing", "negotiation", "discovery"
    description: str
    
    # Success factors
    key_actions: List[str]
    timing_factors: List[str]
    stakeholder_factors: List[str]
    
    # 40-role contributions
    critical_roles: List[int]
    consensus_at_time: float
    
    # Replicability
    replicable: bool = True
    prerequisites: List[str] = None
    context_dependencies: List[str] = None
    
    def to_playbook(self) -> str:
        """Convert to reusable playbook entry"""
        return f"""
PLAYBOOK: {self.win_type}

Situation:
{self.description}

Key actions that worked:
{chr(10).join(f"{i+1}. {a}" for i, a in enumerate(self.key_actions))}

Timing:
{chr(10).join(f"- {t}" for t in self.timing_factors)}

Stakeholders:
{chr(10).join(f"- {s}" for s in self.stakeholder_factors)}

Prerequisites:
{chr(10).join(f"- {p}" for p in (self.prerequisites or []))}

Replicable: {"Yes" if self.replicable else "Context-dependent"}
"""


class WinMemoryStore:
    """Store for win memories with pattern extraction"""
    
    def __init__(self):
        self.wins: List[WinMemory] = []
    
    def record_win(self, win: WinMemory):
        """Record a win"""
        self.wins.append(win)
    
    def get_playbook_for(self, win_type: str) -> List[str]:
        """Get playbook entries for a win type"""
        relevant = [w for w in self.wins if w.win_type == win_type]
        return [w.to_playbook() for w in relevant if w.replicable]
    
    def extract_success_patterns(self) -> Dict:
        """Extract common success patterns"""
        patterns = {
            "common_key_actions": [],
            "optimal_timing": [],
            "critical_role_frequency": {}
        }
        
        # Analyze all wins
        action_freq = {}
        for win in self.wins:
            for action in win.key_actions:
                action_freq[action] = action_freq.get(action, 0) + 1
            
            for role in win.critical_roles:
                patterns["critical_role_frequency"][role] = \
                    patterns["critical_role_frequency"].get(role, 0) + 1
        
        # Top actions
        patterns["common_key_actions"] = [
            action for action, freq in sorted(
                action_freq.items(), key=lambda x: x[1], reverse=True
            )[:5]
        ]
        
        return patterns
```

---

## INTEGRATION WITH 40-ROLE GOVERNANCE

```python
# memory/governance_integration.py
class GovernanceMemoryIntegration:
    """Integrate memory system with 40-role governance"""
    
    def __init__(self, governance_council, memory_store):
        self.council = governance_council
        self.memory = memory_store
    
    def enrich_decision_context(self, decision_context: Dict) -> Dict:
        """Enrich decision context with relevant memories"""
        
        # Retrieve similar past decisions
        similar = self.memory.retrieve_similar(decision_context, n=3)
        
        # Add lessons to context
        enriched = decision_context.copy()
        enriched["relevant_memories"] = [
            {
                "decision_type": m.decision_type,
                "outcome": m.outcome,
                "assessment": m.outcome_assessment,
                "lessons": m.lessons_learned
            }
            for m in similar
        ]
        
        # Add prevention checklist
        task_type = decision_context.get("task_type", "")
        enriched["prevention_checklist"] = \
            self.memory.get_prevention_checklist(task_type)
        
        # Add success patterns
        enriched["success_patterns"] = \
            self.memory.extract_success_patterns()
        
        return enriched
    
    def record_role_feedback(self, 
                           decision_id: str, 
                           role_id: int, 
                           feedback: str):
        """Record feedback from a specific role"""
        memory = self.memory.memories.get(decision_id)
        if memory:
            memory.lessons_learned.append(f"Role {role_id}: {feedback}")
    
    def generate_role_recommendations(self, role_id: int) -> List[str]:
        """Generate recommendations for a specific role based on memory"""
        
        # Get decisions where this role was critical
        relevant = [
            m for m in self.memory.memories.values()
            if role_id in m.critical_roles
        ]
        
        # Extract patterns for this role
        successes = [m for m in relevant if m.outcome_assessment == "success"]
        failures = [m for m in relevant if m.outcome_assessment == "failure"]
        
        recommendations = []
        
        if successes:
            recommendations.append(
                f"Role {role_id} contributed to {len(successes)} successes. "
                f"Common pattern: {successes[0].what_worked[0] if successes[0].what_worked else 'N/A'}"
            )
        
        if failures:
            recommendations.append(
                f"Role {role_id} present in {len(failures)} failures. "
                f"Consider: {failures[0].what_to_try_next[0] if failures[0].what_to_try_next else 'N/A'}"
            )
        
        return recommendations
```

---

## CLI INTEGRATION

```bash
# Record a decision outcome
advocate memory record-decision \
  --decision-id "dec-20260213-001" \
  --outcome "Doug deferred response until Feb 17" \
  --assessment "partial" \
  --lesson "OOO periods extend negotiation timelines"

# Retrieve similar decisions
advocate memory similar \
  --context "settlement negotiation with deadline" \
  --n 5 \
  --output similar-decisions.json

# Get prevention checklist
advocate memory checklist \
  --task-type "settlement_offer" \
  --output checklist.md

# Generate win playbook
advocate memory playbook \
  --win-type "settlement" \
  --output playbook.md

# Mistake analysis
advocate memory mistakes \
  --time-window 30 \
  --output mistake-report.md

# Record mistake
advocate memory record-mistake \
  --type "timing" \
  --description "Sent counter-offer after deadline passed" \
  --consequence "Lost leverage" \
  --root-cause "Did not account for OOO period" \
  --prevention "Check contact availability before setting deadlines"
```

---

## STORAGE BACKEND

### AgentDB Integration

```python
# memory/agentdb_backend.py
class AgentDBMemoryBackend:
    """AgentDB backend for vector-based memory storage"""
    
    def __init__(self, api_endpoint: str, api_key: str):
        self.endpoint = api_endpoint
        self.api_key = api_key
    
    def store(self, id: str, text: str, metadata: Dict):
        """Store memory in AgentDB"""
        import requests
        
        response = requests.post(
            f"{self.endpoint}/memories",
            headers={"Authorization": f"Bearer {self.api_key}"},
            json={
                "id": id,
                "text": text,
                "metadata": metadata
            }
        )
        response.raise_for_status()
    
    def search(self, query: str, n: int = 5) -> List[Dict]:
        """Search memories by similarity"""
        import requests
        
        response = requests.post(
            f"{self.endpoint}/memories/search",
            headers={"Authorization": f"Bearer {self.api_key}"},
            json={
                "query": query,
                "n_results": n
            }
        )
        response.raise_for_status()
        
        return response.json().get("results", [])
```

### Local File Backend

```python
# memory/file_backend.py
import json
import os
from datetime import datetime

class FileMemoryBackend:
    """File-based memory storage for local use"""
    
    def __init__(self, storage_dir: str = ".memory"):
        self.storage_dir = storage_dir
        os.makedirs(storage_dir, exist_ok=True)
    
    def store(self, id: str, text: str, metadata: Dict):
        """Store memory as JSON file"""
        filepath = os.path.join(self.storage_dir, f"{id}.json")
        
        data = {
            "id": id,
            "text": text,
            "metadata": metadata,
            "stored_at": datetime.now().isoformat()
        }
        
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
    
    def search(self, query: str, n: int = 5) -> List[Dict]:
        """Simple keyword search through files"""
        results = []
        
        for filename in os.listdir(self.storage_dir):
            if filename.endswith('.json'):
                filepath = os.path.join(self.storage_dir, filename)
                
                with open(filepath, 'r') as f:
                    data = json.load(f)
                
                # Simple keyword matching
                score = sum(1 for word in query.lower().split() 
                          if word in data.get("text", "").lower())
                
                if score > 0:
                    results.append({
                        "id": data["id"],
                        "score": score,
                        "metadata": data["metadata"]
                    })
        
        # Sort by score and return top n
        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:n]
```

---

## METRICS

| Metric | Target | Description |
|--------|--------|-------------|
| Storage Capacity | 10K+ memories | Total memories storable |
| Retrieval Time | <100ms | Time to find similar memories |
| Pattern Detection | >80% accuracy | Correctly identify mistake patterns |
| Lesson Reuse | >60% | Decisions using past lessons |
| False Positive | <5% | Incorrect pattern matches |

---

*Team Memory System v1.0*  
*Organizational Learning Pipeline*  
*40-Role Governance Integrated*
