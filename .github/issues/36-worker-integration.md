---
title: "feat: Integrate conference-intel-worker API"
labels: workstream:transcription,architecture
parent: 26
---

## Scope

HTTP client in impactful-events to call the external conference-intel-worker service for AI-heavy operations.

### Why external

The AI workloads (Whisper transcription, GPT-4o clustering, GPT-4o analysis) are:
- Long-running (can exceed Vercel function timeouts)
- Resource-intensive (different scaling profile than CRUD)
- Stateless (input in, structured JSON out)
- Independently deployable

### Integration layer

`src/server/services/conferenceIntelClient.ts`

- `requestTranscription(audioUrl | transcriptText)` -> returns job ID
- `requestClustering(transcripts[])` -> returns topic clusters
- `requestAnalysis(topicClusters[], priorities[])` -> returns AnalysisResult
- `getJobStatus(jobId)` -> poll for completion
- Webhook callback support (worker calls back when done)

### Environment config

- `CONFERENCE_INTEL_WORKER_URL` -- worker service base URL
- `CONFERENCE_INTEL_WORKER_API_KEY` -- shared secret for auth

### tRPC endpoint updates

Update deliberation router's admin endpoints to call worker instead of running AI inline:
- `triggerTranscription` -> calls worker, updates FloorTranscript status
- `triggerClustering` -> calls worker, stores TopicClusters on completion
- `triggerAnalysis` -> calls worker, stores AnalysisResult on completion

### Acceptance criteria

- [ ] Worker called successfully from platform
- [ ] Job status polling works
- [ ] FloorTranscript/TopicCluster/AnalysisResult updated on completion
- [ ] Proper error handling with Sentry capture
- [ ] Graceful fallback if worker is unreachable

Depends on conference-intel-worker repo existing.
