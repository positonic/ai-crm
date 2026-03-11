/**
 * Test caller factory for tRPC integration tests.
 *
 * Usage:
 *   const caller = createTestCaller("admin");
 *   const event = await caller.event.getEvent({ id: "..." });
 */

import { PrismaClient } from "@prisma/client";
import { createCaller } from "~/server/api/root";

export type TestRole = "admin" | "staff" | "user";

interface TestUserOverrides {
  id?: string;
  name?: string;
  email?: string;
  role?: TestRole;
}

let _db: PrismaClient | undefined;

/**
 * Get a shared PrismaClient for tests.
 * Uses the TEST_DATABASE_URL set by globalSetup.
 */
export function getTestDb(): PrismaClient {
  if (!_db) {
    const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "No TEST_DATABASE_URL or DATABASE_URL set. Is globalSetup running?",
      );
    }
    _db = new PrismaClient({
      datasources: { db: { url } },
      log: ["error"],
    });
  }
  return _db;
}

/**
 * Create a tRPC caller with the given role.
 *
 * For "admin"  -> session.user.role = "admin"
 * For "staff"  -> session.user.role = "staff"
 * For "user"   -> session.user.role = "user"
 * For null     -> unauthenticated (no session)
 */
export function createTestCaller(
  role: TestRole | null,
  overrides?: TestUserOverrides,
) {
  const db = getTestDb();

  const session =
    role === null
      ? null
      : {
          user: {
            id: overrides?.id ?? `test-${role}-id`,
            name: overrides?.name ?? `Test ${role}`,
            email: overrides?.email ?? `test-${role}@example.com`,
            role: overrides?.role ?? role,
          },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        };

  return createCaller(async () => ({
    db,
    session,
    headers: new Headers(),
  }));
}

/**
 * Disconnect the shared test PrismaClient.
 * Call in afterAll() or globalTeardown.
 */
export async function disconnectTestDb() {
  if (_db) {
    await _db.$disconnect();
    _db = undefined;
  }
}
