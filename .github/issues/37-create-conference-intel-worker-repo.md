---
title: "chore: Create fundingthecommons/conference-intel-worker repo"
labels: architecture,workstream:transcription
parent: 26
---

## Scope

Create a new repository for the stateless AI service that handles transcription, topic clustering, and analysis.

### Purpose

Separate AI-heavy workloads from the Next.js platform to avoid Vercel function timeouts, enable independent scaling, and allow contributors to work on AI features without touching the main platform.

### Recommended stack

- **Runtime**: Hono on Cloudflare Workers, or Express on a simple VPS/Railway
- **Language**: TypeScript
- **Dependencies**: `openai` (Whisper + GPT-4o), `zod` (validation)
- **No dependency** on Next.js, Prisma, or the platform codebase

### Endpoints

```
POST /transcribe
  Input:  { audioUrl: string (https-only; must pass SSRF checks below) }
          OR { text: string }
  Output: { jobId: string, status: "processing" }

  Implementers MUST enforce all audioUrl checks below and return 400
  for any disallowed URL BEFORE creating the jobId/status response.

  audioUrl validation (SSRF prevention — enforce BEFORE creating jobId):
    - Scheme:       only https (reject http, file, ftp, data, etc.)
    - Host:         resolve DNS and reject private/internal IP ranges
                    (127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12,
                    192.168.0.0/16, 169.254.0.0/16, ::1, fc00::/7)
                    and localhost / *.internal hostnames
    - Allowlist:    optionally restrict to known storage origins
                    (e.g. *.s3.amazonaws.com, storage.googleapis.com)
    - Content-Size: reject if Content-Length > 500 MB (configurable)
    - Fetch timeout: abort fetch after 30 s (configurable)
    - Content-Type: optionally require audio/* MIME type
    - On violation return 400 with a descriptive error; never start
      a background job for a disallowed URL

GET  /jobs/:jobId
  Output: { status, result?, error? }

POST /cluster
  Input:  { transcripts: Array<{ title: string, text: string }> }
  Output: { clusters: Array<{ label, keywords, mentionCount, sourceExcerpts }> }

POST /analyze
  Input:  { topicClusters: [...], priorities: [...] }
  Output: { rankedPriorities, blindSpots, blockerThemes, resourceRecommendations, synthesis }
```

### Authentication & request verification

All endpoints (`/transcribe`, `/cluster`, `/analyze`, `GET /jobs/:jobId`) MUST be protected by auth middleware. Anonymous access is not permitted.

#### API-key authentication (minimum requirement)

- Middleware checks `Authorization: Bearer <token>` or `X-API-Key: <key>` header on every request
- Reject with `401 Unauthorized` (missing/malformed) or `403 Forbidden` (invalid key)
- Keys stored as environment variables (`WORKER_API_KEY`); support multiple keys via comma-separated list (`WORKER_API_KEYS`) for rotation
- Rate-limit per key (optional but recommended)

#### Signed-token authentication (recommended for production)

- Accept `Authorization: Bearer <jwt>` where the JWT is signed with a shared secret (`WORKER_JWT_SECRET`)
- Verify signature (HS256), expiry (`exp`), and issuer (`iss`) claims
- Include `sub` (caller identity) for audit logging
- Reject with `401` on invalid/expired tokens

#### Webhook / job-result callback verification

When the worker posts job results back to the platform (or any external callback):

- Sign the callback payload with HMAC-SHA256 using a shared secret (`WEBHOOK_SIGNING_SECRET`)
- Include the signature in a `X-Signature-256` header: `sha256=<hex-digest>`
- The receiving side MUST verify the signature before accepting the payload
- Include a `X-Timestamp` header; reject callbacks older than 5 minutes to prevent replay attacks

#### Environment configuration

```
WORKER_API_KEY=<primary-api-key>
WORKER_API_KEYS=<key1>,<key2>           # Optional: multiple keys for rotation
WORKER_JWT_SECRET=<jwt-signing-secret>  # Optional: for JWT auth mode
WEBHOOK_SIGNING_SECRET=<hmac-secret>    # For signing outbound callbacks
```

#### Implementation notes

- Auth middleware should be applied at the router level (e.g., Hono `app.use('*', authMiddleware)` or Express `app.use(authMiddleware)`) so all route handlers are protected by default
- The `/health` endpoint (if added) may be excluded from auth for load-balancer probes
- Log authentication failures with request metadata (IP, timestamp) but never log secrets or full tokens

### Shared types

Consider a small shared types package or just duplicate the interfaces (simpler for POC).

### Initial repo structure

```
conference-intel-worker/
  src/
    index.ts          -- entry point / router
    middleware/
      auth.ts         -- API-key / JWT verification middleware
      webhook.ts      -- HMAC signature generation for outbound callbacks
    transcribe.ts     -- Whisper integration
    cluster.ts        -- GPT-4o topic extraction
    analyze.ts        -- signal merge + synthesis
    types.ts          -- shared interfaces
  README.md           -- contributor guide
  package.json
  tsconfig.json
  .env.example        -- documents all required/optional env vars
```

### Acceptance criteria

- [ ] Repo created under fundingthecommons org
- [ ] README with purpose, setup instructions, API docs
- [ ] Basic project structure
- [ ] Auth middleware rejects requests without valid API key / token (401/403)
- [ ] Outbound webhook callbacks signed with HMAC-SHA256
- [ ] `.env.example` documents `WORKER_API_KEY`, `WORKER_JWT_SECRET`, `WEBHOOK_SIGNING_SECRET`
- [ ] At least one endpoint working (transcribe or cluster)
- [ ] Deployable (Cloudflare Workers or Railway)
