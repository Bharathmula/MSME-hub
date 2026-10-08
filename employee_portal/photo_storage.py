"""Private face-photo storage with a legacy database fallback.

Cloudflare R2 exposes an S3-compatible API.  New photos are stored in R2 when
all required environment variables are present.  Development, tests and older
deployments continue storing/reading the existing data URLs, so enabling R2 is
non-destructive and can be rolled out without a database migration.
"""
from __future__ import annotations

import base64
import binascii
import hashlib
import os
import re
from datetime import datetime, timezone
from functools import lru_cache
from uuid import uuid4

REFERENCE_PREFIX = "r2://"
MAX_PHOTO_BYTES = 1_500_000
CONTENT_EXTENSIONS = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}


class PhotoStorageError(RuntimeError):
    """Raised when a configured R2 operation cannot be completed safely."""


def _setting(name: str) -> str:
    return os.environ.get(name, "").strip()


def r2_configured() -> bool:
    return all(
        _setting(name)
        for name in (
            "MSME_R2_ACCOUNT_ID",
            "MSME_R2_ACCESS_KEY_ID",
            "MSME_R2_SECRET_ACCESS_KEY",
            "MSME_R2_BUCKET_NAME",
        )
    )


def storage_mode() -> str:
    return "cloudflare_r2" if r2_configured() else "database_fallback"


@lru_cache(maxsize=1)
def _client():
    if not r2_configured():
        raise PhotoStorageError("Cloudflare R2 is not configured.")
    try:
        import boto3
        from botocore.config import Config
    except ImportError as exc:  # pragma: no cover - production dependency guard
        raise PhotoStorageError("The boto3 R2 dependency is unavailable.") from exc
    endpoint = _setting("MSME_R2_ENDPOINT_URL") or (
        f"https://{_setting('MSME_R2_ACCOUNT_ID')}.r2.cloudflarestorage.com"
    )
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=_setting("MSME_R2_ACCESS_KEY_ID"),
        aws_secret_access_key=_setting("MSME_R2_SECRET_ACCESS_KEY"),
        region_name="auto",
        config=Config(signature_version="s3v4"),
    )


def _decode_data_url(value: str) -> tuple[str, bytes]:
    match = re.fullmatch(r"data:([^;,]+);base64,(.+)", value or "", re.DOTALL)
    if not match or match.group(1).lower() not in CONTENT_EXTENSIONS:
        raise PhotoStorageError("Only JPEG, PNG or WebP photos are supported.")
    content_type = match.group(1).lower()
    try:
        payload = base64.b64decode(match.group(2), validate=True)
    except (ValueError, binascii.Error) as exc:
        raise PhotoStorageError("The captured photo is not valid Base64 image data.") from exc
    if not payload or len(payload) > MAX_PHOTO_BYTES:
        raise PhotoStorageError("The photo must be smaller than 1.5 MB.")
    return content_type, payload


def _safe_segment(value: str, fallback: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9._-]+", "-", str(value or "").strip()).strip("-.")
    return (cleaned or fallback)[:80]


def _tenant_key(tenant: str) -> str:
    return hashlib.sha256(str(tenant).strip().lower().encode("utf-8")).hexdigest()[:24]


def store_photo(
    data_url: str,
    *,
    tenant: str,
    employee_id: str,
    category: str,
    event_type: str = "",
    captured_at: str = "",
) -> str:
    """Store a photo and return its durable database value.

    Without R2 configuration this intentionally returns the original data URL,
    preserving local development and every existing deployment's behaviour.
    """
    content_type, payload = _decode_data_url(data_url)
    if not r2_configured():
        return data_url

    try:
        captured = datetime.fromisoformat(captured_at) if captured_at else datetime.now(timezone.utc)
    except ValueError:
        captured = datetime.now(timezone.utc)
    if captured.tzinfo is None:
        captured = captured.replace(tzinfo=timezone.utc)
    timestamp = captured.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    extension = CONTENT_EXTENSIONS[content_type]
    employee = _safe_segment(employee_id, "unknown")
    group = "profiles" if category == "profile" else "attendance"
    label = _safe_segment(event_type.lower(), "photo")
    key = (
        f"companies/{_tenant_key(tenant)}/employees/{employee}/{group}/"
        f"{captured.date().isoformat()}/{timestamp}-{label}-{uuid4().hex}.{extension}"
    )
    bucket = _setting("MSME_R2_BUCKET_NAME")
    metadata = {
        "tenant_hash": _tenant_key(tenant),
        "employee_id": employee,
        "category": group,
        "event_type": label,
    }
    try:
        _client().put_object(
            Bucket=bucket,
            Key=key,
            Body=payload,
            ContentType=content_type,
            CacheControl="private, no-store",
            Metadata=metadata,
        )
    except Exception as exc:  # boto providers expose several client exception types
        raise PhotoStorageError("Cloudflare R2 could not save the photo.") from exc
    return f"{REFERENCE_PREFIX}{bucket}/{key}"


def photo_url(reference: str) -> str:
    """Return a browser-safe value for legacy data or a short-lived R2 URL."""
    value = str(reference or "")
    if not value or value.startswith("data:image/"):
        return value
    if value.startswith(("https://", "http://")):
        return value
    if not value.startswith(REFERENCE_PREFIX) or not r2_configured():
        return ""
    bucket_and_key = value[len(REFERENCE_PREFIX):]
    bucket, separator, key = bucket_and_key.partition("/")
    if not separator or not key or bucket != _setting("MSME_R2_BUCKET_NAME"):
        return ""
    try:
        ttl = max(60, min(3600, int(_setting("MSME_R2_PRESIGNED_TTL_SECONDS") or "900")))
        return _client().generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": key},
            ExpiresIn=ttl,
        )
    except Exception:
        return ""
