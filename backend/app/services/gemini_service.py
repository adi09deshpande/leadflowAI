from functools import lru_cache
import json
from fastapi import HTTPException

import google.generativeai as genai

from ..core.settings import get_settings


PERSONAL_EMAIL_DOMAINS = {
    "gmail.com",
    "yahoo.com",
    "outlook.com",
    "hotmail.com",
    "icloud.com",
    "aol.com",
    "proton.me",
    "protonmail.com",
}

DECISION_MAKER_KEYWORDS = (
    "founder",
    "co-founder",
    "ceo",
    "chief",
    "owner",
    "president",
    "vp",
    "vice president",
    "director",
    "head",
    "manager",
    "lead",
    "growth",
    "sales",
    "marketing",
    "revenue",
    "business development",
    "partnership",
)


@lru_cache
def get_model():
    settings = get_settings()
    try:
        genai.configure(api_key=settings.gemini_api_key)
        return genai.GenerativeModel(settings.gemini_model)
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Gemini configuration is invalid. Check GEMINI_API_KEY and GEMINI_MODEL in the root .env file.",
        ) from exc


def _map_gemini_exception(exc: Exception) -> HTTPException:
    message = str(exc)
    normalized = message.lower()

    if "api key not valid" in normalized or "invalid api key" in normalized:
        return HTTPException(
            status_code=401,
            detail="Gemini API key is invalid. Update GEMINI_API_KEY in .env and restart the backend.",
        )

    if (
        "permission_denied" in normalized
        or "permission denied" in normalized
        or "access restricted" in normalized
        or "denied access" in normalized
        or "project has been denied access" in normalized
    ):
        return HTTPException(
            status_code=403,
            detail=(
                "Gemini project/key does not have access. Check that the project is imported in Google AI Studio, "
                "Gemini is allowed for your account/region, and billing is enabled if required."
            ),
        )

    if "failed_precondition" in normalized:
        return HTTPException(
            status_code=400,
            detail="Gemini is not enabled for this project plan/region. Enable billing or use a supported project/account.",
        )

    if "resource_exhausted" in normalized or "quota" in normalized or "429" in normalized:
        return HTTPException(
            status_code=429,
            detail="Gemini quota exceeded. Use a project with available quota or wait for the quota reset.",
        )

    if "503" in normalized or "unavailable" in normalized:
        return HTTPException(
            status_code=503,
            detail="Gemini is temporarily unavailable. Please retry in a moment.",
        )

    return HTTPException(status_code=502, detail=f"Gemini request failed: {message}")


def _generate(prompt: str, *, json_mode: bool = False) -> str:
    try:
        kwargs = {"generation_config": {"response_mime_type": "application/json"}} if json_mode else {}
        response = get_model().generate_content(prompt, **kwargs)
        if not response.text:
            raise HTTPException(status_code=502, detail="Gemini returned an empty response")
        return response.text
    except HTTPException:
        raise
    except Exception as exc:
        raise _map_gemini_exception(exc) from exc


def _extract_json_object(text: str) -> str:
    cleaned = text.strip()
    if "```" in cleaned:
        parts = cleaned.split("```")
        cleaned = parts[1] if len(parts) > 1 else cleaned
        cleaned = cleaned.lstrip("json").strip()

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1 and end > start:
        return cleaned[start:end + 1]
    return cleaned


def _parse_json_response(text: str) -> dict:
    cleaned = _extract_json_object(text)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail=f"Gemini returned invalid JSON: {cleaned[:200]}") from exc


def _has_value(value) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        normalized = value.strip().lower()
        return bool(normalized and normalized not in {"unknown", "n/a", "na", "none", "null"})
    if isinstance(value, list):
        return any(_has_value(item) for item in value)
    return True


def calculate_rule_based_score(lead: dict) -> int:
    score = 0
    email = str(lead.get("email") or "").strip().lower()
    title = str(lead.get("title") or "").strip().lower()

    if _has_value(lead.get("name")):
        score += 5
    if _has_value(email) and "@" in email:
        score += 10
        domain = email.rsplit("@", 1)[-1]
        if domain and domain not in PERSONAL_EMAIL_DOMAINS:
            score += 10
    if _has_value(lead.get("company")):
        score += 10
    if _has_value(title):
        score += 10
        if any(keyword in title for keyword in DECISION_MAKER_KEYWORDS):
            score += 20
    if _has_value(lead.get("website")):
        score += 10
    if _has_value(lead.get("linkedin")):
        score += 10
    if _has_value(lead.get("industry")):
        score += 10
    if _has_value(lead.get("company_size")):
        score += 10
    if _has_value(lead.get("revenue")):
        score += 5
    if _has_value(lead.get("location")):
        score += 5
    if _has_value(lead.get("summary")):
        score += 5
    if _has_value(lead.get("tags")):
        score += 5

    return max(0, min(100, score))


def _coerce_enrichment(data: dict) -> dict:
    tags = data.get("tags")
    if isinstance(tags, str):
        tags = [tag.strip() for tag in tags.split(",") if tag.strip()]
    elif isinstance(tags, list):
        tags = [str(tag).strip() for tag in tags if str(tag).strip()]
    else:
        tags = []

    return {
        "summary": data.get("summary"),
        "industry": data.get("industry"),
        "company_size": data.get("company_size"),
        "revenue": data.get("revenue"),
        "tags": tags,
    }


def _parse_email_text(text: str, tone: str = "professional") -> dict:
    lines = [line.rstrip() for line in text.strip().splitlines()]
    subject = next((line.split(":", 1)[1].strip() for line in lines if line.lower().startswith("subject:")), "")

    if not subject:
        subject = "Quick idea for your pipeline"

    body_lines = []
    subject_found = False
    for line in lines:
        if line.lower().startswith("subject:"):
            subject_found = True
            continue
        if subject_found:
            body_lines.append(line)

    body = "\n".join(body_lines).strip() or text.strip()
    return {"subject": subject, "body": body, "tone": tone}


