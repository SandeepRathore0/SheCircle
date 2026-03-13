from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
import models
from auth.security import get_password_hash, verify_password
import random
import string

router = APIRouter(prefix="/auth", tags=["auth"])

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    age_group: Optional[str] = None
    location: Optional[str] = None
    interests: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

@router.post("/register")
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    new_user = models.User(
        name=user.name,
        email=user.email,
        hashed_password=hashed_password,
        age_group=user.age_group,
        location=user.location,
        interests=user.interests,
        is_verified=True # Auto-verify for simplicity in mockup
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {"message": "User registered successfully", "user_id": new_user.id, "name": new_user.name}

@router.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if not db_user or not db_user.hashed_password or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credential")
    
    return {"message": "Login successful", "user_id": db_user.id, "name": db_user.name}

# --- Mock OAuth Endpoints ---

MOCK_USERS = [
    {"name": "Alice Wonderland", "email": "alice@example.com"},
    {"name": "Bob Builder", "email": "bob@example.com"},
    {"name": "Charlie Day", "email": "charlie@example.com"}
]

@router.get("/login/google")
def mock_google_login():
    # In a real app, this would return a RedirectResponse to Google's OAuth URL
    return {"auth_url": "/api/auth/callback/google"}

@router.get("/callback/google")
def mock_google_callback(mock_email: Optional[str] = None, db: Session = Depends(get_db)):
    # Simulating a user returning from Google OAuth
    if mock_email:
        mock_profile = next((u for u in MOCK_USERS if u["email"] == mock_email), MOCK_USERS[0])
    else:
        mock_profile = random.choice(MOCK_USERS)

    google_id = "mock_google_id_" + mock_profile["email"].split("@")[0]

    # Check if user already exists
    user = db.query(models.User).filter(models.User.google_id == google_id).first()
    
    if not user:
        # Create new OAuth user
        user = models.User(
            name=mock_profile["name"],
            email=mock_profile["email"],
            google_id=google_id,
            is_verified=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
    # Return user details to act as a session/token creation point for frontend
    return {
        "message": "OAuth Login Successful",
        "user_id": user.id,
        "name": user.name,
        "email": user.email
    }
