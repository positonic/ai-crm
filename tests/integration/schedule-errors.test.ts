/**
 * Schedule router error scenario tests.
 *
 * Tests edge cases that produce Sentry errors:
 * - PrismaClientKnownRequestError on getFloorSessions
 * - Null/missing venue handling
 * - Sessions without venues
 * - Deleted user references
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

describe("Schedule Router Error Scenarios", () => {
  // ── getFloorSessions edge cases ─────────────────────────────────────

  describe("getFloorSessions", () => {
    it("returns empty sessions for a venue with no sessions", async () => {
      const db = getTestDb();
      const admin = await createTestUser({ role: "admin" }, db);
      const event = await createTestEvent({ name: "Empty Floor Event" }, db);
      const venue = await createTestVenue(
        { eventId: event.id, name: "Empty Hall" },
        db,
      );

      const caller = createTestCaller("admin", { id: admin.id });
      const result = await caller.schedule.getFloorSessions({
        eventId: event.id,
        venueId: venue.id,
      });

      expect(result.sessions).toHaveLength(0);
      expect(result.event.id).toBe(event.id);
    });

    it("rejects non-owner access to floor sessions", async () => {
      const db = getTestDb();
      const owner = await createTestUser({ role: "user", name: "Owner" }, db);
      const outsider = await createTestUser(
        { role: "user", name: "Outsider" },
        db,
      );
      const event = await createTestEvent({ name: "Access Control Event" }, db);
      const venue = await createTestVenue(
        {
          eventId: event.id,
          name: "Private Floor",
          ownerUserId: owner.id,
        },
        db,
      );

      const caller = createTestCaller("user", { id: outsider.id });

      try {
        await caller.schedule.getFloorSessions({
          eventId: event.id,
          venueId: venue.id,
        });
        expect.unreachable("Should have thrown FORBIDDEN");
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        expect((error as TRPCError).code).toBe("FORBIDDEN");
      }
    });

    it("returns sessions with speaker data correctly", async () => {
      const db = getTestDb();
      const admin = await createTestUser({ role: "admin" }, db);
      const speaker = await createTestUser(
        { role: "user", name: "Speaker User" },
        db,
      );
      const event = await createTestEvent(
        { name: "Speaker Session Event" },
        db,
      );
      const venue = await createTestVenue(
        { eventId: event.id, name: "Speaker Hall" },
        db,
      );

      // Create a session with a linked speaker
      const adminCaller = createTestCaller("admin", { id: admin.id });
      const startTime = new Date(event.startDate.getTime() + 2 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      await adminCaller.schedule.createSession({
        eventId: event.id,
        title: "Speaker Test Session",
        startTime,
        endTime,
        venueId: venue.id,
        linkedSpeakers: [{ userId: speaker.id, role: "Speaker" }],
        isPublished: true,
      });

      const result = await adminCaller.schedule.getFloorSessions({
        eventId: event.id,
        venueId: venue.id,
      });

      expect(result.sessions).toHaveLength(1);
      expect(result.sessions[0]?.sessionSpeakers).toHaveLength(1);
      expect(result.sessions[0]?.sessionSpeakers[0]?.user.id).toBe(speaker.id);
    });
  });

  // ── getMyFloors edge cases ──────────────────────────────────────────

  describe("getMyFloors", () => {
    it("returns empty array for user with no floor ownership", async () => {
      const db = getTestDb();
      const user = await createTestUser(
        { role: "user", name: "No Floors" },
        db,
      );
      const event = await createTestEvent({ name: "No Floors Event" }, db);

      const caller = createTestCaller("user", { id: user.id });
      const result = await caller.schedule.getMyFloors({ eventId: event.id });

      expect(result.venues).toHaveLength(0);
    });

    it("admin can see all venues", async () => {
      const db = getTestDb();
      const admin = await createTestUser({ role: "admin" }, db);
      const event = await createTestEvent({ name: "Admin Floors Event" }, db);
      await createTestVenue({ eventId: event.id, name: "Hall A" }, db);
      await createTestVenue({ eventId: event.id, name: "Hall B" }, db);

      const caller = createTestCaller("admin", { id: admin.id });
      const result = await caller.schedule.getMyFloors({ eventId: event.id });

      expect(result.venues.length).toBeGreaterThanOrEqual(2);
    });

    it("floor lead sees only their own venues", async () => {
      const db = getTestDb();
      const leadA = await createTestUser({ role: "user", name: "Lead A" }, db);
      const leadB = await createTestUser({ role: "user", name: "Lead B" }, db);
      const event = await createTestEvent({ name: "Multi Floor Event" }, db);

      const venueA = await createTestVenue(
        {
          eventId: event.id,
          name: "Floor A",
          ownerUserId: leadA.id,
        },
        db,
      );
      await createTestVenue(
        {
          eventId: event.id,
          name: "Floor B",
          ownerUserId: leadB.id,
        },
        db,
      );

      const callerA = createTestCaller("user", { id: leadA.id });
      const result = await callerA.schedule.getMyFloors({ eventId: event.id });

      expect(result.venues).toHaveLength(1);
      expect(result.venues[0]?.id).toBe(venueA.id);
    });
  });

  // ── canManageSession edge cases ─────────────────────────────────────

  describe("canManageSession", () => {
    it("admin can manage any session", async () => {
      const db = getTestDb();
      const admin = await createTestUser({ role: "admin" }, db);
      const event = await createTestEvent({ name: "Admin Manage Event" }, db);
      const venue = await createTestVenue(
        { eventId: event.id, name: "Admin Hall" },
        db,
      );

      const caller = createTestCaller("admin", { id: admin.id });
      const startTime = new Date(event.startDate.getTime() + 2 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      const session = await caller.schedule.createSession({
        eventId: event.id,
        title: "Admin Test Session",
        startTime,
        endTime,
        venueId: venue.id,
        isPublished: true,
      });

      const result = await caller.schedule.canManageSession({
        sessionId: session.id,
      });

      expect(result.canManage).toBe(true);
    });

    it("non-owner cannot manage session", async () => {
      const db = getTestDb();
      const admin = await createTestUser({ role: "admin" }, db);
      const outsider = await createTestUser(
        { role: "user", name: "Outsider" },
        db,
      );
      const event = await createTestEvent({ name: "Non-Owner Event" }, db);
      const venue = await createTestVenue(
        { eventId: event.id, name: "Locked Hall" },
        db,
      );

      const adminCaller = createTestCaller("admin", { id: admin.id });
      const startTime = new Date(event.startDate.getTime() + 2 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      const session = await adminCaller.schedule.createSession({
        eventId: event.id,
        title: "Locked Session",
        startTime,
        endTime,
        venueId: venue.id,
        isPublished: true,
      });

      const outsiderCaller = createTestCaller("user", { id: outsider.id });
      const result = await outsiderCaller.schedule.canManageSession({
        sessionId: session.id,
      });

      expect(result.canManage).toBe(false);
    });

    it("returns false for non-existent session", async () => {
      const db = getTestDb();
      const user = await createTestUser({ role: "user" }, db);
      const caller = createTestCaller("user", { id: user.id });

      const result = await caller.schedule.canManageSession({
        sessionId: "non-existent-session-id",
      });

      expect(result.canManage).toBe(false);
    });
  });

  // ── getEventScheduleFilters edge cases ──────────────────────────────

  describe("getEventScheduleFilters", () => {
    it("returns empty filter data for event with no schedule config", async () => {
      const db = getTestDb();
      const event = await createTestEvent({ name: "No Filters Event" }, db);

      const caller = createTestCaller(null);
      const result = await caller.schedule.getEventScheduleFilters({
        eventId: event.id,
      });

      expect(result.venues).toHaveLength(0);
      expect(result.sessionTypes).toHaveLength(0);
      expect(result.tracks).toHaveLength(0);
    });

    it("returns venues with owner data", async () => {
      const db = getTestDb();
      const owner = await createTestUser(
        { role: "user", name: "Filter Owner" },
        db,
      );
      const event = await createTestEvent({ name: "Filter Test Event" }, db);
      await createTestVenue(
        {
          eventId: event.id,
          name: "Filtered Hall",
          ownerUserId: owner.id,
        },
        db,
      );

      const caller = createTestCaller(null);
      const result = await caller.schedule.getEventScheduleFilters({
        eventId: event.id,
      });

      expect(result.venues.length).toBeGreaterThanOrEqual(1);
      const filteredVenue = result.venues.find(
        (v) => v.name === "Filtered Hall",
      );
      expect(filteredVenue).toBeDefined();
      expect(filteredVenue?.owners).toHaveLength(1);
    });
  });
});
