from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: str
    is_active: bool = True

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