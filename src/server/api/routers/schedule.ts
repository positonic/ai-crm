import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { type PrismaClient } from "@prisma/client";

import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "~/server/api/trpc";
import {
  isAdminOrStaff,
  assertCanManageVenue,
  assertCanManageSession,
  isSessionSpeakerOnly,
  isEventFloorOwner,
  getUserOwnedVenueIds,
  assertAdminOrEventFloorOwner,
} from "~/server/api/utils/scheduleAuth";
import { getEmailService } from "~/server/email/emailService";
import { captureEmailError } from "~/utils/errorCapture";

const PARTICIPANT_ROLES = [
  "Speaker",
  "Facilitator",
  "Moderator",
  "Presenter",
  "Panelist",
  "Host",
] as const;

const eventSelect = {
  id: true,
  name: true,
  slug: true,
  startDate: true,
  endDate: true,
  location: true,
  type: true,
  lumaEventId: true,
} as const;

/**
 * Validate that a session's start time falls within the event's date range.
 * Compares UTC dates only (day-level) so sessions at any time during event days are valid.
 */
function validateSessionDateRange(
  eventStartDate: Date,
  eventEndDate: Date,
  sessionStartTime: Date,
) {
  const toUTCDay = (d: Date) =>
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

  const eventStart = toUTCDay(eventStartDate);
  const eventEnd = toUTCDay(eventEndDate);
  const sessionDay = toUTCDay(sessionStartTime);

  if (sessionDay < eventStart || sessionDay > eventEnd) {
    const fmt = (d: Date) =>
      d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      });
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Session date (${fmt(sessionStartTime)}) is outside the event date range (${fmt(eventStartDate)} – ${fmt(eventEndDate)})`,
    });
  }
}

// Helper to resolve eventId (could be slug or CUID)
async function resolveEventId(db: PrismaClient, eventIdOrSlug: string) {
  let event = await db.event.findUnique({
    where: { id: eventIdOrSlug },
    select: eventSelect,
  });

  event ??= await db.event.findUnique({
    where: { slug: eventIdOrSlug },
    select: eventSelect,
  });

  if (!event) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
  }

  return event;
}

const userSelectFields = {
  id: true,
  firstName: true,
  surname: true,
  name: true,
  email: true,
  image: true,
  profile: { select: { company: true } },
} as const;

/**
 * Validate that all linked speaker user IDs are floor applicants for the given venue.
 * Only enforced for non-admin users.
 */
async function validateSpeakersAreFloorApplicants(
  db: PrismaClient,
  userRole: string | undefined | null,
  venueId: string,
  speakerUserIds: string[],
): Promise<void> {
  if (isAdminOrStaff(userRole)) return;
  if (speakerUserIds.length === 0) return;

  const validApplicantCount = await db.applicationVenue.count({
    where: {
      venueId,
      application: {
        userId: { in: speakerUserIds },
      },
    },
  });

  if (validApplicantCount < speakerUserIds.length) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "One or more selected participants have not applied for this floor. Floor leads can only add applicants for their floor.",
    });
  }
}

export const scheduleRouter = createTRPCRouter({
  // ──────────────────────────────────────────
  // Public endpoints
  // ──────────────────────────────────────────

  // Public: Get all published sessions for an event
  getEventSchedule: publicProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      const event = await resolveEventId(ctx.db, input.eventId);

      const sessions = await ctx.db.scheduleSession.findMany({
        where: { eventId: event.id, isPublished: true },
        include: {
          venue: { select: { id: true, name: true } },
          room: { select: { id: true, name: true } },
          sessionType: { select: { id: true, name: true, color: true } },
          track: { select: { id: true, name: true, color: true } },
          sessionSpeakers: {
            include: {
              user: {
                select: {
                  ...userSelectFields,
                  profile: {
                    select: {
                      bio: true,
                      jobTitle: true,
                      company: true,
                      avatarUrl: true,
                    },
                  },
                },
              },
            },
            orderBy: { order: "asc" },
          },
        },
        orderBy: [{ startTime: "asc" }, { order: "asc" }],
      });

      return { event, sessions };
    }),

  // Public: Get a single session by ID
  getSession: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const session = await ctx.db.scheduleSession.findUnique({
        where: { id: input.sessionId },
        include: {
          event: { select: { id: true, name: true, slug: true } },
          venue: { select: { id: true, name: true } },
          room: { select: { id: true, name: true } },
          sessionType: { select: { id: true, name: true, color: true } },
          track: { select: { id: true, name: true, color: true } },
          sessionSpeakers: {
            include: {
              user: {
                select: {
                  ...userSelectFields,
                  profile: {
                    select: {
                      bio: true,
                      jobTitle: true,
                      company: true,
                      avatarUrl: true,
                    },
                  },
                },
              },
            },
            orderBy: { order: "asc" },
          },
        },
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found",
        });
      }

      return session;
    }),

  // Public: Get filter options (venues + session types + tracks) for an event
  getEventScheduleFilters: publicProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      const event = await resolveEventId(ctx.db, input.eventId);

      const [venuesUnsorted, sessionTypes, tracks] = await Promise.all([
        ctx.db.scheduleVenue.findMany({
          where: { eventId: event.id },
          orderBy: { order: "asc" },
          include: {
            rooms: {
              orderBy: { order: "asc" },
              select: { id: true, name: true },
            },
            owners: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    surname: true,
                    name: true,
                    image: true,
                  },
                },
              },
            },
          },
        }),
        ctx.db.scheduleSessionType.findMany({
          where: { eventId: event.id },
          orderBy: { order: "asc" },
        }),
        ctx.db.scheduleTrack.findMany({
          where: { eventId: event.id },
          orderBy: { order: "asc" },
        }),
      ]);

      // Sort venues by natural number in name (e.g. "Floor 2" before "Floor 10"), then by order field
      const venues = venuesUnsorted.sort((a, b) => {
        const numA = parseInt(/\d+/.exec(a.name)?.[0] ?? "0", 10);
        const numB = parseInt(/\d+/.exec(b.name)?.[0] ?? "0", 10);
        if (numA !== numB) return numA - numB;
        return a.order - b.order;
      });

      // Derive unique floor leads with their venue IDs
      const floorManagerMap = new Map<
        string,
        {
          id: string;
          firstName: string | null;
          surname: string | null;
          name: string | null;
          image: string | null;
          venueIds: string[];
          roleLabel: string | null;
        }
      >();

      for (const venue of venues) {
        for (const owner of venue.owners) {
          const existing = floorManagerMap.get(owner.user.id);
          if (existing) {
            existing.venueIds.push(venue.id);
          } else {
            floorManagerMap.set(owner.user.id, {
              ...owner.user,
              venueIds: [venue.id],
              roleLabel: null,
            });
          }
        }
      }

      // Also include event admins/organizers
      const adminUserRoles = await ctx.db.userRole.findMany({
        where: {
          eventId: event.id,
          role: { name: { in: ["ADMIN", "ORGANIZER"] } },
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              surname: true,
              name: true,
              image: true,
            },
          },
          role: { select: { name: true } },
        },
      });

      for (const ur of adminUserRoles) {
        if (!floorManagerMap.has(ur.user.id)) {
          floorManagerMap.set(ur.user.id, {
            ...ur.user,
            venueIds: [],
            roleLabel: ur.role.name === "ORGANIZER" ? "Organizer" : "Admin",
          });
        }
      }

      const floorManagers = Array.from(floorManagerMap.values());

      return { venues, sessionTypes, tracks, floorManagers };
    }),

  // ──────────────────────────────────────────
  // Session mutations (admin or floor lead)
  // ──────────────────────────────────────────

  // Create a session (admin or floor lead of the target venue)
  createSession: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        title: z.string().min(1),
        description: z.string().optional(),
        startTime: z.coerce.date(),
        endTime: z.coerce.date(),
        speakers: z.array(z.string()).default([]),
        linkedSpeakers: z
          .array(
            z.object({
              userId: z.string(),
              role: z.enum(PARTICIPANT_ROLES).default("Speaker"),
            }),
          )
          .optional(),
        venueId: z.string().optional(),
        roomId: z.string().optional(),
        sessionTypeId: z.string().optional(),
        trackId: z.string().optional(),
        order: z.number().default(0),
        isPublished: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Resolve slug to real event ID
      const event = await resolveEventId(ctx.db, input.eventId);

      // Validate session date falls within event date range
      validateSessionDateRange(event.startDate, event.endDate, input.startTime);

      if (input.venueId) {
        await assertCanManageVenue(
          ctx.db,
          ctx.session.user.id,
          ctx.session.user.role,
          input.venueId,
        );
      } else if (!isAdminOrStaff(ctx.session.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can create sessions without a venue",
        });
      }

      // Validate room belongs to the session's venue
      if (input.roomId) {
        if (!input.venueId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot assign a room without a venue",
          });
        }
        const room = await ctx.db.scheduleRoom.findUnique({
          where: { id: input.roomId },
          select: { venueId: true },
        });
        if (!room || room.venueId !== input.venueId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Room does not belong to the selected floor",
          });
        }
      }

      const { linkedSpeakers, ...sessionData } = input;

      // Validate linked speakers are floor applicants (for non-admin users)
      if (linkedSpeakers && linkedSpeakers.length > 0 && input.venueId) {
        await validateSpeakersAreFloorApplicants(
          ctx.db,
          ctx.session.user.role,
          input.venueId,
          linkedSpeakers.map((s) => s.userId),
        );
      }

      const session = await ctx.db.scheduleSession.create({
        data: { ...sessionData, eventId: event.id },
      });

      if (linkedSpeakers && linkedSpeakers.length > 0) {
        await ctx.db.sessionSpeaker.createMany({
          data: linkedSpeakers.map((speaker, index) => ({
            sessionId: session.id,
            userId: speaker.userId,
            role: speaker.role,
            order: index,
          })),
        });
      }

      return session;
    }),

  // Bulk create sessions from CSV import (admin or floor lead of the target venue)
  bulkCreateSessions: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        venueId: z.string(),
        sessions: z.array(
          z.object({
            title: z.string().min(1),
            description: z.string().optional(),
            startTime: z.coerce.date(),
            endTime: z.coerce.date(),
            speakers: z.array(z.string()).default([]),
            linkedSpeakers: z
              .array(
                z.object({
                  userId: z.string(),
                  role: z.enum(PARTICIPANT_ROLES).default("Speaker"),
                }),
              )
              .optional(),
            sessionTypeId: z.string().optional(),
            trackId: z.string().optional(),
            slidesUrl: z.string().optional(),
            order: z.number().default(0),
            isPublished: z.boolean().default(true),
          }),
        ),
        newSessionTypes: z
          .array(z.object({ name: z.string().min(1), color: z.string() }))
          .optional(),
        newTracks: z
          .array(z.object({ name: z.string().min(1), color: z.string() }))
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const event = await resolveEventId(ctx.db, input.eventId);
      await assertCanManageVenue(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        input.venueId,
      );

      // Validate all session dates fall within event date range
      for (const s of input.sessions) {
        validateSessionDateRange(event.startDate, event.endDate, s.startTime);
      }

      // Collect all unique linked speaker user IDs for validation
      const allSpeakerUserIds = [
        ...new Set(
          input.sessions.flatMap(
            (s) => s.linkedSpeakers?.map((ls) => ls.userId) ?? [],
          ),
        ),
      ];
      if (allSpeakerUserIds.length > 0) {
        await validateSpeakersAreFloorApplicants(
          ctx.db,
          ctx.session.user.role,
          input.venueId,
          allSpeakerUserIds,
        );
      }

      const result = await ctx.db.$transaction(async (tx) => {
        const newTypeIds: Record<string, string> = {};
        const newTrackIds: Record<string, string> = {};

        // Create new session types (skip if already exists)
        if (input.newSessionTypes && input.newSessionTypes.length > 0) {
          for (const st of input.newSessionTypes) {
            const existing = await tx.scheduleSessionType.findUnique({
              where: { eventId_name: { eventId: event.id, name: st.name } },
            });
            if (existing) {
              newTypeIds[st.name] = existing.id;
            } else {
              const created = await tx.scheduleSessionType.create({
                data: { eventId: event.id, name: st.name, color: st.color },
              });
              newTypeIds[st.name] = created.id;
            }
          }
        }

        // Create new tracks (skip if already exists)
        if (input.newTracks && input.newTracks.length > 0) {
          for (const tr of input.newTracks) {
            const existing = await tx.scheduleTrack.findUnique({
              where: { eventId_name: { eventId: event.id, name: tr.name } },
            });
            if (existing) {
              newTrackIds[tr.name] = existing.id;
            } else {
              const created = await tx.scheduleTrack.create({
                data: { eventId: event.id, name: tr.name, color: tr.color },
              });
              newTrackIds[tr.name] = created.id;
            }
          }
        }

        // Create sessions
        let createdCount = 0;
        for (const sessionInput of input.sessions) {
          const { linkedSpeakers, ...sessionData } = sessionInput;
          const session = await tx.scheduleSession.create({
            data: {
              ...sessionData,
              eventId: event.id,
              venueId: input.venueId,
            },
          });

          if (linkedSpeakers && linkedSpeakers.length > 0) {
            await tx.sessionSpeaker.createMany({
              data: linkedSpeakers.map((speaker, index) => ({
                sessionId: session.id,
                userId: speaker.userId,
                role: speaker.role,
                order: index,
              })),
            });
          }
          createdCount++;
        }

        return { created: createdCount, newTypeIds, newTrackIds };
      }, { timeout: 30000 });

      return result;
    }),

  // Fuzzy match speaker names to platform users for CSV import
  fuzzyMatchSpeakers: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        names: z.array(z.string()).min(1).max(200),
        emails: z.record(z.string(), z.string()).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const event = await resolveEventId(ctx.db, input.eventId);

      // Single query: fetch ALL users who have applied for this event
      const allApplicants = await ctx.db.user.findMany({
        where: {
          applications: {
            some: {
              eventId: event.id,
              userId: { not: null },
            },
          },
        },
        select: userSelectFields,
      });

      // Build lookup indices for in-memory matching
      const emailIndex = new Map<string, typeof allApplicants[number]>();
      for (const u of allApplicants) {
        if (u.email) emailIndex.set(u.email.toLowerCase(), u);
      }

      type MatchResult = {
        userId: string;
        firstName: string | null;
        surname: string | null;
        name: string | null;
        email: string | null;
        image: string | null;
        confidence: "exact" | "partial";
      };

      const results: Record<string, MatchResult[]> = {};

      for (const rawName of input.names) {
        // If we have an email for this name, try exact email lookup first
        const emailForName = input.emails?.[rawName];
        if (emailForName) {
          const userByEmail = emailIndex.get(emailForName.toLowerCase());
          if (userByEmail) {
            results[rawName] = [
              {
                userId: userByEmail.id,
                firstName: userByEmail.firstName,
                surname: userByEmail.surname,
                name: userByEmail.name,
                email: userByEmail.email,
                image: userByEmail.image,
                confidence: "exact",
              },
            ];
            continue;
          }
        }

        // Strip parenthetical org annotation: "Tom Kalil (Renaissance Philanthropy)" -> "Tom Kalil"
        const cleanName = rawName.replace(/\s*\([^)]*\)\s*/g, "").trim();
        if (!cleanName) {
          results[rawName] = [];
          continue;
        }

        const parts = cleanName.split(/\s+/);
        const firstName = (parts[0] ?? "").toLowerCase();
        const surname = parts.length > 1 ? parts.slice(1).join(" ").toLowerCase() : "";

        // In-memory fuzzy match against all applicants
        const matched = allApplicants.filter((u) => {
          const uFirst = (u.firstName ?? "").toLowerCase();
          const uSurname = (u.surname ?? "").toLowerCase();
          const uName = (u.name ?? "").toLowerCase();
          const cleanLower = cleanName.toLowerCase();

          if (firstName && uFirst.includes(firstName)) return true;
          if (surname && uSurname.includes(surname)) return true;
          if (uName.includes(cleanLower)) return true;
          return false;
        });

        results[rawName] = matched.slice(0, 3).map((u) => {
          const uFirst = (u.firstName ?? "").toLowerCase();
          const uSurname = (u.surname ?? "").toLowerCase();
          const isExact = uFirst === firstName && uSurname === surname;
          return {
            userId: u.id,
            firstName: u.firstName,
            surname: u.surname,
            name: u.name,
            email: u.email,
            image: u.image,
            confidence: isExact ? ("exact" as const) : ("partial" as const),
          };
        });
      }

      return results;
    }),

  // Resolve text speaker names to user profiles (public, for session pages)
  resolveTextSpeakers: publicProcedure
    .input(
      z.object({
        eventId: z.string(),
        names: z.array(z.string()).min(1).max(200),
      }),
    )
    .query(async ({ ctx, input }) => {
      const event = await resolveEventId(ctx.db, input.eventId);

      // Single query: fetch ALL users who have applied for this event (with profile)
      const allApplicants = await ctx.db.user.findMany({
        where: {
          applications: {
            some: {
              eventId: event.id,
              userId: { not: null },
            },
          },
        },
        select: {
          ...userSelectFields,
          profile: {
            select: {
              avatarUrl: true,
              bio: true,
              jobTitle: true,
              company: true,
            },
          },
        },
      });

      type ResolveResult = {
        userId: string;
        firstName: string | null;
        surname: string | null;
        name: string | null;
        image: string | null;
        profile: {
          avatarUrl: string | null;
          bio: string | null;
          jobTitle: string | null;
          company: string | null;
        } | null;
      } | null;

      const results: Record<string, ResolveResult> = {};

      for (const rawName of input.names) {
        const cleanName = rawName.replace(/\s*\([^)]*\)\s*/g, "").trim();
        if (!cleanName) {
          results[rawName] = null;
          continue;
        }

        const parts = cleanName.split(/\s+/);
        const firstName = (parts[0] ?? "").toLowerCase();
        const surname = parts.length > 1 ? parts.slice(1).join(" ").toLowerCase() : "";

        // In-memory exact match against all applicants
        const exactMatch = allApplicants.find((u) => {
          const uFirst = (u.firstName ?? "").toLowerCase();
          const uSurname = (u.surname ?? "").toLowerCase();
          return uFirst === firstName && uSurname === surname;
        });

        results[rawName] = exactMatch
          ? {
              userId: exactMatch.id,
              firstName: exactMatch.firstName,
              surname: exactMatch.surname,
              name: exactMatch.name,
              image: exactMatch.image,
              profile: exactMatch.profile,
            }
          : null;
      }

      return results;
    }),

  // Update a session (admin or floor lead of the session's venue)
  updateSession: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        startTime: z.coerce.date().optional(),
        endTime: z.coerce.date().optional(),
        speakers: z.array(z.string()).optional(),
        linkedSpeakers: z
          .array(
            z.object({
              userId: z.string(),
              role: z.enum(PARTICIPANT_ROLES).default("Speaker"),
            }),
          )
          .optional(),
        venueId: z.string().nullable().optional(),
        roomId: z.string().nullable().optional(),
        sessionTypeId: z.string().nullable().optional(),
        trackId: z.string().nullable().optional(),
        order: z.number().optional(),
        isPublished: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, linkedSpeakers, ...data } = input;

      // Check permission on the existing session
      await assertCanManageSession(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        id,
      );

      // Speakers can only edit title and description
      const speakerOnly = await isSessionSpeakerOnly(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        id,
      );
      if (speakerOnly) {
        const restrictedFields = [
          data.venueId,
          data.roomId,
          data.startTime,
          data.endTime,
          data.order,
          data.isPublished,
          data.sessionTypeId,
          data.trackId,
          data.speakers,
        ];
        if (
          restrictedFields.some((f) => f !== undefined) ||
          linkedSpeakers !== undefined
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Speakers can only edit the title and description of their sessions",
          });
        }
      }

      // Validate session date falls within event date range
      if (data.startTime) {
        const session = await ctx.db.scheduleSession.findUnique({
          where: { id },
          select: { event: { select: { startDate: true, endDate: true } } },
        });
        if (session?.event) {
          validateSessionDateRange(
            session.event.startDate,
            session.event.endDate,
            data.startTime,
          );
        }
      }

      // If changing venue, also check permission on the target venue
      if (data.venueId !== undefined && data.venueId !== null) {
        await assertCanManageVenue(
          ctx.db,
          ctx.session.user.id,
          ctx.session.user.role,
          data.venueId,
        );
        // Clear room when changing to a different venue (room belongs to old venue)
        const currentSession = await ctx.db.scheduleSession.findUnique({
          where: { id },
          select: { venueId: true },
        });
        if (currentSession?.venueId !== data.venueId) {
          data.roomId = null;
        }
      }

      // Validate room belongs to the effective venue
      if (data.roomId !== undefined && data.roomId !== null) {
        const effectiveVenue =
          data.venueId ??
          (
            await ctx.db.scheduleSession.findUnique({
              where: { id },
              select: { venueId: true },
            })
          )?.venueId;
        if (!effectiveVenue) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot assign a room without a venue",
          });
        }
        const room = await ctx.db.scheduleRoom.findUnique({
          where: { id: data.roomId },
          select: { venueId: true },
        });
        if (!room || room.venueId !== effectiveVenue) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Room does not belong to the selected floor",
          });
        }
      }

      // Validate linked speakers are floor applicants (for non-admin users)
      if (linkedSpeakers !== undefined && linkedSpeakers.length > 0) {
        let effectiveVenueId = data.venueId;
        if (effectiveVenueId === undefined) {
          const currentSession = await ctx.db.scheduleSession.findUnique({
            where: { id },
            select: { venueId: true },
          });
          effectiveVenueId = currentSession?.venueId ?? null;
        }
        if (effectiveVenueId) {
          await validateSpeakersAreFloorApplicants(
            ctx.db,
            ctx.session.user.role,
            effectiveVenueId,
            linkedSpeakers.map((s) => s.userId),
          );
        }
      }

      const session = await ctx.db.scheduleSession.update({
        where: { id },
        data,
      });

      // Sync linked speakers if explicitly provided
      if (linkedSpeakers !== undefined) {
        await ctx.db.sessionSpeaker.deleteMany({ where: { sessionId: id } });
        if (linkedSpeakers.length > 0) {
          await ctx.db.sessionSpeaker.createMany({
            data: linkedSpeakers.map((speaker, index) => ({
              sessionId: id,
              userId: speaker.userId,
              role: speaker.role,
              order: index,
            })),
          });
        }
      }

      return session;
    }),

  // Delete a session (admin or floor lead of the session's venue)
  deleteSession: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertCanManageSession(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        input.id,
      );
      // Speakers cannot delete sessions
      const speakerOnly = await isSessionSpeakerOnly(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        input.id,
      );
      if (speakerOnly) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Speakers cannot delete sessions. Contact a floor lead or admin.",
        });
      }
      return ctx.db.scheduleSession.delete({ where: { id: input.id } });
    }),

  // Bulk delete sessions (admin or staff only)
  bulkDeleteSessions: protectedProcedure
    .input(z.object({ ids: z.array(z.string()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (!isAdminOrStaff(ctx.session.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins and staff can bulk delete sessions.",
        });
      }
      // SessionSpeaker and SessionComment have onDelete: Cascade
      const result = await ctx.db.scheduleSession.deleteMany({
        where: { id: { in: input.ids } },
      });
      return { deletedCount: result.count };
    }),

  // Bulk assign room to sessions (admin or staff only)
  bulkAssignRoom: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.string()).min(1),
        roomId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!isAdminOrStaff(ctx.session.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins and staff can bulk assign rooms.",
        });
      }
      const result = await ctx.db.scheduleSession.updateMany({
        where: { id: { in: input.ids } },
        data: { roomId: input.roomId },
      });
      return { updatedCount: result.count };
    }),

  // ──────────────────────────────────────────
  // Session slides
  // ──────────────────────────────────────────

  removeSessionSlides: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.db.scheduleSession.findUnique({
        where: { id: input.sessionId },
        select: {
          slidesUrl: true,
          sessionSpeakers: {
            where: { userId: ctx.session.user.id },
            select: { id: true },
          },
        },
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found",
        });
      }

      const isAdmin =
        ctx.session.user.role === "admin" || ctx.session.user.role === "staff";
      const isSpeaker = session.sessionSpeakers.length > 0;

      if (!isAdmin && !isSpeaker) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only session speakers can remove slides",
        });
      }

      // Delete from Vercel Blob
      if (session.slidesUrl) {
        try {
          const { del } = await import("@vercel/blob");
          await del(session.slidesUrl, {
            token: process.env.PLATFORM_READ_WRITE_TOKEN,
          });
        } catch {
          console.error(
            "Failed to delete slides blob, continuing with DB cleanup",
          );
        }
      }

      return ctx.db.scheduleSession.update({
        where: { id: input.sessionId },
        data: {
          slidesUrl: null,
          slidesFileName: null,
          slidesUploadedAt: null,
          slidesUploadedById: null,
        },
      });
    }),

  setSlidesLink: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        slidesUrl: z.string().url(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.db.scheduleSession.findUnique({
        where: { id: input.sessionId },
        select: {
          slidesUrl: true,
          sessionSpeakers: {
            where: { userId: ctx.session.user.id },
            select: { id: true },
          },
        },
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found",
        });
      }

      const isAdmin =
        ctx.session.user.role === "admin" || ctx.session.user.role === "staff";
      const isSpeaker = session.sessionSpeakers.length > 0;

      if (!isAdmin && !isSpeaker) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only session speakers or admins can set slides link",
        });
      }

      // If replacing an uploaded file (Vercel Blob), delete the old blob
      if (session.slidesUrl?.includes(".vercel-storage.com")) {
        try {
          const { del } = await import("@vercel/blob");
          await del(session.slidesUrl, {
            token: process.env.PLATFORM_READ_WRITE_TOKEN,
          });
        } catch {
          console.error(
            "Failed to delete old slides blob, continuing with link update",
          );
        }
      }

      return ctx.db.scheduleSession.update({
        where: { id: input.sessionId },
        data: {
          slidesUrl: input.slidesUrl,
          slidesFileName: null,
          slidesUploadedAt: new Date(),
          slidesUploadedById: ctx.session.user.id,
        },
      });
    }),

  // ──────────────────────────────────────────
  // Venue mutations (admin only for create/delete, owner for update)
  // ──────────────────────────────────────────

  // Admin only: Create a venue
  createVenue: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        name: z.string().min(1),
        description: z.string().optional(),
        capacity: z.number().optional(),
        order: z.number().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!isAdminOrStaff(ctx.session.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required to create venues",
        });
      }
      // Resolve slug to real event ID
      const event = await resolveEventId(ctx.db, input.eventId);
      return ctx.db.scheduleVenue.create({
        data: { ...input, eventId: event.id },
      });
    }),

  // Admin or floor lead: Update venue metadata
  updateVenue: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        capacity: z.number().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await assertCanManageVenue(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        id,
      );
      return ctx.db.scheduleVenue.update({ where: { id }, data });
    }),

  // Admin only: Delete a venue
  deleteVenue: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!isAdminOrStaff(ctx.session.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required to delete venues",
        });
      }
      return ctx.db.scheduleVenue.delete({ where: { id: input.id } });
    }),

  // ──────────────────────────────────────────
  // Room mutations (floor lead or admin)
  // ──────────────────────────────────────────

  // Create a room within a venue (max 10 per venue)
  createRoom: protectedProcedure
    .input(
      z.object({
        venueId: z.string(),
        name: z.string().min(1),
        capacity: z.number().optional(),
        order: z.number().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertCanManageVenue(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        input.venueId,
      );

      const roomCount = await ctx.db.scheduleRoom.count({
        where: { venueId: input.venueId },
      });
      if (roomCount >= 10) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Maximum of 10 rooms per floor",
        });
      }

      return ctx.db.scheduleRoom.create({ data: input });
    }),

  // Update room metadata (floor lead or admin)
  updateRoom: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        capacity: z.number().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const room = await ctx.db.scheduleRoom.findUnique({
        where: { id: input.id },
        select: { venueId: true },
      });
      if (!room) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Room not found" });
      }
      await assertCanManageVenue(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        room.venueId,
      );
      const { id, ...data } = input;
      return ctx.db.scheduleRoom.update({ where: { id }, data });
    }),

  // Delete a room (floor lead or admin). Sessions revert to roomId=null.
  deleteRoom: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const room = await ctx.db.scheduleRoom.findUnique({
        where: { id: input.id },
        select: { venueId: true },
      });
      if (!room) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Room not found" });
      }
      await assertCanManageVenue(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        room.venueId,
      );
      return ctx.db.scheduleRoom.delete({ where: { id: input.id } });
    }),

  // ──────────────────────────────────────────
  // Session type mutations (admin only)
  // ──────────────────────────────────────────

  // Admin only: Create a session type
  createSessionType: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        name: z.string().min(1),
        color: z.string().default("#4299e1"),
        order: z.number().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!isAdminOrStaff(ctx.session.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required to create session types",
        });
      }
      // Resolve slug to real event ID
      const event = await resolveEventId(ctx.db, input.eventId);
      return ctx.db.scheduleSessionType.create({
        data: { ...input, eventId: event.id },
      });
    }),

  // Admin only: Delete a session type
  deleteSessionType: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!isAdminOrStaff(ctx.session.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required to delete session types",
        });
      }
      return ctx.db.scheduleSessionType.delete({ where: { id: input.id } });
    }),

  // ──────────────────────────────────────────
  // Track mutations (admin only)
  // ──────────────────────────────────────────

  // Admin only: Create a track
  createTrack: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        name: z.string().min(1),
        color: z.string().default("#8b5cf6"),
        order: z.number().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!isAdminOrStaff(ctx.session.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required to create tracks",
        });
      }
      // Resolve slug to real event ID
      const event = await resolveEventId(ctx.db, input.eventId);
      return ctx.db.scheduleTrack.create({
        data: { ...input, eventId: event.id },
      });
    }),

  // Admin only: Delete a track
  deleteTrack: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!isAdminOrStaff(ctx.session.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required to delete tracks",
        });
      }
      return ctx.db.scheduleTrack.delete({ where: { id: input.id } });
    }),

  // ──────────────────────────────────────────
  // Floor lead queries
  // ──────────────────────────────────────────

  // Check if current user is a floor lead for an event
  isFloorOwner: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      const event = await resolveEventId(ctx.db, input.eventId);
      return isEventFloorOwner(ctx.db, ctx.session.user.id, event.id);
    }),

  // Get venues the current user manages (all for admins)
  getMyFloors: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      const event = await resolveEventId(ctx.db, input.eventId);
      const admin = isAdminOrStaff(ctx.session.user.role);

      const whereClause = admin
        ? { eventId: event.id }
        : {
            id: {
              in: await getUserOwnedVenueIds(
                ctx.db,
                ctx.session.user.id,
                event.id,
              ),
            },
          };

      const venues = await ctx.db.scheduleVenue.findMany({
        where: whereClause,
        include: {
          rooms: {
            orderBy: { order: "asc" },
            select: { id: true, name: true, capacity: true, order: true },
          },
          owners: {
            include: { user: { select: userSelectFields } },
          },
          _count: { select: { sessions: true } },
        },
        orderBy: [{ order: "asc" }, { name: "asc" }],
      });

      // Natural sort: extract leading number from name so "Floor 9" < "Floor 10"
      venues.sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        const numA = parseInt(a.name.replace(/\D/g, ""), 10);
        const numB = parseInt(b.name.replace(/\D/g, ""), 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.name.localeCompare(b.name);
      });

      return { event, venues, isAdmin: admin };
    }),

  // Get sessions for a specific venue (authorized)
  getFloorSessions: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        venueId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const event = await resolveEventId(ctx.db, input.eventId);
      await assertCanManageVenue(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        input.venueId,
      );

      const sessions = await ctx.db.scheduleSession.findMany({
        where: { eventId: event.id, venueId: input.venueId },
        include: {
          venue: { select: { id: true, name: true } },
          room: { select: { id: true, name: true } },
          sessionType: { select: { id: true, name: true, color: true } },
          track: { select: { id: true, name: true, color: true } },
          sessionSpeakers: {
            include: { user: { select: userSelectFields } },
            orderBy: { order: "asc" },
          },
          _count: { select: { comments: true } },
        },
        orderBy: [{ startTime: "asc" }, { order: "asc" }],
      });

      return { event, sessions };
    }),

  // Get sessions across ALL venues the user can manage
  getAllFloorSessions: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      const event = await resolveEventId(ctx.db, input.eventId);
      const admin = isAdminOrStaff(ctx.session.user.role);

      const venueIds = admin
        ? (
            await ctx.db.scheduleVenue.findMany({
              where: { eventId: event.id },
              select: { id: true },
            })
          ).map((v) => v.id)
        : await getUserOwnedVenueIds(ctx.db, ctx.session.user.id, event.id);

      const sessions = await ctx.db.scheduleSession.findMany({
        where: { eventId: event.id, venueId: { in: venueIds } },
        include: {
          venue: { select: { id: true, name: true } },
          room: { select: { id: true, name: true } },
          sessionType: { select: { id: true, name: true, color: true } },
          track: { select: { id: true, name: true, color: true } },
          sessionSpeakers: {
            include: { user: { select: userSelectFields } },
            orderBy: { order: "asc" },
          },
          _count: { select: { comments: true } },
        },
        orderBy: [{ startTime: "asc" }, { order: "asc" }],
      });

      return { event, sessions };
    }),

  // Search users who have applied for a specific venue/floor
  searchFloorApplicants: protectedProcedure
    .input(
      z.object({
        venueId: z.string(),
        query: z.string().min(1),
        limit: z.number().min(1).max(20).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      await assertCanManageVenue(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        input.venueId,
      );

      const users = await ctx.db.user.findMany({
        where: {
          AND: [
            {
              applications: {
                some: {
                  venues: {
                    some: { venueId: input.venueId },
                  },
                  userId: { not: null },
                },
              },
            },
            {
              OR: [
                { firstName: { contains: input.query, mode: "insensitive" } },
                { surname: { contains: input.query, mode: "insensitive" } },
                { email: { contains: input.query, mode: "insensitive" } },
              ],
            },
          ],
        },
        select: userSelectFields,
        take: input.limit,
        orderBy: { firstName: "asc" },
      });

      return users;
    }),

  // Quick-create a speaker (find or create user + minimal application) for session linking
  quickCreateSpeaker: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        email: z.string().email(),
        firstName: z.string().min(1),
        lastName: z.string().optional(),
        venueId: z.string().optional(),
        sessionTitle: z.string().optional(),
        sessionDate: z.string().optional(),
        sessionTime: z.string().optional(),
        roomName: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const event = await resolveEventId(ctx.db, input.eventId);
      await assertAdminOrEventFloorOwner(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        event.id,
      );

      // Floor leads must provide a venueId and own it
      if (!isAdminOrStaff(ctx.session.user.role)) {
        if (!input.venueId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Floor leads must specify a venue when creating speakers",
          });
        }
        await assertCanManageVenue(
          ctx.db,
          ctx.session.user.id,
          ctx.session.user.role,
          input.venueId,
        );
      }

      // Find or create user by email
      let user = await ctx.db.user.findFirst({
        where: {
          email: { equals: input.email.toLowerCase(), mode: "insensitive" },
        },
        select: userSelectFields,
      });

      if (!user) {
        const fullName = input.lastName
          ? `${input.firstName} ${input.lastName}`
          : input.firstName;
        user = await ctx.db.user.create({
          data: {
            email: input.email.toLowerCase(),
            firstName: input.firstName,
            surname: input.lastName ?? null,
            name: fullName,
            role: "user",
          },
          select: userSelectFields,
        });
      }

      // Find or create a minimal Application for this user+event
      const existingApp = await ctx.db.application.findFirst({
        where: { userId: user.id, eventId: event.id },
      });

      const application =
        existingApp ??
        (await ctx.db.application.create({
          data: {
            eventId: event.id,
            userId: user.id,
            email: input.email.toLowerCase(),
            applicationType: "SPEAKER",
            status: "SUBMITTED",
            language: "en",
            isComplete: false,
            submittedAt: new Date(),
          },
        }));

      // Link to venue if provided
      if (input.venueId) {
        await ctx.db.applicationVenue.createMany({
          data: [{ applicationId: application.id, venueId: input.venueId }],
          skipDuplicates: true,
        });
      }

      // Send speaker invited email (fire-and-forget)
      if (user.email) {
        try {
          const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
          const speakerName = [input.firstName, input.lastName]
            .filter(Boolean)
            .join(" ");
          const invitedByName =
            ctx.session.user.name ?? ctx.session.user.email ?? "An administrator";

          let venueName: string | undefined;
          if (input.venueId) {
            const venue = await ctx.db.scheduleVenue.findUnique({
              where: { id: input.venueId },
              select: { name: true },
            });
            venueName = venue?.name ?? undefined;
          }

          const emailService = getEmailService(ctx.db);
          await emailService.sendEmail({
            to: user.email,
            templateName: "speakerInvited",
            templateData: {
              speakerName,
              eventName: event.name,
              talkTitle: input.sessionTitle ?? "your upcoming session",
              venueName,
              invitedByName,
              profileUrl: `${baseUrl}/events/${event.slug}`,
              contactEmail:
                process.env.ADMIN_EMAIL ?? "beth@fundingthecommons.io",
              signinUrl: `${baseUrl}/auth/signin`,
              scheduleUrl: `${baseUrl}/events/${event.slug}/schedule`,
              sessionDate: input.sessionDate,
              sessionTime: input.sessionTime,
              roomName: input.roomName,
            },
            eventId: event.id,
            userId: user.id,
          });
        } catch (error) {
          captureEmailError(error, {
            userId: user.id,
            emailType: "speaker_invited",
            recipient: user.email,
            templateName: "speakerInvited",
          });
        }
      }

      return user;
    }),

  // Check if the current user can manage a specific session (for showing admin controls)
  canManageSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const userRole = ctx.session.user.role;

      if (isAdminOrStaff(userRole))
        return { canManage: true, isSpeakerOnly: false };

      const session = await ctx.db.scheduleSession.findUnique({
        where: { id: input.sessionId },
        select: {
          venueId: true,
          event: { select: { type: true } },
          sessionSpeakers: { where: { userId }, select: { id: true } },
        },
      });

      if (!session) return { canManage: false, isSpeakerOnly: false };

      // Venue owner check
      if (session.venueId) {
        const owns = await ctx.db.venueOwner.findUnique({
          where: { userId_venueId: { userId, venueId: session.venueId } },
        });
        if (owns) return { canManage: true, isSpeakerOnly: false };
      }

      // For CONFERENCE events, allow session speakers
      const isConference = session.event.type?.toUpperCase() === "CONFERENCE";
      if (isConference && session.sessionSpeakers.length > 0) {
        return { canManage: true, isSpeakerOnly: true };
      }

      return { canManage: false, isSpeakerOnly: false };
    }),

  // Get sessions with no linked speakers for admin bulk-linking
  getUnlinkedSessions: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      const event = await resolveEventId(ctx.db, input.eventId);
      await assertAdminOrEventFloorOwner(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        event.id,
      );

      // Find sessions with no sessionSpeakers and no text speakers
      const sessions = await ctx.db.scheduleSession.findMany({
        where: {
          event: { id: event.id },
          isPublished: true,
          sessionSpeakers: { none: {} },
          speakers: { isEmpty: true },
        },
        select: {
          id: true,
          title: true,
          startTime: true,
          venue: { select: { name: true } },
          sessionType: { select: { name: true } },
        },
        orderBy: { startTime: "asc" },
      });

      // For each session, try to fuzzy-match the title to a user
      const results = await Promise.all(
        sessions.map(async (session) => {
          const cleanName = session.title
            .replace(/\s*\([^)]*\)\s*/g, "")
            .trim();
          const parts = cleanName.split(/\s+/);
          if (parts.length < 2) {
            return { session, candidates: [] };
          }
          const firstName = parts[0] ?? "";
          const surname = parts.slice(1).join(" ");

          const orConditions = [];
          if (firstName) {
            orConditions.push({
              firstName: {
                contains: firstName,
                mode: "insensitive" as const,
              },
            });
          }
          if (surname) {
            orConditions.push({
              surname: {
                contains: surname,
                mode: "insensitive" as const,
              },
            });
          }
          orConditions.push({
            name: { contains: cleanName, mode: "insensitive" as const },
          });

          const users = await ctx.db.user.findMany({
            where: {
              AND: [
                {
                  applications: {
                    some: {
                      eventId: event.id,
                      userId: { not: null },
                    },
                  },
                },
                { OR: orConditions },
              ],
            },
            select: {
              ...userSelectFields,
              profile: {
                select: { avatarUrl: true, jobTitle: true, company: true },
              },
            },
            take: 3,
          });

          const candidates = users.map((u) => {
            const uFirst = (u.firstName ?? "").toLowerCase();
            const uSurname = (u.surname ?? "").toLowerCase();
            const isExact =
              uFirst === firstName.toLowerCase() &&
              uSurname === surname.toLowerCase();
            return {
              userId: u.id,
              firstName: u.firstName,
              surname: u.surname,
              name: u.name,
              image: u.image,
              profile: u.profile,
              confidence: isExact ? ("exact" as const) : ("partial" as const),
            };
          });

          return { session, candidates };
        }),
      );

      return results.filter((r) => r.candidates.length > 0);
    }),

  // Link a user to a session as a speaker and optionally remove a text speaker name
  linkSpeakerToSession: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        userId: z.string(),
        role: z.enum(PARTICIPANT_ROLES).default("Speaker"),
        removeTextSpeaker: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertCanManageSession(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        input.sessionId,
      );
      // Speakers cannot manage other speakers on their sessions
      const speakerOnly = await isSessionSpeakerOnly(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        input.sessionId,
      );
      if (speakerOnly) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Speakers cannot manage participants. Contact a floor lead or admin.",
        });
      }

      // Create SessionSpeaker record (skip if already linked)
      const existing = await ctx.db.sessionSpeaker.findUnique({
        where: {
          sessionId_userId: {
            sessionId: input.sessionId,
            userId: input.userId,
          },
        },
      });

      if (!existing) {
        const maxOrder = await ctx.db.sessionSpeaker.aggregate({
          where: { sessionId: input.sessionId },
          _max: { order: true },
        });

        await ctx.db.sessionSpeaker.create({
          data: {
            sessionId: input.sessionId,
            userId: input.userId,
            role: input.role,
            order: (maxOrder._max.order ?? -1) + 1,
          },
        });
      }

      // Remove text speaker name if provided
      if (input.removeTextSpeaker) {
        const session = await ctx.db.scheduleSession.findUnique({
          where: { id: input.sessionId },
          select: { speakers: true },
        });

        if (session) {
          const updatedSpeakers = session.speakers.filter(
            (name) =>
              name.toLowerCase() !== input.removeTextSpeaker!.toLowerCase(),
          );

          await ctx.db.scheduleSession.update({
            where: { id: input.sessionId },
            data: { speakers: updatedSpeakers },
          });
        }
      }

      return { success: true };
    }),

  // Get applications linked to a specific venue/floor (for floor leads to create sessions from)
  getFloorApplications: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        venueId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const event = await resolveEventId(ctx.db, input.eventId);
      await assertCanManageVenue(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        input.venueId,
      );

      const applications = await ctx.db.application.findMany({
        where: {
          eventId: event.id,
          venues: { some: { venueId: input.venueId } },
          status: { in: ["SUBMITTED", "ACCEPTED"] },
          userId: { not: null },
        },
        select: {
          id: true,
          status: true,
          applicationType: true,
          createdAt: true,
          speakerPreferredDates: true,
          speakerPreferredTimes: true,
          user: {
            select: {
              ...userSelectFields,
              profile: {
                select: {
                  speakerTalkTitle: true,
                  speakerTalkAbstract: true,
                  speakerTalkFormat: true,
                  speakerTalkDuration: true,
                  speakerTalkTopic: true,
                  speakerEntityName: true,
                  bio: true,
                  jobTitle: true,
                  company: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return applications;
    }),

  // Update a floor application's details (profile fields + scheduling preferences)
  updateFloorApplication: protectedProcedure
    .input(
      z.object({
        applicationId: z.string(),
        eventId: z.string(),
        venueId: z.string(),
        // Application fields
        status: z
          .enum([
            "DRAFT",
            "SUBMITTED",
            "UNDER_REVIEW",
            "ACCEPTED",
            "REJECTED",
            "WAITLISTED",
            "CANCELLED",
          ])
          .optional(),
        speakerPreferredDates: z.string().max(500).optional().nullable(),
        speakerPreferredTimes: z.string().max(500).optional().nullable(),
        // Profile fields
        speakerTalkTitle: z.string().max(200).optional().nullable(),
        speakerTalkAbstract: z.string().max(2000).optional().nullable(),
        speakerTalkFormat: z.string().max(200).optional().nullable(),
        speakerTalkDuration: z.string().max(50).optional().nullable(),
        speakerTalkTopic: z.string().max(500).optional().nullable(),
        speakerEntityName: z.string().max(200).optional().nullable(),
        bio: z.string().max(2000).optional().nullable(),
        jobTitle: z.string().max(100).optional().nullable(),
        company: z.string().max(100).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const event = await resolveEventId(ctx.db, input.eventId);
      await assertCanManageVenue(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        input.venueId,
      );

      // Verify application exists, belongs to event, and is linked to venue
      const application = await ctx.db.application.findFirst({
        where: {
          id: input.applicationId,
          eventId: event.id,
          venues: { some: { venueId: input.venueId } },
        },
        select: { id: true, userId: true },
      });

      if (!application) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Application not found or not linked to this venue",
        });
      }

      // Build application update data (only include provided fields)
      const appUpdateData: Record<string, unknown> = {};
      if (input.status !== undefined) appUpdateData.status = input.status;
      if (input.speakerPreferredDates !== undefined)
        appUpdateData.speakerPreferredDates = input.speakerPreferredDates;
      if (input.speakerPreferredTimes !== undefined)
        appUpdateData.speakerPreferredTimes = input.speakerPreferredTimes;

      if (Object.keys(appUpdateData).length > 0) {
        await ctx.db.application.update({
          where: { id: input.applicationId },
          data: appUpdateData,
        });
      }

      // Build profile update data (only include provided fields)
      const profileFields = [
        "speakerTalkTitle",
        "speakerTalkAbstract",
        "speakerTalkFormat",
        "speakerTalkDuration",
        "speakerTalkTopic",
        "speakerEntityName",
        "bio",
        "jobTitle",
        "company",
      ] as const;

      const profileUpdateData: Record<string, string | null> = {};
      for (const field of profileFields) {
        if (input[field] !== undefined) {
          profileUpdateData[field] = input[field] ?? null;
        }
      }

      if (application.userId && Object.keys(profileUpdateData).length > 0) {
        await ctx.db.userProfile.upsert({
          where: { userId: application.userId },
          update: profileUpdateData,
          create: {
            userId: application.userId,
            ...profileUpdateData,
          },
        });
      }

      return { success: true };
    }),

  // ──────────────────────────────────────────
  // Venue owner management (admin only)
  // ──────────────────────────────────────────

  // Admin: Assign a floor lead to a venue
  assignVenueOwner: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        venueId: z.string(),
        eventId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!isAdminOrStaff(ctx.session.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required",
        });
      }

      const [event, user, venue] = await Promise.all([
        resolveEventId(ctx.db, input.eventId),
        ctx.db.user.findUnique({ where: { id: input.userId } }),
        ctx.db.scheduleVenue.findUnique({ where: { id: input.venueId } }),
      ]);

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }
      if (!venue) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Venue not found" });
      }

      const venueOwner = await ctx.db.venueOwner.create({
        data: {
          userId: input.userId,
          venueId: input.venueId,
          eventId: event.id,
          assignedBy: ctx.session.user.id,
        },
        include: {
          user: { select: userSelectFields },
          venue: { select: { id: true, name: true } },
        },
      });

      // Send floor lead assignment notification email
      if (user.email) {
        try {
          const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
          const eventPath = event.slug ?? event.id;
          const manageFloorUrl = `${baseUrl}/events/${eventPath}/manage-schedule`;

          const fullName = [user.firstName, user.surname]
            .filter(Boolean)
            .join(" ");
          const floorOwnerName =
            fullName.length > 0 ? fullName : (user.name ?? "there");
          const assignedByName =
            ctx.session.user.name ??
            ctx.session.user.email ??
            "An administrator";

          const emailService = getEmailService(ctx.db);
          await emailService.sendEmail({
            to: user.email,
            templateName: "floorOwnerAssigned",
            templateData: {
              floorOwnerName,
              eventName: event.name,
              venueName: venue.name,
              assignedByName,
              manageFloorUrl,
            },
            eventId: event.id,
            userId: user.id,
          });
        } catch (error) {
          captureEmailError(error, {
            userId: user.id,
            emailType: "floor_owner_assigned",
            recipient: user.email,
            templateName: "floorOwnerAssigned",
          });
        }
      }

      return venueOwner;
    }),

  // Admin: Remove a floor lead from a venue
  removeVenueOwner: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        venueId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!isAdminOrStaff(ctx.session.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required",
        });
      }

      const deleted = await ctx.db.venueOwner.deleteMany({
        where: { userId: input.userId, venueId: input.venueId },
      });

      if (deleted.count === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Venue ownership not found",
        });
      }

      return { success: true };
    }),

  // Get sessions where the current user is a linked speaker
  getMySessions: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      const event = await resolveEventId(ctx.db, input.eventId);
      const sessions = await ctx.db.scheduleSession.findMany({
        where: {
          eventId: event.id,
          sessionSpeakers: { some: { userId: ctx.session.user.id } },
        },
        include: {
          venue: { select: { id: true, name: true } },
          room: { select: { id: true, name: true } },
          sessionType: { select: { id: true, name: true, color: true } },
          track: { select: { id: true, name: true, color: true } },
          sessionSpeakers: {
            include: { user: { select: userSelectFields } },
            orderBy: { order: "asc" },
          },
        },
        orderBy: [{ startTime: "asc" }, { order: "asc" }],
      });
      return sessions;
    }),

  // ──────────────────────────────────────────
  // Session Comments (private: admins + floor leads only)
  // ──────────────────────────────────────────

  getSessionComments: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertCanManageSession(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        input.sessionId,
      );

      return ctx.db.sessionComment.findMany({
        where: { sessionId: input.sessionId, parentId: null },
        include: {
          user: {
            select: {
              ...userSelectFields,
              profile: { select: { avatarUrl: true } },
            },
          },
          likes: { select: { userId: true } },
          _count: { select: { likes: true } },
          replies: {
            include: {
              user: {
                select: {
                  ...userSelectFields,
                  profile: { select: { avatarUrl: true } },
                },
              },
              likes: { select: { userId: true } },
              _count: { select: { likes: true } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
      });
    }),

  createSessionComment: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        content: z.string().min(1).max(5000),
        parentId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertCanManageSession(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        input.sessionId,
      );

      // If replying, validate parent exists and belongs to the same session
      if (input.parentId) {
        const parent = await ctx.db.sessionComment.findUnique({
          where: { id: input.parentId },
          select: { sessionId: true },
        });
        if (!parent || parent.sessionId !== input.sessionId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid parent comment",
          });
        }
      }

      return ctx.db.sessionComment.create({
        data: {
          sessionId: input.sessionId,
          userId: ctx.session.user.id,
          content: input.content,
          parentId: input.parentId,
        },
        include: {
          user: {
            select: {
              ...userSelectFields,
              profile: { select: { avatarUrl: true } },
            },
          },
          likes: { select: { userId: true } },
          _count: { select: { likes: true } },
        },
      });
    }),

  deleteSessionComment: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.db.sessionComment.findUnique({
        where: { id: input.id },
        select: { userId: true, sessionId: true },
      });

      if (!comment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Comment not found",
        });
      }

      // Only the author or an admin can delete
      if (
        comment.userId !== ctx.session.user.id &&
        !isAdminOrStaff(ctx.session.user.role)
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only delete your own comments",
        });
      }

      // Also verify the user can manage this session
      await assertCanManageSession(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        comment.sessionId,
      );

      return ctx.db.sessionComment.delete({ where: { id: input.id } });
    }),

  likeSessionComment: protectedProcedure
    .input(z.object({ commentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.db.sessionComment.findUnique({
        where: { id: input.commentId },
        select: { sessionId: true },
      });

      if (!comment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Comment not found",
        });
      }

      await assertCanManageSession(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        comment.sessionId,
      );

      return ctx.db.sessionCommentLike.create({
        data: {
          commentId: input.commentId,
          userId: ctx.session.user.id,
        },
      });
    }),

  unlikeSessionComment: protectedProcedure
    .input(z.object({ commentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.sessionCommentLike.delete({
        where: {
          commentId_userId: {
            commentId: input.commentId,
            userId: ctx.session.user.id,
          },
        },
      });
    }),

  // ──────────────────────────────────────────
  // Reschedule with Auto-Shift
  // ──────────────────────────────────────────

  rescheduleSession: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        newStartTime: z.coerce.date(),
        newRoomId: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertCanManageSession(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        input.sessionId,
      );
      // Speakers cannot reschedule sessions
      const speakerOnly = await isSessionSpeakerOnly(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        input.sessionId,
      );
      if (speakerOnly) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Speakers cannot reschedule sessions. Contact a floor lead or admin.",
        });
      }

      const session = await ctx.db.scheduleSession.findUnique({
        where: { id: input.sessionId },
        select: {
          id: true,
          startTime: true,
          endTime: true,
          venueId: true,
          roomId: true,
          event: { select: { startDate: true, endDate: true } },
        },
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found",
        });
      }

      // Validate new date falls within event date range
      validateSessionDateRange(
        session.event.startDate,
        session.event.endDate,
        input.newStartTime,
      );

      const duration =
        new Date(session.endTime).getTime() -
        new Date(session.startTime).getTime();
      const newStartTime = new Date(input.newStartTime);
      const newEndTime = new Date(newStartTime.getTime() + duration);

      // Determine target room
      const targetRoomId =
        input.newRoomId !== undefined ? input.newRoomId : session.roomId;

      // Validate room belongs to session's venue
      if (targetRoomId && session.venueId) {
        const room = await ctx.db.scheduleRoom.findUnique({
          where: { id: targetRoomId },
          select: { venueId: true },
        });
        if (!room || room.venueId !== session.venueId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Room does not belong to this floor",
          });
        }
      }

      // Auto-shift algorithm: find and cascade-shift conflicting sessions
      const shifted: Array<{
        id: string;
        oldStart: Date;
        oldEnd: Date;
        newStart: Date;
        newEnd: Date;
      }> = [];

      await ctx.db.$transaction(async (tx) => {
        // Update the dragged session first
        await tx.scheduleSession.update({
          where: { id: input.sessionId },
          data: {
            startTime: newStartTime,
            endTime: newEndTime,
            roomId: targetRoomId,
          },
        });

        // Find and shift conflicts iteratively (max 50 cascades)
        const MAX_CASCADE = 50;
        // Sessions that have been placed at their final positions
        const placedSessions: Array<{
          id: string;
          start: Date;
          end: Date;
        }> = [{ id: input.sessionId, start: newStartTime, end: newEndTime }];

        // Queue of sessions whose placement might have caused new conflicts
        const checkQueue = [
          { id: input.sessionId, start: newStartTime, end: newEndTime },
        ];

        for (let i = 0; i < MAX_CASCADE && checkQueue.length > 0; i++) {
          const current = checkQueue.shift()!;

          // Build where clause: same venue, overlap with current session
          const overlapWhere: Record<string, unknown> = {
            id: {
              notIn: placedSessions.map((s) => s.id),
            },
            venueId: session.venueId,
            startTime: { lt: current.end },
            endTime: { gt: current.start },
          };

          // Scope to same room if room is set
          if (targetRoomId) {
            overlapWhere.roomId = targetRoomId;
          }

          const conflicts = await tx.scheduleSession.findMany({
            where: overlapWhere,
            select: {
              id: true,
              startTime: true,
              endTime: true,
            },
            orderBy: { startTime: "asc" },
          });

          for (const conflict of conflicts) {
            const conflictDuration =
              new Date(conflict.endTime).getTime() -
              new Date(conflict.startTime).getTime();

            // Find the earliest available slot after the current session ends
            // Must not overlap with any already-placed session
            let shiftedStart = new Date(current.end);

            // Check against all placed sessions to find non-overlapping spot
            let hasOverlap = true;
            let safetyCount = 0;
            while (hasOverlap && safetyCount < MAX_CASCADE) {
              hasOverlap = false;
              const candidateEnd = new Date(
                shiftedStart.getTime() + conflictDuration,
              );
              for (const placed of placedSessions) {
                if (shiftedStart < placed.end && candidateEnd > placed.start) {
                  shiftedStart = new Date(placed.end);
                  hasOverlap = true;
                  break;
                }
              }
              safetyCount++;
            }

            const shiftedEnd = new Date(
              shiftedStart.getTime() + conflictDuration,
            );

            await tx.scheduleSession.update({
              where: { id: conflict.id },
              data: { startTime: shiftedStart, endTime: shiftedEnd },
            });

            shifted.push({
              id: conflict.id,
              oldStart: conflict.startTime,
              oldEnd: conflict.endTime,
              newStart: shiftedStart,
              newEnd: shiftedEnd,
            });

            placedSessions.push({
              id: conflict.id,
              start: shiftedStart,
              end: shiftedEnd,
            });

            // Queue this shifted session to check for further cascading conflicts
            checkQueue.push({
              id: conflict.id,
              start: shiftedStart,
              end: shiftedEnd,
            });
          }
        }
      });

      return { moved: input.sessionId, shifted };
    }),

  resizeSession: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        newStartTime: z.coerce.date(),
        newEndTime: z.coerce.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertCanManageSession(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        input.sessionId,
      );
      const speakerOnly = await isSessionSpeakerOnly(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        input.sessionId,
      );
      if (speakerOnly) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Speakers cannot resize sessions. Contact a floor lead or admin.",
        });
      }

      const newStart = new Date(input.newStartTime);
      const newEnd = new Date(input.newEndTime);
      const durationMs = newEnd.getTime() - newStart.getTime();

      if (durationMs < 15 * 60 * 1000) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Session must be at least 15 minutes long.",
        });
      }

      const session = await ctx.db.scheduleSession.findUnique({
        where: { id: input.sessionId },
        select: {
          id: true,
          event: { select: { startDate: true, endDate: true } },
        },
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found",
        });
      }

      validateSessionDateRange(
        session.event.startDate,
        session.event.endDate,
        newStart,
      );

      await ctx.db.scheduleSession.update({
        where: { id: input.sessionId },
        data: { startTime: newStart, endTime: newEnd },
      });

      return { resized: input.sessionId };
    }),

  // Admin: Get all venue owners for an event
  getVenueOwners: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!isAdminOrStaff(ctx.session.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required",
        });
      }

      const event = await resolveEventId(ctx.db, input.eventId);

      return ctx.db.venueOwner.findMany({
        where: { eventId: event.id },
        include: {
          user: { select: userSelectFields },
          venue: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  // ──────────────────────────────────────────
  // Sessions with slides status (for speaker management)
  // ──────────────────────────────────────────

  getSessionsWithSlidesStatus: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      const event = await resolveEventId(ctx.db, input.eventId);

      const admin = isAdminOrStaff(ctx.session.user.role);
      const floorOwner = await isEventFloorOwner(
        ctx.db,
        ctx.session.user.id,
        event.id,
      );

      if (!admin && !floorOwner) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin or floor owner access required",
        });
      }

      // Floor leads only see sessions in their venues
      const venueFilter =
        admin
          ? {}
          : {
              venueId: {
                in: await getUserOwnedVenueIds(
                  ctx.db,
                  ctx.session.user.id,
                  event.id,
                ),
              },
            };

      const sessions = await ctx.db.scheduleSession.findMany({
        where: { eventId: event.id, ...venueFilter },
        select: {
          id: true,
          title: true,
          slidesUrl: true,
          slidesFileName: true,
          slidesUploadedAt: true,
          startTime: true,
          endTime: true,
          venueId: true,
          venue: { select: { id: true, name: true } },
          roomId: true,
          room: { select: { id: true, name: true } },
          sessionSpeakers: {
            include: {
              user: {
                select: userSelectFields,
              },
            },
            orderBy: { order: "asc" },
          },
        },
        orderBy: [{ startTime: "asc" }, { order: "asc" }],
      });

      return {
        event: { id: event.id, name: event.name, slug: event.slug },
        sessions,
      };
    }),

  sendSlidesReminder: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        reminders: z.array(
          z.object({
            sessionId: z.string(),
            speakerUserId: z.string(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const event = await resolveEventId(ctx.db, input.eventId);

      const admin = isAdminOrStaff(ctx.session.user.role);
      const floorOwner = await isEventFloorOwner(
        ctx.db,
        ctx.session.user.id,
        event.id,
      );

      if (!admin && !floorOwner) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin or floor owner access required",
        });
      }

      const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
      const eventPath = event.slug ?? event.id;
      const contactEmail =
        process.env.CONTACT_EMAIL ?? "info@fundingthecommons.io";

      const emailService = getEmailService(ctx.db);
      let successCount = 0;
      let failureCount = 0;

      for (const reminder of input.reminders) {
        const session = await ctx.db.scheduleSession.findUnique({
          where: { id: reminder.sessionId },
          select: { id: true, title: true, startTime: true, endTime: true },
        });

        if (!session) {
          failureCount++;
          continue;
        }

        const user = await ctx.db.user.findUnique({
          where: { id: reminder.speakerUserId },
          select: {
            id: true,
            email: true,
            firstName: true,
            surname: true,
            name: true,
          },
        });

        if (!user?.email) {
          failureCount++;
          continue;
        }

        const speakerName = user.firstName ?? user.name ?? user.email;
        const sessionUrl = `${baseUrl}/events/${eventPath}/schedule/${session.id}`;

        const sessionDate = session.startTime.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        });
        const sessionStartTime = session.startTime.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        });
        const sessionEndTime = session.endTime.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        });

        // Create Luma coupon code if the event has a Luma event ID
        let speakerCouponCode: string | undefined;
        if (event.lumaEventId) {
          try {
            const { getLumaService, generateSpeakerCouponCode } = await import(
              "~/server/services/luma"
            );
            const lumaService = getLumaService();
            if (lumaService) {
              const couponCode = generateSpeakerCouponCode(
                user.firstName,
                user.surname,
              );
              const couponResult = await lumaService.createCoupon({
                eventId: event.lumaEventId,
                code: couponCode,
                percentOff: 100,
                remainingCount: 2,
              });
              if (couponResult.success) {
                speakerCouponCode = couponResult.code;
              } else {
                console.error(
                  `Luma coupon creation failed for slides reminder (user ${user.id}): ${couponResult.error}`,
                );
              }
            }
          } catch (error) {
            console.error("Error creating Luma coupon for slides reminder:", error);
          }
        }

        try {
          const result = await emailService.sendEmail({
            to: user.email,
            templateName: "slidesReminder",
            templateData: {
              speakerName,
              eventName: event.name,
              sessionTitle: session.title,
              sessionDate,
              sessionTime: `${sessionStartTime} – ${sessionEndTime}`,
              sessionUrl,
              contactEmail,
              speakerCouponCode,
            },
            eventId: event.id,
            userId: ctx.session.user.id,
          });

          if (result.success) {
            successCount++;
          } else {
            failureCount++;
          }
        } catch (error) {
          captureEmailError(error, {
            userId: ctx.session.user.id,
            emailType: "slides_reminder",
            recipient: user.email,
            templateName: "slidesReminder",
          });
          failureCount++;
        }
      }

      return { successCount, failureCount };
    }),

  sendTestSlidesReminder: protectedProcedure
    .input(
      z.object({
        to: z.string().email(),
        includeCouponCode: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!isAdminOrStaff(ctx.session.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required",
        });
      }

      const emailService = getEmailService(ctx.db);

      const result = await emailService.sendEmail({
        to: input.to,
        templateName: "slidesReminder",
        templateData: {
          speakerName: "Jane Doe",
          eventName: "Intelligence at the Frontier",
          sessionTitle: "Building Decentralized Public Goods Infrastructure",
          sessionDate: "Saturday, March 15, 2026",
          sessionTime: "2:00 PM – 2:30 PM",
          sessionUrl: "https://platform.fundingthecommons.io/events/intelligence-at-the-frontier/schedule/test-session",
          contactEmail: "info@fundingthecommons.io",
          speakerCouponCode: input.includeCouponCode
            ? "SPEAKER-JDOE-TEST"
            : undefined,
        },
        userId: ctx.session.user.id,
      });

      return result;
    }),

  sendTestSessionDetailsReminder: protectedProcedure
    .input(
      z.object({
        to: z.string().email(),
        includeCouponCode: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!isAdminOrStaff(ctx.session.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required",
        });
      }

      const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
      const emailService = getEmailService(ctx.db);

      const result = await emailService.sendEmail({
        to: input.to,
        templateName: "sessionDetailsReminder",
        templateData: {
          speakerName: "Jane Doe",
          eventName: "Intelligence at the Frontier",
          sessionTitle: "Building Decentralized Public Goods Infrastructure",
          sessionDate: "Saturday, March 15, 2026",
          sessionTime: "2:00 PM – 2:30 PM",
          sessionUrl: `${baseUrl}/events/intelligence-at-the-frontier/schedule/test-session`,
          contactEmail: "beth@fundingthecommons.io",
          venueName: "Floor 3 – Commons",
          roomName: "Main Stage",
          speakerCouponCode: input.includeCouponCode
            ? "SPEAKER-JDOE-TEST"
            : undefined,
          scheduleUrl: `${baseUrl}/events/intelligence-at-the-frontier/schedule`,
          signinUrl: `${baseUrl}/signin`,
          signinScreenshotUrl: `${baseUrl}/images/signin-with-password.jpg`,
        },
        userId: ctx.session.user.id,
      });

      return result;
    }),

  sendSessionDetailsReminder: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        reminders: z.array(
          z.object({
            sessionId: z.string(),
            speakerUserId: z.string(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const event = await resolveEventId(ctx.db, input.eventId);

      const admin = isAdminOrStaff(ctx.session.user.role);
      const floorOwner = await isEventFloorOwner(
        ctx.db,
        ctx.session.user.id,
        event.id,
      );

      if (!admin && !floorOwner) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin or floor owner access required",
        });
      }

      const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
      const eventPath = event.slug ?? event.id;
      const contactEmail =
        process.env.CONTACT_EMAIL ?? "info@fundingthecommons.io";

      const emailService = getEmailService(ctx.db);
      let successCount = 0;
      let failureCount = 0;

      for (const reminder of input.reminders) {
        const session = await ctx.db.scheduleSession.findUnique({
          where: { id: reminder.sessionId },
          select: {
            id: true,
            title: true,
            startTime: true,
            endTime: true,
            venue: { select: { name: true } },
            room: { select: { name: true } },
          },
        });

        if (!session) {
          failureCount++;
          continue;
        }

        const user = await ctx.db.user.findUnique({
          where: { id: reminder.speakerUserId },
          select: {
            id: true,
            email: true,
            firstName: true,
            surname: true,
            name: true,
          },
        });

        if (!user?.email) {
          failureCount++;
          continue;
        }

        const speakerName = user.firstName ?? user.name ?? user.email;
        const sessionUrl = `${baseUrl}/events/${eventPath}/schedule/${session.id}`;

        const sessionDate = session.startTime.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        });
        const sessionStartTime = session.startTime.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        });
        const sessionEndTime = session.endTime.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        });

        // Create Luma coupon code if the event has a Luma event ID
        let speakerCouponCode: string | undefined;
        if (event.lumaEventId) {
          try {
            const { getLumaService, generateSpeakerCouponCode } = await import(
              "~/server/services/luma"
            );
            const lumaService = getLumaService();
            if (lumaService) {
              const couponCode = generateSpeakerCouponCode(
                user.firstName,
                user.surname,
              );
              const couponResult = await lumaService.createCoupon({
                eventId: event.lumaEventId,
                code: couponCode,
                percentOff: 100,
                remainingCount: 2,
              });
              if (couponResult.success) {
                speakerCouponCode = couponResult.code;
              } else {
                console.error(
                  `Luma coupon creation failed for session details reminder (user ${user.id}): ${couponResult.error}`,
                );
              }
            }
          } catch (error) {
            console.error(
              "Error creating Luma coupon for session details reminder:",
              error,
            );
          }
        }

        try {
          const result = await emailService.sendEmail({
            to: user.email,
            templateName: "sessionDetailsReminder",
            templateData: {
              speakerName,
              eventName: event.name,
              sessionTitle: session.title,
              sessionDate,
              sessionTime: `${sessionStartTime} – ${sessionEndTime}`,
              sessionUrl,
              contactEmail,
              venueName: session.venue?.name,
              roomName: session.room?.name,
              speakerCouponCode,
              scheduleUrl: `${baseUrl}/events/${eventPath}/schedule`,
              signinUrl: `${baseUrl}/signin`,
              signinScreenshotUrl: `${baseUrl}/images/signin-with-password.jpg`,
            },
            eventId: event.id,
            userId: ctx.session.user.id,
          });

          if (result.success) {
            successCount++;
          } else {
            failureCount++;
          }
        } catch (error) {
          captureEmailError(error, {
            userId: ctx.session.user.id,
            emailType: "session_details_reminder",
            recipient: user.email,
            templateName: "sessionDetailsReminder",
          });
          failureCount++;
        }
      }

      return { successCount, failureCount };
    }),
});
