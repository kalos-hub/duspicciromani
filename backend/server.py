from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os, uuid, logging, bcrypt, jwt, asyncio, json
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from collections import Counter, defaultdict

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field, ConfigDict

import supabase_jobs
from roma_geo import ROMA_QUARTIERI, ROMA_QUARTIERI_COORDS

# ---------- DB ----------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

QUARTIERI_SET = set(ROMA_QUARTIERI)
JWT_ALGORITHM = "HS256"
CHAT_TTL_HOURS = 48

logger = logging.getLogger(__name__)


def get_jwt_secret() -> str: return os.environ["JWT_SECRET"]

def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_password(p, h) -> bool:
    return bcrypt.checkpw(p.encode(), h.encode())

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email,
               "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


# ---------- Models ----------
class UserPublic(BaseModel):
    id: str
    email: EmailStr
    first_name: str
    last_name: str
    age: int
    photo: Optional[str] = None
    online: bool = False
    avg_rating: Optional[float] = None
    ratings_count: int = 0

class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    first_name: str = Field(min_length=1, max_length=40)
    last_name: str = Field(min_length=1, max_length=40)
    age: int = Field(ge=14, le=110)
    photo: str = Field(min_length=20, description="data URL (image/jpeg base64)")

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
    lat: Optional[float] = None
    lng: Optional[float] = None

class JobOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    neighborhood: str
    title: str
    description: str
    price: int
    owner_id: str
    owner_name: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    created_at: str

class ApplicationOut(BaseModel):
    id: str
    job_id: str
    job_title: str
    job_price: int
    job_neighborhood: str
    applicant_id: str
    applicant_name: str
    owner_id: str
    owner_name: str
    status: str  # pending | accepted | rejected
    thread_id: Optional[str] = None
    created_at: str

class MessageIn(BaseModel):
    text: str = Field(min_length=1, max_length=2000)

class MessageOut(BaseModel):
    id: str
    thread_id: str
    from_id: str
    from_name: str
    text: str
    created_at: str

class ThreadOut(BaseModel):
    id: str
    application_id: str
    job_title: str
    job_neighborhood: str
    job_price: int
    other_user_id: str
    other_user_name: str
    expires_at: str
    expired: bool
    extended: bool = False
    extend_pending_mine: bool = False
    extend_pending_other: bool = False
    can_rate: bool = False
    rated: bool = False

class RatingIn(BaseModel):
    stars: int = Field(ge=1, le=5)
    comment: str = Field(max_length=2500, default="")

class RatingOut(BaseModel):
    id: str
    thread_id: str
    from_id: str
    from_name: str
    to_id: str
    stars: int
    comment: str
    created_at: str


# ---------- App ----------
app = FastAPI()
api_router = APIRouter(prefix="/api")


_subscribers: dict[str, list[asyncio.Queue]] = defaultdict(list)

async def _push(user_id: str, event: dict) -> None:
    for q in list(_subscribers.get(user_id, [])):
        try: q.put_nowait(event)
        except Exception: pass


async def get_current_user(request: Request, touch: bool = True) -> dict:
    auth = request.headers.get("Authorization", "")
    token = auth[7:] if auth.startswith("Bearer ") else None
    if not token: token = request.cookies.get("access_token")
    if not token:
        token = request.query_params.get("token")  # for SSE
    if not token: raise HTTPException(401, "Non autenticato")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["sub"]})
        if not user: raise HTTPException(401, "Utente non trovato")
        if touch:
            await db.users.update_one({"id": user["id"]},
                {"$set": {"last_seen": datetime.now(timezone.utc).isoformat()}})
        return user
    except jwt.PyJWTError:
        raise HTTPException(401, "Token non valido")


def _is_online(u: dict) -> bool:
    ls = u.get("last_seen")
    if not ls: return False
    try: return (datetime.now(timezone.utc) - datetime.fromisoformat(ls)).total_seconds() < 60
    except Exception: return False

def _user_public(u: dict) -> "UserPublic":
    return UserPublic(
        id=u["id"], email=u["email"],
        first_name=u.get("first_name", u.get("name","")),
        last_name=u.get("last_name", ""),
        age=u.get("age", 0),
        photo=u.get("photo"),
        online=_is_online(u),
        avg_rating=u.get("avg_rating"),
        ratings_count=u.get("ratings_count", 0))


def _full_name(u: dict) -> str:
    fn = u.get("first_name") or u.get("name") or ""
    ln = u.get("last_name") or ""
    return (fn + " " + ln).strip() or u.get("email","Anonimo")


