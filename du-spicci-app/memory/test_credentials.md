# Du' Spicci - Test Credentials

## Register a NEW test user (with selfie) via the UI
The new register form requires: first_name, last_name, age, email, password, **selfie photo** (from camera).
The Mancia feature has been REMOVED. App is fully free.

## Legacy user (no profile photo/age — pre-v3)
- Email: `test@duspicci.it`
- Password: `test1234`
Backend returns this user with age=0 and no photo (works but profile modal is incomplete).

## New endpoints (v3)
- POST /api/auth/register   { email, password, first_name, last_name, age, photo (data URL) }
- GET  /api/users/{id}      (auth) — public profile (first/last name, age, photo)
- GET  /api/neighborhoods/counts → {total, counts:{Quartiere:N}}
- GET  /api/neighborhoods/coords → [{name, lat, lng}]
- POST /api/jobs            now accepts optional {lat, lng}
- POST /api/jobs/{id}/apply (auth) → creates Application (pending)
- GET  /api/applications/inbox  (jobs I own)
- GET  /api/applications/mine   (jobs I applied to)
- POST /api/applications/{id}/accept → creates Thread (48h TTL)
- POST /api/applications/{id}/reject
- GET  /api/threads             → list my threads (with expired bool)
- GET  /api/threads/{id}/messages
- POST /api/threads/{id}/messages { text }   → 410 if expired
