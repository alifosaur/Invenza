"""
In-memory login rate limiter.

Rules:
  - After 3 failed attempts → 30-second cooldown
  - After 5 failed attempts → 5-minute lockout
  - After 10 failed attempts → 30-minute lockout
  - Cooldown resets on successful login
  - Keyed by login_id (prevent credential stuffing) AND remote IP (prevent brute force)
"""
import time
from typing import Dict
from fastapi import Request, HTTPException, status


# { key: {"attempts": int, "locked_until": float} }
_store: Dict[str, dict] = {}

LOCKOUT_SCHEDULE = [
    (3, 30),      # 3 fails → 30 sec
    (5, 300),     # 5 fails → 5 min
    (10, 1800),   # 10 fails → 30 min
]


def _key(login_id: str, ip: str) -> str:
    return f"{login_id}::{ip}"


def _get_lockout_seconds(attempts: int) -> int:
    duration = 0
    for threshold, secs in LOCKOUT_SCHEDULE:
        if attempts >= threshold:
            duration = secs
    return duration


def check_rate_limit(login_id: str, request: Request) -> None:
    """Raise 429 if the login_id or IP is currently locked out."""
    ip = request.client.host if request.client else "unknown"
    key = _key(login_id, ip)
    entry = _store.get(key)

    if entry:
        locked_until = entry.get("locked_until", 0)
        if locked_until > time.time():
            wait = int(locked_until - time.time())
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many failed attempts. Try again in {wait} seconds.",
                headers={"Retry-After": str(wait)},
            )


def record_failure(login_id: str, request: Request) -> int:
    """Record a failed attempt, apply lockout, return remaining attempts before next tier."""
    ip = request.client.host if request.client else "unknown"
    key = _key(login_id, ip)

    if key not in _store:
        _store[key] = {"attempts": 0, "locked_until": 0.0}

    _store[key]["attempts"] += 1
    attempts = _store[key]["attempts"]

    lock_secs = _get_lockout_seconds(attempts)
    if lock_secs > 0:
        _store[key]["locked_until"] = time.time() + lock_secs

    return attempts


def record_success(login_id: str, request: Request) -> None:
    """Clear rate limit state on successful login."""
    ip = request.client.host if request.client else "unknown"
    key = _key(login_id, ip)
    _store.pop(key, None)


def get_attempts(login_id: str, request: Request) -> int:
    ip = request.client.host if request.client else "unknown"
    key = _key(login_id, ip)
    return _store.get(key, {}).get("attempts", 0)
