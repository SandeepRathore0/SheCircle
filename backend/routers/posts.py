from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import models
from database import get_db

router = APIRouter(prefix="/posts", tags=["posts"])

class PostCreate(BaseModel):
    content: str
    is_anonymous: bool = False
    author_id: Optional[int] = None

class ReactionCreate(BaseModel):
    reaction_type: str

@router.get("/")
def get_posts(db: Session = Depends(get_db)):
    # Get all posts, order by latest, limit to 105 (35 rows of 3)
    posts = db.query(models.Post).order_by(models.Post.created_at.desc()).limit(105).all()
    result = []
    for p in posts:
        # Count reactions
        likes = sum(1 for r in p.reactions if r.reaction_type == 'like')
        empathy = sum(1 for r in p.reactions if r.reaction_type == 'empathy')
        support = sum(1 for r in p.reactions if r.reaction_type == 'support')
        
        result.append({
            "id": p.id,
            "content": p.content,
            "created_at": p.created_at,
            "is_anonymous": p.is_anonymous,
            "author_name": p.author.name if not p.is_anonymous and p.author else "Anonymous",
            "reactions": {
                "like": likes,
                "empathy": empathy,
                "support": support
            }
        })
    return result

@router.post("/")
def create_post(post: PostCreate, db: Session = Depends(get_db)):
    new_post = models.Post(
        content=post.content,
        is_anonymous=post.is_anonymous,
        author_id=post.author_id if not post.is_anonymous else None
    )
    db.add(new_post)
    db.commit()
    db.refresh(new_post)
    return new_post

@router.post("/{post_id}/react")
def react_to_post(post_id: int, reaction: ReactionCreate, db: Session = Depends(get_db)):
    db_post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not db_post:
        raise HTTPException(status_code=404, detail="Post not found")
        
    new_reaction = models.Reaction(
        post_id=post_id,
        reaction_type=reaction.reaction_type,
        user_id=None # Anonymous reactions for now
    )
    db.add(new_reaction)
    db.commit()
    return {"message": "Reaction added successfully"}

@router.delete("/{post_id}")
def delete_post(post_id: int, db: Session = Depends(get_db)):
    db_post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not db_post:
        raise HTTPException(status_code=404, detail="Post not found")
        
    # Delete cascade reactions first
    db.query(models.Reaction).filter(models.Reaction.post_id == post_id).delete()
    
    db.delete(db_post)
    db.commit()
    return {"message": "Post deleted successfully"}
