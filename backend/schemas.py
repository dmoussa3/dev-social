from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime
import re

PASSWORD_MIN_LENGTH = 8

def validate_password_strength(password: str) -> str:
    if len(password) < PASSWORD_MIN_LENGTH:
        raise ValueError(f"Password must be at least {PASSWORD_MIN_LENGTH} characters long")
    if not re.search(r"[A-Z]", password):
        raise ValueError("Password must contain at least one uppercase letter")
    if not re.search(r"[a-z]", password):
        raise ValueError("Password must contain at least one lowercase letter")
    if not re.search(r"\d", password):
        raise ValueError("Password must contain at least one digit")
    return password

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: str
    is_active: bool = True

    @field_validator("password")
    @classmethod
    def check_password_strength(cls, v: str) -> str:
        return validate_password_strength(v)

class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        orm_mode = True

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    is_active: bool = True
    role: Optional[str] = None
    password: Optional[str] = None

    @field_validator("password")
    @classmethod
    def check_password_strength(cls, v: Optional[str]) -> Optional[str]:
        return validate_password_strength(v) if v is not None else v

class PostCreate(BaseModel):
    title: str
    content: str

class PostResponse(BaseModel):
    id: int
    title: str
    content: str
    user_id: int
    created_at: datetime
    author: UserResponse

    class Config:
        orm_mode = True

class UserWithPosts(BaseModel):
    id: int
    username: str
    email: str
    role: str
    created_at: datetime
    posts: List[PostResponse] = []  # List of user's posts
    
    class Config:
        orm_mode = True

class PostWithAuthor(BaseModel):
    id: int
    title: str
    content: str
    created_at: datetime
    user_id: int
    authorship: UserResponse

    class Config:
        orm_mode = True