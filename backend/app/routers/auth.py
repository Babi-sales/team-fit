import secrets

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.auth import SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS, create_session_token, require_session
from app.config import get_settings
from app.schemas import LoginIn

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


@router.post("/login")
async def login(payload: LoginIn, response: Response):
    if not secrets.compare_digest(payload.pin, settings.app_pin):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Wrong PIN")

    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=create_session_token(),
        max_age=SESSION_MAX_AGE_SECONDS,
        httponly=True,
        secure=True,
        samesite="lax",
    )
    return {"ok": True}


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(SESSION_COOKIE_NAME)
    return {"ok": True}


@router.get("/session", dependencies=[Depends(require_session)])
async def session_status():
    return {"authenticated": True}
