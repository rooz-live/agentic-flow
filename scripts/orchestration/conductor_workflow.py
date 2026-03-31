#!/usr/bin/env python3
"""Google Conductor-Style Context-Driven Development Workflow.

Implements the Conductor pattern (2025-12-17):
- Context-driven development with persistent Markdown specs
- Workflow: setup → newTrack → implement
- Matches the .goalie pattern approach for governance

Reference: Google Research Conductor (2025-12-17)
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional

PROJECT_ROOT = Path(__file__).resolve().parents[2]
GOALIE_DIR = PROJECT_ROOT / ".goalie"


class WorkflowPhase(Enum):
    """Conductor workflow phases."""
    SETUP = "setup"
    NEW_TRACK = "newTrack"
    IMPLEMENT = "implement"
    VERIFY = "verify"
    COMPLETE = "complete"


@dataclass
class ConductorSpec:
    """Persistent Markdown spec (Conductor pattern)."""
    id: str
    title: str
    description: str
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    phase: WorkflowPhase = WorkflowPhase.SETUP
    tracks: List[Dict[str, Any]] = field(default_factory=list)
    context: Dict[str, Any] = field(default_factory=dict)
    
    def to_markdown(self) -> str:
        """Generate persistent Markdown spec (Conductor format)."""
        lines = [
            f"# {self.title}",
            "",
            f"> Spec ID: {self.id}",
            f"> Phase: {self.phase.value}",
            f"> Created: {self.created_at}",
            "",
            "## Description",
            self.description,
            "",
            "## Tracks",
        ]
        
        for i, track in enumerate(self.tracks, 1):
            status = "✅" if track.get("complete") else "🔄" if track.get("in_progress") else "⬜"
            lines.append(f"{i}. {status} **{track.get('name', 'Unnamed')}**: {track.get('description', '')}")
        
        if self.context:
            lines.extend(["", "## Context", "```json"])
            lines.append(json.dumps(self.context, indent=2))
            lines.append("```")
        
        return "\n".join(lines)


class ConductorWorkflow:
    """Manages Conductor-style context-driven workflows."""
    
    def __init__(self, specs_dir: Optional[Path] = None):
        self.specs_dir = specs_dir or (GOALIE_DIR / "conductor_specs")
        self.specs_dir.mkdir(parents=True, exist_ok=True)
        self.current_spec: Optional[ConductorSpec] = None
    
    def setup(self, spec_id: str, title: str, description: str, context: Optional[Dict] = None) -> ConductorSpec:
        """Phase 1: Setup - Create persistent spec with context."""
        spec = ConductorSpec(
            id=spec_id,
            title=title,
            description=description,
            phase=WorkflowPhase.SETUP,
            context=context or {},
        )
        self._save_spec(spec)
        self.current_spec = spec
        return spec
    
    def new_track(self, name: str, description: str, dependencies: Optional[List[str]] = None) -> Dict[str, Any]:
        """Phase 2: NewTrack - Add implementation track to spec."""
        if not self.current_spec:
            raise RuntimeError("No active spec. Call setup() first.")
        
        track = {
            "name": name,
            "description": description,
            "dependencies": dependencies or [],
            "in_progress": False,
            "complete": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        self.current_spec.tracks.append(track)
        self.current_spec.phase = WorkflowPhase.NEW_TRACK
        self._save_spec(self.current_spec)
        return track
    
    def implement(self, track_name: str, result: Optional[Dict] = None) -> Dict[str, Any]:
        """Phase 3: Implement - Mark track as in-progress or complete."""
        if not self.current_spec:
            raise RuntimeError("No active spec. Call setup() first.")
        
        for track in self.current_spec.tracks:
            if track.get("name") == track_name:
                if result:
                    track["complete"] = True
                    track["result"] = result
                    track["completed_at"] = datetime.now(timezone.utc).isoformat()
                else:
                    track["in_progress"] = True
                break
        
        # Update phase based on track states
        all_complete = all(t.get("complete") for t in self.current_spec.tracks)
        any_in_progress = any(t.get("in_progress") for t in self.current_spec.tracks)
        
        if all_complete and self.current_spec.tracks:
            self.current_spec.phase = WorkflowPhase.COMPLETE
        elif any_in_progress:
            self.current_spec.phase = WorkflowPhase.IMPLEMENT
        
        self._save_spec(self.current_spec)
        return {"track": track_name, "phase": self.current_spec.phase.value}
    
    def _save_spec(self, spec: ConductorSpec) -> None:
        """Save spec as persistent Markdown."""
        spec_path = self.specs_dir / f"{spec.id}.md"
        spec_path.write_text(spec.to_markdown())
        
        # Also save JSON for programmatic access
        json_path = self.specs_dir / f"{spec.id}.json"
        json_path.write_text(json.dumps({
            "id": spec.id,
            "title": spec.title,
            "description": spec.description,
            "phase": spec.phase.value,
            "tracks": spec.tracks,
            "context": spec.context,
            "created_at": spec.created_at,
        }, indent=2))
    
    def load_spec(self, spec_id: str) -> Optional[ConductorSpec]:
        """Load existing spec from disk."""
        json_path = self.specs_dir / f"{spec_id}.json"
        if not json_path.exists():
            return None
        
        data = json.loads(json_path.read_text())
        spec = ConductorSpec(
            id=data["id"],
            title=data["title"],
            description=data["description"],
            phase=WorkflowPhase(data["phase"]),
            tracks=data.get("tracks", []),
            context=data.get("context", {}),
            created_at=data.get("created_at", ""),
        )
        self.current_spec = spec
        return spec

