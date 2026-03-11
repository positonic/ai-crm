import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { Prisma } from "@prisma/client";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { createGitHubSyncService } from "~/server/services/githubProjectSync";

// Input schemas
const GetProjectBySlugSchema = z.object({
  slug: z.string(),
});

const GetProjectsSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  technologies: z.array(z.string()).optional(),
  category: z.string().optional(),
  difficulty: z.string().optional(),
  search: z.string().optional(),
});

const ForceResyncProjectSchema = z.object({
  id: z.string(),
});

export const projectIdeaRouter = createTRPCRouter({
  // Public routes for viewing project ideas
  getAll: publicProcedure
    .input(GetProjectsSchema)
    .query(async ({ ctx, input }) => {
      const { limit, offset, technologies, category, difficulty, search } =
        input;

      // Build where clause with proper Prisma typing
      const where: Prisma.ProjectIdeaWhereInput = {
        syncStatus: "SUCCESS", // Only show successfully synced projects
      };

      if (technologies && technologies.length > 0) {
        where.technologies = {
          hasSome: technologies,
        };
      }

      if (category) {
        where.category = category;
      }

      if (difficulty) {
        where.difficulty = difficulty;
      }

      if (search) {
        where.OR = [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { content: { contains: search, mode: "insensitive" } },
        ];
      }

      const [projects, totalCount] = await Promise.all([
        ctx.db.projectIdea.findMany({
          where,
          select: {
            id: true,
            title: true,
            slug: true,
            description: true,
            technologies: true,
            difficulty: true,
            category: true,
            lastSynced: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: [{ category: "asc" }, { title: "asc" }],
          take: limit,
          skip: offset,
        }),
        ctx.db.projectIdea.count({ where }),
      ]);

      // Transform null descriptions to undefined for API compatibility
      const transformedProjects = projects.map((project) => ({
        ...project,
        description: project.description ?? undefined,
        category: project.category ?? undefined,
        difficulty: project.difficulty ?? undefined,
      }));

      return {
        projects: transformedProjects,
        totalCount,
        hasMore: offset + limit < totalCount,
      };
    }),

  getBySlug: publicProcedure
    .input(GetProjectBySlugSchema)
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.projectIdea.findUnique({
        where: {
          slug: input.slug,
          syncStatus: "SUCCESS",
        },
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          content: true,
          githubPath: true,
          technologies: true,
          difficulty: true,
          category: true,
          lastSynced: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project idea not found",
        });
      }

      return project;
    }),

  getTechnologies: publicProcedure.query(async ({ ctx }) => {
    const result = await ctx.db.$queryRaw<
      Array<{ technology: string; count: bigint }>
    >`
      SELECT UNNEST(technologies) as technology, COUNT(*) as count
      FROM "ProjectIdea"
      WHERE "syncStatus" = 'SUCCESS'
      GROUP BY technology
      ORDER BY count DESC, technology ASC
    `;

    return result.map((row) => ({
      name: row.technology,
      count: Number(row.count),
    }));
  }),

  getCategories: publicProcedure.query(async ({ ctx }) => {
    const result = await ctx.db.projectIdea.groupBy({
      by: ["category"],
      where: {
        syncStatus: "SUCCESS",
        category: { not: null },
      },
      _count: {
        category: true,
      },
      orderBy: {
        _count: {
          category: "desc",
        },
      },
    });

    return result.map((item) => ({
      name: item.category!,
      count: item._count.category,
    }));
  }),

  getDifficulties: publicProcedure.query(async ({ ctx }) => {
    const result = await ctx.db.projectIdea.groupBy({
      by: ["difficulty"],
      where: {
        syncStatus: "SUCCESS",
        difficulty: { not: null },
      },
      _count: {
        difficulty: true,
      },
      orderBy: {
        difficulty: "asc",
      },
    });

    return result.map((item) => ({
      name: item.difficulty!,
      count: item._count.difficulty,
    }));
  }),

  getStats: publicProcedure.query(async ({ ctx }) => {
    const [totalProjects, successfulProjects, failedProjects, lastSync] =
      await Promise.all([
        ctx.db.projectIdea.count(),
        ctx.db.projectIdea.count({ where: { syncStatus: "SUCCESS" } }),
        ctx.db.projectIdea.count({ where: { syncStatus: "FAILED" } }),
        ctx.db.projectSync.findFirst({
          orderBy: { startedAt: "desc" },
          select: {
            startedAt: true,
            completedAt: true,
            status: true,
            syncedCount: true,
            totalProjects: true,
          },
        }),
      ]);

    return {
      totalProjects,
      successfulProjects,
      failedProjects,
      lastSync,
    };
  }),

  // Admin-only routes
  getSyncStatus: protectedProcedure.query(async ({ ctx }) => {
    // Check if user has admin permissions
    if (ctx.session.user.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Admin access required",
      });
    }

    const githubService = createGitHubSyncService(ctx.db);
    return githubService.getSyncStatus();
  }),

  syncFromGitHub: protectedProcedure.mutation(async ({ ctx }) => {
    // Check if user has admin permissions
    if (ctx.session.user.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Admin access required",
      });
    }

    try {
      const githubService = createGitHubSyncService(ctx.db);
      const result = await githubService.syncAllProjects();

      return {
        success: true,
        message: `Successfully synced ${result.syncedCount} out of ${result.totalProjects} projects`,
        ...result,
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to sync projects",
      });
    }
  }),

  forceResyncProject: protectedProcedure
    .input(ForceResyncProjectSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if user has admin permissions
      if (ctx.session.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required",
        });
      }

      try {
        const project = await ctx.db.projectIdea.findUnique({
          where: { id: input.id },
          select: { githubPath: true },
        });

        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }

        const githubService = createGitHubSyncService(ctx.db);

        // Extract filename from github path
        const filename = project.githubPath.split("/").pop();
        if (!filename) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid GitHub path",
          });
        }

        // Get project list to find the file info
        const projectFiles = await githubService.fetchProjectList();
        const file = projectFiles.find((f) => f.name === filename);

        if (!file) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project file not found in GitHub repository",
          });
        }

        await githubService.syncProject(file);

        return {
          success: true,
          message: "Project resynced successfully",
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to resync project",
        });
      }
    }),

  // Get all projects for admin (including failed ones)
  getAllForAdmin: protectedProcedure.query(async ({ ctx }) => {
    // Check if user has admin permissions
    if (ctx.session.user.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Admin access required",
      });
    }

    return ctx.db.projectIdea.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        githubPath: true,
        technologies: true,
        difficulty: true,
        category: true,
        syncStatus: true,
        lastSynced: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ syncStatus: "asc" }, { lastSynced: "desc" }],
    });
  }),
});
