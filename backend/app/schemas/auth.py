import re
from typing import Annotated

from pydantic import BaseModel, EmailStr, Field, field_validator


class LoginRequest(BaseModel):
    loginId: Annotated[str, Field(min_length=1)]
    pwd_hash: Annotated[str, Field(min_length=1)]

    @field_validator("loginId")
    @classmethod
    def validate_login_id(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("メールアドレスは必須です")
        return v.strip()


class RegisterRequest(BaseModel):
    email: EmailStr
    pwd_hash: Annotated[str, Field(min_length=1)]
    name: Annotated[str, Field(min_length=1, max_length=50)]

    @field_validator("email", mode="before")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        if not isinstance(v, str) or not v.strip():
            raise ValueError("メールアドレスの形式が正しくありません")
        email = v.strip()
        if not re.match(r"^[^@]+@[^@]+\.[^@]+$", email):
            raise ValueError("メールアドレスの形式が正しくありません")
        return email

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("名前は必須です")
        return v.strip()


class UserResponse(BaseModel):
    id: str
    name: str
    email: str


class AuthResponse(BaseModel):
    accessToken: str
    user: UserResponse
