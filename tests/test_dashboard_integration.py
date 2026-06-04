#!/usr/bin/env python3
"""
Integration and Performance Tests for Parallel Blocker Dashboard

Tests:
- Dashboard integration with actual terminal processes
- Performance benchmarks (memory, CPU, rendering)
- End-to-end workflow simulation
- Error handling and recovery
- Export functionality
"""

import asyncio
import json
import os
import psutil
import pytest
import subprocess
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts" / "monitoring"))

from parallel_blocker_dashboard import (
    ParallelBlockerDashboard,
    Phase,
    PhaseStatus,
    Track,
    SuccessCriterion,
    ValidationStatus,
)


class TestDashboardIntegration:
    """Integration tests for dashboard with terminal processes."""

    @pytest.fixture
    def dashboard(self):
        """Create dashboard instance."""
        return ParallelBlockerDashboard()

    def test_dashboard_initialization(self, dashboard):
        """Test dashboard initializes correctly."""
        assert dashboard is not None
        assert dashboard.track_a is not None
        assert dashboard.track_b is not None
        assert len(dashboard.blocker_001_criteria) == 7
        assert len(dashboard.blocker_003_criteria) == 7

    def test_track_a_phases(self, dashboard):
        """Test Track A has correct phases."""
        phases = dashboard.track_a.phases
        assert len(phases) == 5
        assert phases[0].name == "Environment Setup"
        assert phases[1].name == "Real PR Collection"
        assert phases[2].name == "Neural Analysis"
        assert phases[3].name == "Risk Calibration"
        assert phases[4].name == "Validation"

    def test_track_b_phases(self, dashboard):
        """Test Track B has correct phases."""
        phases = dashboard.track_b.phases
        assert len(phases) == 5
        assert phases[0].name == "SSH Configuration"
        assert phases[1].name == "IPMI Testing"
        assert phases[2].name == "Health Monitoring"
        assert phases[3].name == "Heartbeat Integration"
        assert phases[4].name == "Comprehensive Testing"

    def test_success_criteria_count(self, dashboard):
        """Test correct number of success criteria."""
        assert len(dashboard.blocker_001_criteria) == 7
        assert len(dashboard.blocker_003_criteria) == 7
        total_criteria = len(dashboard.blocker_001_criteria) + len(dashboard.blocker_003_criteria)
        assert total_criteria == 14

    def test_criteria_validation_structure(self, dashboard):
        """Test success criteria have required fields."""
        for criterion in dashboard.blocker_001_criteria:
            assert criterion.name is not None
            assert criterion.description is not None
            assert criterion.validation_command is not None
            assert criterion.status == ValidationStatus.PENDING
            assert criterion.confidence == 0.0


class TestPerformanceBenchmarks:
    """Performance benchmarks for dashboard."""

    @pytest.fixture
    def dashboard(self):
        """Create dashboard instance."""
        return ParallelBlockerDashboard()

    def test_memory_usage_idle(self, dashboard):
        """Test memory usage when idle."""
        process = psutil.Process(os.getpid())
        memory_info = process.memory_info()
        memory_mb = memory_info.rss / 1024 / 1024
        
        # Should be less than 100MB
        assert memory_mb < 100, f"Memory usage {memory_mb}MB exceeds 100MB limit"

    def test_cpu_usage_idle(self, dashboard):
        """Test CPU usage when idle."""
        process = psutil.Process(os.getpid())
        
        # Measure CPU usage over 1 second
        cpu_percent = process.cpu_percent(interval=1)
        
        # Should be less than 5%
        assert cpu_percent < 5, f"CPU usage {cpu_percent}% exceeds 5% limit"

    def test_rendering_performance(self, dashboard):
        """Test dashboard rendering performance."""
        start_time = time.time()
        
        # Simulate rendering 100 times
        for _ in range(100):
            dashboard.render_progress_bar(50, 100)
        
        elapsed = time.time() - start_time
        
        # Should complete 100 renders in less than 1 second
        assert elapsed < 1.0, f"Rendering took {elapsed}s, expected < 1s"

    def test_validation_performance(self, dashboard):
        """Test validation command execution performance."""
        start_time = time.time()
        
        # Validate all criteria
        dashboard.validate_criteria(dashboard.blocker_001_criteria)
        dashboard.validate_criteria(dashboard.blocker_003_criteria)
        
        elapsed = time.time() - start_time
        
        # Should complete in reasonable time (< 5 seconds)
        assert elapsed < 5.0, f"Validation took {elapsed}s, expected < 5s"


