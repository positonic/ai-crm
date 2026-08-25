import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Client as NotionClient } from "@notionhq/client";
import type { Prisma } from "@prisma/client";

import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "~/server/api/trpc";
import { getEventSlugService } from "~/server/services/eventSlugService";

// Calculate profile completion percentage
function calculateProfileCompletion(profile: unknown): number {
  if (!profile) return 0;

  const fields = [
    "bio",
    "jobTitle",
    "company",
    "location",
    "skills",
    "interests",
    "yearsOfExperience",
    "timezone",
    "languages",
  ];

  let filledFields = 0;
  const totalFields = fields.length;

  fields.forEach((field) => {
    const value = (profile as Record<string, unknown>)?.[field];
    if (field === "skills" || field === "interests" || field === "languages") {
      // Array fields - count as filled if they have at least one item
      if (Array.isArray(value) && value.length > 0) {
        filledFields++;
      }
    } else {
      // Regular fields - count as filled if they have a non-empty value
      if (value && typeof value === "string" && value.trim().length > 0) {
        filledFields++;
      }
    }
  });

  return Math.round((filledFields / totalFields) * 100);
}

// Define the event data structure based on your sample - more flexible to handle real-world data
const EventDataSchema = z.object({
  id: z.string(),
  description: z.string().default(""),
  banner: z.string().nullable().optional(),
  starred: z.boolean().default(false),
  event: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  city: z.array(z.string()).default([]),
  country: z.array(z.string()).default([]),
  region: z.array(z.string()).default([]),
  timezone: z.array(z.string()).default([]),
  link: z.string(),
  organizer: z.string().nullable().default(""),
  twitter: z.string().nullable().optional(),
  telegram: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  topics: z.array(z.string()).default([]),
  usersGoingObj: z
    .array(
      z.object({
        handle: z.string(),
        avatar: z.string(),
        name: z.string(),
        followerCount: z.number(),
        airtableId: z.string(),
      }),
    )
    .default([]),
  usersInterestedObj: z
    .array(
      z.object({
        handle: z.string(),
        avatar: z.string(),
        name: z.string(),
        followerCount: z.number(),
        airtableId: z.string(),
      }),
    )
    .default([]),
  benefits: z.string().nullable().optional(),
  series: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        color: z.string(),
        slug: z.string(),
        shortSlug: z.string(),
        visible: z.boolean(),
        clickable: z.boolean(),
        logo: z.string(),
        banner: z.string(),
      }),
    )
    .default([]),
  slug: z.string().default(""),
  shortSlug: z.string().default(""),
  logo: z
    .union([z.string(), z.object({}).passthrough()])
    .nullable()
    .optional(),
  created: z.string().default(""),
  promoted: z.union([z.boolean(), z.array(z.unknown())]).default(false),
  promoType: z.array(z.string()).default([]),
  companies: z.array(z.string()).default([]),
  showCompaniesAttendingUnderEvent: z.boolean().default(false),
  paidEvent: z.boolean().default(false),
  hostIds: z.array(z.string()).default([]),
  creator: z.string().nullable().default(""),
  colivingBanner: z.string().nullable().optional(),
  promoStatus: z.array(z.union([z.string(), z.boolean()])).default([]),
});

type EventData = z.infer<typeof EventDataSchema>;

// Type definitions for better type safety
type EventWithSponsors = Prisma.EventGetPayload<{
  include: {
    sponsors: {
      include: {
        sponsor: {
          include: {
            contacts: true;
          };
        };
      };
    };
    _count: {
      select: {
        applications: true;
        userRoles: true;
        sponsors?: true;
      };
    };
  };
}>;

type ApplicationWithStatus = {
  status: string;
};

/**
 * Syncs an array of events to Notion database
 * Checks if event already exists and only inserts new ones
 */
