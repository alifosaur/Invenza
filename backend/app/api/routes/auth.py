import random
import string
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
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
    UserOut,
)
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def signup(payload: SignupRequest, db: AsyncSession = Depends(get_db)):
    # Check uniqueness
    existing = await db.execute(
        select(User).where(
            (User.login_id == payload.login_id) | (User.email == payload.email)
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Login ID or Email already registered",
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


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.login_id == payload.login_id))
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Login Id or Password",
        )

    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


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


@router.post("/otp/request", status_code=status.HTTP_200_OK)
async def request_otp(payload: OTPRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == str(payload.email)))
    user = result.scalar_one_or_none()
    # Always respond 200 to avoid email enumeration
    if not user:
        return {"message": "If this email exists, an OTP has been sent"}

    code = "".join(random.choices(string.digits, k=6))
    expires = datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)

    otp = OTPCode(user_id=user.id, code=code, expires_at=expires)
    db.add(otp)
    await db.flush()

    # TODO: send email with code (configure SMTP in .env)
    # In development, return code in response for testing
    if settings.APP_ENV == "development":
        return {"message": "OTP sent", "dev_code": code}
    return {"message": "If this email exists, an OTP has been sent"}


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


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user
