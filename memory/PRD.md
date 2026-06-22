# Du' Spicci — PRD

## Original Problem Statement
Mobile-first web app called "Du' Spicci" (subtitle: I lavoretti di Roma).
Matches people offering and seeking small cash-paid jobs in Rome
(tutoring, dog-sitting, IKEA assembly, postal queue, etc.).

Style: cream background (#fefbeb), Roman Ochre accent (#d97706),
"Pop-Parioli" vibe — big bold writing, modern fonts, rounded edges, no corporate look.

Two views toggled at the top:
- "CERCO SPICCI": board of cards (neighborhood, title, desc, giant green cash tag, "Mi Candido" button)
- "OFFRO SPICCI": clean form with neighborhood dropdown, job, cash amount, notes
Magic: after publishing, app auto-switches to "Cerco" and new ad appears on top.

## Architecture
- Backend: FastAPI + MongoDB (motor) + JWT (bcrypt + PyJWT). Routes under /api.
- Frontend: React (CRA + craco), Tailwind CSS, Sonner toasts, lucide-react icons.
- Auth: Bearer JWT in localStorage. /api/auth/register | /login | /me.
- Jobs: /api/jobs GET (public) | POST (auth) | /api/jobs/{id}/apply POST (auth).
- Seed: 4 realistic Roma job ads on backend startup.

## User Personas
1. **Cercatore di spicci** — student / freelancer in Rome looking for cash side jobs nearby.
2. **Offerente** — busy professional / parent posting small tasks they can't do.

## Core Requirements (static)
- Mobile-first responsive
- Cream + Ochre + Green-cash palette
- Outfit (headings) + DM Sans (body)
- Top toggle between Cerco / Offro
- 4 seeded ads (Parioli, Centro Storico, Prati)
- Auth required to publish or apply

## Implemented (2026-02 v1)
- JWT auth (register/login/me, Bearer token)
- Job board listing with seeded data
- Job publishing with auto-switch magic
- "Mi Candido" apply endpoint (returns confirmation toast)
- Pop-Parioli design with neo-brutalist shadows and tilted green price tag

## Backlog
- P1: Filter board by neighborhood
- P1: Owner can see/manage their own ads, delete
- P2: Push notifications when someone applies
- P2: WhatsApp deeplink to contact offerer
- P2: Photo upload for job listings
- P2: Rating / trust system

## Files of interest
- Backend: /app/backend/server.py
- Frontend: /app/frontend/src/App.js, src/pages/AuthPage.jsx, src/pages/BoardPage.jsx,
  src/components/ModeToggle.jsx, JobCard.jsx, OfferForm.jsx,
  src/contexts/AuthContext.jsx, src/lib/api.js

## v2 (2026-02) — Supabase migration + enhancements

### Backend
- Jobs CRUD migrato da MongoDB → **Supabase REST (PostgREST)** via httpx wrapper `/app/backend/supabase_jobs.py`.
- Auth resta su MongoDB (users collection).
- Aggiunto endpoint `GET /api/neighborhoods` (37 quartieri di Roma curati).
- `POST /api/jobs` valida quartiere contro lista ufficiale (400 altrimenti).
- `POST /api/jobs/{id}/apply` accetta `{tip:int}` per la Mancia opzionale.
- Auto-seed dei 4 annunci romani su Supabase al primo avvio (idempotente).
- Tabella `public.jobs` creata via Supabase Management API + PAT.

### Frontend
- OfferForm: dropdown completo con 37 quartieri.
- BoardPage: filtro `data-testid="filter-neighborhood"` chiama `/api/jobs?neighborhood=X`.
- MancaModal: nuovo componente con opzioni `--/+1€/+2€/+5€` collegate al backend.
- JobCard: il "Mi Candido" apre la MancaModal.

### Env vars
- SUPABASE_URL=https://kpkzevkjpuwqqvyzrozf.supabase.co
- SUPABASE_ANON_KEY=<service-role secret key sb_secret_...> (bypassa RLS lato backend)
