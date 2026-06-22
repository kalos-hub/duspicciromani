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
from typing import List

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field, ConfigDict

import supabase_jobs


# ---------- DB (Mongo for users/auth only) ----------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


# ---------- Roma quartieri (curated) ----------
ROMA_QUARTIERI = [
    "Appio-Latino", "Aurelio", "Aventino", "Balduina", "Centocelle",
    "Centro Storico", "Cinecittà", "Della Vittoria", "Esquilino", "EUR",
    "Flaminio", "Garbatella", "Gianicolense", "Marconi", "Monte Sacro",
    "Monteverde", "Monti", "Nomentano", "Ostiense", "Parioli",
    "Pigneto", "Pinciano", "Portuense", "Prati", "Prenestino",
    "Salario", "San Giovanni", "San Lorenzo", "San Paolo", "Talenti",
    "Testaccio", "Tiburtino", "Tor di Quinto", "Trastevere", "Trieste",
    "Trionfale", "Tuscolano",
]
QUARTIERI_SET = set(ROMA_QUARTIERI)


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

class ApplyIn(BaseModel):
    tip: int = Field(ge=0, le=100, default=0)


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


# ---------- Auth routes (MongoDB) ----------
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


# ---------- Misc ----------
@api_router.get("/neighborhoods", response_model=List[str])
async def neighborhoods():
    return ROMA_QUARTIERI


# ---------- Jobs routes (Supabase) ----------
@api_router.get("/jobs", response_model=List[JobOut])
async def list_jobs(neighborhood: str | None = None):
    n = neighborhood if neighborhood and neighborhood != "Tutti" else None
    try:
        rows = supabase_jobs.list_jobs(n)
    except Exception as e:
        logger.error(f"Supabase list error: {e}")
        raise HTTPException(status_code=502, detail="Impossibile leggere annunci da Supabase")
    return rows


@api_router.post("/jobs", response_model=JobOut)
async def create_job(body: JobIn, user: dict = Depends(get_current_user)):
    if body.neighborhood not in QUARTIERI_SET:
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
    try:
        inserted = supabase_jobs.insert_job(doc)
    except Exception as e:
        logger.error(f"Supabase insert error: {e}")
        raise HTTPException(status_code=502, detail="Pubblicazione su Supabase fallita")
    return inserted


@api_router.post("/jobs/{job_id}/apply")
async def apply_job(job_id: str, body: ApplyIn, user: dict = Depends(get_current_user)):
    try:
        job = supabase_jobs.get_job(job_id)
    except Exception as e:
        logger.error(f"Supabase get error: {e}")
        raise HTTPException(status_code=502, detail="Lettura annuncio fallita")
    if not job:
        raise HTTPException(status_code=404, detail="Annuncio non trovato")
    msg = f"Candidatura inviata a {job.get('owner_name','Anonimo')}!"
    if body.tip > 0:
        msg += f" Mancia opzionale: {body.tip}€ (sblocca priorità Spicci Pro)."
    return {"ok": True, "message": msg, "tip": body.tip}


# ---------- Startup ----------
@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    try:
        supabase_jobs.seed_if_empty()
        logger.info("Supabase jobs: ready")
    except Exception as e:
        logger.warning(f"Supabase seed skipped: {e}")


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
