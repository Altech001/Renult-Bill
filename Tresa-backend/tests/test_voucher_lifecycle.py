import unittest
from datetime import datetime, timedelta
from uuid import uuid4

from app.models.voucher_purchase import VoucherPurchase
from app.services.voucher_lifecycle import duration_to_timedelta, update_voucher_lifecycle


def make_voucher() -> VoucherPurchase:
    return VoucherPurchase(
        wallet_id=uuid4(),
        router_name="TEST",
        phone_number="BULK",
        voucher_code="TEST-CODE",
        package_id=1,
        profile="24hours",
        speed_type="Standard",
        amount=1000,
        devices="1",
        data="Test",
        status="PROVISIONED",
    )


class VoucherLifecycleTests(unittest.TestCase):
    def test_package_durations_are_parsed(self) -> None:
        self.assertEqual(duration_to_timedelta("24hours"), timedelta(hours=24))
        self.assertEqual(duration_to_timedelta("7 days"), timedelta(days=7))
        self.assertEqual(duration_to_timedelta("1d12h"), timedelta(hours=36))

    def test_unused_voucher_never_expires(self) -> None:
        voucher = make_voucher()
        update_voucher_lifecycle(
            voucher,
            package_limit="1hour",
            is_online=False,
            has_router_usage=False,
            now=datetime(2026, 6, 15, 10, 0),
        )
        self.assertEqual(voucher.status, "PROVISIONED")
        self.assertIsNone(voucher.activated_at)
        self.assertIsNone(voucher.expires_at)

    def test_expired_status_requires_first_activation(self) -> None:
        voucher = make_voucher()
        voucher.expires_at = datetime(2026, 6, 15, 9, 0)
        update_voucher_lifecycle(
            voucher,
            package_limit="1hour",
            is_online=False,
            has_router_usage=False,
            now=datetime(2026, 6, 15, 10, 0),
        )
        self.assertEqual(voucher.status, "PROVISIONED")

    def test_first_use_records_expiry_and_tracks_connection(self) -> None:
        voucher = make_voucher()
        activated = datetime(2026, 6, 15, 10, 0)
        update_voucher_lifecycle(
            voucher,
            package_limit="1hour",
            is_online=True,
            has_router_usage=True,
            now=activated,
        )
        self.assertEqual(voucher.status, "ONLINE")
        self.assertEqual(voucher.activated_at, activated)
        self.assertEqual(voucher.expires_at, activated + timedelta(hours=1))

        update_voucher_lifecycle(
            voucher,
            package_limit="1hour",
            is_online=False,
            has_router_usage=True,
            now=activated + timedelta(minutes=30),
        )
        self.assertEqual(voucher.status, "OFFLINE")

        update_voucher_lifecycle(
            voucher,
            package_limit="1hour",
            is_online=False,
            has_router_usage=True,
            now=activated + timedelta(hours=1),
        )
        self.assertEqual(voucher.status, "EXPIRED")

    def test_existing_router_uptime_restores_original_activation(self) -> None:
        voucher = make_voucher()
        checked_at = datetime(2026, 6, 15, 12, 0)
        update_voucher_lifecycle(
            voucher,
            package_limit="2hours",
            is_online=False,
            has_router_usage=True,
            router_uptime=timedelta(hours=3),
            now=checked_at,
        )
        self.assertEqual(voucher.activated_at, checked_at - timedelta(hours=3))
        self.assertEqual(voucher.expires_at, checked_at - timedelta(hours=1))
        self.assertEqual(voucher.status, "EXPIRED")


if __name__ == "__main__":
    unittest.main()
