# backend/main.py
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

import models, schemas
from routers import analysis
from database import engine, get_db
from auth import hash_password, verify_password, create_access_token

models.Base.metadata.create_all(bind=engine)  # creates the table automatically

app = FastAPI(title="Sports Injury Risk Detection Platform")

app.include_router(
    analysis.router,
    prefix="/api",
    tags=["Video Analysis"]
)

# Allows your React frontend (different port) to call this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "Backend is running"}

@app.post("/athletes/", response_model=schemas.AthleteResponse)
def create_athlete(athlete: schemas.AthleteCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Athlete).filter(models.Athlete.athlete_id == athlete.athlete_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Athlete ID already exists")
    new_athlete = models.Athlete(**athlete.model_dump())
    db.add(new_athlete)
    db.commit()
    db.refresh(new_athlete)
    return new_athlete

@app.get("/athletes/", response_model=List[schemas.AthleteResponse])
def get_athletes(db: Session = Depends(get_db)):
    return db.query(models.Athlete).all()

@app.get("/athletes/{athlete_id}", response_model=schemas.AthleteResponse)
def get_athlete(athlete_id: str, db: Session = Depends(get_db)):
    athlete = db.query(models.Athlete).filter(models.Athlete.athlete_id == athlete_id).first()
    if not athlete:
        raise HTTPException(status_code=404, detail="Athlete not found")
    return athlete

@app.put("/athletes/{athlete_id}", response_model=schemas.AthleteResponse)
def update_athlete(athlete_id: str, updated: schemas.AthleteCreate, db: Session = Depends(get_db)):
    athlete = db.query(models.Athlete).filter(models.Athlete.athlete_id == athlete_id).first()
    if not athlete:
        raise HTTPException(status_code=404, detail="Athlete not found")
    for key, value in updated.model_dump().items():
        setattr(athlete, key, value)
    db.commit()
    db.refresh(athlete)
    return athlete

@app.delete("/athletes/{athlete_id}")
def delete_athlete(athlete_id: str, db: Session = Depends(get_db)):
    athlete = db.query(models.Athlete).filter(models.Athlete.athlete_id == athlete_id).first()
    if not athlete:
        raise HTTPException(status_code=404, detail="Athlete not found")
    db.delete(athlete)
    db.commit()
    return {"message": "Athlete deleted successfully"}

@app.post("/register")
def register(email: str, password: str, role: str, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = models.User(email=email, hashed_password=hash_password(password), role=role)
    db.add(user)
    db.commit()
    return {"message": "User registered"}

@app.post("/login")
def login(email: str, password: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": user.email, "role": user.role})
    return {"access_token": token, "token_type": "bearer"}

