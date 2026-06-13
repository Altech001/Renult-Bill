import unittest

from app.services.portal import _hotspot_limit_to_routeros


class HotspotLimitToRouterOsTests(unittest.TestCase):
    def test_converts_human_readable_package_limits(self) -> None:
        cases = {
            "1minute": "1m",
            "1minutes": "1m",
            " 30 minutes ": "30m",
            "2hours": "2h",
            "3days": "3d",
            "4weeks": "4w",
            "2months": "60d",
            "45seconds": "45s",
        }

        for package_limit, expected in cases.items():
            with self.subTest(package_limit=package_limit):
                self.assertEqual(_hotspot_limit_to_routeros(package_limit), expected)

    def test_preserves_routeros_duration_values(self) -> None:
        self.assertEqual(_hotspot_limit_to_routeros("1m"), "1m")
        self.assertEqual(_hotspot_limit_to_routeros("1d12h"), "1d12h")

    def test_empty_limit_is_omitted(self) -> None:
        self.assertIsNone(_hotspot_limit_to_routeros("  "))


if __name__ == "__main__":
    unittest.main()
