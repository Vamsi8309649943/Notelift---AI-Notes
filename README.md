3# AI Meeting Notes

Implements the full architecture: input validation → normalization → hash
dedup → usage/plan gate → chunk decision → prompt builder → Groq LLM call →
validation/retry/fallback → SQLite storage → dashboard.

## Backend (FastAPI + Groq)

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env      # then add your real OPENAI_API_KEY
export OPENAI_API_KEY=your_key_here
uvicorn main:app --reload --port 8000
```

API docs (Swagger UI) will be at `http://localhost:8000/docs`.

### Endpoints
- `POST /api/summarize` — body `{ "transcript": "..." }`, header `x-user-id: <user id>`
- `GET /api/notes` — history for a user, header `x-user-id: <user id>`
- `GET /api/usage` — today's usage vs free-tier limit, header `x-user-id: <user id>`
- `GET /health` — health check

## Frontend

Plain HTML/JS, no build step needed. Just open `frontend/index.html` in a
browser while the backend is running on `localhost:8000`.

(It's hardcoded to `USER_ID = "demo-user-1"` for the demo — wire this to your
real auth/session in production.)

## Notes on OpenAI model

Default model is `gpt-4o-mini`. You can swap via the `OPENAI_MODEL`
env var to any OpenAI-hosted model, e.g. `gpt-4o` for higher quality
responses if cost/latency allow.

## What's implemented vs. simplified for the 24hr scope

- **Implemented**: full 9-stage pipeline, atomic usage gating (race-free),
  content-hash dedup, chunking with rolling context + merge for long
  transcripts, retry-then-fallback on malformed LLM output, prompt-injection
  defense (transcript treated as data, not instructions).
- **Simplified for demo**: no real auth (`x-user-id` header stands in for a
  session), no Stripe integration wired in yet (usage gate is ready to hook
  into a `plan_tier` check once Stripe is added), SQLite instead of Postgres
  (swap easily via SQLAlchemy if needed).
