from fastapi import APIRouter, HTTPException, status

from ..core.auth import authenticate_user, get_auth_token
from ..models.schemas import LoginRequest, LoginResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest):
    if not authenticate_user(payload.username.strip(), payload.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password.")

    return {
        "token": get_auth_token(),
        "username": payload.username.strip(),
    }
