import argparse
import subprocess
from pathlib import Path
from unittest.mock import patch

from scripts.policy.governance import GovernanceMiddleware


PROJECT_ROOT = Path(__file__).resolve().parents[2]


def make_args(environment: str = "prod") -> argparse.Namespace:
    """Construct a minimal argparse.Namespace compatible with GovernanceMiddleware."""
    return argparse.Namespace(
        iterations=1,
        depth=3,
        circle="analyst",
        rotate_circles=False,
        autocommit=True,
        dry_run=False,
        force=True,
        environment=environment,
    )


def test_run_iris_checks_invokes_health_and_evaluate_with_expected_env():
    """IRIS hooks should be invoked once per iteration with correct env variables.

    This validates that governance wiring to IRIS is correct without requiring the
    real IRIS CLI binary.
    """
    args = make_args(environment="prod")
    middleware = GovernanceMiddleware(args, PROJECT_ROOT)

    # Simulate a non-default iteration/circle/depth to make assertions meaningful
    middleware.current_iteration = 2
    middleware.active_circle = "assessor"
    middleware.current_depth = 5

    with patch("scripts.policy.governance.subprocess.run") as mock_run:
        middleware.run_iris_checks()

    # Two IRIS hooks per iteration: iris-health and iris-evaluate
    assert mock_run.call_count == 2

    calls = mock_run.call_args_list
    first_cmd = calls[0].args[0]
    second_cmd = calls[1].args[0]

    # Command structure should invoke the af script (absolute or relative) with
    # iris-health / iris-evaluate and the --log-goalie flag.
    assert first_cmd[-2:] == ["iris-health", "--log-goalie"]
    assert second_cmd[-2:] == ["iris-evaluate", "--log-goalie"]

    # Both calls should receive the same environment with AF_* context populated
    env1 = calls[0].kwargs["env"]
    env2 = calls[1].kwargs["env"]

    for env in (env1, env2):
        # Core prod-cycle execution context
        assert env["AF_RUN_ID"] == middleware.run_id
        assert env["AF_RUN_KIND"] == "prod-cycle"
        assert env["AF_RUN_ITERATION"] == "2"
        assert env["AF_CIRCLE"] == "assessor"
        assert env["AF_DEPTH_LEVEL"] == "5"

        # Environment propagation from --environment CLI arg
        assert env["AF_IRIS_ENVIRONMENT"] == "prod"
        assert env["AF_ENVIRONMENT"] == "prod"

        # IRIS hooks should be non-fatal: governance always uses check=False
        assert calls[0].kwargs.get("check") is False
        assert calls[1].kwargs.get("check") is False


def test_run_iris_checks_handles_subprocess_errors_gracefully():
    """IRIS hook failures must be non-fatal to governance.

    Even if the underlying subprocess.run raises (e.g. IRIS CLI missing
    hnswlib-node bindings), GovernanceMiddleware.run_iris_checks should catch
    the exception and continue without propagating it.
    """
    args = make_args(environment="staging")
    middleware = GovernanceMiddleware(args, PROJECT_ROOT)

    def _raise_error(*_args, **_kwargs):  # type: ignore[unused-argument]
        raise subprocess.CalledProcessError(returncode=1, cmd=["iris-health"])  # noqa: TRY301

    with patch("scripts.policy.governance.subprocess.run", side_effect=_raise_error) as mock_run:
        # Should not raise despite subprocess errors
        middleware.run_iris_checks()

    # Both IRIS hooks attempted even when the first fails
    assert mock_run.call_count == 2

