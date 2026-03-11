---
title: "feat: Deliberation tRPC router (CRUD, voting, blockers)"
labels: workstream:deliberation
parent: 26
---

## Scope

tRPC router and auth helpers for the deliberation API.

### Router: `src/server/api/routers/deliberation.ts`

**Queries:**
- `getDeliberation({ eventId })` -- fetch active deliberation with counts (public for PUBLISHED, attendee otherwise)
- `getPriorities({ deliberationId, sortBy, trackId })` -- list priorities with votes, blockers, resources, hasVoted flag
- `getTopicClusters({ deliberationId })` -- topic clusters from transcript analysis
- `getTranscripts({ deliberationId })` -- transcript list with status (admin/floor lead)
- `getAnalysisResults({ deliberationId })` -- analysis JSON + DDS URIs (public after PUBLISHED)

**Mutations:**
- `createDeliberation({ eventId, title, description?, closesAt? })` -- admin creates deliberation
- `submitPriority({ deliberationId, title, description?, trackId? })` -- attendee submits priority (COLLECTING status only)
- `vote({ priorityId })` -- toggle vote (add/remove)
- `submitBlocker({ priorityId, description })` -- add blocker to priority
- `submitResourceSuggestion({ priorityId, category, description })` -- suggest resource allocation
- `closeDeliberation({ deliberationId })` -- admin closes submissions
- `moderatePriority({ priorityId, isModerated })` -- admin moderation

### Auth helpers: `src/server/api/utils/deliberationAuth.ts`

Follow `scheduleAuth.ts` patterns:
- `isAcceptedAttendee(db, userId, eventId)` -- accepted application check
- `isDeliberationAdmin(db, userId, eventId)` -- admin/staff or event creator
- `assertDeliberationAccess(db, userId, eventId)` -- throw FORBIDDEN if not attendee
- `assertDeliberationAdmin(db, userId, eventId)` -- throw FORBIDDEN if not admin

### Register

Add `deliberation: deliberationRouter` to `src/server/api/root.ts`

### Acceptance criteria

- [ ] All endpoints callable
- [ ] Auth properly enforced
- [ ] Vote toggle works (add + remove)
- [ ] Priority submission blocked when not COLLECTING
- [ ] `bun run check` passes

Depends on schema issue being completed first.