def _coerce_sequence(data: dict) -> list[dict]:
    raw_emails = data.get("emails") if isinstance(data, dict) else None
    if not isinstance(raw_emails, list):
        raise HTTPException(status_code=502, detail="Gemini did not return an email sequence")

    labels = {
        1: "Intro",
        2: "Follow-up",
        3: "Value proof",
        4: "Breakup",
    }
    sequence = []
    for index, item in enumerate(raw_emails[:4], start=1):
        if not isinstance(item, dict):
            continue
        subject = str(item.get("subject") or "").strip()
        body = str(item.get("body") or "").strip()
        if subject and body:
            sequence.append(
                {
                    "sequence_step": index,
                    "sequence_label": item.get("sequence_label") or labels[index],
                    "subject": subject,
                    "body": body,
                    "tone": "professional",
                }
            )

    if len(sequence) != 4:
        raise HTTPException(status_code=502, detail="Gemini returned an incomplete email sequence")
    return sequence


async def enrich_lead_with_ai(lead: dict) -> dict:
    prompt = f"""
You are a B2B sales intelligence expert. Analyze this lead and provide enriched data.

Lead:
- Name: {lead.get('name')}
- Email: {lead.get('email')}
- Company: {lead.get('company')}
- Title: {lead.get('title', 'Unknown')}
- Location: {lead.get('location', 'Unknown')}

Return ONLY a JSON object (no markdown, no explanation) with these fields:
{{
  "summary": "<2-3 sentence prospect summary>",
  "industry": "<industry>",
  "company_size": "<1-10|11-50|51-200|201-500|500+>",
  "revenue": "<<$1M|$1M-$5M|$5M-$20M|$20M-$50M|$50M+>",
  "tags": ["tag1", "tag2"]
}}
"""
    data = _coerce_enrichment(_parse_json_response(_generate(prompt, json_mode=True)))
    data["score"] = calculate_rule_based_score({**lead, **data})
    return {**lead, **data, "enriched": True}


async def generate_cold_email(lead: dict, custom_context: str = "") -> dict:
    tone = "professional"
    prompt = f"""
Write one concise, high-quality B2B cold email draft.

Lead facts:
- First name: {lead.get('name')}
- Role: {lead.get('title') or 'Decision maker'}
- Company: {lead.get('company')}
- Industry: {lead.get('industry') or 'Unknown'}
- Company size: {lead.get('company_size') or 'Unknown'}
- Summary: {lead.get('summary') or 'Unknown'}
- Tags: {', '.join(lead.get('tags', [])) or 'None'}
{f'- Extra context: {custom_context}' if custom_context else ''}

Offer:
- Product: LeadFlow AI
- Description: AI-powered lead generation and CRM workflow for outbound teams

Return ONLY JSON:
{{"subject":"...","body":"..."}}

Rules:
- 80-120 words
- professional tone
- first name only
- no placeholders
- no brackets
- no made-up metrics
- no generic hype
- one specific CTA
"""
    try:
      data = _parse_json_response(_generate(prompt, json_mode=True))
      return {"subject": data.get("subject", ""), "body": data.get("body", ""), "tone": tone}
    except HTTPException:
      fallback_prompt = f"""
Write a personalized B2B cold email for this lead.

Lead: {lead.get('name')}, {lead.get('title')} at {lead.get('company')} ({lead.get('industry', 'Tech')})
Tone: {tone}
Product: LeadFlow AI - AI-powered lead generation & CRM platform
{f'Context: {custom_context}' if custom_context else ''}

Return plain text in exactly this format:
Subject: <subject line>

<email body>
"""
      return _parse_email_text(_generate(fallback_prompt), tone)


async def generate_email_sequence(lead: dict, custom_context: str = "") -> list[dict]:
    prompt = f"""
Write a 4-email B2B outbound sequence for this lead.

Lead facts:
- First name: {lead.get('name')}
- Role: {lead.get('title') or 'Decision maker'}
- Company: {lead.get('company')}
- Industry: {lead.get('industry') or 'Unknown'}
- Company size: {lead.get('company_size') or 'Unknown'}
- Summary: {lead.get('summary') or 'Unknown'}
- Tags: {', '.join(lead.get('tags', [])) or 'None'}
{f'- Extra context: {custom_context}' if custom_context else ''}

Offer:
- Product: LeadFlow AI
- Description: AI-powered lead generation and CRM workflow for outbound teams

Return ONLY JSON:
{{
  "emails": [
    {{"sequence_label":"Intro","subject":"...","body":"..."}},
    {{"sequence_label":"Follow-up","subject":"...","body":"..."}},
    {{"sequence_label":"Value proof","subject":"...","body":"..."}},
    {{"sequence_label":"Breakup","subject":"...","body":"..."}}
  ]
}}

Rules:
- 70-120 words per email
- professional tone
- first name only
- no placeholders
- no brackets
- no made-up metrics
- no generic hype
- each email should have one specific CTA
- the follow-up should reference the previous email lightly
- the value proof email should use a credible, non-numeric proof point
- the breakup email should be polite and low-pressure
"""
    data = _parse_json_response(_generate(prompt, json_mode=True))
    return _coerce_sequence(data)


async def generate_prospect_summary(lead: dict) -> str:
    prompt = f"""
Write a 2-3 sentence B2B prospect summary for a sales rep.
Lead: {lead.get('name')}, {lead.get('title')} at {lead.get('company')}
Be specific, insightful, no generic fluff.
"""
    return _generate(prompt).strip()
