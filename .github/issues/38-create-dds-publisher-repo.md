---
title: "chore: Create fundingthecommons/dds-publisher repo"
labels: architecture,workstream:dds
parent: 26
---

## Scope

Create a new repository for the AT Protocol / DDS publication service.

### Purpose

Separate AT Protocol concerns from the main platform. This service creates verifiable DDS records and is **reusable beyond FtC** -- any event platform or deliberation tool could use it.

### What it does

Creates AT Protocol records following the DDS specification:
- `org.dds.result.summary` -- merged analysis with ranked priorities, blocker themes, resource recommendations
- `org.dds.result.pca` -- topic clusters extracted from transcripts
- `org.hypercerts.claim.activity` -- activity cert listing all participants as contributors
- `org.hyperboards.board` -- board pointing to the activity cert

### Existing patterns to extract

The impactful-events codebase already has working ATProto code:
- `src/server/services/activityCerts.ts` -- `AtpAgent` login, `createRecord` calls, URI/CID handling
- Uses `@atproto/api@^0.17.4`

### Recommended structure

```
dds-publisher/
  src/
    index.ts              -- entry point / API
    publisher.ts          -- core publication logic
    records/
      summary.ts          -- org.dds.result.summary
      pca.ts              -- org.dds.result.pca
      activityCert.ts     -- org.hypercerts.claim.activity
      board.ts            -- org.hyperboards.board
    types.ts              -- DDS record types
    hash.ts               -- SHA-256 input hashing
  lexicons/               -- JSON lexicon definitions (future)
  README.md
  package.json
```

### API

```
POST /publish
  Input:  { deliberationTitle, eventName, analysisResult, topicClusters, participants[] }
  Output: { summaryUri, summaryCid, pcaUri, pcaCid, activityUri, activityCid, boardUri, boardCid }
```

### Acceptance criteria

- [ ] Repo created under fundingthecommons org
- [ ] README explaining DDS, AT Protocol, and how to contribute
- [ ] Can create at least one record type on a test PDS
- [ ] Input hashing for verification
- [ ] Deployable independently
