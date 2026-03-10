---
title: "feat: Priorities tab UI + results page"
labels: workstream:ui,workstream:deliberation
parent: 26
---

## Scope

Frontend for attendee deliberation participation and public results display.

### Participant deliberation page

`src/app/events/[eventId]/deliberation/`

- **PrioritySubmitForm** -- modal with title, description, optional track select
- **PriorityCard** (repeated list, sorted by votes or recent)
  - Vote button (toggle, optimistic update via React Query)
  - Expandable blocker section (list + add form)
  - Expandable resource suggestion section (list + add form)
- **TopicClustersSidebar** -- shows extracted topics from transcripts with labels, keywords, mention counts
- Sort toggle: by votes / by recent
- Poll priorities every 30s for live updates

### Results page

`src/app/events/[eventId]/deliberation/results/`

- Public view after PUBLISHED status
- Ranked priorities with signal badges:
  - **Convergent** (discussed + voted)
  - **Blind spot** (discussed but not submitted)
  - **Aspirational** (voted but not discussed)
- Signal strength bars (0-100)
- Blocker themes grouped as cards
- Resource recommendations by category
- Synthesis narrative
- AT Protocol record links (summaryUri, pcaUri, activityUri)
- Activity Cert badge with contributor count

### Event integration

Add "Priorities" tab to `src/app/events/[eventId]/EventDetailClient.tsx`:
- Gated by `event.featureDeliberation`
- Icon: `IconTarget`
- Routes to `/events/[eventId]/deliberation`

### Acceptance criteria

- [ ] Priority submission -> appears in list
- [ ] Vote toggle -> count updates optimistically
- [ ] Blocker/resource forms work
- [ ] Topic sidebar renders clusters
- [ ] Results page shows classified priorities
- [ ] Tab hidden when featureDeliberation is false
- [ ] Responsive (mobile-friendly)
- [ ] Theme-aware (light/dark mode)
- [ ] `bun run check` and `bun run build` pass
