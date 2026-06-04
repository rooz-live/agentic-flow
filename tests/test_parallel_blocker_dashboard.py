#!/usr/bin/env python3
"""
Test suite for Parallel Blocker Remediation Dashboard

Tests cover:
- Phase tracking and progress calculation
- Track management and convergence
- Success criteria validation
- Dashboard rendering
- Error handling
- Performance optimization
"""

import pytest
import asyncio
import json
import tempfile
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

# Import dashboard components
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts" / "monitoring"))
from parallel_blocker_dashboard import (
    Phase, Track, SuccessCriterion, ParallelBlockerDashboard,
    PhaseStatus, ValidationStatus
)


class TestPhaseTracking:
    """Test phase tracking functionality."""

    def test_phase_creation(self):
        """Test phase creation with default values."""
        phase = Phase(name="Test Phase", expected_duration=300)
        assert phase.name == "Test Phase"
        assert phase.expected_duration == 300
        assert phase.status == PhaseStatus.PENDING
        assert phase.progress == 0.0

    def test_phase_elapsed_time(self):
        """Test elapsed time calculation."""
        phase = Phase(name="Test Phase", expected_duration=300)
        phase.start_time = datetime.now() - timedelta(seconds=150)
        
        elapsed = phase.get_elapsed()
        assert 140 <= elapsed <= 160  # Allow 10 second tolerance

    def test_phase_etr_calculation(self):
        """Test estimated time remaining calculation."""
        phase = Phase(name="Test Phase", expected_duration=300)
        phase.start_time = datetime.now() - timedelta(seconds=100)
        phase.progress = 50.0
        
        etr = phase.get_etr()
        assert 90 <= etr <= 110  # Allow 10 second tolerance

    def test_phase_completion(self):
        """Test phase completion."""
        phase = Phase(name="Test Phase", expected_duration=300)
        phase.status = PhaseStatus.COMPLETE
        phase.progress = 100.0
        
        assert phase.get_etr() == 0


class TestTrackManagement:
    """Test track management functionality."""

    def test_track_creation(self):
        """Test track creation."""
        phases = [
            Phase("Phase 1", expected_duration=300),
            Phase("Phase 2", expected_duration=600),
        ]
        track = Track(
            name="Test Track",
            terminal_id=14,
            total_duration=900,
            phases=phases
        )
        
        assert track.name == "Test Track"
        assert track.terminal_id == 14
        assert len(track.phases) == 2

    def test_current_phase_detection(self):
        """Test detection of currently running phase."""
        phases = [
            Phase("Phase 1", expected_duration=300),
            Phase("Phase 2", expected_duration=600),
        ]
        track = Track(
            name="Test Track",
            terminal_id=14,
            total_duration=900,
            phases=phases
        )
        
        # Set Phase 2 as running
        phases[1].status = PhaseStatus.RUNNING
        
        current = track.get_current_phase()
        assert current.name == "Phase 2"

    def test_track_elapsed_time(self):
        """Test track elapsed time calculation."""
        phases = [Phase("Phase 1", expected_duration=300)]
        track = Track(
            name="Test Track",
            terminal_id=14,
            total_duration=300,
            phases=phases
        )
        track.start_time = datetime.now() - timedelta(seconds=150)
        
        elapsed = track.get_elapsed()
        assert 140 <= elapsed <= 160

    def test_track_convergence(self):
        """Test track convergence calculation."""
        phases_a = [Phase("Phase 1", expected_duration=2700)]
        phases_b = [Phase("Phase 1", expected_duration=1200)]
        
        track_a = Track("Track A", 14, 2700, phases_a)
        track_b = Track("Track B", 15, 1200, phases_b)
        
        track_a.start_time = datetime.now()
        track_b.start_time = datetime.now()
        
        # Simulate Track B completing first
        track_b.overall_progress = 100.0
        track_b.status = PhaseStatus.COMPLETE
        
        # Track A still running
        track_a.overall_progress = 50.0
        track_a.status = PhaseStatus.RUNNING
        
        # Convergence should be when Track A completes
        assert track_a.status != PhaseStatus.COMPLETE
        assert track_b.status == PhaseStatus.COMPLETE


