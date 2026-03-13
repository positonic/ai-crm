# TypeScript Errors Auto-Learning Log

This file automatically captures TypeScript compilation errors that occur during development and their resolutions. It builds a growing knowledge base of real type errors from this codebase to prevent future issues.

## Format

Each entry follows this structure:

```markdown
## [Date/Time] - Error Type

**Error**: TypeScript error message
**File**: Path to file where error occurred
**Line**: Line number where error occurred
**Code Context**: Actual code that caused the error
**Fix Applied**: How the error was resolved
**Type Pattern**: Type annotation pattern that should be used

---
```

## Historical Type Errors

## 2025-01-05 10:50 - @typescript-eslint/no-unsafe-assignment - [Project: ftc-platform]

**Error**: Unsafe assignment of an error typed value
**Project Type**: Next.js + TypeScript + Vercel
**File**: src/app/contacts/page.tsx:51
**Line**: 51
**Code Context**: `const sendBulkMessage = api.telegramAuth.sendBulkMessage.useMutation();`
**Fix Applied**: Ensure proper typing of tRPC mutations with explicit type annotations
**Type Pattern**: Use proper tRPC mutation typing - avoid `any` or `error` typed values

---

## 2025-01-05 10:50 - @typescript-eslint/no-unsafe-call - [Project: ftc-platform]

**Error**: Unsafe call of a(n) `error` type typed value
**Project Type**: Next.js + TypeScript + Vercel  
**File**: src/app/contacts/page.tsx:51
**Line**: 51
**Code Context**: `api.telegramAuth.sendBulkMessage.useMutation()`
**Fix Applied**: Ensure tRPC router exports are properly typed
**Type Pattern**: Verify tRPC router includes all procedures with proper typing

---

## 2025-01-05 10:50 - @typescript-eslint/no-unsafe-member-access - [Project: ftc-platform]

**Error**: Unsafe member access on an `error` typed value
**Project Type**: Next.js + TypeScript + Vercel
**File**: src/app/contacts/page.tsx:93-101
**Line**: Multiple lines
**Code Context**: `result.successCount`, `result.failureCount`, `sendBulkMessage.mutateAsync`
**Fix Applied**: Add proper typing for mutation results and return values
**Type Pattern**: Always type tRPC mutation responses with proper interfaces

---

---

## Usage

This log is referenced by CLAUDE.md to help Claude Code generate type-safe TypeScript code on the first try by learning from actual type errors made in this specific codebase.
## 2025-01-07 15:20 - TS2322 Type Assignment Error - [Project: ftc-platform]

**Error**: Type 'bigint' is not assignable to type 'BigInteger'
**Project Type**: Next.js + TypeScript + Vercel
**File**: src/server/api/routers/telegramAuth.ts:537
**Line**: 537
**Code Context**: `randomId: (BigInteger as unknown as (num: number) => bigint)(Math.floor(Math.random() * 1000000000))`
**Fix Applied**: Import bigInt from "big-integer" and use proper function call
**Type Pattern**: Import `bigInt` from "big-integer" and use `bigInt(number)` instead of type casting

---

## 2025-01-07 15:20 - TS2693 Type/Value Confusion - [Project: ftc-platform]

**Error**: 'BigInteger' only refers to a type, but is being used as a value here
**Project Type**: Next.js + TypeScript + Vercel
**File**: src/server/api/routers/telegramAuth.ts:537
**Line**: 537
**Code Context**: `(BigInteger as unknown as (num: number) => bigint)`
**Fix Applied**: Changed from type import to value import: `import bigInt from "big-integer"`
**Type Pattern**: Use value imports for functions, type imports for type annotations - `import bigInt from "big-integer"` vs `import { type BigInteger } from "big-integer"`

---

## 2025-01-11 - TS2322 Type Mismatch in Event Handlers - [Project: ftc-platform]

**Error**: Type '(e: React.MouseEvent<HTMLDivElement>) => void' is not assignable to type 'MouseEventHandler<HTMLAnchorElement>'. Types of parameters 'e' and 'event' are incompatible. Type 'MouseEvent<HTMLAnchorElement, MouseEvent>' is not assignable to type 'MouseEvent<HTMLDivElement, MouseEvent>'.
**Project Type**: Next.js + TypeScript + Vercel
**File**: src/app/events/[eventId]/AsksOffersTab.tsx
**Line**: 98, 102
**Code Context**: 
```typescript
<Paper
  component={Link}
  href={`/events/${eventId}/asks-offers/${item.id}`}
  onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => { ... }}
  onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => { ... }}
>
```
**Fix Applied**: Changed event handler types from `React.MouseEvent<HTMLDivElement>` to `React.MouseEvent<HTMLAnchorElement>` to match the rendered element type
**Type Pattern**: When using Mantine's `component` prop to change the rendered element (e.g., `component={Link}`), event handler types must match the actual rendered element type. If `component={Link}`, use `HTMLAnchorElement` not `HTMLDivElement`.
**Prevention**: Always verify the rendered element type when using the `component` prop on Mantine components. The event handler types must match the actual DOM element that will be rendered, not the original component type.

