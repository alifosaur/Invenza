import re
import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator, model_validator
from app.models.user import UserRole


# ── Password validation regex ──────────────────────────────────────────────
PASSWORD_REGEX = re.compile(
    r"^(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{8,}$"
)
LOGIN_ID_REGEX = re.compile(r"^[a-zA-Z0-9_]{6,12}$")


class SignupRequest(BaseModel):
    login_id: str
    email: EmailStr
    password: str
    re_password: str
    otp_code: str = ""
    role: UserRole = UserRole.warehouse_staff

    @field_validator("login_id")
    @classmethod
    def validate_login_id(cls, v: str) -> str:
        if not LOGIN_ID_REGEX.match(v):
            raise ValueError("Login ID must be 6–12 alphanumeric characters or underscores")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not PASSWORD_REGEX.match(v):
            raise ValueError(
                "Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 special character"
            )
        return v

    @model_validator(mode="after")
    def passwords_match(self) -> "SignupRequest":
        if self.password != self.re_password:
            raise ValueError("Passwords do not match")
        return self


class LoginRequest(BaseModel):
    login_id: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class OTPRequest(BaseModel):
    email: EmailStr


class OTPVerifyRequest(BaseModel):
    email: EmailStr
    code: str


class PasswordResetRequest(BaseModel):
    email: EmailStr
    code: str
    new_password: str
    re_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not PASSWORD_REGEX.match(v):
            raise ValueError(
                "Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 special character"
            )
        return v

    @model_validator(mode="after")
    def passwords_match(self) -> "PasswordResetRequest":
        if self.new_password != self.re_password:
            raise ValueError("Passwords do not match")
        return self


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str
    
class UserOut(BaseModel):
    id: uuid.UUID
    login_id: str
    email: str
    role: UserRole
    created_at: datetime

    model_config = {"from_attributes": True}
