from fastapi import APIRouter, Depends
from ..repositories.lead_repository import LeadRepository, get_repository

router = APIRouter(tags=["stats"])


@router.get("/stats")
async def get_stats(repository: LeadRepository = Depends(get_repository)):
    return repository.get_stats()


@router.get("/activity")
async def get_activity(repository: LeadRepository = Depends(get_repository)):
    return {"items": repository.get_activity()}


@router.get("/analytics")
async def get_analytics(repository: LeadRepository = Depends(get_repository)):
    return repository.get_analytics()
