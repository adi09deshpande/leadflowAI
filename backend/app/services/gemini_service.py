from functools import lru_cache
import json
from fastapi import HTTPException

import google.generativeai as genai

from ..core.settings import get_settings


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
        raise HTTPException(status_code=502, detail=f"Gemini request failed: {exc}") from exc


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


def _coerce_enrichment(data: dict) -> dict:
    score = data.get("score")
    try:
        score = max(0, min(100, int(score))) if score is not None else None
    except (TypeError, ValueError):
        score = None

    tags = data.get("tags")
    if isinstance(tags, str):
        tags = [tag.strip() for tag in tags.split(",") if tag.strip()]
    elif isinstance(tags, list):
        tags = [str(tag).strip() for tag in tags if str(tag).strip()]
    else:
        tags = []

    return {
        "score": score,
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
  "score": <integer 0-100>,
  "summary": "<2-3 sentence prospect summary>",
  "industry": "<industry>",
  "company_size": "<1-10|11-50|51-200|201-500|500+>",
  "revenue": "<<$1M|$1M-$5M|$5M-$20M|$20M-$50M|$50M+>",
  "tags": ["tag1", "tag2"]
}}
"""
    data = _coerce_enrichment(_parse_json_response(_generate(prompt, json_mode=True)))
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


async def generate_prospect_summary(lead: dict) -> str:
    prompt = f"""
Write a 2-3 sentence B2B prospect summary for a sales rep.
Lead: {lead.get('name')}, {lead.get('title')} at {lead.get('company')}
Be specific, insightful, no generic fluff.
"""
    return _generate(prompt).strip()
