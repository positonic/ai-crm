/**
 * Contract tests for API response shapes.
 *
 * Prevents silent frontend breakage when API response shapes change.
 * Uses explicit shape assertions (not snapshots).
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { describe, it, expect, afterAll } from "vitest";
import { createTestCaller, disconnectTestDb, getTestDb } from "../helpers/trpc";
import {
  createTestUser,
  createTestEvent,
  createTestVenue,
  createTestQuestion,
  createTestApplication,
  createTestResponse,
  cleanupTestData,
} from "../helpers/fixtures";

afterAll(async () => {
  await cleanupTestData();
  await disconnectTestDb();
});

describe("API Response Shape Contracts", () => {
  // ── Test 1: getEvent response has required fields ─────────────────────
  describe("event.getEvent", () => {
    it("response has required fields", async () => {
      const db = getTestDb();
      await createTestEvent(
        {
          name: "Contract Test Event",
          slug: "contract-test-event",
          type: "CONFERENCE",
        },
        db,
      );

      const caller = createTestCaller(null);
      const result = await caller.event.getEvent({
        slug: "contract-test-event",
      });

      expect(result).toMatchObject({
        id: expect.any(String),
        name: "Contract Test Event",
        slug: "contract-test-event",
        startDate: expect.any(Date),
        endDate: expect.any(Date),
        type: "CONFERENCE",
        isOnline: expect.any(Boolean),
        status: expect.any(String),
      });

      // Verify feature flags are present
      expect(result).toHaveProperty("featureApplicantVetting");
      expect(result).toHaveProperty("featureSpeakerVetting");
      expect(result).toHaveProperty("featureScheduleManagement");
      expect(result).toHaveProperty("featureFloorManagement");

      // Sponsors relation should be included
      expect(result).toHaveProperty("sponsors");
      expect(Array.isArray(result?.sponsors)).toBe(true);
    });
  });

  // ── Test 2: getEventSchedule session objects have required fields ─────
  describe("schedule.getEventSchedule", () => {
    it("session objects have required fields", async () => {
      const db = getTestDb();
      const admin = await createTestUser({ role: "admin" }, db);
      const speaker = await createTestUser(
        { role: "user", name: "Contract Speaker" },
        db,
      );
      const event = await createTestEvent(
        { name: "Schedule Contract Event" },
        db,
      );
      const venue = await createTestVenue(
        { eventId: event.id, name: "Contract Hall" },
        db,
      );

      // Create a session with a linked speaker
      const adminCaller = createTestCaller("admin", { id: admin.id });
      const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      await adminCaller.schedule.createSession({
        eventId: event.id,
        title: "Contract Session",
        startTime,
        endTime,
        venueId: venue.id,
        linkedSpeakers: [{ userId: speaker.id, role: "Speaker" }],
        isPublished: true,
      });

      const publicCaller = createTestCaller(null);
      const result = await publicCaller.schedule.getEventSchedule({
        eventId: event.id,
      });

      // Top-level response shape
      expect(result).toHaveProperty("event");
      expect(result).toHaveProperty("sessions");
      expect(result.event).toMatchObject({
        id: expect.any(String),
        name: "Schedule Contract Event",
        slug: expect.any(String),
        startDate: expect.any(Date),
        endDate: expect.any(Date),
      });

      // Session object shape
      expect(result.sessions.length).toBeGreaterThanOrEqual(1);
      const session = result.sessions[0]!;
      expect(session).toMatchObject({
        id: expect.any(String),
        title: "Contract Session",
        startTime: expect.any(Date),
        endTime: expect.any(Date),
        isPublished: true,
      });

      // Venue relation
      expect(session.venue).toMatchObject({
        id: expect.any(String),
        name: "Contract Hall",
      });

      // SessionSpeakers relation
      expect(session.sessionSpeakers.length).toBeGreaterThanOrEqual(1);
      const sessionSpeaker = session.sessionSpeakers[0]!;
      expect(sessionSpeaker).toMatchObject({
        userId: speaker.id,
        role: "Speaker",
      });
      expect(sessionSpeaker.user).toMatchObject({
        id: speaker.id,
        name: "Contract Speaker",
      });
    });
  });

  // ── Test 3: getApplication response has required fields ───────────────
  describe("application.getApplication", () => {
    it("response has required fields", async () => {
      const db = getTestDb();
      const user = await createTestUser(
        { role: "user", email: "contract-app@test.com" },
        db,
      );
      const event = await createTestEvent({ name: "App Contract Event" }, db);
      const question = await createTestQuestion(
        {
          eventId: event.id,
          questionKey: "test_field",
          questionEn: "Test question?",
          required: true,
        },
        db,
      );
      const application = await createTestApplication(
        {
          userId: user.id,
          eventId: event.id,
          email: "contract-app@test.com",
        },
        db,
      );
      await createTestResponse(application.id, question.id, "My answer", db);

      const caller = createTestCaller("user", {
        id: user.id,
        email: "contract-app@test.com",
      });
      const result = await caller.application.getApplication({
        eventId: event.id,
      });

      // Top-level application fields
      expect(result).toMatchObject({
        id: expect.any(String),
        status: "DRAFT",
        email: "contract-app@test.com",
        applicationType: expect.any(String),
        language: "en",
        isComplete: expect.any(Boolean),
      });

      expect(result).toHaveProperty("userId");
      expect(result).toHaveProperty("eventId");
      expect(result).toHaveProperty("createdAt");
      expect(result).toHaveProperty("updatedAt");

      // Event relation
      expect(result?.event).toBeDefined();
      expect(result?.event).toMatchObject({
        id: expect.any(String),
        name: "App Contract Event",
      });

      // Responses relation with nested questions
      expect(result?.responses).toBeDefined();
      expect(Array.isArray(result?.responses)).toBe(true);
      expect(result!.responses.length).toBeGreaterThanOrEqual(1);

      const response = result!.responses[0]!;
      expect(response).toHaveProperty("id");
      expect(response).toHaveProperty("applicationId");
      expect(response).toHaveProperty("questionId");
      expect(response.question).toBeDefined();
      expect(response.question).toMatchObject({
        questionKey: "test_field",
        questionEn: "Test question?",
        required: true,
      });
    });
  });
});
