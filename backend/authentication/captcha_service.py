"""Six-character CAPTCHA challenge creation and one-time verification."""
from __future__ import annotations

import secrets
import threading
import time


class CaptchaService:
    ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    EXPIRY_SECONDS = 10 * 60

    def __init__(self) -> None:
        self._challenges: dict[str, dict] = {}
        self._lock = threading.Lock()

    def create(self) -> dict:
        code = "".join(secrets.choice(self.ALPHABET) for _ in range(6))
        challenge_id = secrets.token_urlsafe(24)

        with self._lock:
            self._challenges[challenge_id] = {
                "answer": code,
                "created_at": time.time(),
            }

        return {
            "captcha_id": challenge_id,
            "captcha_code": code,
            "expires_in": self.EXPIRY_SECONDS,
        }

    def verify(self, challenge_id: str, answer: str) -> bool:
        with self._lock:
            challenge = self._challenges.pop(challenge_id, None)

        if not challenge:
            return False

        is_expired = time.time() - challenge["created_at"] > self.EXPIRY_SECONDS
        matches = secrets.compare_digest(
            challenge["answer"],
            answer.strip().upper(),
        )
        return not is_expired and matches