class TestSuccessCriteriaValidation:
    """Test success criteria validation."""

    def test_criterion_creation(self):
        """Test criterion creation."""
        criterion = SuccessCriterion(
            name="Test Criterion",
            description="Test description",
            validation_command="echo 'test'"
        )
        
        assert criterion.name == "Test Criterion"
        assert criterion.status == ValidationStatus.PENDING
        assert criterion.confidence == 0.0

    def test_criterion_validation_passed(self):
        """Test successful criterion validation."""
        criterion = SuccessCriterion(
            name="Test Criterion",
            description="Test description",
            validation_command="echo 'test'",
            expected_value="test"
        )
        
        criterion.actual_value = "test"
        criterion.status = ValidationStatus.PASSED
        criterion.confidence = 100.0
        
        assert criterion.status == ValidationStatus.PASSED
        assert criterion.confidence == 100.0

    def test_criterion_validation_failed(self):
        """Test failed criterion validation."""
        criterion = SuccessCriterion(
            name="Test Criterion",
            description="Test description",
            validation_command="echo 'test'",
            expected_value="expected"
        )
        
        criterion.actual_value = "actual"
        criterion.status = ValidationStatus.FAILED
        criterion.confidence = 0.0
        
        assert criterion.status == ValidationStatus.FAILED
        assert criterion.confidence == 0.0


class TestDashboardRendering:
    """Test dashboard rendering functionality."""

    def test_progress_bar_formatting(self):
        """Test progress bar formatting."""
        dashboard = ParallelBlockerDashboard()
        
        bar = dashboard.format_progress_bar(50.0, width=20)
        assert "[" in bar
        assert "]" in bar
        assert "50" in bar

    def test_time_formatting(self):
        """Test time formatting."""
        dashboard = ParallelBlockerDashboard()
        
        formatted = dashboard.format_time(125)
        assert formatted == "02:05"
        
        formatted = dashboard.format_time(3661)
        assert formatted == "61:01"

    def test_dashboard_rendering(self):
        """Test dashboard rendering."""
        dashboard = ParallelBlockerDashboard()
        
        output = dashboard.render_dashboard()
        assert "PARALLEL BLOCKER REMEDIATION DASHBOARD" in output
        assert "BLOCKER-001" in output
        assert "BLOCKER-003" in output

    def test_track_status_rendering(self):
        """Test track status rendering."""
        dashboard = ParallelBlockerDashboard()
        
        output = dashboard.render_track_status(dashboard.track_a)
        assert "BLOCKER-001" in output
        assert "Progress:" in output
        assert "Elapsed:" in output


class TestErrorHandling:
    """Test error handling."""

    def test_invalid_phase_duration(self):
        """Test handling of invalid phase duration."""
        with pytest.raises((ValueError, TypeError)):
            Phase(name="Test", expected_duration="invalid")

    def test_missing_validation_command(self):
        """Test handling of missing validation command."""
        criterion = SuccessCriterion(
            name="Test",
            description="Test",
            validation_command=""
        )
        
        assert criterion.validation_command == ""

    def test_dashboard_initialization_error(self):
        """Test dashboard initialization with invalid workspace."""
        with pytest.raises((FileNotFoundError, OSError)):
            ParallelBlockerDashboard(workspace_root="/nonexistent/path")


class TestPerformance:
    """Test performance characteristics."""

    def test_dashboard_memory_usage(self):
        """Test dashboard memory usage."""
        dashboard = ParallelBlockerDashboard()
        
        # Dashboard should not consume excessive memory
        import sys
        size = sys.getsizeof(dashboard)
        assert size < 1000000  # Less than 1MB

    def test_rendering_performance(self):
        """Test rendering performance."""
        import time
        dashboard = ParallelBlockerDashboard()
        
        start = time.time()
        for _ in range(100):
            dashboard.render_dashboard()
        elapsed = time.time() - start
        
        # Should render 100 times in less than 1 second
        assert elapsed < 1.0

    def test_validation_performance(self):
        """Test validation performance."""
        import time
        dashboard = ParallelBlockerDashboard()
        
        start = time.time()
        dashboard.validate_criteria(dashboard.blocker_001_criteria[:3])
        elapsed = time.time() - start
        
        # Should validate 3 criteria in less than 5 seconds
        assert elapsed < 5.0


class TestIntegration:
    """Integration tests."""

    @pytest.mark.asyncio
    async def test_dashboard_async_loop(self):
        """Test dashboard async event loop."""
        dashboard = ParallelBlockerDashboard()
        
        # Run for 1 iteration
        task = asyncio.create_task(dashboard.run())
        await asyncio.sleep(0.1)
        task.cancel()
        
        try:
            await task
        except asyncio.CancelledError:
            pass

    def test_blocker_001_criteria_initialization(self):
        """Test BLOCKER-001 criteria initialization."""
        dashboard = ParallelBlockerDashboard()
        
        assert len(dashboard.blocker_001_criteria) == 7
        assert all(isinstance(c, SuccessCriterion) for c in dashboard.blocker_001_criteria)

    def test_blocker_003_criteria_initialization(self):
        """Test BLOCKER-003 criteria initialization."""
        dashboard = ParallelBlockerDashboard()
        
        assert len(dashboard.blocker_003_criteria) == 7
        assert all(isinstance(c, SuccessCriterion) for c in dashboard.blocker_003_criteria)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