# ---------- Auth ----------
@api_router.post("/auth/register", response_model=AuthResponse)
async def register(body: RegisterIn):
    email = body.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email già registrata")
    user_id = str(uuid.uuid4())
    doc = {
        "id": user_id, "email": email,
        "first_name": body.first_name.strip(), "last_name": body.last_name.strip(),
        "age": body.age, "photo": body.photo,
        "password_hash": hash_password(body.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    return AuthResponse(user=_user_public(doc), access_token=create_access_token(user_id, email))


@api_router.post("/auth/login", response_model=AuthResponse)
async def login(body: LoginIn):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Email o password non corretti")
    return AuthResponse(user=_user_public(user), access_token=create_access_token(user["id"], email))


@api_router.get("/auth/me", response_model=UserPublic)
async def me(user: dict = Depends(get_current_user)):
    return _user_public(user)


@api_router.get("/users/{user_id}", response_model=UserPublic)
async def get_user(user_id: str, _: dict = Depends(get_current_user)):
    u = await db.users.find_one({"id": user_id})
    if not u: raise HTTPException(404, "Utente non trovato")
    return _user_public(u)


# ---------- Geo / Quartieri ----------
@api_router.get("/neighborhoods", response_model=List[str])
async def neighborhoods(): return ROMA_QUARTIERI


@api_router.get("/neighborhoods/counts")
async def neighborhood_counts():
    rows = supabase_jobs.list_jobs(None)
    c = Counter(r["neighborhood"] for r in rows)
    return {"total": len(rows), "counts": dict(c)}


@api_router.get("/neighborhoods/coords")
async def coords():
    return [{"name": n, "lat": lat, "lng": lng}
            for n, (lat, lng) in ROMA_QUARTIERI_COORDS.items()]


# ---------- Jobs ----------
@api_router.get("/jobs", response_model=List[JobOut])
async def list_jobs(neighborhood: str | None = None):
    n = neighborhood if neighborhood and neighborhood != "Tutti" else None
    try:
        rows = supabase_jobs.list_jobs(n)
    except Exception as e:
        logger.error(f"Supabase list error: {e}")
        raise HTTPException(502, "Impossibile leggere annunci")
    return rows


@api_router.post("/jobs", response_model=JobOut)
async def create_job(body: JobIn, user: dict = Depends(get_current_user)):
    if body.neighborhood not in QUARTIERI_SET:
        raise HTTPException(400, "Quartiere non valido")
    lat, lng = body.lat, body.lng
    if lat is None or lng is None:
        lat, lng = ROMA_QUARTIERI_COORDS.get(body.neighborhood, (41.9028, 12.4964))
    doc = {
        "id": str(uuid.uuid4()), "neighborhood": body.neighborhood,
        "title": body.title.strip(), "description": body.description.strip(),
        "price": body.price, "owner_id": user["id"], "owner_name": _full_name(user),
        "lat": lat, "lng": lng,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        return supabase_jobs.insert_job(doc)
    except Exception as e:
        logger.error(f"Supabase insert error: {e}")
        raise HTTPException(502, "Pubblicazione fallita")


# ---------- Applications ----------
def _app_to_out(a: dict) -> dict:
    return {
        "id": a["id"], "job_id": a["job_id"],
        "job_title": a.get("job_title",""), "job_price": a.get("job_price",0),
        "job_neighborhood": a.get("job_neighborhood",""),
        "applicant_id": a["applicant_id"], "applicant_name": a.get("applicant_name",""),
        "owner_id": a["owner_id"], "owner_name": a.get("owner_name",""),
        "status": a["status"], "thread_id": a.get("thread_id"),
        "created_at": a["created_at"],
    }


@api_router.post("/jobs/{job_id}/apply", response_model=ApplicationOut)
async def apply_job(job_id: str, user: dict = Depends(get_current_user)):
    try:
        job = supabase_jobs.get_job(job_id)
    except Exception:
        raise HTTPException(502, "Lettura annuncio fallita")
    if not job: raise HTTPException(404, "Annuncio non trovato")
    if job["owner_id"] == user["id"]:
        raise HTTPException(400, "Non puoi candidarti al tuo stesso annuncio")
    # one application per (job, applicant)
    existing = await db.applications.find_one({"job_id": job_id, "applicant_id": user["id"]})
    if existing: return _app_to_out(existing)
    app_doc = {
        "id": str(uuid.uuid4()), "job_id": job_id,
        "job_title": job["title"], "job_price": job["price"],
        "job_neighborhood": job["neighborhood"],
        "applicant_id": user["id"], "applicant_name": _full_name(user),
        "owner_id": job["owner_id"], "owner_name": job.get("owner_name",""),
        "status": "pending", "thread_id": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.applications.insert_one(app_doc)
    return _app_to_out(app_doc)


@api_router.get("/applications/mine", response_model=List[ApplicationOut])
async def my_apps(user: dict = Depends(get_current_user)):
    rows = await db.applications.find({"applicant_id": user["id"]}, {"_id":0}).sort("created_at",-1).to_list(200)
    return [_app_to_out(r) for r in rows]


@api_router.get("/applications/inbox", response_model=List[ApplicationOut])
async def inbox(user: dict = Depends(get_current_user)):
    rows = await db.applications.find({"owner_id": user["id"]}, {"_id":0}).sort("created_at",-1).to_list(200)
    return [_app_to_out(r) for r in rows]


@api_router.post("/applications/{app_id}/accept", response_model=ApplicationOut)
async def accept_app(app_id: str, user: dict = Depends(get_current_user)):
    a = await db.applications.find_one({"id": app_id})
    if not a: raise HTTPException(404, "Candidatura non trovata")
    if a["owner_id"] != user["id"]: raise HTTPException(403, "Non autorizzato")
    if a["status"] == "accepted" and a.get("thread_id"): return _app_to_out(a)
    thread_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    thread = {
        "id": thread_id, "application_id": app_id,
        "job_id": a["job_id"], "job_title": a["job_title"],
        "job_price": a["job_price"], "job_neighborhood": a["job_neighborhood"],
        "owner_id": a["owner_id"], "owner_name": a["owner_name"],
        "applicant_id": a["applicant_id"], "applicant_name": a["applicant_name"],
        "created_at": now.isoformat(),
        "expires_at": (now + timedelta(hours=CHAT_TTL_HOURS)).isoformat(),
    }
    await db.threads.insert_one(thread)
    await db.applications.update_one({"id": app_id},
        {"$set": {"status":"accepted", "thread_id": thread_id, "accepted_at": now.isoformat()}})
    a["status"] = "accepted"; a["thread_id"] = thread_id
    return _app_to_out(a)


@api_router.post("/applications/{app_id}/reject", response_model=ApplicationOut)
async def reject_app(app_id: str, user: dict = Depends(get_current_user)):
    a = await db.applications.find_one({"id": app_id})
    if not a: raise HTTPException(404, "Candidatura non trovata")
    if a["owner_id"] != user["id"]: raise HTTPException(403, "Non autorizzato")
    await db.applications.update_one({"id": app_id}, {"$set":{"status":"rejected"}})
    a["status"] = "rejected"
    return _app_to_out(a)


# ---------- Threads / Messages ----------
def _thread_to_out(t: dict, current_user_id: str, rated_set: set | None = None) -> ThreadOut:
    is_owner = t["owner_id"] == current_user_id
    other_id = t["applicant_id"] if is_owner else t["owner_id"]
    other_name = t["applicant_name"] if is_owner else t["owner_name"]
    expires = datetime.fromisoformat(t["expires_at"])
    expired = datetime.now(timezone.utc) > expires
    extends = t.get("extend_requests", [])
    return ThreadOut(
        id=t["id"], application_id=t["application_id"],
        job_title=t["job_title"], job_neighborhood=t["job_neighborhood"], job_price=t["job_price"],
        other_user_id=other_id, other_user_name=other_name,
        expires_at=t["expires_at"], expired=expired,
        extended=t.get("extended", False),
        extend_pending_mine=current_user_id in extends,
        extend_pending_other=other_id in extends,
        can_rate=expired,
        rated=(rated_set is not None and t["id"] in rated_set))


@api_router.get("/threads", response_model=List[ThreadOut])
async def my_threads(user: dict = Depends(get_current_user)):
    rows = await db.threads.find(
        {"$or":[{"owner_id":user["id"]},{"applicant_id":user["id"]}]},
        {"_id":0}).sort("created_at",-1).to_list(200)
    return [_thread_to_out(t, user["id"]) for t in rows]


@api_router.post("/threads/{thread_id}/extend", response_model=ThreadOut)
async def extend_thread(thread_id: str, user: dict = Depends(get_current_user)):
    t = await _load_thread_for_user(thread_id, user["id"])
    if t.get("extended"): raise HTTPException(400, "Già estesa una volta")
    requests_set = set(t.get("extend_requests", []))
    requests_set.add(user["id"])
    other = t["applicant_id"] if t["owner_id"] == user["id"] else t["owner_id"]
    update = {"extend_requests": list(requests_set)}
    if other in requests_set:
        new_exp = (datetime.fromisoformat(t["expires_at"]) + timedelta(hours=24)).isoformat()
        update.update({"expires_at": new_exp, "extended": True, "extend_requests": []})
    await db.threads.update_one({"id": thread_id}, {"$set": update})
    t.update(update)
    await _push(other, {"type":"thread_update","thread_id":thread_id})
    return _thread_to_out(t, user["id"])


@api_router.post("/threads/{thread_id}/rate", response_model=RatingOut)
async def rate_thread(thread_id: str, body: RatingIn, user: dict = Depends(get_current_user)):
    t = await _load_thread_for_user(thread_id, user["id"])
    if datetime.now(timezone.utc) <= datetime.fromisoformat(t["expires_at"]):
        raise HTTPException(400, "Puoi valutare solo dopo la scadenza della chat")
    if await db.ratings.find_one({"thread_id": thread_id, "from_id": user["id"]}):
        raise HTTPException(400, "Hai già lasciato una valutazione")
    to_id = t["applicant_id"] if t["owner_id"] == user["id"] else t["owner_id"]
    doc = {"id": str(uuid.uuid4()), "thread_id": thread_id,
           "from_id": user["id"], "from_name": _full_name(user),
           "to_id": to_id, "stars": body.stars, "comment": body.comment.strip(),
           "created_at": datetime.now(timezone.utc).isoformat()}
    await db.ratings.insert_one(doc)
    agg = await db.ratings.aggregate([{"$match":{"to_id":to_id}},
        {"$group":{"_id":None,"avg":{"$avg":"$stars"},"n":{"$sum":1}}}]).to_list(1)
    if agg:
        await db.users.update_one({"id": to_id},
            {"$set": {"avg_rating": round(agg[0]["avg"],2), "ratings_count": agg[0]["n"]}})
    return doc


@api_router.get("/users/{user_id}/ratings", response_model=List[RatingOut])
async def user_ratings(user_id: str, _: dict = Depends(get_current_user)):
    rows = await db.ratings.find({"to_id": user_id}, {"_id":0}).sort("created_at",-1).to_list(200)
    return rows


@api_router.get("/events")
async def sse_events(user: dict = Depends(get_current_user)):
    q: asyncio.Queue = asyncio.Queue()
    _subscribers[user["id"]].append(q)
    async def stream():
        try:
            yield "event: ready\ndata: {}\n\n"
            while True:
                try:
                    ev = await asyncio.wait_for(q.get(), timeout=25)
                    yield f"data: {json.dumps(ev)}\n\n"
                except asyncio.TimeoutError:
                    yield ": ping\n\n"
        finally:
            try: _subscribers[user["id"]].remove(q)
            except ValueError: pass
    return StreamingResponse(stream(), media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})



async def _load_thread_for_user(thread_id: str, user_id: str) -> dict:
    t = await db.threads.find_one({"id": thread_id}, {"_id":0})
    if not t: raise HTTPException(404, "Chat non trovata")
    if user_id not in (t["owner_id"], t["applicant_id"]):
        raise HTTPException(403, "Non autorizzato")
    return t


@api_router.get("/threads/{thread_id}/messages", response_model=List[MessageOut])
async def list_messages(thread_id: str, user: dict = Depends(get_current_user)):
    await _load_thread_for_user(thread_id, user["id"])
    rows = await db.messages.find({"thread_id": thread_id}, {"_id":0}).sort("created_at",1).to_list(1000)
    return rows


@api_router.post("/threads/{thread_id}/messages", response_model=MessageOut)
async def send_message(thread_id: str, body: MessageIn, user: dict = Depends(get_current_user)):
    t = await _load_thread_for_user(thread_id, user["id"])
    if datetime.now(timezone.utc) > datetime.fromisoformat(t["expires_at"]):
        raise HTTPException(410, "Chat scaduta (48h)")
    msg = {
        "id": str(uuid.uuid4()), "thread_id": thread_id,
        "from_id": user["id"], "from_name": _full_name(user),
        "text": body.text.strip(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.messages.insert_one(msg)
    other_id = t["applicant_id"] if t["owner_id"] == user["id"] else t["owner_id"]
    await _push(other_id, {"type":"message","thread_id":thread_id,"from_name":msg["from_name"],"text":msg["text"]})
    return msg


# ---------- Startup ----------
@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.applications.create_index([("job_id",1),("applicant_id",1)], unique=True)
    await db.threads.create_index("created_at")
    await db.messages.create_index([("thread_id",1),("created_at",1)])
    try:
        supabase_jobs.seed_if_empty()
        logger.info("Supabase ready")
    except Exception as e:
        logger.warning(f"Supabase seed skipped: {e}")


@app.on_event("shutdown")
async def on_shutdown(): client.close()


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware, allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS','*').split(','),
    allow_methods=["*"], allow_headers=["*"])

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
