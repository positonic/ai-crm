#!/usr/bin/env bash
# Run this script when online to create all GitHub issues, update the epic, and close old issues.
# Usage: bash .github/issues/create-all.sh

set -euo pipefail

REPO="fundingthecommons/impactful-events"

echo "=== Step 1: Create labels ==="
gh label create "workstream:transcription" --color "1d76db" --repo "$REPO" 2>/dev/null || echo "  (label already exists)"
gh label create "workstream:deliberation" --color "d876e3" --repo "$REPO" 2>/dev/null || echo "  (label already exists)"
gh label create "workstream:dds" --color "0e8a16" --repo "$REPO" 2>/dev/null || echo "  (label already exists)"
gh label create "workstream:ui" --color "f9d0c4" --repo "$REPO" 2>/dev/null || echo "  (label already exists)"
gh label create "architecture" --color "c5def5" --repo "$REPO" 2>/dev/null || echo "  (label already exists)"
echo "  Labels done."

echo ""
echo "=== Step 2: Create new issues ==="

# Helper: extract body from md file (everything after the --- frontmatter)
body_from_md() {
  sed -n '/^---$/,/^---$/!p' "$1" | tail -n +1
}

# Issue A: Deliberation schema
ISSUE_A=$(gh issue create --repo "$REPO" \
  --title "feat: Deliberation schema + Prisma models" \
  --label "workstream:deliberation" \
  --body "$(body_from_md .github/issues/32-deliberation-schema.md)" 2>&1 | grep -oE '[0-9]+$')
echo "  Created #$ISSUE_A - Deliberation schema"

# Issue B: tRPC router
ISSUE_B=$(gh issue create --repo "$REPO" \
  --title "feat: Deliberation tRPC router (CRUD, voting, blockers)" \
  --label "workstream:deliberation" \
  --body "$(body_from_md .github/issues/33-deliberation-trpc-router.md)" 2>&1 | grep -oE '[0-9]+$')
echo "  Created #$ISSUE_B - tRPC router"

# Issue C: Priorities UI
ISSUE_C=$(gh issue create --repo "$REPO" \
  --title "feat: Priorities tab UI + results page" \
  --label "workstream:ui,workstream:deliberation" \
  --body "$(body_from_md .github/issues/34-priorities-ui.md)" 2>&1 | grep -oE '[0-9]+$')
echo "  Created #$ISSUE_C - Priorities UI"

# Issue D: Admin UI
ISSUE_D=$(gh issue create --repo "$REPO" \
  --title "feat: Admin deliberation management UI" \
  --label "workstream:ui,workstream:deliberation" \
  --body "$(body_from_md .github/issues/35-admin-deliberation-ui.md)" 2>&1 | grep -oE '[0-9]+$')
echo "  Created #$ISSUE_D - Admin UI"

# Issue E: Worker integration
ISSUE_E=$(gh issue create --repo "$REPO" \
  --title "feat: Integrate conference-intel-worker API" \
  --label "workstream:transcription,architecture" \
  --body "$(body_from_md .github/issues/36-worker-integration.md)" 2>&1 | grep -oE '[0-9]+$')
echo "  Created #$ISSUE_E - Worker integration"

# Issue F: conference-intel-worker repo
ISSUE_F=$(gh issue create --repo "$REPO" \
  --title "chore: Create fundingthecommons/conference-intel-worker repo" \
  --label "architecture,workstream:transcription" \
  --body "$(body_from_md .github/issues/37-create-conference-intel-worker-repo.md)" 2>&1 | grep -oE '[0-9]+$')
echo "  Created #$ISSUE_F - conference-intel-worker repo"

# Issue G: dds-publisher repo
ISSUE_G=$(gh issue create --repo "$REPO" \
  --title "chore: Create fundingthecommons/dds-publisher repo" \
  --label "architecture,workstream:dds" \
  --body "$(body_from_md .github/issues/38-create-dds-publisher-repo.md)" 2>&1 | grep -oE '[0-9]+$')
echo "  Created #$ISSUE_G - dds-publisher repo"

# Issue H: whisper-browser repo
ISSUE_H=$(gh issue create --repo "$REPO" \
  --title "chore: Create fundingthecommons/whisper-browser repo" \
  --label "architecture,workstream:transcription,good first issue" \
  --body "$(body_from_md .github/issues/39-create-whisper-browser-repo.md)" 2>&1 | grep -oE '[0-9]+$')
echo "  Created #$ISSUE_H - whisper-browser repo"

echo ""
echo "=== Step 3: Update epic #26 ==="

# Get current body
CURRENT_BODY=$(gh issue view 26 --repo "$REPO" --json body -q '.body')

ARCH_SECTION="

---

## Architecture

This system spans multiple repositories:

| Repo | Purpose | Status |
|------|---------|--------|
| \`impactful-events\` | Platform UI, auth, CRUD, voting | Active |
| \`conference-intel-worker\` | AI services (transcription, clustering, analysis) | #$ISSUE_F |
| \`dds-publisher\` | AT Protocol publication | #$ISSUE_G |
| \`whisper-browser\` | Browser-side Whisper transcription | #$ISSUE_H |

### Workstreams

**Platform (impactful-events):**
- [ ] #$ISSUE_A Deliberation schema + Prisma models
- [ ] #$ISSUE_B Deliberation tRPC router
- [ ] #$ISSUE_C Priorities tab UI + results page
- [ ] #$ISSUE_D Admin deliberation management UI
- [ ] #$ISSUE_E Worker integration

**New repos:**
- [ ] #$ISSUE_F conference-intel-worker
- [ ] #$ISSUE_G dds-publisher
- [ ] #$ISSUE_H whisper-browser

### Previous sub-issues

Issues #27-#31 have been closed and replaced by the issues above (architecture changed from monolith to multi-repo)."

# Replace the old sub-issues section and append architecture
NEW_BODY=$(echo "$CURRENT_BODY" | sed '/^## Sub-issues/,$d')
NEW_BODY="${NEW_BODY}${ARCH_SECTION}"

gh issue edit 26 --repo "$REPO" --body "$NEW_BODY"
echo "  Epic #26 updated."

echo ""
echo "=== Step 4: Close old issues #27-#31 ==="

CLOSE_MSG="Closing in favor of restructured issues. The monolith architecture has been replaced with a multi-repo approach. See updated epic #26 for the new issue breakdown."

for i in 27 28 29 30 31; do
  gh issue close "$i" --repo "$REPO" --comment "$CLOSE_MSG" 2>&1
  echo "  Closed #$i"
done

echo ""
echo "=== Done! ==="
echo ""
echo "New issues created:"
echo "  #$ISSUE_A - Deliberation schema"
echo "  #$ISSUE_B - tRPC router"
echo "  #$ISSUE_C - Priorities UI"
echo "  #$ISSUE_D - Admin UI"
echo "  #$ISSUE_E - Worker integration"
echo "  #$ISSUE_F - conference-intel-worker repo"
echo "  #$ISSUE_G - dds-publisher repo"
echo "  #$ISSUE_H - whisper-browser repo"
echo ""
echo "Epic #26 updated with architecture section."
echo "Issues #27-#31 closed."
