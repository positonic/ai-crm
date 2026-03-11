/**
 * Application router integration tests.
 *
 * Tests the complete speaker application lifecycle:
 * create → fill → submit → admin review
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { TRPCError } from "@trpc/server";
import { createTestCaller, disconnectTestDb, getTestDb } from "../helpers/trpc";
import {
  createTestUser,
  createTestEvent,
  createTestQuestion,
  createTestApplication,
  createTestResponse,
  cleanupTestData,
} from "../helpers/fixtures";

afterAll(async () => {
  await cleanupTestData();
  await disconnectTestDb();
});

describe("Application Router", () => {
  // ── Test 1: createApplication creates draft for authenticated user ────
  describe("createApplication", () => {
    it("creates a DRAFT application for an authenticated user", async () => {
      const db = getTestDb();
      const user = await createTestUser(
        { role: "user", email: "applicant@test.com" },
        db,
      );
      const event = await createTestEvent({ name: "App Test Event" }, db);

      const caller = createTestCaller("user", {
        id: user.id,
        email: "applicant@test.com",
      });

      const result = await caller.application.createApplication({
        eventId: event.id,
        applicationType: "SPEAKER",
      });

      expect(result.status).toBe("DRAFT");
      expect(result.userId).toBe(user.id);
      expect(result.eventId).toBe(event.id);
      expect(result.applicationType).toBe("SPEAKER");
      // The procedure includes event relation at runtime
      expect((result as Record<string, unknown>).event).toBeDefined();
      expect(
        ((result as Record<string, unknown>).event as { name: string }).name,
      ).toBe("App Test Event");
    });

    // ── Test 2: createApplication rejects unauthenticated users ────────
    it("rejects unauthenticated users with UNAUTHORIZED", async () => {
      const event = await createTestEvent({ name: "Unauth Test Event" });

      const caller = createTestCaller(null);

      await expect(
        caller.application.createApplication({
          eventId: event.id,
          applicationType: "RESIDENT",
        }),
      ).rejects.toThrow(TRPCError);

      try {
        await caller.application.createApplication({
          eventId: event.id,
          applicationType: "RESIDENT",
        });
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        expect((error as TRPCError).code).toBe("UNAUTHORIZED");
      }
    });
  });

  // ── Test 3: updateResponse saves and retrieves form answer ────────────
  describe("updateResponse", () => {
    it("saves a response and includes the question object", async () => {
      const db = getTestDb();
      const user = await createTestUser({ role: "user" }, db);
      const event = await createTestEvent({}, db);
      const question = await createTestQuestion(
        {
          eventId: event.id,
          questionKey: "bio",
          questionEn: "Tell us about yourself?",
          required: true,
        },
        db,
      );
      const application = await createTestApplication(
        {
          userId: user.id,
          eventId: event.id,
          email: user.email ?? "test@test.com",
        },
        db,
      );

      const caller = createTestCaller("user", { id: user.id });

      const result = await caller.application.updateResponse({
        applicationId: application.id,
        questionId: question.id,
        answer: "I am a software engineer.",
      });

      expect(result.answer).toBe("I am a software engineer.");
      expect(result.applicationId).toBe(application.id);
      expect(result.questionId).toBe(question.id);
      expect(result.question).toBeDefined();
      expect(result.question.questionKey).toBe("bio");
    });
  });

  // ── Test 4: submitApplication succeeds for complete application ───────
  describe("submitApplication", () => {
    it("succeeds when all required questions are answered", async () => {
      const db = getTestDb();
      const user = await createTestUser({ role: "user" }, db);
      const event = await createTestEvent({}, db);

      // Create required questions (avoid conditional field names)
      const q1 = await createTestQuestion(
        {
          eventId: event.id,
          questionKey: "full_name",
          questionEn: "What is your full name?",
          required: true,
          order: 0,
        },
        db,
      );
      const q2 = await createTestQuestion(
        {
          eventId: event.id,
          questionKey: "motivation",
          questionEn: "Why do you want to attend?",
          required: true,
          order: 1,
        },
        db,
      );

      const application = await createTestApplication(
        {
          userId: user.id,
          eventId: event.id,
          email: user.email ?? "test@test.com",
          applicationType: "RESIDENT",
        },
        db,
      );

      // Fill all required questions
      await createTestResponse(application.id, q1.id, "John Doe", db);
      await createTestResponse(
        application.id,
        q2.id,
        "I want to learn and grow.",
        db,
      );

      const caller = createTestCaller("user", { id: user.id });

      const result = await caller.application.submitApplication({
        applicationId: application.id,
      });

      expect(result.status).toBe("SUBMITTED");
      expect(result.submittedAt).toBeDefined();
    });

    // ── Test 5: submitApplication rejects incomplete application ────────
    it("rejects submission when required questions are unanswered", async () => {
      const db = getTestDb();
      const user = await createTestUser({ role: "user" }, db);
      const event = await createTestEvent({}, db);

      // Create a required question but don't answer it
      await createTestQuestion(
        {
          eventId: event.id,
          questionKey: "about_you",
          questionEn: "Tell us about you?",
          required: true,
          order: 0,
        },
        db,
      );

      const application = await createTestApplication(
        {
          userId: user.id,
          eventId: event.id,
          email: user.email ?? "test@test.com",
          applicationType: "RESIDENT",
        },
        db,
      );

      const caller = createTestCaller("user", { id: user.id });

      try {
        await caller.application.submitApplication({
          applicationId: application.id,
        });
        // Should not reach here
        expect.unreachable("Should have thrown BAD_REQUEST");
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        expect((error as TRPCError).code).toBe("BAD_REQUEST");
        expect((error as TRPCError).message).toContain("required");
      }

      // Verify status is still DRAFT
      const app = await db.application.findUnique({
        where: { id: application.id },
      });
      expect(app?.status).toBe("DRAFT");
    });
  });

  // ── Test 6: updateApplicationStatus — admin changes status + email ────
  describe("updateApplicationStatus", () => {
    let adminUser: Awaited<ReturnType<typeof createTestUser>>;
    let applicantUser: Awaited<ReturnType<typeof createTestUser>>;
    let testEvent: Awaited<ReturnType<typeof createTestEvent>>;

    beforeAll(async () => {
      const db = getTestDb();
      adminUser = await createTestUser(
        { role: "admin", email: "admin@test.com" },
        db,
      );
      applicantUser = await createTestUser(
        { role: "user", email: "applicant-status@test.com" },
        db,
      );
      testEvent = await createTestEvent({ name: "Status Test Event" }, db);
    });

    it("admin changes status to ACCEPTED and email record is created", async () => {
      const db = getTestDb();
      const application = await createTestApplication(
        {
          userId: applicantUser.id,
          eventId: testEvent.id,
          email: applicantUser.email ?? "applicant-status@test.com",
          status: "SUBMITTED",
        },
        db,
      );

      const caller = createTestCaller("admin", { id: adminUser.id });

      const result = await caller.application.updateApplicationStatus({
        applicationId: application.id,
        status: "ACCEPTED",
      });

      expect(result.status).toBe("ACCEPTED");

      // Verify email record was created in the database
      const emails = await db.email.findMany({
        where: { applicationId: application.id },
      });

      // Email should have been attempted (mocked Postmark won't actually send)
      expect(emails.length).toBeGreaterThanOrEqual(1);
      const acceptedEmail = emails.find(
        (e) => e.type === "APPLICATION_ACCEPTED",
      );
      if (acceptedEmail) {
        expect(acceptedEmail.toEmail).toBe(applicantUser.email);
        expect(acceptedEmail.templateName).toBe("applicationAccepted");
      }
    });
  });
});
