import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "~/server/api/trpc";
import { createHypercertsService } from "~/server/services/hypercerts";
import { createActivityCertService } from "~/server/services/activityCerts";
import { TRPCError } from "@trpc/server";
import { isAdminOrStaff } from "~/server/api/utils/scheduleAuth";

// ── AT Protocol helpers ──────────────────────────────────────────────

function parseAtUri(uri: string) {
  const match = /^at:\/\/(did:[^/]+)\/([^/]+)\/([^/]+)$/.exec(uri);
  if (!match) return null;
  return { did: match[1]!, collection: match[2]!, rkey: match[3]! };
}

async function fetchAtRecord(uri: string): Promise<unknown> {
  const parsed = parseAtUri(uri);
  if (!parsed) return null;

  // Resolve PDS URL from DID document
  let pdsUrl = "https://bsky.social";
  try {
    const didDocRes = await fetch(
      `https://plc.directory/${parsed.did}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (didDocRes.ok) {
      const didDoc = (await didDocRes.json()) as {
        service?: Array<{ id: string; serviceEndpoint: string }>;
      };
      const pds = didDoc.service?.find(
        (s) => s.id === "#atproto_pds",
      );
      if (pds) pdsUrl = pds.serviceEndpoint;
    }
  } catch {
    // Fall back to bsky.social
  }

  const url = `${pdsUrl}/xrpc/com.atproto.repo.getRecord?repo=${encodeURIComponent(parsed.did)}&collection=${encodeURIComponent(parsed.collection)}&rkey=${encodeURIComponent(parsed.rkey)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) return null;
  const data = (await res.json()) as { value: unknown };
  return data.value;
}

// ── Types for AT Protocol records ────────────────────────────────────

interface ActivityCertContributor {
  contributorIdentity: {
    displayName?: string;
    identifier?: string;
  };
  contributionDetails?: {
    role?: string;
  };
}

interface ActivityCertRecord {
  title?: string;
  shortDescription?: string;
  workScope?: string;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  contributors?: ActivityCertContributor[];
}

interface DDSSummaryStatistics {
  totalVotes?: number;
  totalBlockers?: number;
  blindSpotCount?: number;
  totalResources?: number;
  convergentCount?: number;
  totalPriorities?: number;
  aspirationalCount?: number;
  topicClusterCount?: number;
}

interface DDSBlockerTheme {
  theme: string;
  frequency: number;
  description: string;
  affectedPriorities: string[];
}

interface DDSResourceRecommendation {
  urgency: string;
  category: string;
  recommendation: string;
  relatedPriorities: string[];
}

interface DDSSummaryRecord {
  eventName?: string;
  deliberationTitle?: string;
  synthesis?: string;
  statistics?: DDSSummaryStatistics;
  blockerThemes?: DDSBlockerTheme[];
  resourceRecommendations?: DDSResourceRecommendation[];
  createdAt?: string;
}

interface DDSTopicCluster {
  label: string;
  keywords: string[];
  mentionCount: number;
}

interface DDSPcaRecord {
  topicClusters?: DDSTopicCluster[];
  createdAt?: string;
}

export const hypercertsRouter = createTRPCRouter({
  /**
   * Create a hypercert for a project
   */
  createForProject: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get the project with all details
      const project = await ctx.db.userProject.findUnique({
        where: { id: input.projectId },
        include: {
          profile: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      // Check if user owns the project
      if (project.profile.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the project owner can create a hypercert",
        });
      }

      const service = createHypercertsService(ctx.db);

      // Create the hypercert
      const result = await service.createHypercert(ctx.session.user.id, {
        title: project.title,
        shortDescription:
          project.description ?? `Impact work on ${project.title}`,
        description: project.description
          ? `This hypercert represents the impact work done on ${project.title}.\n\n${project.description}`
          : `This hypercert represents the impact work done on ${project.title}.`,
        workScope:
          project.technologies.length > 0
            ? project.technologies.join(", ")
            : "Software development and impact work",
        workTimeFrameFrom: project.createdAt.toISOString(),
        workTimeFrameTo: new Date().toISOString(),
        image: project.bannerUrl ?? project.imageUrl ?? undefined,
      });

      return {
        success: true,
        uri: result.uri,
        cid: result.cid,
        projectTitle: project.title,
      };
    }),

  /**
   * List all hypercerts for the current user
   */
  listMyHypercerts: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional().default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const service = createHypercertsService(ctx.db);
        const hypercerts = await service.listHypercerts(
          ctx.session.user.id,
          input.limit,
        );
        return hypercerts;
      } catch (error) {
        // Fail gracefully for auth errors - return empty array
        if (error instanceof TRPCError && error.code === "UNAUTHORIZED") {
          return [];
        }
        throw error;
      }
    }),

  /**
   * Get a specific hypercert
   */
  getHypercert: protectedProcedure
    .input(
      z.object({
        rkey: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const service = createHypercertsService(ctx.db);
        const hypercert = await service.getHypercert(
          ctx.session.user.id,
          input.rkey,
        );
        return hypercert;
      } catch (error) {
        // Fail gracefully for auth errors - return null
        if (error instanceof TRPCError && error.code === "UNAUTHORIZED") {
          return null;
        }
        throw error;
      }
    }),

  /**
   * Publish an event as an activity cert with speakers as contributors
   */
  publishEventActivityCert: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Admin/staff or event creator check
      if (!isAdminOrStaff(ctx.session.user.role)) {
        const event = await ctx.db.event.findUnique({
          where: { id: input.eventId },
          select: { createdById: true },
        });

        if (!event) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Event not found",
          });
        }

        if (event.createdById !== ctx.session.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only admins or event creators can publish activity certs",
          });
        }
      }

      // Check if already published
      const existingEvent = await ctx.db.event.findUnique({
        where: { id: input.eventId },
        select: { activityCertUri: true },
      });

      if (existingEvent?.activityCertUri) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Activity cert already published for this event",
        });
      }

      const service = createActivityCertService(ctx.db);
      const result = await service.publishEventActivityCert(input.eventId);

      // Store URIs on the event
      await ctx.db.event.update({
        where: { id: input.eventId },
        data: {
          activityCertUri: result.activityUri,
          activityCertCid: result.activityCid,
          hyperboardUri: result.boardUri,
          hyperboardCid: result.boardCid,
          activityCertPublishedAt: new Date(),
        },
      });

      return {
        success: true,
        activityUri: result.activityUri,
        boardUri: result.boardUri,
        contributorCount: result.contributorCount,
      };
    }),

  /**
   * Get activity cert publish status for an event
   */
  getEventActivityCertStatus: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      const event = await ctx.db.event.findUnique({
        where: { id: input.eventId },
        select: {
          activityCertUri: true,
          activityCertCid: true,
          hyperboardUri: true,
          hyperboardCid: true,
          activityCertPublishedAt: true,
        },
      });

      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
      }

      return {
        isPublished: !!event.activityCertUri,
        activityUri: event.activityCertUri,
        hyperboardUri: event.hyperboardUri,
        publishedAt: event.activityCertPublishedAt,
      };
    }),

  /**
   * Fetch AT Protocol / Hypersphere data published for an event.
   * All data is public – no auth required.
   */
  getEventHypersphereData: publicProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Resolve event by ID or slug
      let event = await ctx.db.event.findUnique({
        where: { id: input.eventId },
        select: {
          id: true,
          activityCertUri: true,
          hyperboardUri: true,
        },
      });
      event ??= await ctx.db.event.findUnique({
        where: { slug: input.eventId },
        select: {
          id: true,
          activityCertUri: true,
          hyperboardUri: true,
        },
      });

      if (!event) return { activityCert: null, deliberation: null, networkStats: null };

      // Find deliberation with published AT Protocol records
      const deliberation = await ctx.db.deliberation.findFirst({
        where: { eventId: event.id },
        select: {
          summaryUri: true,
          pcaUri: true,
          activityUri: true,
          boardUri: true,
        },
      });

      // Fetch all records in parallel
      const [
        activityCertResult,
        summaryResult,
        pcaResult,
        networkStatsResult,
      ] = await Promise.allSettled([
        event.activityCertUri
          ? fetchAtRecord(event.activityCertUri)
          : Promise.resolve(null),
        deliberation?.summaryUri
          ? fetchAtRecord(deliberation.summaryUri)
          : Promise.resolve(null),
        deliberation?.pcaUri
          ? fetchAtRecord(deliberation.pcaUri)
          : Promise.resolve(null),
        fetch("https://www.hyperscan.dev/agents/stats", {
          signal: AbortSignal.timeout(10000),
        }).then((r) => (r.ok ? r.text() : null)),
      ]);

      const activityCertValue =
        activityCertResult.status === "fulfilled"
          ? (activityCertResult.value as ActivityCertRecord | null)
          : null;
      const summaryValue =
        summaryResult.status === "fulfilled"
          ? (summaryResult.value as DDSSummaryRecord | null)
          : null;
      const pcaValue =
        pcaResult.status === "fulfilled"
          ? (pcaResult.value as DDSPcaRecord | null)
          : null;
      const networkStats =
        networkStatsResult.status === "fulfilled"
          ? networkStatsResult.value
          : null;

      return {
        activityCert: activityCertValue
          ? { uri: event.activityCertUri!, value: activityCertValue }
          : null,
        deliberation:
          summaryValue ?? pcaValue
            ? {
                summary: summaryValue
                  ? { uri: deliberation!.summaryUri!, value: summaryValue }
                  : null,
                pca: pcaValue
                  ? { uri: deliberation!.pcaUri!, value: pcaValue }
                  : null,
              }
            : null,
        networkStats,
      };
    }),
});
