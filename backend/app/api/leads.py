from fastapi import APIRouter, Body, Depends, HTTPException, Query
from typing import Optional, List
from pydantic import ValidationError
from ..models.schemas import LeadCreate, LeadUpdate, CSVLeadImportRow
from ..repositories.lead_repository import LeadRepository, get_repository

router = APIRouter(prefix="/leads", tags=["leads"])

ALLOWED_IMPORT_FIELDS = [
    "name",
    "email",
    "company",
    "title",
    "source",
    "linkedin",
    "website",
    "location",
    "industry",
    "phone",
    "company_size",
    "revenue",
    "notes",
]
REQUIRED_IMPORT_FIELDS = ["name", "email", "company"]
RECOMMENDED_IMPORT_FIELDS = ["title", "source", "linkedin", "website", "location", "industry"]


@router.get("", response_model=List[dict])
async def get_leads(
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("score"),
    repository: LeadRepository = Depends(get_repository),
):
    return repository.list_leads(status=status, search=search, source=source, sort_by=sort_by or "score")


@router.get("/{lead_id}", response_model=dict)
async def get_lead(lead_id: str, repository: LeadRepository = Depends(get_repository)):
    return repository.get_lead(lead_id)


@router.post("", response_model=dict, status_code=201)
async def create_lead(lead: LeadCreate, repository: LeadRepository = Depends(get_repository)):
    return repository.create_lead(lead.model_dump())


@router.patch("/{lead_id}", response_model=dict)
async def update_lead(lead_id: str, update: LeadUpdate, repository: LeadRepository = Depends(get_repository)):
    updates = {key: value for key, value in update.model_dump().items() if value is not None}
    return repository.update_lead(lead_id, updates)


@router.delete("/{lead_id}")
async def delete_lead(lead_id: str, repository: LeadRepository = Depends(get_repository)):
    return repository.delete_lead(lead_id)


@router.post("/import", response_model=dict, status_code=201)
async def import_leads(body: dict = Body(...), repository: LeadRepository = Depends(get_repository)):
    leads = body.get("leads")

    if not isinstance(leads, list):
        raise HTTPException(
            status_code=422,
            detail={
                "message": "CSV import payload must include a leads array.",
                "allowed_fields": ALLOWED_IMPORT_FIELDS,
                "required_fields": REQUIRED_IMPORT_FIELDS,
                "recommended_fields": RECOMMENDED_IMPORT_FIELDS,
            },
        )

    if not leads:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "No leads were found to import.",
                "allowed_fields": ALLOWED_IMPORT_FIELDS,
                "required_fields": REQUIRED_IMPORT_FIELDS,
                "recommended_fields": RECOMMENDED_IMPORT_FIELDS,
            },
        )

    validated_leads = []
    validation_errors = []

    for index, row in enumerate(leads, start=2):
        try:
            validated_leads.append(CSVLeadImportRow.model_validate(row).model_dump())
        except ValidationError as exc:
            for error in exc.errors():
                location = ".".join(str(part) for part in error.get("loc", []) if part != "__root__") or "row"
                validation_errors.append(f"Row {index}: {location} - {error.get('msg', 'Invalid value')}")

    if validation_errors:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "CSV import validation failed.",
                "errors": validation_errors[:20],
                "allowed_fields": ALLOWED_IMPORT_FIELDS,
                "required_fields": REQUIRED_IMPORT_FIELDS,
                "recommended_fields": RECOMMENDED_IMPORT_FIELDS,
            },
        )

    return repository.import_leads(validated_leads)
