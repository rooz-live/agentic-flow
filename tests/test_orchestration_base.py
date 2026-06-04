"""
Unit Tests for Base Orchestrator
=================================

Tests for orchestration.base module including BaseOrchestrator and ExecutionContext.
"""

import pytest
import json
from pathlib import Path
from datetime import datetime
from orchestration.base import BaseOrchestrator, ExecutionContext, ExecutionStatus


class ConcreteOrchestrator(BaseOrchestrator):
    """Concrete implementation for testing"""
    
    def execute(self) -> bool:
        return True
    
    def validate(self) -> bool:
        return True


@pytest.fixture
def temp_workspace(tmp_path):
    """Create temporary workspace for testing"""
    return str(tmp_path)


@pytest.fixture
def orchestrator(temp_workspace):
    """Create orchestrator instance for testing"""
    return ConcreteOrchestrator(temp_workspace, "test-project")


class TestExecutionContext:
    """Tests for ExecutionContext"""
    
    def test_creation(self):
        """Test ExecutionContext creation"""
        context = ExecutionContext(
            task_id="task1",
            task_name="Test Task"
        )
        assert context.task_id == "task1"
        assert context.task_name == "Test Task"
        assert context.status == ExecutionStatus.PENDING
    
    def test_to_dict(self):
        """Test ExecutionContext to_dict conversion"""
        context = ExecutionContext(
            task_id="task1",
            task_name="Test Task",
            status=ExecutionStatus.SUCCESS
        )
        data = context.to_dict()
        assert data['task_id'] == "task1"
        assert data['status'] == "success"
    
    def test_metadata(self):
        """Test ExecutionContext metadata"""
        context = ExecutionContext(
            task_id="task1",
            task_name="Test Task",
            metadata={"key": "value"}
        )
        assert context.metadata["key"] == "value"


class TestBaseOrchestrator:
    """Tests for BaseOrchestrator"""
    
    def test_initialization(self, orchestrator):
        """Test orchestrator initialization"""
        assert orchestrator.project_name == "test-project"
        assert orchestrator.workspace_root.exists()
    
    def test_initialize(self, orchestrator):
        """Test initialize method"""
        result = orchestrator.initialize()
        assert result is True
        assert orchestrator.reports_dir.exists()
        assert orchestrator.logs_dir.exists()
    
    def test_create_execution_context(self, orchestrator):
        """Test execution context creation"""
        context = orchestrator.create_execution_context("task1", "Test Task")
        assert context.task_id == "task1"
        assert "task1" in orchestrator.execution_contexts
    
    def test_update_execution_context(self, orchestrator):
        """Test execution context update"""
        context = orchestrator.create_execution_context("task1", "Test Task")
        updated = orchestrator.update_execution_context(
            "task1",
            status=ExecutionStatus.SUCCESS
        )
        assert updated.status == ExecutionStatus.SUCCESS
    
    def test_save_report(self, orchestrator):
        """Test report saving"""
        orchestrator.initialize()
        report_data = {"status": "success", "data": [1, 2, 3]}
        result = orchestrator.save_report("test_report", report_data)
        assert result is True
        
        report_path = orchestrator.reports_dir / "test_report.json"
        assert report_path.exists()
    
    def test_load_report(self, orchestrator):
        """Test report loading"""
        orchestrator.initialize()
        report_data = {"status": "success", "data": [1, 2, 3]}
        orchestrator.save_report("test_report", report_data)
        
        loaded = orchestrator.load_report("test_report")
        assert loaded is not None
        assert loaded["status"] == "success"
    
    def test_load_nonexistent_report(self, orchestrator):
        """Test loading nonexistent report"""
        orchestrator.initialize()
        loaded = orchestrator.load_report("nonexistent")
        assert loaded is None
    
    def test_get_execution_summary(self, orchestrator):
        """Test execution summary"""
        orchestrator.create_execution_context("task1", "Task 1")
        orchestrator.create_execution_context("task2", "Task 2")
        
        summary = orchestrator.get_execution_summary()
        assert summary["project"] == "test-project"
        assert summary["total_tasks"] == 2
        assert "task1" in summary["tasks"]
        assert "task2" in summary["tasks"]


class TestOrchestrationWorkflow:
    """Integration tests for orchestration workflow"""
    
    def test_complete_workflow(self, orchestrator):
        """Test complete orchestration workflow"""
        # Initialize
        assert orchestrator.initialize() is True
        
        # Create contexts
        ctx1 = orchestrator.create_execution_context("task1", "Task 1")
        ctx2 = orchestrator.create_execution_context("task2", "Task 2")
        
        # Update contexts
        orchestrator.update_execution_context("task1", status=ExecutionStatus.SUCCESS)
        orchestrator.update_execution_context("task2", status=ExecutionStatus.SUCCESS)
        
        # Save report
        summary = orchestrator.get_execution_summary()
        assert orchestrator.save_report("workflow_summary", summary) is True
        
        # Load and verify
        loaded = orchestrator.load_report("workflow_summary")
        assert loaded["total_tasks"] == 2
        assert loaded["project"] == "test-project"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

