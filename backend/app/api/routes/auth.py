import random
import string
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.user import User
from app.models.otp import OTPCode
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.core.config import settings
from app.schemas.auth import (
    SignupRequest,
    LoginRequest,
    TokenResponse,
    RefreshRequest,
    OTPRequest,
    OTPVerifyRequest,
    PasswordResetRequest,
    PasswordChangeRequest,
    UserOut,
)
from app.api.deps import get_current_user
from app.utils.rate_limiter import (
    check_rate_limit,
    record_failure,
    record_success,
    get_attempts,
)

router = APIRouter(prefix="/auth", tags=["auth"])

# ── OTP email sender ───────────────────────────────────────────────────────
def _send_otp_email(to_email: str, code: str) -> None:
    """Send OTP via SMTP. Configure SMTP_* in .env"""
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        # Dev mode: skip sending — code returned in API response
        return

    subject = "Your Invenza OTP Code"
    body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px;
                background: #0f1117; color: #e8eaf0; border-radius: 12px;">
      <h2 style="color: #6c7ffc; margin-bottom: 8px;">Invenza Password Reset</h2>
      <p style="color: #9ca3b0; margin-bottom: 24px;">Use the code below to reset your password. It expires in {settings.OTP_EXPIRE_MINUTES} minutes.</p>
      <div style="text-align: center; padding: 20px; background: #1a1f2e; border-radius: 10px;
                  font-size: 2.5rem; font-weight: 800; letter-spacing: 0.4em; color: #fff;">
        {code}
      </div>
      <p style="color: #6b7280; font-size: 0.8rem; margin-top: 24px;">
        If you did not request this, ignore this email. Your account is safe.
      </p>
    </div>
    """
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
    msg["To"] = to_email
    msg.attach(MIMEText(body, "html"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.EMAILS_FROM_EMAIL, to_email, msg.as_string())
    except Exception as e:
        # Log but don't expose SMTP errors to client
        print(f"[SMTP ERROR] Failed to send OTP to {to_email}: {e}")


# ── Signup ─────────────────────────────────────────────────────────────────
@router.post("/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def signup(payload: SignupRequest, db: AsyncSession = Depends(get_db)):
    # Check login_id uniqueness
    existing_id = await db.execute(select(User).where(User.login_id == payload.login_id))
    if existing_id.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Login ID is already taken",
        )
    # Check email uniqueness
    existing_email = await db.execute(select(User).where(User.email == str(payload.email)))
    if existing_email.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered",
        )

    user = User(
        login_id=payload.login_id,
        email=str(payload.email),
        password_hash=get_password_hash(payload.password),
        role=payload.role,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


# ── Login (with rate limiting) ─────────────────────────────────────────────
@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    # 1. Check rate limit BEFORE hitting the DB
    check_rate_limit(payload.login_id, request)

    # 2. Fetch user
    result = await db.execute(select(User).where(User.login_id == payload.login_id))
    user = result.scalar_one_or_none()

    # 3. Verify credentials
    if not user or not verify_password(payload.password, user.password_hash):
        attempts = record_failure(payload.login_id, request)

        # Compute remaining attempts before next lockout tier
        next_threshold = next(
            (t for t, _ in [(3, 30), (5, 300), (10, 1800)] if t > attempts),
            None,
        )
        remaining_msg = (
            f" {next_threshold - attempts} attempt(s) left before lockout."
            if next_threshold else ""
        )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Login Id or Password.{remaining_msg}",
            headers={"X-Failed-Attempts": str(attempts)},
        )

    # 4. Success → clear rate limit
    record_success(payload.login_id, request)

    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


# ── Refresh token ──────────────────────────────────────────────────────────
@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    token_data = decode_token(payload.refresh_token)
    if not token_data or token_data.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    result = await db.execute(select(User).where(User.id == token_data["sub"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


# ── OTP: request ──────────────────────────────────────────────────────────
@router.post("/otp/request", status_code=status.HTTP_200_OK)
async def request_otp(payload: OTPRequest, request: Request, db: AsyncSession = Depends(get_db)):
    # Rate-limit OTP requests using the email as key
    check_rate_limit(str(payload.email), request)

    result = await db.execute(select(User).where(User.email == str(payload.email)))
    user = result.scalar_one_or_none()

    # Always respond 200 to avoid email enumeration
    if not user:
        return {"message": "If this email exists, an OTP has been sent"}

    # Invalidate any existing unused OTPs for this user
    existing_otps = await db.execute(
        select(OTPCode).where(OTPCode.user_id == user.id, OTPCode.used == False)
    )
    for old_otp in existing_otps.scalars().all():
        old_otp.used = True

    code = "".join(random.choices(string.digits, k=6))
    expires = datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)

    otp = OTPCode(user_id=user.id, code=code, expires_at=expires)
    db.add(otp)
    await db.flush()

    # Send email (no-op in dev if SMTP not configured)
    _send_otp_email(str(payload.email), code)

    # Record attempt to rate-limit OTP spam
    record_failure(str(payload.email), request)

    if settings.APP_ENV == "development":
        return {"message": "OTP sent", "dev_code": code}
    return {"message": "If this email exists, an OTP has been sent"}


# ── OTP: verify ───────────────────────────────────────────────────────────
@router.post("/otp/verify", status_code=status.HTTP_200_OK)
async def verify_otp(payload: OTPVerifyRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == str(payload.email)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OTP")

    otp_result = await db.execute(
        select(OTPCode).where(
            OTPCode.user_id == user.id,
            OTPCode.code == payload.code,
            OTPCode.used == False,
            OTPCode.expires_at > datetime.now(timezone.utc),
        )
    )
    otp = otp_result.scalar_one_or_none()
    if not otp:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OTP")

    return {"message": "OTP verified", "valid": True}


# ── Password reset ─────────────────────────────────────────────────────────
@router.post("/password/reset", status_code=status.HTTP_200_OK)
async def reset_password(payload: PasswordResetRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == str(payload.email)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid request")

    otp_result = await db.execute(
        select(OTPCode).where(
            OTPCode.user_id == user.id,
            OTPCode.code == payload.code,
            OTPCode.used == False,
            OTPCode.expires_at > datetime.now(timezone.utc),
        )
    )
    otp = otp_result.scalar_one_or_none()
    if not otp:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OTP")

    user.password_hash = get_password_hash(payload.new_password)
    otp.used = True
    await db.flush()

    return {"message": "Password reset successfully"}


# ── Profile ────────────────────────────────────────────────────────────────
@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/password/change", status_code=status.HTTP_200_OK)
async def change_password(
    payload: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect current password")
    
    current_user.password_hash = get_password_hash(payload.new_password)
    await db.flush()
    return {"message": "Password changed successfully"}
