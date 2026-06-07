from __future__ import annotations

import hmac
import json
import os
import tempfile
from pathlib import Path

from .config import Settings
from .crypto_service import EncryptionConfigurationError, SecretCipher
from .models import (
    BotCreateRequest,
    BotUpdateRequest,
    ManageBotResponse,
    PublicBotResponse,
    StoredBot,
)
from .utils import (
    generate_bot_id,
    generate_edit_token,
    generate_slug,
    hash_token,
    is_valid_slug,
    utc_now_iso,
)


class BotNotFoundError(Exception):
    """Raised when a bot cannot be found."""


class InvalidManagementTokenError(Exception):
    """Raised when a management token does not match."""


class InvalidSlugError(Exception):
    """Raised when a slug is malformed."""


class StorageError(Exception):
    """Raised when storage operations fail."""


class StorageConfigurationError(StorageError):
    """Raised when storage is not configured."""


class BotStorage:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.data_dir = settings.data_dir
        self.bots_dir = self.data_dir / "bots"
        self._cipher: SecretCipher | None = None

    def ensure_storage_ready(self) -> None:
        try:
            self.bots_dir.mkdir(parents=True, exist_ok=True)
            self._get_cipher()
        except EncryptionConfigurationError as exc:
            raise StorageConfigurationError(str(exc)) from exc
        except OSError as exc:
            raise StorageError("Unable to create the storage directory.") from exc

    def create_bot(self, payload: BotCreateRequest) -> tuple[StoredBot, str]:
        self.ensure_storage_ready()

        for _ in range(20):
            slug = generate_slug(payload.name)
            path = self._bot_path(slug)
            if path.exists():
                continue

            edit_token = generate_edit_token()
            now = utc_now_iso()
            record = StoredBot(
                id=generate_bot_id(),
                slug=slug,
                name=payload.name,
                description=payload.description,
                welcome_message=payload.welcome_message,
                system_instructions=payload.system_instructions,
                knowledge_text=payload.knowledge_text,
                strict_grounding=payload.strict_grounding,
                edit_token_hash=hash_token(edit_token),
                encrypted_groq_api_key=self._get_cipher().encrypt(payload.groq_api_key),
                created_at=now,
                updated_at=now,
            )
            self._write_bot(record)
            return record, edit_token

        raise StorageError("Unable to generate a unique slug.")

    def get_bot(self, slug: str) -> StoredBot:
        path = self._bot_path(slug)
        if not path.exists():
            raise BotNotFoundError("Bot not found.")

        try:
            with path.open("r", encoding="utf-8") as file:
                payload = json.load(file)
        except (OSError, json.JSONDecodeError) as exc:
            raise StorageError("Unable to read bot data.") from exc

        return StoredBot.model_validate(payload)

    def get_public_bot(self, slug: str) -> PublicBotResponse:
        record = self.get_bot(slug)
        return PublicBotResponse(
            slug=record.slug,
            name=record.name,
            description=record.description,
            welcome_message=record.welcome_message,
        )

    def get_manage_bot(self, slug: str, token: str) -> ManageBotResponse:
        record = self._get_verified_bot(slug, token)
        return self._to_manage_response(record)

    def update_bot(
        self, slug: str, token: str, payload: BotUpdateRequest
    ) -> ManageBotResponse:
        record = self._get_verified_bot(slug, token)
        updates = {
            "name": payload.name,
            "description": payload.description,
            "welcome_message": payload.welcome_message,
            "system_instructions": payload.system_instructions,
            "knowledge_text": payload.knowledge_text,
            "strict_grounding": payload.strict_grounding,
            "updated_at": utc_now_iso(),
        }
        if payload.groq_api_key:
            updates["encrypted_groq_api_key"] = self._get_cipher().encrypt(
                payload.groq_api_key
            )

        updated_record = record.model_copy(update=updates)
        self._write_bot(updated_record)
        return self._to_manage_response(updated_record)

    def delete_bot(self, slug: str, token: str) -> None:
        self._get_verified_bot(slug, token)
        path = self._bot_path(slug)

        try:
            path.unlink()
        except FileNotFoundError as exc:
            raise BotNotFoundError("Bot not found.") from exc
        except OSError as exc:
            raise StorageError("Unable to delete bot.") from exc

    def _get_verified_bot(self, slug: str, token: str) -> StoredBot:
        record = self.get_bot(slug)
        supplied_hash = hash_token(token)
        if not hmac.compare_digest(supplied_hash, record.edit_token_hash):
            raise InvalidManagementTokenError("Invalid management token.")
        return record

    def _get_cipher(self) -> SecretCipher:
        if self._cipher is None:
            self._cipher = SecretCipher.from_settings(self.settings)
        return self._cipher

    def _write_bot(self, record: StoredBot) -> None:
        path = self._bot_path(record.slug)
        temp_path: Path | None = None

        try:
            with tempfile.NamedTemporaryFile(
                "w",
                encoding="utf-8",
                dir=self.bots_dir,
                suffix=".tmp",
                delete=False,
            ) as temp_file:
                json.dump(record.model_dump(mode="json"), temp_file, indent=2, ensure_ascii=True)
                temp_file.flush()
                os.fsync(temp_file.fileno())
                temp_path = Path(temp_file.name)

            os.replace(temp_path, path)
        except OSError as exc:
            raise StorageError("Unable to save bot.") from exc
        finally:
            if temp_path and temp_path.exists():
                try:
                    temp_path.unlink()
                except OSError:
                    pass

    def _bot_path(self, slug: str) -> Path:
        if not is_valid_slug(slug):
            raise InvalidSlugError("Invalid slug.")

        candidate = (self.bots_dir / f"{slug}.json").resolve()
        bots_root = self.bots_dir.resolve()
        if bots_root not in candidate.parents:
            raise InvalidSlugError("Invalid slug.")
        return candidate

    @staticmethod
    def _to_manage_response(record: StoredBot) -> ManageBotResponse:
        return ManageBotResponse(
            slug=record.slug,
            name=record.name,
            description=record.description,
            welcome_message=record.welcome_message,
            system_instructions=record.system_instructions,
            knowledge_text=record.knowledge_text,
            strict_grounding=record.strict_grounding,
            has_groq_api_key=bool(record.encrypted_groq_api_key),
            created_at=record.created_at,
            updated_at=record.updated_at,
        )
