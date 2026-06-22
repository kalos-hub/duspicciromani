"""Supabase REST/PostgREST wrapper. Reads/writes the `jobs` table."""
import os
import uuid
import httpx
from datetime import datetime, timezone, timedelta

from roma_geo import ROMA_QUARTIERI_COORDS


def _base() -> str:
    return os.environ["SUPABASE_URL"].rstrip("/") + "/rest/v1"


def _headers(prefer: str | None = None) -> dict:
    key = os.environ["SUPABASE_ANON_KEY"]
    h = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    if prefer:
        h["Prefer"] = prefer
    return h


JOBS = "jobs"


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


def _raise_for(resp: httpx.Response) -> None:
    if resp.status_code >= 400:
        raise RuntimeError(f"Supabase {resp.status_code}: {resp.text[:300]}")


def list_jobs(neighborhood: str | None = None) -> list[dict]:
    params = {"select": "*", "order": "created_at.desc", "limit": "500"}
    if neighborhood:
        params["neighborhood"] = f"eq.{neighborhood}"
    r = httpx.get(f"{_base()}/{JOBS}", headers=_headers(), params=params, timeout=15)
    _raise_for(r)
    return r.json()


def insert_job(doc: dict) -> dict:
    r = httpx.post(
        f"{_base()}/{JOBS}",
        headers=_headers(prefer="return=representation"),
        json=doc, timeout=15)
    _raise_for(r)
    data = r.json()
    if not data:
        raise RuntimeError("Supabase insert returned no row")
    return data[0]


def get_job(job_id: str) -> dict | None:
    r = httpx.get(
        f"{_base()}/{JOBS}", headers=_headers(),
        params={"select": "*", "id": f"eq.{job_id}", "limit": "1"}, timeout=15)
    _raise_for(r)
    rows = r.json()
    return rows[0] if rows else None


def seed_if_empty() -> None:
    r = httpx.get(
        f"{_base()}/{JOBS}", headers=_headers(prefer="count=exact"),
        params={"select": "id", "limit": "1"}, timeout=15)
    _raise_for(r)
    cr = r.headers.get("content-range", "")
    total = int(cr.split("/")[-1]) if "/" in cr else 0
    if total > 0:
        return
    base = datetime.now(timezone.utc)
    rows = []
    for i, j in enumerate(SEED_JOBS):
        lat, lng = ROMA_QUARTIERI_COORDS.get(j["neighborhood"], (41.9028, 12.4964))
        rows.append({
            "id": str(uuid.uuid4()),
            "neighborhood": j["neighborhood"], "title": j["title"],
            "description": j["description"], "price": j["price"],
            "owner_id": "seed", "owner_name": j["owner_name"],
            "lat": lat, "lng": lng,
            "created_at": (base - timedelta(minutes=i + 1)).isoformat(),
        })
    ins = httpx.post(f"{_base()}/{JOBS}", headers=_headers(prefer="return=minimal"),
                    json=rows, timeout=20)
    _raise_for(ins)
