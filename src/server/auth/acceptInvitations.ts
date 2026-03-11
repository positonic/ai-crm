import { db } from "~/server/db";

interface AcceptedRole {
  eventName: string;
  roleName: string;
}

interface AcceptInvitationsResult {
  accepted: number;
  roles: AcceptedRole[];
}

/**
 * Accept all pending invitations for a given email address.
 * Creates the appropriate role assignments (UserRole, VenueOwner, or global role).
 *
 * Used by:
 * - NextAuth signIn callback (universal, runs for all auth methods)
 * - invitation.accept tRPC procedure (legacy client-side calls)
 */
export async function acceptPendingInvitations(
  email: string,
  userId: string,
): Promise<AcceptInvitationsResult> {
  const invitations = await db.invitation.findMany({
    where: {
      email: { equals: email.toLowerCase(), mode: "insensitive" },
      status: "PENDING",
      expiresAt: { gt: new Date() },
    },
    include: {
      event: true,
      role: true,
    },
  });

  if (invitations.length === 0) {
    return { accepted: 0, roles: [] };
  }

  const acceptedRoles: AcceptedRole[] = [];

  for (const invitation of invitations) {
    if (
      invitation.type === "EVENT_ROLE" &&
      invitation.eventId &&
      invitation.roleId
    ) {
      const existingRole = await db.userRole.findUnique({
        where: {
          userId_eventId_roleId: {
            userId,
            eventId: invitation.eventId,
            roleId: invitation.roleId,
          },
        },
      });

      if (!existingRole) {
        await db.userRole.create({
          data: {
            userId,
            eventId: invitation.eventId,
            roleId: invitation.roleId,
          },
        });

        acceptedRoles.push({
          eventName: invitation.event?.name ?? "Event",
          roleName: invitation.role?.name ?? "Role",
        });
      }
    } else if (
      (invitation.type === "GLOBAL_ADMIN" ||
        invitation.type === "GLOBAL_STAFF") &&
      invitation.globalRole
    ) {
      await db.user.update({
        where: { id: userId },
        data: { role: invitation.globalRole },
      });

      acceptedRoles.push({
        eventName: "Global Platform",
        roleName: invitation.globalRole,
      });
    } else if (
      invitation.type === "VENUE_OWNER" &&
      invitation.eventId &&
      invitation.venueId
    ) {
      const existingOwnership = await db.venueOwner.findUnique({
        where: {
          userId_venueId: { userId, venueId: invitation.venueId },
        },
      });

      if (!existingOwnership) {
        await db.venueOwner.create({
          data: {
            userId,
            venueId: invitation.venueId,
            eventId: invitation.eventId,
            assignedBy: invitation.invitedBy,
          },
        });
      }

      const venue = await db.scheduleVenue.findUnique({
        where: { id: invitation.venueId },
        select: { name: true },
      });

      acceptedRoles.push({
        eventName: invitation.event?.name ?? "Event",
        roleName: `Floor Lead - ${venue?.name ?? "Venue"}`,
      });
    }

    await db.invitation.update({
      where: { id: invitation.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
      },
    });
  }

  return {
    accepted: acceptedRoles.length,
    roles: acceptedRoles,
  };
}
