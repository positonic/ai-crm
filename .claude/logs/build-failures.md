# Build Failures Auto-Learning Log

This file automatically captures build failures that occur during development and their resolutions. It builds a growing knowledge base of real build issues from this codebase to prevent future failures.

## Format

Each entry follows this structure:

```markdown
## [Date/Time] - Build Issue Type

**Build Command**: Command that failed (e.g., bun run build, vercel build)
**Error**: Build error message or exit code
**Root Cause**: What caused the build to fail
**Files Affected**: Files that needed changes to resolve
**Fix Applied**: Specific changes made to resolve the failure
**Prevention**: Pattern to follow to avoid this build issue

---
```

## Historical Build Failures

## 2025-01-24 - Next.js 15 useSearchParams Suspense Boundary - [Project: impactful-events]

**Build Command**: `vercel build`
**Error**: `useSearchParams() should be wrapped in a suspense boundary at page "/crm/communicate"`
**Root Cause**: Next.js 15 requires client components using `useSearchParams()` to be wrapped in a Suspense boundary during static generation
**Files Affected**: `src/app/crm/communicate/page.tsx`
**Code Context**:
```typescript
// ❌ INCORRECT - useSearchParams at page level without Suspense
export default function CommunicatePage() {
  const searchParams = useSearchParams();
  // ...
}
```
**Fix Applied**:
```typescript
// ✅ CORRECT - Wrap content in Suspense boundary
import { Suspense } from "react";

export default function CommunicatePage() {
  return (
    <Suspense fallback={<Center h="100vh"><Loader size="lg" /></Center>}>
      <CommunicatePageContent />
    </Suspense>
  );
}

function CommunicatePageContent() {
  const searchParams = useSearchParams();
  // ...
}
```
**Prevention**:
1. When using `useSearchParams()` in a page component, always wrap it in a Suspense boundary
2. Create a separate inner component for the content that uses client-side hooks
3. Export a wrapper component that provides the Suspense boundary with a loading fallback
4. This is required in Next.js 15 for pages that use client-side routing/search params during static generation

---

## 2026-02-14 - Stale .next Cache Causing Phantom ESLint Errors - [Project: impactful-events]

**Build Command**: `vercel build`
**Error**: Multiple `@typescript-eslint/no-unsafe-*` errors reporting "error typed value" on tRPC procedures that actually pass typecheck cleanly
**Root Cause**: Stale `.next` build cache from a previous failed build. The cached type information was outdated after fixing TypeScript errors, causing ESLint (which Next.js runs during build) to report errors that no longer exist in the source code.
**Files Affected**: `src/app/events/[eventId]/AddSpeakerModal.tsx` (phantom errors), `src/app/events/[eventId]/manage-schedule/ManageScheduleClient.tsx` (real TS2322 errors)
**Symptoms**:
- `bun run typecheck` passes with 0 errors (after fixing real TS issues)
- `bunx eslint <file>` passes when run directly
- `vercel build` fails with "error typed value" errors that don't exist
- Errors reference tRPC procedures as "error typed" even though the router compiles cleanly
**Fix Applied**: Delete `.next` directory before rebuilding: `rm -rf .next && vercel build`
**Prevention**:
1. When `vercel build` reports ESLint type errors that don't reproduce with direct `eslint` or `bun run typecheck`, suspect stale `.next` cache
2. Always clean the `.next` directory when debugging mysterious "error typed value" ESLint errors
3. If fixing TS errors in one file but build still shows errors in other files that use the same tRPC router, the cache is likely stale
4. The build cache stores type information from previous compilations - if the codebase changed significantly, this can cause false positives

---

## 2026-03-10 - Bun-Only Scripts Included in Next.js Build - [Project: impactful-events]

**Build Command**: `vercel build`
**Error**: `Cannot find name 'Bun'. Do you need to install type definitions for Bun?` in `scripts/batch-transcribe.ts:77`
**Root Cause**: The `scripts/` directory contains Bun-specific code (`Bun.spawn`, etc.) but was included in the TypeScript compilation via `**/*.ts` in tsconfig.json. Next.js build compiles all included TS files.
**Files Affected**: `tsconfig.json`, `eslint.config.js`
**Fix Applied**:
1. Added `"scripts"` to `tsconfig.json` `exclude` array
2. Added `"scripts"` to `eslint.config.js` `ignores` array (ESLint's `projectService` requires files to be in tsconfig)
**Prevention**:
1. When adding new `scripts/` files that use Bun-specific APIs, ensure the `scripts` directory is excluded from both tsconfig and eslint config
2. If scripts need type-checking, create a separate `tsconfig.scripts.json` that extends the base config and includes Bun types
3. ESLint with `projectService: true` requires all linted files to be included in the tsconfig project - excluding from one requires excluding from both

---

## Usage

This log is referenced by CLAUDE.md to help Claude Code generate code that builds successfully on the first try by learning from actual build failures in this specific codebase.