---

## 2025-01-11 - TS2304 Undefined Variable Reference - [Project: impactful-events]

**Error**: Cannot find name 'eventId'. Did you mean '_eventId'?
**Project Type**: Next.js + TypeScript + Vercel
**File**: src/app/events/[eventId]/projects/[projectId]/ProjectDetailClient.tsx
**Line**: 1036
**Code Context**:
```typescript
// Props destructuring (line 142)
eventId: _eventId,

// Later usage (line 1036) - INCORRECT
router.push(`/events/${eventId}/updates/${update.id}`);
```
**Fix Applied**: Changed reference from `eventId` to `_eventId` to match the destructured variable name
```typescript
// FIXED (line 1036)
router.push(`/events/${_eventId}/updates/${update.id}`);
```
**Type Pattern**: When destructuring props with renamed variables (e.g., `eventId: _eventId`), always use the renamed variable name throughout the component. If a variable is actually being used, don't prefix it with underscore.
**Prevention**: Either use consistent variable names without renaming in destructuring, OR ensure all references use the renamed variable. The underscore prefix convention is for unused variables per `@typescript-eslint/no-unused-vars`, so if the variable IS used, don't rename it with underscore.

---

## 2025-01-11 - TS7006 Implicit Any Type in React Component Props - [Project: impactful-events]

**Error**: Binding element 'children' implicitly has an 'any' type.
**Project Type**: Next.js + TypeScript + Vercel
**File**: src/app/_components/MarkdownRenderer.tsx
**Lines**: 25, 30, 35, 40, 45, 50, 57, 96, 115, 125, 130, 135, 142, 152, 159, 166, 173, 184
**Code Context**:
```typescript
// ❌ INCORRECT - Missing type annotations
const markdownComponents = {
  h1: ({ children }) => (
    <Title order={1}>{children}</Title>
  ),
  p: ({ children }) => (
    <Text>{children}</Text>
  ),
  a: ({ href, children }) => (
    <Anchor href={href}>{children}</Anchor>
  ),
  // ... more components
};
```
**Fix Applied**: Added explicit type annotations to all component function parameters
```typescript
// ✅ CORRECT - Explicit type annotations
const markdownComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <Title order={1}>{children}</Title>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <Text>{children}</Text>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <Anchor href={href ?? '#'}>{children}</Anchor>
  ),
  code: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <Code>{children}</Code>
  ),
  // ... more components with proper types
};
```
**Type Pattern**: When defining component objects for React Markdown or similar libraries, always provide explicit type annotations for all props. Use `React.ReactNode` for children and appropriate types for other props.
**Prevention**:
1. All React component functions must have explicit type annotations in strict TypeScript mode
2. Use `{ children?: React.ReactNode }` for components that render children
3. For components with multiple props, list all prop types: `{ href?: string; children?: React.ReactNode }`
4. Use optional types (`?`) when props may not be provided by the parent library
5. Use nullish coalescing (`??`) for fallback values instead of implicit undefined handling

---

## 2025-01-11 - @typescript-eslint/no-unsafe-argument - [Project: impactful-events]

**Error**: Unsafe argument of type error typed assigned to a parameter of type `Date`.
**Project Type**: Next.js + TypeScript + Vercel
**File**: src/app/events/[eventId]/projects/[projectId]/ProjectDetailClient.tsx
**Line**: 1228
**Code Context**:
```typescript
// Timeline interface (lines 132-147)
interface TimelineItem {
  id: string;
  type: 'UPDATE' | 'MILESTONE';
  content: string;
  createdAt: Date;
  author: {
    id: string;
    name: string | null;
    image: string | null;
  };
  // ... other fields
}

// ❌ INCORRECT - Using non-existent field
<Text size="sm" c="dimmed">
  {update.author.name ?? 'Anonymous'} • {getRelativeTime(update.updateDate)}
</Text>
```
**Fix Applied**: Changed to use the correct field name from the interface
```typescript
// ✅ CORRECT - Using createdAt field that exists in interface
<Text size="sm" c="dimmed">
  {update.author.name ?? 'Anonymous'} • {getRelativeTime(update.createdAt)}
</Text>
```
**Type Pattern**: Always reference fields that exist in the type definition. Verify interface definitions before accessing nested properties.
**Prevention**:
1. Check interface definitions (lines 132-147) to see available fields
2. Use TypeScript autocomplete to avoid referencing non-existent fields
3. The error type indicates TypeScript couldn't infer the type of `update.updateDate` because it doesn't exist
4. Timeline items have `createdAt: Date` not `updateDate`
5. When working with complex nested objects, verify the interface structure first

