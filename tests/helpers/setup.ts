/**
 * Per-test setup file for integration tests.
 *
 * Responsibilities:
 * 1. Set SKIP_ENV_VALIDATION so ~/env doesn't blow up outside Next.js
 * 2. Guard against accidentally running tests against production DB
 * 3. Mock external services (Postmark, Sentry)
 */

import { vi, beforeAll } from "vitest";

// ── 1. Env validation bypass ────────────────────────────────────────────
process.env.SKIP_ENV_VALIDATION = "1";
(process.env as Record<string, string>).NODE_ENV = "test";

// Use the test container URL set by globalSetup
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

// ── 2. Production DB guard ──────────────────────────────────────────────
beforeAll(() => {
  const dbUrl = process.env.DATABASE_URL ?? "";
  const productionHosts = [
    "neon.tech",
    "supabase.co",
    "railway.app",
    "planetscale.com",
    "amazonaws.com",
    "azure.com",
  ];

  for (const host of productionHosts) {
    if (dbUrl.includes(host)) {
      throw new Error(
        `SAFETY: DATABASE_URL contains "${host}". Refusing to run tests against a production database. ` +
          `Set TEST_DATABASE_URL to a local or container database.`,
      );
    }
  }
});

// ── 3. Mock Postmark email client ───────────────────────────────────────
vi.mock("postmark", () => ({
  ServerClient: vi.fn().mockImplementation(() => ({
    sendEmail: vi.fn().mockResolvedValue({
      To: "test@example.com",
      SubmittedAt: new Date().toISOString(),
      MessageID: "test-message-id",
      ErrorCode: 0,
      Message: "OK",
    }),
    sendEmailWithTemplate: vi.fn().mockResolvedValue({
      To: "test@example.com",
      SubmittedAt: new Date().toISOString(),
      MessageID: "test-message-id",
      ErrorCode: 0,
      Message: "OK",
    }),
  })),
}));

// ── 4. Mock Sentry ──────────────────────────────────────────────────────
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  startSpan: vi.fn(
    (
      _opts: Record<string, unknown>,
      fn: (span: Record<string, unknown>) => unknown,
    ) => fn({ setAttribute: vi.fn() }),
  ),
  setUser: vi.fn(),
  withScope: vi.fn((fn: (scope: Record<string, unknown>) => unknown) =>
    fn({ setExtra: vi.fn(), setTag: vi.fn() }),
  ),
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    fmt: (strings: TemplateStringsArray, ...values: unknown[]) =>
      strings.reduce(
        (result, str, i) =>
          result + str + (i < values.length ? String(values[i]) : ""),
        "",
      ),
  },
}));

// ── 5. Mock NextAuth ────────────────────────────────────────────────────
// The auth() function is called in createTRPCContext. We bypass it because
// our test callers supply the session directly.
vi.mock("~/server/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));
