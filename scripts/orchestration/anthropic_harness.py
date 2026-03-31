#!/usr/bin/env python3
"""Anthropic Long-Running Agent Harness.

Implements the Initializer + Coding agent pattern (2025-11-26):
- feature_list.json for structured task tracking
- claude-progress.txt for human-readable progress
- Incremental git commits for multi-session workflows

Reference: Anthropic Long-Running Agents Research (2025-11-26)
"""

from __future__ import annotations

import json
import subprocess
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional

PROJECT_ROOT = Path(__file__).resolve().parents[2]
GOALIE_DIR = PROJECT_ROOT / ".goalie"


class FeatureStatus(Enum):
    """Feature implementation status."""
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    BLOCKED = "blocked"
    COMPLETE = "complete"
    VERIFIED = "verified"


@dataclass
class Feature:
    """Individual feature in the feature list."""
    id: str
    name: str
    description: str
    status: FeatureStatus = FeatureStatus.NOT_STARTED
    priority: int = 3  # 1=highest, 5=lowest
    dependencies: List[str] = field(default_factory=list)
    files_modified: List[str] = field(default_factory=list)
    git_commits: List[str] = field(default_factory=list)
    notes: str = ""
    started_at: Optional[str] = None
    completed_at: Optional[str] = None


class AnthropicHarness:
    """Manages long-running agent workflows with Anthropic patterns."""
    
    def __init__(self, project_root: Optional[Path] = None):
        self.project_root = project_root or PROJECT_ROOT
        self.goalie_dir = self.project_root / ".goalie"
        self.goalie_dir.mkdir(parents=True, exist_ok=True)
        
        self.feature_list_path = self.goalie_dir / "feature_list.json"
        self.progress_path = self.goalie_dir / "claude-progress.txt"
        self.features: List[Feature] = []
        
        self._load_features()
    
    def _load_features(self) -> None:
        """Load existing feature list if present."""
        if self.feature_list_path.exists():
            try:
                data = json.loads(self.feature_list_path.read_text())
                self.features = [
                    Feature(
                        id=f["id"],
                        name=f["name"],
                        description=f["description"],
                        status=FeatureStatus(f.get("status", "not_started")),
                        priority=f.get("priority", 3),
                        dependencies=f.get("dependencies", []),
                        files_modified=f.get("files_modified", []),
                        git_commits=f.get("git_commits", []),
                        notes=f.get("notes", ""),
                        started_at=f.get("started_at"),
                        completed_at=f.get("completed_at"),
                    )
                    for f in data.get("features", [])
                ]
            except (json.JSONDecodeError, KeyError):
                self.features = []
    
    def add_feature(self, id: str, name: str, description: str, priority: int = 3, deps: Optional[List[str]] = None) -> Feature:
        """Add a new feature to track."""
        feature = Feature(id=id, name=name, description=description, priority=priority, dependencies=deps or [])
        self.features.append(feature)
        self._save()
        return feature
    
    def start_feature(self, feature_id: str) -> Optional[Feature]:
        """Mark a feature as in-progress."""
        for f in self.features:
            if f.id == feature_id:
                f.status = FeatureStatus.IN_PROGRESS
                f.started_at = datetime.now(timezone.utc).isoformat()
                self._save()
                self._update_progress(f"Started: {f.name}")
                return f
        return None
    
    def complete_feature(self, feature_id: str, files: Optional[List[str]] = None, commit: bool = True) -> Optional[Feature]:
        """Mark a feature as complete and optionally commit."""
        for f in self.features:
            if f.id == feature_id:
                f.status = FeatureStatus.COMPLETE
                f.completed_at = datetime.now(timezone.utc).isoformat()
                if files:
                    f.files_modified.extend(files)
                
                if commit:
                    commit_hash = self._git_commit(f"feat({f.id}): {f.name}", files or f.files_modified)
                    if commit_hash:
                        f.git_commits.append(commit_hash)
                
                self._save()
                self._update_progress(f"Completed: {f.name}")
                return f
        return None
    
    def _git_commit(self, message: str, files: List[str]) -> Optional[str]:
        """Create incremental git commit (Anthropic pattern)."""
        try:
            if files:
                subprocess.run(["git", "add"] + files, cwd=self.project_root, check=True, capture_output=True)
            result = subprocess.run(["git", "commit", "-m", message], cwd=self.project_root, check=True, capture_output=True, text=True)
            # Extract commit hash
            hash_result = subprocess.run(["git", "rev-parse", "HEAD"], cwd=self.project_root, capture_output=True, text=True)
            return hash_result.stdout.strip()[:8]
        except subprocess.CalledProcessError:
            return None
    
    def _save(self) -> None:
        """Save feature list to JSON."""
        data = {
            "version": "1.0",
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "features": [
                {
                    "id": f.id, "name": f.name, "description": f.description,
                    "status": f.status.value, "priority": f.priority,
                    "dependencies": f.dependencies, "files_modified": f.files_modified,
                    "git_commits": f.git_commits, "notes": f.notes,
                    "started_at": f.started_at, "completed_at": f.completed_at,
                }
                for f in sorted(self.features, key=lambda x: x.priority)
            ]
        }
        self.feature_list_path.write_text(json.dumps(data, indent=2))
    
    def _update_progress(self, message: str) -> None:
        """Append to claude-progress.txt (human-readable log)."""
        ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        with open(self.progress_path, "a") as f:
            f.write(f"[{ts}] {message}\n")
    
    def get_progress_summary(self) -> Dict[str, Any]:
        """Get summary of feature progress."""
        total = len(self.features)
        complete = sum(1 for f in self.features if f.status == FeatureStatus.COMPLETE)
        in_progress = sum(1 for f in self.features if f.status == FeatureStatus.IN_PROGRESS)
        return {"total": total, "complete": complete, "in_progress": in_progress, "remaining": total - complete}

