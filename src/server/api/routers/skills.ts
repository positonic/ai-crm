import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const skillsRouter = createTRPCRouter({
  /**
   * Get all available skills with optional filtering by category
   * Public endpoint so it can be used in forms without authentication
   */
  getAvailableSkills: publicProcedure
    .input(
      z
        .object({
          category: z.string().optional(),
          search: z.string().optional(),
          limit: z.number().min(1).max(100).default(50),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const { category, search, limit } = input ?? {};

      const where = {
        isActive: true,
        ...(category && { category }),
        ...(search && {
          name: {
            contains: search,
            mode: "insensitive" as const,
          },
        }),
      };

      const skills = await ctx.db.skills.findMany({
        where,
        orderBy: [{ popularity: "desc" }, { name: "asc" }],
        take: limit,
        select: {
          id: true,
          name: true,
          category: true,
          popularity: true,
        },
      });

      return skills;
    }),

  /**
   * Get skills grouped by category
   * Useful for displaying skills in a categorized dropdown
   */
  getSkillsByCategory: publicProcedure.query(async ({ ctx }) => {
    const skills = await ctx.db.skills.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { popularity: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        category: true,
        popularity: true,
      },
    });

    // Group skills by category
    const skillsByCategory = skills.reduce(
      (acc, skill) => {
        const category = skill.category ?? "Other";
        acc[category] ??= [];
        acc[category].push(skill);
        return acc;
      },
      {} as Record<string, typeof skills>,
    );

    return skillsByCategory;
  }),

  /**
   * Get skills for a specific user
   * Returns both the skill details and any experience level if set
   */
  getUserSkills: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userSkills = await ctx.db.userSkills.findMany({
        where: { userId: input.userId },
        include: {
          skill: {
            select: {
              id: true,
              name: true,
              category: true,
            },
          },
        },
        orderBy: {
          skill: {
            name: "asc",
          },
        },
      });

      return userSkills.map((userSkill) => ({
        id: userSkill.skill.id,
        name: userSkill.skill.name,
        category: userSkill.skill.category,
        experienceLevel: userSkill.experienceLevel,
      }));
    }),

  /**
   * Update a user's skills
   * Replaces all existing skills with the new set
   */
  updateUserSkills: protectedProcedure
    .input(
      z.object({
        skillIds: z.array(z.string()),
        experienceLevels: z
          .record(z.string(), z.number().min(1).max(10))
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Remove existing user skills
      await ctx.db.userSkills.deleteMany({
        where: { userId },
      });

      // Add new user skills
      if (input.skillIds.length > 0) {
        await ctx.db.userSkills.createMany({
          data: input.skillIds.map((skillId) => ({
            userId,
            skillId,
            experienceLevel: input.experienceLevels?.[skillId] ?? null,
          })),
        });
      }

      // Return updated skills
      return await ctx.db.userSkills.findMany({
        where: { userId },
        include: {
          skill: {
            select: {
              id: true,
              name: true,
              category: true,
            },
          },
        },
      });
    }),

  /**
   * Create a new skill
   * Allows users to add skills that don't exist yet
   */
  createSkill: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(50).trim(),
        category: z.string().max(50).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if skill already exists (case-insensitive)
      const existingSkill = await ctx.db.skills.findFirst({
        where: {
          name: {
            equals: input.name,
            mode: "insensitive",
          },
        },
      });

      if (existingSkill) {
        return existingSkill;
      }

      // Create new skill
      const newSkill = await ctx.db.skills.create({
        data: {
          name: input.name,
          category: input.category ?? "Other",
          popularity: 1, // Start with popularity of 1
        },
      });

      return newSkill;
    }),

  /**
   * Search skills by name
   * Useful for autocomplete functionality
   */
  searchSkills: publicProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().min(1).max(20).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const skills = await ctx.db.skills.findMany({
        where: {
          isActive: true,
          name: {
            contains: input.query,
            mode: "insensitive",
          },
        },
        orderBy: [{ popularity: "desc" }, { name: "asc" }],
        take: input.limit,
        select: {
          id: true,
          name: true,
          category: true,
        },
      });

      return skills;
    }),

  /**
   * Get skill statistics
   * Useful for admin dashboards and analytics
   */
  getSkillStats: protectedProcedure.query(async ({ ctx }) => {
    const totalSkills = await ctx.db.skills.count({
      where: { isActive: true },
    });

    const skillsByCategory = await ctx.db.skills.groupBy({
      by: ["category"],
      where: { isActive: true },
      _count: true,
      orderBy: {
        _count: {
          category: "desc",
        },
      },
    });

    const topSkills = await ctx.db.skills.findMany({
      where: { isActive: true },
      orderBy: { popularity: "desc" },
      take: 10,
      select: {
        name: true,
        category: true,
        popularity: true,
      },
    });

    const totalUserSkills = await ctx.db.userSkills.count();

    return {
      totalSkills,
      totalUserSkills,
      skillsByCategory: skillsByCategory.map((item) => ({
        category: item.category ?? "Other",
        count: item._count,
      })),
      topSkills,
    };
  }),
});
