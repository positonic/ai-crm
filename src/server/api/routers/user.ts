import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "~/server/api/trpc";
import { hashPassword } from "~/utils/password";
import { TRPCError } from "@trpc/server";

export const userRouter = createTRPCRouter({
  create: publicProcedure
    .input(
      z.object({
        firstName: z.string().min(1, "First name is required"),
        surname: z.string().optional(),
        email: z
          .string()
          .email("Invalid email address")
          .transform((v) => v.toLowerCase().trim()),
        password: z.string().min(8, "Password must be at least 8 characters"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user already exists
      const existingUser = await ctx.db.user.findUnique({
        where: { email: input.email },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A user with this email already exists",
        });
      }

      // Hash the password
      const hashedPassword = await hashPassword(input.password);

      // Create the user
      const user = await ctx.db.user.create({
        data: {
          firstName: input.firstName,
          surname: input.surname ?? "",
          name: `${input.firstName} ${input.surname ?? ""}`.trim(), // Maintain legacy field during transition
          email: input.email,
          password: hashedPassword,
        },
        select: {
          id: true,
          firstName: true,
          surname: true,
          name: true,
          email: true,
        },
      });

      return user;
    }),

  getAll: protectedProcedure.query(async ({ ctx }) => {
    // Only allow staff and admin users to fetch all users
    if (
      ctx.session.user.role !== "staff" &&
      ctx.session.user.role !== "admin"
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only staff and admin users can access user list",
      });
    }

    const users = await ctx.db.user.findMany({
      select: {
        id: true,
        firstName: true,
        surname: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: {
        firstName: "asc",
      },
    });

    return users;
  }),

  getAdmins: protectedProcedure.query(async ({ ctx }) => {
    // Only allow staff and admin users to fetch admin users
    if (
      ctx.session.user.role !== "staff" &&
      ctx.session.user.role !== "admin"
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only staff and admin users can access admin user list",
      });
    }

    const adminUsers = await ctx.db.user.findMany({
      where: {
        role: "admin",
      },
      select: {
        id: true,
        firstName: true,
        surname: true,
        name: true,
        email: true,
        role: true,
        isAIReviewer: true,
      },
      orderBy: {
        firstName: "asc",
      },
    });

    return adminUsers;
  }),

  updateUserAdminNotes: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        adminNotes: z.string().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Only allow admin users to update admin notes
      if (ctx.session.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admin users can update user admin notes",
        });
      }

      const user = await ctx.db.user.update({
        where: { id: input.userId },
        data: {
          adminNotes: input.adminNotes,
          adminUpdatedBy: ctx.session.user.id,
          adminUpdatedAt: new Date(),
        },
        select: {
          id: true,
          adminNotes: true,
          adminUpdatedAt: true,
        },
      });

      return user;
    }),

  updateUserAdminLabels: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        adminLabels: z.array(
          z.enum([
            "AI / ML expert",
            "Designer",
            "Developer",
            "Entrepreneur",
            "Lawyer",
            "Non-Technical",
            "Project manager",
            "REFI",
            "Regen",
            "Researcher",
            "Scientist",
            "Woman",
            "Writer",
            "ZK",
          ]),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Only allow admin users to update admin labels
      if (ctx.session.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admin users can update user admin labels",
        });
      }

      const user = await ctx.db.user.update({
        where: { id: input.userId },
        data: {
          adminLabels: input.adminLabels,
          adminUpdatedBy: ctx.session.user.id,
          adminUpdatedAt: new Date(),
        },
        select: {
          id: true,
          adminLabels: true,
          adminUpdatedAt: true,
        },
      });

      return user;
    }),

  updateUserAdminWorkExperience: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        adminWorkExperience: z.string().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Only allow admin users to update admin work experience
      if (ctx.session.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admin users can update user admin work experience",
        });
      }

      const user = await ctx.db.user.update({
        where: { id: input.userId },
        data: {
          adminWorkExperience: input.adminWorkExperience,
          adminUpdatedBy: ctx.session.user.id,
          adminUpdatedAt: new Date(),
        },
        select: {
          id: true,
          adminWorkExperience: true,
          adminUpdatedAt: true,
        },
      });

      return user;
    }),

  adminUpdateUser: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        firstName: z.string().optional(),
        surname: z.string().optional(),
        email: z
          .string()
          .email()
          .transform((v) => v.toLowerCase().trim())
          .optional(),
        role: z.enum(["user", "staff", "admin"]).optional(),
        isAIReviewer: z.boolean().optional(),
        adminNotes: z.string().nullable().optional(),
        adminLabels: z
          .array(
            z.enum([
              "AI / ML expert",
              "Designer",
              "Developer",
              "Entrepreneur",
              "Lawyer",
              "Non-Technical",
              "Project manager",
              "REFI",
              "Regen",
              "Researcher",
              "Scientist",
              "Woman",
              "Writer",
              "ZK",
            ]),
          )
          .optional(),
        adminWorkExperience: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admin users can update user details",
        });
      }

      // Build name field if firstName or surname is being updated
      const data: Record<string, unknown> = {
        adminUpdatedBy: ctx.session.user.id,
        adminUpdatedAt: new Date(),
      };

      if (input.firstName !== undefined) data.firstName = input.firstName;
      if (input.surname !== undefined) data.surname = input.surname;
      if (input.email !== undefined) data.email = input.email;
      if (input.role !== undefined) data.role = input.role;
      if (input.isAIReviewer !== undefined)
        data.isAIReviewer = input.isAIReviewer;
      if (input.adminNotes !== undefined) data.adminNotes = input.adminNotes;
      if (input.adminLabels !== undefined)
        data.adminLabels = input.adminLabels;
      if (input.adminWorkExperience !== undefined)
        data.adminWorkExperience = input.adminWorkExperience;

      // Update legacy name field when firstName or surname changes
      if (input.firstName !== undefined || input.surname !== undefined) {
        const existing = await ctx.db.user.findUnique({
          where: { id: input.userId },
          select: { firstName: true, surname: true },
        });
        const firstName = input.firstName ?? existing?.firstName ?? "";
        const surname = input.surname ?? existing?.surname ?? "";
        data.name = `${firstName} ${surname}`.trim();
      }

      try {
        const user = await ctx.db.user.update({
          where: { id: input.userId },
          data,
          select: {
            id: true,
            firstName: true,
            surname: true,
            name: true,
            email: true,
            role: true,
            isAIReviewer: true,
            adminNotes: true,
            adminLabels: true,
            adminWorkExperience: true,
          },
        });
        return user;
      } catch (error) {
        if (
          error instanceof Error &&
          "code" in error &&
          (error as { code: string }).code === "P2002"
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A user with this email already exists",
          });
        }
        throw error;
      }
    }),

  searchUsers: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().min(1).max(20).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Search users by firstName, surname, or email
      const users = await ctx.db.user.findMany({
        where: {
          OR: [
            { firstName: { contains: input.query, mode: "insensitive" } },
            { surname: { contains: input.query, mode: "insensitive" } },
            { email: { contains: input.query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          firstName: true,
          surname: true,
          name: true,
          email: true,
          image: true,
        },
        take: input.limit,
        orderBy: {
          firstName: "asc",
        },
      });

      return users;
    }),
});