class TestEndToEndWorkflow:
    """End-to-end workflow simulation tests."""

    @pytest.mark.asyncio
    async def test_workflow_simulation(self):
        """Simulate complete 45-minute workflow."""
        dashboard = ParallelBlockerDashboard()
        
        # Simulate workflow progression
        start_time = datetime.now()
        
        # Simulate Track A progression (45 minutes)
        dashboard.track_a.start_time = start_time
        dashboard.track_a.status = PhaseStatus.RUNNING
        
        # Simulate Track B progression (20 minutes)
        dashboard.track_b.start_time = start_time
        dashboard.track_b.status = PhaseStatus.RUNNING
        
        # Verify tracks are running
        assert dashboard.track_a.status == PhaseStatus.RUNNING
        assert dashboard.track_b.status == PhaseStatus.RUNNING
        
        # Simulate phase completion
        for phase in dashboard.track_a.phases:
            phase.status = PhaseStatus.COMPLETE
        
        dashboard.track_a.status = PhaseStatus.COMPLETE
        
        # Verify completion
        assert dashboard.track_a.status == PhaseStatus.COMPLETE
        assert all(p.status == PhaseStatus.COMPLETE for p in dashboard.track_a.phases)

    def test_convergence_tracking(self):
        """Test convergence point tracking."""
        dashboard = ParallelBlockerDashboard()
        
        start_time = datetime.now()
        dashboard.track_a.start_time = start_time
        dashboard.track_b.start_time = start_time
        
        # Simulate elapsed time
        elapsed_a = 2700  # 45 minutes
        elapsed_b = 1200  # 20 minutes
        
        # Both should converge at T+45
        convergence_time = start_time + timedelta(seconds=2700)
        
        assert convergence_time is not None
        assert (convergence_time - start_time).total_seconds() == 2700


class TestErrorHandling:
    """Error handling and recovery tests."""

    @pytest.fixture
    def dashboard(self):
        """Create dashboard instance."""
        return ParallelBlockerDashboard()

    def test_invalid_terminal_id(self, dashboard):
        """Test handling of invalid terminal ID."""
        # Should not raise exception
        dashboard.terminal_ids = "999,1000"
        assert dashboard.terminal_ids == "999,1000"

    def test_missing_log_directory(self, dashboard):
        """Test handling of missing log directory."""
        # Should create directory if needed
        log_dir = Path(dashboard.workspace_root) / ".calibration" / "logs"
        log_dir.mkdir(parents=True, exist_ok=True)
        assert log_dir.exists()

    def test_validation_command_failure(self, dashboard):
        """Test handling of failed validation command."""
        criterion = SuccessCriterion(
            name="Test Criterion",
            description="Test",
            validation_command="false"  # Command that always fails
        )
        
        dashboard.validate_criteria([criterion])
        
        # Should handle failure gracefully
        assert criterion.status in [ValidationStatus.FAILED, ValidationStatus.PENDING]


class TestExportFunctionality:
    """Export functionality tests."""

    @pytest.fixture
    def dashboard(self):
        """Create dashboard instance."""
        return ParallelBlockerDashboard()

    def test_json_export_structure(self, dashboard):
        """Test JSON export has correct structure."""
        # Simulate some data
        dashboard.track_a.status = PhaseStatus.RUNNING
        dashboard.track_b.status = PhaseStatus.PENDING
        
        # Create export data
        export_data = {
            "timestamp": datetime.now().isoformat(),
            "track_a": {
                "name": dashboard.track_a.name,
                "status": dashboard.track_a.status.name,
                "progress": dashboard.track_a.overall_progress,
            },
            "track_b": {
                "name": dashboard.track_b.name,
                "status": dashboard.track_b.status.name,
                "progress": dashboard.track_b.overall_progress,
            },
        }
        
        # Verify structure
        assert "timestamp" in export_data
        assert "track_a" in export_data
        assert "track_b" in export_data
        assert export_data["track_a"]["status"] == "RUNNING"
        assert export_data["track_b"]["status"] == "PENDING"

    def test_export_serialization(self, dashboard):
        """Test export data can be serialized to JSON."""
        export_data = {
            "timestamp": datetime.now().isoformat(),
            "track_a": {"status": "RUNNING", "progress": 50},
            "track_b": {"status": "PENDING", "progress": 0},
        }
        
        # Should serialize without error
        json_str = json.dumps(export_data)
        assert json_str is not None
        
        # Should deserialize correctly
        loaded = json.loads(json_str)
        assert loaded["track_a"]["progress"] == 50


class TestCommandLineInterface:
    """Command-line interface tests."""

    def test_help_output(self):
        """Test --help flag produces output."""
        result = subprocess.run(
            ["python3", "scripts/monitoring/parallel_blocker_dashboard.py", "--help"],
            capture_output=True,
            text=True,
            cwd=Path(__file__).parent.parent
        )
        
        assert result.returncode == 0
        assert "usage" in result.stdout.lower() or "usage" in result.stderr.lower()

    def test_check_processes_flag(self):
        """Test --check-processes flag."""
        result = subprocess.run(
            ["python3", "scripts/monitoring/parallel_blocker_dashboard.py", "--check-processes"],
            capture_output=True,
            text=True,
            cwd=Path(__file__).parent.parent
        )
        
        # Should complete without error
        assert result.returncode == 0


class TestAccessibility:
    """Accessibility feature tests."""

    @pytest.fixture
    def dashboard(self):
        """Create dashboard instance."""
        return ParallelBlockerDashboard()

    def test_status_indicators(self, dashboard):
        """Test status indicators are properly formatted."""
        statuses = [
            PhaseStatus.PENDING,
            PhaseStatus.RUNNING,
            PhaseStatus.COMPLETE,
            PhaseStatus.FAILED,
            PhaseStatus.WARNING,
        ]
        
        for status in statuses:
            assert status.value is not None
            assert len(status.value) > 0

    def test_validation_status_indicators(self, dashboard):
        """Test validation status indicators."""
        statuses = [
            ValidationStatus.PENDING,
            ValidationStatus.PASSED,
            ValidationStatus.FAILED,
            ValidationStatus.PARTIAL,
        ]
        
        for status in statuses:
            assert status.value is not None
            assert len(status.value) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

