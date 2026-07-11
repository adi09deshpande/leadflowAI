from typing import Optional

from fastapi import APIRouter, Depends, Query

from ..models.schemas import TaskCreate, TaskUpdate
from ..repositories.lead_repository import LeadRepository, get_repository

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("")
async def list_tasks(
    completed: Optional[bool] = Query(None),
    lead_id: Optional[str] = Query(None),
    repository: LeadRepository = Depends(get_repository),
):
    return repository.list_tasks(completed=completed, lead_id=lead_id)


@router.post("")
async def create_task(task: TaskCreate, repository: LeadRepository = Depends(get_repository)):
    return repository.create_task(task.model_dump(mode="json"))


@router.patch("/{task_id}")
async def update_task(task_id: str, task: TaskUpdate, repository: LeadRepository = Depends(get_repository)):
    updates = task.model_dump(exclude_unset=True, mode="json")
    return repository.update_task(task_id, updates)


@router.delete("/{task_id}")
async def delete_task(task_id: str, repository: LeadRepository = Depends(get_repository)):
    return repository.delete_task(task_id)
