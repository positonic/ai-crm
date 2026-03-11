/**
 * Event router integration tests.
 *
 * Tests event resolution, availability, and access patterns.
 */

import { describe, it, expect, afterAll } from "vitest";
import { createTestCaller, disconnectTestDb, getTestDb } from "../helpers/trpc";
import { createTestEvent, cleanupTestData } from "../helpers/fixtures";

afterAll(async () => {
  await cleanupTestData();
  await disconnectTestDb();
});

describe("Event Router", () => {
  // ── Test 1: getEvent resolves by both ID and slug ─────────────────────
  describe("getEvent", () => {
    it("resolves event by ID", async () => {
      const event = await createTestEvent({
        name: "ID Lookup Event",
        slug: "id-lookup-event",
      });

      const caller = createTestCaller(null);
      const result = await caller.event.getEvent({ id: event.id });

      expect(result).toBeDefined();
      expect(result?.id).toBe(event.id);
      expect(result?.name).toBe("ID Lookup Event");
    });

    it("resolves event by slug", async () => {
      await createTestEvent({
        name: "Slug Lookup Event",
        slug: "slug-lookup-event",
      });

      const caller = createTestCaller(null);
      const result = await caller.event.getEvent({ slug: "slug-lookup-event" });

      expect(result).toBeDefined();
      expect(result?.slug).toBe("slug-lookup-event");
      expect(result?.name).toBe("Slug Lookup Event");
    });

    // ── Test 2: getEvent returns null for non-existent event ────────────
    it("returns null for non-existent event", async () => {
      const caller = createTestCaller(null);
      const result = await caller.event.getEvent({
        id: "non-existent-id-12345",
      });

      expect(result).toBeNull();
    });
  });

  // ── Test 3: getAvailableEvents returns only applicable events ─────────
  describe("getAvailableEvents", () => {
    it("returns active events", async () => {
      const db = getTestDb();
      const event = await createTestEvent(
        {
          name: "Available Event Test",
          slug: "available-event-test",
        },
        db,
      );

      const caller = createTestCaller(null);
      const events = await caller.event.getAvailableEvents();

      // Should include the active event we just created
      const found = events.find((e: { id: string }) => e.id === event.id);
      expect(found).toBeDefined();
      expect(found?.name).toBe("Available Event Test");
    });
  });
});
