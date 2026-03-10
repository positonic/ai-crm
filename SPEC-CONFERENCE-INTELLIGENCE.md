> **Note**: Architecture has changed to multi-repo. See GitHub issue #26 for current issue breakdown.
> **Live Transcription**: See GitHub issue #41 for the Frontier Tower SF deployment plan.
> Local specs retained for offline reference but GitHub issues are the source of truth.

# Conference Intelligence System

## Problem

Every FtC event surfaces hundreds of ideas, projects, and priorities across tracks. There is no structured way to capture what the community collectively believes matters most, what is blocking progress, or where resources should go. These insights live in hallway conversations and are lost after the event ends.

## Proposal

Build a collective intelligence feature powered by the Decentralized Deliberation Standard (DDS) that answers three questions:

1. **What matters most?**
2. **What are the blockers?**
3. **Where should resources go?**

Two collection channels feed into one analysis:

### Automated (transcription)

All floors are recorded and transcribed via Whisper. GPT-4o extracts topic clusters from transcripts, capturing what people are actually discussing across every track simultaneously.

> **Implementation (Frontier Tower SF)**: Tiered approach — Tier 1 rooms use Meetily (local Whisper `medium.en` on Apple Silicon Macs) with live sync to exponential database. Tier 2 rooms use iPhone Voice Memos → FFmpeg → OpenAI Whisper API batch transcription. See #41 and `scripts/meetily-sync.ts`, `scripts/batch-transcribe.ts`.

### Intentional (deliberation)

A "Priorities" tab where attendees submit priorities, flag blockers, vote, and suggest resource allocation. Captures what people think matters most.

### Merged analysis

The analysis engine merges both signals:

| Signal | Meaning |
|--------|---------|
| **Discussed + voted** | Clear community priority (convergent) |
| **Discussed but not submitted** | Blind spot |
| **Submitted but not discussed** | Aspirational priority |

Results are published as verifiable, decentralized DDS records on AT Protocol and certified with a Hypercert Activity Cert.

---

## The Experience

### During the event

1. Tier 1 rooms: Macs run Meetily with local Whisper, sync transcripts to exponential every 30s
   Tier 2 rooms: Floor leads record on iPhone, batch transcribe post-session via FFmpeg + Whisper API
2. GPT-4o extracts topics from transcripts in near-real-time (Tier 1) or post-session (Tier 2)
3. Attendees submit priorities, flag blockers, vote on what matters
4. Topic clusters sidebar shows what is being discussed across floors
5. Everything updates live

### After the event

1. Merge automated + intentional signals
2. LLM-powered synthesis answering the three core questions
3. Publish DDS records (`org.dds.result.summary`, `org.dds.result.pca`) on AT Protocol
4. Create Hypercert Activity Cert with all participants as contributors
5. Browsable on Hyperscan

---

## System Architecture

### High-Level Pipeline

```mermaid
graph TD
    A[Audio Upload<br/>Floor Leads / AV] --> B[Whisper<br/>Transcription]
    B --> C[Topic Clustering<br/>GPT-4o]
    C -->|automated signal| E[Analysis Engine<br/>Merge Signals]
    D[Priority Submission<br/>Votes + Blockers] -->|intentional signal| E
    E --> F[DDS Publication<br/>AT Protocol]
    F --> G[Results Page]
    F --> H[Activity Cert<br/>Hypercert]

    style A fill:#e3f2fd
    style D fill:#fff3e0
    style E fill:#f3e5f5
    style F fill:#e8f5e9
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     DURING THE EVENT                             │
│                                                                  │
│  AUTOMATED CHANNEL              INTENTIONAL CHANNEL              │
│  ─────────────────              ───────────────────              │
│                                                                  │
│  Floor 1 Audio ─┐              Attendee A ─┐                    │
│  Floor 2 Audio ─┤─→ Whisper    Attendee B ─┤─→ Submit Priority  │
│  Floor 3 Audio ─┘   │         Attendee C ─┘   │                │
│                      ▼                          ▼                │
│              Transcripts              Priorities + Votes         │
│                      │                          │                │
│                      ▼                          │                │
│              Topic Clusters                     │                │
│              (GPT-4o)                           │                │
│                      │                          │                │
│                      └─────────┬────────────────┘                │
│                                ▼                                 │
│                       ┌────────────────┐                         │
│                       │ TOPIC SIDEBAR  │  ← Live during event    │
│                       └────────────────┘                         │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                     AFTER THE EVENT                               │
│                                                                  │
│              Topic Clusters ──┐                                  │
│                               ├──→ Analysis Engine               │
│              Voted Priorities ─┘        │                        │
│                                         ▼                        │
│                              ┌──────────────────┐                │
│                              │ SIGNAL MERGE      │                │
│                              │                   │                │
│                              │ Convergent:       │                │
│                              │  discussed+voted  │                │
│                              │                   │                │
│                              │ Blind Spot:       │                │
│                              │  discussed only   │                │
│                              │                   │                │
│                              │ Aspirational:     │                │
│                              │  voted only       │                │
│                              └────────┬─────────┘                │
│                                       ▼                          │
│                              ┌──────────────────┐                │
│                              │ DDS PUBLICATION   │                │
│                              │ ───────────────── │                │
│                              │ org.dds.result.   │                │
│                              │   summary         │                │
│                              │ org.dds.result.   │                │
│                              │   pca             │                │
│                              │ org.hypercerts.   │                │
│                              │   claim.activity  │                │
│                              └──────────────────┘                │
└──────────────────────────────────────────────────────────────────┘
```

### Status Lifecycle