---

## 2026-02-14 - TS2322 Type Mismatch in tRPC Mutation Input - [Project: impactful-events]

**Error**: Type '{ userId: string; role: string; }[]' is not assignable to type '{ userId: string; role?: "Speaker" | "Facilitator" | "Moderator" | "Presenter" | "Panelist" | "Host" | undefined; }[]'. Types of property 'role' are incompatible. Type 'string' is not assignable to type '"Speaker" | "Facilitator" | "Moderator" | "Presenter" | "Panelist" | "Host" | undefined'.
**Project Type**: Next.js + TypeScript + Vercel
**File**: src/app/events/[eventId]/manage-schedule/ManageScheduleClient.tsx
**Lines**: 599, 766
**Code Context**:
```typescript
// ❌ INCORRECT - Interface uses generic string type
interface SelectedSpeakerWithRole {
  user: SelectedSpeaker;
  role: string;  // Too broad for tRPC z.enum() input
}

// Array without `as const` - infers string[] instead of literal tuple
const PARTICIPANT_ROLES = ["Speaker", "Facilitator", ...];

// Passing to tRPC mutation that expects z.enum(PARTICIPANT_ROLES)
linkedSpeakers: linkedSpeakers.map((s) => ({
  userId: s.user.id,
  role: s.role,  // TS2322: string not assignable to union
})),
```
**Fix Applied**:
```typescript
// ✅ CORRECT - Use `as const` and derive union type
const PARTICIPANT_ROLES = [
  "Speaker", "Facilitator", "Moderator",
  "Presenter", "Panelist", "Host",
] as const;

type ParticipantRole = (typeof PARTICIPANT_ROLES)[number];

interface SelectedSpeakerWithRole {
  user: SelectedSpeaker;
  role: ParticipantRole;  // Matches tRPC z.enum() input
}

// Cast Prisma string values to the union type
session.sessionSpeakers.map((s) => ({
  user: s.user,
  role: s.role as ParticipantRole,
}));

// Cast Select onChange string value
onChangeSpeakerRole(id, val as ParticipantRole);
```
**Type Pattern**: When a tRPC procedure uses `z.enum(ROLES)` for input validation, the client-side types must match the enum union type exactly. Generic `string` will not work.
**Prevention**:
1. Always use `as const` on arrays used with `z.enum()` to get literal types
2. Derive union types from const arrays: `type Role = (typeof ROLES)[number]`
3. Use the derived type in interfaces/state, not generic `string`
4. Cast database string values to the union type when initializing state from Prisma data
5. Cast Select/input string values to the union type in event handlers
6. Keep client-side PARTICIPANT_ROLES in sync with server-side z.enum() values

---

## 2026-03-13 - instanceof Expression on Non-Object Type - [Project: impactful-events]

**Error**: The left-hand side of an 'instanceof' expression must be of type 'any', an object type or a type parameter.
**Project Type**: Next.js + TypeScript + Vercel
**File**: src/app/_components/EditSessionModal.tsx:682
**Line**: 682, 694, 730, 738, 740
**Code Context**:
```typescript
// Mantine DateTimePicker onChange type is: (value: DateValue) => void
// where DateValue = Date | null  (but TS may infer string | Date | null)

// ❌ INCORRECT - instanceof Date fails when val type includes string | null
onChange={(val) => {
  if (val instanceof Date && !isNaN(val.getTime())) {
    setStartTime(val);
  }
}}
```
**Fix Applied**: Use `typeof` narrowing to handle string case, then null check for Date
```typescript
// ✅ CORRECT - typeof narrowing handles string | Date | null union
onChange={(val) => {
  const date = typeof val === "string" ? new Date(val) : val;
  if (date && !isNaN(date.getTime())) {
    setStartTime(date);
  } else {
    setStartTime(null);
  }
}}

// ✅ ALSO CORRECT - For state variables typed as Date | null, use truthiness check
startTime && !isNaN(startTime.getTime())  // instead of: startTime instanceof Date && ...
```
**Type Pattern**: TypeScript does not allow `instanceof` on the left-hand side when the type includes primitive types like `string`. Use `typeof` narrowing first to eliminate string, then check for null/Date.
**Prevention**:
1. Never use `instanceof Date` on values typed as `string | Date | null` (common in Mantine date picker onChange)
2. Use `typeof val === "string" ? new Date(val) : val` to normalize string/Date union to Date | null
3. For `Date | null` state variables, use truthiness check (`val && !isNaN(val.getTime())`) instead of `instanceof Date`
4. The `instanceof` operator requires the left-hand side to be `any`, an object type, or a type parameter — not a union with primitives

---
