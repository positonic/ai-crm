import { z } from "zod";
import { TRPCError } from "@trpc/server";

import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "~/server/api/trpc";

export const roleRouter = createTRPCRouter({
  // Get all global roles
  getGlobalRoles: publicProcedure.query(async ({ ctx }) => {
    const roles = await ctx.db.globalRole.findMany({
      include: {
        userGlobalRoles: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });
    return roles;
  }),

  // Get a user's global roles
  getUserGlobalRoles: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userRoles = await ctx.db.userGlobalRole.findMany({
        where: { userId: input.userId },
        include: {
          globalRole: true,
        },
      });
      return userRoles.map((ur) => ur.globalRole);
    }),

  // Get current user's global roles
  getMyGlobalRoles: protectedProcedure.query(async ({ ctx }) => {
    const userRoles = await ctx.db.userGlobalRole.findMany({
      where: { userId: ctx.session.user.id },
      include: {
        globalRole: true,
      },
    });
    return userRoles.map((ur) => ur.globalRole);
  }),

  // Get current user's event roles
  getUserRoles: protectedProcedure.query(async ({ ctx }) => {
    const userRoles = await ctx.db.userRole.findMany({
      where: { userId: ctx.session.user.id },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            type: true,
            startDate: true,
            endDate: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ event: { startDate: "desc" } }, { role: { name: "asc" } }],
    });

    return userRoles;
  }),

  // Check if user has specific permission
  hasPermission: protectedProcedure
    .input(z.object({ permission: z.string() }))
    .query(async ({ ctx, input }) => {
      const userRoles = await ctx.db.userGlobalRole.findMany({
        where: { userId: ctx.session.user.id },
        include: {
          globalRole: true,
        },
      });

      // Check if any of the user's roles has the required permission
      return userRoles.some((ur) =>
        ur.globalRole.permissions.includes(input.permission),
      );
    }),

  // Create a new global role (admin only)
  createGlobalRole: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        permissions: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // TODO: Add admin check here once we implement it
      const role = await ctx.db.globalRole.create({
        data: {
          name: input.name,
          description: input.description,
          permissions: input.permissions,
        },
      });
      return role;
    }),

  // Assign role to user (admin only)
  assignGlobalRole: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        globalRoleId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // TODO: Add admin check here once we implement it

      // Check if assignment already exists
      const existing = await ctx.db.userGlobalRole.findUnique({
        where: {
          userId_globalRoleId: {
            userId: input.userId,
            globalRoleId: input.globalRoleId,
          },
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User already has this role",
        });
      }

      const userRole = await ctx.db.userGlobalRole.create({
        data: {
          userId: input.userId,
          globalRoleId: input.globalRoleId,
          assignedBy: ctx.session.user.id,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              surname: true,
              name: true,
              email: true,
            },
          },
          globalRole: true,
        },
      });
      return userRole;
    }),

  // Remove role from user (admin only)
  removeGlobalRole: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        globalRoleId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // TODO: Add admin check here once we implement it

      const deleted = await ctx.db.userGlobalRole.deleteMany({
        where: {
          userId: input.userId,
          globalRoleId: input.globalRoleId,
        },
      });

      if (deleted.count === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User role assignment not found",
        });
      }

      return { success: true };
    }),

  // Get all users with their global roles (admin only)
  getUsersWithRoles: protectedProcedure.query(async ({ ctx }) => {
    // TODO: Add admin check here once we implement it

    const users = await ctx.db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        userGlobalRoles: {
          include: {
            globalRole: true,
          },
        },
      },
    });

    return users.map((user) => ({
      ...user,
      globalRoles: user.userGlobalRoles.map((ur) => ur.globalRole),
    }));
  }),

  // Get all users with their event roles and applications
  getAllUsersWithEventRoles: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        eventId: z.string().optional(),
        roleId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // TODO: Add admin check here once we implement it

      const users = await ctx.db.user.findMany({
        where: {
          ...(input.search && {
            OR: [
              { name: { contains: input.search, mode: "insensitive" } },
              { email: { contains: input.search, mode: "insensitive" } },
            ],
          }),
        },
        select: {
          id: true,
          firstName: true,
          surname: true,
          name: true,
          email: true,
          role: true,
          image: true,
          emailVerified: true,
          userRoles: {
            where: {
              ...(input.eventId && { eventId: input.eventId }),
              ...(input.roleId && { roleId: input.roleId }),
            },
            include: {
              event: {
                select: {
                  id: true,
                  name: true,
                },
              },
              role: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          applications: {
            include: {
              event: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          _count: {
            select: {
              userRoles: true,
              applications: true,
            },
          },
        },
        orderBy: [
          { role: "desc" }, // Admins first, then staff, then users
          { name: "asc" },
        ],
      });

      return users;
    }),

  // Assign event role to existing user
  assignEventRole: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        eventId: z.string(),
        roleId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // TODO: Add admin check here once we implement it

      // Check if assignment already exists
      const existing = await ctx.db.userRole.findUnique({
        where: {
          userId_eventId_roleId: {
            userId: input.userId,
            eventId: input.eventId,
            roleId: input.roleId,
          },
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User already has this role for this event",
        });
      }

      // Verify user, event, and role exist
      const [user, event, role] = await Promise.all([
        ctx.db.user.findUnique({ where: { id: input.userId } }),
        ctx.db.event.findUnique({ where: { id: input.eventId } }),
        ctx.db.role.findUnique({ where: { id: input.roleId } }),
      ]);

      if (!user || !event || !role) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User, event, or role not found",
        });
      }

      const userRole = await ctx.db.userRole.create({
        data: {
          userId: input.userId,
          eventId: input.eventId,
          roleId: input.roleId,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              surname: true,
              name: true,
              email: true,
            },
          },
          event: {
            select: {
              id: true,
              name: true,
            },
          },
          role: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return userRole;
    }),

  // Remove event role from user
  removeEventRole: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        eventId: z.string(),
        roleId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // TODO: Add admin check here once we implement it

      const deleted = await ctx.db.userRole.deleteMany({
        where: {
          userId: input.userId,
          eventId: input.eventId,
          roleId: input.roleId,
        },
      });

      if (deleted.count === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User role assignment not found",
        });
      }

      return { success: true };
    }),

  // Update user's global role (admin -> staff -> user)
  updateUserGlobalRole: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        newRole: z.enum(["user", "staff", "admin"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // TODO: Add admin check here once we implement it

      const user = await ctx.db.user.update({
        where: { id: input.userId },
        data: { role: input.newRole },
        select: {
          id: true,
          firstName: true,
          surname: true,
          name: true,
          email: true,
          role: true,
        },
      });

      return user;
    }),

  // Get user details with all roles and applications
  getUserDetails: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      // TODO: Add admin check here once we implement it

      const user = await ctx.db.user.findUnique({
        where: { id: input.userId },
        include: {
          userRoles: {
            include: {
              event: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  startDate: true,
                  endDate: true,
                },
              },
              role: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          applications: {
            include: {
              event: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          },
          userGlobalRoles: {
            include: {
              globalRole: true,
            },
          },
          _count: {
            select: {
              userRoles: true,
              applications: true,
              posts: true,
            },
          },
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return user;
    }),

  // Get user statistics
  getUserStats: protectedProcedure.query(async ({ ctx }) => {
    // TODO: Add admin check here once we implement it

    const [totalUsers, adminCount, staffCount, usersWithRoles] =
      await Promise.all([
        ctx.db.user.count(),
        ctx.db.user.count({ where: { role: "admin" } }),
        ctx.db.user.count({ where: { role: "staff" } }),
        ctx.db.user.count({
          where: {
            userRoles: {
              some: {},
            },
          },
        }),
      ]);

    return {
      total: totalUsers,
      admins: adminCount,
      staff: staffCount,
      users: totalUsers - adminCount - staffCount,
      usersWithEventRoles: usersWithRoles,
    };
  }),

  // Get current user's roles for a specific event (aggregates UserRole, VenueOwner, Application)
  getMyRolesForEvent: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const globalRole = ctx.session.user.role;
      const roles: string[] = [];

      // Resolve eventId — could be a slug or an actual ID
      let resolvedEventId = input.eventId;
      const eventById = await ctx.db.event.findUnique({
        where: { id: input.eventId },
        select: { id: true },
      });
      if (!eventById) {
        const eventBySlug = await ctx.db.event.findUnique({
          where: { slug: input.eventId },
          select: { id: true },
        });
        if (eventBySlug) {
          resolvedEventId = eventBySlug.id;
        }
      }

      // 1. Global admin/staff role
      if (globalRole === "admin") roles.push("admin");
      else if (globalRole === "staff") roles.push("staff");

      // 2-5. Fetch all role sources in parallel (these are independent queries)
      const [userRoles, venueOwner, acceptedApps, sessionSpeaker] =
        await Promise.all([
          ctx.db.userRole.findMany({
            where: { userId, eventId: resolvedEventId },
            include: { role: { select: { name: true } } },
          }),
          ctx.db.venueOwner.findFirst({
            where: { userId, eventId: resolvedEventId },
          }),
          ctx.db.application.findMany({
            where: { userId, eventId: resolvedEventId, status: "ACCEPTED" },
            select: { applicationType: true },
          }),
          ctx.db.sessionSpeaker.findFirst({
            where: {
              userId,
              session: { eventId: resolvedEventId },
            },
          }),
        ]);

      // Event-specific roles from UserRole table
      for (const ur of userRoles) {
        if (!roles.includes(ur.role.name)) {
          roles.push(ur.role.name);
        }
      }

      // Floor lead from VenueOwner table
      if (venueOwner && !roles.includes("floor lead")) {
        roles.push("floor lead");
      }

      // Accepted applications — map by application type
      for (const app of acceptedApps) {
        if (app.applicationType === "SPEAKER" && !roles.includes("speaker")) {
          roles.push("speaker");
        } else if (
          app.applicationType === "MENTOR" &&
          !roles.includes("mentor")
        ) {
          roles.push("mentor");
        } else if (
          app.applicationType === "RESIDENT" &&
          !roles.includes("resident")
        ) {
          roles.push("resident");
        }
      }

      // Speaker from SessionSpeaker table
      if (sessionSpeaker && !roles.includes("speaker")) {
        roles.push("speaker");
      }

      return roles;
    }),

  // Get all event roles (for invitations and assignments)
  getEventRoles: publicProcedure.query(async ({ ctx }) => {
    const roles = await ctx.db.role.findMany({
      orderBy: { name: "asc" },
    });
    return roles;
  }),

  // Ensure mentor role exists
  ensureMentorRole: protectedProcedure.mutation(async ({ ctx }) => {
    // TODO: Add admin check here once we implement it

    const mentorRole = await ctx.db.role.findFirst({
      where: { name: "mentor" },
    });

    if (!mentorRole) {
      const newMentorRole = await ctx.db.role.create({
        data: {
          name: "mentor",
        },
      });
      return { created: true, role: newMentorRole };
    }

    return { created: false, role: mentorRole };
  }),

  // Ensure speaker role exists
  ensureSpeakerRole: protectedProcedure.mutation(async ({ ctx }) => {
    const speakerRole = await ctx.db.role.findFirst({
      where: { name: "speaker" },
    });

    if (!speakerRole) {
      const newSpeakerRole = await ctx.db.role.create({
        data: {
          name: "speaker",
        },
      });
      return { created: true, role: newSpeakerRole };
    }

    return { created: false, role: speakerRole };
  }),
});