async function syncEventsToNotion(events: EventData[]): Promise<{
  synced: number;
  skipped: number;
  errors: Array<{ eventId: string; error: string }>;
}> {
  const notionToken = process.env.NOTION_TOKEN;
  const notionEventsDbId = process.env.NOTION_EVENTS_DATABASE_ID;

  if (!notionToken || !notionEventsDbId) {
    throw new Error(
      "Notion integration token or events database ID not set in environment variables.",
    );
  }

  const notion = new NotionClient({ auth: notionToken });

  let synced = 0;
  let skipped = 0;
  const errors: Array<{ eventId: string; error: string }> = [];

  for (const event of events) {
    try {
      // Check if event already exists in Notion using Event Name
      const existingEvent = await notion.databases.query({
        database_id: notionEventsDbId,
        filter: {
          property: "Event Name",
          title: {
            equals: event.event,
          },
        },
      });

      if (existingEvent.results.length > 0) {
        console.log(
          `Event "${event.event}" already exists in Notion, skipping...`,
        );
        skipped++;
        continue;
      }

      // Prepare location string
      const locationParts = [];
      if (event.city.length > 0) locationParts.push(event.city.join(", "));
      if (event.country.length > 0)
        locationParts.push(event.country.join(", "));
      const location = locationParts.join(", ");

      // Determine event type based on tags
      let eventType = "Conference"; // default
      if (event.tags.includes("Coliving")) eventType = "Coliving";
      else if (event.tags.includes("Hackathon")) eventType = "Hackathon";
      else if (event.tags.includes("Conference")) eventType = "Conference";

      // Create new event in Notion matching the schema from screenshot
      const properties = {
        "Event Name": {
          title: [{ text: { content: event.event } }],
        },
        "Start Date": {
          date: { start: event.startDate },
        },
        "End Date": {
          date: { start: event.endDate },
        },
        Location: {
          rich_text: [{ text: { content: location } }],
        },
        "Event Type": {
          select: { name: eventType },
        },
        "Focus Areas": {
          multi_select: event.topics.map((topic) => ({ name: topic })),
        },
        Organizer: {
          rich_text: [{ text: { content: event.organizer ?? "Unknown" } }],
        },
        "Attending Status": {
          select: { name: "Interested" }, // Default status
        },
        "Event URL": {
          url: event.link,
        },
        Banner: event.banner ? { url: event.banner } : undefined,
        City: event.city?.length
          ? { multi_select: event.city.map((c) => ({ name: c })) }
          : undefined,
        Country: event.country.length
          ? { multi_select: event.country.map((c) => ({ name: c })) }
          : undefined,
        Region: event.region.length
          ? { multi_select: event.region.map((r) => ({ name: r })) }
          : undefined,
        Timezone: event.timezone.length
          ? { multi_select: event.timezone.map((tz) => ({ name: tz })) }
          : undefined,
        Twitter: event.twitter
          ? { rich_text: [{ text: { content: event.twitter } }] }
          : undefined,
        Telegram: event.telegram
          ? { rich_text: [{ text: { content: event.telegram } }] }
          : undefined,
        Tags: event.tags.length
          ? { multi_select: event.tags.map((tag) => ({ name: tag })) }
          : undefined,
        Slug: event.slug
          ? { rich_text: [{ text: { content: event.slug } }] }
          : undefined,
        "Short Slug": event.shortSlug
          ? { rich_text: [{ text: { content: event.shortSlug } }] }
          : undefined,
        Logo: event.logo
          ? typeof event.logo === "string"
            ? { url: event.logo }
            : { url: "" } // or handle object logo as needed
          : undefined,
      };

      // Remove undefined properties
      const filteredProperties: Record<
        string,
        NonNullable<(typeof properties)[keyof typeof properties]>
      > = {};
      Object.entries(properties).forEach(([key, value]) => {
        if (value !== undefined) {
          filteredProperties[key] = value;
        }
      });

      await notion.pages.create({
        parent: { database_id: notionEventsDbId },
        properties: filteredProperties,
      });

      synced++;
      console.log(`Successfully synced event ${event.id} to Notion`);
    } catch (error) {
      console.error(`Error syncing event ${event.id}:`, error);
      errors.push({
        eventId: event.id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return { synced, skipped, errors };
}

/**
 * Syncs users from events to Notion Contacts database
 * Extracts users from usersGoingObj array and creates contact records
 */
async function syncUsersToNotion(events: EventData[]): Promise<{
  synced: number;
  skipped: number;
  errors: Array<{ userId: string; error: string }>;
}> {
  const notionToken = process.env.NOTION_TOKEN;
  const notionContactsDbId = process.env.NOTION_CONTACTS_DATABASE_ID;

  if (!notionToken || !notionContactsDbId) {
    throw new Error(
      "Notion integration token or contacts database ID not set in environment variables.",
    );
  }

  const notion = new NotionClient({ auth: notionToken });

  let synced = 0;
  const skipped = 0;
  const errors: Array<{ userId: string; error: string }> = [];
  const processedAirtableIds = new Set<string>();

  for (const event of events) {
    if (!event.usersGoingObj || event.usersGoingObj.length === 0) {
      continue;
    }

    for (const user of event.usersGoingObj) {
      try {
        // Skip if we've already processed this user in this batch
        if (processedAirtableIds.has(user.airtableId)) {
          continue;
        }
        processedAirtableIds.add(user.airtableId);

        // For now, skip duplicate checking since the airtableId property might not exist yet
        // We'll rely on the processedAirtableIds Set to avoid duplicates in this batch
        console.log(`Processing user ${user.airtableId}...`);

        // Use user.name directly as First name, no parsing needed
        const firstName = user.name ?? "";

        // Determine if handle is a crypto address (starts with 0x) or social handle
        const isTwitterHandle = user.handle && !user.handle.startsWith("0x");

        // Create new contact in Notion matching the schema from screenshot
        const baseContactProperties = {
          "First name": {
            rich_text: [{ text: { content: firstName } }],
          },
          avatar: {
            rich_text: [{ text: { content: user.avatar ?? "" } }],
          },
          followerCount: {
            number: user.followerCount ?? 0,
          },
          airtableId: {
            rich_text: [{ text: { content: user.airtableId } }],
          },
          "Lead Source": {
            select: { name: "CryptoNomadsImport" },
          },
          Source: {
            rich_text: [{ text: { content: "CryptoNomadsImport" } }],
          },
          "Current Process Status": {
            select: { name: "New Lead" },
          },
        };

        // Create dynamic properties object
        const dynamicProperties: Record<string, object> = {};

        // Add Twitter and Telegram only if handle doesn't start with "0x"
        if (isTwitterHandle) {
          dynamicProperties.Twitter = {
            rich_text: [{ text: { content: user.handle } }],
          };
          dynamicProperties.Telegram = {
            rich_text: [{ text: { content: user.handle } }],
          };
        }

        // Add Notes with any additional context
        const notesContent = isTwitterHandle
          ? `Event: ${event.event}`
          : `Event: ${event.event} | Handle: ${user.handle}`;

        dynamicProperties.Notes = {
          rich_text: [{ text: { content: notesContent } }],
        };

        // Add Event Series if available and has valid entries
        if (event.series && event.series.length > 0) {
          const validSeries = event.series.filter(
            (s) => s.title && s.title.trim() !== "",
          );
          if (validSeries.length > 0) {
            dynamicProperties["Event Series"] = {
              multi_select: validSeries.map((s) => ({ name: s.title })),
            };
          }
        }

        // Combine base and dynamic properties
        const contactProperties = {
          ...baseContactProperties,
          ...dynamicProperties,
        };

        await notion.pages.create({
          parent: { database_id: notionContactsDbId },
          properties: contactProperties,
        });

        synced++;
        console.log(
          `Successfully synced user ${user.airtableId} to Notion contacts`,
        );
      } catch (error) {
        console.error(`Error syncing user ${user.airtableId}:`, error);
        errors.push({
          userId: user.airtableId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }

  return { synced, skipped, errors };
}

export const eventRouter = createTRPCRouter({
  // Get event by ID or slug (supports both for backward compatibility)
  getEvent: publicProcedure
    .input(
      z
        .object({
          id: z.string().optional(),
          slug: z.string().optional(),
        })
        .refine((data) => data.id ?? data.slug, {
          message: "Either id or slug must be provided",
        }),
    )
    .query(async ({ ctx, input }) => {
      const includeClause = {
        sponsors: {
          include: {
            sponsor: {
              include: {
                contacts: true,
              },
            },
          },
        },
      };

      // If slug is explicitly provided, use it
      if (input.slug) {
        return ctx.db.event.findUnique({
          where: { slug: input.slug },
          include: includeClause,
        });
      }

      // If id is provided, try by ID first
      if (input.id) {
        let event = await ctx.db.event.findUnique({
          where: { id: input.id },
          include: includeClause,
        });

        // If not found by ID, try treating it as a slug (for backward compatibility)
        event ??= await ctx.db.event.findUnique({
          where: { slug: input.id },
          include: includeClause,
        });

        return event;
      }

      return null;
    }),

  getEvents: publicProcedure.query(async ({ ctx }) => {
    const events = await ctx.db.event.findMany({
      include: {
        sponsors: {
          include: {
            sponsor: {
              include: {
                contacts: true,
              },
            },
          },
        },
        _count: {
          select: {
            applications: true,
            sponsors: true,
          },
        },
      },
      orderBy: [{ startDate: "desc" }],
    });

    return events;
  }),

  addSponsorToEvent: publicProcedure
    .input(
      z.object({
        eventId: z.string(),
        sponsorId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if the relationship already exists
      const existing = await ctx.db.eventSponsor.findUnique({
        where: {
          eventId_sponsorId: {
            eventId: input.eventId,
            sponsorId: input.sponsorId,
          },
        },
      });

      if (existing) {
        throw new Error("Sponsor is already added to this event");
      }

      const eventSponsor = await ctx.db.eventSponsor.create({
        data: {
          eventId: input.eventId,
          sponsorId: input.sponsorId,
        },
        include: {
          sponsor: true,
        },
      });

      return eventSponsor;
    }),

  updateSponsorQualified: publicProcedure
    .input(
      z.object({
        eventId: z.string(),
        sponsorId: z.string(),
        qualified: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const eventSponsor = await ctx.db.eventSponsor.update({
        where: {
          eventId_sponsorId: {
            eventId: input.eventId,
            sponsorId: input.sponsorId,
          },
        },
        data: {
          qualified: input.qualified,
        },
        include: {
          sponsor: {
            include: {
              contacts: true,
            },
          },
        },
      });

      return eventSponsor;
    }),

  syncEventsToNotion: publicProcedure
    .input(z.object({ events: z.array(EventDataSchema) }))
    .mutation(async ({ input }) => {
      const result = await syncEventsToNotion(input.events);
      return result;
    }),

  syncUsersToNotion: protectedProcedure
    .input(z.object({ events: z.array(EventDataSchema) }))
    .mutation(async ({ ctx, input }) => {
      if (
        ctx.session.user.role !== "staff" &&
        ctx.session.user.role !== "admin"
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only staff and admin users can sync users to Notion",
        });
      }
      const result = await syncUsersToNotion(input.events);
      return result;
    }),

  // Dashboard-specific queries
  getSponsoredEvents: protectedProcedure.query(async ({ ctx }) => {
    // Get events where user has sponsor role
    const userRoles = await ctx.db.userRole.findMany({
      where: {
        userId: ctx.session.user.id,
        role: {
          name: "sponsor",
        },
      },
      include: {
        event: {
          include: {
            sponsors: {
              include: {
                sponsor: true,
              },
            },
            _count: {
              select: {
                applications: true,
                userRoles: true,
              },
            },
          },
        },
      },
    });

    return userRoles.map((ur) => ({
      ...ur.event,
      // Find the sponsor relationship for this user's organization - safe array access with proper type
      sponsorInfo:
        ur.event.sponsors.length > 0
          ? {
              id: ur.event.sponsors[0]!.id,
              sponsor: {
                id: ur.event.sponsors[0]!.sponsor.id,
                name: ur.event.sponsors[0]!.sponsor.name,
              },
            }
          : undefined,
    }));
  }),

  getMentorEvents: protectedProcedure.query(async ({ ctx }) => {
    // Get events where user has mentor role
    const userRoles = await ctx.db.userRole.findMany({
      where: {
        userId: ctx.session.user.id,
        role: {
          name: "mentor",
        },
      },
      include: {
        event: {
          include: {
            _count: {
              select: {
                applications: true,
                userRoles: true,
              },
            },
          },
        },
      },
    });

    return userRoles.map((ur) => ur.event);
  }),

  getOrganizerEvents: protectedProcedure.query(async ({ ctx }) => {
    // Get events where user has organizer role OR created the event
    const userRoles = await ctx.db.userRole.findMany({
      where: {
        userId: ctx.session.user.id,
        role: {
          name: "organizer",
        },
      },
      include: {
        event: {
          include: {
            sponsors: {
              include: {
                sponsor: {
                  include: {
                    contacts: true,
                  },
                },
              },
            },
            _count: {
              select: {
                applications: true,
                userRoles: true,
                sponsors: true,
              },
            },
          },
        },
      },
    });

    const createdEvents = await ctx.db.event.findMany({
      where: {
        createdById: ctx.session.user.id,
      },
      include: {
        sponsors: {
          include: {
            sponsor: {
              include: {
                contacts: true,
              },
            },
          },
        },
        _count: {
          select: {
            applications: true,
            userRoles: true,
            sponsors: true,
          },
        },
      },
    });

    // Combine and deduplicate with proper type safety
    const roleEvents: EventWithSponsors[] = userRoles.map((ur) => ur.event);
    const allEvents: EventWithSponsors[] = [...roleEvents, ...createdEvents];
    const uniqueEvents = allEvents.filter(
      (event, index, self) =>
        index === self.findIndex((e) => e.id === event.id),
    );

    return uniqueEvents;
  }),

  getAvailableEvents: publicProcedure.query(async ({ ctx }) => {
    // Get all active events - the ACTIVE status controls visibility,
    // not the date. Use COMPLETED status to hide past events.
    const isAdmin =
      ctx.session?.user?.role === "admin" ||
      ctx.session?.user?.role === "staff";

    // Check if user is a floor lead (venue owner) for any event
    let isFloorLead = false;
    if (ctx.session?.user?.id && !isAdmin) {
      const venueOwnership = await ctx.db.venueOwner.findFirst({
        where: { userId: ctx.session.user.id },
        select: { id: true },
      });
      isFloorLead = !!venueOwnership;
    }

    const events = await ctx.db.event.findMany({
      where: {
        status: "ACTIVE",
        // Hide test/example events from regular users
        ...(!isAdmin && !isFloorLead ? { slug: { not: "example-conf" } } : {}),
      },
      include: {
        _count: {
          select: {
            applications: true,
          },
        },
      },
      orderBy: [{ startDate: "asc" }],
    });

    return events;
  }),

  getOrganizerStats: protectedProcedure.query(async ({ ctx }) => {
    // Get stats for events the user organizes
    const userRoles = await ctx.db.userRole.findMany({
      where: {
        userId: ctx.session.user.id,
        role: {
          name: "organizer",
        },
      },
      select: {
        eventId: true,
      },
    });

    const createdEvents = await ctx.db.event.findMany({
      where: {
        createdById: ctx.session.user.id,
      },
      select: {
        id: true,
      },
    });

    const allEventIds = [
      ...userRoles.map((ur) => ur.eventId),
      ...createdEvents.map((e) => e.id),
    ];
    const uniqueEventIds = [...new Set(allEventIds)];

    if (uniqueEventIds.length === 0) {
      return {
        totalEvents: 0,
        totalApplications: 0,
        averageAcceptanceRate: 0,
      };
    }

    // Calculate stats with proper type safety
    const applications: ApplicationWithStatus[] =
      await ctx.db.application.findMany({
        where: {
          eventId: {
            in: uniqueEventIds,
          },
        },
        select: {
          status: true,
        },
      });

    const totalApplications = applications.length;
    const acceptedApplications = applications.filter(
      (app) => app.status === "ACCEPTED",
    ).length;
    const averageAcceptanceRate =
      totalApplications > 0
        ? Math.round((acceptedApplications / totalApplications) * 100)
        : 0;

    return {
      totalEvents: uniqueEventIds.length,
      totalApplications,
      averageAcceptanceRate,
    };
  }),

  // Check if current user is a mentor for a specific event
  checkMentorRole: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      const mentorRole = await ctx.db.userRole.findFirst({
        where: {
          userId: ctx.session.user.id,
          eventId: input.eventId,
          role: {
            name: "mentor",
          },
        },
      });
      return !!mentorRole;
    }),

  // Check if current user is a speaker for a specific event
  checkSpeakerRole: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      const speakerRole = await ctx.db.userRole.findFirst({
        where: {
          userId: ctx.session.user.id,
          eventId: input.eventId,
          role: {
            name: "speaker",
          },
        },
      });
      return !!speakerRole;
    }),

  getEventMetrics: publicProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Get all RESIDENT applications for this event with user profile data
      const applications = await ctx.db.application.findMany({
        where: {
          eventId: input.eventId,
          applicationType: "RESIDENT",
          status: {
            in: [
              "SUBMITTED",
              "UNDER_REVIEW",
              "ACCEPTED",
              "REJECTED",
              "WAITLISTED",
            ],
          },
        },
        include: {
          user: {
            include: {
              profile: true,
            },
          },
        },
      });

      const totalApplicants = applications.length;

      // Calculate geographic distribution
      const countries = new Set<string>();
      const cities = new Set<string>();
      const companies = new Map<string, number>();
      const skills = new Map<string, number>();
      const jobTitles = new Map<string, number>();
      const experienceLevels = new Map<string, number>();
      const languages = new Map<string, number>();

      let profilesWithSocial = 0;
      let profilesWithTelegram = 0;
      let profilesWithDiscord = 0;
      let profilesOver70Percent = 0;

      applications.forEach((app) => {
        const profile = app.user?.profile;

        if (profile) {
          // Geographic data
          if (profile.location) {
            const locationParts = profile.location.split(",");
            if (locationParts.length >= 2) {
              const country =
                locationParts[locationParts.length - 1]?.trim() ?? "";
              countries.add(country);
            }
            cities.add(profile.location);
          }

          // Company/affiliation data
          const company = app.affiliation ?? profile.company;
          if (company) {
            companies.set(company, (companies.get(company) ?? 0) + 1);
          }

          // Skills distribution
          profile.skills?.forEach((skill) => {
            skills.set(skill, (skills.get(skill) ?? 0) + 1);
          });

          // Job titles
          if (profile.jobTitle) {
            jobTitles.set(
              profile.jobTitle,
              (jobTitles.get(profile.jobTitle) ?? 0) + 1,
            );
          }

          // Experience levels
          if (
            profile.yearsOfExperience !== null &&
            profile.yearsOfExperience !== undefined
          ) {
            let expLevel = "0-2 years";
            if (
              profile.yearsOfExperience >= 3 &&
              profile.yearsOfExperience <= 5
            )
              expLevel = "3-5 years";
            else if (
              profile.yearsOfExperience >= 6 &&
              profile.yearsOfExperience <= 10
            )
              expLevel = "6-10 years";
            else if (profile.yearsOfExperience > 10) expLevel = "10+ years";

            experienceLevels.set(
              expLevel,
              (experienceLevels.get(expLevel) ?? 0) + 1,
            );
          }

          // Languages
          profile.languages?.forEach((lang) => {
            languages.set(lang, (languages.get(lang) ?? 0) + 1);
          });

          // Social media presence
          if (profile.githubUrl ?? profile.linkedinUrl ?? profile.twitterUrl) {
            profilesWithSocial++;
          }

          // Contact methods
          if (profile.telegramHandle) profilesWithTelegram++;
          if (profile.discordHandle) profilesWithDiscord++;

          // Profile completion calculation
          const completionPercentage = calculateProfileCompletion(profile);
          if (completionPercentage >= 70) {
            profilesOver70Percent++;
          }
        }
      });

      // Convert maps to sorted arrays for top items
      const topCountries = Array.from(countries);
      const topCities = Array.from(cities).slice(0, 10);
      const topCompanies = Array.from(companies.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));
      const topSkills = Array.from(skills.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([name, count]) => ({ name, count }));
      const topJobTitles = Array.from(jobTitles.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));
      const experienceDistribution = Array.from(experienceLevels.entries()).map(
        ([level, count]) => ({ level, count }),
      );
      const languageDistribution = Array.from(languages.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));

      return {
        totalApplicants,
        uniqueCountries: countries.size,
        uniqueCities: cities.size,
        topCountries,
        topCities,
        topCompanies,
        topSkills,
        topJobTitles,
        experienceDistribution,
        languageDistribution,
        socialMediaStats: {
          withSocialMedia: profilesWithSocial,
          withTelegram: profilesWithTelegram,
          withDiscord: profilesWithDiscord,
        },
        profileCompletion: {
          over70Percent: profilesOver70Percent,
          percentage:
            totalApplicants > 0
              ? Math.round((profilesOver70Percent / totalApplicants) * 100)
              : 0,
        },
      };
    }),

  // Create new event with optional questions and roles
  createEvent: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Event name is required"),
        slug: z.string().optional(), // Optional manual slug override
        type: z.string().min(1, "Event type is required"),
        startDate: z.date(),
        endDate: z.date(),
        isOnline: z.boolean().default(true),
        location: z.string().optional(),
        description: z.string().optional(),

        // Optional: create questions in same transaction
        questions: z
          .array(
            z.object({
              questionKey: z.string(),
              questionEn: z.string(),
              questionEs: z.string().optional(),
              questionType: z.enum([
                "TEXT",
                "TEXTAREA",
                "EMAIL",
                "PHONE",
                "URL",
                "SELECT",
                "MULTISELECT",
                "CHECKBOX",
                "NUMBER",
              ]),
              required: z.boolean().default(true),
              order: z.number(),
              options: z.array(z.string()).optional(),
            }),
          )
          .optional(),

        // Optional: assign initial roles
        roles: z
          .array(
            z.object({
              roleId: z.string(),
              userId: z.string(),
            }),
          )
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { questions, roles, slug: manualSlug, ...eventData } = input;

      // Validate dates
      if (eventData.endDate <= eventData.startDate) {
        throw new Error("End date must be after start date");
      }

      // Generate unique slug from name (or use manual slug if provided)
      const slugService = getEventSlugService(ctx.db);
      const slug = manualSlug
        ? await slugService.generateUniqueSlug(manualSlug)
        : await slugService.generateUniqueSlug(eventData.name);

      // Create event with related data in a transaction
      const event = await ctx.db.event.create({
        data: {
          ...eventData,
          slug,
          createdById: ctx.session.user.id,

          // Create application questions if provided
          ...(questions && questions.length > 0
            ? {
                applicationQuestions: {
                  create: questions.map((q) => ({
                    questionKey: q.questionKey,
                    questionEn: q.questionEn,
                    questionEs: q.questionEs ?? q.questionEn, // Default to English if Spanish not provided
                    questionType: q.questionType,
                    required: q.required,
                    order: q.order,
                    options: q.options ?? [],
                  })),
                },
              }
            : {}),

          // Create user roles if provided
          ...(roles && roles.length > 0
            ? {
                userRoles: {
                  create: roles.map((r) => ({
                    userId: r.userId,
                    roleId: r.roleId,
                  })),
                },
              }
            : {}),
        },
        include: {
          applicationQuestions: {
            orderBy: { order: "asc" },
          },
          userRoles: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              role: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return event;
    }),

  // Update existing event
  updateEvent: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        slug: z.string().optional(), // Optional manual slug override
        type: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        isOnline: z.boolean().optional(),
        location: z.string().optional(),
        description: z.string().optional(),
        // Registration & discount
        registrationUrl: z.string().optional(),
        discountCode: z.string().optional(),
        lumaEventId: z.string().optional(),
        // Feature flags
        featureApplicantVetting: z.boolean().optional(),
        featureSpeakerVetting: z.boolean().optional(),
        featureMentorVetting: z.boolean().optional(),
        featurePraise: z.boolean().optional(),
        featureProjects: z.boolean().optional(),
        featureAsksOffers: z.boolean().optional(),
        featureNewsfeed: z.boolean().optional(),
        featureImpactAnalytics: z.boolean().optional(),
        featureSponsorManagement: z.boolean().optional(),
        featureScheduleManagement: z.boolean().optional(),
        featureFloorManagement: z.boolean().optional(),
        featureDeliberation: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, slug: newSlug, name, ...updateData } = input;

      // Verify user is the creator or has organizer role
      const event = await ctx.db.event.findUnique({
        where: { id },
        include: {
          userRoles: {
            where: {
              userId: ctx.session.user.id,
            },
            include: {
              role: true,
            },
          },
        },
      });

      if (!event) {
        throw new Error("Event not found");
      }

      const isCreator = event.createdById === ctx.session.user.id;
      const hasOrganizerRole = event.userRoles.some(
        (ur) => ur.role.name === "ORGANIZER" || ur.role.name === "ADMIN",
      );

      if (!isCreator && !hasOrganizerRole) {
        throw new Error("You don't have permission to update this event");
      }

      // Validate dates if both are being updated
      if (updateData.startDate && updateData.endDate) {
        if (updateData.endDate <= updateData.startDate) {
          throw new Error("End date must be after start date");
        }
      }

      // Handle slug generation on name change or manual slug update
      let slug: string | undefined;
      if (newSlug) {
        // Manual slug provided - validate uniqueness
        const slugService = getEventSlugService(ctx.db);
        slug = await slugService.generateUniqueSlug(newSlug, id);
      } else if (name) {
        // Name changed but no manual slug - regenerate from name
        const slugService = getEventSlugService(ctx.db);
        slug = await slugService.generateUniqueSlug(name, id);
      }

      const updatedEvent = await ctx.db.event.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(slug && { slug }),
          ...updateData,
        },
        include: {
          applicationQuestions: {
            orderBy: { order: "asc" },
          },
          userRoles: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              role: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return updatedEvent;
    }),

  // Update event status (quick status change)
  updateEventStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["ACTIVE", "COMPLETED", "CANCELLED"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const event = await ctx.db.event.findUnique({
        where: { id: input.id },
        include: {
          userRoles: {
            where: { userId: ctx.session.user.id },
            include: { role: true },
          },
        },
      });

      if (!event) {
        throw new Error("Event not found");
      }

      const isCreator = event.createdById === ctx.session.user.id;
      const hasOrganizerRole = event.userRoles.some(
        (ur) => ur.role.name === "ORGANIZER" || ur.role.name === "ADMIN",
      );
      const isGlobalAdmin =
        ctx.session.user.role === "admin" || ctx.session.user.role === "staff";

      if (!isCreator && !hasOrganizerRole && !isGlobalAdmin) {
        throw new Error(
          "You don't have permission to update this event status",
        );
      }

      const updatedEvent = await ctx.db.event.update({
        where: { id: input.id },
        data: { status: input.status },
      });

      return updatedEvent;
    }),

  // Delete event (with safety checks)
  deleteEvent: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify user is the creator or admin
      const event = await ctx.db.event.findUnique({
        where: { id: input.id },
        include: {
          applications: {
            select: { id: true },
          },
          userRoles: {
            where: {
              userId: ctx.session.user.id,
            },
            include: {
              role: true,
            },
          },
        },
      });

      if (!event) {
        throw new Error("Event not found");
      }

      const isCreator = event.createdById === ctx.session.user.id;
      const hasAdminRole = event.userRoles.some(
        (ur) => ur.role.name === "ADMIN",
      );

      if (!isCreator && !hasAdminRole) {
        throw new Error("You don't have permission to delete this event");
      }

      // Check if event has applications
      if (event.applications.length > 0) {
        throw new Error(
          "Cannot delete event with existing applications. Please archive or cancel the event instead.",
        );
      }

      // Delete event (cascade will handle related records)
      await ctx.db.event.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Update event feature flags
  updateEventFeatureFlags: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        featureApplicantVetting: z.boolean().optional(),
        featureSpeakerVetting: z.boolean().optional(),
        featureMentorVetting: z.boolean().optional(),
        featurePraise: z.boolean().optional(),
        featureProjects: z.boolean().optional(),
        featureAsksOffers: z.boolean().optional(),
        featureNewsfeed: z.boolean().optional(),
        featureImpactAnalytics: z.boolean().optional(),
        featureSponsorManagement: z.boolean().optional(),
        featureScheduleManagement: z.boolean().optional(),
        featureFloorManagement: z.boolean().optional(),
        featureDeliberation: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...flags } = input;

      // Only admin/staff can update feature flags
      const isGlobalAdmin =
        ctx.session.user.role === "admin" || ctx.session.user.role === "staff";
      if (!isGlobalAdmin) {
        throw new Error("You don't have permission to update feature flags");
      }

      const updatedEvent = await ctx.db.event.update({
        where: { id },
        data: flags,
      });

      return updatedEvent;
    }),
});
