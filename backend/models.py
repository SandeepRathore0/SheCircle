from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, DateTime, Text, Float
from sqlalchemy.orm import relationship
import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String, nullable=True) # Nullable for OAuth users
    google_id = Column(String, unique=True, index=True, nullable=True)
    age_group = Column(String)
    location = Column(String)
    interests = Column(String) # Comma-separated or JSON string
    availability = Column(String)
    emotional_preferences = Column(String)
    is_verified = Column(Boolean, default=False)
    profile_picture = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    circles = relationship("CircleMember", back_populates="user")
    posts = relationship("Post", back_populates="author")
    messages = relationship("Message", back_populates="sender")

class Circle(Base):
    __tablename__ = "circles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String)
    location = Column(String)
    creator_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    members = relationship("CircleMember", back_populates="circle")
    meetups = relationship("Meetup", back_populates="circle")
    messages = relationship("Message", back_populates="circle")

class CircleMember(Base):
    __tablename__ = "circle_members"

    id = Column(Integer, primary_key=True, index=True)
    circle_id = Column(Integer, ForeignKey("circles.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    joined_at = Column(DateTime, default=datetime.datetime.utcnow)

    circle = relationship("Circle", back_populates="members")
    user = relationship("User", back_populates="circles")

class Meetup(Base):
    __tablename__ = "meetups"

    id = Column(Integer, primary_key=True, index=True)
    circle_id = Column(Integer, ForeignKey("circles.id"))
    title = Column(String, index=True)
    description = Column(String)
    date_time = Column(DateTime)
    activity_type = Column(String)
    location = Column(String)
    professional_type = Column(String, nullable=True) # therapist, analyst, activist
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    creator_id = Column(Integer, ForeignKey("users.id"))

    circle = relationship("Circle", back_populates="meetups")
    participants = relationship("MeetupParticipant", back_populates="meetup")

class MeetupParticipant(Base):
    __tablename__ = "meetup_participants"

    id = Column(Integer, primary_key=True, index=True)
    meetup_id = Column(Integer, ForeignKey("meetups.id"))
    user_id = Column(Integer, ForeignKey("users.id"))

    meetup = relationship("Meetup", back_populates="participants")
    user = relationship("User")

class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    is_anonymous = Column(Boolean, default=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Nullable for fully anon

    author = relationship("User", back_populates="posts")
    reactions = relationship("Reaction", back_populates="post")

class Reaction(Base):
    __tablename__ = "reactions"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    reaction_type = Column(String) # e.g., "support", "empathy"

    post = relationship("Post", back_populates="reactions")
    user = relationship("User")

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    circle_id = Column(Integer, ForeignKey("circles.id"))
    sender_id = Column(Integer, ForeignKey("users.id"))
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    circle = relationship("Circle", back_populates="messages")
    sender = relationship("User", back_populates="messages")
