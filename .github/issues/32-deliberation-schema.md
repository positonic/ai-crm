---
title: "feat: Deliberation schema + Prisma models"
labels: workstream:deliberation
parent: 26
---

## Scope

Add database models for the Conference Intelligence deliberation system.

### Prisma schema additions

**New enums:**
- `DeliberationStatus`: COLLECTING, CLOSED, ANALYZING, PUBLISHED
- `TranscriptStatus`: PENDING, PROCESSING, COMPLETED, FAILED

**New models:**
- `Deliberation` -- event-scoped deliberation with status lifecycle, DDS publication URIs, analysis result JSON
- `FloorTranscript` -- audio file reference + transcript text + processing status per floor/session
- `TopicCluster` -- extracted topics with labels, keywords, mention counts, source excerpts
- `DeliberationPriority` -- attendee-submitted priority with title, description, optional track
- `DeliberationVote` -- unique vote per user per priority (toggle)
- `DeliberationBlocker` -- blocker description attached to a priority
- `DeliberationResourceSuggestion` -- resource suggestion with category (funding/talent/tooling/other)

**Existing model additions:**
- `Event`: add `featureDeliberation Boolean @default(false)`
- `User`: add relation fields for transcriptUploads, deliberationPriorities, deliberationVotes, deliberationBlockers, deliberationResources

### Indexes

- Deliberation: eventId, status
- FloorTranscript: deliberationId, status
- TopicCluster: deliberationId, mentionCount
- DeliberationPriority: deliberationId, userId
- DeliberationVote: unique(priorityId, userId)
- DeliberationBlocker: priorityId
- DeliberationResourceSuggestion: priorityId

### Acceptance criteria

- [ ] Schema compiles (`bunx prisma validate`)
- [ ] Migration created (`bunx prisma migrate dev --name add-deliberation-models`)
- [ ] `bun run db:generate` succeeds
- [ ] `bun run check` passes

See `SPEC-CONFERENCE-INTELLIGENCE-TECHNICAL.md` for full schema definition.
