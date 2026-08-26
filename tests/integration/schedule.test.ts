/**
 * Schedule router integration tests.
 *
 * Tests session management, venue permissions, and published-only filtering.
 */

import { describe, it, expect, afterAll } from "vitest";
import { TRPCError } from "@trpc/server";
import { createTestCaller, disconnectTestDb, getTestDb } from "../helpers/trpc";
import {
  createTestUser,
  createTestEvent,
  createTestVenue,
  cleanupTestData,
} from "../helpers/fixtures";

afterAll(async () => {
  await cleanupTestData();
  await disconnectTestDb();
});

describe("Schedule Router", () => {
  // ── Test 1: Admin creates session with linked speakers ────────────────
  describe("createSession", () => {
    it("admin creates a session with linked speakers", async () => {
      const db = getTestDb();
      const admin = await createTestUser({ role: "admin" }, db);
      const speaker = await createTestUser(
        { role: "user", name: "Test Speaker" },
        db,
      );
      const event = await createTestEvent({ name: "Schedule Test Event" }, db);
      const venue = await createTestVenue(
        { eventId: event.id, name: "Main Hall" },
        db,
      );

      const caller = createTestCaller("admin", { id: admin.id });

      const startTime = new Date(event.startDate.getTime() + 2 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      const result = await caller.schedule.createSession({
        eventId: event.id,
        title: "Keynote Talk",
        description: "Opening keynote",
        startTime,
        endTime,
        venueId: venue.id,
        linkedSpeakers: [{ userId: speaker.id, role: "Speaker" }],
        isPublished: true,
      });

      expect(result.id).toBeDefined();
      expect(result.title).toBe("Keynote Talk");

      // Verify speaker was linked
      const sessionSpeakers = await db.sessionSpeaker.findMany({
        where: { sessionId: result.id },
      });
      expect(sessionSpeakers).toHaveLength(1);
      expect(sessionSpeakers[0]?.userId).toBe(speaker.id);
      expect(sessionSpeakers[0]?.role).toBe("Speaker");
    });

    // ── Test 2: Floor lead creates session in their venue ───────────────
    it("floor lead creates a session in their own venue", async () => {
      const db = getTestDb();
      const floorLead = await createTestUser(
        { role: "user", name: "Floor Lead" },
        db,
      );
      const event = await createTestEvent({ name: "Floor Lead Event" }, db);
      const venue = await createTestVenue(
        {
          eventId: event.id,
          name: "Floor 1",
          ownerUserId: floorLead.id,
        },
        db,
      );

      const caller = createTestCaller("user", { id: floorLead.id });

      const startTime = new Date(event.startDate.getTime() + 2 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      const result = await caller.schedule.createSession({
        eventId: event.id,
        title: "Floor Workshop",
        startTime,
        endTime,
        venueId: venue.id,
        isPublished: true,
      });

      expect(result.id).toBeDefined();
      expect(result.title).toBe("Floor Workshop");
    });

    // ── Test 3: Floor lead blocked from other venues ────────────────────
    it("floor lead cannot create session in another venue", async () => {
      const db = getTestDb();
      const floorLead = await createTestUser(
        { role: "user", name: "Blocked Lead" },
        db,
      );
      const otherUser = await createTestUser(
        { role: "user", name: "Other Owner" },
        db,
      );
      const event = await createTestEvent({ name: "Blocked Venue Event" }, db);

      // Floor lead owns venue A
      await createTestVenue(
        {
          eventId: event.id,
          name: "Venue A",
          ownerUserId: floorLead.id,
        },
        db,
      );

      // Other user owns venue B
      const venueB = await createTestVenue(
        {
          eventId: event.id,
          name: "Venue B",
          ownerUserId: otherUser.id,
        },
        db,
      );

      const caller = createTestCaller("user", { id: floorLead.id });

      const startTime = new Date(event.startDate.getTime() + 2 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      try {
        await caller.schedule.createSession({
          eventId: event.id,
          title: "Unauthorized Session",
          startTime,
          endTime,
          venueId: venueB.id,
          isPublished: true,
        });
        expect.unreachable("Should have thrown FORBIDDEN");
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        expect((error as TRPCError).code).toBe("FORBIDDEN");
      }
    });
  });

  // ── Test 4: getEventSchedule returns only published sessions ──────────
  describe("getEventSchedule", () => {
    it("returns only published sessions, not drafts", async () => {
      const db = getTestDb();
      const admin = await createTestUser({ role: "admin" }, db);
      const event = await createTestEvent(
        { name: "Published Filter Event" },
        db,
      );
      const venue = await createTestVenue(
        { eventId: event.id, name: "Filter Hall" },
        db,
      );

      const startTime = new Date(event.startDate.getTime() + 2 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      const adminCaller = createTestCaller("admin", { id: admin.id });

      // Create a published session
      await adminCaller.schedule.createSession({
        eventId: event.id,
        title: "Published Talk",
        startTime,
        endTime,
        venueId: venue.id,
        isPublished: true,
      });

      // Create an unpublished/draft session
      await adminCaller.schedule.createSession({
        eventId: event.id,
        title: "Draft Talk",
        startTime: new Date(startTime.getTime() + 2 * 60 * 60 * 1000),
        endTime: new Date(startTime.getTime() + 3 * 60 * 60 * 1000),
        venueId: venue.id,
        isPublished: false,
      });

      // Query as public (anyone can view published schedule)
      const publicCaller = createTestCaller(null);

      const result = await publicCaller.schedule.getEventSchedule({
        eventId: event.id,
      });

      // Only published sessions should be returned
      const sessionTitles = result.sessions.map(
        (s: { title: string }) => s.title,
      );
      expect(sessionTitles).toContain("Published Talk");
      expect(sessionTitles).not.toContain("Draft Talk");
    });
  });

  // ── Test 5: Floor leads may add any participant, applicant or not ─────
  // Floor-applicant validation was intentionally removed in f71fd69
  // ("feat: remove speaker validation for session participants").
  describe("floor applicant validation", () => {
    it("floor lead can add speakers who haven't applied for their floor", async () => {
      const db = getTestDb();
      const floorLead = await createTestUser(
        { role: "user", name: "Strict Lead" },
        db,
      );
      const nonApplicant = await createTestUser(
        { role: "user", name: "Non Applicant" },
        db,
      );
      const event = await createTestEvent(
        { name: "Applicant Check Event" },
        db,
      );
      const venue = await createTestVenue(
        {
          eventId: event.id,
          name: "Strict Floor",
          ownerUserId: floorLead.id,
        },
        db,
      );

      // nonApplicant has NOT applied for this venue/floor
      // (no ApplicationVenue record exists)

      const caller = createTestCaller("user", { id: floorLead.id });

      const startTime = new Date(event.startDate.getTime() + 2 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      const result = await caller.schedule.createSession({
        eventId: event.id,
        title: "Open Speaker Session",
        startTime,
        endTime,
        venueId: venue.id,
        linkedSpeakers: [{ userId: nonApplicant.id, role: "Speaker" }],
        isPublished: true,
      });

      expect(result.id).toBeDefined();

      const sessionSpeakers = await db.sessionSpeaker.findMany({
        where: { sessionId: result.id },
      });
      expect(sessionSpeakers).toHaveLength(1);
      expect(sessionSpeakers[0]?.userId).toBe(nonApplicant.id);
    });
  });
});
