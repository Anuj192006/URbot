from __future__ import annotations

import logging

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .groq_service import (
    GroqConfigurationError,
    GroqKeyValidationError,
    GroqServiceError,
    generate_chat_reply,
    validate_groq_api_key,
)
from .models import (
    BotCreateRequest,
    BotUpdateRequest,
    ChatRequest,
    ChatResponse,
    CreateBotResponse,
    CreatedBotSummary,
    DeleteBotResponse,
    HealthResponse,
    ManageBotResponse,
    PublicBotResponse,
    ValidateGroqKeyRequest,
    ValidateGroqKeyResponse,
)
from .rate_limit import (
    BOT_CREATION_RULE,
    CHAT_RULE,
    KEY_VALIDATION_RULE,
    MANAGEMENT_RULE,
    enforce_rate_limit,
)
from .storage import (
    BotNotFoundError,
    BotStorage,
    InvalidManagementTokenError,
    InvalidSlugError,
    StorageConfigurationError,
    StorageError,
)


logger = logging.getLogger(__name__)
settings = get_settings()
storage = BotStorage(settings)

app = FastAPI(title="URbot API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event() -> None:
    storage.ensure_storage_ready()


def _raise_storage_configuration_error(exc: StorageConfigurationError) -> None:
    logger.warning("Storage configuration issue: %s", exc)
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=(
            "Server storage is not configured correctly. Set APP_ENCRYPTION_KEY and "
            "make sure the bot data directory is writable."
        ),
    ) from exc


@app.get("/api/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    storage.ensure_storage_ready()
    return HealthResponse(status="ok")


@app.post("/api/validate-groq-key", response_model=ValidateGroqKeyResponse)
async def validate_creator_groq_key(
    payload: ValidateGroqKeyRequest,
    request: Request,
) -> ValidateGroqKeyResponse:
    enforce_rate_limit(request, KEY_VALIDATION_RULE)

    try:
        await validate_groq_api_key(payload.groq_api_key)
    except GroqKeyValidationError as exc:
        return ValidateGroqKeyResponse(valid=False, detail=str(exc))
    except GroqServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    return ValidateGroqKeyResponse(valid=True)


@app.post(
    "/api/bots",
    response_model=CreateBotResponse,
    response_model_exclude_none=True,
    status_code=status.HTTP_201_CREATED,
)
async def create_bot(payload: BotCreateRequest, request: Request) -> CreateBotResponse:
    enforce_rate_limit(request, BOT_CREATION_RULE)

    try:
        await validate_groq_api_key(payload.groq_api_key)
        record, edit_token = storage.create_bot(payload)
    except StorageConfigurationError as exc:
        _raise_storage_configuration_error(exc)
    except GroqKeyValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except GroqServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc
    except StorageError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create chatbot right now.",
        ) from exc

    return CreateBotResponse(
        slug=record.slug,
        edit_token=edit_token,
        bot=CreatedBotSummary(
            name=record.name,
            description=record.description,
            welcome_message=record.welcome_message,
        ),
    )


@app.get(
    "/api/bots/{slug}",
    response_model=PublicBotResponse,
    response_model_exclude_none=True,
)
def get_public_bot(slug: str) -> PublicBotResponse:
    try:
        return storage.get_public_bot(slug)
    except StorageConfigurationError as exc:
        _raise_storage_configuration_error(exc)
    except InvalidSlugError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid bot link.",
        ) from exc
    except BotNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chatbot not found.",
        ) from exc


@app.post("/api/bots/{slug}/chat", response_model=ChatResponse)
async def chat_with_bot(slug: str, payload: ChatRequest, request: Request) -> ChatResponse:
    enforce_rate_limit(request, CHAT_RULE)

    try:
        bot = storage.get_bot(slug)
    except StorageConfigurationError as exc:
        _raise_storage_configuration_error(exc)
    except InvalidSlugError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid bot link.",
        ) from exc
    except BotNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chatbot not found.",
        ) from exc

    try:
        reply = await generate_chat_reply(
            bot,
            payload.message,
            payload.history[-10:],
            settings.app_encryption_key,
        )
    except GroqConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except GroqServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Chat service is temporarily unavailable.",
        ) from exc

    return ChatResponse(reply=reply)


@app.get(
    "/api/manage/{slug}/{token}",
    response_model=ManageBotResponse,
    response_model_exclude_none=True,
)
def get_manage_bot(slug: str, token: str) -> ManageBotResponse:
    try:
        return storage.get_manage_bot(slug, token)
    except StorageConfigurationError as exc:
        _raise_storage_configuration_error(exc)
    except InvalidSlugError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid management link.",
        ) from exc
    except BotNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chatbot not found.",
        ) from exc
    except InvalidManagementTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid management link.",
        ) from exc


@app.put(
    "/api/manage/{slug}/{token}",
    response_model=ManageBotResponse,
    response_model_exclude_none=True,
)
async def update_manage_bot(
    slug: str, token: str, payload: BotUpdateRequest, request: Request
) -> ManageBotResponse:
    enforce_rate_limit(request, MANAGEMENT_RULE)

    try:
        if payload.groq_api_key:
            await validate_groq_api_key(payload.groq_api_key)
        return storage.update_bot(slug, token, payload)
    except StorageConfigurationError as exc:
        _raise_storage_configuration_error(exc)
    except GroqKeyValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except GroqServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc
    except InvalidSlugError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid management link.",
        ) from exc
    except BotNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chatbot not found.",
        ) from exc
    except InvalidManagementTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid management link.",
        ) from exc
    except StorageError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to update chatbot right now.",
        ) from exc


@app.delete("/api/manage/{slug}/{token}", response_model=DeleteBotResponse)
def delete_manage_bot(slug: str, token: str, request: Request) -> DeleteBotResponse:
    enforce_rate_limit(request, MANAGEMENT_RULE)

    try:
        storage.delete_bot(slug, token)
    except StorageConfigurationError as exc:
        _raise_storage_configuration_error(exc)
    except InvalidSlugError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid management link.",
        ) from exc
    except BotNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chatbot not found.",
        ) from exc
    except InvalidManagementTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid management link.",
        ) from exc
    except StorageError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to delete chatbot right now.",
        ) from exc

    return DeleteBotResponse(detail="Chatbot deleted.")
