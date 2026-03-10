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
  Input:  { audioUrl: string } OR { text: string }
  Output: { jobId: string, status: "processing" }

GET  /jobs/:jobId
  Output: { status, result?, error? }

POST /cluster
  Input:  { transcripts: Array<{ title: string, text: string }> }
  Output: { clusters: Array<{ label, keywords, mentionCount, sourceExcerpts }> }

POST /analyze
  Input:  { topicClusters: [...], priorities: [...] }
  Output: { rankedPriorities, blindSpots, blockerThemes, resourceRecommendations, synthesis }
```

### Shared types

Consider a small shared types package or just duplicate the interfaces (simpler for POC).

### Initial repo structure

```
conference-intel-worker/
  src/
    index.ts          -- entry point / router
    transcribe.ts     -- Whisper integration
    cluster.ts        -- GPT-4o topic extraction
    analyze.ts        -- signal merge + synthesis
    types.ts          -- shared interfaces
  README.md           -- contributor guide
  package.json
  tsconfig.json
```

### Acceptance criteria

- [ ] Repo created under fundingthecommons org
- [ ] README with purpose, setup instructions, API docs
- [ ] Basic project structure
- [ ] At least one endpoint working (transcribe or cluster)
- [ ] Deployable (Cloudflare Workers or Railway)
