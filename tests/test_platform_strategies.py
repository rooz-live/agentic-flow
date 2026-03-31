
import pytest

from src.hivelocity.device_manager import DeviceManager, PlatformStrategy

@pytest.fixture
def device_manager():
    return DeviceManager()



def test_all_strategies_exist(device_manager):
    """Ensure all 9 required strategies are present and callable."""
    expected_strategies = [
        PlatformStrategy.DJANGO_PRODUCTION,
        PlatformStrategy.HOSTBILL_PRODUCTION,
        PlatformStrategy.RAILS_PRODUCTION,
        PlatformStrategy.NEXTJS_PRODUCTION,
        PlatformStrategy.LARAVEL_PRODUCTION,
        PlatformStrategy.SYMFONY_PRODUCTION,
        PlatformStrategy.AFFILIATE_SYSTEMS_PRODUCTION,
        PlatformStrategy.WORDPRESS_PRODUCTION,
        PlatformStrategy.FLARUM_PRODUCTION,
        PlatformStrategy.STX_PRODUCTION,
        PlatformStrategy.DOCKER_SWARM_MANAGER,
        PlatformStrategy.DOCKER_SWARM_WORKER,
    ]

    for strategy in expected_strategies:
        config = device_manager.get_strategy_config(strategy)
        assert isinstance(config, dict)
        assert "os" in config
        assert "packages" in config
        assert "partition_scheme" in config



def test_validate_partition_scheme_valid(device_manager):
    """Test valid partition schemes."""
    # Valid simple scheme
    scheme1 = [
        {"mount_point": "/", "size": "rest"}
    ]
    assert device_manager.validatePartitionScheme(scheme1) is True

    # Valid complex scheme
    scheme2 = [
        {"mount_point": "/", "size": 10240},
        {"mount_point": "/var", "size": "rest"}
    ]
    assert device_manager.validatePartitionScheme(scheme2) is True



def test_validate_partition_scheme_invalid(device_manager):
    """Test invalid partition schemes."""
    # Empty scheme
    assert device_manager.validatePartitionScheme([]) is False

    # Missing root
    scheme_no_root = [
        {"mount_point": "/var", "size": "rest"}
    ]
    assert device_manager.validatePartitionScheme(scheme_no_root) is False

    # Invalid size type
    scheme_bad_size = [
        {"mount_point": "/", "size": "invalid_string"}
    ]
    assert device_manager.validatePartitionScheme(scheme_bad_size) is False

    # Negative size
    scheme_neg_size = [
        {"mount_point": "/", "size": -500}
    ]
    assert device_manager.validatePartitionScheme(scheme_neg_size) is False

    # Duplicates
    scheme_dupe = [
        {"mount_point": "/", "size": 1000},
        {"mount_point": "/", "size": "rest"}
    ]
    assert device_manager.validatePartitionScheme(scheme_dupe) is False



def test_stx_production_config(device_manager):
    """Specific check for STX Production config requirements."""
    config = device_manager.get_strategy_config(
        PlatformStrategy.STX_PRODUCTION,
    )
    assert config["os"] == "ubuntu-22.04"
    assert "docker.io" in config["packages"]
    assert 6443 in config["ports"]

    # Check partition validity using the manager's own validator
    assert device_manager.validatePartitionScheme(config["partition_scheme"]) is True


def test_wordpress_production_config(device_manager):
    config = device_manager.get_strategy_config(
        PlatformStrategy.WORDPRESS_PRODUCTION,
    )
    assert config["os"] == "ubuntu-22.04"
    assert "nginx" in config["packages"]
    assert "php-fpm" in config["packages"]
    assert "mariadb-server" in config["packages"]
    assert 443 in config["ports"]
    assert device_manager.validatePartitionScheme(config["partition_scheme"]) is True


def test_flarum_production_config(device_manager):
    config = device_manager.get_strategy_config(
        PlatformStrategy.FLARUM_PRODUCTION,
    )
    assert config["os"] == "ubuntu-22.04"
    assert "composer" in config["packages"]
    assert "nginx" in config["packages"]
    assert "mariadb-server" in config["packages"]
    assert 80 in config["ports"]
    assert device_manager.validatePartitionScheme(config["partition_scheme"]) is True


def test_affiliate_systems_production_config(device_manager):
    config = device_manager.get_strategy_config(
        PlatformStrategy.AFFILIATE_SYSTEMS_PRODUCTION,
    )
    assert config["os"] == "ubuntu-22.04"
    assert "docker.io" in config["packages"]
    assert "postgresql" in config["packages"]
    assert "redis-server" in config["packages"]
    assert device_manager.validatePartitionScheme(config["partition_scheme"]) is True
