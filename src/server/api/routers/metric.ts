import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { getAIMetricSuggestionService } from "~/server/services/aiMetricSuggestion";
import { captureApiError } from "~/utils/errorCapture";

/**
 * Metrics System Router
 *
 * Provides CRUD operations and queries for the metrics system
 */

// Zod schemas for validation
const metricTypeEnum = z.enum([
  "BUILDER",
  "ENVIRONMENTAL",
  "GIT",
  "ONCHAIN",
  "OFFCHAIN",
  "CUSTOM",
]);

const collectionMethodEnum = z.enum([
  "ONCHAIN",
  "OFFCHAIN_API",
  "SELF_REPORTING",
  "MANUAL",
  "AUTOMATED",
]);

const metricCadenceEnum = z.enum([
  "REALTIME",
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "ANNUAL",
  "ONE_TIME",
  "CUSTOM",
]);

const metricTimePeriodEnum = z.enum(["BEFORE", "DURING", "AFTER", "ONGOING"]);

export const metricRouter = createTRPCRouter({
  /**
   * List all metrics with filtering and pagination
   */
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        isActive: z.boolean().optional(),
        metricType: metricTypeEnum.nullish(),
        collectionMethod: collectionMethodEnum.nullish(),
        isOnChain: z.boolean().optional(),
        search: z.string().nullish(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const {
        limit,
        offset,
        isActive,
        metricType,
        collectionMethod,
        isOnChain,
        search,
      } = input;

      const where = {
        ...(isActive !== undefined && { isActive }),
        ...(metricType && { metricType: { has: metricType } }),
        ...(collectionMethod && { collectionMethod }),
        ...(isOnChain !== undefined && { isOnChain }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { description: { contains: search, mode: "insensitive" as const } },
            { category: { contains: search, mode: "insensitive" as const } },
          ],
        }),
      };

      const [metrics, total] = await Promise.all([
        ctx.db.metric.findMany({
          where,
          take: limit,
          skip: offset,
          orderBy: { createdAt: "desc" },
          include: {
            creator: {
              select: {
                id: true,
                name: true,
                firstName: true,
                surname: true,
                email: true,
              },
            },
            _count: {
              select: {
                measurements: true,
                projectMetrics: true,
              },
            },
          },
        }),
        ctx.db.metric.count({ where }),
      ]);

      return {
        metrics,
        total,
        hasMore: offset + limit < total,
      };
    }),

  /**
   * Get a single metric by ID or slug
   */
  getById: publicProcedure
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
      const metric = await ctx.db.metric.findUnique({
        where: input.id ? { id: input.id } : { slug: input.slug },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              firstName: true,
              surname: true,
              email: true,
            },
          },
          measurements: {
            take: 10,
            orderBy: { measurementDate: "desc" },
            include: {
              project: {
                select: {
                  id: true,
                  title: true,
                },
              },
              event: {
                select: {
                  id: true,
                  name: true,
                },
              },
              measuredByUser: {
                select: {
                  id: true,
                  name: true,
                  firstName: true,
                  surname: true,
                },
              },
            },
          },
          projectMetrics: {
            include: {
              project: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
          _count: {
            select: {
              measurements: true,
              projectMetrics: true,
            },
          },
        },
      });

      if (!metric) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Metric not found",
        });
      }

      return metric;
    }),

  /**
   * Create a new metric
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        slug: z.string().min(1).optional(),
        description: z.string().optional(),
        metricType: z.array(metricTypeEnum).min(1),
        unitOfMetric: z.string().optional(),
        category: z.string().optional(),
        collectionMethod: collectionMethodEnum,
        cadence: metricCadenceEnum.default("ONE_TIME"),
        timePeriod: metricTimePeriodEnum.default("DURING"),
        isOnChain: z.boolean().default(false),
        deployerAccount: z.string().optional(),
        offChainApis: z.array(z.string()).default([]),
        gitMetric: z.boolean().default(false),
        dependencyTracking: z.boolean().default(false),
        attestationOriented: z.boolean().default(false),
        customEvaluation: z.boolean().default(false),
        selfReporting: z.boolean().default(false),
        hypercertsUsed: z.boolean().default(false),
        zkEmail: z.boolean().default(false),
        allSoftwareProjects: z.boolean().default(false),
        ftcProjects: z.array(z.string()).default([]),
        projectIdNeeded: z.boolean().default(false),
        environmentalSocialGood: z.boolean().default(false),
        relevantToBBI: z.boolean().default(false),
        impactEvaluators: z.array(z.string()).default([]),
        pocContact: z.string().optional(),
        source: z.string().optional(),
        notes: z.string().optional(),
        quantity: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Generate slug if not provided
      const slug =
        input.slug ??
        input.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");

      // Check if slug already exists
      const existing = await ctx.db.metric.findUnique({
        where: { slug },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A metric with this slug already exists",
        });
      }

      const metric = await ctx.db.metric.create({
        data: {
          ...input,
          slug,
          createdBy: ctx.session.user.id,
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              firstName: true,
              surname: true,
            },
          },
        },
      });

      return metric;
    }),

  /**
   * Update an existing metric
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        slug: z.string().min(1).optional(),
        description: z.string().optional(),
        metricType: z.array(metricTypeEnum).optional(),
        unitOfMetric: z.string().optional(),
        category: z.string().optional(),
        collectionMethod: collectionMethodEnum.optional(),
        cadence: metricCadenceEnum.optional(),
        timePeriod: metricTimePeriodEnum.optional(),
        isOnChain: z.boolean().optional(),
        deployerAccount: z.string().optional(),
        offChainApis: z.array(z.string()).optional(),
        gitMetric: z.boolean().optional(),
        dependencyTracking: z.boolean().optional(),
        attestationOriented: z.boolean().optional(),
        customEvaluation: z.boolean().optional(),
        selfReporting: z.boolean().optional(),
        hypercertsUsed: z.boolean().optional(),
        zkEmail: z.boolean().optional(),
        allSoftwareProjects: z.boolean().optional(),
        ftcProjects: z.array(z.string()).optional(),
        projectIdNeeded: z.boolean().optional(),
        environmentalSocialGood: z.boolean().optional(),
        relevantToBBI: z.boolean().optional(),
        impactEvaluators: z.array(z.string()).optional(),
        pocContact: z.string().optional(),
        source: z.string().optional(),
        notes: z.string().optional(),
        quantity: z.number().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // Check if metric exists
      const existing = await ctx.db.metric.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Metric not found",
        });
      }

      // If updating slug, check for conflicts
      if (updateData.slug && updateData.slug !== existing.slug) {
        const slugConflict = await ctx.db.metric.findUnique({
          where: { slug: updateData.slug },
        });

        if (slugConflict) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A metric with this slug already exists",
          });
        }
      }

      const metric = await ctx.db.metric.update({
        where: { id },
        data: updateData,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              firstName: true,
              surname: true,
            },
          },
        },
      });

      return metric;
    }),

  /**
   * Delete (soft delete) a metric
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const metric = await ctx.db.metric.findUnique({
        where: { id: input.id },
      });

      if (!metric) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Metric not found",
        });
      }

      // Soft delete by setting isActive to false
      await ctx.db.metric.update({
        where: { id: input.id },
        data: { isActive: false },
      });

      return { success: true };
    }),

  /**
   * Record a measurement for a metric
   */
  recordMeasurement: protectedProcedure
    .input(
      z.object({
        metricId: z.string(),
        projectId: z.string().optional(),
        eventId: z.string().optional(),
        value: z.number(),
        unitOfMetric: z.string(),
        source: z.string().optional(),
        verificationUrl: z.string().url().optional(),
        measurementDate: z.date(),
        timePeriod: metricTimePeriodEnum,
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify metric exists
      const metric = await ctx.db.metric.findUnique({
        where: { id: input.metricId },
      });

      if (!metric) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Metric not found",
        });
      }

      const measurement = await ctx.db.metricMeasurement.create({
        data: {
          ...input,
          measuredBy: ctx.session.user.id,
        },
        include: {
          metric: {
            select: {
              id: true,
              name: true,
            },
          },
          measuredByUser: {
            select: {
              id: true,
              name: true,
              firstName: true,
              surname: true,
            },
          },
        },
      });

      return measurement;
    }),

  /**
   * Get measurements for a metric
   */
  getMeasurements: publicProcedure
    .input(
      z.object({
        metricId: z.string(),
        projectId: z.string().optional(),
        eventId: z.string().optional(),
        timePeriod: metricTimePeriodEnum.optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { metricId, projectId, eventId, timePeriod, limit, offset } = input;

      const where = {
        metricId,
        ...(projectId && { projectId }),
        ...(eventId && { eventId }),
        ...(timePeriod && { timePeriod }),
      };

      const [measurements, total] = await Promise.all([
        ctx.db.metricMeasurement.findMany({
          where,
          take: limit,
          skip: offset,
          orderBy: { measurementDate: "desc" },
          include: {
            metric: {
              select: {
                id: true,
                name: true,
                unitOfMetric: true,
              },
            },
            project: {
              select: {
                id: true,
                title: true,
              },
            },
            event: {
              select: {
                id: true,
                name: true,
              },
            },
            measuredByUser: {
              select: {
                id: true,
                name: true,
                firstName: true,
                surname: true,
              },
            },
          },
        }),
        ctx.db.metricMeasurement.count({ where }),
      ]);

      return {
        measurements,
        total,
        hasMore: offset + limit < total,
      };
    }),

  /**
   * Associate a metric with a project
   */
  addToProject: protectedProcedure
    .input(
      z.object({
        metricId: z.string(),
        projectId: z.string(),
        targetValue: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if association already exists
      const existing = await ctx.db.projectMetric.findUnique({
        where: {
          projectId_metricId: {
            projectId: input.projectId,
            metricId: input.metricId,
          },
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This metric is already associated with this project",
        });
      }

      const projectMetric = await ctx.db.projectMetric.create({
        data: {
          ...input,
          addedBy: ctx.session.user.id,
        },
        include: {
          metric: {
            select: {
              id: true,
              name: true,
              unitOfMetric: true,
            },
          },
          project: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      return projectMetric;
    }),

  /**
   * Remove a metric from a project
   */
  removeFromProject: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        metricId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const projectMetric = await ctx.db.projectMetric.findUnique({
        where: {
          projectId_metricId: {
            projectId: input.projectId,
            metricId: input.metricId,
          },
        },
      });

      if (!projectMetric) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project metric association not found",
        });
      }

      await ctx.db.projectMetric.delete({
        where: {
          projectId_metricId: {
            projectId: input.projectId,
            metricId: input.metricId,
          },
        },
      });

      return { success: true };
    }),

  /**
   * Get metrics for a project
   */
  getProjectMetrics: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const projectMetrics = await ctx.db.projectMetric.findMany({
        where: {
          projectId: input.projectId,
          isTracking: true,
        },
        include: {
          metric: {
            include: {
              _count: {
                select: {
                  measurements: true,
                },
              },
            },
          },
          addedByUser: {
            select: {
              id: true,
              name: true,
              firstName: true,
              surname: true,
            },
          },
        },
        orderBy: { addedAt: "desc" },
      });

      return projectMetrics;
    }),

  /**
   * AI-powered metric suggestions for a project
   */
  suggestMetrics: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        includeUpdates: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Fetch project with updates
        const project = await ctx.db.userProject.findUnique({
          where: { id: input.projectId },
          include: {
            updates: input.includeUpdates
              ? {
                  orderBy: { createdAt: "desc" },
                  take: 10,
                  select: {
                    title: true,
                    content: true,
                    weekNumber: true,
                    createdAt: true,
                  },
                }
              : false,
          },
        });

        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }

        // Get all active metrics for AI context
        const allMetrics = await ctx.db.metric.findMany({
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            description: true,
            metricType: true,
            unitOfMetric: true,
            category: true,
            collectionMethod: true,
          },
        });

        // Get already added metrics to exclude from suggestions
        const existingProjectMetrics = await ctx.db.projectMetric.findMany({
          where: { projectId: input.projectId },
          select: { metricId: true },
        });

        const alreadyAddedMetricIds = existingProjectMetrics.map(
          (pm) => pm.metricId,
        );

        // Build project context
        const projectContext = {
          projectId: project.id,
          title: project.title,
          description: project.description,
          technologies: project.technologies,
          updates: input.includeUpdates ? project.updates : [],
        };

        // Call AI service
        const aiService = getAIMetricSuggestionService();
        const suggestions = await aiService.suggestMetrics(
          projectContext,
          allMetrics,
          alreadyAddedMetricIds,
        );

        return suggestions;
      } catch (error) {
        captureApiError(error, {
          userId: ctx.session.user.id,
          route: "metric.suggestMetrics",
          method: "POST",
          input: { projectId: input.projectId },
        });

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to generate metric suggestions",
        });
      }
    }),
});
