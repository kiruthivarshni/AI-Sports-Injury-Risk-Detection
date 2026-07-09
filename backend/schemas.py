# backend/schemas.py
from pydantic import BaseModel
from typing import Optional

class AthleteBase(BaseModel):
    athlete_id: str
    name: str
    sport_type: Optional[str] = None
    position: Optional[str] = None
    age: Optional[int] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    injury_history: Optional[str] = None
    training_load: Optional[str] = None

class AthleteCreate(AthleteBase):
    pass

class AthleteResponse(AthleteBase):
    id: int
    class Config:
        from_attributes = True