```mermaid
stateDiagram-v2
    [*] --> COLLECTING : Admin creates deliberation
    COLLECTING --> CLOSED : Admin closes submissions
    CLOSED --> ANALYZING : Admin triggers analysis
    ANALYZING --> PUBLISHED : Analysis complete + DDS records created
    PUBLISHED --> [*]

    COLLECTING : Attendees submit priorities
    COLLECTING : Attendees vote and add blockers
    COLLECTING : Floor leads upload audio
    COLLECTING : Transcription runs in background
    CLOSED : No new submissions accepted
    CLOSED : Topic clustering can run
    ANALYZING : Merge automated + intentional signals
    ANALYZING : GPT-4o generates synthesis
    PUBLISHED : Results publicly visible
    PUBLISHED : AT Protocol records created
    PUBLISHED : Activity cert issued
```

---

## Deliverable

A published, verifiable, community-generated document:

- **Ranked priorities** -- what the community identified as most important (weighted by discussion + votes)
- **Key blockers** -- obstacles grouped by theme
- **Resource recommendations** -- where funding, talent, and tooling should go

Published on AT Protocol. Certified with a Hypercert listing every participant as a contributor.

---

## DDS Lexicon Records

### `org.dds.result.summary`

The merged analysis output containing ranked priorities, blocker themes, and resource recommendations.

Fields:
- `deliberationTitle` -- Name of the deliberation
- `eventName` -- Associated event
- `inputHash` -- SHA-256 hash of input data for verification
- `algorithm` -- Analysis algorithm identifier
- `rankedPriorities` -- Array of priorities with vote counts, signal strength, and classification
- `blockerThemes` -- Grouped blockers by theme
- `resourceRecommendations` -- Resource allocation suggestions
- `synthesis` -- LLM-generated narrative summary

### `org.dds.result.pca`

Topic clusters extracted from transcripts.

Fields:
- `deliberationTitle` -- Name of the deliberation
- `inputHash` -- SHA-256 hash of concatenated transcripts
- `algorithm` -- Extraction algorithm identifier
- `clusters` -- Array of topic clusters with labels, keywords, mention counts, and source excerpts

### `org.hypercerts.claim.activity`

Activity cert listing all participants (voters, priority submitters, transcript uploaders) as contributors.

### `org.hyperboards.board`

Board pointing to the activity cert for public display.

---

## Sub-Issues

| Issue | Scope |
|-------|-------|
| #27 Schema + transcription pipeline | Database models, audio upload API, Whisper transcription service |
| #28 Intentional collection | Deliberation tRPC router, priorities, voting, blockers |
| #29 Topic clustering from transcripts | GPT-4o structured topic extraction |
| #30 Analysis engine + DDS publication | Merge signals, classify priorities, publish AT Protocol records |
| #31 Participant UI + results page | Priority cards, voting, topic sidebar, results display |

---

## User Roles

| Role | Capabilities |
|------|-------------|
| **Attendee** (accepted applicant) | Submit priorities, vote, add blockers, suggest resources, view results |
| **Floor Lead** | All attendee capabilities + upload audio for their floor |
| **Admin / Staff** | All capabilities + create deliberation, trigger analysis, moderate, publish results |

---

## Status Lifecycle

```
COLLECTING  -->  CLOSED  -->  ANALYZING  -->  PUBLISHED
   (active)     (no new       (LLM          (results
                submissions)   processing)    public)
```

---

## User Journeys

### Attendee Journey

```mermaid
journey
    title Attendee Deliberation Experience
    section During Event
      Open Priorities tab: 5: Attendee
      Browse existing priorities: 3: Attendee
      Submit a new priority: 5: Attendee
      Vote on priorities: 5: Attendee
      Flag a blocker: 4: Attendee
      Suggest resource allocation: 4: Attendee
      See topic clusters sidebar: 5: Attendee
    section After Event
      View results page: 5: Attendee
      See convergent priorities: 5: Attendee
      See blind spots: 4: Attendee
      View Activity Cert: 5: Attendee
```

### Admin Journey

```mermaid
journey
    title Admin Deliberation Workflow
    section Setup
      Enable feature flag: 5: Admin
      Create deliberation: 5: Admin
    section During Event
      Upload floor audio: 4: Admin, Floor Lead
      Monitor transcription status: 3: Admin
      Moderate submissions: 3: Admin
    section After Event
      Trigger topic clustering: 4: Admin
      Trigger analysis: 4: Admin
      Review results: 5: Admin
      Publish to AT Protocol: 5: Admin
```

### Signal Classification

```
                    ┌───────────────────────────────────┐
                    │     IN TRANSCRIPTS?                │
                    │     (discussed on floors)          │
                    ├──────────┬────────────────────────┤
                    │   YES    │         NO              │
┌───────────┬──────┼──────────┼────────────────────────┤
│           │ YES  │          │                         │
│ VOTED BY  │      │ CONVERGENT                         │
│ ATTENDEES?│      │ Clear community                    │
│           │      │ priority                ASPIRATIONAL│
│ (submitted│      │                         Voted but   │
│  + voted) │      │                         not         │
│           │      │                         discussed   │
│           ├──────┼──────────┼────────────────────────┤
│           │ NO   │          │                         │
│           │      │ BLIND SPOT              (neither)  │
│           │      │ Discussed but                      │
│           │      │ not submitted                      │
└───────────┴──────┴──────────┴────────────────────────┘
```

---

## Technical Stack

- **Transcription**: OpenAI Whisper API
- **Analysis**: GPT-4o structured output
- **Storage**: PostgreSQL (Prisma ORM) + Vercel Blob (audio files)
- **Publication**: AT Protocol via `@atproto/api`
- **Certification**: Hypercert Activity Certs
- **Frontend**: Next.js + Mantine + tRPC
