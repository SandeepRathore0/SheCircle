from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import models
from database import get_db

router = APIRouter(prefix="/circles", tags=["circles"])

class CircleCreate(BaseModel):
    name: str
    description: str
    location: str
    creator_id: int # simplistic auth

@router.get("/")
def get_circles(db: Session = Depends(get_db)):
    return db.query(models.Circle).all()

@router.post("/")
def create_circle(circle: CircleCreate, db: Session = Depends(get_db)):
    new_circle = models.Circle(
        name=circle.name,
        description=circle.description,
        location=circle.location,
        creator_id=circle.creator_id
    )
    db.add(new_circle)
    db.commit()
    db.refresh(new_circle)
    
    # Auto-add creator as member
    member = models.CircleMember(circle_id=new_circle.id, user_id=circle.creator_id)
    db.add(member)
    db.commit()

    return new_circle

@router.post("/{circle_id}/join")
def join_circle(circle_id: int, user_id: int, db: Session = Depends(get_db)):
    existing = db.query(models.CircleMember).filter_by(circle_id=circle_id, user_id=user_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already a member")
        
    member = models.CircleMember(circle_id=circle_id, user_id=user_id)
    db.add(member)
    db.commit()
    return {"message": "Joined successfully"}

@router.get("/{circle_id}")
def get_circle_detail(circle_id: int, db: Session = Depends(get_db)):
    circle = db.query(models.Circle).filter_by(id=circle_id).first()
    if not circle:
        raise HTTPException(status_code=404, detail="Circle not found")
    
    # Get members with names
    members = []
    for m in circle.members:
        if m.user:
            members.append({
                "id": m.user.id,
                "name": m.user.name,
                "joined_at": m.joined_at
            })
        
    return {
        "id": circle.id,
        "name": circle.name,
        "description": circle.description,
        "location": circle.location,
        "creator_id": circle.creator_id,
        "created_at": circle.created_at,
        "members": members
    }
