import { type PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { isAdminOrStaff } from "./scheduleAuth";

/**
 * Check if user has an accepted application for the event.
 */
export async function isAcceptedAttendee(
  db: PrismaClient,
  userId: string,
  eventId: string,
): Promise<boolean> {
  const application = await db.application.findFirst({
    where: { userId, eventId, status: "ACCEPTED" },
    select: { id: true },
  });
  return !!application;
}

/**
 * Check if user is admin/staff or event creator.
 */
export async function isDeliberationAdmin(
  db: PrismaClient,
  userId: string,
  userRole: string | undefined | null,
  eventId: string,
): Promise<boolean> {
  if (isAdminOrStaff(userRole)) return true;

  const event = await db.event.findUnique({
    where: { id: eventId },
    select: { createdById: true },
  });
  return event?.createdById === userId;
}

/**
 * Assert user is an accepted attendee or admin.
 * Throws FORBIDDEN if not authorized.
 */
export async function assertDeliberationAccess(
  db: PrismaClient,
  userId: string,
  userRole: string | undefined | null,
  eventId: string,
): Promise<void> {
  if (isAdminOrStaff(userRole)) return;

  const accepted = await isAcceptedAttendee(db, userId, eventId);
  if (!accepted) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Accepted attendee access required",
    });
  }
}

/**
 * Assert user is admin/staff or event creator.
 * Throws FORBIDDEN if not authorized.
 */
export async function assertDeliberationAdmin(
  db: PrismaClient,
  userId: string,
  userRole: string | undefined | null,
  eventId: string,
): Promise<void> {
  const admin = await isDeliberationAdmin(db, userId, userRole, eventId);
  if (!admin) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }
}
