from __future__ import annotations

from cryptography.fernet import Fernet, InvalidToken

from .config import Settings


class EncryptionConfigurationError(Exception):
    """Raised when encryption is not configured correctly."""


class SecretCipher:
    def __init__(self, key: str) -> None:
        if not key.strip():
            raise EncryptionConfigurationError("APP_ENCRYPTION_KEY is required.")

        try:
            self._fernet = Fernet(key.encode("utf-8"))
        except (TypeError, ValueError) as exc:
            raise EncryptionConfigurationError(
                "APP_ENCRYPTION_KEY must be a valid Fernet key."
            ) from exc

    @classmethod
    def from_settings(cls, settings: Settings) -> "SecretCipher":
        return cls(settings.app_encryption_key)

    def encrypt(self, value: str) -> str:
        return self._fernet.encrypt(value.encode("utf-8")).decode("utf-8")

    def decrypt(self, value: str) -> str:
        try:
            return self._fernet.decrypt(value.encode("utf-8")).decode("utf-8")
        except InvalidToken as exc:
            raise EncryptionConfigurationError(
                "Stored Groq credentials could not be decrypted."
            ) from exc
