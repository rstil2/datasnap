from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import httpx

from app.core.config import settings
from app.core.security import create_access_token
from app.core.database import get_db
from app.schemas.auth import Token
from app.schemas.user import User, UserCreate, UserCreateOAuth
from app.services.user import (
    authenticate_user,
    create_user,
    get_user_by_email,
    get_user_by_oauth_id,
    create_oauth_user,
)

router = APIRouter()


@router.post("/login/access-token", response_model=Token)
def login_access_token(
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """OAuth2 compatible token login, get an access token for future requests."""
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    elif not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user",
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": create_access_token(user.id, expires_delta=access_token_expires),
        "token_type": "bearer",
    }


@router.post("/login/google", response_model=Token)
async def login_google(*, db: Session = Depends(get_db), token: str) -> Any:
    """Process Google OAuth login."""
    async with httpx.AsyncClient() as client:
        r = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {token}"}
        )
        if r.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Google token",
            )
        user_data = r.json()

    user = get_user_by_oauth_id(db, "google", user_data["sub"])
    if not user:
        user = get_user_by_email(db, user_data["email"])
        if user:
            # Link existing account with Google
            user.oauth_provider = "google"
            user.oauth_id = user_data["sub"]
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            # Create new user
            user_in = UserCreateOAuth(
                email=user_data["email"],
                full_name=user_data.get("name"),
                oauth_provider="google",
                oauth_id=user_data["sub"],
            )
            user = create_oauth_user(db, user_in)

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": create_access_token(user.id, expires_delta=access_token_expires),
        "token_type": "bearer",
    }


@router.post("/register", response_model=User)
def register(*, db: Session = Depends(get_db), user_in: UserCreate) -> Any:
    """Register new user."""
    user = get_user_by_email(db, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The user with this email already exists in the system.",
        )
    user = create_user(db, user_in)
    return user