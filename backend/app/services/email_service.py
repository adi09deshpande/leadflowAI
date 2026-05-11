from html import escape

import httpx
from fastapi import HTTPException

from ..core.settings import get_settings


def _text_to_html(text: str) -> str:
    paragraphs = [segment.strip() for segment in text.split("\n\n") if segment.strip()]
    if not paragraphs:
        return "<p></p>"
    return "".join(
        f"<p>{escape(paragraph).replace(chr(10), '<br />')}</p>"
        for paragraph in paragraphs
    )


async def send_email_via_resend(
    *, to_email: str, subject: str, body: str, from_email: str | None = None, reply_to: str | None = None
) -> dict:
    settings = get_settings()
    sender = from_email or settings.resend_from_email
    reply_target = reply_to or settings.resend_reply_to

    if not settings.resend_api_key or not sender:
        raise HTTPException(
            status_code=503,
            detail="Email provider is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL in the root .env file.",
        )

    payload = {
        "from": sender,
        "to": [to_email],
        "subject": subject,
        "text": body,
        "html": _text_to_html(body),
    }
    if reply_target:
        payload["reply_to"] = reply_target

    headers = {
        "Authorization": f"Bearer {settings.resend_api_key}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post("https://api.resend.com/emails", json=payload, headers=headers)
        if response.status_code >= 400:
            detail = response.json().get("message") if response.headers.get("content-type", "").startswith("application/json") else response.text
            raise HTTPException(status_code=502, detail=f"Resend send failed: {detail or response.reason_phrase}")
        data = response.json()
        return {"id": data.get("id")}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Resend request failed: {exc}") from exc
