from sqlalchemy import Column, Integer, String, Float, Text
from database import Base

class Athlete(Base):
    __tablename__ = "athletes"

    id = Column(Integer, primary_key=True, index=True)
    athlete_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    sport_type = Column(String)
    position = Column(String)
    age = Column(Integer)
    height = Column(Float)
    weight = Column(Float)
    injury_history = Column(Text)
    training_load = Column(String)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False)  # Athlete, Coach, Physiotherapist, Sports Scientist, Administrator