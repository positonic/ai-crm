/**
 * Test fixture factories for creating test data.
 *
 * Each factory creates a real database record and returns it.
 * Uses @faker-js/faker for realistic test data.
 */

import { faker } from "@faker-js/faker";
import type {
  PrismaClient,
  QuestionType,
  ApplicationStatus,
  ApplicationType,
} from "@prisma/client";
import { getTestDb } from "./trpc";

// ── Types ───────────────────────────────────────────────────────────────

interface CreateTestUserOpts {
  role?: string;
  email?: string;
  name?: string;
}

interface CreateTestEventOpts {
  name?: string;
  slug?: string;
  type?: string;
  startDate?: Date;
  endDate?: Date;
}

interface CreateTestVenueOpts {
  eventId: string;
  name?: string;
  ownerUserId?: string;
}

interface CreateTestQuestionOpts {
  eventId: string;
  questionKey?: string;
  questionEn?: string;
  questionType?: QuestionType;
  required?: boolean;
  order?: number;
}

interface CreateTestApplicationOpts {
  userId: string;
  eventId: string;
  email?: string;
  status?: ApplicationStatus;
  applicationType?: ApplicationType;
}

// ── Factories ───────────────────────────────────────────────────────────

/**
 * Create a test user in the database.
 */
export async function createTestUser(
  opts?: CreateTestUserOpts,
  db?: PrismaClient,
) {
  const prisma = db ?? getTestDb();
  return prisma.user.create({
    data: {
      name: opts?.name ?? faker.person.fullName(),
      email: opts?.email ?? faker.internet.email().toLowerCase(),
      role: opts?.role ?? "user",
    },
  });
}

/**
 * Create a test event in the database.
 */
export async function createTestEvent(
  opts?: CreateTestEventOpts,
  db?: PrismaClient,
) {
  const prisma = db ?? getTestDb();
  const name = opts?.name ?? `Test Event ${faker.string.alphanumeric(6)}`;
  const slug = opts?.slug ?? faker.helpers.slugify(name).toLowerCase();
  const startDate = opts?.startDate ?? faker.date.future();
  const endDate =
    opts?.endDate ?? new Date(startDate.getTime() + 3 * 24 * 60 * 60 * 1000);

  return prisma.event.create({
    data: {
      name,
      slug,
      type: opts?.type ?? "CONFERENCE",
      startDate,
      endDate,
      status: "ACTIVE",
      isOnline: false,
    },
  });
}

/**
 * Create a test venue (ScheduleVenue) in the database.
 * Optionally assign an owner.
 */
export async function createTestVenue(
  opts: CreateTestVenueOpts,
  db?: PrismaClient,
) {
  const prisma = db ?? getTestDb();
  const venue = await prisma.scheduleVenue.create({
    data: {
      eventId: opts.eventId,
      name: opts.name ?? `Venue ${faker.string.alphanumeric(4)}`,
      description: faker.lorem.sentence(),
    },
  });

  if (opts.ownerUserId) {
    await prisma.venueOwner.create({
      data: {
        userId: opts.ownerUserId,
        venueId: venue.id,
        eventId: opts.eventId,
      },
    });
  }

  return venue;
}

/**
 * Create an application question for an event.
 */
export async function createTestQuestion(
  opts: CreateTestQuestionOpts,
  db?: PrismaClient,
) {
  const prisma = db ?? getTestDb();
  return prisma.applicationQuestion.create({
    data: {
      eventId: opts.eventId,
      questionKey: opts.questionKey ?? faker.string.alphanumeric(8),
      questionEn: opts.questionEn ?? faker.lorem.sentence() + "?",
      questionEs: faker.lorem.sentence() + "?",
      questionType: opts.questionType ?? "TEXT",
      required: opts.required ?? true,
      order: opts.order ?? 0,
    },
  });
}

/**
 * Create a test application for a user + event.
 */
export async function createTestApplication(
  opts: CreateTestApplicationOpts,
  db?: PrismaClient,
) {
  const prisma = db ?? getTestDb();
  return prisma.application.create({
    data: {
      userId: opts.userId,
      eventId: opts.eventId,
      email: opts.email ?? faker.internet.email().toLowerCase(),
      status: opts.status ?? "DRAFT",
      applicationType: opts.applicationType ?? "SPEAKER",
      language: "en",
    },
  });
}

/**
 * Create a response for an application question.
 */
export async function createTestResponse(
  applicationId: string,
  questionId: string,
  answer: string,
  db?: PrismaClient,
) {
  const prisma = db ?? getTestDb();
  return prisma.applicationResponse.create({
    data: {
      applicationId,
      questionId,
      answer,
    },
  });
}

/**
 * Create a complete test setup: user, event, questions, and application.
 * Returns everything needed to test a full application flow.
 */
export async function createTestApplicationSetup(
  overrides?: {
    userOpts?: CreateTestUserOpts;
    eventOpts?: CreateTestEventOpts;
    questionCount?: number;
  },
  db?: PrismaClient,
) {
  const prisma = db ?? getTestDb();
  const user = await createTestUser(overrides?.userOpts, prisma);
  const event = await createTestEvent(overrides?.eventOpts, prisma);

  const questionCount = overrides?.questionCount ?? 3;
  const questions = await Promise.all(
    Array.from({ length: questionCount }, (_, i) =>
      createTestQuestion(
        {
          eventId: event.id,
          questionKey: `question_${i}`,
          questionEn: `Test Question ${i + 1}?`,
          required: true,
          order: i,
        },
        prisma,
      ),
    ),
  );

  const application = await createTestApplication(
    {
      userId: user.id,
      eventId: event.id,
      email: user.email ?? faker.internet.email().toLowerCase(),
    },
    prisma,
  );

  return { user, event, questions, application };
}

/**
 * Clean up all test data. Use in afterEach/afterAll.
 * Deletes in reverse-dependency order to avoid FK violations.
 */
export async function cleanupTestData(db?: PrismaClient) {
  const prisma = db ?? getTestDb();
  // Delete in reverse dependency order
  await prisma.$executeRawUnsafe(`
    DO $$ DECLARE
      r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'TRUNCATE TABLE "' || r.tablename || '" CASCADE';
      END LOOP;
    END $$;
  `);
}
