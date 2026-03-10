---
title: "feat: Admin deliberation management UI"
labels: workstream:ui,workstream:deliberation
parent: 26
---

## Scope

Admin controls for managing deliberations, embedded in the existing admin event detail page.

### Admin deliberation section

Add to admin event management:

- **Toggle** `featureDeliberation` flag on event
- **Create deliberation** form (title, description, close date)
- **Transcript management**
  - Upload audio (calls conference-intel-worker or browser-side Whisper)
  - Transcript status list (PENDING / PROCESSING / COMPLETED / FAILED)
  - Retry failed transcriptions
- **Trigger actions** (buttons)
  - Run topic clustering
  - Run analysis (merge signals)
  - Publish to AT Protocol (DDS records)
- **Moderation queue** -- flag/remove inappropriate submissions
- **Status display** -- current deliberation status with lifecycle indicator

### Acceptance criteria

- [ ] Can create deliberation from admin
- [ ] Can toggle feature flag
- [ ] Transcript status visible and updates
- [ ] Trigger buttons call correct endpoints
- [ ] Moderation works (hide/unhide priorities)
- [ ] `bun run check` passes
