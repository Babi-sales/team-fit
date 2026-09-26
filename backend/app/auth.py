"""Single shared-PIN auth — no per-user identity. A correct PIN issues a signed,
expiring session cookie; `require_session` just checks that cookie is present and
valid. There is no notion of "who" is logged in, only "is this browser allowed in".
"""

import time

from fastapi import HTTPException, Request, status
from jose import JWTError, jwt

from app.config import get_settings

SESSION_COOKIE_NAME = "teamfit_session"
SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30  # 30 days
ALGORITHM = "HS256"

settings = get_settings()


def create_session_token() -> str:
    payload = {"exp": int(time.time()) + SESSION_MAX_AGE_SECONDS}
    return jwt.encode(payload, settings.session_secret, algorithm=ALGORITHM)


def _verify_session_token(token: str) -> None:
    try:
        jwt.decode(token, settings.session_secret, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session")


def require_session(request: Request) -> None:
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not signed in")
    _verify_session_token(token)
