from fastapi import APIRouter, Body, Depends, HTTPException
from ..models.schemas import EmailGenerateRequest, BulkEnrichRequest, AIGenerateRequest, EmailSendRequest
from ..services.gemini_service import enrich_lead_with_ai, generate_cold_email, generate_email_sequence, generate_prospect_summary
from ..services.email_service import send_email_via_resend
from ..repositories.lead_repository import LeadRepository, get_repository

router = APIRouter(prefix="/ai", tags=["ai"])


def _merge_enrichment_with_existing(lead: dict, enriched: dict) -> dict:
    return {
        "score": enriched.get("score") if enriched.get("score") is not None else lead.get("score"),
        "summary": lead.get("summary") or enriched.get("summary"),
        "industry": lead.get("industry") or enriched.get("industry"),
        "company_size": lead.get("company_size") or enriched.get("company_size"),
        "revenue": lead.get("revenue") or enriched.get("revenue"),
        "tags": lead.get("tags") or enriched.get("tags"),
        "enriched": True,
    }


async def _refresh_email_draft_for_enriched_lead(lead: dict, repository: LeadRepository) -> dict:
    emails = await generate_email_sequence(lead)
    saved = repository.save_generated_sequence(lead["id"], emails, "professional")
    return saved[0]


@router.post("/enrich/{lead_id}", response_model=dict)
async def enrich_lead(lead_id: str, repository: LeadRepository = Depends(get_repository)):
    lead = repository.get_lead(lead_id)
    enriched = await enrich_lead_with_ai(lead)
    updated_lead = repository.update_lead(lead_id, _merge_enrichment_with_existing(lead, enriched))
    await _refresh_email_draft_for_enriched_lead(updated_lead, repository)
    repository.log_activity(lead_id, "Enriched", f"AI enriched lead {lead.get('name')}")
    return updated_lead


@router.get("/email/{lead_id}/draft", response_model=dict | None)
async def get_email_draft(lead_id: str, repository: LeadRepository = Depends(get_repository)):
    return repository.get_latest_email_draft(lead_id)


@router.get("/email/{lead_id}/sequence", response_model=list[dict])
async def get_email_sequence(lead_id: str, repository: LeadRepository = Depends(get_repository)):
    sequence = repository.get_email_sequence(lead_id)
    steps = {int(email.get("sequence_step") or 1) for email in sequence}
    if {1, 2, 3, 4}.issubset(steps):
        return sequence

    lead = repository.get_lead(lead_id)
    if not lead.get("enriched"):
        return sequence

    emails = await generate_email_sequence(lead)
    return repository.save_generated_sequence(lead_id, emails, "professional")


@router.post("/email/{lead_id}", response_model=dict)
async def generate_email(
    lead_id: str,
    params: EmailGenerateRequest = Body(default_factory=EmailGenerateRequest),
    repository: LeadRepository = Depends(get_repository),
):
    lead = repository.get_lead(lead_id)
    if not lead.get("enriched"):
        raise HTTPException(status_code=409, detail="Enrich this lead before drafting an email.")
    email = await generate_cold_email(lead, custom_context=params.custom_context or "")
    saved_email = repository.save_generated_email(lead_id, email["subject"], email["body"], "professional")
    return {
        "id": saved_email.get("id"),
        "subject": saved_email.get("subject", email["subject"]),
        "body": saved_email.get("body", email["body"]),
        "tone": saved_email.get("tone", "professional"),
        "sent": saved_email.get("sent", False),
    }


@router.post("/email/{lead_id}/sequence", response_model=list[dict])
async def generate_sequence(
    lead_id: str,
    params: EmailGenerateRequest = Body(default_factory=EmailGenerateRequest),
    repository: LeadRepository = Depends(get_repository),
):
    lead = repository.get_lead(lead_id)
    if not lead.get("enriched"):
        raise HTTPException(status_code=409, detail="Enrich this lead before drafting an email sequence.")
    emails = await generate_email_sequence(lead, custom_context=params.custom_context or "")
    return repository.save_generated_sequence(lead_id, emails, "professional")


@router.post("/email/{lead_id}/send", response_model=dict)
async def send_email(
    lead_id: str, payload: EmailSendRequest, repository: LeadRepository = Depends(get_repository)
):
    lead = repository.get_lead(lead_id)
    if not lead.get("enriched"):
        raise HTTPException(status_code=409, detail="Enrich this lead before sending email.")
    provider_result = await send_email_via_resend(
        to_email=lead["email"],
        subject=payload.subject,
        body=payload.body,
        from_email=payload.from_email,
        reply_to=payload.reply_to,
    )
    sent_email = repository.mark_email_sent(
        lead_id,
        email_id=payload.email_id,
        subject=payload.subject,
        body=payload.body,
        provider_message_id=provider_result.get("id"),
    )
    return {
        "id": sent_email.get("id"),
        "sequence_step": sent_email.get("sequence_step", 1),
        "sequence_label": sent_email.get("sequence_label", "Intro"),
        "subject": sent_email.get("subject", payload.subject),
        "body": sent_email.get("body", payload.body),
        "tone": sent_email.get("tone", "professional"),
        "sent": sent_email.get("sent", True),
        "delivered": sent_email.get("delivered", False),
        "provider_id": provider_result.get("id"),
    }


@router.get("/email-config")
async def get_email_config():
    from ..core.settings import get_settings

    settings = get_settings()
    return {
        "default_from_email": settings.resend_from_email,
        "default_reply_to": settings.resend_reply_to,
    }


@router.post("/summary/{lead_id}")
async def get_summary(lead_id: str, repository: LeadRepository = Depends(get_repository)):
    lead = repository.get_lead(lead_id)
    summary = await generate_prospect_summary(lead)
    repository.update_lead(lead_id, {"summary": summary})
    repository.log_activity(lead_id, "Summary generated", f"Generated prospect summary for {lead.get('name')}")
    return {"summary": summary}


@router.post("/bulk-enrich")
async def bulk_enrich(body: BulkEnrichRequest, repository: LeadRepository = Depends(get_repository)):
    results = []
    for lead_id in body.ids:
        try:
            lead = repository.get_lead(lead_id)
            enriched = await enrich_lead_with_ai(lead)
            updated_lead = repository.update_lead(lead_id, _merge_enrichment_with_existing(lead, enriched))
            await _refresh_email_draft_for_enriched_lead(updated_lead, repository)
            repository.log_activity(lead_id, "Enriched", f"Bulk AI enriched lead {lead.get('name')}")
            results.append({"id": lead_id, "status": "enriched"})
        except HTTPException:
            results.append({"id": lead_id, "status": "not_found"})
    return {"results": results, "total": len(results)}


@router.post("/generate")
async def generate_ai_content(body: AIGenerateRequest):
    """Generic AI generation endpoint."""
    import google.generativeai as genai
    from ..core.settings import get_settings

    settings = get_settings()
    try:
        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel(settings.gemini_model)
        response = model.generate_content(body.prompt)
        return {"text": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
