from typing import Optional

from fastapi import APIRouter, Depends, Query

from ..models.schemas import EmailTemplateCreate, EmailTemplateUpdate
from ..repositories.lead_repository import LeadRepository, get_repository

router = APIRouter(prefix="/templates", tags=["templates"])


@router.get("")
async def list_templates(
    category: Optional[str] = Query(None),
    repository: LeadRepository = Depends(get_repository),
):
    return repository.list_email_templates(category=category)


@router.post("")
async def create_template(template: EmailTemplateCreate, repository: LeadRepository = Depends(get_repository)):
    return repository.create_email_template(template.model_dump())


@router.patch("/{template_id}")
async def update_template(
    template_id: str,
    template: EmailTemplateUpdate,
    repository: LeadRepository = Depends(get_repository),
):
    return repository.update_email_template(template_id, template.model_dump(exclude_unset=True))


@router.delete("/{template_id}")
async def delete_template(template_id: str, repository: LeadRepository = Depends(get_repository)):
    return repository.delete_email_template(template_id)
