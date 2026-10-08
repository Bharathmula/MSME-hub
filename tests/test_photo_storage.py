import os
import unittest
from unittest.mock import Mock, patch

from employee_portal import photo_storage


class PhotoStorageTests(unittest.TestCase):
    def setUp(self):
        photo_storage._client.cache_clear()

    def tearDown(self):
        photo_storage._client.cache_clear()

    @patch.dict(os.environ, {
        "MSME_R2_ACCOUNT_ID": "",
        "MSME_R2_ACCESS_KEY_ID": "",
        "MSME_R2_SECRET_ACCESS_KEY": "",
        "MSME_R2_BUCKET_NAME": "",
    })
    def test_unconfigured_storage_preserves_legacy_data_url(self):
        face = "data:image/jpeg;base64,/9j/2Q=="
        self.assertEqual(
            photo_storage.store_photo(
                face,
                tenant="admin@example.com",
                employee_id="W-1",
                category="attendance",
                event_type="CHECK_IN",
            ),
            face,
        )
        self.assertEqual(photo_storage.photo_url(face), face)
        self.assertEqual(photo_storage.storage_mode(), "database_fallback")

    @patch.dict(os.environ, {
        "MSME_R2_ACCOUNT_ID": "account-1",
        "MSME_R2_ACCESS_KEY_ID": "access-1",
        "MSME_R2_SECRET_ACCESS_KEY": "secret-1",
        "MSME_R2_BUCKET_NAME": "private-photos",
    })
    @patch("employee_portal.photo_storage._client")
    def test_configured_storage_uploads_and_returns_signed_url(self, client_factory):
        client = Mock()
        client.generate_presigned_url.return_value = "https://signed.example/photo"
        client_factory.return_value = client
        reference = photo_storage.store_photo(
            "data:image/jpeg;base64,/9j/2Q==",
            tenant="admin@example.com",
            employee_id="W-1",
            category="attendance",
            event_type="CHECK_IN",
            captured_at="2026-10-08T12:00:00+00:00",
        )
        self.assertTrue(reference.startswith("r2://private-photos/companies/"))
        uploaded = client.put_object.call_args.kwargs
        self.assertEqual(uploaded["Bucket"], "private-photos")
        self.assertEqual(uploaded["ContentType"], "image/jpeg")
        self.assertEqual(uploaded["Body"], b"\xff\xd8\xff\xd9")
        self.assertEqual(photo_storage.photo_url(reference), "https://signed.example/photo")
        client.generate_presigned_url.assert_called_once()

    def test_invalid_photo_is_rejected(self):
        with self.assertRaises(photo_storage.PhotoStorageError):
            photo_storage.store_photo(
                "data:text/plain;base64,SGVsbG8=",
                tenant="admin@example.com",
                employee_id="W-1",
                category="attendance",
            )


if __name__ == "__main__":
    unittest.main()
