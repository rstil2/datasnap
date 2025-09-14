from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict
from datetime import datetime


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    is_active: bool = True


class UserCreate(UserBase):
    password: str


class UserCreateOAuth(UserBase):
    oauth_provider: str
    oauth_id: str


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = None


class UserInDBBase(UserBase):
    id: str
    is_superuser: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None
    oauth_provider: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class User(UserInDBBase):
    pass


class UserInDB(UserInDBBase):
    hashed_password: Optional[str] = None
    oauth_id: Optional[str] = None