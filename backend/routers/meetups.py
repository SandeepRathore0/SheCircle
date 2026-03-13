from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import models
from database import get_db

router = APIRouter(prefix="/meetups", tags=["meetups"])

class MeetupCreate(BaseModel):
    title: str
    description: str
    date_time: datetime
    activity_type: str
    location: str
    circle_id: int
    creator_id: int
    professional_type: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

@router.get("/")
def get_all_meetups(db: Session = Depends(get_db)):
    return db.query(models.Meetup).all()

@router.get("/circle/{circle_id}")
def get_circle_meetups(circle_id: int, db: Session = Depends(get_db)):
    return db.query(models.Meetup).filter_by(circle_id=circle_id).all()

@router.post("/")
def create_meetup(meetup: MeetupCreate, db: Session = Depends(get_db)):
    # Verify circle exists
    circle = db.query(models.Circle).filter_by(id=meetup.circle_id).first()
    if not circle:
        raise HTTPException(status_code=404, detail="Circle not found")

    new_meetup = models.Meetup(
        title=meetup.title,
        description=meetup.description,
        date_time=meetup.date_time,
        activity_type=meetup.activity_type,
        location=meetup.location,
        circle_id=meetup.circle_id,
        creator_id=meetup.creator_id,
        professional_type=meetup.professional_type,
        latitude=meetup.latitude,
        longitude=meetup.longitude
    )
    db.add(new_meetup)
    db.commit()
    db.refresh(new_meetup)
    
    # Auto RSVP creator
    participant = models.MeetupParticipant(meetup_id=new_meetup.id, user_id=meetup.creator_id)
    db.add(participant)
    db.commit()

    return new_meetup

@router.post("/{meetup_id}/rsvp")
def rsvp_meetup(meetup_id: int, user_id: int, db: Session = Depends(get_db)):
    existing = db.query(models.MeetupParticipant).filter_by(meetup_id=meetup_id, user_id=user_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already RSVP'd")
        
    participant = models.MeetupParticipant(meetup_id=meetup_id, user_id=user_id)
    db.add(participant)
    db.commit()
    return {"message": "RSVP successful"}
