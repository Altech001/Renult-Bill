import unittest
from uuid import uuid4

from app.models.router import Router
from app.services.routers.concentrator import heartbeat_token, verify_heartbeat_token
from app.services.routers.security import build_secure_setup_script


class RouterHeartbeatTests(unittest.TestCase):
    def test_permanent_heartbeat_token_round_trip(self) -> None:
        router_id = uuid4()
        self.assertEqual(verify_heartbeat_token(heartbeat_token(router_id)), router_id)

    def test_heartbeat_token_rejects_tampering(self) -> None:
        token = heartbeat_token(uuid4())
        with self.assertRaises(ValueError):
            verify_heartbeat_token(token[:-1] + ("0" if token[-1] != "0" else "1"))

    def test_setup_script_installs_heartbeat_scheduler(self) -> None:
        router = Router(
            id=uuid4(),
            branch_id=uuid4(),
            name="Test Router",
            host="127.0.0.1",
        )
        script = build_secure_setup_script(
            router,
            "https://renult.example.com",
            include_walled_garden=True,
        )
        self.assertIn('name="TresaHeartbeat"', script)
        self.assertIn('name="RunTresaHeartbeat"', script)
        self.assertIn("/api/routers/heartbeat", script)
        self.assertIn("interval=1m", script)


if __name__ == "__main__":
    unittest.main()
