import { z } from "zod";
import { TRPCError } from "@trpc/server";

import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "~/server/api/trpc";
import { sendInvitationEmail, type SendEmailResult } from "~/lib/email";
import { acceptPendingInvitations } from "~/server/auth/acceptInvitations";
import {
  assertAdminOrEventFloorOwner,
  isAdminOrStaff,
  getUserOwnedVenueIds,
} from "~/server/api/utils/scheduleAuth";

// Helper function to check if user has admin/staff role
function checkAdminAccess(userRole?: string | null) {
  if (!userRole || (userRole !== "admin" && userRole !== "staff")) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin or staff access required",
    });
  }
}

// Helper function to get full name from user session
function getInviterName(user: {
  firstName?: string | null;
  surname?: string | null;
  name?: string | null;
  email?: string | null;
}): string {
  if (user.firstName ?? user.surname) {
    return `${user.firstName ?? ""} ${user.surname ?? ""}`.trim();
  }
  return user.name ?? user.email ?? "Event Admin";
}

// Helper function to send invitation email based on invitation type
async function sendInvitationEmailForType(params: {
  invitation: {
    email: string;
    inviteeName?: string | null;
    type: string;
    token: string;
    expiresAt: Date;
    eventId: string | null;
    globalRole: string | null;
    event?: {
      name: string;
      description: string | null;
      slug: string | null;
    } | null;
    role?: { name: string } | null;
  };
  inviterName: string;
  venueName?: string | null;
}): Promise<SendEmailResult> {
  const { invitation, inviterName, venueName } = params;
  const inviteeName = invitation.inviteeName ?? undefined;

  if (invitation.type === "EVENT_ROLE") {
    return sendInvitationEmail({
      email: invitation.email,
      inviteeName,
      eventName: invitation.event?.name ?? "Event",
      eventDescription:
        invitation.event?.description ?? "Join us for this exciting event!",
      roleName: invitation.role?.name ?? "Participant",
      inviterName,
      invitationToken: invitation.token,
      expiresAt: invitation.expiresAt,
      eventId: invitation.eventId ?? undefined,
    });
  } else if (invitation.type === "VENUE_OWNER") {
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const eventSlug = invitation.event?.slug ?? invitation.eventId;
    const eventNameValue = invitation.event?.name ?? "Event";
    const venueNameValue = venueName ?? "Venue";
    const signinParams = new URLSearchParams({
      callbackUrl: `/events/${String(eventSlug)}/manage-schedule?welcome=true`,
      context: "floor-lead",
      eventName: eventNameValue,
      venueName: venueNameValue,
    });
    return sendInvitationEmail({
      email: invitation.email,
      inviteeName,
      eventName: eventNameValue,
      eventDescription: `You've been invited as a Floor Lead for "${venueNameValue}" at ${eventNameValue}. You'll be able to manage the schedule for this floor.`,
      roleName: `Floor Lead - ${venueNameValue}`,
      inviterName,
      invitationToken: invitation.token,
      expiresAt: invitation.expiresAt,
      eventId: invitation.eventId ?? undefined,
      signupUrl: `${baseUrl}/signin?${signinParams.toString()}`,
    });
  } else {
    return sendInvitationEmail({
      email: invitation.email,
      inviteeName,
      eventName: "Platform Administration",
      eventDescription: `You've been invited to join as a ${invitation.globalRole} administrator for the entire platform.`,
      roleName: invitation.globalRole ?? "Administrator",
      inviterName,
      invitationToken: invitation.token,
      expiresAt: invitation.expiresAt,
      isGlobalRole: true,
      globalRole: invitation.globalRole ?? undefined,
    });
  }
}

// Schema definitions
const CreateInvitationSchema = z
  .object({
    email: z
      .string()
      .email()
      .transform((v) => v.toLowerCase().trim()),
    inviteeName: z.string().optional(),
    type: z
      .enum(["EVENT_ROLE", "GLOBAL_ADMIN", "GLOBAL_STAFF", "VENUE_OWNER"])
      .default("EVENT_ROLE"),
    eventId: z.string().optional(),
    roleId: z.string().optional(),
    globalRole: z.enum(["admin", "staff"]).optional(),
    venueId: z.string().optional(),
    expiresAt: z.coerce.date().optional(),
  })
  .refine(
    (data) => {
      // For EVENT_ROLE type, eventId and roleId are required
      if (data.type === "EVENT_ROLE") {
        return data.eventId && data.roleId;
      }
      // For GLOBAL_ADMIN/GLOBAL_STAFF, globalRole is required
      if (data.type === "GLOBAL_ADMIN" || data.type === "GLOBAL_STAFF") {
        return data.globalRole;
      }
      // For VENUE_OWNER, eventId and venueId are required
      if (data.type === "VENUE_OWNER") {
        return data.eventId && data.venueId;
      }
      return true;
    },
    {
      message: "Missing required fields for invitation type",
    },
  );

