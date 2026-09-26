"""Single shared-password auth — no per-user identity. A correct password issues
a signed, expiring session cookie; `require_session` just checks that cookie is
present and valid. There is no notion of "who" is logged in, only "is this
browser allowed in".

Also implements a simple per-IP rate limit on login attempts, since this is the
only thing standing between an attacker and the app once they can reach it.
Assumes the app sits behind a trusted reverse proxy (Caddy/Traefik) that sets
X-Forwarded-For; it is never reachable directly from the internet.
"""

import time
from collections import defaultdict

import jwt
from fastapi import HTTPException, Request, status

from app.config import get_settings

SESSION_COOKIE_NAME = "teamfit_session"
SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30  # 30 days
ALGORITHM = "HS256"

MAX_LOGIN_ATTEMPTS = 5
LOGIN_WINDOW_SECONDS = 15 * 60

settings = get_settings()

_failed_attempts: dict[str, list[float]] = defaultdict(list)


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def check_login_rate_limit(ip: str) -> None:
    now = time.time()
    attempts = _failed_attempts[ip]
    attempts[:] = [t for t in attempts if now - t < LOGIN_WINDOW_SECONDS]
    if len(attempts) >= MAX_LOGIN_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many attempts. Try again in a few minutes.",
        )


def record_failed_login(ip: str) -> None:
    _failed_attempts[ip].append(time.time())


def clear_failed_logins(ip: str) -> None:
    _failed_attempts.pop(ip, None)


def create_session_token() -> str:
    payload = {"exp": int(time.time()) + SESSION_MAX_AGE_SECONDS}
    return jwt.encode(payload, settings.session_secret, algorithm=ALGORITHM)


def _verify_session_token(token: str) -> None:
    try:
        jwt.decode(token, settings.session_secret, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session")


def require_session(request: Request) -> None:
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not signed in")
    _verify_session_token(token)
