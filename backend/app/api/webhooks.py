import base64
import hashlib
import hmac
import json
import time
from typing import Any

from fastapi import APIRouter, HTTPException, Request, status

from ..core.settings import get_settings
from ..repositories.lead_repository import LeadRepository

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


EVENT_TRACKING_MAP = {
    "email.delivered": {"delivered": True},
}


def _decode_svix_secret(secret: str) -> bytes:
    value = secret.removeprefix("whsec_")
    value += "=" * (-len(value) % 4)
    return base64.b64decode(value)


def _verify_svix_signature(raw_body: bytes, headers: dict[str, str], secret: str) -> None:
    message_id = headers.get("svix-id")
    timestamp = headers.get("svix-timestamp")
    signatures = headers.get("svix-signature", "")

    if not message_id or not timestamp or not signatures:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing webhook signature headers")

    try:
        timestamp_int = int(timestamp)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook timestamp") from exc

    if abs(time.time() - timestamp_int) > 300:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Webhook timestamp is too old")

    signed_content = f"{message_id}.{timestamp}.".encode("utf-8") + raw_body
    expected = base64.b64encode(
        hmac.new(_decode_svix_secret(secret), signed_content, hashlib.sha256).digest()
    ).decode("utf-8")

    valid = any(
        hmac.compare_digest(signature.removeprefix("v1,"), expected)
        for signature in signatures.split()
    )
    if not valid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook signature")


def _extract_provider_message_id(payload: dict[str, Any]) -> str | None:
    data = payload.get("data") if isinstance(payload.get("data"), dict) else {}
    return (
        data.get("email_id")
        or data.get("id")
        or data.get("message_id")
        or payload.get("email_id")
        or payload.get("id")
    )


@router.post("/resend")
async def resend_webhook(request: Request):
    settings = get_settings()
    raw_body = await request.body()

    if settings.resend_webhook_secret:
        _verify_svix_signature(raw_body, dict(request.headers), settings.resend_webhook_secret)

    try:
        payload = json.loads(raw_body.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid webhook JSON") from exc

    event_type = payload.get("type")
    updates = EVENT_TRACKING_MAP.get(event_type)
    provider_message_id = _extract_provider_message_id(payload)

    if not updates:
        return {"received": True, "tracked": False, "reason": "ignored_event", "event": event_type}

    if not provider_message_id:
        return {"received": True, "tracked": False, "reason": "missing_provider_message_id"}

    repository = LeadRepository()
    updated = repository.update_email_tracking_by_provider_id(provider_message_id, updates)

    return {
        "received": True,
        "tracked": bool(updated),
        "event": event_type,
        "provider_message_id": provider_message_id,
    }
