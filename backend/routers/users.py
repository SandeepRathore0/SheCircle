from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models
from database import get_db
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter(prefix="/users", tags=["users"])

class UserProfileUpdate(BaseModel):
    interests: Optional[str] = None
    availability: Optional[str] = None
    emotional_preferences: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

@router.get("/locations", response_model=List[dict])
def get_user_locations(db: Session = Depends(get_db)):
    users = db.query(models.User).filter(models.User.latitude.isnot(None)).all()
    return [{"id": u.id, "name": u.name, "lat": u.latitude, "lng": u.longitude} for u in users]

@router.get("/{user_id}")
def get_user_profile(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Exclude password hash
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "age_group": user.age_group,
        "location": user.location,
        "interests": user.interests,
        "availability": user.availability,
        "emotional_preferences": user.emotional_preferences,
        "is_verified": user.is_verified,
        "latitude": user.latitude,
        "longitude": user.longitude
    }

@router.put("/{user_id}")
def update_profile(user_id: int, profile: UserProfileUpdate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if profile.interests is not None:
        user.interests = profile.interests
    if profile.availability is not None:
        user.availability = profile.availability
    if profile.emotional_preferences is not None:
        user.emotional_preferences = profile.emotional_preferences
    if profile.latitude is not None:
        user.latitude = profile.latitude
    if profile.longitude is not None:
        user.longitude = profile.longitude

    db.commit()
    db.refresh(user)
    return {"message": "Profile updated successfully"}
