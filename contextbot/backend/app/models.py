from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from .config import get_settings


class ContextBotModel(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)


def _blank_to_none(value: str | None) -> str | None:
    if value is None:
        return None
    if not value.strip():
        return None
    return value.strip()


class BotCreateRequest(ContextBotModel):
    name: str = Field(..., min_length=1, max_length=80)
    description: str | None = Field(default=None, max_length=200)
    welcome_message: str | None = Field(default=None, max_length=300)
    system_instructions: str | None = Field(default=None, max_length=2000)
    knowledge_text: str = Field(..., min_length=1)
    strict_grounding: bool = True
    groq_api_key: str = Field(..., min_length=1, max_length=500)

    @field_validator(
        "description", "welcome_message", "system_instructions", mode="before"
    )
    @classmethod
    def blank_optional_strings_to_none(cls, value: str | None) -> str | None:
        return _blank_to_none(value)

    @field_validator("knowledge_text")
    @classmethod
    def validate_knowledge_text(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Knowledge text is required.")

        max_chars = get_settings().max_knowledge_chars
        if len(value) > max_chars:
            raise ValueError(f"Knowledge text must be {max_chars} characters or fewer.")
        return value.strip()

    @field_validator("groq_api_key")
    @classmethod
    def validate_groq_api_key(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Groq API key is required.")
        return value.strip()


class BotUpdateRequest(ContextBotModel):
    name: str = Field(..., min_length=1, max_length=80)
    description: str | None = Field(default=None, max_length=200)
    welcome_message: str | None = Field(default=None, max_length=300)
    system_instructions: str | None = Field(default=None, max_length=2000)
    knowledge_text: str = Field(..., min_length=1)
    strict_grounding: bool = True
    groq_api_key: str | None = Field(default=None, max_length=500)

    @field_validator(
        "description", "welcome_message", "system_instructions", "groq_api_key", mode="before"
    )
    @classmethod
    def blank_optional_update_strings_to_none(cls, value: str | None) -> str | None:
        return _blank_to_none(value)

    @field_validator("knowledge_text")
    @classmethod
    def validate_update_knowledge_text(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Knowledge text is required.")

        max_chars = get_settings().max_knowledge_chars
        if len(value) > max_chars:
            raise ValueError(f"Knowledge text must be {max_chars} characters or fewer.")
        return value.strip()


class ChatHistoryMessage(ContextBotModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1)

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Message content cannot be empty.")

        max_chars = get_settings().max_message_chars
        if len(value) > max_chars:
            raise ValueError(f"Messages must be {max_chars} characters or fewer.")
        return value.strip()


class ChatRequest(ContextBotModel):
    message: str = Field(..., min_length=1)
    history: list[ChatHistoryMessage] = Field(default_factory=list)

    @field_validator("message")
    @classmethod
    def validate_message(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Message is required.")

        max_chars = get_settings().max_message_chars
        if len(value) > max_chars:
            raise ValueError(f"Messages must be {max_chars} characters or fewer.")
        return value.strip()

    @field_validator("history")
    @classmethod
    def keep_recent_history(cls, value: list[ChatHistoryMessage]) -> list[ChatHistoryMessage]:
        return value[-10:]


class StoredBot(ContextBotModel):
    id: str
    slug: str
    name: str
    description: str | None = None
    welcome_message: str | None = None
    system_instructions: str | None = None
    knowledge_text: str
    strict_grounding: bool
    edit_token_hash: str
    encrypted_groq_api_key: str
    created_at: str
    updated_at: str


class PublicBotResponse(ContextBotModel):
    slug: str
    name: str
    description: str | None = None
    welcome_message: str | None = None


class CreatedBotSummary(ContextBotModel):
    name: str
    description: str | None = None
    welcome_message: str | None = None


class CreateBotResponse(ContextBotModel):
    slug: str
    edit_token: str
    bot: CreatedBotSummary


class ManageBotResponse(ContextBotModel):
    slug: str
    name: str
    description: str | None = None
    welcome_message: str | None = None
    system_instructions: str | None = None
    knowledge_text: str
    strict_grounding: bool
    has_groq_api_key: bool
    created_at: str
    updated_at: str


class ChatResponse(ContextBotModel):
    reply: str


class HealthResponse(ContextBotModel):
    status: str


class DeleteBotResponse(ContextBotModel):
    detail: str


class ValidateGroqKeyRequest(ContextBotModel):
    groq_api_key: str = Field(..., min_length=1, max_length=500)

    @field_validator("groq_api_key")
    @classmethod
    def validate_groq_api_key(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Groq API key is required.")
        return value.strip()


class ValidateGroqKeyResponse(ContextBotModel):
    valid: bool
    detail: str | None = None
