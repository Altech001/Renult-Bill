import unittest
from unittest.mock import patch

from app.services.ads import _is_cloudflare_media_url
from app.services.portal import _walled_garden_hosts_for_template


class AdAccessTests(unittest.TestCase):
    def test_cloudflare_media_detection(self) -> None:
        with (
            patch("app.services.ads.settings.r2_public_base_url", "https://media.example.com"),
            patch("app.services.ads.settings.r2_endpoint_url", None),
        ):
            self.assertTrue(_is_cloudflare_media_url("https://media.example.com/ad.mp4"))
            self.assertTrue(_is_cloudflare_media_url("https://bucket.r2.dev/ad.mp4"))
            self.assertFalse(_is_cloudflare_media_url("https://www.youtube.com/watch?v=abc"))
            self.assertFalse(_is_cloudflare_media_url("https://advertiser.example/ad.mp4"))

    def test_adsmob_walled_garden_excludes_youtube_and_campaign_hosts(self) -> None:
        router = type("RouterStub", (), {"id": "router-id"})()
        hosts = _walled_garden_hosts_for_template("adsmob", router)

        self.assertFalse(any("youtube" in host for host in hosts))
        self.assertFalse(any("googlevideo" in host for host in hosts))
        self.assertFalse(any("ytimg" in host for host in hosts))


if __name__ == "__main__":
    unittest.main()
