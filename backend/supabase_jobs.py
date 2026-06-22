"""Supabase client wrapper. Reads/writes the `jobs` table via PostgREST."""
import os
import uuid
from datetime import datetime, timezone, timedelta
from supabase import create_client, Client

_supabase: Client | None = None

def get_supabase() -> Client:
    global _supabase
    if _supabase is None:
        url = os.environ["SUPABASE_URL"]
        key = os.environ["SUPABASE_ANON_KEY"]
        _supabase = create_client(url, key)
    return _supabase


JOBS_TABLE = "jobs"


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


def list_jobs(neighborhood: str | None = None) -> list[dict]:
    sb = get_supabase()
    q = sb.table(JOBS_TABLE).select("*").order("created_at", desc=True).limit(500)
    if neighborhood:
        q = q.eq("neighborhood", neighborhood)
    res = q.execute()
    return res.data or []


def insert_job(doc: dict) -> dict:
    sb = get_supabase()
    res = sb.table(JOBS_TABLE).insert(doc).execute()
    if not res.data:
        raise RuntimeError("Supabase insert returned no data")
    return res.data[0]


def get_job(job_id: str) -> dict | None:
    sb = get_supabase()
    res = sb.table(JOBS_TABLE).select("*").eq("id", job_id).limit(1).execute()
    return res.data[0] if res.data else None


def seed_if_empty() -> None:
    sb = get_supabase()
    res = sb.table(JOBS_TABLE).select("id", count="exact").limit(1).execute()
    if (res.count or 0) > 0:
        return
    base = datetime.now(timezone.utc)
    rows = []
    for i, j in enumerate(SEED_JOBS):
        rows.append({
            "id": str(uuid.uuid4()),
            "neighborhood": j["neighborhood"],
            "title": j["title"],
            "description": j["description"],
            "price": j["price"],
            "owner_id": "seed",
            "owner_name": j["owner_name"],
            "created_at": (base - timedelta(minutes=i + 1)).isoformat(),
        })
    sb.table(JOBS_TABLE).insert(rows).execute()