const BulkCreateInvitationSchema = z
  .object({
    emails: z
      .array(z.string().email())
      .transform((arr) => arr.map((e) => e.toLowerCase().trim())),
    type: z
      .enum(["EVENT_ROLE", "GLOBAL_ADMIN", "GLOBAL_STAFF", "VENUE_OWNER"])
      .default("EVENT_ROLE"),
    eventId: z.string().optional(),
    roleId: z.string().optional(),
    globalRole: z.enum(["admin", "staff"]).optional(),
    venueId: z.string().optional(),
    expiresAt: z.coerce.date().optional(),
  })
  .refine(
    (data) => {
      // Same validation as CreateInvitationSchema
      if (data.type === "EVENT_ROLE") {
        return data.eventId && data.roleId;
      }
      if (data.type === "GLOBAL_ADMIN" || data.type === "GLOBAL_STAFF") {
        return data.globalRole;
      }
      if (data.type === "VENUE_OWNER") {
        return data.eventId && data.venueId;
      }
      return true;
    },
    {
      message: "Missing required fields for invitation type",
    },
  );

const AcceptInvitationSchema = z.object({
  token: z.string(),
});

export const invitationRouter = createTRPCRouter({
  // Create a single invitation
  create: protectedProcedure
    .input(CreateInvitationSchema)
    .mutation(async ({ ctx, input }) => {
      let event = null;
      let role = null;
      let venue = null;

      // Resolve event and role first (handles both ID and slug)
      if (input.type === "EVENT_ROLE") {
        event = await ctx.db.event.findUnique({
          where: { id: input.eventId! },
        });

        // Fall back to slug lookup if not found by ID
        event ??= await ctx.db.event.findUnique({
          where: { slug: input.eventId! },
        });

        if (!event) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Event not found",
          });
        }

        // Allow admin/staff OR floor leads for the event
        await assertAdminOrEventFloorOwner(
          ctx.db,
          ctx.session.user.id,
          ctx.session.user.role,
          event.id,
        );

        role = await ctx.db.role.findUnique({
          where: { id: input.roleId! },
        });

        if (!role) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Role not found",
          });
        }
      }

      // Non-EVENT_ROLE types require admin access
      if (input.type !== "EVENT_ROLE") {
        checkAdminAccess(ctx.session.user.role);
      }

      // Resolve event and venue for VENUE_OWNER invitations
      if (input.type === "VENUE_OWNER") {
        event = await ctx.db.event.findUnique({
          where: { id: input.eventId! },
        });

        event ??= await ctx.db.event.findUnique({
          where: { slug: input.eventId! },
        });

        if (!event) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Event not found",
          });
        }

        venue = await ctx.db.scheduleVenue.findUnique({
          where: { id: input.venueId! },
        });

        if (!venue) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Venue not found",
          });
        }
      }

      const resolvedEventId = event?.id ?? input.eventId;

      // Check if invitation already exists (using resolved event ID)
      let existing;
      if (input.type === "EVENT_ROLE") {
        existing = await ctx.db.invitation.findFirst({
          where: {
            email: { equals: input.email, mode: "insensitive" },
            eventId: resolvedEventId,
            roleId: input.roleId,
            status: "PENDING",
          },
          include: {
            event: true,
            role: true,
          },
        });
      } else if (input.type === "VENUE_OWNER") {
        existing = await ctx.db.invitation.findFirst({
          where: {
            email: { equals: input.email, mode: "insensitive" },
            type: "VENUE_OWNER",
            eventId: resolvedEventId,
            venueId: input.venueId,
            status: "PENDING",
          },
          include: {
            event: true,
            role: true,
          },
        });
      } else {
        existing = await ctx.db.invitation.findFirst({
          where: {
            email: { equals: input.email, mode: "insensitive" },
            type: input.type,
            globalRole: input.globalRole,
            status: "PENDING",
          },
          include: {
            event: true,
            role: true,
          },
        });
      }

      if (existing) {
        // Send the email even for existing invitations - previous attempt may have failed
        let emailSent = false;
        try {
          const emailResult = await sendInvitationEmailForType({
            invitation: existing,
            inviterName: getInviterName(ctx.session.user),
            venueName: venue?.name,
          });
          emailSent = emailResult.success;
          if (!emailSent) {
            console.error(
              "Failed to send invitation email for existing invitation:",
              emailResult.error,
            );
          }
        } catch (error) {
          console.error(
            "Failed to send invitation email for existing invitation:",
            error,
          );
        }
        return { ...existing, _emailSent: emailSent };
      }

      // Set default expiration to 30 days from now
      const defaultExpiry = new Date();
      defaultExpiry.setDate(defaultExpiry.getDate() + 30);

      const invitation = await ctx.db.invitation.create({
        data: {
          email: input.email,
          inviteeName: input.inviteeName,
          type: input.type,
          eventId: resolvedEventId,
          roleId: input.roleId,
          globalRole: input.globalRole,
          venueId: input.venueId,
          expiresAt: input.expiresAt ?? defaultExpiry,
          invitedBy: ctx.session.user.id,
        },
        include: {
          event: true,
          role: true,
        },
      });

      // Send invitation email
      let emailSent = false;
      try {
        const emailResult = await sendInvitationEmailForType({
          invitation,
          inviterName: getInviterName(ctx.session.user),
          venueName: venue?.name,
        });
        emailSent = emailResult.success;
        if (!emailSent) {
          console.error("Failed to send invitation email:", emailResult.error);
        }
      } catch (error) {
        console.error("Failed to send invitation email:", error);
      }

      return { ...invitation, _emailSent: emailSent };
    }),

  // Bulk create invitations
  bulkCreate: protectedProcedure
    .input(BulkCreateInvitationSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify event and role exist
      let event = await ctx.db.event.findUnique({
        where: { id: input.eventId },
      });

      // Fall back to slug lookup if not found by ID
      event ??= await ctx.db.event.findUnique({
        where: { slug: input.eventId },
      });

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      // Allow admin/staff OR floor leads for the event
      await assertAdminOrEventFloorOwner(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        event.id,
      );

      const role = await ctx.db.role.findUnique({
        where: { id: input.roleId },
      });

      if (!role) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Role not found",
        });
      }

      const resolvedEventId = event?.id ?? input.eventId;

      // Check for existing invitations (case-insensitive)
      const existingInvitations = await ctx.db.invitation.findMany({
        where: {
          eventId: resolvedEventId,
          roleId: input.roleId,
          status: "PENDING",
        },
        select: { email: true },
      });

      const existingEmailsLower = new Set(
        existingInvitations.map((inv) => inv.email.toLowerCase()),
      );
      const newEmails = input.emails.filter(
        (email) => !existingEmailsLower.has(email),
      );

      if (newEmails.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "All provided emails already have pending invitations for this event and role",
        });
      }

      // Set default expiration to 30 days from now
      const defaultExpiry = new Date();
      defaultExpiry.setDate(defaultExpiry.getDate() + 30);

      // Create invitations for new emails
      const invitationsData = newEmails.map((email) => ({
        email,
        type: input.type,
        eventId: resolvedEventId ?? undefined,
        roleId: input.roleId ?? undefined,
        globalRole: input.globalRole ?? undefined,
        expiresAt: input.expiresAt ?? defaultExpiry,
        invitedBy: ctx.session.user.id,
      }));

      await ctx.db.invitation.createMany({
        data: invitationsData,
      });

      // Get created invitations with relations
      const createdInvitations = await ctx.db.invitation.findMany({
        where: {
          email: { in: newEmails },
          eventId: input.eventId,
          roleId: input.roleId,
          invitedBy: ctx.session.user.id,
        },
        include: {
          event: true,
          role: true,
        },
        orderBy: { createdAt: "desc" },
        take: newEmails.length,
      });

      // Send invitation emails
      const emailPromises = createdInvitations.map(async (invitation) => {
        try {
          const emailResult = await sendInvitationEmailForType({
            invitation,
            inviterName: getInviterName(ctx.session.user),
          });
          return { email: invitation.email, success: emailResult.success };
        } catch (error) {
          console.error(
            `Failed to send invitation email to ${invitation.email}:`,
            error,
          );
          return { email: invitation.email, success: false };
        }
      });

      // Wait for all emails to be sent (but don't fail if some emails fail)
      const emailResults = await Promise.allSettled(emailPromises);
      const emailSuccesses = emailResults.filter(
        (result) => result.status === "fulfilled" && result.value.success,
      ).length;

      return {
        created: createdInvitations,
        skipped: existingEmailsLower.size,
        total: input.emails.length,
        emailsSent: emailSuccesses,
      };
    }),

  // Get all invitations (admin or floor lead with eventId)
  getAll: protectedProcedure
    .input(
      z.object({
        eventId: z.string().optional(),
        status: z
          .enum(["PENDING", "ACCEPTED", "EXPIRED", "CANCELLED"])
          .optional(),
        email: z.string().optional(),
        type: z
          .enum(["EVENT_ROLE", "GLOBAL_ADMIN", "GLOBAL_STAFF", "VENUE_OWNER"])
          .optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Resolve eventId (could be slug or ID)
      let resolvedEventId = input.eventId;
      if (input.eventId) {
        const event = await ctx.db.event.findUnique({
          where: { id: input.eventId },
          select: { id: true },
        });
        if (!event) {
          const eventBySlug = await ctx.db.event.findUnique({
            where: { slug: input.eventId },
            select: { id: true },
          });
          if (eventBySlug) {
            resolvedEventId = eventBySlug.id;
          }
        }
      }

      // When eventId is provided, allow floor leads; otherwise require admin
      if (resolvedEventId) {
        await assertAdminOrEventFloorOwner(
          ctx.db,
          ctx.session.user.id,
          ctx.session.user.role,
          resolvedEventId,
        );
      } else {
        checkAdminAccess(ctx.session.user.role);
      }

      // For floor leads, scope invitations to those with matching venueId OR created by them
      let venueFilter: object | undefined;
      if (resolvedEventId && !isAdminOrStaff(ctx.session.user.role)) {
        const ownedVenueIds = await getUserOwnedVenueIds(
          ctx.db,
          ctx.session.user.id,
          resolvedEventId,
        );
        venueFilter = {
          OR: [
            { venueId: { in: ownedVenueIds } },
            { invitedBy: ctx.session.user.id },
          ],
        };
      }

      const invitations = await ctx.db.invitation.findMany({
        where: {
          ...(resolvedEventId && { eventId: resolvedEventId }),
          ...(input.status && { status: input.status }),
          ...(input.email && {
            email: { contains: input.email, mode: "insensitive" },
          }),
          ...(input.type && { type: input.type }),
          ...venueFilter,
        },
        include: {
          event: true,
          role: true,
          venue: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return invitations;
    }),

  // Get pending invitations for a specific email
  getPendingByEmail: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ ctx, input }) => {
      const invitations = await ctx.db.invitation.findMany({
        where: {
          email: { equals: input.email.toLowerCase(), mode: "insensitive" },
          status: "PENDING",
          expiresAt: {
            gt: new Date(),
          },
        },
        include: {
          event: true,
          role: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return invitations;
    }),

  // Accept invitation by token
  acceptByToken: publicProcedure
    .input(AcceptInvitationSchema)
    .mutation(async ({ ctx, input }) => {
      const invitation = await ctx.db.invitation.findUnique({
        where: { token: input.token },
        include: {
          event: true,
          role: true,
        },
      });

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found",
        });
      }

      if (invitation.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invitation has already been processed",
        });
      }

      if (invitation.expiresAt < new Date()) {
        // Update invitation status to expired
        await ctx.db.invitation.update({
          where: { id: invitation.id },
          data: { status: "EXPIRED" },
        });

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invitation has expired",
        });
      }

      return invitation;
    }),

  // Accept invitation (called during user registration / sign-in)
  // Note: Invitations are also accepted automatically in the NextAuth signIn callback
  accept: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        userId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const normalizedEmail = input.email.toLowerCase().trim();
      let userId = input.userId;

      if (!userId) {
        const user = await ctx.db.user.findFirst({
          where: { email: { equals: normalizedEmail, mode: "insensitive" } },
          select: { id: true },
        });

        if (!user) {
          return { accepted: 0, roles: [] };
        }

        userId = user.id;
      }

      return acceptPendingInvitations(normalizedEmail, userId);
    }),

  // Cancel invitation
  cancel: protectedProcedure
    .input(z.object({ invitationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invitation = await ctx.db.invitation.findUnique({
        where: { id: input.invitationId },
      });

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found",
        });
      }

      // Allow admin/staff OR floor leads for the invitation's event
      if (invitation.eventId) {
        await assertAdminOrEventFloorOwner(
          ctx.db,
          ctx.session.user.id,
          ctx.session.user.role,
          invitation.eventId,
        );
      } else {
        checkAdminAccess(ctx.session.user.role);
      }

      if (invitation.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only pending invitations can be cancelled",
        });
      }

      const updatedInvitation = await ctx.db.invitation.update({
        where: { id: input.invitationId },
        data: { status: "CANCELLED" },
        include: {
          event: true,
          role: true,
        },
      });

      return updatedInvitation;
    }),

  // Resend invitation (updates expiration and sends new email)
  resend: protectedProcedure
    .input(z.object({ invitationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invitation = await ctx.db.invitation.findUnique({
        where: { id: input.invitationId },
        include: {
          event: true,
          role: true,
          venue: true,
        },
      });

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found",
        });
      }

      // Allow admin/staff OR floor leads for the invitation's event
      if (invitation.eventId) {
        await assertAdminOrEventFloorOwner(
          ctx.db,
          ctx.session.user.id,
          ctx.session.user.role,
          invitation.eventId,
        );
      } else {
        checkAdminAccess(ctx.session.user.role);
      }

      if (invitation.status === "ACCEPTED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot resend an accepted invitation",
        });
      }

      // Extend expiration by 30 days
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 30);

      const updatedInvitation = await ctx.db.invitation.update({
        where: { id: input.invitationId },
        data: {
          status: "PENDING",
          expiresAt: newExpiry,
        },
        include: {
          event: true,
          role: true,
          venue: true,
        },
      });

      // Resend invitation email
      let emailSent = false;
      try {
        const emailResult = await sendInvitationEmailForType({
          invitation: updatedInvitation,
          inviterName: getInviterName(ctx.session.user),
          venueName: updatedInvitation.venue?.name,
        });
        emailSent = emailResult.success;
        if (!emailSent) {
          console.error(
            "Failed to resend invitation email:",
            emailResult.error,
          );
        }
      } catch (error) {
        console.error("Failed to resend invitation email:", error);
      }

      return { ...updatedInvitation, _emailSent: emailSent };
    }),

  // Get invitation statistics
  getStats: protectedProcedure
    .input(
      z.object({
        eventId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      const where = input.eventId ? { eventId: input.eventId } : {};

      const [pending, accepted, expired, cancelled, total] = await Promise.all([
        ctx.db.invitation.count({ where: { ...where, status: "PENDING" } }),
        ctx.db.invitation.count({ where: { ...where, status: "ACCEPTED" } }),
        ctx.db.invitation.count({ where: { ...where, status: "EXPIRED" } }),
        ctx.db.invitation.count({ where: { ...where, status: "CANCELLED" } }),
        ctx.db.invitation.count({ where }),
      ]);

      return {
        total,
        pending,
        accepted,
        expired,
        cancelled,
        acceptanceRate: total > 0 ? Math.round((accepted / total) * 100) : 0,
      };
    }),

  // Get available roles for invitations
  getAvailableRoles: publicProcedure.query(async ({ ctx }) => {
    const roles = await ctx.db.role.findMany({
      orderBy: { name: "asc" },
    });
    return roles;
  }),

  // Expire old invitations (utility function)
  expireOldInvitations: protectedProcedure.mutation(async ({ ctx }) => {
    checkAdminAccess(ctx.session.user.role);

    const expired = await ctx.db.invitation.updateMany({
      where: {
        status: "PENDING",
        expiresAt: {
          lt: new Date(),
        },
      },
      data: {
        status: "EXPIRED",
      },
    });

    return { expiredCount: expired.count };
  }),
});
