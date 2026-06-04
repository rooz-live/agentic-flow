import asyncio
import importlib.util
import os
import sys
import unittest


def load_module_fresh(module_name: str, path: str):
    """Load a module from path with a fresh module object."""
    sys.modules.pop(module_name, None)
    spec = importlib.util.spec_from_file_location(module_name, path)
    mod = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(mod)  # type: ignore
    return mod


class TestImportBehavior(unittest.TestCase):
    def test_import_normal(self):
        # Import via file path to avoid sys.path issues
        path = os.path.abspath("platform_connectors.py")
        pc = load_module_fresh("platform_connectors", path)
        self.assertTrue(hasattr(pc, "PlatformConnectors"))
        self.assertTrue(hasattr(pc, "PlatformConnectorsMCPServer"))
        self.assertTrue(hasattr(pc, "emit_heartbeat"))

    def test_import_without_mcp(self):
        # Load the module under a different name while simulating missing MCP
        module_name = "pc_no_mcp"
        path = os.path.abspath("platform_connectors.py")

        # Ensure fresh state
        sys.modules.pop(module_name, None)
        original_mcp = sys.modules.get("mcp")
        sys.modules["mcp"] = None  # cause from mcp import Tool to fail

        try:
            spec = importlib.util.spec_from_file_location(module_name, path)
            mod = importlib.util.module_from_spec(spec)
            assert spec and spec.loader
            spec.loader.exec_module(mod)  # type: ignore
        finally:
            if original_mcp is not None:
                sys.modules["mcp"] = original_mcp
            else:
                sys.modules.pop("mcp", None)

        # Verify fallback stubs and flag
        self.assertFalse(getattr(mod, "MCP_AVAILABLE", True))
        self.assertTrue(hasattr(mod, "Tool"))
        self.assertTrue(hasattr(mod, "TextContent"))
        self.assertTrue(hasattr(mod, "Server"))


class AsyncTestCase(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        # Import via file path to avoid sys.path issues
        path = os.path.abspath("platform_connectors.py")
        self.pc = load_module_fresh("platform_connectors_async", path)

    async def test_list_tools_schema(self):
        pc = self.pc
        server = pc.PlatformConnectorsMCPServer()
        tools = await server.list_tools()
        # Must contain specific tool names and inputSchema keys
        names = {t.name for t in tools}
        expected = {
            "connect_platform",
            "execute_platform_operation",
            "get_platform_status",
            "disconnect_platform",
            "hostbill_create_invoice",
            "openstack_create_instance",
            "starlingx_deploy_application",
        }
        self.assertTrue(expected.issubset(names))
        # spot-check one schema
        cp_tool = next(t for t in tools if t.name == "connect_platform")
        self.assertIn("type", cp_tool.inputSchema)
        self.assertIn("properties", cp_tool.inputSchema)
        self.assertIn("required", cp_tool.inputSchema)

    async def test_connect_platform_backoff_heartbeats(self):
        pc = self.pc

        # Patch aiohttp session to avoid real network
        class DummySession:
            def __init__(self, connector=None):
                pass
            async def close(self):
                return None

        # Monkeypatch in module namespace
        pc.aiohttp.ClientSession = DummySession  # type: ignore

        # Force the SSL validation test to fail and trigger backoff
        async def always_fail_ssl(*args, **kwargs):
            return False

        pc.PlatformConnectors._test_platform_connection_with_ssl_validation = (  # type: ignore
            always_fail_ssl
        )

        # Make asyncio.sleep fast
        async def fast_sleep(_):
            return None
        pc.asyncio.sleep = fast_sleep  # type: ignore

        connectors = pc.PlatformConnectors()
        config = {
            "verify_ssl": True,
            "credentials": {"username": "u", "password": "p"},
        }

        # Capture heartbeats via logs
        with self.assertLogs(pc.logger, level="INFO") as cm:
            ok = await connectors.connect_platform("openstack", config)
        self.assertFalse(ok)

        # Ensure backoff heartbeat and failure heartbeat were emitted
        joined = "\n".join(cm.output)
        self.assertIn("ssl_backoff", joined)
        self.assertIn("retry_delay", joined)
        self.assertIn("ssl_validation", joined)
        self.assertIn("connection_test", joined)

    async def test_execute_platform_operation_dispatch(self):
        pc = self.pc
        connectors = pc.PlatformConnectors()
        # Mark platforms as connected
        for pid in list(connectors.connections.keys()):
            connectors.connections[pid].status = "connected"

        # HostBill ops
        res = await connectors.execute_platform_operation(
            "hostbill", "create_invoice", "billing", {"client_id": "C1", "amount": 10}
        )
        self.assertTrue(res["success"])  # type: ignore

        # OpenStack ops
        res = await connectors.execute_platform_operation(
            "openstack", "create_instance", "compute", {"name": "vm"}
        )
        self.assertTrue(res["success"])  # type: ignore

        # StarlingX ops
        res = await connectors.execute_platform_operation(
            "starlingx", "deploy_application", "helm", {"application": "app"}
        )
        self.assertTrue(res["success"])  # type: ignore

    async def test_unsupported_operations_errors(self):
        pc = self.pc
        connectors = pc.PlatformConnectors()
        # mark connected
        for pid in list(connectors.connections.keys()):
            connectors.connections[pid].status = "connected"

        # Unsupported HostBill
        res = await connectors.execute_platform_operation("hostbill", "unknown_op", "billing", {})
        self.assertFalse(res["success"])  # type: ignore
        self.assertIn("Unsupported HostBill operation", res["result"]["error"])  # type: ignore

        # Unsupported OpenStack
        res = await connectors.execute_platform_operation("openstack", "unknown_op", "compute", {})
        self.assertFalse(res["success"])  # type: ignore
        self.assertIn("Unsupported OpenStack operation", res["result"]["error"])  # type: ignore

        # Unsupported StarlingX
        res = await connectors.execute_platform_operation("starlingx", "unknown_op", "helm", {})
        self.assertFalse(res["success"])  # type: ignore
        self.assertIn("Unsupported StarlingX operation", res["result"]["error"])  # type: ignore

    async def test_disconnect_platform_closes_pool(self):
        pc = self.pc
        connectors = pc.PlatformConnectors()
        # Create a dummy session with close tracking
        class DummySession:
            def __init__(self):
                self.closed = False
            async def close(self):
                self.closed = True
        # set pools and status
        for pid in list(connectors.connections.keys()):
            connectors.connections[pid].connection_pool = DummySession()
            connectors.connections[pid].status = "connected"

        for pid in list(connectors.connections.keys()):
            ok = await connectors.disconnect_platform(pid)
            self.assertTrue(ok)
            self.assertEqual(connectors.connections[p].status if (p := pid) else None, "disconnected")
            self.assertIsNone(connectors.connections[pid].connection_pool)



if __name__ == "__main__":
    unittest.main()
