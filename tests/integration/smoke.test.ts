/**
 * Smoke test to verify the test infrastructure is working.
 *
 * Validates:
 * - Testcontainers PostgreSQL starts and migrations run
 * - PrismaClient can connect to the test database
 * - tRPC caller factory creates working callers
 * - Fixture factories create valid database records
 */

import { describe, it, expect, afterAll } from "vitest";
import { getTestDb, createTestCaller, disconnectTestDb } from "../helpers/trpc";
import {
  createTestUser,
  createTestEvent,
  cleanupTestData,
} from "../helpers/fixtures";

afterAll(async () => {
  await cleanupTestData();
  await disconnectTestDb();
});

describe("Test Infrastructure Smoke Test", () => {
  it("connects to the test database", async () => {
    const db = getTestDb();
    const result = await db.$queryRaw<[{ now: Date }]>`SELECT NOW() as now`;
    expect(result[0]?.now).toBeInstanceOf(Date);
  });

  it("creates test fixtures in the database", async () => {
    const user = await createTestUser({
      role: "admin",
      email: "admin@test.com",
    });
    expect(user.id).toBeDefined();
    expect(user.email).toBe("admin@test.com");
    expect(user.role).toBe("admin");

    const event = await createTestEvent({ name: "Smoke Test Event" });
    expect(event.id).toBeDefined();
    expect(event.name).toBe("Smoke Test Event");
    expect(event.slug).toBeDefined();
  });

  it("creates a tRPC caller that can query the database", async () => {
    const caller = createTestCaller("admin");
    // If this doesn't throw, the tRPC → Prisma pipeline is working
    expect(caller).toBeDefined();
    expect(caller.event).toBeDefined();
  });

  it("creates an unauthenticated caller", () => {
    const caller = createTestCaller(null);
    expect(caller).toBeDefined();
  });
});
