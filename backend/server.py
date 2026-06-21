from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import Optional, List

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field, ConfigDict


# ---------- DB ----------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


# ---------- Auth helpers ----------
JWT_ALGORITHM = "HS256"

def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


# ---------- Models ----------
class UserPublic(BaseModel):
    id: str
    email: EmailStr
    name: str

class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1, max_length=60)

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class AuthResponse(BaseModel):
    user: UserPublic
    access_token: str

class JobIn(BaseModel):
    neighborhood: str
    title: str = Field(min_length=1, max_length=120)
    description: str = Field(max_length=600, default="")
    price: int = Field(ge=0, le=100000)

class JobOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    neighborhood: str
    title: str
    description: str
    price: int
    owner_name: str
    created_at: str


# ---------- App ----------
app = FastAPI()
api_router = APIRouter(prefix="/api")


async def get_current_user(request: Request) -> dict:
    auth_header = request.headers.get("Authorization", "")
    token = auth_header[7:] if auth_header.startswith("Bearer ") else None
    if not token:
        token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Non autenticato")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Token non valido")
        user = await db.users.find_one({"id": payload["sub"]})
        if not user:
            raise HTTPException(status_code=401, detail="Utente non trovato")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token scaduto")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token non valido")


# ---------- Auth routes ----------
@api_router.post("/auth/register", response_model=AuthResponse)
async def register(body: RegisterIn):
    email = body.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email già registrata")
    user_id = str(uuid.uuid4())
    doc = {
        "id": user_id,
        "email": email,
        "name": body.name.strip(),
        "password_hash": hash_password(body.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    token = create_access_token(user_id, email)
    return AuthResponse(
        user=UserPublic(id=user_id, email=email, name=doc["name"]),
        access_token=token,
    )


@api_router.post("/auth/login", response_model=AuthResponse)
async def login(body: LoginIn):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email o password non corretti")
    token = create_access_token(user["id"], email)
    return AuthResponse(
        user=UserPublic(id=user["id"], email=email, name=user["name"]),
        access_token=token,
    )


@api_router.get("/auth/me", response_model=UserPublic)
async def me(user: dict = Depends(get_current_user)):
    return UserPublic(id=user["id"], email=user["email"], name=user["name"])


# ---------- Jobs routes ----------
@api_router.get("/jobs", response_model=List[JobOut])
async def list_jobs():
    cursor = db.jobs.find({}, {"_id": 0}).sort("created_at", -1)
    jobs = await cursor.to_list(500)
    return jobs


@api_router.post("/jobs", response_model=JobOut)
async def create_job(body: JobIn, user: dict = Depends(get_current_user)):
    if body.neighborhood not in ("Prati", "Parioli", "Centro Storico"):
        raise HTTPException(status_code=400, detail="Quartiere non valido")
    job_id = str(uuid.uuid4())
    doc = {
        "id": job_id,
        "neighborhood": body.neighborhood,
        "title": body.title.strip(),
        "description": body.description.strip(),
        "price": body.price,
        "owner_id": user["id"],
        "owner_name": user["name"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.jobs.insert_one(doc)
    return JobOut(**doc)


@api_router.post("/jobs/{job_id}/apply")
async def apply_job(job_id: str, user: dict = Depends(get_current_user)):
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Annuncio non trovato")
    return {"ok": True, "message": f"Candidatura inviata a {job.get('owner_name','Anonimo')}!"}


# ---------- Seed ----------
SEED_JOBS = [
    {
        "neighborhood": "Parioli",
        "title": "Fila alle Poste di Viale Parioli",
        "description": "Devo ritirare una raccomandata ma ho il padel alle 10. Mi serve qualcuno che faccia la fila per me dalle 8:30.",
        "price": 20,
        "owner_name": "Francesca P.",
    },
    {
        "neighborhood": "Centro Storico",
        "title": "Dog-sitting per un Carlino pigro",
        "description": "Il mio carlino Gastone deve fare una passeggiata in Piazza Navona ma io lavoro. Basta mezz'ora, non corre.",
        "price": 15,
        "owner_name": "Marco L.",
    },
    {
        "neighborhood": "Prati",
        "title": "Montaggio mobiletto IKEA",
        "description": "Ho comprato la scarpiera Hemnes e mi sono arreso alla pagina 3. Serve eroe munito di avvitatore.",
        "price": 35,
        "owner_name": "Giulia R.",
    },
    {
        "neighborhood": "Parioli",
        "title": "Ripetizioni di Latino - Liceo",
        "description": "Versione di Cicerone per domani, mio figlio è disperato. Zona Luiss. Almeno 2 ore.",
        "price": 50,
        "owner_name": "Anna T.",
    },
]


async def seed_jobs():
    count = await db.jobs.count_documents({"seeded": True})
    if count >= len(SEED_JOBS):
        return
    await db.jobs.delete_many({"seeded": True})
    base_ts = datetime.now(timezone.utc)
    docs = []
    for i, j in enumerate(SEED_JOBS):
        ts = (base_ts - timedelta(minutes=i + 1)).isoformat()
        docs.append({
            "id": str(uuid.uuid4()),
            "neighborhood": j["neighborhood"],
            "title": j["title"],
            "description": j["description"],
            "price": j["price"],
            "owner_id": "seed",
            "owner_name": j["owner_name"],
            "created_at": ts,
            "seeded": True,
        })
    await db.jobs.insert_many(docs)


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.jobs.create_index("created_at")
    await seed_jobs()


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
