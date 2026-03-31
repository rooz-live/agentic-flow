import pytest

from src.hivelocity.device_manager import DeviceManager, PlatformStrategy


@pytest.fixture()
def manager() -> DeviceManager:
    return DeviceManager()


@pytest.mark.parametrize("strategy", list(PlatformStrategy))
def test_strategy_config_shape_and_partition_validity(
    manager: DeviceManager,
    strategy: PlatformStrategy,
) -> None:
    cfg = manager.get_strategy_config(strategy)

    assert isinstance(cfg, dict)
    assert isinstance(cfg.get("os"), str)
    assert isinstance(cfg.get("packages"), list)
    assert all(isinstance(p, str) for p in cfg.get("packages"))
    assert isinstance(cfg.get("ports"), list)
    assert all(isinstance(p, int) for p in cfg.get("ports"))

    scheme = cfg.get("partition_scheme")
    assert isinstance(scheme, list)
    assert manager.validatePartitionScheme(scheme)


def test_get_strategy_config_unknown_strategy_raises(
    manager: DeviceManager,
) -> None:
    with pytest.raises(ValueError):
        manager.get_strategy_config(None)  # type: ignore[arg-type]


@pytest.mark.parametrize(
    "scheme",
    [
        [],
        [{"mount_point": "/var", "size": "rest"}],
        [{"mount_point": "/", "size": 0}],
        [{"mount_point": "/", "size": -1}],
        [{"mount_point": "/", "size": "nope"}],
        [
            {"mount_point": "/", "size": 10},
            {"mount_point": "/", "size": "rest"},
        ],
        [
            {"mount_point": "/", "size": 10},
            {"mount_point": "/var", "size": 1.5},
        ],
        [
            {"mount_point": "/", "size": 10},
            {"size": "rest"},
        ],
        [
            {"mount_point": "/", "size": 10},
            {"mount_point": "/var", "size": None},
        ],
    ],
)
def test_validate_partition_scheme_rejects_invalid(
    manager: DeviceManager,
    scheme,
) -> None:
    assert not manager.validatePartitionScheme(scheme)


def test_validate_partition_scheme_accepts_minimal_valid(
    manager: DeviceManager,
) -> None:
    scheme = [{"mount_point": "/", "size": "rest"}]
    assert manager.validatePartitionScheme(scheme)
